import { inspectLive2DRuntime } from './runtime-gate.js';

const MODEL_URL = './assets/live2d/kotori/kotori.model3.json';

function setStatus(host, state) {
  const badge = host.querySelector('[data-live2d-status]');
  if (!badge) return;
  badge.textContent = state === 'ready' ? 'Live2D READY' : state === 'core_missing' ? 'Live2D Core待ち' : 'Live2D準備中';
  badge.dataset.state = state;
}

async function loadManifest(fetchImpl = fetch) {
  const response = await fetchImpl(MODEL_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Live2D manifest load failed: ${response.status}`);
  return response.json();
}

export async function bootLive2DAvatar({ documentRef = document, fetchImpl = fetch } = {}) {
  const host = documentRef.getElementById('live2d-avatar-host');
  if (!host) return Object.freeze({ mounted: false, reason: 'host_missing' });

  const fallback = host.querySelector('[data-live2d-fallback]');
  const canvas = host.querySelector('canvas');
  let manifest = null;
  try {
    manifest = await loadManifest(fetchImpl);
  } catch {
    setStatus(host, 'manifest_invalid');
    return Object.freeze({ mounted: true, active: false, reason: 'manifest_invalid' });
  }

  const readiness = inspectLive2DRuntime({ manifest });
  setStatus(host, readiness.reason);

  // Rendering is deliberately gated. The official Cubism Core/Framework adapter
  // is attached in a later step. Until then the current production-safe static
  // avatar remains visible.
  if (!readiness.ready) {
    fallback?.removeAttribute('hidden');
    if (canvas) canvas.hidden = true;
    return Object.freeze({ mounted: true, active: false, reason: readiness.reason, manifest });
  }

  fallback?.removeAttribute('hidden');
  if (canvas) canvas.hidden = true;
  return Object.freeze({ mounted: true, active: false, reason: 'adapter_pending', manifest });
}

if (typeof document !== 'undefined') {
  bootLive2DAvatar().then((state) => {
    globalThis.PCAILive2D = Object.freeze({
      ...state,
      modelUrl: MODEL_URL,
      autonomousActions: false,
      toolExecution: false
    });
  });
}
