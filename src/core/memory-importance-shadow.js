const KIND_PRIOR = Object.freeze({
  episodic: 0.45,
  semantic: 0.62,
  relationship: 0.78,
  procedural: 0.58,
  pending: 0.55
});

function clamp01(value, fallback = 0){
  const number = Number(value);
  if(!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function clean(value){
  return String(value ?? '').toLowerCase().replace(/[\s。、！？!?・「」『』（）()\[\]【】]/g, '');
}

function grams(value){
  const text = clean(value);
  const set = new Set();
  if(text.length < 3) return set;
  for(let i = 0; i <= text.length - 3; i += 1) set.add(text.slice(i, i + 3));
  return set;
}

function similarity(a, b){
  const left = grams(a);
  const right = grams(b);
  if(!left.size || !right.size) return 0;
  let overlap = 0;
  for(const token of left) if(right.has(token)) overlap += 1;
  return overlap / Math.max(1, Math.min(left.size, right.size));
}

function relatedCount(item, peers){
  const source = item?.text || item?.summary || item?.topic || '';
  if(!source) return 0;
  return peers.reduce((count, peer) => {
    if(peer === item) return count;
    const target = peer?.text || peer?.summary || peer?.topic || '';
    return count + (similarity(source, target) >= 0.45 ? 1 : 0);
  }, 0);
}

function currentRelevance(item, currentSelf){
  const source = item?.text || item?.summary || item?.topic || '';
  const concerns = Array.isArray(currentSelf?.activeConcerns) ? currentSelf.activeConcerns : [];
  if(!source || !concerns.length) return 0;
  return concerns.reduce((best, concern) => Math.max(best, similarity(source, concern?.topic || '')), 0);
}

function inferKind(item, explicitKind){
  if(explicitKind && KIND_PRIOR[explicitKind] !== undefined) return explicitKind;
  if(item?.type === 'withheld_intention' || item?.state === 'held' || item?.state === 'would_speak_shadow') return 'pending';
  return 'episodic';
}

function reasonCodes(components){
  const reasons = [];
  if(components.storedSignal >= 0.8) reasons.push('stored_importance_high');
  if(components.typeSignificance >= 0.7) reasons.push('high_significance_memory_kind');
  if(components.confidence >= 0.9) reasons.push('high_confidence');
  if(components.recurrence >= 0.5) reasons.push('recurrent_theme');
  if(components.currentRelevance >= 0.45) reasons.push('currently_relevant');
  if(components.unresolvedness >= 0.8) reasons.push('unresolved');
  if(components.relationshipSignificance >= 0.8) reasons.push('relationship_significant');
  if(components.personalSignificance >= 0.6) reasons.push('user_specific');
  return Object.freeze(reasons);
}

export function assessMemoryImportance({ item, kind, peers = [], currentSelf = null, key = '' }){
  const resolvedKind = inferKind(item, kind);
  const typeSignificance = KIND_PRIOR[resolvedKind] ?? 0.45;
  const storedSignal = Number.isFinite(Number(item?.importance))
    ? clamp01(item.importance)
    : typeSignificance;
  const confidence = Number.isFinite(Number(item?.confidence))
    ? clamp01(item.confidence)
    : (resolvedKind === 'pending' ? 0.9 : 0.7);
  const recurrence = clamp01(relatedCount(item, peers) / 3);
  const relevance = clamp01(currentRelevance(item, currentSelf));
  const unresolvedness = resolvedKind === 'pending' && ['held','would_speak_shadow'].includes(item?.state) ? 1 : 0;
  const relationshipSignificance = resolvedKind === 'relationship' || item?.owner === 'relationship' ? 1 : 0;
  const personalSignificance = item?.owner === 'user' || resolvedKind === 'semantic' || resolvedKind === 'procedural'
    ? Math.max(0.55, storedSignal)
    : 0;

  const importanceScore = clamp01(
    storedSignal * 0.30 +
    typeSignificance * 0.15 +
    confidence * 0.10 +
    recurrence * 0.15 +
    relevance * 0.10 +
    unresolvedness * 0.10 +
    relationshipSignificance * 0.05 +
    personalSignificance * 0.05
  );
  const decayResistance = clamp01(0.15 + importanceScore * 0.85);
  const components = Object.freeze({
    storedSignal,
    typeSignificance,
    confidence,
    recurrence,
    currentRelevance: relevance,
    unresolvedness,
    relationshipSignificance,
    personalSignificance
  });

  return Object.freeze({
    mode: 'shadow',
    key: String(key || ''),
    kind: resolvedKind,
    importanceScore,
    decayResistance,
    reasons: reasonCodes(components),
    components,
    writesCanonicalMemory: false,
    affectsRuntime: false,
    emitsMessages: false
  });
}

export function assessLongTermMemoryImportance({ longTerm = {}, currentSelf = null }){
  const entries = [];
  for(const kind of ['episodic','semantic','relationship','procedural']){
    const items = Array.isArray(longTerm?.[kind]) ? longTerm[kind] : [];
    items.forEach((item, index) => entries.push({ item, kind, key: `${kind}:${index}` }));
  }
  const peers = entries.map(entry => entry.item);
  const assessments = entries.map(entry => assessMemoryImportance({ ...entry, peers, currentSelf }));
  return Object.freeze({
    mode: 'shadow',
    assessedCount: assessments.length,
    averageImportance: assessments.length
      ? assessments.reduce((sum, item) => sum + item.importanceScore, 0) / assessments.length
      : 0,
    writesCanonicalMemory: false,
    affectsRuntime: false,
    emitsMessages: false,
    assessments: Object.freeze(assessments)
  });
}

export function assessPendingMindImportance({ pendingMind = [], longTerm = {}, currentSelf = null }){
  const longPeers = Object.values(longTerm || {}).flatMap(items => Array.isArray(items) ? items : []);
  const pending = Array.isArray(pendingMind) ? pendingMind.slice(0, 7) : [];
  const peers = [...longPeers, ...pending];
  return Object.freeze(pending.map((item, index) => assessMemoryImportance({
    item,
    kind: 'pending',
    peers,
    currentSelf,
    key: `pending:${index}`
  })));
}
