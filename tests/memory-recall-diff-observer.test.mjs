import assert from 'node:assert/strict';
import { compareMemoryRecallOfflineShadow } from '../src/core/memory-recall-diff-observer.js';

const longTerm={
  episodic:[
    {text:'佐渡旅行でカモメに餌をあげた',importance:0.5,confidence:0.9},
    {text:'タイピングゲームを作った',importance:0.6,confidence:0.9}
  ],
  semantic:[{text:'ユーザーは旅行が好き',importance:0.95,confidence:0.95}],
  relationship:[{text:'ユーザーとPCAIは記憶設計を一緒に進めている',importance:0.9,confidence:1}],
  procedural:[]
};

const importanceAssessments=[
  {key:'episodic:0',importanceScore:0.55},
  {key:'episodic:1',importanceScore:0.60},
  {key:'semantic:0',importanceScore:0.90},
  {key:'relationship:0',importanceScore:0.92}
];

const report=compareMemoryRecallOfflineShadow({
  longTerm,
  importanceAssessments,
  query:'佐渡旅行のカモメの話',
  limit:4
});

assert.equal(report.mode,'offline-shadow-diff');
assert.equal(report.diagnosticOnly,true);
assert.equal(report.affectsRuntime,false);
assert.equal(report.changesRecall,false);
assert.equal(report.sendsToModel,false);
assert.equal(report.writesCanonicalMemory,false);
assert.equal(report.exposesMemoryText,false);
assert.equal(report.shadowTopKey,'episodic:0');
assert.equal(report.legacyLocalTopKey,'episodic:0');
assert.equal(report.localTopMatchesShadow,true);
assert.equal(Object.isFrozen(report.rows),true);
assert.doesNotMatch(JSON.stringify(report),/佐渡旅行|カモメ|タイピングゲーム|旅行が好き|記憶設計/);

const disagreement=compareMemoryRecallOfflineShadow({
  longTerm,
  importanceAssessments,
  query:'',
  limit:4
});
assert.equal(disagreement.queryPresent,false);
assert.ok(disagreement.rows.length>0);
assert.equal(disagreement.rows.every(row=>!('text' in row)),true);

console.log('memory recall differential observer contracts: OK');
