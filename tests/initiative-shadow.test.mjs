import assert from 'node:assert/strict';
import { evaluateInitiativeShadow, createInitiativeShadowEngine } from '../src/core/initiative-shadow.js';

const baseSelf = Object.freeze({
  available: true,
  hasContinuity: true,
  hasPrimaryConcern: true,
  pendingCount: 2,
  relationshipDistance: 'close',
  curiosity: 0.9,
  socialOpenness: 0.9,
  inhibition: 0.2,
  concern: 0.7
});

const speak = evaluateInitiativeShadow({
  currentSelf: baseSelf,
  environment: { visible: true, idleSeconds: 900, hour: 19 }
});
assert.equal(speak.mode, 'shadow');
assert.equal(speak.action, 'would_speak');
assert.equal(speak.reason, 'sufficient_motive_and_timing');
assert.equal(speak.affectsRuntime, false);
assert.equal(speak.wouldEmitMessage, false);
assert.ok(speak.scores.final >= 0.58);

const hidden = evaluateInitiativeShadow({
  currentSelf: baseSelf,
  environment: { visible: false, idleSeconds: 900, hour: 19 }
});
assert.equal(hidden.action, 'suppress');
assert.equal(hidden.reason, 'user_not_visible');
assert.equal(hidden.wouldEmitMessage, false);

const quiet = evaluateInitiativeShadow({
  currentSelf: baseSelf,
  environment: { visible: true, idleSeconds: 900, hour: 2 }
});
assert.equal(quiet.action, 'suppress');
assert.equal(quiet.reason, 'quiet_hours');

const shy = evaluateInitiativeShadow({
  currentSelf: { ...baseSelf, inhibition: 0.9 },
  environment: { visible: true, idleSeconds: 900, hour: 19 }
});
assert.equal(shy.action, 'hold');
assert.equal(shy.reason, 'high_inhibition');
assert.equal(shy.wouldEmitMessage, false);

const noContinuity = evaluateInitiativeShadow({
  currentSelf: { ...baseSelf, hasContinuity: false },
  environment: { visible: true, idleSeconds: 900, hour: 19 }
});
assert.equal(noContinuity.action, 'suppress');
assert.equal(noContinuity.reason, 'no_continuity');

let reads = 0;
const engine = createInitiativeShadowEngine({
  readCurrentSelf: () => { reads += 1; return baseSelf; },
  readEnvironment: () => ({ visible: true, idleSeconds: 900, hour: 19 })
});
assert.equal(engine.inspect().lastEvaluation, null);
const result = engine.evaluate();
assert.equal(result.action, 'would_speak');
assert.equal(reads, 1);
assert.equal(engine.inspect().affectsRuntime, false);
assert.equal(engine.inspect().lastEvaluation.wouldEmitMessage, false);

console.log('initiative shadow contracts: OK');
