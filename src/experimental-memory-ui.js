const button=document.getElementById('experimental-memory-btn');
const badge=document.getElementById('experimental-memory-badge');
const api=window.PCAIExperimentalMemory;

function render(){
  const enabled=Boolean(api?.inspect?.().enabled);
  if(button){
    button.textContent=enabled?'🧠 Experimental Memory ON':'🧠 Experimental Memory OFF';
    button.setAttribute('aria-pressed',String(enabled));
    button.dataset.enabled=String(enabled);
  }
  if(badge) badge.textContent=enabled?'実験記憶 ON':'実験記憶 OFF';
}

if(button&&api?.setEnabled){
  button.addEventListener('click',()=>{
    const next=!Boolean(api.inspect().enabled);
    api.setEnabled(next);
    render();
    const chat=document.getElementById('chat');
    if(chat){
      const notice=document.createElement('div');
      notice.className='message system';
      notice.textContent=next
        ? 'Experimental MemoryをONにしました。通常の関連記憶だけ新Recallを使います。昨日・先週などの時間指定記憶は従来方式のままです。'
        : 'Experimental MemoryをOFFにしました。通常の記憶検索を従来方式へ戻しました。';
      chat.appendChild(notice);
      chat.scrollTop=chat.scrollHeight;
    }
  });
}
render();
