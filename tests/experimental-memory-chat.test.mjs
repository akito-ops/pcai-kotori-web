import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createExperimentalMemoryController, EXPERIMENTAL_MEMORY_SETTING_KEY } from '../src/core/experimental-memory-controller.js';

class MemoryStorage{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

const storage=new MemoryStorage();
const controller=createExperimentalMemoryController({storage,readCurrentSelf:()=>({activeConcerns:[{topic:'佐渡の夕焼け'}]})});
assert.equal(controller.inspect().enabled,false);
assert.equal(controller.inspect().defaultEnabled,false);
assert.equal(controller.inspect().affectsTemporalRecall,false);
assert.equal(controller.rank({longTerm:{},query:'佐渡'}).enabled,false);

controller.setEnabled(true);
assert.equal(storage.getItem(EXPERIMENTAL_MEMORY_SETTING_KEY),'on');
const longTerm={
  episodic:[{text:'佐渡旅行でこがね丸から夕焼けを見た',importance:.9,confidence:.9}],
  semantic:[{text:'ユーザーはボードゲームが好き',importance:.8,confidence:.95}],
  relationship:[],procedural:[]
};
const ranked=controller.rank({longTerm,query:'佐渡の夕焼け',limit:2});
assert.equal(ranked.enabled,true);
assert.equal(ranked.rankings[0].key,'episodic:0');
controller.setEnabled(false);
assert.equal(storage.getItem(EXPERIMENTAL_MEMORY_SETTING_KEY),null);

const bootstrap=fs.readFileSync(new URL('../src/bootstrap-experimental-memory.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../experimental-chat.html',import.meta.url),'utf8');
const mainHtml=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(bootstrap,/isTemporalRecall/);
assert.match(bootstrap,/lexicalRelevance>=0\.12/);
assert.match(bootstrap,/autonomousActionsEnabled:false/);
assert.match(bootstrap,/affectsTemporalRecall:false/);
assert.match(html,/Experimental Memory OFF/);
assert.match(html,/bootstrap-experimental-memory\.js/);
assert.doesNotMatch(mainHtml,/bootstrap-experimental-memory\.js/);
assert.doesNotMatch(mainHtml,/experimental-memory-btn/);

console.log('experimental-memory-chat contracts: ok');
