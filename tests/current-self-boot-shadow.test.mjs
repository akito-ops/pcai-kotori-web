import assert from 'node:assert/strict';
import { createInitialCurrentSelf, reconstructCurrentSelf } from '../src/core/current-self.js';
import { createBootCurrentSelfShadow } from '../src/core/current-self-boot-shadow.js';

const base = createInitialCurrentSelf({
  personaId: 'kagaribi-kotori',
  reconstructedAt: '2026-08-12T22:00:00.000Z',
  continuitySummary: '前回までの自己状態',
  selfNarrative: { summary: 'Current Selfを検証している' },
  activeConcerns: [{ topic: '自己継続', salience: 0.8, reason: 'observed' }],
  pendingMind: [{ id: 'p1', topic: '続きを話したい', carryOver: true }]
});
const snapshot = reconstructCurrentSelf({
  previousSelf: base,
  previousCommitId: 'commit-001',
  reconstructedAt: '2026-08-13T00:00:00.000Z'
});

const boot = createBootCurrentSelfShadow({
  snapshot,
  bootedAt: '2026-08-13T02:00:00.000Z',
  environment: { hour: 11 }
});

assert.equal(boot.available, true);
assert.equal(boot.affectsRuntime, false);
assert.equal(boot.persisted, false);
assert.equal(boot.source.generation, 1);
assert.equal(boot.candidate.generation, 1, 'boot must not advance self generation');
assert.equal(boot.source.previousCommitId, 'commit-001');
assert.equal(boot.environment.daypart, 'morning');
assert.equal(boot.candidate.activeConcerns[0].topic, '自己継続');
assert.equal(boot.candidate.pendingMind[0].topic, '続きを話したい');

const noSnapshot = createBootCurrentSelfShadow({ snapshot: null });
assert.equal(noSnapshot.available, false);
assert.equal(noSnapshot.reason, 'no_previous_self_snapshot');

assert.throws(() => createBootCurrentSelfShadow({
  snapshot,
  bootedAt: 'not-a-date'
}), /valid current time/);

console.log('current self boot shadow contracts: OK');
