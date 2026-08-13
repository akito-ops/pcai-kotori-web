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

export function createShadowObservingMemoryAdapter({ memoryAdapter, shadowEngine }){
  if(!memoryAdapter || typeof memoryAdapter.read !== 'function' || typeof memoryAdapter.write !== 'function'){
    throw new TypeError('canonical memory adapter with read()/write() is required');
  }
  if(!shadowEngine || typeof shadowEngine.previewSleep !== 'function' || typeof shadowEngine.reset !== 'function'){
    throw new TypeError('Current Self shadow engine is required');
  }

  let previousSerialized = memoryAdapter.read();

  function observeTransition(beforeSerialized, afterSerialized){
    const before = parseState(beforeSerialized);
    const after = parseState(afterSerialized);

    if(isSleepTransition(before, after)){
      shadowEngine.previewSleep({
        commitId: after.head,
        turns: before.shortTerm,
        reconstructedAt: after.commits?.at(-1)?.at || new Date().toISOString()
      });
      return;
    }

    if(isResetTransition(before, after)) shadowEngine.reset();
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
      try{ shadowEngine.reset(); }
      catch(error){ console.warn('PCAI Current Self shadow reset failed', error); }
      return result;
    }
  });
}
