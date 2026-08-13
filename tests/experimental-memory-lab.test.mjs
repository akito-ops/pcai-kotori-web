import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('experimental-memory-lab.html','utf8');
const js=fs.readFileSync('src/experimental-memory-lab.js','utf8');
const controller=fs.readFileSync('src/core/experimental-memory-controller.js','utf8');

assert.match(html,/Memory Lab/);
assert.match(html,/正本記憶を変更せず/);
assert.match(js,/localStorage\.getItem\(STORAGE_KEY\)/);
assert.doesNotMatch(js,/localStorage\.setItem\(STORAGE_KEY/,'lab must not write canonical memory');
assert.doesNotMatch(js,/PCAIBridge\.chat|fetch\(|XMLHttpRequest|WebSocket/,'lab must not send memory to network or LLM');
assert.doesNotMatch(js,/speechSynthesis|Notification/,'lab must not emit speech or notifications');
assert.match(controller,/defaultEnabled:false/);
assert.match(controller,/affectsTemporalRecall:false/);
assert.match(controller,/reversible:true/);

console.log('experimental memory lab safety contracts: OK');
