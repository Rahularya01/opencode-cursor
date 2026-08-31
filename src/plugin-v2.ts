import type { CatalogDraft, PluginContext } from '@opencode-ai/plugin/v2/promise';
import { createCursor } from './index.js';
import { models, PROVIDER_ID } from './models.js';
import { discoverCursorModels } from './stream/model-discovery.js';

function applyCatalog(
  draft: CatalogDraft,
  entries: Array<{ id: string; name: string; context: number; output: number }>,
) {
  draft.provider.update(PROVIDER_ID, (provider) => {
    provider.name = 'Cursor';
  });
  for (const info of entries) {
    draft.model.update(PROVIDER_ID, info.id, (model) => {
      model.name = info.name;
      model.enabled = true;
      model.status = 'active';
      model.limit = { context: info.context, output: info.output };
    });
  }
}

export default {
  id: 'cursor.provider',
  async setup(ctx: PluginContext) {
    const staticEntries = Object.entries(models).map(([id, info]) => ({
      id,
      name: info.name,
      context: info.context,
      output: info.output,
    }));
    await ctx.catalog.transform((draft) => applyCatalog(draft, staticEntries));

    const token =
      typeof ctx.options.apiKey === 'string' ? ctx.options.apiKey : process.env.CURSOR_ACCESS_TOKEN;
    if (token) {
      const discovered = await discoverCursorModels(token);
      if (discovered.length) {
        await ctx.catalog.transform((draft) => applyCatalog(draft, discovered));
      }
    }

    await ctx.aisdk.sdk((event) => {
      if (!event.sdk && event.model.providerID === PROVIDER_ID)
        event.sdk = createCursor(event.options);
    });
    await ctx.aisdk.language((event) => {
      if (!event.language && event.model.providerID === PROVIDER_ID && event.sdk)
        event.language = event.sdk.languageModel(event.model.api.id);
    });
  },
};
