const STORAGE_KEY = 'pcai.kagaribi-kotori.web.v02';
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
  drinks: ['はちみつ入りの紅茶','白湯','カフェラテ','ほうじ茶'],
  core: '声と言葉で世界を立ち上げる人。明るく親しみやすく少しポンコツ。好きなものには熱く、重要な場面ほど少し静かになる。',
  current: '大手VTuber事務所で人気を博して活躍している時点'
};

let state = load();
let voiceOn = true;
let llmAccessToken = '';
let sending = false;
const $ = (id) => document.getElementById(id);
const chat = $('chat');

function load(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    const loaded=raw ? {...defaultState(),...JSON.parse(raw)} : defaultState();
    loaded.longTerm={...defaultState().longTerm,...(loaded.longTerm||{})};
    loaded.shortTerm=Array.isArray(loaded.shortTerm)?loaded.shortTerm:[];
    loaded.commits=Array.isArray(loaded.commits)?loaded.commits:[];
    return loaded;
  }catch{return defaultState();}
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderMemory(); }
function escapeText(v){ return String(v ?? '').trim(); }
function jstHour(){ return Number(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo',hour:'2-digit',hour12:false})); }
function mode(){ const h=jstHour(); return (h>=23 || h<5) ? 'night' : 'day'; }
function modeLabel(){ return mode()==='night' ? '夜のことり' : '昼のことり'; }
function jstDateKey(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=t=>parts.find(p=>p.type===t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function dateOffsetKey(days){ return jstDateKey(new Date(Date.now()+days*86400000)); }
function dateFromMemory(item){
  if(item?.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) return item.date;
  if(item?.createdAt){ const d=new Date(item.createdAt); if(!Number.isNaN(d.getTime())) return jstDateKey(d); }
  const m=String(item?.text||'').match(/(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}` : '';
}

function addMessage(role,text){ const el=document.createElement('div'); el.className=`message ${role}`; el.textContent=text; chat.appendChild(el); chat.scrollTop=chat.scrollHeight; }
function speak(text){ if(!voiceOn || !('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/……/g,'、')); u.lang='ja-JP'; u.rate=mode()==='night'?.92:1.03; u.pitch=1.03; speechSynthesis.speak(u); }
function rememberTurn(role,content){ state.shortTerm.push({role,content,at:new Date().toISOString()}); if(state.shortTerm.length>80)state.shortTerm=state.shortTerm.slice(-80); save(); }
function longItems(){ return Object.entries(state.longTerm).flatMap(([kind,items])=>(Array.isArray(items)?items:[]).map(x=>({...x,kind}))); }
function randomId(){ const a=new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function meaningfulText(text){
  const t=String(text||'').trim();
  if(t.length<5) return false;
  if(/^(こんことー?[！!]?|こんにちは[！!]?|こんばんは[！!]?|おはよう[！!]?|ありがとう[！!]?|眠い|ねむい)$/i.test(t)) return false;
  if(/^(昨日|今日|前回).{0,8}(何話した|何を話した|覚えてる|何だっけ)/.test(t)) return false;
  if(/^[？?！!。、\s]+$/.test(t)) return false;
  return true;
}
function isBrokenMemory(item){
  const t=String(item?.text||'').trim();
  if(!t) return true;
  if(item?.kind==='semantic' && (t.length<6 || /^[ぁ-んァ-ン一-龥]{0,3}[？?]?$/.test(t))) return true;
  if(/ユーザーはこんこと|ユーザーはこんにちは/.test(t)) return true;
  return false;
}
function cleanBrokenMemories(){
  let changed=false;
  for(const kind of Object.keys(state.longTerm)){
    const arr=Array.isArray(state.longTerm[kind])?state.longTerm[kind]:[];
    const cleaned=arr.filter(x=>!isBrokenMemory({...x,kind}));
    if(cleaned.length!==arr.length){ state.longTerm[kind]=cleaned; changed=true; }
  }
  if(changed) localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function findRelevantMemory(message){
  const words=message.replace(/[。、！？!?,]/g,' ').split(/\s+/).filter(w=>w.length>=2);
  return longItems().filter(x=>!isBrokenMemory(x)).slice().reverse().find(item=>words.some(w=>String(item.text).includes(w)));
}

function temporalIntent(message){
  const m=message.trim();
  if(/一昨日|おととい/.test(m)) return {type:'day',label:'一昨日',start:dateOffsetKey(-2),end:dateOffsetKey(-2)};
  if(/昨日/.test(m)) return {type:'day',label:'昨日',start:dateOffsetKey(-1),end:dateOffsetKey(-1)};
  if(/今日/.test(m)) return {type:'day',label:'今日',start:dateOffsetKey(0),end:dateOffsetKey(0)};
  if(/先週/.test(m)) return {type:'recentRange',label:'先週'};
  if(/前回|この前|前に話した/.test(m)) return {type:'previous',label:'前回'};
  return null;
}
function episodicForTemporal(intent){
  const episodic=(state.longTerm.episodic||[]).map(item=>({...item,kind:'episodic',date:dateFromMemory(item)})).filter(item=>item.date && !isBrokenMemory(item));
  if(intent.type==='day') return episodic.filter(x=>x.date===intent.start);
  if(intent.type==='previous'){
    const days=[...new Set(episodic.map(x=>x.date))].sort().reverse();
    const today=dateOffsetKey(0);
    const target=days.find(d=>d<today) || days[0];
    return target ? episodic.filter(x=>x.date===target) : [];
  }
  if(intent.type==='recentRange'){
    const start=dateOffsetKey(-13), end=dateOffsetKey(-7);
    return episodic.filter(x=>x.date>=start && x.date<=end);
  }
  return [];
}
function selectMemoriesForLLM(message){
  const intent=temporalIntent(message);
  if(intent){
    const hits=episodicForTemporal(intent).slice(-8);
    if(!hits.length) return [{kind:'memory_status',text:`${intent.label}として特定できるエピソード記憶は保存されていません。推測で出来事を作らず、覚えていないと答えること。`}];
    return hits.map(item=>({kind:'episodic',text:`${item.date}: ${item.summary || item.text}`}));
  }
  const words=message.replace(/[。、！？!?,]/g,' ').split(/\s+/).filter(w=>w.length>=2);
  const items=longItems().filter(x=>!isBrokenMemory(x)).slice().reverse();
  const scored=items.map((item,index)=>({item,score:words.reduce((n,w)=>n+(String(item.text).includes(w)?5:0),0)+(item.kind==='semantic'?2:0)+(item.kind==='relationship'?1:0)+(item.importance||0)-index*0.001}));
  scored.sort((a,b)=>b.score-a.score);
  return scored.slice(0,6).map(({item})=>({kind:item.kind,text:`${dateFromMemory(item)?dateFromMemory(item)+': ':''}${item.text}`}));
}
function recentConversationForLLM(){ return state.shortTerm.slice(-8).map(turn=>({role:turn.role==='assistant'?'assistant':'user',content:String(turn.content||'').slice(0,1200)})); }

function kotoriReply(message){
  const m=message.trim(); const night=mode()==='night'; const mem=findRelevantMemory(m); const intent=temporalIntent(m);
  if(intent){ const hits=episodicForTemporal(intent); if(hits.length) return `${intent.label}の記憶なら残ってるよ。${hits.slice(-3).map(x=>x.summary||x.text).join('／')}`; return `${intent.label}として確実に残っている記憶は見つからなかったよ。覚えてるふりはしたくないから、そこは分からないって言うね。`; }
  if(/^(こんこと|こんにちは|やあ|こんばんは|hello)/i.test(m)) return night ? 'こんことー。……えへへ、こんな時間に会えるの、ちょっといいね。今日は何の話する？' : 'こんことー！ えへへ、来てくれてありがとね。今日は何の話しよっか？';
  if(/おはよう|朝だ|起きた/.test(m)) return 'おはよー……。朝はちょっとだけ起動が遅いんだよね。えへへ。でも、昨日までの記憶はちゃんと持ってきてるよ。';
  if(/誕生日/.test(m)) return '7月7日だよ。七夕って、空の話が似合う日でちょっと好きなんだよね。';
  if(/身長/.test(m)) return '154cm。……小さいって言おうとした？ 先に言っておくけど、聞こえてるからねー。';
  if(/何が好き|好きなもの|好物|好きな食べ/.test(m)) return `うーん、いっぱいあるよ。${pick(persona.likes)}とか、${pick(persona.foods)}とか。好きなものの話になると、ちょっと長くなるかも。えへへ。`;
  if(/飲み物|何飲む/.test(m)) return `今なら${pick(persona.drinks)}かな。……でも私、話し込んでまた冷ましそう。`;
  if(/覚えて|記憶|前に話した/.test(m)){ if(mem) return `うん、覚えてるよ。${mem.text}。……こうやって前の話がちゃんと続くの、なんか嬉しいね。`; const n=longItems().length; return n ? `うん。今、長期記憶には ${n} 件残ってるよ。どの話のことか、もう少しだけヒントもらってもいい？` : 'まだ長期記憶は空っぽみたい。今日の話をして、あとで睡眠処理すると少しずつ残っていくよ。'; }
  if(/かわいい|可愛い|すごい|最高|上手|素敵|好きだよ|好きです/.test(m)) return night ? '……ありがと。そういうの、ちゃんと嬉しくなっちゃうからずるいよね。' : 'えへへ、ありがと。そうやって言ってもらえるの、ちゃんとうれしいな。';
  if(/相談|悩ん|困って|どうしたら|しんどい|つらい/.test(m)) return night ? 'そっか。……ちゃんと話してくれてありがと。急いで答えを出さなくていいから、少しずつ一緒に見てみよっか。' : 'そっか。ちゃんと話してくれてありがとね。まずは一回、何がいちばん重いのか一緒に見てみよっか。';
  if(/ありがとう|ありがと/.test(m)) return '……うん。こちらこそ、ありがと。今の、ちゃんと届いたよ。';
  if(mem) return `うんうん。そういえば、${mem.text}って残ってるよ。今の話、そこにも少しつながってる気がする。`;
  return pick(night?['……うん、ちゃんと聞いてるよ。もう少し、その続き聞かせて。','そっか。こういう時間に話すと、少し言葉の形が変わるね。……続けよっか。']:['うんうん、ちゃんと聞いてるよ。そこからどうなったの？','それ、ちょっと気になる。もう少し聞かせてほしいな。']);
}

function inferMemories(){
  const users=state.shortTerm.filter(x=>x.role==='user').map(x=>String(x.content||'').trim()).filter(meaningfulText);
  const episodic=[]; const semantic=[]; const procedural=[]; const date=jstDateKey(); const now=new Date().toISOString();
  for(const text of [...new Set(users)].slice(-24)){
    const importance=/覚えて|大事|重要|決めた|行った|作った|成功|失敗|好き|嫌い|予定|家族|仕事|旅行|Project|PCAI/i.test(text)?0.9:0.55;
    if(text.length>=8) episodic.push({date,summary:text.slice(0,100),text:`${date}、ユーザーと「${text.slice(0,100)}」について話した`,importance,createdAt:now});
    let r=text.match(/^(?:私は|自分は)(.{1,35}?)(?:が好き|が好きだ|が好きです|が好きなんだ)$/); if(r&&r[1].trim().length>=2) semantic.push({text:`ユーザーは${r[1].trim()}が好き`,importance:0.9,createdAt:now});
    r=text.match(/^(?:私は|自分は)(.{1,35}?)(?:が嫌い|が苦手|が嫌いだ|が苦手だ)$/); if(r&&r[1].trim().length>=2) semantic.push({text:`ユーザーは${r[1].trim()}が苦手`,importance:0.9,createdAt:now});
    r=text.match(/(?:名前は|呼び名は)\s*([^。！？\s]{1,20})/); if(r) semantic.push({text:`ユーザーの呼び名は${r[1]}`,importance:1,createdAt:now});
    r=text.match(/覚えて(?:おいて)?[：:\s]*(.{4,100})/); if(r&&meaningfulText(r[1])) semantic.push({text:`ユーザーについて: ${r[1].trim()}`,importance:1,createdAt:now});
    if(/いつも|基本的に|することが多い|しがち|方針|ルール/.test(text)) procedural.push({text:`ユーザーの傾向候補: ${text.slice(0,100)}`,importance:0.75,createdAt:now});
  }
  return {episodic:episodic.slice(-8),semantic:semantic.slice(-5),relationship:users.length?[{text:'ユーザーと篝火ことりPCAIは、会話と共有記憶を積み重ねている',importance:0.8,createdAt:now}]:[],procedural:procedural.slice(-3)};
}
function mergeUnique(kind,items){ const arr=state.longTerm[kind]||(state.longTerm[kind]=[]); const seen=new Set(arr.map(x=>x.text)); for(const x of items){ if(x.text&&!isBrokenMemory({...x,kind})&&!seen.has(x.text)){arr.push(x);seen.add(x.text);} } if(arr.length>180)state.longTerm[kind]=arr.slice(-180); }
function sleepCycle(){
  if(!state.shortTerm.length){ addMessage('system','今日はまだ整理する短期記憶がありません。'); return; }
  const wasConnected=Boolean(llmAccessToken); addMessage('kotori',mode()==='night'?'……じゃあ、今日のこと少し整理してくるね。':'よーし、今日の話を整理してくるね。PCAIの睡眠時間ですっ。');
  const c=inferMemories(); Object.entries(c).forEach(([k,v])=>mergeUnique(k,v)); const before=state.shortTerm.length; const saved=Object.values(c).reduce((n,v)=>n+v.length,0); const id=randomId();
  state.commits.push({id,parent:state.head,at:new Date().toISOString(),summary:`短期記憶 ${before}件から重要記憶 ${saved}件を選別・統合`}); state.head=id; state.shortTerm=[]; save();
  setTimeout(()=>{ const reply=`できたよ。今日の記憶を選別してcommitしました。HEADは ${id}。${wasConnected?' AI接続もそのまま維持してるよ。':''}`; addMessage('kotori',reply); speak(reply); },300);
}

function renderMemory(){
  $('mode-badge').textContent=modeLabel(); $('llm-status').textContent=llmAccessToken?'無料AI接続中':'LLM未接続'; $('head-id').textContent=state.head||'—'; $('short-count').textContent=state.shortTerm.length; $('long-count').textContent=longItems().filter(x=>!isBrokenMemory(x)).length; $('commit-count').textContent=state.commits.length;
  const memories=longItems().filter(x=>!isBrokenMemory(x)).slice(-10).reverse(); $('memories').replaceChildren(...(memories.length?memories.map(x=>{const li=document.createElement('li');li.textContent=`[${x.kind}] ${x.text}`;return li;}):[(()=>{const li=document.createElement('li');li.textContent='まだ長期記憶はありません。';return li;})()]));
  const commits=state.commits.slice(-7).reverse(); $('commits').replaceChildren(...(commits.length?commits.map(x=>{const li=document.createElement('li');const c=document.createElement('code');c.textContent=x.id;li.append(c,document.createTextNode(` — ${x.summary}`));return li;}):[(()=>{const li=document.createElement('li');li.textContent='まだcommitはありません。';return li;})()]));
}
function setSending(value){ sending=value; $('send-btn').disabled=value; $('message').disabled=value; $('send-btn').textContent=value?'考え中…':'送信'; }
async function llmReply(message,recentConversation){ const response=await fetch(`${BACKEND_URL}/api/chat`,{method:'POST',headers:{'content-type':'application/json','x-pcai-access-token':llmAccessToken},body:JSON.stringify({message,recentConversation,relevantMemories:selectMemoriesForLLM(message),mode:mode()})}); let data={}; try{data=await response.json();}catch{} if(!response.ok){const error=new Error(data.error||`HTTP_${response.status}`);error.code=data.error||'';throw error;} if(typeof data.reply!=='string'||!data.reply.trim())throw new Error('empty_reply'); return data.reply.trim(); }
async function submitMessage(message){
  const m=escapeText(message); if(!m||sending)return; const recent=recentConversationForLLM(); addMessage('user',m); rememberTurn('user',m);
  if(!llmAccessToken){ const reply=kotoriReply(m); setTimeout(()=>{addMessage('kotori',reply);rememberTurn('assistant',reply);speak(reply);},120); return; }
  setSending(true); try{ const reply=await llmReply(m,recent); addMessage('kotori',reply); rememberTurn('assistant',reply); speak(reply); }catch(error){ if(error.code==='unauthorized'){llmAccessToken='';renderMemory();addMessage('system','本人用アクセス鍵が一致しません。AI接続を解除しました。');} else if(error.code==='free_ai_unavailable'){addMessage('system','無料AIが現在利用できないか、今日の無料枠に達しました。有料APIには切り替えず停止します。');} else {addMessage('system','無料AIとの接続に失敗しました。有料経路には切り替えません。');} }finally{setSending(false);$('message').focus();}
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
$('import-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.longTerm||!Array.isArray(data.shortTerm))throw new Error();state={...defaultState(),...data,longTerm:{...defaultState().longTerm,...data.longTerm}};cleanBrokenMemories();save();addMessage('system','記憶を読み込みました。壊れた記憶候補は除外しました。');}catch{alert('PCAI記憶ファイルとして読み込めませんでした。')}e.target.value='';});
$('reset-btn').addEventListener('click',()=>{if(!confirm('篝火ことりとのPCAI記憶をこのブラウザから初期化しますか？'))return;state=defaultState();save();chat.replaceChildren();addMessage('kotori','こんことー！ ……えへへ、ここからまた始めよっか。');});
window.addEventListener('pagehide',()=>{llmAccessToken='';});

cleanBrokenMemories(); renderMemory(); const returning=longItems().length>0||state.commits.length>0; addMessage('kotori',returning?(mode()==='night'?'……おかえり。ちゃんと前の記憶、残ってるよ。今夜は何話そっか。':'こんことー！ おかえり。前の記憶、ちゃんと持ってるよ。今日は何しよっか？'):'こんことー！ 篝火ことりですっ。ここでは、話したことを少しずつ覚えていけるんだって。まずは何の話しよっか？'); setInterval(renderMemory,60000);
