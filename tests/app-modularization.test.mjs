import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

assert.match(app, /window\.PCAIBridge/);
assert.match(app, /runtimeBridge\?\.personaFacts/);
assert.match(app, /runtimeBridge\?\.voice/);
assert.match(app, /memoryPolicy\.shortTermLimit/);
assert.match(app, /memoryPolicy\.longTermLimitPerKind/);
assert.match(app, /memoryPolicy\.sendRecentTurnsToModel/);
assert.match(app, /memoryPolicy\.sendRelevantMemoriesToModel/);
assert.doesNotMatch(app, /const BACKEND_URL\s*=/,
  'app.js must not own the AI backend URL after model modularization');
assert.doesNotMatch(app, /fetch\(`\$\{BACKEND_URL\}/,
  'app.js must not bypass the model adapter');

console.log('app modularization invariants: OK');
