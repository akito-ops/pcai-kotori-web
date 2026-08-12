export function createRuntimeBridge({ bindings, modelAdapter, memoryAdapter }){
  if(!bindings?.storageKey) throw new TypeError('runtime bindings are required');
  if(!modelAdapter || typeof modelAdapter.chat !== 'function'){
    throw new TypeError('model adapter with chat() is required');
  }
  if(!memoryAdapter || typeof memoryAdapter.read !== 'function' || typeof memoryAdapter.write !== 'function'){
    throw new TypeError('memory adapter with read()/write() is required');
  }
  if(memoryAdapter.storageKey !== bindings.storageKey){
    throw new Error('memory adapter namespace mismatch');
  }

  const memory = Object.freeze({
    storageKey: bindings.storageKey,
    policy: bindings.memory,
    read: () => memoryAdapter.read(),
    write: serializedState => memoryAdapter.write(serializedState),
    remove: () => memoryAdapter.remove()
  });

  return Object.freeze({
    schemaVersion: 2,
    storageKey: bindings.storageKey,
    identity: bindings.identity,
    personaFacts: bindings.personaFacts,
    voice: bindings.voice,
    memory,
    chat: request => modelAdapter.chat(request)
  });
}
