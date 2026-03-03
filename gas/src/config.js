/**
 * config.js - 定数・シート名・設定
 */

// APIキー（管理者認証用。十分に長いランダム文字列を設定）
var API_KEY = '22a3364b-b0eb-4f41-aa9e-5bb8a3dcd96c';

// スプレッドシートID
var SPREADSHEET_ID = '11aLwRTVX1RaRWodIPlKgy-JRXlChevL980y5Onl2wjE';

// シート名
var SHEET_NAMES = {
  MEMBERS: 'members',
  COUPON_MASTER: 'coupon_master',
  COUPON_ISSUED: 'coupon_issued',
  MAIL_LOG: 'mail_log',
  POINT_HISTORY: 'point_history',
  SETTINGS: 'settings'
};

// ヘッダー定義
var MEMBER_HEADERS = [
  'member_id', 'name', 'name_kana', 'phone', 'email', 'birthday',
  'registration_date', 'registration_method', 'total_points',
  'available_points', 'memo', 'status', 'mail_opt_in'
];

var COUPON_MASTER_HEADERS = [
  'coupon_id', 'coupon_name', 'coupon_type', 'coupon_value', 'description',
  'expiry_type', 'expiry_days', 'expiry_date', 'distribution_method',
  'usage_flow', 'design_color', 'design_image_url', 'created_at',
  'created_by', 'is_active'
];

var COUPON_ISSUED_HEADERS = [
  'issue_id', 'coupon_id', 'member_id', 'token', 'issued_at',
  'expires_at', 'status', 'used_at', 'used_by'
];

var MAIL_LOG_HEADERS = [
  'log_id', 'mail_type', 'subject', 'body_template', 'sent_to',
  'sent_at', 'sent_count', 'status'
];

var POINT_HISTORY_HEADERS = [
  'history_id', 'member_id', 'change_type', 'points', 'reason',
  'related_id', 'created_at'
];

var SETTINGS_HEADERS = ['key', 'value'];

var DEFAULT_SETTINGS = {
  'store_name': '銀座東京フラワー',
  'store_email': '',
  'welcome_coupon_id': '',
  'birthday_coupon_id': '',
  'birthday_send_day': '1',
  'webapp_url': '',
  'api_url': ''
};

/**
 * スプレッドシートを取得
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * シートを取得
 */
function getSheet(sheetName) {
  return getSpreadsheet().getSheetByName(sheetName);
}

/**
 * 設定値を取得
 */
function getSetting(key) {
  var sheet = getSheet(SHEET_NAMES.SETTINGS);
  if (!sheet) return '';
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1] || '';
  }
  return '';
}

/**
 * 設定値を更新
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
