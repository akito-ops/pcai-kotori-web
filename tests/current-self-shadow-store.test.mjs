import assert from 'node:assert/strict';
import { createInitialCurrentSelf } from '../src/core/current-self.js';
import { createCurrentSelfShadowStore } from '../src/adapters/current-self-shadow-store.js';

const data = new Map();
const storage = {
  getItem: key => data.has(key) ? data.get(key) : null,
  setItem: (key, value) => data.set(key, String(value)),
  removeItem: key => data.delete(key)
};

const store = createCurrentSelfShadowStore({
  personaId: 'kagaribi-kotori',
  storage
});
assert.equal(store.storageKey, 'pcai.shadow.current-self.v1.kagaribi-kotori');
assert.notEqual(store.storageKey, 'pcai.kagaribi-kotori.web.v02', 'shadow snapshot must never share canonical memory key');
assert.equal(store.read(), null);

const self = createInitialCurrentSelf({
  personaId: 'kagaribi-kotori',
  reconstructedAt: '2026-08-13T00:00:00.000Z',
  continuitySummary: 'safe shadow snapshot'
});
store.write(self);
const read = store.read();
assert.equal(read.personaId, 'kagaribi-kotori');
assert.equal(read.continuity.generation, 0);
assert.equal(Object.isFrozen(read), true);

// Corrupt and cross-persona snapshots fail closed instead of entering Current Self.
data.set(store.storageKey, '{broken-json');
assert.equal(store.read(), null);

data.set(store.storageKey, JSON.stringify({ ...self, personaId: 'another-persona' }));
assert.equal(store.read(), null);
assert.throws(() => store.write({ ...self, personaId: 'another-persona' }), /cannot cross persona boundaries/);

store.write(self);
store.remove();
assert.equal(store.read(), null);

console.log('current self shadow store contracts: OK');
