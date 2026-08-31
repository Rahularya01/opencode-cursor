import type { Plugin } from '@opencode-ai/plugin';
import { beginCursorLogin, refreshCursorToken } from './auth.js';

let refreshPromise: ReturnType<typeof refreshCursorToken> | undefined;

const CursorAuthPlugin: Plugin = async ({ client }) => ({
  auth: {
    provider: 'cursor',
    async loader(getAuth) {
      const auth = await getAuth();
      if (auth.type === 'api') return { apiKey: auth.key };
      if (auth.type !== 'oauth') return {};
      if (auth.expires > Date.now()) return { apiKey: auth.access };

      refreshPromise ??= refreshCursorToken(auth.refresh).finally(() => {
        refreshPromise = undefined;
      });
      const refreshed = await refreshPromise;
      await client.auth.set({
        path: { id: 'cursor' },
        body: { type: 'oauth', ...refreshed },
      });
      return { apiKey: refreshed.access };
    },
    methods: [
      {
        type: 'oauth',
        label: 'Login with Cursor',
        async authorize() {
          const login = await beginCursorLogin();
          return {
            url: login.url,
            instructions: 'Complete the Cursor sign-in in your browser.',
            method: 'auto',
            async callback() {
              try {
                return { type: 'success', ...(await login.complete()) };
              } catch {
                return { type: 'failed' };
              }
            },
          };
        },
      },
    ],
  },
});

export default CursorAuthPlugin;
