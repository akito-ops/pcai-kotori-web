import assert from 'node:assert/strict';
import { requestPendingMindDisclosure } from '../src/core/pending-mind-manual-disclosure.js';

const pending=[Object.freeze({
  id:'shadow-pending-1',
  type:'withheld_intention',
  topic:'Project Chobitsの記憶設計',
  state:'held'
})];

const blocked=requestPendingMindDisclosure({pendingMind:pending,explicitUserRequest:false});
assert.equal(blocked.allowed,false);
assert.equal(blocked.reason,'explicit_user_request_required');
assert.equal(blocked.text,'');
assert.equal(blocked.emitsAutomatically,false);
assert.equal(blocked.consumesPending,false);
assert.equal(blocked.affectsAutonomy,false);

const allowed=requestPendingMindDisclosure({pendingMind:pending,explicitUserRequest:true});
assert.equal(allowed.allowed,true);
assert.equal(allowed.reason,'held_pending_intent');
assert.match(allowed.text,/Project Chobitsの記憶設計/);
assert.equal(allowed.itemId,'shadow-pending-1');
assert.equal(allowed.emitsAutomatically,false);
assert.equal(allowed.consumesPending,false);
assert.equal(allowed.affectsAutonomy,false);
assert.equal(pending[0].state,'held','manual disclosure must not mutate Pending Mind');

const ready=requestPendingMindDisclosure({pendingMind:[...pending,{id:'ready-1',topic:'昨日の続き',state:'would_speak_shadow'}],explicitUserRequest:true});
assert.equal(ready.reason,'reconsidered_pending_intent');
assert.equal(ready.itemId,'ready-1');

const empty=requestPendingMindDisclosure({pendingMind:[],explicitUserRequest:true});
assert.equal(empty.allowed,true);
assert.equal(empty.reason,'no_pending_intent');
assert.match(empty.text,/保留している話題はない/);

console.log('pending mind manual disclosure: OK');
