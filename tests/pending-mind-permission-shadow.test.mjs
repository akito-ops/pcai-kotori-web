import assert from 'node:assert/strict';
import { createPendingMindShadowEngine } from '../src/core/pending-mind-shadow-engine.js';
import { reconsiderPendingMindShadow } from '../src/core/pending-mind-reconsideration-shadow.js';

const currentSelf = Object.freeze({
  activeConcerns: Object.freeze([{ topic: 'PCAIの自発性' }]),
  innerState: Object.freeze({ inhibition: 0.8 }),
  relationshipStance: Object.freeze({ conversationalDistance: 'close' })
});

const engine = createPendingMindShadowEngine({ clock: () => '2026-08-13T02:40:00.000Z' });
assert.equal(engine.inspect().pendingCount, 0);
assert.equal(engine.observeInitiative({ evaluation: { action: 'would_speak' }, currentSelf }), null);

const held = engine.observeInitiative({ evaluation: { action: 'hold' }, currentSelf });
assert.equal(held.state, 'held');
assert.equal(held.shadowOnly, true);
assert.equal(held.carryOver, false);
assert.equal(engine.inspect().pendingCount, 1);
engine.observeInitiative({ evaluation: { action: 'hold' }, currentSelf });
assert.equal(engine.inspect().pendingCount, 1, 'duplicate held topic must not multiply');

const invitationResult = reconsiderPendingMindShadow({
  pendingMind: engine.read(),
  permission: { kind: 'invitation', strength: 1, reducesInhibition: 0.35, pressure: 0.05 },
  currentSelf,
  initiative: { action: 'would_speak' }
});
assert.equal(invitationResult.transition, 'would_speak');
assert.equal(invitationResult.wouldEmitMessage, false);
assert.equal(engine.applyReconsideration(invitationResult), true);
assert.equal(engine.inspect().pending[0].state, 'would_speak_shadow');
assert.equal(engine.inspect().emitsMessages, false);

const gentleEngine = createPendingMindShadowEngine();
gentleEngine.observeInitiative({ evaluation: { action: 'hold' }, currentSelf });
const gentleResult = reconsiderPendingMindShadow({
  pendingMind: gentleEngine.read(),
  permission: { kind: 'permission_to_remain_silent', strength: 0.7, reducesInhibition: 0.2, pressure: 0 },
  currentSelf,
  initiative: { action: 'would_speak' }
});
assert.equal(gentleResult.transition, 'hold');
assert.equal(gentleResult.reason, 'silence_remains_valid');

const pressureResult = reconsiderPendingMindShadow({
  pendingMind: gentleEngine.read(),
  permission: { kind: 'pressure', strength: 0.45, reducesInhibition: 0.05, pressure: 0.65 },
  currentSelf,
  initiative: { action: 'would_speak' }
});
assert.equal(pressureResult.transition, 'hold');
assert.equal(pressureResult.reason, 'pressure_does_not_create_permission');

const empty = reconsiderPendingMindShadow({
  pendingMind: [],
  permission: { kind: 'invitation', strength: 1, reducesInhibition: 0.35, pressure: 0 },
  currentSelf,
  initiative: { action: 'would_speak' }
});
assert.equal(empty.transition, 'none');
assert.equal(empty.changed, false);

console.log('pending mind permission shadow contracts: OK');
