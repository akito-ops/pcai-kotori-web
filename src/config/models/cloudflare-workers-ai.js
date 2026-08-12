export const cloudflareWorkersAI = Object.freeze({
  id: 'cloudflare-workers-ai',
  schemaVersion: 1,
  label: 'Cloudflare Workers AI',
  transport: Object.freeze({
    type: 'http',
    baseUrl: 'https://pcai-kotori-backend.siryuuakito.workers.dev',
    chatPath: '/api/chat',
    authHeader: 'x-pcai-access-token'
  }),
  policy: Object.freeze({
    paidFallback: false,
    tokenPersistence: 'memory-only'
  })
});
