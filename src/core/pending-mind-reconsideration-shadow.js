function clamp01(value){
  const number = Number(value);
  if(!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function distanceScore(value){
  return ({ distant: 0.1, neutral: 0.4, familiar: 0.7, close: 1 })[value] ?? 0.4;
}

export function reconsiderPendingMindShadow({
  pendingMind = [],
  permission,
  currentSelf,
  initiative
}){
  const held = Array.isArray(pendingMind)
    ? pendingMind.filter(item => item?.state === 'held' || item?.state === 'waiting_for_chance')
    : [];

  if(!held.length){
    return Object.freeze({
      mode: 'shadow',
      changed: false,
      transition: 'none',
      reason: 'no_held_intent',
      wouldEmitMessage: false,
      reconsideredCount: 0
    });
  }

  const signal = permission || { kind: 'none', strength: 0, reducesInhibition: 0, pressure: 0 };
  if(signal.kind === 'none'){
    return Object.freeze({
      mode: 'shadow',
      changed: false,
      transition: 'hold',
      reason: 'no_relational_permission',
      wouldEmitMessage: false,
      reconsideredCount: held.length
    });
  }

  const relationship = distanceScore(currentSelf?.relationshipStance?.conversationalDistance);
  const baselineInhibition = clamp01(currentSelf?.innerState?.inhibition ?? 0.5);
  const adjustedInhibition = clamp01(
    baselineInhibition - clamp01(signal.reducesInhibition) + clamp01(signal.pressure) * 0.35
  );
  const initiativeReady = initiative?.action === 'would_speak';
  const permissionValue = clamp01(signal.strength) * 0.45;
  const relationshipValue = relationship * 0.25;
  const initiativeValue = initiativeReady ? 0.2 : 0.05;
  const final = clamp01(permissionValue + relationshipValue + initiativeValue - adjustedInhibition * 0.35);

  let transition = 'hold';
  let reason = 'reconsidered_but_still_held';

  if(signal.kind === 'pressure' && signal.pressure >= 0.5){
    transition = 'hold';
    reason = 'pressure_does_not_create_permission';
  }else if(signal.kind === 'permission_to_remain_silent'){
    transition = 'hold';
    reason = 'silence_remains_valid';
  }else if(final >= 0.42 && relationship >= 0.7){
    transition = 'would_speak';
    reason = 'invitation_lowered_inhibition';
  }

  return Object.freeze({
    mode: 'shadow',
    changed: transition === 'would_speak',
    transition,
    reason,
    wouldEmitMessage: false,
    reconsideredCount: held.length,
    scores: Object.freeze({
      relationship,
      adjustedInhibition,
      final
    })
  });
}
