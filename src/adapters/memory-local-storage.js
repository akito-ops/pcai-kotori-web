export function createLocalStorageMemoryAdapter({ storageKey, storage }){
  if(typeof storageKey !== 'string' || !storageKey.trim()){
    throw new TypeError('storageKey is required');
  }
  if(!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function'){
    throw new TypeError('Web Storage compatible object is required');
  }

  return Object.freeze({
    storageKey,
    read(){
      return storage.getItem(storageKey);
    },
    write(serializedState){
      if(typeof serializedState !== 'string'){
        throw new TypeError('serializedState must be a string');
      }
      storage.setItem(storageKey, serializedState);
    },
    remove(){
      if(typeof storage.removeItem === 'function') storage.removeItem(storageKey);
    }
  });
}
