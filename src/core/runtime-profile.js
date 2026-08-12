function assertObject(value, label){
  if(!value || typeof value !== 'object') throw new TypeError(`${label} is required`);
}

function assertId(value, label){
  if(typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(value)){
    throw new TypeError(`${label}.id must be a stable lowercase id`);
  }
}

export function createRuntimeProfile({ persona, usecase, model }){
  assertObject(persona, 'persona');
  assertObject(usecase, 'usecase');
  assertObject(model, 'model');
  assertId(persona.id, 'persona');
  assertId(usecase.id, 'usecase');
  assertId(model.id, 'model');

  const profileId = `${persona.id}:${usecase.id}:${model.id}`;
  const memoryNamespace = persona.storage?.memoryNamespace || `pcai.character.${persona.id}.memory.v1`;

  return Object.freeze({
    schemaVersion: 1,
    profileId,
    persona,
    usecase,
    model,
    storage: Object.freeze({
      // Memory belongs to the character, not to the underlying AI model.
      // A persona may explicitly keep a legacy namespace during migration.
      memoryNamespace,
      // Runtime preferences may vary by use-case without contaminating character memory.
      settingsNamespace: `pcai.character.${persona.id}.usecase.${usecase.id}.settings.v1`
    })
  });
}
