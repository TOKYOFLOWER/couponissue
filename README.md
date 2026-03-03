# クーポン発行＆会員管理システム

花店向けのクーポン発行・会員管理・メルマガ配信システムです。

## アーキテクチャ

- **フロントエンド**: GitHub Pages（静的HTML/CSS/JS）
- **バックエンド**: Google Apps Script（JSON API）
- **データベース**: Google Sheets

フロントエンドとバックエンドは完全分離。GASはJSON APIのみ提供。

## セットアップ手順

### 1. 前提条件
- Node.js + clasp (`npm install -g @google/clasp`)
- `clasp login` 済み
- Google Sheets でスプレッドシート作成済み

### 2. GASバックエンド設定

```bash
cd gas

# GASプロジェクト作成（初回のみ）
clasp create --title "クーポンAPI" --type standalone

# src/config.js を編集
# - SPREADSHEET_ID: スプレッドシートのID
# - API_KEY: ランダムなUUID文字列に変更

# GASにプッシュ
clasp push --force

# GASエディタで initializeSheets を実行（シート自動作成）

# Web Appとしてデプロイ
clasp deploy --description "初回デプロイ"
```

### 3. GitHub Secrets 設定

GitHub Pages デプロイ時に `config.js` を自動生成するため、リポジトリに Secrets を設定します。

1. GitHub リポジトリの **Settings → Secrets and variables → Actions**
2. 「New repository secret」で以下を追加：

| Secret名 | 値 |
|-----------|-----|
| `GAS_API_URL` | GAS Web App のデプロイURL（例: `https://script.google.com/macros/s/XXXXX/exec`） |
| `GAS_API_KEY` | `gas/src/config.js` の `API_KEY` と同じ値 |

### 4. GitHub Pages 有効化

1. GitHubリポジトリの **Settings → Pages**
2. Source: **GitHub Actions** を選択
3. `main` ブランチへの push で自動デプロイされます

> **ローカル開発時**: `docs/js/config.example.js` を `docs/js/config.js` にコピーして値を設定してください。`config.js` は `.gitignore` 対象です。

### 5. APIキー生成
GASエディタのコンソールで以下を実行してAPIキーを生成：
```javascript
Logger.log(Utilities.getUuid());
```
出力されたUUIDを `gas/src/config.js` の `API_KEY` と `docs/js/config.js` の `API_KEY` の両方に設定。

### 6. トリガー設定
GASエディタで `setupTriggers` を実行。
- 毎日 9:00: 誕生日クーポン自動配信
- 毎日 0:00: 期限切れクーポン処理

## URL一覧

| ページ | URL |
|--------|-----|
| 管理画面 | `https://TOKYOFLOWER.github.io/couponissue/` |
| 会員管理 | `https://TOKYOFLOWER.github.io/couponissue/members.html` |
| クーポン管理 | `https://TOKYOFLOWER.github.io/couponissue/coupons.html` |
| メルマガ | `https://TOKYOFLOWER.github.io/couponissue/mail.html` |
| 会員登録 | `https://TOKYOFLOWER.github.io/couponissue/register.html` |
| クーポン表示 | `https://TOKYOFLOWER.github.io/couponissue/coupon.html?token=XXX` |

## テンプレート変数

| 変数 | 説明 |
|------|------|
| `{{name}}` | 会員名 |
| `{{coupon_url}}` | クーポンURL |
| `{{store_name}}` | 店舗名 |
| `{{unsubscribe_url}}` | 配信停止URL |

## セキュリティ
- 管理API: APIキー認証（`config.js` は `.gitignore` 対象）
- 公開API: トークンベース認証
- クーポン利用: LockServiceで排他制御
- GitHub Pages: HTTPS（デフォルト）

## ファイル構成

```
gas/src/    - GASバックエンド（JSON API）
docs/       - GitHub Pagesフロントエンド
docs/css/   - スタイルシート
docs/js/    - JavaScriptモジュール
docs/img/   - 画像アセット
```
