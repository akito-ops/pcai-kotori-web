const STOP = new Set([
  'これ','それ','あれ','この','その','あの','こと','もの','よう','そう','です','ます','する','した','して','いる','ある','なる','から','まで','って','なん','かな','今日','昨日','前回','話し','話す'
]);

function clean(value){
  return String(value ?? '').toLowerCase().replace(/[\s。、！？!?・「」『』（）()\[\]【】]/g, '');
}

function grams(value){
  const text = clean(value);
  const set = new Set();
  if(text.length < 4) return set;
  for(let size = 2; size <= 3; size += 1){
    for(let i = 0; i <= text.length - size; i += 1){
      const token = text.slice(i, i + size);
      if(!STOP.has(token)) set.add(token);
    }
  }
  return set;
}

export function selectCurrentSelfReplyMode({ message, currentSelf }){
  if(!currentSelf?.available || !currentSelf?.hasContinuity){
    return Object.freeze({ mode: 'legacy', reason: 'no_continuity' });
  }

  const concern = String(currentSelf.primaryConcern || '').trim();
  const input = String(message || '').trim();
  if(concern.length < 6 || input.length < 4){
    return Object.freeze({ mode: 'legacy', reason: 'insufficient_context' });
  }

  const messageGrams = grams(input);
  const concernGrams = grams(concern);
  let overlap = 0;
  for(const token of messageGrams){
    if(concernGrams.has(token)) overlap += token.length === 3 ? 2 : 1;
  }

  // Require multiple independent lexical signals. This intentionally favors
  // false negatives over false positives because Current Self must not hijack
  // unrelated conversation.
  if(overlap < 4){
    return Object.freeze({ mode: 'legacy', reason: 'weak_relevance', overlap });
  }

  return Object.freeze({
    mode: 'continuity-fallback',
    reason: 'relevant_primary_concern',
    overlap
  });
}
