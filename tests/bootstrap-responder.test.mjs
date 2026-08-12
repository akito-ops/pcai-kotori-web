import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bootstrap = await readFile(new URL('../src/bootstrap.js', import.meta.url), 'utf8');

assert.match(bootstrap, /createLocalResponder/,
  'bootstrap must construct the persona-specific responder');
assert.match(bootstrap, /PCAILocalResponder/,
  'bootstrap must expose the responder through a read-only bridge');
assert.match(bootstrap, /writable:\s*false/,
  'bootstrap globals must remain read-only');
assert.match(bootstrap, /configurable:\s*false/,
  'bootstrap globals must remain non-configurable');

console.log('bootstrap responder wiring: OK');
