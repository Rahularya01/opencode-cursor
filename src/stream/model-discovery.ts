import { create, fromBinary, toBinary } from '@bufbuild/protobuf';
import { createHash } from 'node:crypto';
import { GetUsableModelsRequestSchema, GetUsableModelsResponseSchema } from '../proto/agent_pb.js';
import { callUnaryOverH2, supportsInProcessH2 } from '../client/h2-unary.js';
import { getCursorAgentUrl } from '../config/index.js';
import { inferCursorContextWindow, inferCursorMaxOutputTokens } from '../models/limits.js';

export interface DiscoveredCursorModel {
  id: string;
  name: string;
  context: number;
  output: number;
}

const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { tokenHash: string; models: DiscoveredCursorModel[]; expiresAt: number } | null = null;

function decodeConnectUnaryBody(payload: Uint8Array): Uint8Array | null {
  if (payload.length < 5) return null;
  let offset = 0;
  while (offset + 5 <= payload.length) {
    const flags = payload[offset]!;
    const view = new DataView(
      payload.buffer,
      payload.byteOffset + offset,
      payload.byteLength - offset,
    );
    const messageLength = view.getUint32(1, false);
    const frameEnd = offset + 5 + messageLength;
    if (frameEnd > payload.length) return null;
    if ((flags & 0b0000_0001) !== 0) return null;
    if ((flags & 0b0000_0010) === 0) return payload.subarray(offset + 5, frameEnd);
    offset = frameEnd;
  }
  return null;
}

export async function discoverCursorModels(accessToken: string): Promise<DiscoveredCursorModel[]> {
  const tokenHash = createHash('sha256').update(accessToken).digest('hex').slice(0, 16);
  if (cached?.tokenHash === tokenHash && Date.now() < cached.expiresAt) return cached.models;
  if (!supportsInProcessH2()) return [];
  try {
    const requestBody = toBinary(
      GetUsableModelsRequestSchema,
      create(GetUsableModelsRequestSchema, {}),
    );
    const response = await callUnaryOverH2({
      accessToken,
      rpcPath: '/agent.v1.AgentService/GetUsableModels',
      requestBody,
      url: getCursorAgentUrl(),
    });
    if (response.status < 200 || response.status >= 300 || response.body.length === 0) return [];
    let decoded;
    try {
      decoded = fromBinary(GetUsableModelsResponseSchema, response.body);
    } catch {
      const body = decodeConnectUnaryBody(response.body);
      decoded = body ? fromBinary(GetUsableModelsResponseSchema, body) : undefined;
    }
    const models: DiscoveredCursorModel[] = [];
    for (const model of decoded?.models ?? []) {
      const row = model as { modelId?: string; displayName?: string; displayNameShort?: string };
      const id = row.modelId?.trim();
      if (!id) continue;
      const name = row.displayName || row.displayNameShort || id;
      models.push({
        id,
        name,
        context: inferCursorContextWindow(id, name),
        output: inferCursorMaxOutputTokens(id, name),
      });
    }
    if (models.length) cached = { tokenHash, models, expiresAt: Date.now() + MODEL_CACHE_TTL_MS };
    return models;
  } catch {
    return [];
  }
}
