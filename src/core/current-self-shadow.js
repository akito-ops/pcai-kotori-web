import { assertCurrentSelf, createInitialCurrentSelf, reconstructCurrentSelf } from './current-self.js';

const MAX_TOPICS = 5;

const cleanText = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const clampTopic = value => cleanText(value).slice(0, 80);

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function isMeaningfulUserTurn(turn){
  if(turn?.role !== 'user') return false;
  const content = cleanText(turn.content);
  if(content.length < 3) return false;
  if(/^(こんことー?[！!]?|こんにちは[！!]?|こんばんは[！!]?|おはよう[！!]?|ありがとう[！!]?|眠い|ねむい)$/i.test(content)) return false;
  return true;
}

function recentTopics(turns){
  const seen = new Set();
  const topics = [];
  for(const turn of [...turns].reverse()){
    if(!isMeaningfulUserTurn(turn)) continue;
    const topic = clampTopic(turn.content);
    if(!topic || seen.has(topic)) continue;
    seen.add(topic);
    topics.push(topic);
    if(topics.length >= MAX_TOPICS) break;
  }
  return topics;
}

function validateSeed(seed, personaId){
  if(!seed) return null;
  assertCurrentSelf(seed);
  if(seed.personaId !== personaId){
    throw new Error('Current Self shadow seed cannot cross persona boundaries');
  }
  return seed;
}

export function createCurrentSelfShadowEngine({
  personaId,
  initialSelf = null,
  clock = () => new Date().toISOString()
}){
  if(typeof clock !== 'function') throw new TypeError('shadow clock must be a function');

  const createBaseline = () => createInitialCurrentSelf({
    personaId,
    reconstructedAt: clock(),
    continuitySummary: 'Shadow Mode baseline. This state does not affect runtime behavior.',
    selfNarrative: {
      summary: 'Current Self reconstruction is being observed in Shadow Mode.',
      recentChange: ''
    }
  });

  const seed = validateSeed(initialSelf, personaId);
  let current = seed || createBaseline();
  let lastReport = null;

  function previewSleep({
    commitId,
    turns = [],
    reconstructedAt = clock()
  }){
    const id = cleanText(commitId);
    if(!id) throw new TypeError('shadow sleep requires commitId');
    if(!Array.isArray(turns)) throw new TypeError('shadow sleep turns must be an array');

    const userTurns = turns.filter(turn => turn?.role === 'user');
    const assistantTurns = turns.filter(turn => turn?.role === 'assistant');
    const topics = recentTopics(turns);
    const activeConcerns = topics.map((topic, index) => ({
      topic,
      salience: Math.max(0.35, 0.75 - index * 0.08),
      reason: 'observed_recent_user_turn'
    }));

    const candidate = reconstructCurrentSelf({
      previousSelf: current,
      previousCommitId: id,
      reconstructedAt,
      continuitySummary: `Shadow Modeでcommit ${id}を境界に、観測済みセッションから次の自己候補を再構成。`,
      selfNarrative: {
        summary: topics.length
          ? `直近セッションで共有された話題候補: ${topics.join(' / ')}`
          : '直近セッションを共有した。内容の意味づけはShadow Modeでは推測しない。',
        recentChange: '睡眠後のCurrent Self候補をShadow Modeで生成。実運用には未反映。'
      },
      activeConcerns,
      relationshipStance: {
        currentConcern: topics[0] ? `直近の共有話題: ${topics[0]}` : current.relationshipStance.currentConcern
      },
      growthDelta: {}
    });

    const report = deepFreeze({
      mode: 'shadow',
      schemaVersion: 1,
      persisted: false,
      affectsRuntime: false,
      generatedAt: reconstructedAt,
      source: {
        commitId: id,
        turnCount: turns.length,
        userTurnCount: userTurns.length,
        assistantTurnCount: assistantTurns.length,
        observedTopicCount: topics.length
      },
      candidate
    });

    current = candidate;
    lastReport = report;
    return report;
  }

  function reset(){
    current = createBaseline();
    lastReport = null;
    return current;
  }

  return Object.freeze({
    mode: 'shadow',
    persisted: false,
    affectsRuntime: false,
    seededFromSnapshot: Boolean(seed),
    previewSleep,
    reset,
    inspect: () => deepFreeze({
      mode: 'shadow',
      persisted: false,
      affectsRuntime: false,
      seededFromSnapshot: Boolean(seed),
      current,
      lastReport
    })
  });
}
