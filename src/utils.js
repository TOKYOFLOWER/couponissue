/**
 * utils.js - UUID生成、日付ヘルパー、シートCRUD、initializeSheets
 */

/**
 * UUID生成
 */
function generateUuid() {
  return Utilities.getUuid();
}

/**
 * 現在日時をISO文字列で取得（JST）
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * 日付をYYYY-MM-DD形式に変換
 */
function formatDate(date) {
  var d = new Date(date);
  var year = d.getFullYear();
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  return year + '-' + month + '-' + day;
}

/**
 * 日付をYYYY/MM/DD HH:mm形式に変換
 */
function formatDateTime(date) {
  var d = new Date(date);
  var year = d.getFullYear();
  var month = ('0' + (d.getMonth() + 1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  var hours = ('0' + d.getHours()).slice(-2);
  var minutes = ('0' + d.getMinutes()).slice(-2);
  return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
}

/**
 * N日後の日付を返す
 */
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * クーポンIDを生成する（CPN-YYYYMMDD-NNN形式）
 */
function generateCouponId() {
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMdd');
  var sheet = getSheet(SHEET_NAMES.COUPON_MASTER);
  var lastRow = sheet.getLastRow();
  var seq = 1;
  if (lastRow > 1) {
    var data = sheet.getDataRange().getValues();
    for (var i = data.length - 1; i >= 1; i--) {
      var existingId = data[i][0];
      if (existingId && existingId.indexOf('CPN-' + dateStr) === 0) {
        var parts = existingId.split('-');
        var num = parseInt(parts[2], 10);
        if (num >= seq) {
          seq = num + 1;
        }
      }
    }
  }
  return 'CPN-' + dateStr + '-' + ('000' + seq).slice(-3);
}

/**
 * シートデータをオブジェクト配列として取得する
 */
function getSheetData(sheetName) {
  var sheet = getSheet(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row._rowIndex = i + 1;
    result.push(row);
  }
  return result;
}

/**
 * シートに1行追加する
 */
function appendRow(sheetName, headers, dataObj) {
  var sheet = getSheet(sheetName);
  var row = headers.map(function(h) {
    return dataObj[h] !== undefined ? dataObj[h] : '';
  });
  sheet.appendRow(row);
}

/**
 * シートの指定行を更新する
 */
function updateRow(sheetName, rowIndex, headers, dataObj) {
  var sheet = getSheet(sheetName);
  var row = headers.map(function(h) {
    return dataObj[h] !== undefined ? dataObj[h] : '';
  });
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

/**
 * 指定条件でシートから1行検索する
 */
function findRow(sheetName, key, value) {
  var data = getSheetData(sheetName);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][key]) === String(value)) {
      return data[i];
    }
  }
  return null;
}

/**
 * 指定条件でシートから複数行検索する
 */
function findRows(sheetName, key, value) {
  var data = getSheetData(sheetName);
  var results = [];
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][key]) === String(value)) {
      results.push(data[i]);
    }
  }
  return results;
}

/**
 * 全シートを初期化する
 */
function initializeSheets() {
  var ss = getSpreadsheet();

  var sheetsConfig = [
    { name: SHEET_NAMES.MEMBERS, headers: MEMBER_HEADERS },
    { name: SHEET_NAMES.COUPON_MASTER, headers: COUPON_MASTER_HEADERS },
    { name: SHEET_NAMES.COUPON_ISSUED, headers: COUPON_ISSUED_HEADERS },
    { name: SHEET_NAMES.MAIL_LOG, headers: MAIL_LOG_HEADERS },
    { name: SHEET_NAMES.POINT_HISTORY, headers: POINT_HISTORY_HEADERS },
    { name: SHEET_NAMES.SETTINGS, headers: SETTINGS_HEADERS }
  ];

  sheetsConfig.forEach(function(cfg) {
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(cfg.headers);
    }
  });

  // 設定シートに初期値を投入
  var settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  var existingSettings = {};
  if (settingsSheet.getLastRow() > 1) {
    var data = settingsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      existingSettings[data[i][0]] = true;
    }
  }
  var keys = Object.keys(DEFAULT_SETTINGS);
  for (var k = 0; k < keys.length; k++) {
    if (!existingSettings[keys[k]]) {
      settingsSheet.appendRow([keys[k], DEFAULT_SETTINGS[keys[k]]]);
    }
  }

  // デフォルトの Sheet1 を削除（存在する場合）
  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) { /* 無視 */ }
  }

  Logger.log('全シートの初期化が完了しました。');
}
