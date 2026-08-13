import assert from 'node:assert/strict';
import { createShadowObservingMemoryAdapter } from '../src/adapters/memory-shadow-observer.js';

const before = {
  head: 'old',
  commits: [{ id:'old', at:'2026-08-13T01:00:00.000Z' }],
  shortTerm: [{ role:'user', content:'また明日', at:'2026-08-13T02:00:00.000Z' }]
};
const after = {
  head: 'new',
  commits: [...before.commits, { id:'new', at:'2026-08-13T03:00:00.000Z' }],
  shortTerm: []
};

let stored = JSON.stringify(before);
let exported = 0;
let cleared = 0;
let receivedPending = null;
let snapshotWrites = 0;

const adapter = createShadowObservingMemoryAdapter({
  memoryAdapter: {
    storageKey:'pcai.test',
    read:() => stored,
    write(value){ stored = value; return 'ok'; }
  },
  shadowEngine: {
    previewSleep(payload){
      receivedPending = payload.pendingMind;
      return { candidate:{ pendingMind: payload.pendingMind, personaId:'kagaribi-kotori' } };
    },
    reset(){}
  },
  shadowStore: {
    write(){ snapshotWrites += 1; },
    remove(){}
  },
  readPendingForSleep(){
    exported += 1;
    return [{ topic:'保留意図', state:'held', carryOver:true }];
  },
  onPendingCarriedOver({ count }){
    assert.equal(count, 1);
    cleared += 1;
  }
});

assert.equal(adapter.write(JSON.stringify(after)), 'ok');
assert.equal(exported, 1);
assert.equal(receivedPending.length, 1);
assert.equal(snapshotWrites, 1);
assert.equal(cleared, 1, 'RAM pending cleanup must happen only after shadow snapshot write succeeds');

let blockedExport = 0;
let blockedClear = 0;
const failingCanonical = createShadowObservingMemoryAdapter({
  memoryAdapter: {
    storageKey:'pcai.test',
    read:() => JSON.stringify(before),
    write(){ throw new Error('canonical failed'); }
  },
  shadowEngine:{ previewSleep(){ throw new Error('must not run'); }, reset(){} },
  readPendingForSleep(){ blockedExport += 1; return []; },
  onPendingCarriedOver(){ blockedClear += 1; }
});
assert.throws(() => failingCanonical.write(JSON.stringify(after)), /canonical failed/);
assert.equal(blockedExport, 0);
assert.equal(blockedClear, 0);

console.log('memory pending carryover contracts: OK');
