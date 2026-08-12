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

  return Object.freeze({
    schemaVersion: 1,
    profileId,
    persona,
    usecase,
    model,
    storage: Object.freeze({
      // Character memory is intentionally independent from the AI model.
      // Changing models does not erase the relationship/history of the character.
      memoryNamespace: `pcai.character.${persona.id}.memory.v1`,
      // Runtime preferences may vary by use-case without contaminating character memory.
      settingsNamespace: `pcai.character.${persona.id}.usecase.${usecase.id}.settings.v1`
    })
  });
}
