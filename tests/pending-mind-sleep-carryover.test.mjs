import assert from 'node:assert/strict';
import { createPendingMindShadowEngine } from '../src/core/pending-mind-shadow-engine.js';
import { createCurrentSelfShadowEngine } from '../src/core/current-self-shadow.js';

const clock = () => '2026-08-13T03:00:00.000Z';
const pending = createPendingMindShadowEngine({ clock });

pending.observeInitiative({
  evaluation: { action: 'hold' },
  currentSelf: { activeConcerns: [{ topic: '昨日から言おうとしていたこと' }] }
});
assert.equal(pending.inspect().pendingCount, 1);
assert.equal(pending.read()[0].carryOver, false, 'RAM-only pending must not be persistent before sleep');

pending.applyReconsideration({ transition: 'would_speak' });
assert.equal(pending.read()[0].state, 'would_speak_shadow');

const exported = pending.exportForSleep();
assert.equal(exported.length, 1);
assert.equal(exported[0].state, 'held', 'would-speak permission must never survive sleep as auto-speak authority');
assert.equal(exported[0].carryOver, true);
assert.equal(exported[0].topic, '昨日から言おうとしていたこと');
assert.equal(exported[0].shadowOnly, undefined, 'shadow-only implementation metadata must not persist');

const currentSelf = createCurrentSelfShadowEngine({
  personaId: 'kagaribi-kotori',
  clock
});
const report = currentSelf.previewSleep({
  commitId: 'sleep-commit',
  turns: [{ role: 'user', content: 'また明日話そう', at: clock() }],
  pendingMind: exported,
  reconstructedAt: clock()
});
assert.equal(report.candidate.pendingMind.length, 1);
assert.equal(report.candidate.pendingMind[0].state, 'held');
assert.equal(report.candidate.pendingMind[0].carryOver, true);
assert.equal(report.source.carriedPendingCount, 1);

const restored = createPendingMindShadowEngine({
  initialPending: report.candidate.pendingMind,
  clock
});
assert.equal(restored.inspect().pendingCount, 1);
assert.equal(restored.inspect().restoredCount, 1);
assert.equal(restored.read()[0].state, 'held');
assert.equal(restored.read()[0].restoredFromSnapshot, true);
assert.equal(restored.read()[0].shadowOnly, true);

restored.clearAfterSleep();
assert.equal(restored.inspect().pendingCount, 0);

const rejected = createPendingMindShadowEngine({
  initialPending: [{ topic: 'carryしない', carryOver: false }],
  clock
});
assert.equal(rejected.inspect().pendingCount, 0, 'non-carryable pending must not restore');

console.log('pending mind sleep carryover contracts: OK');
