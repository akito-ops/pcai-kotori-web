import assert from 'node:assert/strict';
import { createCurrentSelfResponderContext } from '../src/core/current-self-responder-context.js';

const current = {
  continuity: { generation: 3, previousCommitId: 'commit-003' },
  selfNarrative: { summary: 'THIS MUST NOT LEAK' },
  activeConcerns: [
    { topic: 'PCAIの自己継続', salience: 0.9 },
    { topic: 'secondary concern', salience: 0.5 }
  ],
  relationshipStance: { conversationalDistance: 'close' },
  pendingMind: [
    { topic: 'SECRET WITHHELD SPEECH' },
    { topic: 'another private pending item' }
  ]
};

const view = createCurrentSelfResponderContext({
  bootReport: { environment: { daypart: 'day' }, current },
  shadowInspection: { current }
});

assert.equal(view.available, true);
assert.equal(view.hasContinuity, true);
assert.equal(view.generation, 3);
assert.equal(view.primaryConcern, 'PCAIの自己継続');
assert.equal(view.relationshipDistance, 'close');
assert.equal(view.pendingCount, 2);
assert.equal(view.daypart, 'day');
assert.equal(Object.isFrozen(view), true);
assert.doesNotMatch(JSON.stringify(view), /THIS MUST NOT LEAK/);
assert.doesNotMatch(JSON.stringify(view), /SECRET WITHHELD SPEECH/);
assert.equal(Object.hasOwn(view, 'selfNarrative'), false);
assert.equal(Object.hasOwn(view, 'pendingMind'), false);

const unavailable = createCurrentSelfResponderContext({
  bootReport: { environment: { daypart: 'night' }, current: null },
  shadowInspection: { current: null }
});
assert.equal(unavailable.available, false);
assert.equal(unavailable.hasContinuity, false);
assert.equal(unavailable.daypart, 'night');

console.log('current self responder context contracts: OK');
