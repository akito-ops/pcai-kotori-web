# 篝火ことり PCAI Web

Project Chobits の公開用PCAI Web試作品です。

この公開リポジトリには、Web表示と安全検証に必要な最小ファイルだけを置きます。設計資料・内部仕様・他プロジェクトは非公開側で管理します。

## v0.4.0-beta

現時点の試作品は、篝火ことりの公式ビジュアル、人格固有Local Responder、ブラウザ内短期・長期記憶、睡眠処理による記憶整理、ブラウザ標準TTS、Cloudflare Workers AI無料枠への接続を実装しています。

Local ResponderはPCAIエンジンから分離され、段階移行中は旧Responderをfail-safe fallbackとして残しています。Persona Coreの書換え、記憶の捏造、自律ツール実行、有料APIへの自動fallbackは無効です。

ブラウザ側にはContent Security Policyを設定し、外部スクリプトを許可せず、AI通信先を既知のCloudflare Workerに限定しています。本人用アクセス鍵はページ内メモリだけに保持し、localStorage・GitHub・会話記憶へ保存しません。

この版は試作品です。`main` へ統合する前に、Responder移行・ブラウザ動作・バックエンド人格分離を追加検証します。
