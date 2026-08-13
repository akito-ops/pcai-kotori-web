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

function assertSafeRuntime(profile){
  const failures = [];

  if(!profile?.persona?.id) failures.push('persona is missing');
  if(!profile?.usecase?.id) failures.push('usecase is missing');
  if(!profile?.model?.id) failures.push('model is missing');
  if(!profile?.storage?.memoryNamespace) failures.push('memory namespace is missing');

  if(profile.persona?.boundaries?.mayRewritePersonaCore !== false){
    failures.push('persona core rewrite must stay disabled');
  }
  if(profile.persona?.boundaries?.mayInventMemories !== false){
    failures.push('memory invention must stay disabled');
  }
  if(profile.usecase?.capabilities?.autonomousActions !== false){
    failures.push('autonomous actions must stay disabled');
  }
  if(profile.usecase?.capabilities?.toolExecution !== false){
    failures.push('tool execution must stay disabled');
  }
  if(profile.usecase?.safety?.allowPaidFallback !== false){
    failures.push('paid fallback must stay disabled');
  }
  if(profile.model?.policy?.paidFallback !== false){
    failures.push('model paid fallback must stay disabled');
  }
  if(profile.model?.policy?.tokenPersistence !== 'memory-only'){
    failures.push('access token persistence must be memory-only');
  }

  if(failures.length){
    throw new Error(`Unsafe PCAI runtime: ${failures.join('; ')}`);
  }
}

function currentJstHour(){
  return Number(new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    hour12: false
  }));
}

try{
  assertSafeRuntime(runtime);
  const bindings = createRuntimeBindings(runtime);
  assertLegacyCompatibility(bindings);
  const modelAdapter = createModelHttpAdapter(bindings);
  const canonicalMemoryAdapter = createLocalStorageMemoryAdapter({
    storageKey: bindings.storageKey,
    storage: window.localStorage
  });
  const currentSelfShadowStore = createCurrentSelfShadowStore({
    personaId: bindings.identity.personaId,
    storage: window.localStorage
  });
  const previousSelfSnapshot = currentSelfShadowStore.read();
  const currentSelfShadow = createCurrentSelfShadowEngine({
    personaId: bindings.identity.personaId,
    initialSelf: previousSelfSnapshot
  });
  const bootCurrentSelfShadow = createBootCurrentSelfShadow({
    snapshot: previousSelfSnapshot,
    bootedAt: new Date().toISOString(),
    environment: { hour: currentJstHour() }
  });
  const memoryAdapter = createShadowObservingMemoryAdapter({
    memoryAdapter: canonicalMemoryAdapter,
    shadowEngine: currentSelfShadow,
    shadowStore: currentSelfShadowStore
  });
  const bridge = createRuntimeBridge({ bindings, modelAdapter, memoryAdapter });
  const localResponder = createLocalResponderForPersona(bindings);
  const readCurrentSelfContext = () => createCurrentSelfResponderContext({
    bootReport: bootCurrentSelfShadow,
    shadowInspection: currentSelfShadow.inspect()
  });
  const readInitiativeCurrentSelf = () => createCurrentSelfInitiativeContext(
    currentSelfShadow.inspect().current
  );
  const initiativeShadow = createInitiativeShadowEngine({
    readCurrentSelf: readInitiativeCurrentSelf,
    readEnvironment: () => Object.freeze({
      visible: typeof document.visibilityState === 'string'
        ? document.visibilityState !== 'hidden'
        : true,
      idleSeconds: 0,
      hour: currentJstHour()
    })
  });
  initiativeShadow.evaluate();

  const localReply = (context, legacyReply) => createLocalReplyRouter({
    responder: localResponder,
    legacyReply
  }).reply(Object.freeze({ ...context, currentSelf: readCurrentSelfContext() }));
  const currentSelfShadowDiagnostics = Object.freeze({
    mode: 'shadow',
    snapshotPersisted: true,
    affectsRuntime: false,
    snapshotStorageKey: currentSelfShadowStore.storageKey,
    inspect: () => Object.freeze({
      ...currentSelfShadow.inspect(),
      snapshotAvailableAtBoot: Boolean(previousSelfSnapshot),
      boot: bootCurrentSelfShadow
    })
  });
  const currentSelfContextDiagnostics = Object.freeze({
    mode: 'read-only',
    scope: 'local-responder-continuity-only',
    writeEnabled: false,
    read: () => readCurrentSelfContext()
  });
  const initiativeShadowDiagnostics = Object.freeze({
    mode: 'shadow',
    evaluationCadence: 'boot-only',
    affectsRuntime: false,
    autonomousActionsEnabled: false,
    emitsMessages: false,
    inspect: () => initiativeShadow.inspect()
  });

  // Read-only diagnostics/compatibility bridge. Secrets and canonical user memories are never exposed here.
  Object.defineProperties(window, {
    PCAIRuntime: {
      value: runtime,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAIBindings: {
      value: bindings,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAIModelAdapter: {
      value: modelAdapter,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAIMemoryAdapter: {
      value: memoryAdapter,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAIBridge: {
      value: bridge,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAILocalResponder: {
      value: localResponder,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAILocalReply: {
      value: localReply,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAICurrentSelfShadow: {
      value: currentSelfShadowDiagnostics,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAICurrentSelfContext: {
      value: currentSelfContextDiagnostics,
      writable: false,
      configurable: false,
      enumerable: false
    },
    PCAIInitiativeShadow: {
      value: initiativeShadowDiagnostics,
      writable: false,
      configurable: false,
      enumerable: false
    }
  });

  await import('../app.js');
}catch(error){
  console.error(error);
  const target = document.getElementById('chat');
  if(target){
    const message = document.createElement('div');
    message.className = 'message system';
    message.textContent = '安全設定または互換性の確認に失敗したため、PCAIの起動を停止しました。';
    target.replaceChildren(message);
  }
}
