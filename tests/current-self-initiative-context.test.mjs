import assert from 'node:assert/strict';
import { createCurrentSelfInitiativeContext } from '../src/core/current-self-initiative-context.js';

const full = {
  continuity: { generation: 4, previousCommitId: 'abc' },
  activeConcerns: [{ topic: '秘密の具体的な話題' }],
  pendingMind: [{ topic: '絶対に漏らしてはいけない保留内容' }, { topic: '二件目' }],
  relationshipStance: { conversationalDistance: 'close' },
  innerState: {
    curiosity: 0.8,
    socialOpenness: 0.7,
    inhibition: 0.3,
    concern: 0.6
  },
  selfNarrative: { summary: '内部自己物語の全文' }
};

const view = createCurrentSelfInitiativeContext(full);
assert.equal(view.available, true);
assert.equal(view.hasContinuity, true);
assert.equal(view.hasPrimaryConcern, true);
assert.equal(view.pendingCount, 2);
assert.equal(view.rawPendingCount, 2);
assert.equal(view.relationshipDistance, 'close');
assert.equal(view.curiosity, 0.8);
assert.equal(view.socialOpenness, 0.7);
assert.equal(view.inhibition, 0.3);
assert.equal(view.concern, 0.6);
assert.equal(Object.isFrozen(view), true);

const decayed = createCurrentSelfInitiativeContext(full, { effectivePendingCount: 0.35 });
assert.equal(decayed.pendingCount, 0.35, 'Initiative should receive decayed weight, not raw item count');
assert.equal(decayed.rawPendingCount, 2, 'raw Pending Mind count must remain observable separately');

const bounded = createCurrentSelfInitiativeContext(full, { effectivePendingCount: 99 });
assert.equal(bounded.pendingCount, 7);
const fallback = createCurrentSelfInitiativeContext(full, { effectivePendingCount: Number.NaN });
assert.equal(fallback.pendingCount, 2, 'invalid effective count must fail safe to raw count');

const serialized = JSON.stringify(view);
assert.doesNotMatch(serialized, /秘密の具体的な話題/);
assert.doesNotMatch(serialized, /絶対に漏らしてはいけない保留内容/);
assert.doesNotMatch(serialized, /内部自己物語の全文/);

const absent = createCurrentSelfInitiativeContext(null);
assert.equal(absent.available, false);
assert.equal(absent.hasContinuity, false);
assert.equal(absent.inhibition, 1);
assert.equal(absent.rawPendingCount, 0);

console.log('current self initiative context contracts: OK');
