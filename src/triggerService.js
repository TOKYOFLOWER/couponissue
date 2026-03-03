/**
 * triggerService.js - 自動トリガー（誕生日配信、期限切れ処理）
 */

/**
 * 既存トリガーを全削除する
 */
function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  Logger.log('既存トリガーを ' + triggers.length + ' 件削除しました');
}

/**
 * トリガーをセットアップする
 */
function setupTriggers() {
  // まず既存トリガーを全削除（重複防止）
  removeTriggers();

  // 毎日9:00 JST: 誕生日クーポン配信チェック
  ScriptApp.newTrigger('runBirthdayAutoSend')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .inTimezone('Asia/Tokyo')
    .create();

  // 毎日0:00 JST: 期限切れクーポンのステータス更新
  ScriptApp.newTrigger('runExpireCoupons')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .inTimezone('Asia/Tokyo')
    .create();

  Logger.log('トリガーのセットアップが完了しました');
}

/**
 * 誕生日自動配信の実行関数（トリガーから呼ばれる）
 */
function runBirthdayAutoSend() {
  try {
    var count = sendBirthdayAutoMails();
    Logger.log('誕生日自動配信完了: ' + count + '件');
  } catch (e) {
    Logger.log('誕生日自動配信エラー: ' + e.message);
  }
}

/**
 * 期限切れクーポンの処理（トリガーから呼ばれる）
 */
function runExpireCoupons() {
  try {
    var count = expireOldCoupons();
    Logger.log('期限切れ処理完了: ' + count + '件');
  } catch (e) {
    Logger.log('期限切れ処理エラー: ' + e.message);
  }
}

/**
 * ダッシュボードデータを取得する
 */
function getDashboardData() {
  try {
    var members = getSheetData(SHEET_NAMES.MEMBERS);
    var activeMembers = members.filter(function(m) { return m.status === 'active'; });

    // 本日誕生日の会員
    var today = new Date();
    var todayMMDD = ('0' + (today.getMonth() + 1)).slice(-2) + '/' + ('0' + today.getDate()).slice(-2);
    var birthdayMembers = members.filter(function(m) {
      return m.status === 'active' && m.birthday === todayMMDD;
    });

    // 未使用クーポン数
    var issued = getSheetData(SHEET_NAMES.COUPON_ISSUED);
    var unusedCoupons = issued.filter(function(c) { return c.status === 'unused'; });

    // 直近配信ログ（最新10件）
    var logs = getSheetData(SHEET_NAMES.MAIL_LOG);
    logs.sort(function(a, b) {
      return new Date(b.sent_at) - new Date(a.sent_at);
    });
    var recentLogs = logs.slice(0, 10);

    return {
      success: true,
      totalMembers: members.length,
      activeMembers: activeMembers.length,
      birthdayMembers: birthdayMembers,
      unusedCoupons: unusedCoupons.length,
      recentLogs: recentLogs
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 全設定を取得する
 */
function getAllSettings() {
  try {
    var data = getSheetData(SHEET_NAMES.SETTINGS);
    var settings = {};
    data.forEach(function(row) {
      settings[row.key] = row.value;
    });
    return { success: true, settings: settings };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 設定を一括更新する
 */
function updateSettings(data) {
  try {
    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
      updateSetting(keys[i], data[keys[i]]);
    }
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
