import assert from 'node:assert/strict';

class FakeElement {
  constructor(tagName='div'){
    this.tagName=String(tagName).toUpperCase();
    this.children=[]; this.listeners=new Map(); this.dataset={}; this.attributes=new Map();
    this.className=''; this.textContent=''; this.value=''; this.disabled=false; this.files=null; this.scrollTop=0;
  }
  get scrollHeight(){return this.children.length;}
  appendChild(node){this.children.push(node);return node;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(type,listener){this.listeners.set(type,listener);}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)??null;}
  focus(){} showModal(){} close(){} requestSubmit(){} click(){}
}

const elements=new Map();
const elementFor=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id);};
const documentStub={
  visibilityState:'visible',
  getElementById:id=>elementFor(id),
  createElement:tag=>new FakeElement(tag),
  createTextNode:text=>Object.freeze({nodeType:3,textContent:String(text)}),
  querySelectorAll:()=>[]
};
const storageData=new Map();
const localStorageStub={
  getItem:key=>storageData.has(key)?storageData.get(key):null,
  setItem:(key,value)=>storageData.set(key,String(value)),
  removeItem:key=>storageData.delete(key)
};
const windowStub={localStorage:localStorageStub,addEventListener(){}};
const intervalCallbacks=[];

globalThis.window=windowStub;
globalThis.document=documentStub;
globalThis.localStorage=localStorageStub;
globalThis.setInterval=(callback)=>{intervalCallbacks.push(callback);return intervalCallbacks.length;};
globalThis.clearInterval=()=>{};

await import('../src/bootstrap-experimental-memory.js');
await import('../src/experimental-memory-ui.js');
await import('../src/prototype-state-panel.js');

assert.equal(typeof windowStub.PCAIExperimentalMemory.inspect,'function');
assert.equal(windowStub.PCAIExperimentalMemory.inspect().enabled,false,'Experimental Memory must default OFF');
assert.equal(windowStub.PCAIExperimentalMemory.affectsTemporalRecall,false);
assert.equal(windowStub.PCAIExperimentalMemory.autonomousActionsEnabled,false);
assert.equal(windowStub.PCAIInitiativeShadow.autonomousActionsEnabled,false);
assert.equal(windowStub.PCAIInitiativeShadow.emitsMessages,false);

const toggle=elementFor('experimental-memory-btn').listeners.get('click');
assert.equal(typeof toggle,'function','Experimental Memory toggle must be wired');
toggle();
assert.equal(windowStub.PCAIExperimentalMemory.inspect().enabled,true);
assert.equal(storageData.get('pcai.experimental.memory.v1'),'on');
assert.equal(elementFor('experimental-memory-badge').textContent,'実験記憶 ON');

const chat=elementFor('chat');
const bootChatCount=chat.children.length;
const input=elementFor('message');
input.value='PCAIの記憶について話そう';
const submit=elementFor('chat-form').listeners.get('submit');
assert.equal(typeof submit,'function');
submit({preventDefault(){}});
await new Promise(resolve=>setTimeout(resolve,180));
assert.ok(chat.children.length>=bootChatCount+2,'ordinary chat should add user and assistant messages');

const canonicalKey='pcai.kagaribi-kotori.web.v02';
let canonical=JSON.parse(storageData.get(canonicalKey));
assert.equal(canonical.shortTerm.at(-2)?.role,'user');
assert.equal(canonical.shortTerm.at(-1)?.role,'assistant');

const beforeSleepCount=chat.children.length;
const sleep=elementFor('sleep-btn').listeners.get('click');
assert.equal(typeof sleep,'function');
sleep({preventDefault(){}});
canonical=JSON.parse(storageData.get(canonicalKey));
assert.ok(canonical.head,'sleep must create canonical commit');
assert.equal(storageData.has('pcai.shadow.current-self.v1.kagaribi-kotori'),true);

for(const callback of intervalCallbacks){try{callback();}catch{}}
const self=windowStub.PCAICurrentSelfShadow.inspect().current;
assert.equal(self.continuity.generation,1);
assert.match(elementFor('state-continuity').textContent,/generation 1/);
assert.notEqual(elementFor('state-initiative-action').textContent,'');
assert.equal(elementFor('state-autonomy').textContent,'OFF');
assert.equal(elementFor('state-experimental-memory').textContent,'ON');

const pendingBefore=windowStub.PCAIPendingMindShadow.inspect().pendingCount;
assert.ok(pendingBefore>=1,'post-sleep Shadow evaluation should be able to form a held Pending Mind item');
const manualReply=windowStub.PCAILocalReply({message:'今、話したいことある？'},()=> 'legacy');
assert.match(manualReply,/少し話そうか迷ってた/);
assert.match(manualReply,/PCAIの記憶について話そう/);
assert.equal(windowStub.PCAIPendingMindShadow.inspect().pendingCount,pendingBefore,'manual disclosure must not consume Pending Mind');

const afterSleepCount=chat.children.length;
assert.ok(afterSleepCount>=beforeSleepCount,'sleep may add its explicit user-triggered result');
await new Promise(resolve=>setTimeout(resolve,20));
assert.equal(chat.children.length,afterSleepCount,'Shadow initiative must not spontaneously append chat messages');

// One-click rollback remains available.
toggle();
assert.equal(windowStub.PCAIExperimentalMemory.inspect().enabled,false);
assert.equal(storageData.has('pcai.experimental.memory.v1'),false);

console.log('browser experimental prototype smoke: OK');
