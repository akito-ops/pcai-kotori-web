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
let shadowWrites = 0;
let shadowRemoves = 0;
let lastShadowSnapshot = null;
let observedUserTurns = [];

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
    assert.equal(payload.turns.length, 3);
    return { candidate: { personaId: 'kagaribi-kotori', continuity: { generation: 1 } } };
  },
  reset(){ resetCalls += 1; }
};
const shadowStore = {
  write(snapshot){ shadowWrites += 1; lastShadowSnapshot = snapshot; },
  remove(){ shadowRemoves += 1; }
};

const adapter = createShadowObservingMemoryAdapter({
  memoryAdapter: canonical,
  shadowEngine: shadow,
  shadowStore,
  onUserTurn(turn){
    const current = JSON.parse(stored);
    assert.equal(current.shortTerm.at(-1)?.content, turn.content, 'user turn observer must run after canonical write');
    observedUserTurns.push(turn);
  }
});
const normalWrite = {
  ...initialState,
  shortTerm: [...initialState.shortTerm, { role: 'user', content: '言いたいことがあるなら言ってね', at: '2026-08-13T00:00:02.000Z' }]
};
adapter.write(JSON.stringify(normalWrite));
assert.equal(previewCalls, 0, 'ordinary memory writes must not trigger sleep reconstruction');
assert.equal(shadowWrites, 0, 'ordinary memory writes must not persist Current Self snapshot');
assert.equal(observedUserTurns.length, 1, 'new user turn must be observed once');
assert.equal(observedUserTurns[0].content, '言いたいことがあるなら言ってね');

const assistantOnly = {
  ...normalWrite,
  shortTerm: [...normalWrite.shortTerm, { role: 'assistant', content: 'うん', at: '2026-08-13T00:00:03.000Z' }]
};
adapter.write(JSON.stringify(assistantOnly));
assert.equal(observedUserTurns.length, 1, 'assistant turns must not trigger relational permission observation');

const slept = {
  ...assistantOnly,
  head: 'new-head',
  commits: [...assistantOnly.commits, { id: 'new-head', at: '2026-08-13T01:00:00.000Z' }],
  shortTerm: []
};
const result = adapter.write(JSON.stringify(slept));
assert.equal(result, 'canonical-ok');
assert.equal(previewCalls, 1);
assert.equal(observedAfterCanonicalWrite, true, 'shadow must run only after canonical memory succeeds');
assert.equal(stored, JSON.stringify(slept), 'shadow observation must not rewrite canonical state');
assert.equal(shadowWrites, 1, 'successful sleep must persist exactly one shadow snapshot');
assert.equal(lastShadowSnapshot.continuity.generation, 1);

const originalWarn = console.warn;
console.warn = () => {};
try{
  const throwingShadow = {
    previewSleep(){ throw new Error('shadow failure'); },
    reset(){}
  };
  let throwingStored = JSON.stringify(initialState);
  let unsafeShadowWrite = 0;
  let permissionObserverCalls = 0;
  const safeAdapter = createShadowObservingMemoryAdapter({
    memoryAdapter: {
      storageKey: 'pcai.test',
      read: () => throwingStored,
      write(value){ throwingStored = value; return 'still-saved'; },
      remove(){ throwingStored = null; }
    },
    shadowEngine: throwingShadow,
    shadowStore: {
      write(){ unsafeShadowWrite += 1; },
      remove(){}
    },
    onUserTurn(){ permissionObserverCalls += 1; throw new Error('permission observer failed'); }
  });
  assert.equal(safeAdapter.write(JSON.stringify(normalWrite)), 'still-saved', 'permission observer failure must not fail canonical write');
  assert.equal(permissionObserverCalls, 1);
  assert.equal(safeAdapter.write(JSON.stringify(slept)), 'still-saved', 'shadow failure must not fail canonical write');
  assert.equal(throwingStored, JSON.stringify(slept));
  assert.equal(unsafeShadowWrite, 0, 'failed reconstruction must not persist a snapshot');
} finally {
  console.warn = originalWarn;
}

adapter.remove();
assert.equal(stored, null);
assert.equal(resetCalls, 1, 'canonical remove must reset the in-memory shadow');
assert.equal(shadowRemoves, 1, 'canonical remove must also clear isolated shadow snapshot');

let blockedPreview = 0;
let blockedShadowWrite = 0;
let blockedPermission = 0;
const failingCanonical = createShadowObservingMemoryAdapter({
  memoryAdapter: {
    storageKey: 'pcai.test',
    read: () => JSON.stringify(initialState),
    write(){ throw new Error('canonical failed'); }
  },
  shadowEngine: {
    previewSleep(){ blockedPreview += 1; },
    reset(){}
  },
  shadowStore: {
    write(){ blockedShadowWrite += 1; },
    remove(){}
  },
  onUserTurn(){ blockedPermission += 1; }
});
assert.throws(() => failingCanonical.write(JSON.stringify(normalWrite)), /canonical failed/);
assert.equal(blockedPreview, 0, 'shadow must not advance when canonical memory fails');
assert.equal(blockedShadowWrite, 0, 'shadow snapshot must not persist when canonical memory fails');
assert.equal(blockedPermission, 0, 'permission observer must not run when canonical memory fails');

console.log('memory shadow observer contracts: OK');
