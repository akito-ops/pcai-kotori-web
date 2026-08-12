import assert from 'node:assert/strict';
import { createRuntimeBridge } from '../src/core/runtime-bridge.js';

const calls = [];
const bindings = Object.freeze({
  storageKey: 'pcai.kagaribi-kotori.web.v02',
  identity: Object.freeze({
    personaId: 'kagaribi-kotori',
    personaName: '篝火ことり',
    shortName: 'ことり',
    fanName: 'ことリス'
  }),
  personaFacts: Object.freeze({
    birthday: '7月7日',
    height: '154cm',
    likes: Object.freeze(['歌']),
    foods: Object.freeze(['オムライス']),
    drinks: Object.freeze(['ほうじ茶'])
  }),
  voice: Object.freeze({
    language: 'ja-JP',
    day: Object.freeze({ rate: 1.03, pitch: 1.03 }),
    night: Object.freeze({ rate: 0.92, pitch: 1.03 })
  }),
  memory: Object.freeze({
    shortTermLimit: 80,
    longTermLimitPerKind: 180,
    sendRecentTurnsToModel: 8,
    sendRelevantMemoriesToModel: 6
  })
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
assert.equal(bridge.schemaVersion, 2);
assert.equal(bridge.storageKey, bindings.storageKey);
assert.equal(bridge.identity.personaName, '篝火ことり');
assert.equal(bridge.identity.fanName, 'ことリス');
assert.equal(bridge.personaFacts.foods[0], 'オムライス');
assert.equal(bridge.voice.day.rate, 1.03);
assert.equal(bridge.voice.night.rate, 0.92);
assert.equal(bridge.memory.policy.shortTermLimit, 80);
assert.equal(bridge.memory.policy.longTermLimitPerKind, 180);
assert.equal(bridge.memory.policy.sendRecentTurnsToModel, 8);
assert.equal(bridge.memory.policy.sendRelevantMemoriesToModel, 6);
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
