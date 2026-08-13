import assert from 'node:assert/strict';
import { evaluatePendingMindDecay, evaluatePendingMindDecaySet } from '../src/core/pending-mind-decay-shadow.js';

const now = '2026-08-13T12:00:00.000Z';
const baseSelf = { activeConcerns: [] };

const fresh = evaluatePendingMindDecay({
  item: { id:'fresh', topic:'PCAIの続き', createdAt:'2026-08-13T06:00:00.000Z' },
  currentSelf: baseSelf,
  now
});
assert.equal(fresh.lifecycle, 'fresh');
assert.equal(fresh.effectiveWeight, 1);
assert.equal(fresh.discardAutomatically, false);
assert.equal(fresh.emitsMessages, false);

const aging = evaluatePendingMindDecay({
  item: { id:'aging', topic:'PCAIの続き', createdAt:'2026-08-11T12:00:00.000Z' },
  currentSelf: baseSelf,
  now
});
assert.equal(aging.lifecycle, 'aging');
assert.equal(aging.effectiveWeight, 0.7);

const stale = evaluatePendingMindDecay({
  item: { id:'stale', topic:'PCAIの続き', createdAt:'2026-08-09T12:00:00.000Z' },
  currentSelf: baseSelf,
  now
});
assert.equal(stale.lifecycle, 'stale');
assert.equal(stale.effectiveWeight, 0.35);

const old = evaluatePendingMindDecay({
  item: { id:'old', topic:'PCAIの続き', createdAt:'2026-08-01T12:00:00.000Z' },
  currentSelf: baseSelf,
  now
});
assert.equal(old.lifecycle, 'discard_candidate');
assert.equal(old.effectiveWeight, 0);
assert.equal(old.discardAutomatically, false, 'old pending must never be auto-deleted in Shadow Mode');

const revived = evaluatePendingMindDecay({
  item: { id:'revived', topic:'PCAI設計', createdAt:'2026-08-09T12:00:00.000Z' },
  currentSelf: { activeConcerns:[{ topic:'PCAI設計' }] },
  now
});
assert.equal(revived.lifecycle, 'stale');
assert.equal(revived.currentlyRelevant, true);
assert.ok(Math.abs(revived.effectiveWeight - 0.55) < 1e-9);

const invalid = evaluatePendingMindDecay({
  item: { id:'invalid', topic:'不明', createdAt:'not-a-date' },
  currentSelf: baseSelf,
  now
});
assert.equal(invalid.lifecycle, 'discard_candidate');
assert.equal(invalid.ageDays, null);
assert.equal(invalid.discardAutomatically, false);

const set = evaluatePendingMindDecaySet({
  pendingMind:[
    { id:'a', topic:'A', createdAt:'2026-08-13T06:00:00.000Z' },
    { id:'b', topic:'B', createdAt:'2026-08-09T12:00:00.000Z' },
    { id:'c', topic:'C', createdAt:'2026-08-01T12:00:00.000Z' }
  ],
  currentSelf: baseSelf,
  now
});
assert.equal(set.pendingCount, 3);
assert.ok(Math.abs(set.effectivePendingCount - 1.35) < 1e-9);
assert.equal(set.discardCandidateCount, 1);
assert.equal(set.discardAutomatically, false);
assert.equal(Object.isFrozen(set.evaluations), true);

console.log('pending mind decay shadow contracts: OK');
