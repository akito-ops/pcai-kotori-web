function parseState(serialized){
  if(typeof serialized !== 'string' || !serialized.trim()) return null;
  const state = JSON.parse(serialized);
  return state && typeof state === 'object' ? state : null;
}

function isSleepTransition(before, after){
  return Boolean(
    before && after &&
    Array.isArray(before.shortTerm) && before.shortTerm.length > 0 &&
    Array.isArray(after.shortTerm) && after.shortTerm.length === 0 &&
    typeof after.head === 'string' && after.head &&
    after.head !== before.head
  );
}

function isResetTransition(before, after){
  return Boolean(
    before && after &&
    before.head &&
    after.head == null &&
    Array.isArray(after.shortTerm) && after.shortTerm.length === 0 &&
    Array.isArray(after.commits) && after.commits.length === 0
  );
}

function newestUserTurn(before, after){
  if(!after || !Array.isArray(after.shortTerm)) return null;
  const beforeLength = Array.isArray(before?.shortTerm) ? before.shortTerm.length : 0;
  if(after.shortTerm.length <= beforeLength) return null;
  const added = after.shortTerm.slice(beforeLength);
  return [...added].reverse().find(turn => turn?.role === 'user' && typeof turn?.content === 'string') || null;
}

export function createShadowObservingMemoryAdapter({
  memoryAdapter,
  shadowEngine,
  shadowStore = null,
  onUserTurn = null
}){
  if(!memoryAdapter || typeof memoryAdapter.read !== 'function' || typeof memoryAdapter.write !== 'function'){
    throw new TypeError('canonical memory adapter with read()/write() is required');
  }
  if(!shadowEngine || typeof shadowEngine.previewSleep !== 'function' || typeof shadowEngine.reset !== 'function'){
    throw new TypeError('Current Self shadow engine is required');
  }
  if(shadowStore && (typeof shadowStore.write !== 'function' || typeof shadowStore.remove !== 'function')){
    throw new TypeError('Current Self shadow store must provide write()/remove()');
  }
  if(onUserTurn !== null && typeof onUserTurn !== 'function'){
    throw new TypeError('onUserTurn must be a function when provided');
  }

  let previousSerialized = memoryAdapter.read();

  function resetShadow(){
    shadowEngine.reset();
    if(shadowStore) shadowStore.remove();
  }

  function observeTransition(beforeSerialized, afterSerialized){
    const before = parseState(beforeSerialized);
    const after = parseState(afterSerialized);

    const userTurn = newestUserTurn(before, after);
    if(userTurn && onUserTurn){
      try{ onUserTurn(Object.freeze({ ...userTurn })); }
      catch(error){ console.warn('PCAI relational permission shadow observation failed', error); }
    }

    if(isSleepTransition(before, after)){
      const report = shadowEngine.previewSleep({
        commitId: after.head,
        turns: before.shortTerm,
        reconstructedAt: after.commits?.at(-1)?.at || new Date().toISOString()
      });
      if(shadowStore) shadowStore.write(report.candidate);
      return;
    }

    if(isResetTransition(before, after)) resetShadow();
  }

  return Object.freeze({
    storageKey: memoryAdapter.storageKey,
    read: () => memoryAdapter.read(),
    write(serializedState){
      // Canonical write always happens first. Shadow failures can never block or
      // roll back production memory.
      const result = memoryAdapter.write(serializedState);
      try{
        observeTransition(previousSerialized, serializedState);
      }catch(error){
        console.warn('PCAI Current Self shadow observation failed', error);
      }
      previousSerialized = serializedState;
      return result;
    },
    remove(){
      const result = typeof memoryAdapter.remove === 'function' ? memoryAdapter.remove() : undefined;
      previousSerialized = null;
      try{ resetShadow(); }
      catch(error){ console.warn('PCAI Current Self shadow reset failed', error); }
      return result;
    }
  });
}
