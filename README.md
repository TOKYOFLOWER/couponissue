# クーポン発行＆会員管理システム

花店向けのクーポン発行・会員管理・メルマガ配信システムです。
GAS（Google Apps Script）+ Google Sheets で構築されています。

## セットアップ手順

### 1. 前提条件
- Node.js がインストール済み
- clasp がインストール済み（`npm install -g @google/clasp`）
- Google アカウントで clasp にログイン済み（`clasp login`）

### 2. GASプロジェクト作成
```bash
# プロジェクトディレクトリに移動
cd X:\projects\couponissue

# GASプロジェクトを作成（または既存のスクリプトIDを使用）
clasp create --type webapp --title "クーポン管理システム"
```

### 3. スプレッドシート設定
1. Google Sheets で新しいスプレッドシートを作成
2. スプレッドシートのIDをコピー（URLの `/d/` と `/edit` の間の文字列）
3. `src/config.js` の `SPREADSHEET_ID` に設定

### 4. 管理者設定
`src/config.js` の `ADMIN_EMAILS` に管理者のGoogleアカウントメールを追加：
```javascript
var ADMIN_EMAILS = [
  'your-email@gmail.com'
];
```

### 5. デプロイ
```bash
# GASにプッシュ
clasp push

# GASエディタを開く
clasp open
```

### 6. 初期化
1. GASエディタで `initializeSheets` 関数を実行（シートとヘッダーが自動作成されます）
2. Web Appとしてデプロイ:
   - 「デプロイ」→「新しいデプロイ」
   - 種類: ウェブアプリ
   - 実行ユーザー: 自分
   - アクセスできるユーザー: 全員
3. デプロイURLをコピーし、管理画面の「設定」→「Web App URL」に登録

### 7. トリガー設定
管理画面の「設定」タブから「トリガー設定」ボタンをクリック、または GASエディタで `setupTriggers` を実行。

## 機能一覧

### 会員管理
- スタッフによる会員登録・編集
- お客様向けWeb登録フォーム
- 名前・電話・メールによる検索
- ステータス管理（アクティブ/無効/配信停止）

### クーポン管理
- クーポンマスタ作成（割引率/固定金額/特典/ポイント）
- 期限設定（相対日数/絶対日付）
- 個別・一括のクーポン発行
- お客様によるスワイプ利用 or スタッフ操作
- 二重利用防止（排他制御）

### メルマガ配信
- 一斉配信（opt-in会員全員）
- 個別配信
- テンプレート変数対応
- 配信停止リンク自動付与

### 誕生日自動配信
- 毎月指定日に誕生月の会員へクーポン自動発行・メール送信
- 重複配信防止

### ポイント管理
- ポイント付与・利用
- 履歴管理

## URL一覧

| ページ | URL |
|--------|-----|
| 管理画面 | `{Web App URL}` |
| 会員登録 | `{Web App URL}?page=register` |
| クーポン表示 | `{Web App URL}?page=coupon&token={TOKEN}` |

## テンプレート変数

メール本文で使用可能な変数:

| 変数 | 説明 |
|------|------|
| `{{name}}` | 会員名 |
| `{{coupon_url}}` | クーポンURL |
| `{{store_name}}` | 店舗名 |
| `{{unsubscribe_url}}` | 配信停止URL |

## ファイル構成

```
src/         - バックエンドロジック（GAS）
html/admin/  - 管理画面HTML
html/public/ - お客様向けHTML
html/common/ - 共通CSS
```

## 注意事項
- GASの実行制限（6分/実行）があるため、大量メール送信時は分割処理を検討してください
- メール送信はGmailの1日あたりの送信上限（無料: 100通/日）に制限されます
- スプレッドシートのデータ量が増えると処理が遅くなる場合があります
