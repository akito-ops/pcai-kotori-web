export function createModelHttpAdapter(bindings, fetchImpl = globalThis.fetch){
  if(typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  if(!bindings?.backend?.baseUrl) throw new TypeError('backend base URL is required');

  const { baseUrl, chatPath, authHeader } = bindings.backend;

  return Object.freeze({
    async chat({ accessToken, message, recentConversation, relevantMemories, mode }){
      if(typeof accessToken !== 'string' || !accessToken) throw new TypeError('access token is required');

      const response = await fetchImpl(`${baseUrl}${chatPath}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [authHeader]: accessToken
        },
        body: JSON.stringify({
          message,
          recentConversation,
          relevantMemories,
          mode
        })
      });

      let data = {};
      try{ data = await response.json(); }catch{}

      if(!response.ok){
        const error = new Error(data.error || `HTTP_${response.status}`);
        error.code = data.error || '';
        throw error;
      }
      if(typeof data.reply !== 'string' || !data.reply.trim()){
        throw new Error('empty_reply');
      }
      return data.reply.trim();
    }
  });
}
