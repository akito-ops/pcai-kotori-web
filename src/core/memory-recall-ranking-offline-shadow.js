function clamp01(value){
  const number = Number(value);
  if(!Number.isFinite(number)) return 0;
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

function lexicalRelevance(query, text){
  const left = grams(query);
  const right = grams(text);
  if(!left.size || !right.size) return 0;
  let overlap = 0;
  for(const token of left) if(right.has(token)) overlap += 1;
  return clamp01(overlap / Math.max(1, Math.min(left.size, right.size)));
}

function flatten(longTerm){
  const rows = [];
  for(const kind of ['episodic','semantic','relationship','procedural']){
    const items = Array.isArray(longTerm?.[kind]) ? longTerm[kind] : [];
    items.forEach((item, index) => rows.push({ kind, index, item, key:`${kind}:${index}` }));
  }
  return rows;
}

export function rankMemoryRecallOfflineShadow({ longTerm = {}, importanceAssessments = [], query = '', limit = 6 }){
  const safeLimit = Math.max(1, Math.min(12, Number.isInteger(limit) ? limit : 6));
  const assessmentByKey = new Map((Array.isArray(importanceAssessments) ? importanceAssessments : [])
    .filter(item => item && typeof item.key === 'string')
    .map(item => [item.key, item]));

  const ranked = flatten(longTerm).map(({ kind, item, key }) => {
    const text = item?.text || item?.summary || '';
    const lexical = lexicalRelevance(query, text);
    const importance = clamp01(assessmentByKey.get(key)?.importanceScore ?? item?.importance ?? 0);
    const confidence = clamp01(item?.confidence ?? 0.7);
    const score = clamp01(lexical * 0.65 + importance * 0.25 + confidence * 0.10);
    return Object.freeze({
      key,
      kind,
      score,
      lexicalRelevance: lexical,
      importanceSignal: importance,
      confidenceSignal: confidence,
      affectsRuntime: false,
      selectedForRuntime: false,
      sendsToModel: false
    });
  }).sort((a,b) => b.score - a.score || a.key.localeCompare(b.key)).slice(0, safeLimit);

  return Object.freeze({
    mode: 'offline-shadow',
    queryPresent: Boolean(String(query || '').trim()),
    rankedCount: ranked.length,
    affectsRuntime: false,
    changesRecall: false,
    sendsToModel: false,
    writesCanonicalMemory: false,
    rankings: Object.freeze(ranked)
  });
}
