import assert from 'node:assert/strict';
import { rankMemoryRecallOfflineShadow } from '../src/core/memory-recall-ranking-offline-shadow.js';

const longTerm = {
  episodic: [
    { text:'佐渡旅行でカモメに餌をあげた', importance:0.5, confidence:0.9 },
    { text:'タイピングゲームを作った', importance:0.6, confidence:0.9 }
  ],
  semantic: [
    { text:'ユーザーは旅行が好き', importance:0.95, confidence:0.95 }
  ],
  relationship: [
    { text:'ユーザーとPCAIは記憶設計を一緒に進めている', importance:0.9, confidence:1 }
  ],
  procedural: []
};

const importanceAssessments = [
  { key:'episodic:0', importanceScore:0.55 },
  { key:'episodic:1', importanceScore:0.60 },
  { key:'semantic:0', importanceScore:0.90 },
  { key:'relationship:0', importanceScore:0.92 }
];

const ranked = rankMemoryRecallOfflineShadow({
  longTerm,
  importanceAssessments,
  query:'佐渡旅行のカモメの話',
  limit:4
});

assert.equal(ranked.mode, 'offline-shadow');
assert.equal(ranked.affectsRuntime, false);
assert.equal(ranked.changesRecall, false);
assert.equal(ranked.sendsToModel, false);
assert.equal(ranked.writesCanonicalMemory, false);
assert.equal(ranked.rankings[0].key, 'episodic:0', 'lexically relevant memory must rank first');
assert.ok(ranked.rankings[0].lexicalRelevance > ranked.rankings[1].lexicalRelevance);
assert.equal(ranked.rankings.every(item => item.selectedForRuntime === false), true);
assert.equal(ranked.rankings.every(item => item.sendsToModel === false), true);
assert.doesNotMatch(JSON.stringify(ranked), /佐渡旅行|カモメ|タイピングゲーム|旅行が好き|記憶設計/, 'diagnostics must not expose memory text');
assert.equal(Object.isFrozen(ranked.rankings), true);

const unrelatedHighImportance = rankMemoryRecallOfflineShadow({
  longTerm,
  importanceAssessments,
  query:'タイピングゲーム',
  limit:4
});
assert.equal(unrelatedHighImportance.rankings[0].key, 'episodic:1', 'importance must not override strong lexical relevance');

const noQuery = rankMemoryRecallOfflineShadow({ longTerm, importanceAssessments, query:'', limit:2 });
assert.equal(noQuery.queryPresent, false);
assert.equal(noQuery.rankings.length, 2);
assert.ok(noQuery.rankings[0].importanceSignal >= noQuery.rankings[1].importanceSignal, 'without query, importance may provide diagnostic ordering');

console.log('offline memory recall ranking contracts: OK');
