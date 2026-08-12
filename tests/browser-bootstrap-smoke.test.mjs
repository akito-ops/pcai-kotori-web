import assert from 'node:assert/strict';

class FakeElement {
  constructor(tagName = 'div'){
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.files = null;
    this.scrollTop = 0;
  }
  get scrollHeight(){ return this.children.length; }
  appendChild(node){ this.children.push(node); return node; }
  append(...nodes){ this.children.push(...nodes); }
  replaceChildren(...nodes){ this.children = [...nodes]; }
  addEventListener(type, listener){ this.listeners.set(type, listener); }
  focus(){}
  showModal(){}
  close(){}
  requestSubmit(){}
  click(){}
}

const elements = new Map();
const elementFor = id => {
  if(!elements.has(id)) elements.set(id, new FakeElement(id));
  return elements.get(id);
};

const documentStub = {
  getElementById(id){ return elementFor(id); },
  createElement(tagName){ return new FakeElement(tagName); },
  createTextNode(text){ return Object.freeze({ nodeType: 3, textContent: String(text) }); },
  querySelectorAll(){ return []; }
};

const storageData = new Map();
const localStorageStub = {
  getItem(key){ return storageData.has(key) ? storageData.get(key) : null; },
  setItem(key, value){ storageData.set(key, String(value)); },
  removeItem(key){ storageData.delete(key); }
};

const windowStub = {
  localStorage: localStorageStub,
  addEventListener(){}
};

globalThis.window = windowStub;
globalThis.document = documentStub;
globalThis.localStorage = localStorageStub;
globalThis.setInterval = () => 0;

await import('../src/bootstrap.js');

assert.equal(windowStub.PCAIRuntime.persona.id, 'kagaribi-kotori');
assert.equal(windowStub.PCAIBindings.storageKey, 'pcai.kagaribi-kotori.web.v02');
assert.equal(windowStub.PCAILocalResponder.personaId, 'kagaribi-kotori');
assert.equal(typeof windowStub.PCAIBridge.chat, 'function');
assert.equal(typeof windowStub.PCAIBridge.memory.read, 'function');
assert.equal(typeof windowStub.PCAILocalReply, 'function');

for(const property of ['PCAIRuntime','PCAIBindings','PCAIBridge','PCAILocalResponder','PCAILocalReply']){
  const descriptor = Object.getOwnPropertyDescriptor(windowStub, property);
  assert.equal(descriptor?.writable, false, `${property} must stay read-only`);
  assert.equal(descriptor?.configurable, false, `${property} must not be replaceable`);
}

const newReply = windowStub.PCAILocalReply({ message: '誕生日は？' }, () => 'legacy');
assert.match(newReply, /7月7日/);

const originalReply = windowStub.PCAILocalResponder.reply;
Object.defineProperty(windowStub.PCAILocalResponder, 'reply', { value: originalReply });

const chat = elementFor('chat');
assert.ok(chat.children.length >= 1, 'app should render an initial chat message');
const renderedText = chat.children.map(node => node.textContent).join('\n');
assert.match(renderedText, /篝火ことり/);
assert.doesNotMatch(renderedText, /起動を停止しました/);

console.log('browser bootstrap smoke: OK');
