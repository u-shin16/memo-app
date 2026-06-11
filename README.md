# Memo

階層的にアイデアやプロジェクトを管理できる Flask 製メモ帳アプリです。

## 最上位メモ（複数作成対応）

このアプリでは **最上位メモを何個でも作成できます**。

- 左上の **＋ボタン** を押すと最上位メモが作成されます
- `parent_id: null` のメモが最上位メモになります
- 最上位メモの下に子メモを追加して、自由に階層管理できます

```
アイデア
├── アプリ案
└── 収益化案

開発プロジェクト
├── memo
└── alarm-app

勉強メモ
├── Python
└── Flask
```

## 主な機能

- **最上位メモを複数作成**（＋ボタン）
- メモを親子階層で管理
- メモ追加（ツリーの ＋ ボタン、または「メモを追加」ボタン）
- メモのチェック（上部ボタンまたは右クリックメニューから設定、一覧に大きな ✅ を表示）
- メモ削除（最上位メモも削除可能、子メモもまとめて削除）
- 最上位メモのピン留め（右クリックメニューから設定、常に一覧の上部へ表示）
- タイトル・本文検索
- ドラッグ操作でメモ移動
  - メモとメモの間へドロップ → 同じ階層内で並び替え
  - 子メモをルート側の先頭/末尾ゾーンへドロップ → 同じ親メモ配下の子メモ同士で先頭/末尾へ移動
  - 別のメモへドロップ → そのメモの子へ移動
  - 右クリックの「同じ親の最上位へ移動」 → 同じ親メモ配下の先頭へ移動
  - 右クリックの「同じ親の最下位へ移動」 → 同じ親メモ配下の末尾へ移動
- ファイル読み込み
  - ドラッグ&ドロップ
  - ファイル選択
  - 選択中のメモがあれば子として追加、なければ最上位として追加
- テンプレート
  - 公式テンプレート（開発メモ）
  - 選択中のメモと子メモを保存
  - 保存済みテンプレートから新しい最上位メモを追加
- JSONエクスポート

## 対応ファイル

- `.txt`
- `.md`
- `.csv`
- `.json`
- `.pdf`
- `.docx`
- `.xlsx`

## 起動手順

```bash
cd memo
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

ブラウザで以下を開きます。

```text
http://127.0.0.1:5001
```

## Firebase設定

このアプリはFirebase Authentication（メール/パスワード）でログインします。アカウントごとにメモ・テンプレート・メディアが分離されます。
新規登録後は確認メールが送信され、メール認証が完了するまでログイン完了・API利用はできません。

1. [Firebaseコンソール](https://console.firebase.google.com/)で対象プロジェクトを開く
2. 「プロジェクトの設定」→「全般」→「マイアプリ」で新しいWebアプリを登録する
3. 表示される `firebaseConfig`（apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId）を控える
4. 「Authentication」→「Sign-in method」で「メール/パスワード」プロバイダを有効にする
5. 「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」でJSONをダウンロードし、プロジェクトルートに `serviceAccountKey.json` として保存する（`.gitignore` 対象）
6. 「Authentication」→「Settings」→「Authorized domains」に公開ドメイン（例: `hayo.webtool-labs.com`）を追加する
7. 「Authentication」→「Templates」→「メールアドレスの確認」で、アクションURLを `https://<公開ドメイン>/auth/action` に設定する

`.env`（`.env.example` を参照）に以下を設定します。

```bash
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
```

サービスアカウントは、プロジェクトルートに置いた `serviceAccountKey.json`、または `FIREBASE_SERVICE_ACCOUNT_JSON`（JSON全体を1行の文字列で設定）のどちらかで読み込まれます。

これらが未設定の場合、ログイン画面に「Firebaseが設定されていません」と表示され、`/api/*` は503を返します。

### メール認証テンプレート

Firebaseコンソールの「メールアドレスの確認」テンプレートは、以下の文面にするとアプリ内の認証待ち画面と揃います。

件名:

```text
Memo のメールアドレスの確認
```

本文:

```text
お客様

メールアドレスを確認するには、次のリンクをクリックしてください。

%LINK%

このアドレスの確認を依頼していない場合は、このメールを無視してください。

よろしくお願いいたします。

Memo チーム
```

リンクを開いた後の承認画面は `/auth/action` で表示されます。Firebaseコンソール側のアクションURLを設定していない場合、Firebase標準の英語画面が表示されます。

### Gmailで迷惑メールに入りにくくする設定

Gmailの迷惑メール判定はアプリのコードだけでは完全に制御できません。初回送信で迷惑メールに入る場合は、FirebaseとDNS側で送信ドメインの信頼性を上げてください。

1. Firebaseコンソールの「Authentication」→「Templates」で「Customize domain」を開き、公開サイトと同じドメインまたはサブドメインを設定する
2. Firebaseが表示するDNSレコード（TXT/CNAMEなど）をドメインのDNSに追加する
3. 検証が完了したら「Apply Custom Domain」を押し、メールの差出人ドメインと確認リンクを `firebaseapp.com` ではなく公開ドメイン側に寄せる
4. 独自メール配信サービスを使う場合は、送信ドメインにSPF、DKIM、DMARCを設定する
5. Gmail Postmaster Toolsで迷惑メール率を確認し、件名・本文・送信頻度を調整する

確認メールの件名と本文は、長いURLだけが目立つ文面を避け、サービス名が分かる短い件名にしてください。例として、公開サービス名が「はよおきんかい」の場合は件名を `はよおきんかい のメールアドレスの確認` にし、本文末尾も `はよおきんかい チーム` に揃えます。

## データ保存場所

メモデータはユーザーごとに `data/users/<uid>/notes.json` に保存されます。
アップロードされたファイルはユーザーごとに `data/media/<uid>/` に保存されます。

初回ログイン時、既存の `data/notes.json`・`data/media/` のデータは最初にログインしたユーザーに引き継がれます（`data/users/.legacy_claimed` に記録）。元のファイルは削除されずバックアップとして残ります。

## GitHubに上げる前の注意

`.env`、`.venv/`、`uploads/`、`data/*.json`、`serviceAccountKey.json`、`data/users/` は `.gitignore` で除外しています。
