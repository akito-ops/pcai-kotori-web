import assert from 'node:assert/strict';
import { createShadowObservingMemoryAdapter } from '../src/adapters/memory-shadow-observer.js';

const initialState = {
  version: 3,
  head: 'old-head',
  commits: [{ id: 'old-head', at: '2026-08-12T00:00:00.000Z' }],
  shortTerm: [
    { role: 'user', content: '続きを話そう', at: '2026-08-13T00:00:00.000Z' },
    { role: 'assistant', content: 'うん', at: '2026-08-13T00:00:01.000Z' }
  ],
  longTerm: { episodic: [], semantic: [], relationship: [], procedural: [] }
};
let stored = JSON.stringify(initialState);
let previewCalls = 0;
let resetCalls = 0;
let observedAfterCanonicalWrite = false;

const canonical = {
  storageKey: 'pcai.test',
  read: () => stored,
  write(value){ stored = value; return 'canonical-ok'; },
  remove(){ stored = null; return 'removed'; }
};
const shadow = {
  previewSleep(payload){
    previewCalls += 1;
    const current = JSON.parse(stored);
    observedAfterCanonicalWrite = current.head === payload.commitId;
    assert.equal(payload.commitId, 'new-head');
    assert.equal(payload.turns.length, 2);
  },
  reset(){ resetCalls += 1; }
};

const adapter = createShadowObservingMemoryAdapter({ memoryAdapter: canonical, shadowEngine: shadow });
const normalWrite = {
  ...initialState,
  shortTerm: [...initialState.shortTerm, { role: 'user', content: '追加', at: '2026-08-13T00:00:02.000Z' }]
};
adapter.write(JSON.stringify(normalWrite));
assert.equal(previewCalls, 0, 'ordinary memory writes must not trigger sleep reconstruction');

const slept = {
  ...normalWrite,
  head: 'new-head',
  commits: [...normalWrite.commits, { id: 'new-head', at: '2026-08-13T01:00:00.000Z' }],
  shortTerm: []
};
const result = adapter.write(JSON.stringify(slept));
assert.equal(result, 'canonical-ok');
assert.equal(previewCalls, 1);
assert.equal(observedAfterCanonicalWrite, true, 'shadow must run only after canonical memory succeeds');
assert.equal(stored, JSON.stringify(slept), 'shadow observation must not rewrite canonical state');

const originalWarn = console.warn;
console.warn = () => {};
try{
  const throwingShadow = {
    previewSleep(){ throw new Error('shadow failure'); },
    reset(){}
  };
  let throwingStored = JSON.stringify(initialState);
  const safeAdapter = createShadowObservingMemoryAdapter({
    memoryAdapter: {
      storageKey: 'pcai.test',
      read: () => throwingStored,
      write(value){ throwingStored = value; return 'still-saved'; },
      remove(){ throwingStored = null; }
    },
    shadowEngine: throwingShadow
  });
  assert.equal(safeAdapter.write(JSON.stringify(slept)), 'still-saved', 'shadow failure must not fail canonical write');
  assert.equal(throwingStored, JSON.stringify(slept));
} finally {
  console.warn = originalWarn;
}

adapter.remove();
assert.equal(stored, null);
assert.equal(resetCalls, 1, 'canonical remove must reset only the in-memory shadow');

let blockedPreview = 0;
const failingCanonical = createShadowObservingMemoryAdapter({
  memoryAdapter: {
    storageKey: 'pcai.test',
    read: () => JSON.stringify(initialState),
    write(){ throw new Error('canonical failed'); }
  },
  shadowEngine: {
    previewSleep(){ blockedPreview += 1; },
    reset(){}
  }
});
assert.throws(() => failingCanonical.write(JSON.stringify(slept)), /canonical failed/);
assert.equal(blockedPreview, 0, 'shadow must not advance when canonical memory fails');

console.log('memory shadow observer contracts: OK');
