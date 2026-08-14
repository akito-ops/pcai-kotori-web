import { inspectLive2DRuntime } from './runtime-gate.js';
import { createCoreDirectRenderer } from './core-direct-renderer.js';

const MODEL_URL = './assets/live2d/kotori/kotori.model3.json';
const MODEL_BASE_URL = './assets/live2d/kotori/';

function ensureStylesheet(documentRef){
  if(documentRef.querySelector?.('link[data-live2d-avatar-style]')) return;
  const link=documentRef.createElement('link');
  link.rel='stylesheet';
  link.href='./live2d-avatar.css';
  link.dataset.live2dAvatarStyle='';
  documentRef.head?.appendChild(link);
}

function ensureHost(documentRef) {
  ensureStylesheet(documentRef);
  const host = documentRef.getElementById('live2d-avatar-host') || documentRef.querySelector?.('.hero .avatar');
  if (!host) return null;
  host.id = 'live2d-avatar-host';
  host.classList?.add('live2d-avatar-host');

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
  const labels={ready:'Live2D READY',active:'Live2D ACTIVE',core_missing:'Live2D Core待ち',manifest_invalid:'Live2D manifest確認',render_failed:'Live2D fallback'};
  badge.textContent = labels[state] || 'Live2D準備中';
  badge.dataset.state = state;
}

async function loadManifest(fetchImpl = fetch) {
  const response = await fetchImpl(MODEL_URL, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Live2D manifest load failed: ${response.status}`);
  return response.json();
}

function attachSpeechBridge(renderer){
  const synth=globalThis.speechSynthesis;
  if(!synth || typeof synth.speak!=='function' || synth.__pcaiLive2DPatched) return;
  const originalSpeak=synth.speak.bind(synth);
  synth.speak=function(utterance){
    if(utterance && typeof utterance.addEventListener==='function'){
      utterance.addEventListener('start',()=>renderer.startSpeaking(),{once:true});
      const stop=()=>renderer.stopSpeaking();
      utterance.addEventListener('end',stop,{once:true});
      utterance.addEventListener('error',stop,{once:true});
    }
    return originalSpeak(utterance);
  };
  try{Object.defineProperty(synth,'__pcaiLive2DPatched',{value:true,configurable:false});}catch{}
}

export async function bootLive2DAvatar({ documentRef = document, fetchImpl = fetch } = {}) {
  const host = ensureHost(documentRef);
  if (!host) return Object.freeze({ mounted: false, reason: 'host_missing' });

  const fallback = host.querySelector('[data-live2d-fallback]');
  const canvas = host.querySelector('canvas');
  let manifest = null;
  try {
    manifest = await loadManifest(fetchImpl);
  } catch (error) {
    console.warn('PCAI Live2D manifest load failed',error);
    setStatus(host, 'manifest_invalid');
    fallback?.removeAttribute('hidden');
    if (canvas) canvas.hidden = true;
    return Object.freeze({ mounted: true, active: false, reason: 'manifest_invalid' });
  }

  const readiness = inspectLive2DRuntime({ manifest });
  setStatus(host, readiness.reason);
  if (!readiness.ready) {
    fallback?.removeAttribute('hidden');
    if (canvas) canvas.hidden = true;
    return Object.freeze({ mounted: true, active: false, reason: readiness.reason, manifest });
  }

  try{
    const renderer=await createCoreDirectRenderer({canvas,manifest,modelBaseUrl:MODEL_BASE_URL,fetchImpl});
    renderer.start();
    attachSpeechBridge(renderer);
    if(fallback) fallback.hidden=true;
    if(canvas) canvas.hidden=false;
    setStatus(host,'active');
    return Object.freeze({mounted:true,active:true,reason:'active',manifest,startSpeaking:()=>renderer.startSpeaking(),stopSpeaking:()=>renderer.stopSpeaking(),setMouthOpenY:value=>renderer.setMouthOpenY(value),inspect:()=>renderer.inspect(),autonomousActions:false,toolExecution:false});
  }catch(error){
    console.warn('PCAI Live2D renderer failed; static fallback retained',error);
    fallback?.removeAttribute('hidden');
    if(canvas) canvas.hidden=true;
    setStatus(host,'render_failed');
    return Object.freeze({mounted:true,active:false,reason:'render_failed',manifest,error:String(error?.message||error)});
  }
}

if (typeof document !== 'undefined') {
  bootLive2DAvatar().then((state) => {
    globalThis.PCAILive2D = Object.freeze({...state,modelUrl: MODEL_URL,autonomousActions: false,toolExecution: false});
  });
}
