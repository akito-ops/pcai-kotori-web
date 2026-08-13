import assert from 'node:assert/strict';
import { createCurrentSelfShadowEngine } from '../src/core/current-self-shadow.js';

const times = [
  '2026-08-13T02:00:00.000Z',
  '2026-08-13T03:00:00.000Z',
  '2026-08-13T04:00:00.000Z',
  '2026-08-13T05:00:00.000Z'
];
let clockIndex = 0;
const engine = createCurrentSelfShadowEngine({
  personaId: 'kagaribi-kotori',
  clock: () => times[Math.min(clockIndex++, times.length - 1)]
});

const baseline = engine.inspect();
assert.equal(baseline.mode, 'shadow');
assert.equal(baseline.persisted, false);
assert.equal(baseline.affectsRuntime, false);
assert.equal(baseline.current.continuity.generation, 0);
assert.equal(baseline.lastReport, null);

const first = engine.previewSleep({
  commitId: 'commit-001',
  reconstructedAt: '2026-08-13T03:00:00.000Z',
  turns: [
    { role: 'user', content: 'こんことー！' },
    { role: 'assistant', content: 'assistant-private-detail' },
    { role: 'user', content: '自発的に話しかける仕組みを考えたい' },
    { role: 'user', content: 'Current Selfも詰めたい' }
  ]
});

assert.equal(first.persisted, false);
assert.equal(first.affectsRuntime, false);
assert.equal(first.source.commitId, 'commit-001');
assert.equal(first.source.turnCount, 4);
assert.equal(first.candidate.continuity.generation, 1);
assert.equal(first.candidate.continuity.previousCommitId, 'commit-001');
assert.equal(first.candidate.activeConcerns.length, 2, 'greeting must not become an active concern');
assert.match(first.candidate.selfNarrative.summary, /Current Self/);
assert.doesNotMatch(JSON.stringify(first), /assistant-private-detail/, 'raw assistant turns must not be retained in shadow report');
assert.deepEqual(first.candidate.growthDelta, {
  strengthenedInterests: [],
  weakenedInterests: [],
  relationshipChanges: [],
  selfChanges: []
}, 'Shadow Mode must not invent growth claims');

const second = engine.previewSleep({
  commitId: 'commit-002',
  reconstructedAt: '2026-08-13T04:00:00.000Z',
  turns: [{ role: 'user', content: '昨日の続きとして自己を再構成したい' }]
});
assert.equal(second.candidate.continuity.generation, 2);
assert.equal(second.candidate.personaId, 'kagaribi-kotori');

const reset = engine.reset();
assert.equal(reset.continuity.generation, 0);
assert.equal(engine.inspect().lastReport, null);

console.log('current self shadow contracts: OK');
