import { assertCurrentSelf } from '../core/current-self.js';

const DEFAULT_PREFIX = 'pcai.shadow.current-self.v1';

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function validPersonaId(value){
  const id = typeof value === 'string' ? value.trim() : '';
  if(!id || !/^[a-zA-Z0-9._-]+$/.test(id)){
    throw new TypeError('valid personaId is required for Current Self shadow store');
  }
  return id;
}

export function createCurrentSelfShadowStore({
  personaId,
  storage,
  prefix = DEFAULT_PREFIX
}){
  const id = validPersonaId(personaId);
  if(!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function'){
    throw new TypeError('storage with getItem()/setItem() is required');
  }

  const storageKey = `${prefix}.${id}`;

  function read(){
    try{
      const raw = storage.getItem(storageKey);
      if(!raw) return null;
      const parsed = JSON.parse(raw);
      assertCurrentSelf(parsed);
      if(parsed.personaId !== id) return null;
      return deepFreeze(parsed);
    }catch{
      return null;
    }
  }

  function write(state){
    assertCurrentSelf(state);
    if(state.personaId !== id){
      throw new Error('Current Self shadow snapshot cannot cross persona boundaries');
    }
    const serialized = JSON.stringify(state);
    storage.setItem(storageKey, serialized);
    return serialized;
  }

  function remove(){
    if(typeof storage.removeItem === 'function') storage.removeItem(storageKey);
  }

  return Object.freeze({
    storageKey,
    personaId: id,
    read,
    write,
    remove
  });
}
