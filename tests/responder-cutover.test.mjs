import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

// During staged migration the new responder must be preferred, while the legacy responder remains as a rollback fallback.
assert.match(source, /window\.PCAILocalResponder/, 'app must consult the persona-specific local responder');
assert.match(source, /localResponder