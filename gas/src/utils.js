/**
 * utils.js - UUID、日付ヘルパー、シートCRUD、initializeSheets
 */

function generateUuid() {
  return Utilities.getUuid();
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(date) {
  var d = new Date(date);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function formatDateTime(date) {
  var d = new Date(date);
  return d.getFullYear() + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' +
    ('0' + d.getDate()).slice(-2) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}

function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

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
        var num = parseInt(existingId.split('-')[2], 10);
        if (num >= seq) seq = num + 1;
      }
    }
  }
  return 'CPN-' + dateStr + '-' + ('000' + seq).slice(-3);
}

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

function appendRow(sheetName, headers, dataObj) {
  var sheet = getSheet(sheetName);
  var row = headers.map(function(h) { return dataObj[h] !== undefined ? dataObj[h] : ''; });
  sheet.appendRow(row);
}

function updateRow(sheetName, rowIndex, headers, dataObj) {
  var sheet = getSheet(sheetName);
  var row = headers.map(function(h) { return dataObj[h] !== undefined ? dataObj[h] : ''; });
  sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function findRow(sheetName, key, value) {
  var data = getSheetData(sheetName);
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][key]) === String(value)) return data[i];
  }
  return null;
}

function findRows(sheetName, key, value) {
  var data = getSheetData(sheetName);
  return data.filter(function(row) { return String(row[key]) === String(value); });
}

/**
 * 全シート初期化
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
    if (!sheet) sheet = ss.insertSheet(cfg.name);
    if (sheet.getLastRow() === 0) sheet.appendRow(cfg.headers);
  });

  var settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  var existing = {};
  if (settingsSheet.getLastRow() > 1) {
    var data = settingsSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) existing[data[i][0]] = true;
  }
  Object.keys(DEFAULT_SETTINGS).forEach(function(k) {
    if (!existing[k]) settingsSheet.appendRow([k, DEFAULT_SETTINGS[k]]);
  });

  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('シート1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
  }

  Logger.log('全シートの初期化が完了しました。');
  return { success: true };
}

/**
 * JSONレスポンスを生成
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
