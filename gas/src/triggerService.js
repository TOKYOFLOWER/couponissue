/**
 * triggerService.js - 自動トリガー、ダッシュボード、設定管理
 */

function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) { ScriptApp.deleteTrigger(t); });
  Logger.log('既存トリガーを ' + triggers.length + ' 件削除しました');
}

function setupTriggers() {
  removeTriggers();

  ScriptApp.newTrigger('runBirthdayAutoSend')
    .timeBased().everyDays(1).atHour(9).inTimezone('Asia/Tokyo').create();

  ScriptApp.newTrigger('runExpireCoupons')
    .timeBased().everyDays(1).atHour(0).inTimezone('Asia/Tokyo').create();

  Logger.log('トリガーのセットアップが完了しました');
}

function runBirthdayAutoSend() {
  try { sendBirthdayAutoMails(); } catch(e) { Logger.log('誕生日自動配信エラー: ' + e.message); }
}

function runExpireCoupons() {
  try { expireOldCoupons(); } catch(e) { Logger.log('期限切れ処理エラー: ' + e.message); }
}

/**
 * ダッシュボードデータ取得
 */
function getDashboard() {
  var members = getSheetData(SHEET_NAMES.MEMBERS);
  var activeMembers = members.filter(function(m) { return m.status === 'active'; });

  var today = new Date();
  var todayMMDD = ('0' + (today.getMonth() + 1)).slice(-2) + '/' + ('0' + today.getDate()).slice(-2);
  var birthdayMembers = members.filter(function(m) {
    return m.status === 'active' && m.birthday === todayMMDD;
  }).map(function(m) {
    return { name: m.name, email: m.email, phone: m.phone };
  });

  var issued = getSheetData(SHEET_NAMES.COUPON_ISSUED);
  var unusedCount = issued.filter(function(c) { return c.status === 'unused'; }).length;

  var logs = getSheetData(SHEET_NAMES.MAIL_LOG);
  logs.sort(function(a, b) { return new Date(b.sent_at) - new Date(a.sent_at); });
  var recentLogs = logs.slice(0, 10).map(function(log) {
    var obj = {};
    MAIL_LOG_HEADERS.forEach(function(h) { obj[h] = log[h]; });
    return obj;
  });

  return {
    success: true,
    data: {
      total_members: members.length,
      active_members: activeMembers.length,
      birthday_members: birthdayMembers,
      unused_coupons: unusedCount,
      recent_logs: recentLogs
    }
  };
}

/**
 * 全設定取得
 */
function getAllSettings() {
  var data = getSheetData(SHEET_NAMES.SETTINGS);
  var settings = {};
  data.forEach(function(row) { settings[row.key] = row.value; });
  return { success: true, data: { settings: settings } };
}

/**
 * 設定一括更新
 */
function updateSettingsBulk(data) {
  Object.keys(data).forEach(function(key) { updateSetting(key, data[key]); });
  return { success: true };
}
