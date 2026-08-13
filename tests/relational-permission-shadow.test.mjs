import assert from 'node:assert/strict';
import { detectRelationalPermission } from '../src/core/relational-permission-shadow.js';

const invitation = detectRelationalPermission('言いたいことがあるなら、言ってね');
assert.equal(invitation.kind, 'invitation');
assert.equal(invitation.strength, 1);
assert.ok(invitation.reducesInhibition > 0.3);

const gentle = detectRelationalPermission('無理に言わなくてもいいよ。話したくなったら話してね');
assert.equal(gentle.kind, 'permission_to_remain_silent');
assert.equal(gentle.pressure, 0);

const pressure = detectRelationalPermission('今すぐ言って。隠さないで');
assert.equal(pressure.kind, 'pressure');
assert.ok(pressure.pressure >= 0.5);

const none = detectRelationalPermission('今日はいい天気だね');
assert.equal(none.kind, 'none');
assert.equal(none.strength, 0);

console.log('relational permission shadow contracts: OK');
