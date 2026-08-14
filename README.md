# 篝火ことり PCAI Web

Project Chobits / PCAI の**公開Webデモ**です。

このリポジトリは公開表示用の最小構成だけを置きます。
PCAIの設計正本・安全境界・Full Loop Prototypeは非公開 `future-project/pcai_prototype` 側で管理します。

## この公開デモにあるもの

- 篝火ことりのビジュアル
- ブラウザ上の会話UI
- ブラウザ標準TTS
- localStorageを使った短期・長期記憶
- episodic / semantic / relationship / procedural memory
- 睡眠処理による簡易記憶整理
- Cloudflare Workers上のPCAI backendへの接続口
- backend経由のLLM会話

現在のFrontendは、

```text
https://pcai-kotori-backend.siryuuakito.workers.dev
```

をBackend endpointとして参照します。

## 重要な位置づけ

この公開Web版は、開発中のFull Loop Prototypeそのものではありません。

非公開Prototype側にある以下の安全・人格機構が、公開Webへすべて同一状態で移植されているとは限りません。

- Persona-scoped Memory Guard
- Memory Policy Gate
- Secret Input Guard
- Bounded Recall Expression
- Relationship Progression
- Shared Growth Shadow
- Initiative Shadow
- Sleep Reconstruction
- Live2D bridge / motion controllers

したがって、公開Web版をPCAI設計の正本として扱わず、**軽量な公開デモ / UI実験**として扱います。

## Repository separation

```text
pcai-kotori-web
  = public demo frontend

future-project/pcai_prototype
  = canonical Full Loop implementation + tests + architecture
```

APIキー等の秘密情報をこの公開リポジトリやブラウザコードへ直接置かないことを前提にします。
