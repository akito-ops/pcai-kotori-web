import { inspectLive2DRuntime } from './runtime-gate.js';

const MODEL_URL = './assets/live2d/kotori/kotori.model3.json';

function ensureHost(documentRef) {
  const host = documentRef.getElementById('live2d-avatar-host') || documentRef.querySelector('.hero .avatar');
  if (!host) return null;
  host.id = 'live2d-avatar-host';
  host.classList.add('live2d-avatar-host');

  const image = host.querySelector('img');
  if (image) image.dataset.live2dFallback = '';

  if (!host.querySelector('canvas')) {
    const canvas = documentRef.createElement('canvas');
    canvas.className = 'live2d-avatar-canvas';
    canvas.hidden = true;
    canvas.setAttribute('aria-label', '篝火ことり Live2D');
    host.appendChild(canvas);
  }

  if (!host.querySelector('[data-live2d-status]')) {
    const badge = documentRef.createElement('span');
    badge.className = 'live2d-avatar-status';
    badge.dataset.live2dStatus = '';
    badge.textContent = 'Live2D準備中';
    host.appendChild(badge);
  }
  return host;
}

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
  const host = ensureHost(documentRef);
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

  // The official Cubism Core/Framework renderer is attached in a later step.
  // Until then the known-good static avatar remains visible and the experimental
  // page cannot break simply because the SDK is absent.
  fallback?.removeAttribute('hidden');
  if (canvas) canvas.hidden = true;

  return Object.freeze({
    mounted: true,
    active: false,
    reason: readiness.ready ? 'adapter_pending' : readiness.reason,
    manifest
  });
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
