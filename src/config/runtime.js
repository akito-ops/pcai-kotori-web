import { pcaiCatalog } from './catalog.js';
import { activeSelection } from './active-selection.js';
import { createRuntimeFromSelection } from '../core/runtime-factory.js';

export const runtime = createRuntimeFromSelection({
  catalog: pcaiCatalog,
  selection: activeSelection
});
