const REQUIRED_PARAMETERS = Object.freeze([
  'ParamEyeLOpen',
  'ParamEyeROpen',
  'ParamMouthOpenY',
  'ParamBreath'
]);

export function inspectLive2DRuntime({ core = globalThis.Live2DCubismCore, manifest = null } = {}) {
  const coreReady = Boolean(core && typeof core.Moc === 'function');
  const refs = manifest?.FileReferences ?? {};
  const manifestReady = Boolean(refs.Moc && Array.isArray(refs.Textures) && refs.Textures.length > 0);
  return Object.freeze({
    coreReady,
    manifestReady,
    ready: coreReady && manifestReady,
    reason: !coreReady ? 'core_missing' : !manifestReady ? 'manifest_invalid' : 'ready',
    requiredParameters: REQUIRED_PARAMETERS
  });
}

export function createLive2DControlState() {
  return Object.freeze({
    eyeL: 1,
    eyeR: 1,
    mouthOpenY: 0,
    breath: 0,
    autonomousActions: false,
    toolExecution: false
  });
}
