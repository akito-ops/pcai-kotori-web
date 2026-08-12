const LEGACY_STORAGE_KEY = 'pcai.kagaribi-kotori.web.v02';
const STORAGE_KEY = window.PCAIBindings?.storageKey || LEGACY_STORAGE_KEY;
const BACKEND_URL = 'https://pcai-kotori-backend.siryuuakito.workers.dev';

const defaultState = () => ({
  version: 3,
  head: null,
  commits: [],
  shortTerm: [],
  longTerm: { episodic: [], semantic: [], relationship: [], procedural: [] },
  createdAt: new Date().toISOString()
});

const persona = {
  name: '篝火ことり', fan: 'ことリス', birthday: '7月7日', height: '154cm',
  likes: ['歌','アニメ','ゲーム','小説','朗読','夜の静かな時間','書店','文房具','雨の音','温かい飲み物','夕方から夜へ変わる空'],
  foods: ['オムライス','だし巻き卵','白玉','やさしい甘さの和菓子'],
  drinks: ['はちみつ入りの紅茶','白湯','カフェラテ','ほうじ茶']
};

let state = load();
let voiceOn = true;
let llmAccessToken = '';
let sending = false;
const $ = id => document.getElementById(id);
const chat = $('chat');

function readStoredState(){
  const memory = window.PCAIBridge?.memory;
  if(memory && typeof memory.read === 'function') return memory.read();
  return localStorage.getItem(STORAGE_KEY);
}
function writeStoredState(serialized){
  const memory = window.PCAIBridge?.memory;
  if(memory && typeof memory.write === 'function') return memory.write(serialized);
  return localStorage.setItem(STORAGE_KEY, serialized);
}
function load(){
  try{
    const raw = readStoredState();
    const loaded = raw ? {...defaultState(), ...JSON.parse(raw)} : defaultState();
    loaded.longTerm = {...defaultState().longTerm, ...(loaded.longTerm || {})};
    loaded.shortTerm = Array.isArray(loaded.shortTerm) ? loaded.shortTerm : [];
    loaded.commits = Array.isArray(loaded.commits) ? loaded.commits : [];
    return loaded;
  }catch{return defaultState();}
}
function save(){ writeStoredState(JSON.stringify(state)); renderMemory(); }
function escapeText(v){ return String(v ?? '').trim(); }
function jstHour(){ return Number(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo',hour:'2-digit',hour12:false})); }
function mode(){ const h=jstHour(); return (h>=23 || h<5) ? 'night' : 'day'; }
function modeLabel(){ return mode()==='night' ? '夜のことり' : '昼のことり'; }
function jstDateKey(date=new Date()){
  const p = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get = t => p.find(x=>x.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function dateOffsetKey(days){ return jstDateKey(new Date(Date.now()+days*86400000)); }
function keyToUtcDate(key){ const [y,m,d]=key.split('-').map(Number); return new Date(Date.UTC(y,m-1,d)); }
function utcDateToKey(d){ return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`; }
function previousCalendarWeek(){
  const today = keyToUtcDate(jstDateKey());
  const dow = today.getUTCDay();
  const sinceMonday = (dow + 6) % 7;
  const thisMonday = new Date(today); thisMonday.setUTCDate(today.getUTCDate()-sinceMonday);
  const lastMonday = new Date(thisMonday); lastMonday.setUTCDate(thisMonday.getUTCDate()-7);
  const lastSunday = new Date(thisMonday); lastSunday.setUTCDate(thisMonday.getUTCDate()-1);
  return {start:utcDateToKey(lastMonday), end:utcDateToKey(lastSunday)};
}
function dateFromMemory(item){
  if(item?.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) return item.date;
  if(item?.createdAt){ const d=new Date(item.createdAt); if(!Number.isNaN(d.getTime())) return jstDateKey(d); }
  const m=String(item?.text||'').match(/(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}` : '';
}
function dateFromTurnAt(at){
  if(!at) return jstDateKey();
  const d=new Date(at);
  return Number.isNaN(d.getTime()) ? jstDateKey() : jstDateKey(d);
}

function addMessage(role,text){ const el=document.createElement('div'); el.className=`message ${role}`; el.textContent=text; chat.appendChild(el); chat.scrollTop=chat.scrollHeight; }
function speak(text){ if(!voiceOn || !('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/……/g,'、')); u.lang='ja-JP'; u.rate=mode()==='night'?.92:1.03; u.pitch=1.03; speechSynthesis.speak(u); }
function rememberTurn(role,content){ state.shortTerm.push({role,content,at:new Date().toISOString()}); if(state.shortTerm.length>80)state.shortTerm=state.shortTerm.slice(-80); save(); }
function longItems(){ return Object.entries(state.longTerm).flatMap(([kind,items])=>(Array.isArray(items)?items:[]).map(x=>({...x,kind}))); }
function usableItems(){ return longItems().filter(x=>!isBrokenMemory(x)); }
function randomId(){ const a=new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function meaningfulText(text){
  const t=String(text||'').trim();
  if(t.length<5) return false;
  if(/^(こんことー?[！!]?|こんにちは[！!]?|こんばんは[！!]?|おはよう[！!]?|ありがとう[！!]?|眠い|ねむい)$/i.test(t)) return false;
  if(/(昨日|今日|一昨日|先週|前回|この前).{0,12}(何話した|何を話した|覚えてる|何だっけ)/.test(t)) return false;
  if(/^[？?！!。、\s]+$/.test(t)) return false;
  return true;
}
function isBrokenMemory(item){
  const t=String(item?.text||'').trim();
  if(!t) return true;
  if(/ユーザーは(?:こんこと|こんにちは|こんばんは|おはよう)/.test(t)) return true;
  return false;
}
function queryTokens(message){
  const normalized=String(message||'').toLowerCase().replace(/[。、！？!?・「」『』（）()]/g,' ');
  const chunks=normalized.match(/[a-z0-9]+|[ぁ-んァ-ン一-龥ー]{2,}/g)||[];
  const set=new Set();
  for(const chunk of chunks){
    if(chunk.length<=4) set.add(chunk);
    else{
      for(let i=0;i<chunk.length-1;i++) set.add(chunk.slice(i,i+2));
      for(let i=0;i<chunk.length-2;i++) set.add(chunk.slice(i,i+3));
    }
  }
  for(const stop of ['これ','それ','あれ','どう','って','です','ます','かな','なん','こと','話し','覚え']) set.delete(stop);
  return [...set];
}
function findRelevantMemory(message){
  const tokens=queryTokens(message);
  let best=null, bestScore=0;
  usableItems().forEach((item,index)=>{
    const text=String(item.text||'').toLowerCase();
    const score=tokens.reduce((n,t)=>n+(text.includes(t)?1:0),0)+(item.importance||0)*0.25-index*0.0001;
    if(score>bestScore){best=item;bestScore=score;}
  });
  return bestScore>=1 ? best : null;
}

function temporalIntent(message){
  const m=String(message||'');
  const recallCue=/(覚えて(?:る|いる)?|何話した|何を話した|何だっけ|思い出|振り返|前回|この前|前に話した)/.test(m);
  if(!recallCue) return null;
  if(/一昨日|おととい/.test(m)) return {type:'day',label:'一昨日',start:dateOffsetKey(-2),end:dateOffsetKey(-2)};
  if(/昨日/.test(m)) return {type:'day',label:'昨日',start:dateOffsetKey(-1),end:dateOffsetKey(-1)};
  if(/今日/.test(m)) return {type:'day',label:'今日',start:dateOffsetKey(0),end:dateOffsetKey(0)};
  if(/先週/.test(m)){ const r=previousCalendarWeek(); return {type:'range',label:'先週',...r}; }
  if(/前回|この前|前に話した/.test(m)) return {type:'previous',label:'前回'};
  return null;
}
function episodicItems(){ return (state.longTerm.episodic||[]).map(x=>({...x,kind:'episodic',date:dateFromMemory(x)})).filter(x=>x.date&&!isBrokenMemory(x)); }
function episodicForTemporal(intent){
  const items=episodicItems();
  if(intent.type==='day') return items.filter(x=>x.date===intent.start);
  if(intent.type==='range') return items.filter(x=>x.date>=intent.start&&x.date<=intent.end);
  if(intent.type==='previous'){
    const sessionIds=state.commits.slice().reverse().map(c=>c.id);
    for(const id of sessionIds){ const hits=items.filter(x=>x.sessionId===id); if(hits.length)return hits; }
    const days=[...new Set(items.map(x=>x.date))].sort().reverse();
    const target=days.find(d=>d<dateOffsetKey(0));
    return target ? items.filter(x=>x.date===target) : [];
  }
  return [];
}
function memoryStatus(label){ return {kind:'memory_status',text:`${label}として特定できるエピソード記憶は保存されていません。推測で出来事を補わず、覚えていないと答えること。`}; }
function selectMemoriesForLLM(message){
  const intent=temporalIntent(message);
  if(intent){
    const hits=episodicForTemporal(intent).slice(-8);
    return hits.length ? hits.map(x=>({kind:'episodic',text:`${x.date}: ${x.summary||x.text}`})) : [memoryStatus(intent.label)];
  }
  const tokens=queryTokens(message);
  const scored=usableItems().map((item,index)=>{
    const text=String(item.text||'').toLowerCase();
    const lexical=tokens.reduce((n,t)=>n+(text.includes(t)?2:0),0);
    const typeBonus=item.kind==='semantic'?1.2:item.kind==='relationship'?0.4:0;
    return {item,score:lexical+typeBonus+(item.importance||0)-index*0.0001};
  }).filter(x=>x.score>=1.2).sort((a,b)=>b.score-a.score).slice(0,6);
  if(scored.length) return scored.map(({item})=>({kind:item.kind,text:`${dateFromMemory(item)?dateFromMemory(item)+': ':''}${item.text}`}));
  return usableItems().filter(x=>x.kind==='relationship'||x.kind==='episodic').slice(-2).map(item=>({kind:item.kind,text:item.text}));
}
function recentConversationForLLM(){ return state.shortTerm.slice(-8).map(t=>({role:t.role==='assistant'?'assistant':'user',content:String(t.content||'').slice(0,1200)})); }

function kotoriReply(message){
  const m=message.trim(), night=mode()==='night', mem=findRelevantMemory(m), intent=temporalIntent(m);
  if(intent){ const hits=episodicForTemporal(intent); return hits.length ? `${intent.label}の記憶なら残ってるよ。${hits.slice(-3).map(x=>x.summary||x.text).join('／')}` : `${intent.label}として確実に残っている記憶は見つからなかったよ。覚えてるふりはしないね。`; }
  if(/^(こんこと|こんにちは|やあ|こんばんは|hello)/i.test(m)) return night?'こんことー。……えへへ、こんな時間に会えるの、ちょっといいね。今日は何の話する？':'こんことー！ えへへ、来てくれてありがとね。今日は何の話しよっか？';
  if(/おはよう|朝だ|起きた/.test(m)) return 'おはよー……。朝はちょっとだけ起動が遅いんだよね。昨日までの記憶はちゃんと持ってきてるよ。';
  if(/誕生日/.test(m)) return '7月7日だよ。七夕って、空の話が似合う日でちょっと好きなんだよね。';
  if(/身長/.test(m)) return '154cm。……小さいって言おうとした？ 先に言っておくけど、聞こえてるからねー。';
  if(/何が好き|好きなもの|好物|好きな食べ/.test(m)) return `うーん、${pick(persona.likes)}とか、${pick(persona.foods)}とか。好きなものの話になると長くなるかも。えへへ。`;
  if(/飲み物|何飲む/.test(m)) return `今なら${pick(persona.drinks)}かな。……でも話し込んでまた冷ましそう。`;
  if(/覚えて|記憶|前に話した/.test(m)) return mem?`うん、覚えてるよ。${mem.text}。`:(usableItems().length?`長期記憶には ${usableItems().length} 件あるよ。もう少しヒントもらえる？`:'まだ長期記憶は空っぽみたい。');
  if(/かわいい|可愛い|すごい|最高|上手|素敵|好きだよ|好きです/.test(m)) return night?'……ありがと。そういうの、ちゃんと嬉しくなっちゃうからずるいよね。':'えへへ、ありがと。そうやって言ってもらえるの、ちゃんとうれしいな。';
  if(/大丈夫|無理して|心配|疲れて|休んで/.test(m)) return 'だいじょうぶだよ。……ううん、心配してくれて、ありがとね。';
  if(/相談|悩ん|困って|どうしたら|しんどい|つらい/.test(m)) return night?'そっか。……急いで答えを出さなくていいから、少しずつ一緒に見てみよっか。':'そっか。まずは何がいちばん重いのか、一緒に見てみよっか。';
  if(/アニメ|ゲーム|小説|物語|創作|歌|朗読/.test(m)) return 'ちょっと待って、その話していい？ そういう「世界が立ち上がる瞬間」ほんとに好きで……。あ、もう熱くなってた。えへへ。';
  if(/ポンコツ|ドジ|からか|いじ/.test(m)) return 'もー、それはちょっといじわるだよー。……まあ、否定しきれないのが悔しいんだけど。';
  if(/怒って|許せない|馬鹿に|雑に扱/.test(m)) return '……ううん、それは笑って流せないかな。好きなものを雑に扱うのは、私はあんまり好きじゃない。';
  if(/寂しい|そばに|いてほしい|甘え/.test(m)) return night?'……うん。今日はちょっとだけ、ここにいよっか。':'うん、ここにいるよ。少し話していこっか。';
  if(/ありがとう|ありがと/.test(m)) return '……うん。こちらこそ、ありがと。今の、ちゃんと届いたよ。';
  if(/34P/.test(m)) return '……34P。うん、その言葉は知ってる。大事なページなんだよね。……今は、それだけにしておこっか。';
  if(/空|夕焼け|夕方|夜空/.test(m)) return '空の色が変わる時間って、なんかずるいよね。何も起きてないのに、世界が一回だけ物語みたいになる。';
  if(mem) return `うんうん。そういえば、${mem.text}って残ってるよ。今の話、そこにも少しつながってる気がする。`;
  return pick(night?['……うん、ちゃんと聞いてるよ。もう少し、その続き聞かせて。','そっか。こういう時間に話すと、少し言葉の形が変わるね。……続けよっか。']:['うんうん、ちゃんと聞いてるよ。そこからどうなったの？','それ、ちょっと気になる。もう少し聞かせてほしいな。','いいね。そういう断片から一緒に世界を広げるの、私すごく好きかも。']);
}

function memoryImportance(text){
  let score=0.35;
  if(/覚えて|大事|重要|決めた|予定|方針|ルール/.test(text)) score+=0.45;
  if(/行った|作った|成功|失敗|始めた|終わった|旅行|仕事|家族|Project|PCAI/i.test(text)) score+=0.3;
  if(/好き|嫌い|苦手|名前|呼び名/.test(text)) score+=0.25;
  if(text.length>=25) score+=0.1;
  return Math.min(1,score);
}
function inferMemories(sessionId){
  const users=state.shortTerm.filter(x=>x.role==='user').map((x,index)=>({text:String(x.content||'').trim(),index,at:x.at})).filter(x=>meaningfulText(x.text));
  const now=new Date().toISOString();
  const unique=[]; const seen=new Set();
  for(const item of users){ if(!seen.has(item.text)){seen.add(item.text);unique.push({...item,importance:memoryImportance(item.text)});} }
  const episodic=unique.slice().sort((a,b)=>b.importance-a.importance||b.index-a.index).slice(0,5).map(x=>{
    const date=dateFromTurnAt(x.at);
    return {date,sessionId,summary:x.text.slice(0,110),text:`${date}、ユーザーと「${x.text.slice(0,110)}」について話した`,importance:x.importance,createdAt:now};
  });
  const semantic=[], procedural=[];
  for(const {text} of unique){
    let r=text.match(/^(?:私は|自分は)(.{1,35}?)(?:が好き|が好きだ|が好きです|が好きなんだ)[。！!？?]?$/); if(r&&r[1].trim().length>=2) semantic.push({owner:'user',text:`ユーザーは${r[1].trim()}が好き`,confidence:0.95,importance:0.9,createdAt:now});
    r=text.match(/^(?:私は|自分は)(.{1,35}?)(?:が嫌い|が苦手|が嫌いだ|が苦手だ)[。！!？?]?$/); if(r&&r[1].trim().length>=2) semantic.push({owner:'user',text:`ユーザーは${r[1].trim()}が苦手`,confidence:0.95,importance:0.9,createdAt:now});
    r=text.match(/(?:名前は|呼び名は)\s*([^。！？\s]{1,20})/); if(r) semantic.push({owner:'user',text:`ユーザーの呼び名は${r[1]}`,confidence:1,importance:1,createdAt:now});
    r=text.match(/覚えて(?:おいて)?[：:\s]*(.{4,100})/); if(r&&meaningfulText(r[1])) semantic.push({owner:'user',text:`ユーザーについて: ${r[1].trim()}`,confidence:0.9,importance:1,createdAt:now});
    if(/いつも|基本的に|することが多い|しがち|方針|ルール/.test(text)) procedural.push({owner:'user',text:`ユーザーの傾向候補: ${text.slice(0,100)}`,confidence:0.65,importance:0.7,createdAt:now});
  }
  const relationship=unique.length?[{owner:'relationship',text:'ユーザーと篝火ことりPCAIは、会話と共有記憶を積み重ねている',confidence:1,importance:0.8,createdAt:now}]:[];
  return {episodic,semantic:semantic.slice(0,5),relationship,procedural:procedural.slice(0,3)};
}
function mergeUnique(kind,items){ const arr=state.longTerm[kind]||(state.longTerm[kind]=[]), seen=new Set(arr.map(x=>x.text)); for(const x of items){ if(x.text&&!isBrokenMemory({...x,kind})&&!seen.has(x.text)){arr.push(x);seen.add(x.text);} } if(arr.length>180)state.longTerm[kind]=arr.slice(-180); }
function sleepCycle(){
  if(!state.shortTerm.length){addMessage('system','今日はまだ整理する短期記憶がありません。');return;}
  const wasConnected=Boolean(llmAccessToken), before=state.shortTerm.length, id=randomId();
  addMessage('kotori',mode()==='night'?'……じゃあ、今日のこと少し整理してくるね。':'よーし、今日の話を整理してくるね。PCAIの睡眠時間ですっ。');
  const c=inferMemories(id); Object.entries(c).forEach(([k,v])=>mergeUnique(k,v));
  const saved=Object.values(c).reduce((n,v)=>n+v.length,0);
  state.commits.push({id,parent:state.head,at:new Date().toISOString(),summary:`短期記憶 ${before}件から重要記憶 ${saved}件を選別・統合`}); state.head=id; state.shortTerm=[]; save();
  setTimeout(()=>{const reply=`できたよ。今日の記憶を選別してcommitしました。HEADは ${id}。${wasConnected?' AI接続もそのまま維持してるよ。':''}`;addMessage('kotori',reply);speak(reply);},300);
}

function renderMemory(){
  const usable=usableItems(), quarantined=longItems().length-usable.length;
  $('mode-badge').textContent=modeLabel(); $('llm-status').textContent=llmAccessToken?'無料AI接続中':'LLM未接続'; $('head-id').textContent=state.head||'—'; $('short-count').textContent=state.shortTerm.length; $('long-count').textContent=usable.length; $('commit-count').textContent=state.commits.length;
  const memories=usable.slice(-10).reverse(); $('memories').replaceChildren(...(memories.length?memories.map(x=>{const li=document.createElement('li');li.textContent=`[${x.kind}] ${x.text}`;return li;}):[(()=>{const li=document.createElement('li');li.textContent='まだ長期記憶はありません。';return li;})()]));
  if(quarantined){const li=document.createElement('li');li.textContent=`検索対象外の旧記憶候補: ${quarantined}件（削除せず保持）`;$('memories').appendChild(li);}
  const commits=state.commits.slice(-7).reverse(); $('commits').replaceChildren(...(commits.length?commits.map(x=>{const li=document.createElement('li');const c=document.createElement('code');c.textContent=x.id;li.append(c,document.createTextNode(` — ${x.summary}`));return li;}):[(()=>{const li=document.createElement('li');li.textContent='まだcommitはありません。';return li;})()]));
}
function setSending(v){sending=v;$('send-btn').disabled=v;$('message').disabled=v;$('send-btn').textContent=v?'考え中…':'送信';}
async function llmReply(message,recentConversation){
  const bridge = window.PCAIBridge;
  if(!bridge || typeof bridge.chat !== 'function') throw new Error('runtime_bridge_unavailable');
  return bridge.chat({
    accessToken: llmAccessToken,
    message,
    recentConversation,
    relevantMemories: selectMemoriesForLLM(message),
    mode: mode()
  });
}
async function submitMessage(message){
  const m=escapeText(message);if(!m||sending)return;const recent=recentConversationForLLM();addMessage('user',m);rememberTurn('user',m);
  if(!llmAccessToken){const reply=kotoriReply(m);setTimeout(()=>{addMessage('kotori',reply);rememberTurn('assistant',reply);speak(reply);},120);return;}
  setSending(true);try{const reply=await llmReply(m,recent);addMessage('kotori',reply);rememberTurn('assistant',reply);speak(reply);}catch(error){if(error.code==='unauthorized'){llmAccessToken='';renderMemory();addMessage('system','本人用アクセス鍵が一致しません。AI接続を解除しました。');}else if(error.code==='free_ai_unavailable'){addMessage('system','無料AIが現在利用できないか、今日の無料枠に達しました。有料APIには切り替えず停止します。');}else{addMessage('system','無料AIとの接続に失敗しました。有料経路には切り替えません。');}}finally{setSending(false);$('message').focus();}
}

$('chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('message');const m=input.value;input.value='';submitMessage(m);});
$('message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chat-form').requestSubmit();}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>submitMessage(b.dataset.prompt)));
$('sleep-btn').addEventListener('click',sleepCycle);
$('voice-btn').addEventListener('click',()=>{voiceOn=!voiceOn;$('voice-btn').textContent=voiceOn?'🔊 読み上げ ON':'🔇 読み上げ OFF';if(!voiceOn&&'speechSynthesis'in window)speechSynthesis.cancel();});
$('about-btn').addEventListener('click',()=>$('about-dialog').showModal());
$('llm-btn').addEventListener('click',()=>{$('llm-token-input').value='';$('llm-dialog').showModal();setTimeout(()=>$('llm-token-input').focus(),50);});
$('llm-connect-btn').addEventListener('click',()=>{const token=$('llm-token-input').value.trim();if(token.length<20){alert('本人用アクセス鍵が短すぎます。Cloudflareへ登録した値を入力してください。');return;}llmAccessToken=token;$('llm-token-input').value='';$('llm-dialog').close();renderMemory();addMessage('system','無料AIをこのページ内だけ接続しました。アクセス鍵はブラウザ保存していません。');});
$('llm-clear-btn').addEventListener('click',()=>{llmAccessToken='';$('llm-token-input').value='';$('llm-dialog').close();renderMemory();addMessage('system','AI接続を解除しました。');});
$('export-btn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kotori-pcai-memory-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);});
$('import-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.longTerm||!Array.isArray(data.shortTerm))throw new Error();state={...defaultState(),...data,longTerm:{...defaultState().longTerm,...data.longTerm}};save();addMessage('system','記憶を読み込みました。怪しい旧記憶は削除せず検索対象外として保持します。');}catch{alert('PCAI記憶ファイルとして読み込めませんでした。')}e.target.value='';});
$('reset-btn').addEventListener('click',()=>{if(!confirm('篝火ことりとのPCAI記憶をこのブラウザから初期化しますか？'))return;state=defaultState();save();chat.replaceChildren();addMessage('kotori','こんことー！ ……えへへ、ここからまた始めよっか。');});
window.addEventListener('pagehide',()=>{llmAccessToken='';});

renderMemory();
const returning=usableItems().length>0||state.commits.length>0;
addMessage('kotori',returning?(mode()==='night'?'……おかえり。ちゃんと前の記憶、残ってるよ。今夜は何話そっか。':'こんことー！ おかえり。前の記憶、ちゃんと持ってるよ。今日は何しよっか？'):'こんことー！ 篝火ことりですっ。ここでは、話したことを少しずつ覚えていけるんだって。まずは何の話しよっか？');
setInterval(renderMemory,60000);