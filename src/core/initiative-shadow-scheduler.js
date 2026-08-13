const MIN_INTERVAL_MS = 60_000;
const MAX_HISTORY = 12;

function freezeRecord(record){
  return Object.freeze({
    at: record.at,
    action: record.action,
    reason: record.reason,
    wouldEmitMessage: false
  });
}

export function createInitiativeShadowScheduler({
  engine,
  intervalMs = MIN_INTERVAL_MS,
  setIntervalFn = globalThis.setInterval,
  clock = () => new Date().toISOString()
}){
  if(!engine || typeof engine.evaluate !== 'function'){
    throw new TypeError('Initiative Shadow engine with evaluate() is required');
  }
  if(typeof setIntervalFn !== 'function') throw new TypeError('setInterval function is required');
  if(typeof clock !== 'function') throw new TypeError('scheduler clock must be a function');
  if(!Number.isFinite(intervalMs) || intervalMs < MIN_INTERVAL_MS){
    throw new RangeError('Initiative Shadow interval must be at least 60000ms');
  }

  let started = false;
  let intervalHandle = null;
  let tickCount = 0;
  const history = [];

  function record(evaluation){
    const entry = freezeRecord({
      at: clock(),
      action: evaluation?.action || 'suppress',
      reason: evaluation?.reason || 'evaluation_unavailable',
      wouldEmitMessage: false
    });
    history.push(entry);
    if(history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    return entry;
  }

  function tick(){
    try{
      const evaluation = engine.evaluate();
      tickCount += 1;
      return record(evaluation);
    }catch{
      tickCount += 1;
      return record({ action: 'suppress', reason: 'evaluation_failed' });
    }
  }

  function start({ initialEvaluation = null } = {}){
    if(started) return false;
    started = true;
    if(initialEvaluation) record(initialEvaluation);
    intervalHandle = setIntervalFn(tick, intervalMs);
    return true;
  }

  return Object.freeze({
    mode: 'shadow',
    intervalMs,
    affectsRuntime: false,
    emitsMessages: false,
    start,
    inspect: () => Object.freeze({
      mode: 'shadow',
      running: started,
      intervalMs,
      tickCount,
      affectsRuntime: false,
      emitsMessages: false,
      history: Object.freeze([...history]),
      hasIntervalHandle: intervalHandle !== null && intervalHandle !== undefined
    })
  });
}
