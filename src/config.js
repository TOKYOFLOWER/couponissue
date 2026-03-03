/**
 * config.js - 定数・シート名・設定読み込み
 */

// スプレッドシートID（clasp push前に設定すること）
var SPREADSHEET_ID = '';

// 管理者メールアドレス（初期設定必須）
var ADMIN_EMAILS = [
  // 'admin@example.com'
];

// シート名
var SHEET_NAMES = {
  MEMBERS: 'members',
  COUPON_MASTER: 'coupon_master',
  COUPON_ISSUED: 'coupon_issued',
  MAIL_LOG: 'mail_log',
  POINT_HISTORY: 'point_history',
  SETTINGS: 'settings'
};

// 会員シートヘッダー
var MEMBER_HEADERS = [
  'member_id', 'name', 'name_kana', 'phone', 'email', 'birthday',
  'registration_date', 'registration_method', 'total_points',
  'available_points', 'memo', 'status', 'mail_opt_in'
];

// クーポンマスタヘッダー
var COUPON_MASTER_HEADERS = [
  'coupon_id', 'coupon_name', 'coupon_type', 'coupon_value', 'description',
  'expiry_type', 'expiry_days', 'expiry_date', 'distribution_method',
  'usage_flow', 'design_color', 'design_image_url', 'created_at',
  'created_by', 'is_active'
];

// 発行済みクーポンヘッダー
var COUPON_ISSUED_HEADERS = [
  'issue_id', 'coupon_id', 'member_id', 'token', 'issued_at',
  'expires_at', 'status', 'used_at', 'used_by'
];

// メールログヘッダー
var MAIL_LOG_HEADERS = [
  'log_id', 'mail_type', 'subject', 'body_template', 'sent_to',
  'sent_at', 'sent_count', 'status'
];

// ポイント履歴ヘッダー
var POINT_HISTORY_HEADERS = [
  'history_id', 'member_id', 'change_type', 'points', 'reason',
  'related_id', 'created_at'
];

// 設定ヘッダー
var SETTINGS_HEADERS = ['key', 'value'];

// デフォルト設定
var DEFAULT_SETTINGS = {
  'store_name': '銀座東京フラワー',
  'store_email': '',
  'welcome_coupon_id': '',
  'birthday_coupon_id': '',
  'birthday_send_day': '1',
  'webapp_url': ''
};

/**
 * スプレッドシートを取得する
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * 指定シートを取得する
 */
function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

/**
 * 設定値を取得する
 */
function getSetting(key) {
  var sheet = getSheet(SHEET_NAMES.SETTINGS);
  if (!sheet) return '';
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      return data[i][1] || '';
    }
  }
  return '';
}

/**
 * 設定値を更新する
 */
function updateSetting(key, value) {
  var sheet = getSheet(SHEET_NAMES.SETTINGS);
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}
