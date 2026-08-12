import { pcaiCatalog, defaultSelection } from './catalog.js';
import { createRuntimeFromSelection } from '../core/runtime-factory.js';

export const runtime = createRuntimeFromSelection({
  catalog: pcaiCatalog,
  selection: defaultSelection
});
