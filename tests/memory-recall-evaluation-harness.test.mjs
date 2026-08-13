import assert from 'node:assert/strict';
import { evaluateMemoryRecallCases } from '../src/core/memory-recall-evaluation-harness.js';

const longTerm = {
  episodic:[
    { text:'佐渡旅行でカモメに餌をあげた', importance:0.5, confidence:0.9 },
    { text:'タイピングゲームを作った', importance:0.6, confidence:0.9 },
    { text:'飛騨高山の旅行計画を考えた', importance:0.65, confidence:0.9 }
  ],
  semantic:[
    { owner:'user', text:'ユーザーは旅行が好き', importance:0.95, confidence:0.95 },
    { owner:'user', text:'ユーザーはPCAIの記憶設計を重視している', importance:0.95, confidence:0.95 }
  ],
  relationship:[
    { owner:'relationship', text:'ユーザーとPCAIは記憶設計を一緒に進めている', importance:0.9, confidence:1 }
  ],
  procedural:[]
};

const importanceAssessments = [
  { key:'episodic:0', importanceScore:0.55 },
  { key:'episodic:1', importanceScore:0.60 },
  { key:'episodic:2', importanceScore:0.65 },
  { key:'semantic:0', importanceScore:0.90 },
  { key:'semantic:1', importanceScore:0.92 },
  { key:'relationship:0', importanceScore:0.92 }
];

const cases = [
  { id:'sado', query:'佐渡旅行のカモメ', expectedTopKey:'episodic:0' },
  { id:'typing', query:'タイピングゲーム', expectedTopKey:'episodic:1' },
  { id:'hida', query:'飛騨高山の旅行', expectedTopKey:'episodic:2' },
  { id:'memory-design', query:'PCAIの記憶設計', expectedTopKey:'semantic:1' },
  { id:'travel-preference', query:'旅行が好き', expectedTopKey:'semantic:0' }
];

const report = evaluateMemoryRecallCases({ cases, longTerm, importanceAssessments, limit:6 });

assert.equal(report.mode, 'offline-evaluation-harness');
assert.equal(report.summary.totalCases, 5);
assert.equal(report.summary.labeledCases, 5);
assert.ok(report.summary.shadowExpectedAccuracy >= 0.8, 'shadow should meet initial offline quality floor');
assert.ok(report.summary.shadowExpectedAccuracy >= report.summary.legacyLocalExpectedAccuracy, 'shadow should not underperform legacy local on fixed cases');
assert.equal(report.affectsRuntime, false);
assert.equal(report.changesRecall, false);
assert.equal(report.sendsToModel, false);
assert.equal(report.writesCanonicalMemory, false);
assert.equal(report.exposesMemoryText, false);
assert.equal(Object.isFrozen(report.results), true);
assert.doesNotMatch(JSON.stringify(report), /カモメに餌|タイピングゲームを作った|飛騨高山の旅行計画|ユーザーは旅行が好き|記憶設計を一緒に進めている/);

const unlabeled = evaluateMemoryRecallCases({
  cases:[{ id:'unlabeled', query:'PCAI' }],
  longTerm,
  importanceAssessments
});
assert.equal(unlabeled.summary.labeledCases, 0);
assert.equal(unlabeled.summary.shadowExpectedAccuracy, 0);

console.log('memory recall evaluation harness contracts: OK');
