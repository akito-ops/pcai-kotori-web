export function createLocalReplyRouter({ responder, legacyReply }){
  if(!responder || typeof responder.reply !== 'function'){
    throw new TypeError('local responder with reply() is required');
  }
  if(typeof legacyReply !== 'function'){
    throw new TypeError('legacy reply fallback is required during staged cutover');
  }

  return Object.freeze({
    reply(context){
      try{
        const next = responder.reply(context);
        if(typeof next === 'string' && next.trim()) return next;
      }catch(error){
        console.warn('PCAI local responder failed; using legacy fallback', error);
      }
      return legacyReply(context?.message || '');
    }
  });
}
