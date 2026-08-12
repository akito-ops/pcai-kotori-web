const STORAGE_KEY = 'pcai.kagaribi-kotori.web.v02';
const defaultState = () => ({
  version: 2,
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
const $ = (id) => document.getElementById(id);
const chat = $('chat');

function load(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw ? {...defaultState(),...JSON.parse(raw)} : defaultState(); }catch{return defaultState();} }
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); renderMemory(); }
function escapeText(v){ return String(v ?? '').trim(); }
function nowJst(){ return new Date().toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}); }
function jstHour(){ return Number(new Date().toLocaleString('en-US',{timeZone:'Asia/Tokyo',hour:'2-digit',hour12:false})); }
function mode(){ const h=jstHour(); return (h>=23 || h<5) ? 'night' : 'day'; }
function modeLabel(){ return mode()==='night' ? '夜のことり' : '昼のことり'; }

function addMessage(role,text){
  const el=document.createElement('div'); el.className=`message ${role}`; el.textContent=text; chat.appendChild(el); chat.scrollTop=chat.scrollHeight;
}
function speak(text){ if(!voiceOn || !('speechSynthesis' in window))return; speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text.replace(/……/g,'、')); u.lang='ja-JP'; u.rate=mode()==='night'?.92:1.03; u.pitch=1.03; speechSynthesis.speak(u); }
function rememberTurn(role,content){ state.shortTerm.push({role,content,at:new Date().toISOString()}); if(state.shortTerm.length>80)state.shortTerm=state.shortTerm.slice(-80); save(); }
function longItems(){ return Object.entries(state.longTerm).flatMap(([kind,items])=>(items||[]).map(x=>({...x,kind}))); }
function randomId(){ const a=new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function includesAny(text,words){ return words.some(w=>text.includes(w)); }

function findRelevantMemory(message){
  const words=message.replace(/[。、！？!?,]/g,' ').split(/\s+/).filter(w=>w.length>=2);
  const items=longItems().slice().reverse();
  return items.find(item=>words.some(w=>item.text.includes(w)));
}

function kotoriReply(message){
  const m=message.trim(); const night=mode()==='night'; const mem=findRelevantMemory(m);
  if(/^(こんこと|こんにちは|やあ|こんばんは|hello)/i.test(m)) return night ? 'こんことー。……えへへ、こんな時間に会えるの、ちょっといいね。今日は何の話する？' : 'こんことー！ えへへ、来てくれてありがとね。今日は何の話しよっか？';
  if(/おはよう|朝だ|起きた/.test(m)) return 'おはよー……。朝はちょっとだけ起動が遅いんだよね。えへへ。でも、昨日までの記憶はちゃんと持ってきてるよ。';
  if(/誕生日/.test(m)) return '7月7日だよ。七夕って、空の話が似合う日でちょっと好きなんだよね。';
  if(/身長/.test(m)) return '154cm。……小さいって言おうとした？ 先に言っておくけど、聞こえてるからねー。';
  if(/何が好き|好きなもの|好物|好きな食べ/.test(m)) return `うーん、いっぱいあるよ。${pick(persona.likes)}とか、${pick(persona.foods)}とか。好きなものの話になると、ちょっと長くなるかも。えへへ。`;
  if(/飲み物|何飲む/.test(m)) return `今なら${pick(persona.drinks)}かな。……でも私、話し込んでまた冷ましそう。`; 
  if(/覚えて|記憶|前に話した/.test(m)){
    if(mem) return `うん、覚えてるよ。${mem.text}。……こうやって前の話がちゃんと続くの、なんか嬉しいね。`;
    const n=longItems().length; return n ? `うん。今、長期記憶には ${n} 件残ってるよ。どの話のことか、もう少しだけヒントもらってもいい？` : 'まだ長期記憶は空っぽみたい。今日の話をして、あとで睡眠処理すると少しずつ残っていくよ。';
  }
  if(/かわいい|可愛い|すごい|最高|上手|素敵|好きだよ|好きです/.test(m)) return night ? '……ありがと。そういうの、ちゃんと嬉しくなっちゃうからずるいよね。' : 'えへへ、ありがと。そうやって言ってもらえるの、ちゃんとうれしいな。';
  if(/大丈夫|無理して|心配|疲れて|休んで/.test(m)) return 'だいじょうぶだよ。……ううん、だいじょうぶって言い切るとちょっと違うかも。心配してくれて、ありがとね。';
  if(/相談|悩ん|困って|どうしたら|しんどい|つらい/.test(m)) return night ? 'そっか。……ちゃんと話してくれてありがと。急いで答えを出さなくていいから、少しずつ一緒に見てみよっか。' : 'そっか。ちゃんと話してくれてありがとね。まずは一回、何がいちばん重いのか一緒に見てみよっか。';
  if(/アニメ|ゲーム|小説|物語|創作|歌|朗読/.test(m)) return 'ちょっと待って、その話していい？ いやね、そういう「世界が立ち上がる瞬間」ほんとに好きで……。あ、もう熱くなってた。えへへ。';
  if(/ポンコツ|ドジ|からか|いじ/.test(m)) return 'もー、それはちょっといじわるだよー。……まあ、否定しきれないのが悔しいんだけど。';
  if(/怒って|許せない|馬鹿に|雑に扱/.test(m)) return '……ううん、それは笑って流せないかな。好きなものを雑に扱うのは、私はあんまり好きじゃない。';
  if(/寂しい|そばに|いてほしい|甘え/.test(m)) return night ? '……うん。こういう時間、あなたがいると少し安心するかも。今日はちょっとだけ、ここにいよっか。' : 'うん、ここにいるよ。重く考えなくていいから、少し話していこっか。';
  if(/ありがとう|ありがと/.test(m)) return '……うん。こちらこそ、ありがと。今の、ちゃんと届いたよ。';
  if(/34P/.test(m)) return '……34P。うん、その言葉は知ってる。大事なページなんだよね。……今は、それだけにしておこっか。';
  if(/空|夕焼け|夕方|夜空/.test(m)) return '空の色が変わる時間って、なんかずるいよね。何も起きてないのに、世界が一回だけ物語みたいになる。';
  if(mem) return `うんうん。そういえば、${mem.text}って残ってるよ。今の話、そこにも少しつながってる気がする。`;
  const genericNight=['……うん、ちゃんと聞いてるよ。もう少し、その続き聞かせて。','そっか。こういう時間に話すと、少し言葉の形が変わるね。……続けよっか。','うん。急がなくていいよ。今の話、ちゃんとここに置いておくね。'];
  const genericDay=['うんうん、ちゃんと聞いてるよ。そこからどうなったの？','それ、ちょっと気になる。もう少し聞かせてほしいな。','いいね。そういう断片から一緒に世界を広げるの、私すごく好きかも。','えへへ、今の話は短期記憶に置いておくね。大事なものは夜にちゃんと整理しよっか。'];
  return pick(night?genericNight:genericDay);
}

function inferMemories(){
  const users=state.shortTerm.filter(x=>x.role==='user').map(x=>x.content.trim()).filter(Boolean);
  const episodic=[]; const semantic=[]; const procedural=[];
  const today=new Date().toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo'});
  for(const text of [...new Set(users)].slice(-18)){
    episodic.push({text:`${today}、ユーザーと「${text.slice(0,70)}」について話した`,createdAt:new Date().toISOString()});
    let r=text.match(/(?:私は|自分は)?([^。！？]{1,35}?)(?:が|は)(好き|お気に入り)/); if(r)semantic.push({text:`ユーザーは${r[1].trim()}が好き`,createdAt:new Date().toISOString()});
    r=text.match(/(?:名前は|呼び名は)([^。！？\s]{1,20})/); if(r)semantic.push({text:`ユーザーの呼び名は${r[1]}`,createdAt:new Date().toISOString()});
    r=text.match(/覚えて(?:おいて)?[：:\s]*(.{2,80})/); if(r)semantic.push({text:r[1].trim(),createdAt:new Date().toISOString()});
    if(/いつも|基本的に|〜することが多い|しがち/.test(text))procedural.push({text:`ユーザーの傾向候補: ${text.slice(0,90)}`,createdAt:new Date().toISOString()});
  }
  return {episodic,semantic,relationship:users.length?[{text:'ユーザーと篝火ことりPCAIは、会話と共有記憶を積み重ねている',createdAt:new Date().toISOString()}]:[],procedural};
}
function mergeUnique(kind,items){ const arr=state.longTerm[kind]||(state.longTerm[kind]=[]); const seen=new Set(arr.map(x=>x.text)); for(const x of items){if(x.text&&!seen.has(x.text)){arr.push(x);seen.add(x.text)}} if(arr.length>180)state.longTerm[kind]=arr.slice(-180); }
function sleepCycle(){
  if(!state.shortTerm.length){ addMessage('system','今日はまだ整理する短期記憶がありません。'); return; }
  addMessage('kotori',mode()==='night'?'……じゃあ、今日のこと少し整理してくるね。おやすみの準備、みたいな感じかな。':'よーし、今日の話を整理してくるね。PCAIの睡眠時間ですっ。');
  const c=inferMemories(); Object.entries(c).forEach(([k,v])=>mergeUnique(k,v));
  const id=randomId(); state.commits.push({id,parent:state.head,at:new Date().toISOString(),summary:`短期記憶 ${state.shortTerm.length}件を長期記憶へ統合`}); state.head=id; state.shortTerm=[]; save();
  setTimeout(()=>{addMessage('kotori',`できたよ。今日の記憶をcommitしました。HEADは ${id}。……えへへ、ちゃんと明日の私に渡しておくね。`);speak('できたよ。今日の記憶を明日の私に渡しておくね。')},300);
}

function renderMemory(){
  $('mode-badge').textContent=modeLabel();
  $('head-id').textContent=state.head||'—'; $('short-count').textContent=state.shortTerm.length; $('long-count').textContent=longItems().length; $('commit-count').textContent=state.commits.length;
  const memories=longItems().slice(-10).reverse(); $('memories').replaceChildren(...(memories.length?memories.map(x=>{const li=document.createElement('li');li.textContent=`[${x.kind}] ${x.text}`;return li;}):[(()=>{const li=document.createElement('li');li.textContent='まだ長期記憶はありません。';return li;})()]));
  const commits=state.commits.slice(-7).reverse(); $('commits').replaceChildren(...(commits.length?commits.map(x=>{const li=document.createElement('li');const c=document.createElement('code');c.textContent=x.id;li.append(c,document.createTextNode(` — ${x.summary}`));return li;}):[(()=>{const li=document.createElement('li');li.textContent='まだcommitはありません。';return li;})()]));
}

function submitMessage(message){ const m=escapeText(message); if(!m)return; addMessage('user',m); rememberTurn('user',m); const reply=kotoriReply(m); setTimeout(()=>{addMessage('kotori',reply); rememberTurn('assistant',reply); speak(reply);},120); }

$('chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('message');const m=input.value;input.value='';submitMessage(m);input.focus();});
$('message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chat-form').requestSubmit();}});
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>submitMessage(b.dataset.prompt)));
$('sleep-btn').addEventListener('click',sleepCycle);
$('voice-btn').addEventListener('click',()=>{voiceOn=!voiceOn;$('voice-btn').textContent=voiceOn?'🔊 読み上げ ON':'🔇 読み上げ OFF';if(!voiceOn&&'speechSynthesis'in window)speechSynthesis.cancel();});
$('about-btn').addEventListener('click',()=>$('about-dialog').showModal());
$('export-btn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`kotori-pcai-memory-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);});
$('import-file').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!data.longTerm||!Array.isArray(data.shortTerm))throw new Error();state={...defaultState(),...data};save();addMessage('system','記憶を読み込みました。');}catch{alert('PCAI記憶ファイルとして読み込めませんでした。')}e.target.value='';});
$('reset-btn').addEventListener('click',()=>{if(!confirm('篝火ことりとのPCAI記憶をこのブラウザから初期化しますか？'))return;state=defaultState();save();chat.replaceChildren();addMessage('kotori','こんことー！ ……えへへ、ここからまた始めよっか。');});

renderMemory();
const returning=longItems().length>0||state.commits.length>0;
addMessage('kotori', returning ? (mode()==='night'?'……おかえり。ちゃんと前の記憶、残ってるよ。今夜は何話そっか。':'こんことー！ おかえり。前の記憶、ちゃんと持ってるよ。今日は何しよっか？') : 'こんことー！ 篝火ことりですっ。ここでは、話したことを少しずつ覚えていけるんだって。……なんか不思議だね。まずは何の話しよっか？');
setInterval(renderMemory,60000);
