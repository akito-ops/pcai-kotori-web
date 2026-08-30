const MAX_GUEST_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const params = new URLSearchParams(location.search);
const expiresRaw = params.get('expires');
const expiresAt = expiresRaw ? Date.parse(expiresRaw) : NaN;
const now = Date.now();
const validExpiry = Number.isFinite(expiresAt)
  && expiresAt > now
  && expiresAt - now <= MAX_GUEST_MS + CLOCK_SKEW_MS;

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

function disableGuest(reason) {
  status.textContent = reason === 'expired' ? '見学期限切れ' : '見学リンク無効';
  note.textContent = reason === 'expired'
    ? 'この見学リンクは有効期限が切れています。'
    : 'この見学リンクは無効です。秘書アプリから新しいリンクを発行してください。';
  input.disabled = true;
  send.disabled = true;
  document.querySelectorAll('[data-prompt]').forEach(button => { button.disabled = true; });
}

function isActive() {
  if (!validExpiry) return false;
  if (Date.now() >= expiresAt) {
    disableGuest('expired');
    return false;
  }
  return true;
}

function submit(text) {
  if (!isActive() || !text.trim()) return;
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

if (!Number.isFinite(expiresAt) || expiresAt - now > MAX_GUEST_MS + CLOCK_SKEW_MS) {
  disableGuest('invalid');
} else if (expiresAt <= now) {
  disableGuest('expired');
} else {
  add('assistant', 'こんことー！ 篝火ことりです。これは見学用の一時セッションだよ。気軽に話しかけてみてね。');
  window.setTimeout(() => disableGuest('expired'), Math.max(0, expiresAt - Date.now()));
}
