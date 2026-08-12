export const legacyAppContract = Object.freeze({
  schemaVersion: 1,
  storageKey: 'pcai.kagaribi-kotori.web.v02',
  backend: Object.freeze({
    baseUrl: 'https://pcai-kotori-backend.siryuuakito.workers.dev',
    chatPath: '/api/chat',
    authHeader: 'x-pcai-access-token'
  })
});

export function assertLegacyCompatibility(bindings, contract = legacyAppContract){
  const failures = [];

  if(bindings?.storageKey !== contract.storageKey){
    failures.push('storage key mismatch');
  }
  if(bindings?.backend?.baseUrl !== contract.backend.baseUrl){
    failures.push('backend base URL mismatch');
  }
  if(bindings?.backend?.chatPath !== contract.backend.chatPath){
    failures.push('backend chat path mismatch');
  }
  if(bindings?.backend?.authHeader !== contract.backend.authHeader){
    failures.push('backend auth header mismatch');
  }

  if(failures.length){
    throw new Error(`Legacy app compatibility check failed: ${failures.join('; ')}`);
  }

  return true;
}
