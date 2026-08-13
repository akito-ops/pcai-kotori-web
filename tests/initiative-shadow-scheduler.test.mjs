import assert from 'node:assert/strict';
import { createInitiativeShadowScheduler } from '../src/core/initiative-shadow-scheduler.js';

let evaluations = 0;
const engine = {
  evaluate(){
    evaluations += 1;
    return Object.freeze({
      action: evaluations % 3 === 1 ? 'hold' : evaluations % 3 === 2 ? 'would_speak' : 'suppress',
      reason: `reason-${evaluations}`,
      wouldEmitMessage: false
    });
  }
};

let scheduledCallback = null;
let scheduledInterval = null;
const fakeSetInterval = (callback, interval) => {
  scheduledCallback = callback;
  scheduledInterval = interval;
  return 42;
};
let clockTick = 0;
const scheduler = createInitiativeShadowScheduler({
  engine,
  intervalMs: 60_000,
  setIntervalFn: fakeSetInterval,
  clock: () => `2026-08-13T02:${String(clockTick++).padStart(2,'0')}:00.000Z`
});

assert.equal(scheduler.inspect().running, false);
assert.equal(scheduler.inspect().history.length, 0);
assert.equal(scheduler.start({
  initialEvaluation: { action: 'hold', reason: 'boot', wouldEmitMessage: false }
}), true);
assert.equal(scheduler.start(), false, 'scheduler must not create duplicate intervals');
assert.equal(scheduledInterval, 60_000);
assert.equal(typeof scheduledCallback, 'function');
assert.equal(scheduler.inspect().running, true);
assert.equal(scheduler.inspect().history.length, 1);
assert.equal(scheduler.inspect().history[0].action, 'hold');
assert.equal(scheduler.inspect().history[0].wouldEmitMessage, false);

for(let i = 0; i < 15; i += 1) scheduledCallback();
const state = scheduler.inspect();
assert.equal(state.tickCount, 15);
assert.equal(state.history.length, 12, 'history must stay bounded to 12 records');
assert.equal(state.emitsMessages, false);
assert.equal(state.affectsRuntime, false);
assert.equal(state.hasIntervalHandle, true);
assert.equal(evaluations, 15);
for(const entry of state.history){
  assert.equal(entry.wouldEmitMessage, false);
  assert.equal(Object.isFrozen(entry), true);
}

assert.throws(() => createInitiativeShadowScheduler({
  engine,
  intervalMs: 59_999,
  setIntervalFn: fakeSetInterval
}), /at least 60000ms/);

let failCallback = null;
const failingScheduler = createInitiativeShadowScheduler({
  engine: { evaluate(){ throw new Error('boom'); } },
  setIntervalFn(callback){ failCallback = callback; return 1; },
  clock: () => '2026-08-13T03:00:00.000Z'
});
failingScheduler.start();
assert.doesNotThrow(() => failCallback());
assert.equal(failingScheduler.inspect().history.at(-1).action, 'suppress');
assert.equal(failingScheduler.inspect().history.at(-1).reason, 'evaluation_failed');
assert.equal(failingScheduler.inspect().history.at(-1).wouldEmitMessage, false);

console.log('initiative shadow scheduler contracts: OK');
