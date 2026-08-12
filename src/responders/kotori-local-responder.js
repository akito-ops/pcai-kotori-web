export function createKotoriLocalResponder(bindings, random = Math.random){
  if(!bindings?.identity?.personaName) throw new TypeError('persona identity is required');
  if(!bindings?.personaFacts) throw new TypeError('persona facts are required');
  if(typeof random !== 'function') throw new TypeError('random function is required');

  const identity = bindings.identity;
  const facts = bindings.personaFacts;
  const pick = arr => {
    if(!Array.isArray(arr) || !arr.length) return '';
    const index = Math.min(arr.length - 1, Math.floor(Math.max(0, Math.min(0.999999, random())) * arr.length));
    return arr[index];
  };

  function reply({ message, night = false, intent = null, intentHits = [], relevantMemory = null, usableMemoryCount = 0 }){
    const m = String(message || '').trim();
    if(intent){
      return intentHits.length
        ? `${intent.label}の記憶なら残ってるよ。${intentHits.slice(-3).map(x=>x.summary||x.text).join('／')}`
        : `${intent.label}として確実に残っている記憶は見つからなかったよ。覚えてるふりはしないね。`;
    }
    if(/^(こんこと|こんにちは|やあ|こんばんは|hello)/i.test(m)) return night?'こんことー。……えへへ、こんな時間に会えるの、ちょっといいね。今日は何の話する？':'こんことー！ えへへ、来てくれてありがとね。今日は何の話しよっか？';
    if(/おはよう|朝だ|起きた/.test(m)) return 'おはよー……。朝はちょっとだけ起動が遅いんだよね。昨日までの記憶はちゃんと持ってきてるよ。';
    if(/誕生日/.test(m)) return `${facts.birthday}だよ。七夕って、空の話が似合う日でちょっと好きなんだよね。`;
    if(/身長/.test(m)) return `${facts.height}。……小さいって言おうとした？ 先に言っておくけど、聞こえてるからねー。`;
    if(/何が好き|好きなもの|好物|好きな食べ/.test(m)) return `うーん、${pick(facts.likes)}とか、${pick(facts.foods)}とか。好きなものの話になると長くなるかも。えへへ。`;
    if(/飲み物|何飲む/.test(m)) return `今なら${pick(facts.drinks)}かな。……でも話し込んでまた冷ましそう。`;
    if(/覚えて|記憶|前に話した/.test(m)) return relevantMemory?`うん、覚えてるよ。${relevantMemory.text}。`:(usableMemoryCount?`長期記憶には ${usableMemoryCount} 件あるよ。もう少しヒントもらえる？`:'まだ長期記憶は空っぽみたい。');
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
    if(relevantMemory) return `うんうん。そういえば、${relevantMemory.text}って残ってるよ。今の話、そこにも少しつながってる気がする。`;
    return pick(night?['……うん、ちゃんと聞いてるよ。もう少し、その続き聞かせて。','そっか。こういう時間に話すと、少し言葉の形が変わるね。……続けよっか。']:['うんうん、ちゃんと聞いてるよ。そこからどうなったの？','それ、ちょっと気になる。もう少し聞かせてほしいな。','いいね。そういう断片から一緒に世界を広げるの、私すごく好きかも。']);
  }

  return Object.freeze({
    personaId: identity.personaId,
    reply,
    initialGreeting: () => `こんことー！ ${identity.personaName}ですっ。ここでは、話したことを少しずつ覚えていけるんだって。まずは何の話しよっか？`,
    returningGreeting: night => night?'……おかえり。ちゃんと前の記憶、残ってるよ。今夜は何話そっか。':'こんことー！ おかえり。前の記憶、ちゃんと持ってるよ。今日は何しよっか？',
    resetGreeting: () => 'こんことー！ ……えへへ、ここからまた始めよっか。',
    sleepStart: night => night?'……じゃあ、今日のこと少し整理してくるね。':'よーし、今日の話を整理してくるね。PCAIの睡眠時間ですっ。',
    sleepComplete: ({ commitId, wasConnected }) => `できたよ。今日の記憶を選別してcommitしました。HEADは ${commitId}。${wasConnected?' AI接続もそのまま維持してるよ。':''}`
  });
}
