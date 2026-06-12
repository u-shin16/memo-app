# StackNote

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

このアプリはFirebase Authentication（メール/パスワード）でログインし、メモ・テンプレートはFirestore、添付メディアはFirebase Storageへブラウザから直接保存します（バックエンドAPIは経由しません）。アカウントごと（`uid`単位）にデータが分離されます。
新規登録後は確認メールが送信され、メール認証が完了するまでアプリ画面は表示されません。

1. [Firebaseコンソール](https://console.firebase.google.com/)で対象プロジェクトを開く
2. 「プロジェクトの設定」→「全般」→「マイアプリ」で新しいWebアプリを登録する
3. 表示される `firebaseConfig`（apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId）を [`static/js/firebase-config.js`](static/js/firebase-config.js) の `firebaseConfig` に貼り付ける
4. 「Authentication」→「Sign-in method」で「メール/パスワード」プロバイダを有効にする
5. 「Authentication」→「Settings」→「Authorized domains」に公開ドメイン（例: `stacknote.webtool-labs.com`）を追加する
6. 「Authentication」→「Templates」→「メールアドレスの確認」で、アクションURLを `https://<公開ドメイン>/auth/action` に設定する
7. 「Firestore Database」を開き、本番モードでデータベースを作成する。「ルール」タブで、このリポジトリの [`firestore.rules`](firestore.rules) の内容を貼り付けてPublishする
8. 「Storage」を開き、Storageを有効化する（**プロジェクトがSparkプランの場合、Blazeプラン（従量課金）へのアップグレードを求められることがあります**）。「Rules」タブで、このリポジトリの [`storage.rules`](storage.rules) の内容を貼り付けてPublishする

`static/js/firebase-config.js` の値（apiKeyを含む）はブラウザに公開される前提のFirebase Web設定であり、秘密情報ではないためそのままコミットして構いません。`apiKey` が空の場合、ログイン画面に「Firebaseが設定されていません」と表示されます。

`.env`（`.env.example` を参照）の `FIREBASE_STORAGE_BUCKET` は、後述の既存データ移行スクリプト（`scripts/migrate_to_firestore.py`）専用です。

### メール認証テンプレート

Firebaseコンソールの「メールアドレスの確認」テンプレートは、以下の文面にするとアプリ内の認証待ち画面と揃います。

件名:

```text
StackNote のメールアドレスの確認
```

本文:

```text
お客様

メールアドレスを確認するには、次のリンクをクリックしてください。

%LINK%

このアドレスの確認を依頼していない場合は、このメールを無視してください。

よろしくお願いいたします。

StackNote チーム
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

メモ・テンプレートは、ユーザーごとにFirestoreの以下のコレクションへブラウザから直接保存されます。

- `users/{uid}/notes/{noteId}`
- `users/{uid}/templates/{templateId}`

添付した画像・動画はFirebase Storageの `users/{uid}/media/` 以下に保存されます。

`firestore.rules`・`storage.rules` により、各ユーザーは自分の `uid` 配下のデータのみ読み書きできます。バックエンドサーバーはメモ・メディアのデータを一切経由・保存しません。

## 既存データの移行（旧バージョンからのアップグレード）

旧バージョン（Flask + JSONファイル保存）からアップグレードする場合、`scripts/migrate_to_firestore.py` で既存データをFirestore/Storageへ移行できます。

1. このアプリで移行先アカウントを登録し、メール確認まで完了して `uid` を控える（Firebaseコンソール「Authentication」→「Users」で確認できる）
2. 「プロジェクトの設定」→「サービスアカウント」→「新しい秘密鍵の生成」でJSONをダウンロードし、プロジェクトルートに `serviceAccountKey.json` として保存する（`.gitignore` 対象。移行スクリプト専用で、絶対にコミットしない）
3. 旧サーバーの `data/notes.json`・`data/templates.json`・`data/media/*` を、このリポジトリの `data/` 以下の同名パスに**コピー**する（コピー元は削除しない）
4. 依存関係をインストールして実行する

```bash
pip install firebase-admin
python scripts/migrate_to_firestore.py --uid <uid> --dry-run
python scripts/migrate_to_firestore.py --uid <uid>
```

`--dry-run` ではノート・テンプレートの件数とメディアファイルの解決状況のみ表示し、書き込みは行いません。元の `data/notes.json`・`data/templates.json`・`data/media/*` は移行後も削除されません。

## GitHubに上げる前の注意

`.env`、`.venv/`、`uploads/`、`data/*.json`、`data/media/*`、`serviceAccountKey.json` は `.gitignore` で除外しています。
