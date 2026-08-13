import { rankMemoryRecallOfflineShadow } from './memory-recall-ranking-offline-shadow.js';

function queryTokens(message){
  const normalized=String(message||'').toLowerCase().replace(/[。、！？!?・「」『』（）()]/g,' ');
  const chunks=normalized.match(/[a-z0-9]+|[ぁ-んァ-ン一-龥ー]{2,}/g)||[];
  const set=new Set();
  for(const chunk of chunks){
    if(chunk.length<=4) set.add(chunk);
    else{
      for(let i=0;i<chunk.length-1;i++) set.add(chunk.slice(i,i+2));
      for(let i=0;i<chunk.length-2;i++) set.add(chunk.slice(i,i+3));
    }
  }
  for(const stop of ['これ','それ','あれ','どう','って','です','ます','かな','なん','こと','話し','覚え']) set.delete(stop);
  return [...set];
}

function flatten(longTerm){
  return Object.entries(longTerm||{}).flatMap(([kind,items])=>(Array.isArray(items)?items:[]).map((item,index)=>({item,kind,key:`${kind}:${index}`,index})));
}

function legacyLocalRanking(longTerm, query){
  const tokens=queryTokens(query);
  const ranked=flatten(longTerm).map(({item,kind,key,index})=>{
    const text=String(item?.text||'').toLowerCase();
    const score=tokens.reduce((n,t)=>n+(text.includes(t)?1:0),0)+(Number(item?.importance)||0)*0.25-index*0.0001;
    return Object.freeze({key,kind,score});
  }).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
  return Object.freeze(ranked);
}

function legacyModelRanking(longTerm, query){
  const tokens=queryTokens(query);
  const ranked=flatten(longTerm).map(({item,kind,key,index})=>{
    const text=String(item?.text||'').toLowerCase();
    const lexical=tokens.reduce((n,t)=>n+(text.includes(t)?2:0),0);
    const typeBonus=kind==='semantic'?1.2:kind==='relationship'?0.4:0;
    const score=lexical+typeBonus+(Number(item?.importance)||0)-index*0.0001;
    return Object.freeze({key,kind,score});
  }).filter(x=>x.score>=1.2).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
  return Object.freeze(ranked);
}

function rankMap(items){
  return new Map(items.map((item,index)=>[item.key,index+1]));
}

function diffRows({legacyLocal,legacyModel,shadow}){
  const local=rankMap(legacyLocal);
  const model=rankMap(legacyModel);
  const next=rankMap(shadow);
  const keys=[...new Set([...local.keys(),...model.keys(),...next.keys()])].sort();
  return Object.freeze(keys.map(key=>Object.freeze({
    key,
    legacyLocalRank:local.get(key)??null,
    legacyModelRank:model.get(key)??null,
    shadowRank:next.get(key)??null
  })));
}

export function compareMemoryRecallOfflineShadow({longTerm={},importanceAssessments=[],query='',limit=6}){
  const safeLimit=Math.max(1,Math.min(12,Number.isInteger(limit)?limit:6));
  const legacyLocal=legacyLocalRanking(longTerm,query).slice(0,safeLimit);
  const legacyModel=legacyModelRanking(longTerm,query).slice(0,safeLimit);
  const shadowReport=rankMemoryRecallOfflineShadow({longTerm,importanceAssessments,query,limit:safeLimit});
  const shadow=shadowReport.rankings;

  return Object.freeze({
    mode:'offline-shadow-diff',
    queryPresent:Boolean(String(query||'').trim()),
    legacyLocalTopKey:legacyLocal[0]?.score>=1?legacyLocal[0].key:null,
    legacyModelTopKey:legacyModel[0]?.key??null,
    shadowTopKey:shadow[0]?.key??null,
    localTopMatchesShadow:Boolean(legacyLocal[0]?.score>=1&&legacyLocal[0]?.key===shadow[0]?.key),
    modelTopMatchesShadow:Boolean(legacyModel[0]?.key&&legacyModel[0]?.key===shadow[0]?.key),
    rows:diffRows({legacyLocal,legacyModel,shadow}),
    diagnosticOnly:true,
    affectsRuntime:false,
    changesRecall:false,
    sendsToModel:false,
    writesCanonicalMemory:false,
    exposesMemoryText:false
  });
}
