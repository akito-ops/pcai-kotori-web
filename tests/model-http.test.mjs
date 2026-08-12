import assert from 'node:assert/strict';
import { runtime } from '../src/config/runtime.js';
import { createRuntimeBindings } from '../src/core/runtime-bindings.js';
import { createModelHttpAdapter } from '../src/adapters/model-http.js';

const bindings = createRuntimeBindings(runtime);
let captured = null;

const fakeFetch = async (url, options) => {
  captured = { url, options };
  return {
    ok: true,
    status: 200,
    async json(){ return { reply: '  テスト応答  ' }; }
  };
};

const adapter = createModelHttpAdapter(bindings, fakeFetch);
const reply = await adapter.chat({
  accessToken: 'test-token',
  message: 'こんにちは',
  recentConversation: [{ role: 'user', content: '前の会話' }],
  relevantMemories: [{ kind: 'episodic', text: '記憶' }],
  mode: 'day'
});

assert.equal(reply, 'テスト応答');
assert.equal(captured.url, 'https://pcai-kotori-backend.siryuuakito.workers.dev/api/chat');
assert.equal(captured.options.method, 'POST');
assert.equal(captured.options.headers['content-type'], 'application/json');
assert.equal(captured.options.headers['x-pcai-access-token'], 'test-token');
assert.deepEqual(JSON.parse(captured.options.body), {
  message: 'こんにちは',
  recentConversation: [{ role: 'user', content: '前の会話' }],
  relevantMemories: [{ kind: 'episodic', text: '記憶' }],
  mode: 'day'
});

console.log('model HTTP adapter contract: OK');
