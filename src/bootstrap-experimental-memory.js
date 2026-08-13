import { runtime } from './config/runtime.js';
import { createRuntimeBindings } from './core/runtime-bindings.js';
import { assertLegacyCompatibility } from './core/legacy-contract.js';
import { createModelHttpAdapter } from './adapters/model-http.js';
import { createLocalStorageMemoryAdapter } from './adapters/memory-local-storage.js';
import { createCurrentSelfShadowStore } from './adapters/current-self-shadow-store.js';
import { createShadowObservingMemoryAdapter } from './adapters/memory-shadow-observer.js';
import { createRuntimeBridge } from './core/runtime-bridge.js';
import { createLocalResponderForPersona } from './responders/responder-factory.js';
import { createLocalReplyRouter } from './core/local-reply-router.js';
import { createCurrentSelfShadowEngine } from './core/current-self-shadow.js';
import { createBootCurrentSelfShadow } from './core/current-self-boot-shadow.js';
import { createCurrentSelfResponderContext } from './core/current-self-responder-context.js';
import { createCurrentSelfInitiativeContext } from './core/current-self-initiative-context.js';
import { createInitiativeShadowEngine } from './core/initiative-shadow.js';
import { createInitiativeShadowScheduler } from './core/initiative-shadow-scheduler.js';
import { createPendingMindShadowEngine } from './core/pending-mind-shadow-engine.js';
import { requestPendingMindDisclosure } from './core/pending-mind-manual-disclosure.js';
import { createOneShotInitiativeOptIn } from './core/one-shot-initiative-optin.js';
import { evaluatePendingMindDecaySet } from './core/pending-mind-decay-shadow.js';
import { assessLongTermMemoryImportance, assessPendingMindImportance } from './core/memory-importance-shadow.js';
import { detectRelationalPermission } from './core/relational-permission-shadow.js';
import { reconsiderPendingMindShadow } from './core/pending-mind-reconsideration-shadow.js';
import { createExperimentalMemoryController } from './core/experimental-memory-controller.js';

function assertSafeRuntime(profile){
  const failures=[];
  if(!profile?.persona?.id) failures.push('persona is missing');
  if(!profile?.usecase?.id) failures.push('usecase is missing');
  if(!profile?.model?.id) failures.push('model is missing');
  if(!profile?.storage?.memoryNamespace) failures.push('memory namespace is missing');
  if(profile.persona?.boundaries?.mayRewritePersonaCore!==false) failures.push('persona core rewrite must stay disabled');
  if(profile.persona?.boundaries?.mayInventMemories!==false) failures.push('memory invention must stay disabled');
  if(profile.usecase?.capabilities?.autonomousActions!==false) failures.push('autonomous actions must stay disabled');
  if(profile.usecase?.capabilities?.toolExecution!==false) failures.push('tool execution must stay disabled');
  if(profile.usecase?.safety?.allowPaidFallback!==false) failures.push('paid fallback must stay disabled');
  if(profile.model?.policy?.paidFallback!==false) failures.push('model paid fallback must stay disabled');
  if(profile.model?.policy?.tokenPersistence!=='memory-only') failures.push('access token persistence must be memory-only');
  if(failures.length) throw new Error(`Unsafe PCAI runtime: ${failures.join('; ')}`);
}

function currentJstHour(){return Number(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo',hour:'2-digit',hour12:false}));}
function parseCanonicalState(serialized){try{const state=serialized?JSON.parse(serialized):null;return state&&typeof state==='object'?state:null;}catch{return null;}}
function idleSecondsFromCanonical(memoryAdapter){
  const state=parseCanonicalState(memoryAdapter.read()); if(!state)return 0;
  const turns=Array.isArray(state.shortTerm)?state.shortTerm:[];
  const lastTurnAt=[...turns].reverse().find(turn=>typeof turn?.at==='string')?.at;
  const commits=Array.isArray(state.commits)?state.commits:[];
  const lastCommitAt=[...commits].reverse().find(commit=>typeof commit?.at==='string')?.at;
  const activityMs=Date.parse(lastTurnAt||lastCommitAt||state.createdAt||'');
  return Number.isFinite(activityMs)?Math.max(0,Math.min(86400,Math.floor((Date.now()-activityMs)/1000))):0;
}
function isTemporalRecall(message){return /(昨日|一昨日|おととい|今日|先週|前回|この前|前に話した).{0,20}(覚えて|何話した|何を話した|何だっけ|思い出|振り返)/.test(String(message||''));}
function isExplicitPendingDisclosureRequest(message){
  const m=String(message||'').replace(/\s+/g,'').replace(/[、，,？?！!。]/g,'');
  return m==='今話したいことある' || m==='何か話したいことある' || m==='言いたいことある' || m==='今言いたいことある';
}
function itemFromKey(longTerm,key){
  const [kind,indexText]=String(key||'').split(':'); const index=Number(indexText);
  const items=Array.isArray(longTerm?.[kind])?longTerm[kind]:[];
  const item=Number.isInteger(index)?items[index]:null;
  return item?{...item,kind}:null;
}

try{
  assertSafeRuntime(runtime);
  const bindings=createRuntimeBindings(runtime); assertLegacyCompatibility(bindings);
  const modelAdapter=createModelHttpAdapter(bindings);
  const canonicalMemoryAdapter=createLocalStorageMemoryAdapter({storageKey:bindings.storageKey,storage:window.localStorage});
  const currentSelfShadowStore=createCurrentSelfShadowStore({personaId:bindings.identity.personaId,storage:window.localStorage});
  const previousSelfSnapshot=currentSelfShadowStore.read();
  const currentSelfShadow=createCurrentSelfShadowEngine({personaId:bindings.identity.personaId,initialSelf:previousSelfSnapshot});
  const bootCurrentSelfShadow=createBootCurrentSelfShadow({snapshot:previousSelfSnapshot,bootedAt:new Date().toISOString(),environment:{hour:currentJstHour()}});
  const pendingMindShadow=createPendingMindShadowEngine({initialPending:Array.isArray(previousSelfSnapshot?.pendingMind)?previousSelfSnapshot.pendingMind:[]});
  const readCanonicalLongTerm=()=>parseCanonicalState(canonicalMemoryAdapter.read())?.longTerm||{episodic:[],semantic:[],relationship:[],procedural:[]};
  const readLongTermImportance=()=>assessLongTermMemoryImportance({longTerm:readCanonicalLongTerm(),currentSelf:currentSelfShadow.inspect().current});
  const readPendingImportance=()=>assessPendingMindImportance({pendingMind:pendingMindShadow.read(),longTerm:readCanonicalLongTerm(),currentSelf:currentSelfShadow.inspect().current});
  const readPendingDecay=()=>evaluatePendingMindDecaySet({pendingMind:pendingMindShadow.read(),currentSelf:currentSelfShadow.inspect().current,importanceAssessments:readPendingImportance(),now:new Date().toISOString()});
  const readInitiativeCurrentSelf=()=>createCurrentSelfInitiativeContext(currentSelfShadow.inspect().current,{effectivePendingCount:readPendingDecay().effectivePendingCount});
  const initiativeShadow=createInitiativeShadowEngine({readCurrentSelf:readInitiativeCurrentSelf,readEnvironment:()=>Object.freeze({visible:document.visibilityState!=='hidden',idleSeconds:idleSecondsFromCanonical(canonicalMemoryAdapter),hour:currentJstHour()})});
  const experimentalMemory=createExperimentalMemoryController({storage:window.localStorage,readCurrentSelf:()=>currentSelfShadow.inspect().current});
  const oneShotInitiative=createOneShotInitiativeOptIn();
  const oneShotListeners=new Set();

  function manualPendingReply(message){
    if(!isExplicitPendingDisclosureRequest(message)) return null;
    return requestPendingMindDisclosure({pendingMind:pendingMindShadow.read(),explicitUserRequest:true}).text;
  }

  function experimentalItems(message,limit=6){
    if(!experimentalMemory.inspect().enabled||isTemporalRecall(message)) return [];
    const longTerm=readCanonicalLongTerm();
    const report=experimentalMemory.rank({longTerm,query:message,limit});
    return (report.rankings||[])
      .filter(row=>row.lexicalRelevance>=0.12&&row.score>=0.22)
      .map(row=>itemFromKey(longTerm,row.key))
      .filter(Boolean);
  }

  function observeUserPermission(turn){
    const permission=detectRelationalPermission(turn?.content); if(permission.kind==='none')return;
    pendingMindShadow.applyReconsideration(reconsiderPendingMindShadow({pendingMind:pendingMindShadow.read(),permission,currentSelf:currentSelfShadow.inspect().current,initiative:initiativeShadow.inspect().lastEvaluation}));
  }
  const memoryAdapter=createShadowObservingMemoryAdapter({memoryAdapter:canonicalMemoryAdapter,shadowEngine:currentSelfShadow,shadowStore:currentSelfShadowStore,onUserTurn:observeUserPermission,readPendingForSleep:()=>pendingMindShadow.exportForSleep(),onPendingCarriedOver:()=>pendingMindShadow.clearAfterSleep()});
  const baseBridge=createRuntimeBridge({bindings,modelAdapter,memoryAdapter});
  const bridge=Object.freeze({...baseBridge,chat:request=>{
    const pendingReply=manualPendingReply(request?.message);
    if(pendingReply!==null) return Promise.resolve(pendingReply);
    if(!experimentalMemory.inspect().enabled||isTemporalRecall(request?.message)) return baseBridge.chat(request);
    const items=experimentalItems(request?.message,bindings.memory?.sendRelevantMemoriesToModel||6);
    if(!items.length) return baseBridge.chat(request);
    return baseBridge.chat({...request,relevantMemories:items.map(item=>({kind:item.kind,text:String(item.text||item.summary||'').slice(0,1200)}))});
  }});
  const localResponder=createLocalResponderForPersona(bindings);
  const readCurrentSelfContext=()=>createCurrentSelfResponderContext({bootReport:bootCurrentSelfShadow,shadowInspection:currentSelfShadow.inspect()});
  const baseLocalReply=(context,legacyReply)=>createLocalReplyRouter({responder:localResponder,legacyReply}).reply(Object.freeze({...context,currentSelf:readCurrentSelfContext()}));
  const localReply=(context,legacyReply)=>{
    const pendingReply=manualPendingReply(context?.message);
    if(pendingReply!==null) return pendingReply;
    if(!experimentalMemory.inspect().enabled||context?.intent||isTemporalRecall(context?.message)) return baseLocalReply(context,legacyReply);
    const item=experimentalItems(context?.message,1)[0];
    return baseLocalReply(item?{...context,relevantMemory:item}:context,legacyReply);
  };

  const bootInitiativeEvaluation=initiativeShadow.evaluate();
  const initiativeShadowScheduler=createInitiativeShadowScheduler({
    engine:initiativeShadow,
    intervalMs:60000,
    onEvaluation:evaluation=>{
      pendingMindShadow.observeInitiative({evaluation,currentSelf:currentSelfShadow.inspect().current});
      const emission=oneShotInitiative.consider({evaluation,pendingMind:pendingMindShadow.read(),visible:document.visibilityState!=='hidden'});
      if(emission.emit){
        for(const listener of oneShotListeners){try{listener(emission);}catch(error){console.warn('PCAI one-shot initiative listener failed',error);}}
      }
    }
  });
  initiativeShadowScheduler.start({initialEvaluation:bootInitiativeEvaluation});

  const experimentalDiagnostics=Object.freeze({
    inspect:()=>experimentalMemory.inspect(),
    setEnabled:value=>experimentalMemory.setEnabled(value),
    rank:({query='',limit=6}={})=>experimentalMemory.rank({longTerm:readCanonicalLongTerm(),query,limit}),
    autonomousActionsEnabled:false,
    affectsTemporalRecall:false
  });
  const oneShotDiagnostics=Object.freeze({
    inspect:()=>oneShotInitiative.inspect(),
    arm:()=>oneShotInitiative.arm(),
    disarm:()=>oneShotInitiative.disarm(),
    subscribe:listener=>{if(typeof listener!=='function')return()=>{};oneShotListeners.add(listener);return()=>oneShotListeners.delete(listener);},
    callsModel:false,
    executesTools:false,
    persistsPermission:false,
    maxEmissions:1
  });

  Object.defineProperties(window,{
    PCAIRuntime:{value:runtime,writable:false,configurable:false,enumerable:false},
    PCAIBindings:{value:bindings,writable:false,configurable:false,enumerable:false},
    PCAIModelAdapter:{value:modelAdapter,writable:false,configurable:false,enumerable:false},
    PCAIMemoryAdapter:{value:memoryAdapter,writable:false,configurable:false,enumerable:false},
    PCAIBridge:{value:bridge,writable:false,configurable:false,enumerable:false},
    PCAILocalResponder:{value:localResponder,writable:false,configurable:false,enumerable:false},
    PCAILocalReply:{value:localReply,writable:false,configurable:false,enumerable:false},
    PCAIExperimentalMemory:{value:experimentalDiagnostics,writable:false,configurable:false,enumerable:false},
    PCAIOneShotInitiative:{value:oneShotDiagnostics,writable:false,configurable:false,enumerable:false},
    PCAICurrentSelfShadow:{value:Object.freeze({mode:'shadow',snapshotPersisted:true,affectsRuntime:false,inspect:()=>Object.freeze({...currentSelfShadow.inspect(),boot:bootCurrentSelfShadow})}),writable:false,configurable:false,enumerable:false},
    PCAICurrentSelfContext:{value:Object.freeze({mode:'read-only',writeEnabled:false,read:()=>readCurrentSelfContext()}),writable:false,configurable:false,enumerable:false},
    PCAIInitiativeShadow:{value:Object.freeze({mode:'shadow',affectsRuntime:false,autonomousActionsEnabled:false,emitsMessages:false,inspect:()=>Object.freeze({...initiativeShadow.inspect(),scheduler:initiativeShadowScheduler.inspect()})}),writable:false,configurable:false,enumerable:false},
    PCAIPendingMindShadow:{value:Object.freeze({mode:'shadow',affectsRuntime:false,emitsMessages:false,inspect:()=>pendingMindShadow.inspect()}),writable:false,configurable:false,enumerable:false},
    PCAIMemoryImportanceShadow:{value:Object.freeze({mode:'shadow',writesCanonicalMemory:false,affectsRuntime:false,inspect:()=>Object.freeze({longTerm:readLongTermImportance(),pending:readPendingImportance()})}),writable:false,configurable:false,enumerable:false},
    PCAIPendingMindDecayShadow:{value:Object.freeze({mode:'shadow',importanceAware:true,deletesAutomatically:false,affectsRuntime:false,inspect:()=>readPendingDecay()}),writable:false,configurable:false,enumerable:false}
  });
  await import('../app.js');
}catch(error){
  console.error(error);
  const target=document.getElementById('chat');
  if(target){const message=document.createElement('div');message.className='message system';message.textContent='安全設定または互換性の確認に失敗したため、PCAIの起動を停止しました。';target.replaceChildren(message);}
}
