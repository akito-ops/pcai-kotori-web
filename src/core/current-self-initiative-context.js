function clamp01(value, fallback = 0){
  const number = Number(value);
  if(!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function distance(value){
  return ['distant','neutral','familiar','close'].includes(value) ? value : 'neutral';
}

export function createCurrentSelfInitiativeContext(currentSelf){
  if(!currentSelf || typeof currentSelf !== 'object'){
    return Object.freeze({
      available: false,
      hasContinuity: false,
      hasPrimaryConcern: false,
      pendingCount: 0,
      relationshipDistance: 'neutral',
      curiosity: 0,
      socialOpenness: 0,
      inhibition: 1,
      concern: 0
    });
  }

  const generation = Number.isInteger(currentSelf.continuity?.generation)
    ? currentSelf.continuity.generation
    : 0;

  return Object.freeze({
    available: true,
    hasContinuity: generation > 0 || Boolean(currentSelf.continuity?.previousCommitId),
    hasPrimaryConcern: Boolean(currentSelf.activeConcerns?.[0]?.topic),
    pendingCount: Array.isArray(currentSelf.pendingMind)
      ? Math.min(currentSelf.pendingMind.length, 7)
      : 0,
    relationshipDistance: distance(currentSelf.relationshipStance?.conversationalDistance),
    curiosity: clamp01(currentSelf.innerState?.curiosity, 0.5),
    socialOpenness: clamp01(currentSelf.innerState?.socialOpenness, 0.5),
    inhibition: clamp01(currentSelf.innerState?.inhibition, 0.5),
    concern: clamp01(currentSelf.innerState?.concern, 0)
  });
}
