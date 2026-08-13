function clean(value,max=100){
  return typeof value==='string' ? value.trim().slice(0,max) : '';
}

export function createOneShotInitiativeOptIn({clock=()=>Date.now(),ttlMs=5*60*1000}={}){
  if(typeof clock!=='function') throw new TypeError('clock must be a function');
  const safeTtl=Math.max(60000,Math.min(10*60*1000,Number(ttlMs)||5*60*1000));
  let armedAt=null;
  let consumedAt=null;

  function isArmed(){
    if(armedAt===null||consumedAt!==null) return false;
    return Math.max(0,clock()-armedAt)<=safeTtl;
  }

  function inspect(){
    return Object.freeze({
      armed:isArmed(),
      armedAt,
      consumedAt,
      ttlMs:safeTtl,
      sessionOnly:true,
      maxEmissions:1,
      callsModel:false,
      executesTools:false,
      persistsPermission:false
    });
  }

  function arm(){
    armedAt=clock();
    consumedAt=null;
    return inspect();
  }

  function disarm(){
    armedAt=null;
    consumedAt=null;
    return inspect();
  }

  function consider({evaluation,pendingMind=[],visible=true}={}){
    if(!isArmed()) return Object.freeze({emit:false,reason:'not_armed'});
    if(visible!==true) return Object.freeze({emit:false,reason:'not_visible'});
    if(evaluation?.action!=='would_speak') return Object.freeze({emit:false,reason:'initiative_not_ready'});
    const rows=Array.isArray(pendingMind)?pendingMind:[];
    const candidate=rows.find(item=>item?.state==='would_speak_shadow')||rows.find(item=>item?.state==='held')||null;
    const topic=clean(candidate?.topic,80);
    if(!candidate||!topic) return Object.freeze({emit:false,reason:'no_pending_intent'});
    consumedAt=clock();
    return Object.freeze({
      emit:true,
      reason:'one_shot_optin_satisfied',
      itemId:clean(candidate.id,80)||null,
      text:`……あのね。「${topic}」のこと、今ちょっと話したくなった。`,
      callsModel:false,
      executesTools:false,
      rearmAutomatically:false
    });
  }

  return Object.freeze({arm,disarm,consider,inspect});
}
