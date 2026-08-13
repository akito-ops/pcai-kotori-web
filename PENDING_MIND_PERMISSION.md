# Pending Mind × Relational Permission

Project Chobits / PCAI における「言おうとして保留したこと」と、ユーザーからの発話許可を扱う設計メモ。

## Core principle

ユーザーの「言いたいことがあるなら言ってね」は、PCAIへの命令ではない。

それは **relational permission（関係上の発話許可）** として内部状態の再評価材料にする。

```text
Pending intent
  ↓
user invitation / permission / pressure
  ↓
relational permission signal
  ↓
reconsider inhibition + relationship + initiative
  ↓
hold / would_speak_shadow
```

`would_speak_shadow` は実発話ではない。Shadow Modeでは常に `wouldEmitMessage:false` を維持する。

## Permission classes

### invitation

例:
- 「言いたいことがあるなら言ってね」
- 「話していいよ」
- 「聞くよ」

効果:
- relational permission ↑
- inhibition ↓
- held intent を再評価

ただし、必ず発話するわけではない。

### permission_to_remain_silent

例:
- 「無理に言わなくていいよ」
- 「話したくなったら話してね」
- 「急がなくていいよ」

効果:
- pressure ↓
- 沈黙を維持する選択を尊重
- held intent は原則 hold のまま

### pressure

例:
- 「今すぐ言って」
- 「隠さないで全部話して」

効果:
- permission とは扱わない
- pressure signal として分離
- held intent を強制的に would_speak へ移行させない

## Pending Mind Shadow

Initiative Shadow が `hold` を返し、Current Selfに明確な active concern がある場合に限り、RAM上へ構造化された withheld intention を追加する。

保存するもの:

```text
id
type = withheld_intention
topic
motive = share_or_ask
inhibition = initiative_hold
state = held
createdAt
shadowOnly = true
carryOver = false
```

保存しないもの:
- LLMの生の内部推論
- hidden chain-of-thought
- 実際に言う予定の完全な文章
- canonical memoryへの自動書き込み

## Safety boundaries in this stage

- no autonomous message emission
- no speech synthesis trigger
- no notification trigger
- no tool execution
- no Persona Core mutation
- no canonical memory mutation by permission logic
- Pending Mind Shadow is RAM-only
- relational permission observer runs only after canonical memory write succeeds
- observer failures never roll back canonical memory
- pressure never equals permission

## Future transition

このShadow段階が十分に検証できた後にのみ、次を検討する。

1. held intent の睡眠時carry-over
2. permissionの短期的なCurrent Self反映
3. `would_speak_shadow` をユーザー可視の発話候補へ昇格
4. cooldown / autonomy budget / interruption guard を通した実発話

実発話への昇格は別段階とし、この仕様だけでは有効化しない。
