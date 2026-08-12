import assert from 'node:assert/strict';
import { createRuntimeProfile } from '../src/core/runtime-profile.js';
import { kotoriPersona } from '../src/config/personas/kotori.js';
import { companionUsecase } from '../src/config/usecases/companion.js';
import { cloudflareWorkersAI } from '../src/config/models/cloudflare-workers-ai.js';

const base = createRuntimeProfile({
  persona: kotoriPersona,
  usecase: companionUsecase,
  model: cloudflareWorkersAI
});

assert.equal(base.persona.id, 'kagaribi-kotori');
assert.equal(base.usecase.id, 'companion');
assert.equal(base.model.id, 'cloudflare-workers-ai');
assert.equal(base.storage.memoryNamespace, 'pcai.character.kagaribi-kotori.memory.v1');
assert.equal(base.usecase.capabilities.autonomousActions, false);
assert.equal(base.model.policy.paidFallback, false);
assert.equal(base.persona.boundaries.mayRewritePersonaCore, false);

const dummyModel = Object.freeze({ id: 'dummy-model', schemaVersion: 1 });
const swapped = createRuntimeProfile({
  persona: kotoriPersona,
  usecase: companionUsecase,
  model: dummyModel
});

assert.notEqual(base.profileId, swapped.profileId);
assert.equal(base.storage.memoryNamespace, swapped.storage.memoryNamespace,
  'Changing the model must not change character memory identity');

console.log('runtime-profile invariants: OK');
