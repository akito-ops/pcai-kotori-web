import assert from 'node:assert/strict';
import { createOneShotInitiativeOptIn } from '../src/core/one-shot-initiative-optin.js';

let now=1000;
const gate=createOneShotInitiativeOptIn({clock:()=>now,ttlMs:300000});
const evaluation={action:'would_speak'};
const pending=[{id:'p1',topic:'昨日の続き',state:'would_speak_shadow'}];

assert.equal(gate.inspect().armed,false);
assert.equal(gate.consider({evaluation,pendingMind:pending,visible:true}).emit,false);
assert.equal(gate.inspect().persistsPermission,false);
assert.equal(gate.inspect().callsModel,false);
assert.equal(gate.inspect().executesTools,false);
assert.equal(gate.inspect().maxEmissions,1);

gate.arm();
assert.equal(gate.inspect().armed,true);
assert.equal(gate.consider({evaluation:{action:'hold'},pendingMind:pending,visible:true}).emit,false);
assert.equal(gate.consider({evaluation,pendingMind:pending,visible:false}).emit,false);

const emission=gate.consider({evaluation,pendingMind:pending,visible:true});
assert.equal(emission.emit,true);
assert.match(emission.text,/昨日の続き/);
assert.equal(emission.callsModel,false);
assert.equal(emission.executesTools,false);
assert.equal(emission.rearmAutomatically,false);
assert.equal(gate.inspect().armed,false,'one emission must consume opt-in');
assert.equal(gate.consider({evaluation,pendingMind:pending,visible:true}).emit,false,'must not emit twice');

gate.arm();
now+=300001;
assert.equal(gate.inspect().armed,false,'permission must expire');
assert.equal(gate.consider({evaluation,pendingMind:pending,visible:true}).emit,false);

console.log('one-shot initiative opt-in: OK');
