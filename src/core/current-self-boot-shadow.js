import { assertCurrentSelf } from './current-self.js';

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function validIso(value){
  if(!value || Number.isNaN(new Date(value).getTime())){
    throw new TypeError('boot shadow requires a valid current time');
  }
  return value;
}

export function createBootCurrentSelfShadow({
  snapshot,
  bootedAt = new Date().toISOString(),
  environment = {}
}){
  if(!snapshot) return deepFreeze({
    mode: 'shadow-boot',
    available: false,
    affectsRuntime: false,
    persisted: false,
    reason: 'no_previous_self_snapshot'
  });

  assertCurrentSelf(snapshot);
  const time = validIso(bootedAt);
  const hour = Number.isInteger(environment.hour) ? environment.hour : null;
  const daypart = hour == null
    ? 'unknown'
    : (hour >= 23 || hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : 'evening');

  return deepFreeze({
    mode: 'shadow-boot',
    available: true,
    affectsRuntime: false,
    persisted: false,
    bootedAt: time,
    source: {
      personaId: snapshot.personaId,
      generation: snapshot.continuity.generation,
      previousCommitId: snapshot.continuity.previousCommitId,
      reconstructedAt: snapshot.continuity.reconstructedAt
    },
    environment: {
      hour,
      daypart
    },
    candidate: {
      personaId: snapshot.personaId,
      generation: snapshot.continuity.generation,
      continuitySummary: snapshot.continuity.continuitySummary,
      selfNarrative: snapshot.selfNarrative,
      innerState: snapshot.innerState,
      activeConcerns: snapshot.activeConcerns,
      relationshipStance: snapshot.relationshipStance,
      pendingMind: snapshot.pendingMind,
      growthDelta: snapshot.growthDelta
    }
  });
}
