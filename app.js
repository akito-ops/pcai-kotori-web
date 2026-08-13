const $ = (id) =>
  document.getElementById(id);

const chat = $('chat');
const avatar = $('avatar');

let state = null;
let speakEnabled = true;
let kotoriVoice = null;

/*
 * Browser TTS voice selection
 *
 * UIには声選択を出さない。
 * 利用可能な日本語音声の中から、
 * ことり向けの候補を一つだけ自動選択する。
 *
 * 端末に候補が存在しない場合は、
 * 日本語の既定音声へ安全にフォールバックする。
 */

function voiceScore(
  voice
) {
  const name =
    String(
      voice?.name || ''
    );

  const lang =
    String(
      voice?.lang || ''
    );

  let score = 0;

  /*
   * ことり向け優先候補。
   *
   * 名前は端末・OSによって異なるため、
   * 存在するものだけが評価される。
   */
  if (
    /nanami/i.test(name)
  ) {
    score += 100;
  }

  if (
    /kyoko/i.test(name)
  ) {
    score += 95;
  }

  if (
    /haruka/i.test(name)
  ) {
    score += 90;
  }

  if (
    /sayaka/i.test(name)
  ) {
    score += 85;
  }

  if (
    /google.*日本語/i.test(name) ||
    /google.*japanese/i.test(name)
  ) {
    score += 75;
  }

  /*
   * Natural / Enhanced系がある場合は
   * 少し優先する。
   */
  if (
    /natural/i.test(name)
  ) {
    score += 20;
  }

  if (
    /enhanced|premium/i.test(
      name
    )
  ) {
    score += 15;
  }

  /*
   * 日本語（日本）を優先。
   */
  if (
    /^ja[-_]JP$/i.test(
      lang
    )
  ) {
    score += 10;
  } else if (
    /^ja/i.test(lang)
  ) {
    score += 5;
  }

  /*
   * ブラウザがdefault指定している声も
   * 最後の安定性評価として少し加点。
   */
  if (
    voice?.default
  ) {
    score += 2;
  }

  return score;
}

function refreshKotoriVoice() {
  if (
    !(
      'speechSynthesis' in
      window
    )
  ) {
    kotoriVoice = null;
    return null;
  }

  const voices =
    speechSynthesis
      .getVoices();

  const japaneseVoices =
    voices.filter(
      (voice) =>
        /^ja/i.test(
          String(
            voice.lang ||
            ''
          )
        )
    );

  if (
    !japaneseVoices.length
  ) {
    kotoriVoice = null;
    return null;
  }

  const ranked =
    [...japaneseVoices]
      .sort(
        (a, b) =>
          voiceScore(b) -
          voiceScore(a)
      );

  kotoriVoice =
    ranked[0] ||
    null;

  if (
    kotoriVoice
  ) {
    console.info(
      `[PCAI Voice] Kotori: ${kotoriVoice.name} (${kotoriVoice.lang})`
    );
  }

  return kotoriVoice;
}

async function prepareKotoriVoice() {
  if (
    !(
      'speechSynthesis' in
      window
    )
  ) {
    return null;
  }

  /*
   * Chromium系では初回getVoices()が
   * 空配列になることがあるため、
   * 短時間だけVoice一覧を待つ。
   */
  for (
    let i = 0;
    i < 6;
    i++
  ) {
    const voice =
      refreshKotoriVoice();

    if (voice) {
      return voice;
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          100
        )
    );
  }

  return refreshKotoriVoice();
}

if (
  'speechSynthesis' in
  window
) {
  speechSynthesis.addEventListener(
    'voiceschanged',
    () => {
      refreshKotoriVoice();
    }
  );
}

function addMessage(
  role,
  text,
  extraClass = ''
) {
  const div =
    document.createElement(
      'div'
    );

  div.className =
    `message ${role} ${extraClass}`.trim();

  div.textContent =
    text;

  chat.appendChild(
    div
  );

  chat.scrollTop =
    chat.scrollHeight;

  $('caption').textContent =
    text;
}

function speakText(
  text
) {
  if (
    !speakEnabled ||
    !(
      'speechSynthesis' in
      window
    )
  ) {
    return;
  }

  speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      text
    );

  const voice =
    kotoriVoice ||
    refreshKotoriVoice();

  if (voice) {
    utterance.voice =
      voice;

    utterance.lang =
      voice.lang ||
      'ja-JP';
  } else {
    utterance.lang =
      'ja-JP';
  }

  /*
   * ことり基本音声。
   *
   * 高くしすぎると幼く機械的になるため、
   * 現段階では小さな補正だけに留める。
   *
   * Daily Toneをpitch/rateへ
   * 直接結び付けない。
   */
  utterance.rate =
    1.01;

  utterance.pitch =
    1.08;

  utterance.volume =
    1;

  utterance.onstart =
    () => {
      avatar.classList.add(
        'speaking'
      );
    };

  utterance.onend =
    () => {
      avatar.classList.remove(
        'speaking'
      );
    };

  utterance.onerror =
    () => {
      avatar.classList.remove(
        'speaking'
      );
    };

  speechSynthesis.speak(
    utterance
  );
}

function coreText(
  core
) {
  return (
    core?.summary ||
    '—'
  );
}

function renderState(
  next
) {
  state = next;

  $('character-name')
    .textContent =
      next.persona?.name ||
      '篝火ことり';

  $('character-role')
    .textContent =
      next.persona?.role ||
      '';

  $('provider')
    .textContent =
      next.provider ||
      'PCAI';

  $('continuity-chip')
    .querySelector(
      'small'
    )
    .textContent =
      coreText(
        next.threeCores
          ?.continuity
      );

  $('initiative-chip')
    .querySelector(
      'small'
    )
    .textContent =
      coreText(
        next.threeCores
          ?.initiative
      );

  $('growth-chip')
    .querySelector(
      'small'
    )
    .textContent =
      coreText(
        next.threeCores
          ?.sharedGrowth
      );

  $('continuity-state')
    .textContent =
      next.runtime
        ?.lineage
        ?.sense ||
      '—';

  const reconstruction =
    next
      .reconstructionObservation
      ?.reconstruction;

  $('recall-state')
    .textContent =
      reconstruction
        ?.candidate
        ? `${reconstruction.status} / ${reconstruction.candidate.confidence}`
        : reconstruction
            ?.status ||
          'direct only';

  const relation =
    next.relationship ||
    {};

  const address =
    relation.addressLabel
      ? ` / ${relation.addressLabel}`
      : '';

  $('growth-state')
    .textContent =
      `${relation.stage || '—'}${address} / ${relation.speechStyle || '—'} / growth shadow`;

  $('memory-state')
    .textContent =
      `${next.memorySummary?.longTerm || 0} long / ${next.memorySummary?.shortTerm || 0} short`;

  const blocked =
    next
      .memoryPolicyAudit
      ?.blockedCount ||
    0;

  $('safety-note')
    .textContent =
      `Memory Policy Gate: ${blocked} blocked. Relationship Progressionは明示許可付き、Shared GrowthはShadow、Initiativeはユーザー起動型。`;
}

async function loadState() {
  const res =
    await fetch(
      '/api/state',
      {
        cache:
          'no-store'
      }
    );

  const data =
    await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
      '状態を読み込めませんでした'
    );
  }

  renderState(
    data
  );
}

async function loadOpening() {
  const res =
    await fetch(
      '/api/opening',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json'
        }
      }
    );

  const data =
    await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
      '最初の挨拶を作れませんでした'
    );
  }

  return (
    data.opening?.text ||
    '今日は何の話する？'
  );
}

$('chat-form')
  .addEventListener(
    'submit',
    async (
      event
    ) => {
      event.preventDefault();

      const input =
        $('message');

      const message =
        input.value.trim();

      if (!message) {
        return;
      }

      input.value = '';

      addMessage(
        'user',
        message
      );

      const button =
        event.currentTarget
          .querySelector(
            '.send'
          );

      button.disabled =
        true;

      try {
        const res =
          await fetch(
            '/api/chat',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json'
              },

              body:
                JSON.stringify({
                  message
                })
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
            '送信に失敗しました'
          );
        }

        addMessage(
          'assistant',
          data.reply
        );

        speakText(
          data.reply
        );

        await loadState();
      } catch (
        error
      ) {
        addMessage(
          'assistant',
          `エラー: ${error.message}`
        );
      } finally {
        button.disabled =
          false;

        input.focus();
      }
    }
  );

$('initiative')
  .addEventListener(
    'click',
    async () => {
      const button =
        $('initiative');

      button.disabled =
        true;

      try {
        const res =
          await fetch(
            '/api/initiative',
            {
              cache:
                'no-store'
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
            '話題を考えられませんでした'
          );
        }

        const opening =
          data.opening;

        if (opening) {
          addMessage(
            'assistant',
            opening,
            'initiative'
          );

          speakText(
            opening
          );
        } else {
          addMessage(
            'assistant',
            '……今は、無理に話さなくてもいいかな。'
          );
        }
      } catch (
        error
      ) {
        addMessage(
          'assistant',
          `エラー: ${error.message}`
        );
      } finally {
        button.disabled =
          false;
      }
    }
  );

$('sleep')
  .addEventListener(
    'click',
    async () => {
      const button =
        $('sleep');

      button.disabled =
        true;

      try {
        const res =
          await fetch(
            '/api/sleep',
            {
              method:
                'POST'
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.error ||
            '睡眠処理に失敗しました'
          );
        }

        const text =
          data.commit
            ? '今日のこと、少し整理しておくね。おやすみ。'
            : '今日はまだ整理するほど溜まってないみたい。';

        addMessage(
          'assistant',
          text
        );

        speakText(
          text
        );

        await loadState();
      } catch (
        error
      ) {
        addMessage(
          'assistant',
          `エラー: ${error.message}`
        );
      } finally {
        button.disabled =
          false;
      }
    }
  );

$('speak-toggle')
  .addEventListener(
    'click',
    () => {
      speakEnabled =
        !speakEnabled;

      $('speak-toggle')
        .textContent =
          speakEnabled
            ? '🔊 声 ON'
            : '🔇 声 OFF';

      if (
        !speakEnabled &&
        'speechSynthesis' in
          window
      ) {
        speechSynthesis.cancel();
      }

      avatar.classList.remove(
        'speaking'
      );
    }
  );

/*
 * 初回発話前に、
 * 可能ならことり向け日本語Voiceを確定する。
 */
await prepareKotoriVoice();

await loadState();

try {
  const opening =
    await loadOpening();

  addMessage(
    'assistant',
    opening
  );

  speakText(
    opening
  );

  await loadState();
} catch (
  error
) {
  addMessage(
    'assistant',
    `エラー: ${error.message}`
  );
}
