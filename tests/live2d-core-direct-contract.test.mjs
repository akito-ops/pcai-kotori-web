import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const html=await readFile(new URL('../experimental-chat.html',import.meta.url),'utf8');
const renderer=await readFile(new URL('../src/live2d/core-direct-renderer.js',import.meta.url),'utf8');
const shell=await readFile(new URL('../src/live2d/avatar-shell.js',import.meta.url),'utf8');
const manifest=JSON.parse(await readFile(new URL('../assets/live2d/kotori/kotori.model3.json',import.meta.url),'utf8'));
const coreStat=await stat(new URL('../vendor/live2d/live2dcubismcore.min.js',import.meta.url));
const mocStat=await stat(new URL('../assets/live2d/kotori/kotori.moc3',import.meta.url));
const textureStat=await stat(new URL('../assets/live2d/kotori/texture_00.png',import.meta.url));

assert.ok(coreStat.size>10000,'Cubism Core must be present');
assert.ok(mocStat.size>1000,'moc3 must be present');
assert.ok(textureStat.size>10000,'Live2D texture must be present');
assert.match(html,/vendor\/live2d\/live2dcubismcore\.min\.js/);
assert.match(html,/src\/live2d\/avatar-shell\.js/);
assert.equal(manifest.FileReferences.Moc,'kotori.moc3');
assert.deepEqual(manifest.FileReferences.Textures,['texture_00.png']);
for(const id of ['ParamEyeLOpen','ParamEyeROpen','ParamMouthOpenY','ParamBreath']) assert.match(renderer,new RegExp(id));
assert.match(shell,/createCoreDirectRenderer/);
assert.match(shell,/startSpeaking/);
assert.match(shell,/stopSpeaking/);
assert.match(shell,/autonomousActions:false/);
assert.match(shell,/toolExecution:false/);

console.log('live2d core direct contract: OK');
