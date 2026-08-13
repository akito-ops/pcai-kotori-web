function clean(value,max=100){
  return typeof value==='string' ? value.trim().slice(0,max) : '';
}

export function requestPendingMindDisclosure({pendingMind=[],explicitUserRequest=false}={}){
  if(explicitUserRequest!==true){
    return Object.freeze({
      allowed:false,
      reason:'explicit_user_request_required',
      text:'',
      emitsAutomatically:false,
      consumesPending:false,
      affectsAutonomy:false
    });
  }

  const rows=Array.isArray(pendingMind)?pendingMind:[];
  const candidate=rows.find(item=>item?.state==='would_speak_shadow')
    || rows.find(item=>item?.state==='held')
    || null;
  const topic=clean(candidate?.topic,80);
  if(!candidate||!topic){
    return Object.freeze({
      allowed:true,
      reason:'no_pending_intent',
      itemId:null,
      text:'今のところ、保留している話題はないみたい。',
      emitsAutomatically:false,
      consumesPending:false,
      affectsAutonomy:false
    });
  }

  return Object.freeze({
    allowed:true,
    reason:candidate.state==='would_speak_shadow'?'reconsidered_pending_intent':'held_pending_intent',
    itemId:clean(candidate.id,80)||null,
    text:`……うん。実は「${topic}」のこと、少し話そうか迷ってた。`,
    emitsAutomatically:false,
    consumesPending:false,
    affectsAutonomy:false
  });
}
