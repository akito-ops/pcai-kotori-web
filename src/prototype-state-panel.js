const $ = id => document.getElementById(id);

function text(value, fallback = '—'){
  const v = String(value ?? '').trim();
  return v || fallback;
}

function number(value, digits = 2){
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
}

function set(id, value){
  const node = $(id);
  if(node) node.textContent = String(value ?? '—');
}

function list(id, items, emptyText){
  const node = $(id);
  if(!node) return;
  const rows = Array.isArray(items) ? items : [];
  node.replaceChildren(...(rows.length ? rows.map(item => {
    const li = document.createElement('li');
    li.textContent = item;
    return li;
  }) : [(() => { const li = document.createElement('li'); li.textContent = emptyText; return li; })()]));
}

function currentSelfSnapshot(){
  try{return window.PCAICurrentSelfShadow?.inspect?.() || null;}catch{return null;}
}

function pendingSnapshot(){
  try{return window.PCAIPendingMindShadow?.inspect?.() || null;}catch{return null;}
}

function initiativeSnapshot(){
  try{return window.PCAIInitiativeShadow?.inspect?.() || null;}catch{return null;}
}

function experimentalSnapshot(){
  try{return window.PCAIExperimentalMemory?.inspect?.() || null;}catch{return null;}
}

function render(){
  const selfReport = currentSelfSnapshot();
  const current = selfReport?.current || null;
  const continuity = current?.continuity || {};
  const relationship = current?.relationshipStance || {};
  const concerns = Array.isArray(current?.activeConcerns) ? current.activeConcerns : [];
  const pendingReport = pendingSnapshot();
  const pending = Array.isArray(pendingReport?.pending) ? pendingReport.pending : [];
  const initiative = initiativeSnapshot()?.lastEvaluation || null;
  const experimental = experimentalSnapshot();

  set('state-continuity', continuity.generation > 0 ? `generation ${continuity.generation}` : 'baseline');
  set('state-previous-commit', text(continuity.previousCommitId));
  set('state-self-summary', text(current?.selfNarrative?.summary, 'まだ睡眠後の自己再構成はありません。'));
  set('state-relationship', text(relationship.distance || relationship.currentDistance || 'neutral'));
  set('state-active-count', concerns.length);
  list('state-active-concerns', concerns.slice(0, 3).map(item => `${text(item?.topic)}  (${number(item?.salience)})`), '現在のActive Concernはありません。');

  set('state-pending-count', pending.length);
  list('state-pending-list', pending.slice(0, 3).map(item => `${text(item?.topic)}  [${text(item?.state, 'held')}]`), '保留中の意図はありません。');

  set('state-initiative-action', text(initiative?.action, '未評価'));
  set('state-initiative-reason', text(initiative?.reason, '—'));
  set('state-initiative-final', number(initiative?.scores?.final));
  set('state-initiative-emission', initiative?.wouldEmitMessage === false ? 'OFF（Shadow only）' : '—');

  set('state-experimental-memory', experimental?.enabled ? 'ON' : 'OFF');
  set('state-autonomy', window.PCAIInitiativeShadow?.autonomousActionsEnabled === false ? 'OFF' : '—');
}

render();
setInterval(render, 1500);
