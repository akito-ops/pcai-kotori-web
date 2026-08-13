const RELATIONSHIP_SCORE = Object.freeze({ distant: 0.1, neutral: 0.4, familiar: 0.7, close: 1 });

function clamp01(value){
  const number = Number(value);
  if(!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function boundedSeconds(value){
  const number = Number(value);
  if(!Number.isFinite(number) || number < 0) return 0;
  return Math.min(number, 86400);
}

function timingScore(hour){
  const h = Number(hour);
  if(!Number.isFinite(h)) return 0.5;
  if(h >= 7 && h < 22) return 1;
  if(h >= 22 && h < 23) return 0.55;
  if(h >= 5 && h < 7) return 0.45;
  return 0.15;
}

function interruptionScore({ visible, idleSeconds }){
  if(visible === false) return 0.1;
  const idle = boundedSeconds(idleSeconds);
  if(idle < 30) return 0.15;
  if(idle < 120) return 0.35;
  if(idle < 600) return 0.7;
  return 1;
}

export function evaluateInitiativeShadow({ currentSelf, environment = {} }){
  if(!currentSelf?.available || !currentSelf?.hasContinuity){
    return Object.freeze({
      mode: 'shadow',
      action: 'suppress',
      reason: 'no_continuity',
      affectsRuntime: false,
      wouldEmitMessage: false,
      scores: Object.freeze({ desire: 0, value: 0, interruption: 0, relationship: 0, timing: 0, inhibition: 1, final: 0 })
    });
  }

  const pendingSignal = Math.min(1, Number(currentSelf.pendingCount || 0) / 3);
  const concernSignal = currentSelf.hasPrimaryConcern ? 1 : 0;
  const desire = clamp01(
    currentSelf.curiosity * 0.35 +
    currentSelf.socialOpenness * 0.25 +
    pendingSignal * 0.25 +
    concernSignal * 0.15
  );
  const value = clamp01(
    pendingSignal * 0.45 +
    concernSignal * 0.3 +
    currentSelf.concern * 0.25
  );
  const interruption = interruptionScore({
    visible: environment.visible !== false,
    idleSeconds: environment.idleSeconds
  });
  const relationship = RELATIONSHIP_SCORE[currentSelf.relationshipDistance] ?? RELATIONSHIP_SCORE.neutral;
  const timing = timingScore(environment.hour);
  const inhibition = clamp01(currentSelf.inhibition);

  const positive = desire * 0.3 + value * 0.25 + interruption * 0.15 + relationship * 0.15 + timing * 0.15;
  const final = clamp01(positive - inhibition * 0.45);

  let action = 'hold';
  let reason = 'threshold_not_met';

  if(environment.visible === false){
    action = 'suppress';
    reason = 'user_not_visible';
  }else if(timing <= 0.15){
    action = 'suppress';
    reason = 'quiet_hours';
  }else if(inhibition >= 0.75){
    action = 'hold';
    reason = 'high_inhibition';
  }else if(final >= 0.58 && desire >= 0.45 && value >= 0.25){
    action = 'would_speak';
    reason = 'sufficient_motive_and_timing';
  }

  return Object.freeze({
    mode: 'shadow',
    action,
    reason,
    affectsRuntime: false,
    wouldEmitMessage: false,
    scores: Object.freeze({ desire, value, interruption, relationship, timing, inhibition, final })
  });
}

export function createInitiativeShadowEngine({ readCurrentSelf, readEnvironment }){
  if(typeof readCurrentSelf !== 'function') throw new TypeError('readCurrentSelf must be a function');
  if(typeof readEnvironment !== 'function') throw new TypeError('readEnvironment must be a function');

  let lastEvaluation = null;
  return Object.freeze({
    mode: 'shadow',
    affectsRuntime: false,
    evaluate(){
      lastEvaluation = evaluateInitiativeShadow({
        currentSelf: readCurrentSelf(),
        environment: readEnvironment()
      });
      return lastEvaluation;
    },
    inspect: () => Object.freeze({
      mode: 'shadow',
      affectsRuntime: false,
      lastEvaluation
    })
  });
}
