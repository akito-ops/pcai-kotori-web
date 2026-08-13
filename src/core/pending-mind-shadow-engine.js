const MAX_PENDING = 7;

function clean(value, max = 100){
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function seedItem(item){
  const topic = clean(item?.topic, 80);
  if(!topic || item?.carryOver === false) return null;
  return deepFreeze({
    id: clean(item?.id, 80),
    type: clean(item?.type, 40) || 'withheld_intention',
    topic,
    motive: clean(item?.motive, 40) || 'share_or_ask',
    inhibition: clean(item?.inhibition, 40) || 'carried_over',
    state: 'held',
    createdAt: clean(item?.createdAt, 40),
    carryOver: true,
    shadowOnly: true,
    restoredFromSnapshot: true
  });
}

export function createPendingMindShadowEngine({
  initialPending = [],
  clock = () => new Date().toISOString()
} = {}){
  if(typeof clock !== 'function') throw new TypeError('Pending Mind shadow clock must be a function');
  if(!Array.isArray(initialPending)) throw new TypeError('initialPending must be an array');

  let sequence = 0;
  let pending = initialPending.map(seedItem).filter(Boolean).slice(-MAX_PENDING);
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
      shadowOnly: true,
      restoredFromSnapshot: false
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

  function exportForSleep(){
    return Object.freeze(pending
      .filter(item => item.state === 'held' || item.state === 'would_speak_shadow')
      .slice(-MAX_PENDING)
      .map(item => deepFreeze({
        id: clean(item.id, 80),
        type: 'withheld_intention',
        topic: clean(item.topic, 80),
        motive: clean(item.motive, 40) || 'share_or_ask',
        inhibition: clean(item.inhibition, 40) || 'initiative_hold',
        // A would-speak result is reconsidered after wake; it never carries over as
        // permission to emit a message automatically.
        state: 'held',
        createdAt: clean(item.createdAt, 40),
        carryOver: true
      })));
  }

  function clearAfterSleep(){
    pending = [];
    lastReconsideration = null;
  }

  return Object.freeze({
    mode: 'shadow',
    persisted: false,
    emitsMessages: false,
    restoredCount: pending.filter(item => item.restoredFromSnapshot).length,
    observeInitiative,
    applyReconsideration,
    exportForSleep,
    clearAfterSleep,
    read: () => Object.freeze([...pending]),
    inspect: () => Object.freeze({
      mode: 'shadow',
      persisted: false,
      emitsMessages: false,
      pendingCount: pending.length,
      restoredCount: pending.filter(item => item.restoredFromSnapshot).length,
      pending: Object.freeze([...pending]),
      lastReconsideration
    })
  });
}
