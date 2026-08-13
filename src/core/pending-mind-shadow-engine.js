const MAX_PENDING = 7;

function clean(value, max = 100){
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function createPendingMindShadowEngine({ clock = () => new Date().toISOString() } = {}){
  if(typeof clock !== 'function') throw new TypeError('Pending Mind shadow clock must be a function');

  let sequence = 0;
  let pending = [];
  let lastReconsideration = null;

  function observeInitiative({ evaluation, currentSelf }){
    if(evaluation?.action !== 'hold') return null;
    const topic = clean(currentSelf?.activeConcerns?.[0]?.topic, 80);
    if(!topic) return null;

    const duplicate = pending.find(item => item.topic === topic && item.state === 'held');
    if(duplicate) return duplicate;

    sequence += 1;
    const item = deepFreeze({
      id: `shadow-pending-${sequence}`,
      type: 'withheld_intention',
      topic,
      motive: 'share_or_ask',
      inhibition: 'initiative_hold',
      state: 'held',
      createdAt: clock(),
      carryOver: false,
      shadowOnly: true
    });
    pending = [...pending, item].slice(-MAX_PENDING);
    return item;
  }

  function applyReconsideration(result){
    lastReconsideration = result || null;
    if(result?.transition !== 'would_speak' || !pending.length) return false;
    const firstHeld = pending.findIndex(item => item.state === 'held');
    if(firstHeld < 0) return false;
    pending = pending.map((item, index) => index === firstHeld
      ? deepFreeze({ ...item, state: 'would_speak_shadow' })
      : item);
    return true;
  }

  return Object.freeze({
    mode: 'shadow',
    persisted: false,
    emitsMessages: false,
    observeInitiative,
    applyReconsideration,
    read: () => Object.freeze([...pending]),
    inspect: () => Object.freeze({
      mode: 'shadow',
      persisted: false,
      emitsMessages: false,
      pendingCount: pending.length,
      pending: Object.freeze([...pending]),
      lastReconsideration
    })
  });
}
