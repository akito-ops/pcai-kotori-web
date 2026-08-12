import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');

// Stage B: the new persona responder is preferred, while legacy kotoriReply remains as an immediate rollback fallback.
assert.match(source, /function\s+kotoriReply\s*\(/, 'legacy kotoriReply must remain during staged cutover');
assert.match(source, /function\s+localReply\s*\(/, 'app must define the staged localReply cutover seam');
assert.match(source, /window\.PCAILocalReply/, 'app must route local replies through the fail-safe bootstrap bridge');
assert.match(source, /window\.PCAILocalReply\(context\s*,\s*kotoriReply\)/, 'legacy kotoriReply must be passed as the fail-safe fallback');
assert.match(source, /if\(!llmAccessToken\)\{const reply=localReply\(m\)/, 'local conversations must prefer the staged responder route');
assert.doesNotMatch(source, /if\(!llmAccessToken\)\{const reply=kotoriReply\(m\)/, 'direct legacy responder calls must not remain in the local submit path');

console.log('responder Stage B cutover contract: OK');
