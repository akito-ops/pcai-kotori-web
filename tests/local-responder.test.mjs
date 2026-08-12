import assert from 'node:assert/strict';
import { createLocalResponderForPersona, hasLocalResponder } from '../src/responders/responder-factory.js';

const bindings = Object.freeze({
  identity: Object.freeze({ personaId: 'kagaribi-kotori', personaName: '篝火ことり', shortName: 'ことり' }),
  personaFacts: Object.freeze({
    birthday: '7月7日',
    height: '154cm',
    likes: Object.freeze(['歌']),
    foods: Object.freeze(['オムライス']),
    drinks: Object.freeze(['ほうじ茶'])
  })
});

assert.equal(hasLocalResponder('kagaribi-kotori'), true);
assert.equal(hasLocalResponder('unknown-persona'), false);

const responder = createLocalResponderForPersona(bindings, { random: () => 0 });
assert.equal(responder.personaId, 'kagaribi-kotori');
assert.match(responder.reply({ message: '誕生日は？' }), /7月7日/);
assert.match(responder.reply({ message: '何が好き？' }), /歌/);
assert.match(responder.initialGreeting(), /篝火ことり/);
assert.match(responder.returningGreeting(true), /おかえり/);
assert.match(responder.sleepStart(false), /PCAIの睡眠時間/);
assert.match(responder.sleepComplete({ commitId: 'abc123', wasConnected: true }), /abc123/);

assert.throws(() => createLocalResponderForPersona({
  identity: { personaId: 'unknown-persona', personaName: 'Unknown' },
  personaFacts: {}
}), /No local responder registered/);

console.log('local-responder invariants: OK');
