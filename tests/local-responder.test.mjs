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

// Identity/facts parity.
assert.match(responder.reply({ message: '誕生日は？' }), /7月7日/);
assert.match(responder.reply({ message: '身長は？' }), /154cm/);
assert.match(responder.reply({ message: '何が好き？' }), /歌/);
assert.match(responder.reply({ message: '何飲む？' }), /ほうじ茶/);

// Day/night greeting parity.
assert.match(responder.reply({ message: 'こんにちは', night: false }), /こんことー/);
assert.match(responder.reply({ message: 'こんばんは', night: true }), /こんな時間/);
assert.match(responder.reply({ message: 'おはよう' }), /おはよー/);

// Emotional/personality branches retained from the legacy responder.
assert.match(responder.reply({ message: 'かわいいね', night: false }), /うれしい/);
assert.match(responder.reply({ message: '疲れてない？' }), /心配してくれて/);
assert.match(responder.reply({ message: '相談がある' }), /一緒に見てみよっか/);
assert.match(responder.reply({ message: 'アニメの話しよう' }), /世界が立ち上がる瞬間/);
assert.match(responder.reply({ message: 'ポンコツだね' }), /いじわる/);
assert.match(responder.reply({ message: '雑に扱われて怒ってる？' }), /笑って流せない/);
assert.match(responder.reply({ message: '寂しい' }), /ここに/);
assert.match(responder.reply({ message: 'ありがとう' }), /こちらこそ/);
assert.match(responder.reply({ message: '34P' }), /大事なページ/);
assert.match(responder.reply({ message: '夕焼けが綺麗' }), /空の色/);

// Current Self can affect only explicit continuity questions.
const currentSelf = Object.freeze({
  available: true,
  hasContinuity: true,
  generation: 3,
  primaryConcern: 'PCAIの自己継続',
  relationshipDistance: 'close',
  pendingCount: 1,
  daypart: 'day'
});
const continuityReply = responder.reply({ message: '前の自分の続きなの？', currentSelf });
assert.match(continuityReply, /前の私の続き/);
assert.match(continuityReply, /PCAIの自己継続/);
assert.match(responder.reply({ message: '誕生日は？', currentSelf }), /7月7日/, 'Current Self must not alter unrelated replies');
assert.doesNotMatch(responder.reply({ message: '今日は不思議な日だった', currentSelf, night: false }), /前の私の続き/, 'generic replies must ignore Current Self');
assert.doesNotMatch(responder.reply({ message: '前の自分の続きなの？', currentSelf: { ...currentSelf, hasContinuity: false } }), /前の私の続き/, 'continuity must not be invented when unavailable');

// Memory recall must not invent missing memories.
const memory = { text: 'ユーザーは地図が好き' };
assert.match(responder.reply({ message: '覚えてる？', relevantMemory: memory, usableMemoryCount: 1 }), /地図が好き/);
assert.match(responder.reply({ message: '覚えてる？', relevantMemory: null, usableMemoryCount: 0 }), /空っぽ/);

const intent = { label: '昨日' };
assert.match(responder.reply({
  message: '昨日何話した？',
  intent,
  intentHits: [{ summary: '旅行の話' }]
}), /旅行の話/);
assert.match(responder.reply({ message: '昨日何話した？', intent, intentHits: [] }), /覚えてるふりはしない/);

// Generic fallback remains deterministic for tests.
assert.match(responder.reply({ message: '今日は不思議な日だった', night: false }), /ちゃんと聞いてる/);
assert.match(responder.reply({ message: '今日は不思議な日だった', night: true }), /ちゃんと聞いてる/);

// Lifecycle messages stay persona-specific and isolated from the generic app engine.
assert.match(responder.initialGreeting(), /篝火ことり/);
assert.match(responder.returningGreeting(true), /おかえり/);
assert.match(responder.returningGreeting(false), /おかえり/);
assert.match(responder.resetGreeting(), /ここからまた始めよっか/);
assert.match(responder.sleepStart(false), /PCAIの睡眠時間/);
assert.match(responder.sleepStart(true), /整理してくる/);
assert.match(responder.sleepComplete({ commitId: 'abc123', wasConnected: true }), /abc123/);
assert.match(responder.sleepComplete({ commitId: 'abc123', wasConnected: true }), /AI接続もそのまま維持/);

assert.throws(() => createLocalResponderForPersona({
  identity: { personaId: 'unknown-persona', personaName: 'Unknown' },
  personaFacts: {}
}), /No local responder registered/);

console.log('local-responder parity invariants: OK');
