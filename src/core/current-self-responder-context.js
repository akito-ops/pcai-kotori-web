function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function safeText(value, max = 120){
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function createCurrentSelfResponderContext({ bootReport, shadowInspection }){
  const current = shadowInspection?.current || bootReport?.current || null;
  if(!current || typeof current !== 'object'){
    return deepFreeze({
      available: false,
      hasContinuity: false,
      generation: 0,
      primaryConcern: '',
      relationshipDistance: 'neutral',
      pendingCount: 0,
      daypart: safeText(bootReport?.environment?.daypart, 20)
    });
  }

  const generation = Number.isInteger(current.continuity?.generation)
    ? current.continuity.generation
    : 0;
  const primaryConcern = safeText(current.activeConcerns?.[0]?.topic, 80);
  const distance = safeText(current.relationshipStance?.conversationalDistance, 20);
  const pendingCount = Array.isArray(current.pendingMind)
    ? Math.min(current.pendingMind.length, 7)
    : 0;

  return deepFreeze({
    available: true,
    hasContinuity: generation > 0 || Boolean(current.continuity?.previousCommitId),
    generation,
    primaryConcern,
    relationshipDistance: ['distant','neutral','familiar','close'].includes(distance) ? distance : 'neutral',
    pendingCount,
    daypart: safeText(bootReport?.environment?.daypart, 20)
  });
}
