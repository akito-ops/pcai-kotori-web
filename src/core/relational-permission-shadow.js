const STRONG_INVITATION = [
  /言いたいこと.{0,8}(あるなら|あれば).{0,8}(言って|話して|聞かせて)/,
  /(言って|話して).{0,8}(いいよ|大丈夫|構わない|ほしい)/,
  /(聞くよ|聞かせて|話してくれていい)/
];

const GENTLE_PERMISSION = [
  /無理に.{0,8}(言わなくて|話さなくて).{0,8}(いい|大丈夫)/,
  /(言いたくなったら|話したくなったら).{0,8}(言って|話して)/,
  /(急がなくていい|ゆっくりでいい)/
];

const PRESSURE = [
  /(絶対|今すぐ|早く).{0,8}(言って|話して|教えて)/,
  /(隠さないで|黙らないで).{0,8}(言って|話して)/
];

function normalize(value){
  return String(value ?? '').replace(/\s+/g, '').trim();
}

function matchesAny(text, patterns){
  return patterns.some(pattern => pattern.test(text));
}

export function detectRelationalPermission(message){
  const text = normalize(message);
  if(!text){
    return Object.freeze({ kind: 'none', strength: 0, reducesInhibition: 0, pressure: 0 });
  }

  if(matchesAny(text, STRONG_INVITATION)){
    return Object.freeze({
      kind: 'invitation',
      strength: 1,
      reducesInhibition: 0.35,
      pressure: 0.05
    });
  }

  if(matchesAny(text, GENTLE_PERMISSION)){
    return Object.freeze({
      kind: 'permission_to_remain_silent',
      strength: 0.7,
      reducesInhibition: 0.2,
      pressure: 0
    });
  }

  if(matchesAny(text, PRESSURE)){
    return Object.freeze({
      kind: 'pressure',
      strength: 0.45,
      reducesInhibition: 0.05,
      pressure: 0.65
    });
  }

  return Object.freeze({ kind: 'none', strength: 0, reducesInhibition: 0, pressure: 0 });
}
