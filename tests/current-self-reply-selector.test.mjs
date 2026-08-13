import assert from 'node:assert/strict';
import { selectCurrentSelfReplyMode } from '../src/core/current-self-reply-selector.js';

const currentSelf = Object.freeze({
  available: true,
  hasContinuity: true,
  primaryConcern: 'Current Selfの自己継続と睡眠再構成について詰めたい'
});

assert.equal(selectCurrentSelfReplyMode({
  message: '睡眠でCurrent Selfを再構成する仕組みをもう少し詰めたい',
  currentSelf
}).mode, 'continuity-fallback', 'strongly related generic conversation may select continuity fallback');

assert.equal(selectCurrentSelfReplyMode({
  message: '今日はカレーを食べたよ',
  currentSelf
}).mode, 'legacy', 'unrelated topics must remain legacy');

assert.equal(selectCurrentSelfReplyMode({
  message: 'うん',
  currentSelf
}).mode, 'legacy', 'short messages must never trigger continuity fallback');

assert.equal(selectCurrentSelfReplyMode({
  message: '睡眠でCurrent Selfを再構成する仕組みをもう少し詰めたい',
  currentSelf: { ...currentSelf, hasContinuity: false }
}).mode, 'legacy', 'no continuity means no continuity-based selection');

assert.equal(selectCurrentSelfReplyMode({
  message: '睡眠でCurrent Selfを再構成する仕組みをもう少し詰めたい',
  currentSelf: null
}).mode, 'legacy');

console.log('current self reply selector contracts: OK');
