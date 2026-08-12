import { createKotoriLocalResponder } from './kotori-local-responder.js';

const factories = Object.freeze({
  'kagaribi-kotori': createKotoriLocalResponder
});

export function createLocalResponderForPersona(bindings, options = {}){
  const personaId = bindings?.identity?.personaId;
  const factory = factories[personaId];
  if(!factory) throw new Error(`No local responder registered for persona: ${personaId || 'unknown'}`);
  return factory(bindings, options.random);
}

export function hasLocalResponder(personaId){
  return Boolean(factories[personaId]);
}
