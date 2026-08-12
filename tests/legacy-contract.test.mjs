import assert from 'node:assert/strict';
import { runtime } from '../src/config/runtime.js';
import { createRuntimeBindings } from '../src/core/runtime-bindings.js';
import { assertLegacyCompatibility } from '../src/core/legacy-contract.js';

const bindings = createRuntimeBindings(runtime);
assert.equal(assertLegacyCompatibility(bindings), true);

assert.throws(() => assertLegacyCompatibility({
  ...bindings,
  storageKey: 'pcai.character.wrong.memory.v1'
}), /storage key mismatch/);

assert.throws(() => assertLegacyCompatibility({
  ...bindings,
  backend: { ...bindings.backend, authHeader: 'authorization' }
}), /backend auth header mismatch/);

console.log('legacy compatibility contract: OK');
