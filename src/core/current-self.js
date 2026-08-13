export const CURRENT_SELF_SCHEMA_VERSION = 1;

const MAX_ACTIVE_CONCERNS = 7;
const MAX_PENDING_MIND = 7;
const MAX_GROWTH_ITEMS = 7;
const DISTANCES = new Set(['distant','neutral','familiar','close']);

const clamp01 = value => {
  const number = Number(value);
  if(!Number.isFinite(number)) return 0.5;
  return Math.max(0, Math.min(1, number));
};
const text = value => typeof value === 'string' ? value.trim() : '';
const textList = value => Array.isArray(value)
  ? value.map(text).filter(Boolean).slice(0, MAX_GROWTH_ITEMS)
  : [];

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function validIso(value){
  if(!value || Number.isNaN(new Date(value).getTime())){
    throw new TypeError('reconstructedAt must be a valid date-time');
  }
  return value;
}

function normalizeInnerState(input = {}, fallback = {}){
  return {
    energy: clamp01(input.energy ?? fallback.energy ?? 0.5),
    curiosity: clamp01(input.curiosity ?? fallback.curiosity ?? 0.5),
    socialOpenness: clamp01(input.socialOpenness ?? fallback.socialOpenness ?? 0.5),
    inhibition: clamp01(input.inhibition ?? fallback.inhibition ?? 0.5),
    concern: clamp01(input.concern ?? fallback.concern ?? 0)
  };
}

function normalizeConcern(item){
  const topic = text(item?.topic);
  if(!topic) return null;
  return {
    topic,
    salience: clamp01(item?.salience ?? 0.5),
    reason: text(item?.reason)
  };
}

function normalizeConcerns(items = []){
  if(!Array.isArray(items)) return [];
  return items.map(normalizeConcern).filter(Boolean).slice(0, MAX_ACTIVE_CONCERNS);
}

function normalizeRelationship(input = {}, fallback = {}){
  const requestedDistance = text(input.conversationalDistance || fallback.conversationalDistance || 'neutral');
  return {
    familiarity: clamp01(input.familiarity ?? fallback.familiarity ?? 0),
    trust: clamp01(input.trust ?? fallback.trust ?? 0),
    conversationalDistance: DISTANCES.has(requestedDistance) ? requestedDistance : 'neutral',
    recentTone: text(input.recentTone ?? fallback.recentTone),
    currentConcern: text(input.currentConcern ?? fallback.currentConcern)
  };
}

function normalizePendingItem(item){
  const topic = text(item?.topic);
  if(!topic) return null;
  return {
    id: text(item?.id),
    type: text(item?.type) || 'unfinished_topic',
    topic,
    motive: text(item?.motive),
    inhibition: text(item?.inhibition),
    state: text(item?.state) || 'held',
    createdAt: text(item?.createdAt),
    carryOver: item?.carryOver !== false
  };
}

function normalizePending(items = []){
  if(!Array.isArray(items)) return [];
  return items.map(normalizePendingItem).filter(Boolean).slice(0, MAX_PENDING_MIND);
}

function normalizeGrowth(input = {}){
  return {
    strengthenedInterests: textList(input.strengthenedInterests),
    weakenedInterests: textList(input.weakenedInterests),
    relationshipChanges: textList(input.relationshipChanges),
    selfChanges: textList(input.selfChanges)
  };
}

function buildCurrentSelf({
  personaId,
  generation,
  previousCommitId,
  reconstructedAt,
  continuitySummary,
  selfNarrative,
  innerState,
  activeConcerns,
  relationshipStance,
  pendingMind,
  growthDelta
}){
  const id = text(personaId);
  if(!id) throw new TypeError('personaId is required');
  if(!Number.isInteger(generation) || generation < 0){
    throw new TypeError('generation must be a non-negative integer');
  }

  return deepFreeze({
    schemaVersion: CURRENT_SELF_SCHEMA_VERSION,
    personaId: id,
    continuity: {
      generation,
      previousCommitId: text(previousCommitId) || null,
      reconstructedAt: validIso(reconstructedAt),
      continuitySummary: text(continuitySummary)
    },
    selfNarrative: {
      summary: text(selfNarrative?.summary),
      recentChange: text(selfNarrative?.recentChange)
    },
    innerState: normalizeInnerState(innerState),
    activeConcerns: normalizeConcerns(activeConcerns),
    relationshipStance: normalizeRelationship(relationshipStance),
    pendingMind: normalizePending(pendingMind),
    growthDelta: normalizeGrowth(growthDelta)
  });
}

export function createInitialCurrentSelf({
  personaId,
  reconstructedAt = new Date().toISOString(),
  continuitySummary = '',
  selfNarrative = {},
  innerState = {},
  activeConcerns = [],
  relationshipStance = {},
  pendingMind = []
}){
  return buildCurrentSelf({
    personaId,
    generation: 0,
    previousCommitId: null,
    reconstructedAt,
    continuitySummary,
    selfNarrative,
    innerState,
    activeConcerns,
    relationshipStance,
    pendingMind,
    growthDelta: {}
  });
}

export function assertCurrentSelf(state){
  if(!state || typeof state !== 'object') throw new TypeError('current self is required');
  if(state.schemaVersion !== CURRENT_SELF_SCHEMA_VERSION) throw new Error('unsupported Current Self schema');
  if(!text(state.personaId)) throw new Error('Current Self personaId is missing');
  if(!Number.isInteger(state.continuity?.generation) || state.continuity.generation < 0){
    throw new Error('Current Self generation is invalid');
  }
  validIso(state.continuity?.reconstructedAt);
  return true;
}

export function reconstructCurrentSelf({
  previousSelf,
  personaId = previousSelf?.personaId,
  previousCommitId,
  reconstructedAt = new Date().toISOString(),
  continuitySummary,
  selfNarrative,
  innerState,
  activeConcerns,
  relationshipStance,
  pendingMind,
  growthDelta = {}
}){
  assertCurrentSelf(previousSelf);
  const id = text(personaId);
  if(id !== previousSelf.personaId){
    throw new Error('Current Self cannot cross persona boundaries');
  }

  const carriedPending = previousSelf.pendingMind.filter(item => item.carryOver !== false);
  const nextNarrative = {
    summary: selfNarrative?.summary ?? previousSelf.selfNarrative.summary,
    recentChange: selfNarrative?.recentChange ?? previousSelf.selfNarrative.recentChange
  };

  return buildCurrentSelf({
    personaId: id,
    generation: previousSelf.continuity.generation + 1,
    previousCommitId: previousCommitId ?? previousSelf.continuity.previousCommitId,
    reconstructedAt,
    continuitySummary: continuitySummary ?? previousSelf.continuity.continuitySummary,
    selfNarrative: nextNarrative,
    innerState: normalizeInnerState(innerState, previousSelf.innerState),
    activeConcerns: activeConcerns ?? previousSelf.activeConcerns,
    relationshipStance: normalizeRelationship(relationshipStance, previousSelf.relationshipStance),
    pendingMind: pendingMind ?? carriedPending,
    growthDelta
  });
}
