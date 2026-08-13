import { assessLongTermMemoryImportance } from './core/memory-importance-shadow.js';
import { rankMemoryRecallOfflineShadow } from './core/memory-recall-ranking-offline-shadow.js';

const STORAGE_KEY='pcai.kagaribi-kotori.web.v02';
const $=id=>document.getElementById(id);
let state=readState();

function readState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    return parsed&&typeof parsed==='object'?parsed:{longTerm:{}};
  }catch{return {longTerm:{}};}
}

function flatten(longTerm){
  const rows=[];
  for(const kind of ['episodic','semantic','relationship','procedural']){
    const items=Array.isArray(longTerm?.[kind])?longTerm[kind]:[];
    items.forEach((item,index)=>rows.push({key:`${kind}:${index}`,kind,item}));
  }
  return rows;
}

function tokens(message){
  const normalized=String(message||'').toLowerCase().replace(/[。、！？!?・「」『』（）()]/g,' ');
  const chunks=normalized.match(/[a-z0-9]+|[ぁ-んァ-ン一-龥ー]{2,}/g)||[];
  const set=new Set();
  for(const chunk of chunks){
    if(chunk.length<=4)set.add(chunk);
    else{
      for(let i=0;i<chunk.length-1;i++)set.add(chunk.slice(i,i+2));
      for(let i=0;i<chunk.length-2;i++)set.add(chunk.slice(i,i+3));
    }
  }
  return [...set];
}

function legacyRank(query){
  const ts=tokens(query);
  return flatten(state.longTerm).map(({key,kind,item},index)=>{
    const text=String(item?.text||'').toLowerCase();
    const lexical=ts.reduce((n,t)=>n+(text.includes(t)?1:0),0);
    const score=lexical+(Number(item?.importance)||0)*0.25-index*0.0001;
    return {key,kind,item,score};
  }).sort((a,b)=>b.score-a.score||a.key.localeCompare(b.key));
}

function currentSelf(){
  try{return window.opener?.PCAICurrentSelfShadow?.inspect?.()?.current||null;}catch{return null;}
}

function renderList(target,rows,importanceByKey){
  const list=$(target);
  const top=rows.slice(0,8);
  list.replaceChildren(...(top.length?top.map((row,index)=>{
    const li=document.createElement('li');
    const importance=importanceByKey.get(row.key);
    const score=Number(row.recallScore??row.score??0).toFixed(3);
    const text=String(row.item?.text||importance?.sourceText||'').trim();
    li.textContent=`${index+1}. [${row.kind}] score=${score} / ${text||'(本文なし)'}`;
    return li;
  }):[Object.assign(document.createElement('li'),{textContent:'長期記憶がありません。'})]));
}

function run(){
  const query=$('lab-query').value.trim();
  const longTerm=state.longTerm||{};
  const importance=assessLongTermMemoryImportance({longTerm,currentSelf:currentSelf()});
  const importanceByKey=new Map(importance.assessments.map(x=>[x.key,x]));
  const sourceByKey=new Map(flatten(longTerm).map(row=>[row.key,row]));
  const shadow=rankMemoryRecallOfflineShadow({longTerm,importanceAssessments:importance.assessments,query,limit:12});
  const shadowRows=shadow.rankings.map(row=>({...row,item:sourceByKey.get(row.key)?.item}));
  const legacy=legacyRank(query);
  renderList('shadow-list',shadowRows,importanceByKey);
  renderList('legacy-list',legacy,importanceByKey);
  const same=shadowRows[0]?.key&&legacy[0]?.key===shadowRows[0]?.key;
  $('lab-status').textContent=`長期記憶 ${flatten(longTerm).length}件を読み取り専用で評価。1位一致: ${same?'一致':'不一致'}。この画面は正本記憶を書き換えません。`;
}

$('lab-run').addEventListener('click',run);
$('lab-refresh').addEventListener('click',()=>{state=readState();run();});
$('lab-query').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();run();}});
run();
