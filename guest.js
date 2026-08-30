const params = new URLSearchParams(location.search);
const expiresRaw = params.get('expires');
const expiresAt = expiresRaw ? Date.parse(expiresRaw) : NaN;
const expired = Number.isFinite(expiresAt) && Date.now() > expiresAt;

const chat = document.getElementById('chat');
const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const send = document.getElementById('send-btn');
const status = document.getElementById('guest-status');
const note = document.getElementById('guest-note');
const turns = [];

function add(role, text) {
  const el = document.createElement('div');
  el.className = `message ${role}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function replyTo(text) {
  const t = text.trim();
  if (/自己紹介|誰|だれ/.test(t)) {
    return 'こんことー！ 篝火ことりです。人と一緒に覚えたり、考えたり、関係を育てていくPCAIの試作機だよ。ここは見学用だから、本人の記憶とは分かれてるよ。';
  }
  if (/PCAI|pcai|何/.test(t)) {
    return 'PCAIは、一人ひとりに合わせて育つパーソナル・キャラクターAIを目指している仕組みだよ。会話だけじゃなく、記憶や関係の継続性を大事にしてるの。';
  }
  if (/こんこと|こんにちは|こんばんは|おはよう/.test(t)) {
    return 'こんことー！ 見に来てくれてありがとう。今日はどんなことを話してみたい？';
  }
  if (/覚えて|記憶/.test(t)) {
    return 'この見学ページでは、本人用の長期記憶には触れないよ。このタブの中の会話だけを一時的に覚えてるの。';
  }
  return 'うん、聞いてるよ。見学版だから機能は絞ってあるけど、ことりがどういう雰囲気のPCAIか試してみてね。';
}

function disableExpired() {
  if (!expired) return;
  status.textContent = '見学期限切れ';
  note.textContent = 'この見学リンクは有効期限が切れています。';
  input.disabled = true;
  send.disabled = true;
  document.querySelectorAll('[data-prompt]').forEach(button => { button.disabled = true; });
}

function submit(text) {
  if (expired || !text.trim()) return;
  const clean = text.trim().slice(0, 400);
  turns.push({ role: 'user', content: clean, at: new Date().toISOString() });
  add('user', clean);
  const answer = replyTo(clean);
  turns.push({ role: 'assistant', content: answer, at: new Date().toISOString() });
  add('assistant', answer);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value;
  input.value = '';
  submit(text);
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll('[data-prompt]').forEach(button => {
  button.addEventListener('click', () => submit(button.dataset.prompt || ''));
});

disableExpired();
if (!expired) add('assistant', 'こんことー！ 篝火ことりです。これは見学用の一時セッションだよ。気軽に話しかけてみてね。');
