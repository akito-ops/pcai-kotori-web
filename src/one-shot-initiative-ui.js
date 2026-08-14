import './live2d/avatar-shell.js';

const api=window.PCAIOneShotInitiative;
const button=document.getElementById('one-shot-initiative-btn');
const badge=document.getElementById('one-shot-initiative-badge');

function render(){
  const armed=Boolean(api?.inspect?.().armed);
  if(button){
    button.textContent=armed?'💬 自発発話 1回許可中':'💬 自発発話を1回だけ許可';
    button.setAttribute('aria-pressed',String(armed));
  }
  if(badge) badge.textContent=armed?'1回発話 許可中':'1回発話 OFF';
}

function appendAssistantTurn(text){
  const memory=window.PCAIMemoryAdapter;
  if(!memory?.read||!memory?.write) return;
  try{
    const state=JSON.parse(memory.read()||'{}');
    const shortTerm=Array.isArray(state.shortTerm)?state.shortTerm:[];
    const next={...state,shortTerm:[...shortTerm,{role:'assistant',content:String(text).slice(0,1200),at:new Date().toISOString()}].slice(-80)};
    memory.write(JSON.stringify(next));
  }catch(error){console.warn('PCAI one-shot initiative memory write failed',error);}
}

function showEmission(emission){
  const text=String(emission?.text||'').trim();
  if(!text) return;
  const chat=document.getElementById('chat');
  if(chat){
    const node=document.createElement('div');
    node.className='message kotori';
    node.textContent=text;
    chat.appendChild(node);
    chat.scrollTop=chat.scrollHeight;
  }
  appendAssistantTurn(text);
  render();
}

if(button&&api?.arm){
  button.addEventListener('click',()=>{
    if(api.inspect().armed) api.disarm(); else api.arm();
    render();
  });
}
api?.subscribe?.(showEmission);
render();
