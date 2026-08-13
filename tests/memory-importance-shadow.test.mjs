import assert from 'node:assert/strict';
import { assessMemoryImportance, assessLongTermMemoryImportance, assessPendingMindImportance } from '../src/core/memory-importance-shadow.js';

const currentSelf = {
  activeConcerns: [{ topic:'PCAIの記憶設計と重要度判定' }]
};

const relationship = assessMemoryImportance({
  item: { owner:'relationship', text:'ユーザーとPCAIは記憶設計を一緒に進めている', confidence:1, importance:0.8 },
  kind:'relationship',
  peers:[],
  currentSelf,
  key:'relationship:0'
});
assert.ok(relationship.importanceScore > 0.7);
assert.ok(relationship.decayResistance > 0.7);
assert.ok(relationship.reasons.includes('relationship_significant'));
assert.ok(relationship.reasons.includes('high_confidence'));
assert.equal(relationship.writesCanonicalMemory, false);
assert.equal(relationship.affectsRuntime, false);
assert.equal(relationship.emitsMessages, false);

const semantic = assessMemoryImportance({
  item: { owner:'user', text:'ユーザーは重要な記憶を長く保持したい', confidence:0.95, importance:0.9 },
  kind:'semantic',
  peers:[],
  currentSelf,
  key:'semantic:0'
});
assert.ok(semantic.reasons.includes('user_specific'));
assert.ok(semantic.reasons.includes('stored_importance_high'));

const pending = assessMemoryImportance({
  item: { type:'withheld_intention', topic:'PCAIの記憶設計と重要度判定', state:'held', createdAt:'2026-08-13T00:00:00.000Z' },
  kind:'pending',
  peers:[],
  currentSelf,
  key:'pending:0'
});
assert.equal(pending.components.unresolvedness, 1);
assert.ok(pending.reasons.includes('unresolved'));
assert.ok(pending.reasons.includes('currently_relevant'));

const recurrentPeers = [
  { text:'PCAIの記憶設計について話した' },
  { text:'PCAIの記憶設計を続けたい' },
  { text:'PCAIの記憶設計が重要だ' },
  { text:'PCAIの記憶設計を改善した' }
];
const recurrent = assessMemoryImportance({
  item: recurrentPeers[0],
  kind:'episodic',
  peers: recurrentPeers,
  currentSelf:null
});
assert.ok(recurrent.components.recurrence > 0);

const longTerm = {
  episodic:[{ text:'旅行の話', importance:0.4, confidence:0.8 }],
  semantic:[{ owner:'user', text:'ユーザーは旅行が好き', importance:0.9, confidence:0.95 }],
  relationship:[{ owner:'relationship', text:'一緒に計画を考えた', importance:0.8, confidence:1 }],
  procedural:[]
};
const set = assessLongTermMemoryImportance({ longTerm, currentSelf });
assert.equal(set.assessedCount, 3);
assert.equal(set.writesCanonicalMemory, false);
assert.ok(set.averageImportance > 0);
assert.equal(Object.isFrozen(set.assessments), true);
assert.doesNotMatch(JSON.stringify(set.assessments), /旅行の話|旅行が好き|一緒に計画/, 'diagnostics must not expose memory text');

const pendingSet = assessPendingMindImportance({
  pendingMind:[{ type:'withheld_intention', topic:'PCAIの記憶設計と重要度判定', state:'held' }],
  longTerm,
  currentSelf
});
assert.equal(pendingSet.length, 1);
assert.equal(pendingSet[0].kind, 'pending');
assert.doesNotMatch(JSON.stringify(pendingSet), /PCAIの記憶設計と重要度判定/);

console.log('memory importance shadow contracts: OK');
