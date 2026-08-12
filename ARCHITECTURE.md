# PCAI modular architecture

## Goal

PCAIを特定のキャラクター・用途・LLM製品に固定しない。キャラクターの人格・記憶・関係史を中心資産として保ち、用途とAIモデルを交換可能な部品として扱う。

## Dependency direction

```text
Persona profile ─┐
Use-case profile ├─> Runtime Profile ─> PCAI Core ─> UI / Voice / Avatar / Tools
Model adapter ───┘
                         │
                         └─> Character Memory
```

依存方向は一方向にする。Persona は Model を知らず、Model は Persona を知らない。

## Layers

### 1. Persona

`src/config/personas/`

名前、表示、固定プロフィール、声の基本値、人格保護境界を持つ。LLM名やAPI URLは持たない。

### 2. Use case

`src/config/usecases/`

雑談、秘書、学習、創作支援などの目的と、許可する能力・記憶方針・安全方針を持つ。人格そのものは変更しない。

### 3. Model adapter

`src/config/models/`

AIサービスへの接続方法だけを持つ。キャラクター名・人格・関係史・長期記憶を所有しない。

### 4. Runtime Profile

`src/core/runtime-profile.js`

Persona + Use case + Model を検証して結合する。組合せを変更しても、キャラクターの記憶namespaceはPersona IDを基準に維持する。

## Safety invariants

1. **人格とモデルを分離する** — LLMを交換しても同じキャラクターとして継続できる。
2. **記憶とモデルを分離する** — Model IDを記憶namespaceに含めない。
3. **キャラクター間で記憶を混ぜない** — Persona IDごとにnamespaceを分ける。
4. **Persona CoreをLLM応答から自動更新しない**。
5. **存在しない記憶を推測で補わない**。
6. **アクセストークンを永続保存しない**。
7. **有料APIへ自動フォールバックしない**。
8. **ツール実行・自律行動は用途側で明示許可するまでOFF**。
9. **既存のことり記憶は移行処理が完成するまで削除・上書きしない**。
10. **mainへ直接投入せず、検証ブランチで互換性確認後に反映する**。

## Intended swaps

```js
createRuntimeProfile({
  persona: kotoriPersona,
  usecase: companionUsecase,
  model: cloudflareWorkersAI
});
```

将来は `persona` を別キャラクターへ、`usecase` を秘書・学習等へ、`model` を別LLMアダプタへ独立して交換できる。

## Migration policy

現行 `localStorage` の `pcai.kagaribi-kotori.web.v02` は正本として維持する。新namespaceへのコピー・検証・ロールバック手順が完成するまでは、自動移行を行わない。
