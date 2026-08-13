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
assert.equal(typeof windowStub.PCAICurrentSelfShadow.inspect, 'function');
assert.equal(windowStub.PCAICurrentSelfShadow.affectsRuntime, false);
assert.equal(windowStub.PCAICurrentSelfShadow.snapshotPersisted, true);
assert.equal(windowStub.PCAICurrentSelfShadow.snapshotStorageKey, 'pcai.shadow.current-self.v1.kagaribi-kotori');
assert.notEqual(windowStub.PCAICurrentSelfShadow.snapshotStorageKey, windowStub.PCAIBindings.storageKey);
assert.equal(windowStub.PCAICurrentSelfShadow.previewSleep, undefined, 'shadow mutation API must not be exposed');
assert.equal(windowStub.PCAICurrentSelfShadow.inspect().snapshotAvailableAtBoot, false);
assert.equal(windowStub.PCAICurrentSelfShadow.inspect().boot.available, false);

for(const property of ['PCAIRuntime','PCAIBindings','PCAIBridge','PCAILocalResponder','PCAILocalReply','PCAICurrentSelfShadow']){
  const descriptor = Object.getOwnPropertyDescriptor(windowStub, property);
  assert.equal(descriptor?.writable, false, `${property} must stay read-only`);
  assert.equal(descriptor?.configurable, false, `${property} must not be replaceable`);
}

const newReply = windowStub.PCAILocalReply({ message: '誕生日は？' }, () => 'legacy');
assert.match(newReply, /7月7日/);

const chat = elementFor('chat');
assert.ok(chat.children.length >= 1, 'app should render an initial chat message');
let renderedText = chat.children.map(node => node.textContent).join('\n');
assert.match(renderedText, /篝火ことり/);
assert.doesNotMatch(renderedText, /起動を停止しました/);

const input = elementFor('message');
input.value = '誕生日は？';
const submit = elementFor('chat-form').listeners.get('submit');
assert.equal(typeof submit, 'function', 'chat form submit handler must be registered');
submit({ preventDefault(){} });
await new Promise(resolve => setTimeout(resolve, 180));

renderedText = chat.children.map(node => node.textContent).join('\n');
assert.match(renderedText, /誕生日は？/);
assert.match(renderedText, /7月7日/);

const canonicalKey = 'pcai.kagaribi-kotori.web.v02';
const shadowKey = 'pcai.shadow.current-self.v1.kagaribi-kotori';
let stored = JSON.parse(storageData.get(canonicalKey));
assert.equal(stored.shortTerm.at(-2)?.role, 'user');
assert.equal(stored.shortTerm.at(-2)?.content, '誕生日は？');
assert.equal(stored.shortTerm.at(-1)?.role, 'assistant');
assert.match(stored.shortTerm.at(-1)?.content || '', /7月7日/);
assert.equal(storageData.has(shadowKey), false, 'ordinary conversation must not persist Current Self snapshot');

const sleep = elementFor('sleep-btn').listeners.get('click');
assert.equal(typeof sleep, 'function', 'sleep handler must be registered');
sleep({ preventDefault(){} });

stored = JSON.parse(storageData.get(canonicalKey));
assert.equal(stored.shortTerm.length, 0, 'canonical sleep must still clear short-term memory');
assert.ok(stored.head, 'canonical sleep must still create a commit');
assert.equal(storageData.has(shadowKey), true, 'successful sleep must persist isolated Current Self shadow snapshot');
const snapshot = JSON.parse(storageData.get(shadowKey));
assert.equal(snapshot.personaId, 'kagaribi-kotori');
assert.equal(snapshot.continuity.generation, 1);
assert.equal(snapshot.continuity.previousCommitId, stored.head);
assert.equal(windowStub.PCAICurrentSelfShadow.inspect().current.continuity.generation, 1);
assert.equal(windowStub.PCAICurrentSelfShadow.inspect().affectsRuntime, false);

console.log('browser bootstrap smoke: OK');
