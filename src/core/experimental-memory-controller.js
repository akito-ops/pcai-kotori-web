import { assessLongTermMemoryImportance } from './memory-importance-shadow.js';
import { rankMemoryRecallOfflineShadow } from './memory-recall-ranking-offline-shadow.js';

export const EXPERIMENTAL_MEMORY_SETTING_KEY = 'pcai.experimental.memory.v1';

function readEnabled(storage){
  try{return storage?.getItem(EXPERIMENTAL_MEMORY_SETTING_KEY)==='on';}catch{return false;}
}

function writeEnabled(storage,enabled){
  try{
    if(enabled) storage?.setItem(EXPERIMENTAL_MEMORY_SETTING_KEY,'on');
    else storage?.removeItem(EXPERIMENTAL_MEMORY_SETTING_KEY);
  }catch{}
}

export function createExperimentalMemoryController({storage,readCurrentSelf=()=>null}={}){
  let enabled=readEnabled(storage);
  const listeners=new Set();

  function inspect(){
    return Object.freeze({
      enabled,
      settingKey:EXPERIMENTAL_MEMORY_SETTING_KEY,
      defaultEnabled:false,
      affectsTemporalRecall:false,
      reversible:true
    });
  }

  function setEnabled(next){
    enabled=Boolean(next);
    writeEnabled(storage,enabled);
    const snapshot=inspect();
    for(const listener of listeners){
      try{listener(snapshot);}catch{}
    }
    return snapshot;
  }

  function subscribe(listener){
    if(typeof listener!=='function') return ()=>{};
    listeners.add(listener);
    return ()=>listeners.delete(listener);
  }

  function rank({longTerm={},query='',limit=6}={}){
    if(!enabled) return Object.freeze({enabled:false,rankings:Object.freeze([])});
    const currentSelf=readCurrentSelf();
    const importance=assessLongTermMemoryImportance({longTerm,currentSelf});
    const ranked=rankMemoryRecallOfflineShadow({
      longTerm,
      importanceAssessments:importance.assessments,
      query,
      limit
    });
    return Object.freeze({
      enabled:true,
      rankings:ranked.rankings,
      assessedCount:ranked.assessedCount,
      affectsTemporalRecall:false
    });
  }

  return Object.freeze({inspect,setEnabled,subscribe,rank});
}
