import assert from 'node:assert/strict';
import { createRuntimeProfile } from '../src/core/runtime-profile.js';
import { createRuntimeBindings } from '../src/core/runtime-bindings.js';
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
assert.equal(base.storage.memoryNamespace, 'pcai.kagaribi-kotori.web.v02',
  'The modular refactor must keep the production Kotori memory key readable');
assert.equal(base.usecase.capabilities.autonomousActions, false);
assert.equal(base.usecase.capabilities.toolExecution, false);
assert.equal(base.usecase.safety.allowPaidFallback, false);
assert.equal(base.model.policy.paidFallback, false);
assert.equal(base.model.policy.tokenPersistence, 'memory-only');
assert.equal(base.persona.boundaries.mayRewritePersonaCore, false);
assert.equal(base.persona.boundaries.mayInventMemories, false);

const bindings = createRuntimeBindings(base);
assert.equal(bindings.storageKey, 'pcai.kagaribi-kotori.web.v02');
assert.equal(bindings.backend.baseUrl, 'https://pcai-kotori-backend.siryuuakito.workers.dev');
assert.equal(bindings.backend.chatPath, '/api/chat');
assert.equal(bindings.backend.authHeader, 'x-pcai-access-token');
assert.equal(bindings.identity.personaName, '篝火ことり');
assert.equal(bindings.memory.shortTermLimit, 80);
assert.equal(bindings.memory.longTermLimitPerKind, 180);
assert.equal(bindings.voice.language, 'ja-JP');

const dummyModel = Object.freeze({ id: 'dummy-model', schemaVersion: 1 });
const swapped = createRuntimeProfile({
  persona: kotoriPersona,
  usecase: companionUsecase,
  model: dummyModel
});

assert.notEqual(base.profileId, swapped.profileId);
assert.equal(base.storage.memoryNamespace, swapped.storage.memoryNamespace,
  'Changing the model must not change character memory identity');

const otherPersona = Object.freeze({ id: 'other-character', schemaVersion: 1 });
const other = createRuntimeProfile({
  persona: otherPersona,
  usecase: companionUsecase,
  model: cloudflareWorkersAI
});
assert.notEqual(base.storage.memoryNamespace, other.storage.memoryNamespace,
  'Different characters must not share a memory namespace by default');

console.log('runtime-profile invariants: OK');
