import assert from 'node:assert/strict';
import { pcaiCatalog } from '../src/config/catalog.js';
import { activeSelection } from '../src/config/active-selection.js';
import { createRuntimeFromSelection } from '../src/core/runtime-factory.js';

const runtime = createRuntimeFromSelection({ catalog: pcaiCatalog, selection: activeSelection });
assert.equal(runtime.persona.id, 'kagaribi-kotori');
assert.equal(runtime.usecase.id, 'companion');
assert.equal(runtime.model.id, 'cloudflare-workers-ai');
assert.equal(runtime.storage.memoryNamespace, 'pcai.kagaribi-kotori.web.v02');

assert.throws(() => createRuntimeFromSelection({
  catalog: pcaiCatalog,
  selection: { ...activeSelection, personaId: 'unknown-persona' }
}), /Unknown PCAI persona/);

assert.throws(() => createRuntimeFromSelection({
  catalog: pcaiCatalog,
  selection: { ...activeSelection, usecaseId: 'unknown-usecase' }
}), /Unknown PCAI usecase/);

assert.throws(() => createRuntimeFromSelection({
  catalog: pcaiCatalog,
  selection: { ...activeSelection, modelId: 'unknown-model' }
}), /Unknown PCAI model/);

console.log('runtime-factory invariants: OK');
