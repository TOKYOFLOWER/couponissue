# クーポン発行＆会員管理システム - Claude Code プロジェクト指示書

## プロジェクトパス
`X:\projects\couponissue`

## プロジェクト概要
GAS（Google Apps Script）+ Google Sheets ベースの花店向けクーポン発行・会員管理・メルマガ配信システムを構築する。
clasp で管理し、Git でバージョン管理する。

## 重要ルール
- **確認なしで最後まで完成させること**。途中で質問せず、合理的なデフォルトで判断して進める。
- すべてのファイルを実際に作成し、動作する状態にする。
- GAS の制約（6分制限、グローバル関数のみ、import/export不可）を厳守する。
- HTML/CSS/JS は GAS の HtmlService 用にインラインで記述する。
- clasp 用の `.clasp.json` と `appsscript.json` を含める。
- モバイルファースト（お客様向け画面はスマホ最適化）。
- 日本語UIで構築する。

## 技術スタック
- Google Apps Script (V8 ランタイム)
- Google Sheets（データベース）
- clasp（デプロイ管理）
- GAS Web App（フロントエンド）
- Git（バージョン管理）

---

## データ構造（Google Sheets）

### シート1: `members`（会員マスタ）
| カラム | 型 | 説明 |
|--------|------|------|
| member_id | String | UUID |
| name | String | 会員名 |
| name_kana | String | フリガナ |
| phone | String | 電話番号 |
| email | String | メールアドレス |
| birthday | String | 誕生日（MM/DD） |
| registration_date | String | 登録日（ISO） |
| registration_method | String | `staff` / `web` |
| total_points | Number | 累計ポイント |
| available_points | Number | 利用可能ポイント |
| memo | String | 備考 |
| status | String | `active` / `inactive` / `unsubscribed` |
| mail_opt_in | Boolean | メルマガ受信許可 |

### シート2: `coupon_master`（クーポンマスタ）
| カラム | 型 | 説明 |
|--------|------|------|
| coupon_id | String | `CPN-YYYYMMDD-NNN` |
| coupon_name | String | クーポン名 |
| coupon_type | String | `percent` / `fixed` / `benefit` / `point` |
| coupon_value | String | 値（例: `10`, `500`, `ラッピング無料`, `100`） |
| description | String | 説明文 |
| expiry_type | String | `relative` / `absolute` |
| expiry_days | Number | 相対期限の日数 |
| expiry_date | String | 絶対期限の日付 |
| distribution_method | String | `mail_magazine` / `individual` / `birthday` / `qr_store` |
| usage_flow | String | `customer_swipe` / `staff_operate` |
| design_color | String | 背景色HEX |
| design_image_url | String | 画像URL |
| created_at | String | 作成日時 |
| created_by | String | 作成者 |
| is_active | Boolean | 有効/無効 |

### シート3: `coupon_issued`（発行済みクーポン）
| カラム | 型 | 説明 |
|--------|------|------|
| issue_id | String | UUID |
| coupon_id | String | クーポンマスタID |
| member_id | String | 会員ID |
| token | String | URLトークン（UUID） |
| issued_at | String | 発行日時 |
| expires_at | String | 有効期限 |
| status | String | `unused` / `used` / `expired` |
| used_at | String | 利用日時 |
| used_by | String | `customer` / スタッフ名 |

### シート4: `mail_log`（メール配信ログ）
| カラム | 型 | 説明 |
|--------|------|------|
| log_id | String | UUID |
| mail_type | String | `magazine` / `individual` / `birthday_auto` / `coupon_notify` |
| subject | String | 件名 |
| body_template | String | テンプレート名 |
| sent_to | String | member_id or `ALL` |
| sent_at | String | 送信日時 |
| sent_count | Number | 件数 |
| status | String | `success` / `partial_fail` / `failed` |

### シート5: `point_history`（ポイント履歴）
| カラム | 型 | 説明 |
|--------|------|------|
| history_id | String | UUID |
| member_id | String | 会員ID |
| change_type | String | `earn` / `use` / `expire` / `adjust` |
| points | Number | 変動ポイント |
| reason | String | 理由 |
| related_id | String | 関連ID |
| created_at | String | 日時 |

### シート6: `settings`（システム設定）
| カラム | 型 | 説明 |
|--------|------|------|
| key | String | 設定キー |
| value | String | 設定値 |

初期設定値:
- `store_name`: 銀座東京フラワー
- `store_email`: （店舗メール）
- `welcome_coupon_id`: （初回クーポンID、空欄可）
- `birthday_coupon_id`: （誕生日クーポンID、空欄可）
- `birthday_send_day`: `1`（誕生月の何日に送るか）
- `webapp_url`: （デプロイ後に設定）

---

## ファイル構成

```
X:\projects\couponissue\
├── .clasp.json
├── .claspignore
├── .gitignore
├── appsscript.json
├── CLAUDE.md
├── src\
│   ├── main.js              # doGet / doPost ルーティング
│   ├── config.js             # 定数・シート名・設定読み込み
│   ├── utils.js              # UUID生成、日付ヘルパー、シートCRUD
│   ├── auth.js               # 管理者認証チェック
│   ├── memberService.js      # 会員CRUD
│   ├── couponService.js      # クーポンマスタCRUD
│   ├── couponIssueService.js # クーポン発行・利用処理
│   ├── mailService.js        # メール送信（一斉/個別/誕生日）
│   ├── pointService.js       # ポイント付与・利用・履歴
│   └── triggerService.js     # 自動トリガー（誕生日配信、期限切れ処理）
├── html\
│   ├── admin\
│   │   ├── index.html        # 管理画面（SPA、タブ切り替え）
│   │   ├── dashboard.html    # ダッシュボード部品
│   │   ├── members.html      # 会員管理部品
│   │   ├── coupons.html      # クーポン管理部品
│   │   └── mail.html         # メルマガ部品
│   ├── public\
│   │   ├── register.html     # 会員登録フォーム（お客様向け）
│   │   └── coupon.html       # クーポン表示＆スワイプ画面
│   └── common\
│       └── style.html        # 共通CSS
└── README.md
```

---

## 機能詳細

### 1. ルーティング（main.js）

```javascript
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'admin';
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';

  // お客様向けページ（認証不要）
  if (page === 'coupon' && token) {
    return serveCouponPage(token);
  }
  if (page === 'register') {
    return serveRegisterPage();
  }

  // 管理画面（認証必要）
  if (!isAdmin()) {
    return HtmlService.createHtmlOutput('<h2>アクセス権限がありません</h2>');
  }
  return serveAdminPage();
}

function doPost(e) {
  try {
    var action = JSON.parse(e.postData.contents);
    var result = routeAction(action);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

### 2. 会員管理
- **スタッフ登録**: 管理画面フォームから登録。member_id は UUID 自動生成。
- **Web登録**: 公開URLフォーム。登録後にウェルカムメール送信。settings の welcome_coupon_id が設定されていれば初回クーポン自動発行。
- **検索**: 名前・電話・メールで部分一致検索。
- **編集**: ステータス変更、メモ追記、opt-out処理。

### 3. クーポン発行＆利用
- **マスタ作成**: タイプ（割引率/固定金額/特典/ポイント）、期限（相対/絶対）、利用フロー（客スワイプ/スタッフ操作）を設定。
- **発行**: 対象会員を選択 → coupon_issued にレコード追加 → token（UUID）生成 → URLをメール送信。
- **クーポン表示画面（coupon.html）**:
  - token パラメータで coupon_issued を照合
  - 有効期限チェック（期限切れなら `expired` に更新して表示）
  - ステータスに応じた表示:
    - `unused`: クーポンカード + スワイプ操作（usage_flow が `customer_swipe` の場合）or 「スタッフにお見せください」表示
    - `used`: 「利用済み」表示（グレーアウト、利用日時表示）
    - `expired`: 「期限切れ」表示
  - **スワイプ操作**: 左→右スワイプ or 「利用する」ボタン長押し → 確認ダイアログ → google.script.run でサーバー側更新 → 画面変化
  - **二重利用防止**: LockService.getScriptLock() で排他制御。サーバー側でステータス再チェック

### 4. メルマガ配信
- **テンプレート変数**: `{{name}}`, `{{coupon_url}}`, `{{store_name}}`, `{{unsubscribe_url}}`
- **一斉配信**: opt-in 会員全員に送信。1通ずつ GmailApp.sendEmail() で個別送信
- **個別配信**: 会員を選んでクーポン付きメール
- **誕生日自動配信**: 毎日トリガーで当月誕生日の会員にクーポン自動発行＆メール。mail_log で重複チェック
- **配信停止**: メール本文の配信停止リンク（トークン付きURL）→ opt-out処理

### 5. ポイント機能
- クーポンタイプが `point` の場合、利用時に会員の available_points / total_points に加算
- ポイント利用は管理画面から手動調整
- point_history に全履歴記録

### 6. 自動トリガー
- `setupTriggers()` 関数:
  - まず `removeTriggers()` で既存トリガーを全削除（重複防止）
  - 毎日9:00 JST: 誕生日クーポン配信チェック（`runBirthdayAutoSend`）
  - 毎日0:00 JST: 期限切れクーポンのステータス更新（`runExpireCoupons`）

### 7. 管理画面
- SPA構成（タブ切り替え）。google.script.run でバックエンドと通信
- ダッシュボード: 会員数、本日誕生日一覧、未使用クーポン数、直近配信ログ
- レスポンシブだがPC利用を主眼に

### 8. シート初期化関数
- `initializeSheets()`: 全6シートをヘッダー付きで自動作成
- settings シートには初期値も投入
- GASエディタから1回実行するだけでDB構造が完成する

---

## デザインガイドライン

### お客様向け画面（coupon.html, register.html）
- モバイルファースト（max-width: 480px ベース）
- クーポンカード: 角丸カード型、design_color を背景に、box-shadow付き
- スワイプUI: touch イベント対応、スワイプ方向を矢印でガイド表示
- 利用済み: カード全体をグレーアウト + 大きな「USED」スタンプオーバーレイ
- 期限切れ: 「EXPIRED」スタンプ
- フォント: Noto Sans JP（Google Fonts CDN）
- 配色: 花店らしい柔らかいピンク〜グリーン系をベースに

### 管理画面
- クリーンなダッシュボード、上部タブメニュー
- テーブル表示は横スクロール対応
- モーダルでフォーム表示（新規登録・編集）
- 配色: 落ち着いたダークネイビー + ホワイト

---

## セキュリティ要件
- クーポントークンは Utilities.getUuid()
- 管理画面アクセスは Session.getActiveUser().getEmail() でホワイトリスト確認
- config.js に ADMIN_EMAILS 配列を定義（デフォルト: 空配列 → 初回設定が必要な旨をREADMEに記載）
- クーポン利用時は LockService.getScriptLock() で排他制御（最大30秒待機）
- メール送信は1通ずつ個別送信（BCC不使用）
- 配信停止リンクにも会員固有のトークン（member_id）を使用

---

## clasp 設定ファイル

### appsscript.json
```json
{
  "timeZone": "Asia/Tokyo",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

### .claspignore
```
node_modules/**
.git/**
README.md
CLAUDE.md
.gitignore
```

### .gitignore
```
node_modules/
.clasp.json
```

---

## 実装の優先順位（この順番で作成すること）
1. appsscript.json, .claspignore, .gitignore
2. src/config.js（定数定義、シート名、設定読み込み、ADMIN_EMAILS、SPREADSHEET_ID）
3. src/utils.js（UUID生成、日付フォーマット、シートCRUDヘルパー、initializeSheets）
4. src/auth.js（isAdmin関数）
5. src/main.js（doGet/doPost ルーティング、include関数、servePage各種）
6. src/memberService.js（会員CRUD全機能）
7. src/couponService.js（クーポンマスタCRUD）
8. src/couponIssueService.js（発行・利用・期限切れ処理・LockService排他制御）
9. src/mailService.js（テンプレートエンジン、一斉/個別/誕生日配信、配信停止処理）
10. src/pointService.js（ポイント付与・利用・履歴記録）
11. src/triggerService.js（setupTriggers/removeTriggers、runBirthdayAutoSend、runExpireCoupons）
12. html/common/style.html（共通CSS）
13. html/public/register.html（会員登録フォーム）
14. html/public/coupon.html（クーポン表示＆スワイプ画面）
15. html/admin/dashboard.html（ダッシュボード部品）
16. html/admin/members.html（会員管理部品）
17. html/admin/coupons.html（クーポン管理部品）
18. html/admin/mail.html（メルマガ配信部品）
19. html/admin/index.html（管理画面メイン、タブ切り替え、各部品をinclude）
20. README.md（セットアップ手順、初期設定、運用ガイド）

**全20ファイルを実装し、clasp push で即デプロイ可能な状態にすること。**
**途中で確認・質問はせず、最後まで一気に完成させること。**
