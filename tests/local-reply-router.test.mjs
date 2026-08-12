import assert from 'node:assert/strict';
import { createLocalReplyRouter } from '../src/core/local-reply-router.js';

const legacyCalls = [];
const legacyReply = message => {
  legacyCalls.push(message);
  return `legacy:${message}`;
};

const healthy = createLocalReplyRouter({
  responder: { reply: ({ message }) => `new:${message}` },
  legacyReply
});
assert.equal(healthy.reply({ message: 'hello' }), 'new:hello');
assert.equal(legacyCalls.length, 0, 'healthy responder must not call legacy fallback');

const empty = createLocalReplyRouter({
  responder: { reply: () => '   ' },
  legacyReply
});
assert.equal(empty.reply({ message: 'empty' }), 'legacy:empty');

const broken = createLocalReplyRouter({
  responder: { reply: () => { throw new Error('boom'); } },
  legacyReply
});
assert.equal(broken.reply({ message: 'broken' }), 'legacy:broken');

assert.throws(() => createLocalReplyRouter({ responder: {}, legacyReply }), /reply/);
assert.throws(() => createLocalReplyRouter({ responder: { reply(){} }, legacyReply: null }), /legacy reply fallback/);

console.log('local-reply-router fail-safe invariants: OK');
