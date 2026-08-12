export function createKotoriLocalResponder(bindings, random = Math.random){
  if(!bindings?.identity?.personaName) throw new TypeError('persona identity is required');
  if(!bindings?.personaFacts) throw new TypeError('persona facts are required');
  if(typeof random !== 'function') throw new TypeError('random function is required');

  const identity = bindings.identity;
  const facts = bindings.personaFacts;
  const pick = arr => arr[Math.min(arr.length - 1, Math.floor