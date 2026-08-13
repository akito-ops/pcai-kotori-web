import assert from 'node:assert/strict';
import {
  CURRENT_SELF_SCHEMA_VERSION,
  createInitialCurrentSelf,
  reconstructCurrentSelf,
  assertCurrentSelf
} from '../src/core/current-self.js';

const t0 = '2026-08-13T00:00:00.000Z';
const t1 = '2026-08-14T00:00:00.000Z';

const initial = createInitialCurrentSelf({
  personaId: 'kagaribi-kotori',
  reconstructedAt: t0,
  continuitySummary: 'initial self',
  selfNarrative: { summary: 'curious about continuity' },
  innerState: {
    energy: 1.2,
    curiosity: 0.9,
    socialOpenness: 0.7,
    inhibition: -0.2,
    concern: 0.3
  },
  activeConcerns: Array.from({ length: 10 }, (_, i) => ({
    topic: `topic-${i}`,
    salience: i / 10,
    reason: 'test'
  })),
  relationshipStance: {
    familiarity: 0.8,
    trust: 0.9,
    conversationalDistance: 'close',
    recentTone: 'warm'
  },
  pendingMind: [
    {
      id: 'p1',
      type: 'withheld_speech',
      topic: '言おうとしてやめたこと',
      motive: 'share',
      inhibition: 'embarrassment',
      state: 'held',
      createdAt: t0,
      carryOver: true
    },
    {
      id: 'p2',
      type: 'question',
      topic: '一時的な疑問',
      state: 'resolved',
      carryOver: false
    }
  ]
});

assert.equal(initial.schemaVersion, CURRENT_SELF_SCHEMA_VERSION);
assert.equal(initial.continuity.generation, 0);
assert.equal(initial.continuity.previousCommitId, null);
assert.equal(initial.innerState.energy, 1, 'inner state must clamp above 1');
assert.equal(initial.innerState.inhibition, 0, 'inner state must clamp below 0');
assert.equal(initial.activeConcerns.length, 7, 'active concerns must stay bounded');
assert.equal(Object.isFrozen(initial), true, 'Current Self root must be immutable');
assert.equal(Object.isFrozen(initial.innerState), true, 'nested Current Self state must be immutable');
assert.equal(assertCurrentSelf(initial), true);

const next = reconstructCurrentSelf({
  previousSelf: initial,
  previousCommitId: 'commit-001',
  reconstructedAt: t1,
  continuitySummary: 'continued after sleep',
  selfNarrative: { recentChange: 'more willing to initiate conversation' },
  innerState: { energy: 0.6 },
  growthDelta: {
    strengthenedInterests: ['自発的な関係形成'],
    relationshipChanges: ['共同設計の関係が深まった']
  }
});

assert.equal(next.personaId, 'kagaribi-kotori');
assert.equal(next.continuity.generation, 1, 'reconstruction must advance one generation');
assert.equal(next.continuity.previousCommitId, 'commit-001');
assert.equal(next.selfNarrative.summary, initial.selfNarrative.summary, 'unspecified narrative fields must inherit');
assert.equal(next.selfNarrative.recentChange, 'more willing to initiate conversation');
assert.equal(next.innerState.energy, 0.6);
assert.equal(next.innerState.curiosity, initial.innerState.curiosity, 'unspecified inner state must inherit');
assert.equal(next.pendingMind.length, 1, 'only carry-over pending mind should survive by default');
assert.equal(next.pendingMind[0].id, 'p1');
assert.deepEqual(initial.pendingMind.map(x => x.id), ['p1','p2'], 'reconstruction must not mutate previous self');

assert.throws(() => reconstructCurrentSelf({
  previousSelf: initial,
  personaId: 'another-persona',
  reconstructedAt: t1
}), /cannot cross persona boundaries/, 'Current Self must fail closed across personas');

assert.throws(() => createInitialCurrentSelf({
  personaId: '',
  reconstructedAt: t0
}), /personaId is required/);

assert.throws(() => createInitialCurrentSelf({
  personaId: 'kagaribi-kotori',
  reconstructedAt: 'not-a-date'
}), /valid date-time/);

// v1 is a pure state model: no storage keys, network endpoints, model adapters,
// tool execution or autonomous-action APIs are part of its public contract.
for(const forbidden of ['storageKey','backend','chat','fetch','toolExecution','autonomousActions']){
  assert.equal(Object.hasOwn(next, forbidden), false, `Current Self must not expose ${forbidden}`);
}

console.log('current self v1 contracts: OK');
