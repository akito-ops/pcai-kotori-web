import assert from 'node:assert/strict';
import { createRuntimeBridge } from '../src/core/runtime-bridge.js';

const calls = [];
const bindings = Object.freeze({
  storageKey: 'pcai.kagaribi-kotori.web.v02',
  identity: Object.freeze({ personaId: 'kagaribi-kotori' })
});
const modelAdapter = Object.freeze({
  async chat(request){ calls.push(request); return 'ok'; }
});
const store = new Map();
const memoryAdapter = Object.freeze({
  storageKey: 'pcai.kagaribi-kotori.web.v02',
  read(){ return store.get(this.storageKey) ?? null; },
  write(value){ store.set(this.storageKey, value); },
  remove(){ store.delete(this.storageKey); }
});

const bridge = createRuntimeBridge({ bindings, modelAdapter, memoryAdapter });
assert.equal(bridge.storageKey, bindings.storageKey);
bridge.memory.write('{"safe":true}');
assert.equal(bridge.memory.read(), '{"safe":true}');
bridge.memory.remove();
assert.equal(bridge.memory.read(), null);
assert.equal(await bridge.chat({ accessToken: 'token', message: 'hello' }), 'ok');
assert.equal(calls.length, 1);

assert.throws(() => createRuntimeBridge({
  bindings,
  modelAdapter,
  memoryAdapter: { ...memoryAdapter, storageKey: 'wrong-key' }
}), /namespace mismatch/);

console.log('runtime-bridge invariants: OK');
