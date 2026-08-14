import assert from 'node:assert/strict';
import { createLive2DControlState, inspectLive2DRuntime } from '../src/live2d/runtime-gate.js';

const validManifest = {
  Version: 3,
  FileReferences: {
    Moc: 'kotori.moc3',
    Textures: ['texture_00.png'],
    DisplayInfo: 'kotori.cdi3.json'
  }
};

assert.deepEqual(inspectLive2DRuntime({ core: undefined, manifest: validManifest }), {
  coreReady: false,
  manifestReady: true,
  ready: false,
  reason: 'core_missing',
  requiredParameters: ['ParamEyeLOpen','ParamEyeROpen','ParamMouthOpenY','ParamBreath']
});

const fakeCore = { Moc: function Moc() {} };
assert.equal(inspectLive2DRuntime({ core: fakeCore, manifest: validManifest }).ready, true);
assert.equal(inspectLive2DRuntime({ core: fakeCore, manifest: {} }).reason, 'manifest_invalid');

const controls = createLive2DControlState();
assert.deepEqual(controls, {
  eyeL: 1,
  eyeR: 1,
  mouthOpenY: 0,
  breath: 0,
  autonomousActions: false,
  toolExecution: false
});
assert.equal(Object.isFrozen(controls), true);

console.log('live2d runtime gate contract: ok');
