import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import type { LanguageModelV3CallOptions, LanguageModelV3StreamPart } from '@ai-sdk/provider';
import {
  AgentClientMessageSchema,
  AgentServerMessageSchema,
  CancelActionSchema,
  ClientHeartbeatSchema,
  ConversationActionSchema,
  ExecClientControlMessageSchema,
  ExecClientThrowSchema,
  GetBlobResultSchema,
  KvClientMessageSchema,
  SetBlobResultSchema,
  type AgentServerMessage,
  type ExecServerMessage,
  type InteractionQuery,
  type KvServerMessage,
  type McpToolDefinition,
} from '../proto/agent_pb.js';
import {
  createConnectFrameParser,
  frameConnectMessage,
  spawnBridge,
  type BridgeHandle,
} from '../client/bridge.js';
import { getCursorAgentUrl } from '../config/index.js';
import { handleInteractionQuery } from './interaction-query.js';
import { buildCursorRequest, buildMcpToolDefinitions, decodeMcpArgsMap } from './request-build.js';
import { promptToCursorTurns, toolsFromCall } from './prompt.js';

function heartbeatFrame(): Uint8Array {
  const heartbeat = create(AgentClientMessageSchema, {
    message: { case: 'clientHeartbeat', value: create(ClientHeartbeatSchema, {}) },
  });
  return frameConnectMessage(toBinary(AgentClientMessageSchema, heartbeat));
}

function sendCancel(bridge: BridgeHandle): void {
  const action = create(ConversationActionSchema, {
    action: { case: 'cancelAction', value: create(CancelActionSchema, {}) },
  });
  const clientMessage = create(AgentClientMessageSchema, {
    message: { case: 'conversationAction', value: action },
  });
  if (bridge.alive)
    bridge.write(frameConnectMessage(toBinary(AgentClientMessageSchema, clientMessage)));
}

function sendExecThrow(execMsg: ExecServerMessage, sendFrame: (data: Uint8Array) => void): void {
  const control = create(ExecClientControlMessageSchema, {
    message: {
      case: 'throw',
      value: create(ExecClientThrowSchema, {
        id: (execMsg as { id: number }).id,
        error: 'OpenCode will run this tool and send the result on the next turn.',
      }),
    },
  });
  const clientMessage = create(AgentClientMessageSchema, {
    message: { case: 'execClientControlMessage', value: control },
  });
  sendFrame(frameConnectMessage(toBinary(AgentClientMessageSchema, clientMessage)));
}

function handleKv(
  kvMsg: KvServerMessage,
  blobStore: Map<string, Uint8Array>,
  sendFrame: (data: Uint8Array) => void,
): void {
  const kvCase = (kvMsg as { message: { case?: string; value?: Record<string, Uint8Array> } })
    .message.case;
  const send = (messageCase: string, value: unknown) => {
    const response = create(KvClientMessageSchema, {
      id: (kvMsg as { id: number }).id,
      message: { case: messageCase as 'getBlobResult', value: value as never },
    });
    sendFrame(
      frameConnectMessage(
        toBinary(
          AgentClientMessageSchema,
          create(AgentClientMessageSchema, {
            message: { case: 'kvClientMessage', value: response },
          }),
        ),
      ),
    );
  };
  if (kvCase === 'getBlobArgs') {
    const blobId = (kvMsg as { message: { value: { blobId: Uint8Array } } }).message.value.blobId;
    const key = Buffer.from(blobId).toString('hex');
    const blobData = blobStore.get(key);
    send('getBlobResult', create(GetBlobResultSchema, blobData ? { blobData } : {}));
    return;
  }
  if (kvCase === 'setBlobArgs') {
    const { blobId, blobData } = (
      kvMsg as { message: { value: { blobId: Uint8Array; blobData: Uint8Array } } }
    ).message.value;
    blobStore.set(Buffer.from(blobId).toString('hex'), blobData);
    send('setBlobResult', create(SetBlobResultSchema, {}));
  }
}

export function runCursorConnectStream(input: {
  accessToken: string;
  modelId: string;
  options: LanguageModelV3CallOptions;
}): ReadableStream<LanguageModelV3StreamPart> {
  const { systemPrompt, userText, turns } = promptToCursorTurns(input.options);
  const openaiTools = toolsFromCall(input.options);
  const mcpTools: McpToolDefinition[] = buildMcpToolDefinitions(openaiTools);
  const payload = buildCursorRequest({
    modelId: input.modelId,
    systemPrompt,
    userText,
    turns,
    conversationId: crypto.randomUUID(),
    checkpoint: null,
    mcpTools,
  });

  return new ReadableStream<LanguageModelV3StreamPart>({
    start(controller) {
      controller.enqueue({ type: 'stream-start', warnings: [] });
      const textId = crypto.randomUUID();
      const reasoningId = crypto.randomUUID();
      let textOpen = false;
      let reasoningOpen = false;
      let sawTool = false;
      let closed = false;
      const blobStore = payload.blobStore;

      const finish = (reason: 'stop' | 'tool-calls' | 'error', error?: unknown) => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        try {
          sendCancel(bridge);
          bridge.end();
        } catch {
          /* ignore */
        }
        if (textOpen) controller.enqueue({ type: 'text-end', id: textId });
        if (reasoningOpen) controller.enqueue({ type: 'reasoning-end', id: reasoningId });
        if (error) {
          controller.enqueue({ type: 'error', error });
          controller.error(error);
          return;
        }
        controller.enqueue({
          type: 'finish',
          finishReason: {
            unified: reason === 'tool-calls' ? 'tool-calls' : 'stop',
            raw: undefined,
          },
          usage: {
            inputTokens: {
              total: undefined,
              noCache: undefined,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: { total: undefined, text: undefined, reasoning: undefined },
          },
        });
        controller.close();
      };

      const bridge = spawnBridge({
        accessToken: input.accessToken,
        rpcPath: '/agent.v1.AgentService/Run',
        url: getCursorAgentUrl(),
        persistent: false,
      });
      const sendFrame = (data: Uint8Array) => {
        if (bridge.alive) bridge.write(data);
      };
      const heartbeat = setInterval(() => sendFrame(heartbeatFrame()), 15_000);

      const onText = (delta: string, thinking: boolean) => {
        if (thinking) {
          if (textOpen) {
            controller.enqueue({ type: 'text-end', id: textId });
            textOpen = false;
          }
          if (!reasoningOpen) {
            controller.enqueue({ type: 'reasoning-start', id: reasoningId });
            reasoningOpen = true;
          }
          controller.enqueue({ type: 'reasoning-delta', id: reasoningId, delta });
          return;
        }
        if (reasoningOpen) {
          controller.enqueue({ type: 'reasoning-end', id: reasoningId });
          reasoningOpen = false;
        }
        if (!textOpen) {
          controller.enqueue({ type: 'text-start', id: textId });
          textOpen = true;
        }
        controller.enqueue({ type: 'text-delta', id: textId, delta });
      };

      const parser = createConnectFrameParser(
        (bytes) => {
          let msg: AgentServerMessage;
          try {
            msg = fromBinary(AgentServerMessageSchema, bytes);
          } catch {
            return;
          }
          const msgCase = msg.message.case;
          if (msgCase === 'interactionUpdate') {
            const update = msg.message.value as {
              message?: { case?: string; value?: { text?: string } };
            };
            const updateCase = update.message?.case;
            if (updateCase === 'textDelta' && update.message?.value?.text) {
              onText(update.message.value.text, false);
            } else if (updateCase === 'thinkingDelta' && update.message?.value?.text) {
              onText(update.message.value.text, true);
            } else if (updateCase === 'turnEnded') {
              finish(sawTool ? 'tool-calls' : 'stop');
            }
            return;
          }
          if (msgCase === 'kvServerMessage') {
            handleKv(msg.message.value as KvServerMessage, blobStore, sendFrame);
            return;
          }
          if (msgCase === 'interactionQuery') {
            handleInteractionQuery(msg.message.value as InteractionQuery, sendFrame);
            return;
          }
          if (msgCase === 'execServerMessage') {
            const execMsg = msg.message.value as ExecServerMessage;
            const execCase = (execMsg as { message?: { case?: string } }).message?.case;
            if (execCase === 'mcpArgs') {
              const mcpArgs = (execMsg as { message: { value: Record<string, unknown> } }).message
                .value;
              const toolName = String(mcpArgs.toolName || mcpArgs.name || '');
              const decoded = decodeMcpArgsMap(
                (mcpArgs.args as Record<string, Uint8Array> | undefined) ?? {},
              );
              const toolCallId = String(mcpArgs.toolCallId || crypto.randomUUID());
              const inputJson = JSON.stringify(decoded);
              sawTool = true;
              controller.enqueue({ type: 'tool-input-start', id: toolCallId, toolName });
              controller.enqueue({ type: 'tool-input-delta', id: toolCallId, delta: inputJson });
              controller.enqueue({ type: 'tool-input-end', id: toolCallId });
              controller.enqueue({
                type: 'tool-call',
                toolCallId,
                toolName,
                input: inputJson,
              });
              sendExecThrow(execMsg, sendFrame);
              return;
            }
            sendExecThrow(execMsg, sendFrame);
          }
        },
        () => finish(sawTool ? 'tool-calls' : 'stop'),
      );

      bridge.onData((chunk) => {
        try {
          parser(chunk);
        } catch (error) {
          finish('error', error);
        }
      });
      bridge.onClose((code) => {
        if (code !== 0 && !closed)
          finish('error', new Error(`Cursor Connect stream closed (${code})`));
        else finish(sawTool ? 'tool-calls' : 'stop');
      });
      input.options.abortSignal?.addEventListener('abort', () => finish('stop'));
      bridge.write(frameConnectMessage(payload.requestBytes));
    },
  });
}
