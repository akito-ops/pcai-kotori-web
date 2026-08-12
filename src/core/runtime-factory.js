import { createRuntimeProfile } from './runtime-profile.js';

function resolve(catalog, group, id){
  const collection = catalog?.[group];
  if(!collection || !Object.prototype.hasOwnProperty.call(collection, id)){
    throw new Error(`Unknown PCAI ${group.slice(0,-1)}: ${id}`);
  }
  return collection[id];
}

export function createRuntimeFromSelection({ catalog, selection }){
  if(!catalog || !selection) throw new TypeError('catalog and selection are required');

  const persona = resolve(catalog, 'personas', selection.personaId);
  const usecase = resolve(catalog, 'usecases', selection.usecaseId);
  const model = resolve(catalog, 'models', selection.modelId);

  return createRuntimeProfile({ persona, usecase, model });
}
