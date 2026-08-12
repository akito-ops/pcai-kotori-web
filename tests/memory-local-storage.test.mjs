import assert from 'node:assert/strict';
import { createLocalStorageMemoryAdapter } from '../src/adapters/memory-local-storage.js';

const data = new Map();
const fakeStorage = {
  getItem(key){ return data.has(key) ? data.get(key) : null; },
  setItem(key, value){ data.set(key, String(value)); },
  removeItem(key){ data.delete(key); }
};

const key = 'pcai.kagaribi-kotori.web.v02';
const adapter = createLocalStorageMemoryAdapter({ storageKey: key, storage: fakeStorage });

assert.equal(adapter.storageKey, key);
assert.equal(adapter.read(), null);
adapter.write('{"version":3}');
assert.equal(adapter.read(), '{"version":3}');
assert.equal(data.get(key), '{"version":3}');
assert.throws(() => adapter.write({ version: 3 }), /string/);
adapter.remove();
assert.equal(adapter.read(), null);

console.log('memory-local-storage invariants: OK');
