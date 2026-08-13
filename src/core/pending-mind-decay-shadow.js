const DAY_MS = 86_400_000;

function clamp01(value){
  const number = Number(value);
  if(!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function ageDays(createdAt, now){
  const created = Date.parse(createdAt || '');
  const current = Date.parse(now || '');
  if(!Number.isFinite(created) || !Number.isFinite(current)) return Infinity;
  return Math.max(0, (current - created) / DAY_MS);
}

function lifecycleForAge(days){
  if(days < 1) return Object.freeze({ state: 'fresh', baseWeight: 1 });
  if(days < 3) return Object.freeze({ state: 'aging', baseWeight: 0.7 });
  if(days < 7) return Object.freeze({ state: 'stale', baseWeight: 0.35 });
  return Object.freeze({ state: 'discard_candidate', baseWeight: 0 });
}

function normalize(value){
  return String(value ?? '').toLowerCase().replace(/[\s。、！？!?・「」『』（）()\[\]【】]/g, '');
}

function isCurrentlyRelevant(topic, currentSelf){
  const target = normalize(topic);
  if(target.length < 3) return false;
  const concerns = Array.isArray(currentSelf?.activeConcerns) ? currentSelf.activeConcerns : [];
  return concerns.some(item => {
    const concern = normalize(item?.topic);
    return concern.length >= 3 && (concern.includes(target) || target.includes(concern));
  });
}

export function evaluatePendingMindDecay({ item, currentSelf, now = new Date().toISOString() }){
  const days = ageDays(item?.createdAt, now);
  const lifecycle = lifecycleForAge(days);
  const relevant = isCurrentlyRelevant(item?.topic, currentSelf);
  const relevanceBoost = relevant ? 0.2 : 0;
  const effectiveWeight = clamp01(lifecycle.baseWeight + relevanceBoost);

  return Object.freeze({
    mode: 'shadow',
    itemId: typeof item?.id === 'string' ? item.id : '',
    ageDays: Number.isFinite(days) ? days : null,
    lifecycle: lifecycle.state,
    currentlyRelevant: relevant,
    effectiveWeight,
    discardAutomatically: false,
    affectsRuntime: false,
    emitsMessages: false
  });
}

export function evaluatePendingMindDecaySet({ pendingMind = [], currentSelf, now = new Date().toISOString() }){
  const items = Array.isArray(pendingMind) ? pendingMind.slice(0, 7) : [];
  const evaluations = items.map(item => evaluatePendingMindDecay({ item, currentSelf, now }));
  const effectivePendingCount = Math.min(7, evaluations.reduce((sum, item) => sum + item.effectiveWeight, 0));

  return Object.freeze({
    mode: 'shadow',
    evaluatedAt: now,
    pendingCount: items.length,
    effectivePendingCount,
    discardCandidateCount: evaluations.filter(item => item.lifecycle === 'discard_candidate').length,
    discardAutomatically: false,
    affectsRuntime: false,
    emitsMessages: false,
    evaluations: Object.freeze(evaluations)
  });
}
