/**
 * mailService.js - メール送信
 */

/**
 * テンプレート変数置換
 */
function replaceTemplateVars(text, vars) {
  var result = text;
  Object.keys(vars).forEach(function(key) {
    result = result.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), vars[key] || '');
  });
  return result;
}

/**
 * メール送信（一斉/個別）
 */
function sendMail(data) {
  var type = data.type || 'magazine';
  var subject = data.subject || '';
  var body = data.body || '';
  var couponId = data.coupon_id || '';
  var memberIds = data.member_ids || [];

  if (!subject || !body) return { success: false, error: '件名と本文を入力してください' };

  var storeName = getSetting('store_name');
  var webappUrl = getSetting('webapp_url');
  var targetMembers;

  if (type === 'individual' && memberIds.length > 0) {
    var allMembers = getSheetData(SHEET_NAMES.MEMBERS);
    targetMembers = allMembers.filter(function(m) {
      return memberIds.indexOf(m.member_id) !== -1 && m.email;
    });
  } else {
    targetMembers = getSheetData(SHEET_NAMES.MEMBERS).filter(function(m) {
      return m.status === 'active' && (m.mail_opt_in === true || m.mail_opt_in === 'TRUE') && m.email;
    });
  }

  if (targetMembers.length === 0) return { success: false, error: '配信対象の会員がいません' };

  var sentCount = 0;
  var failCount = 0;

  targetMembers.forEach(function(member) {
    try {
      var couponUrl = '';
      if (couponId) {
        var issueResult = issueCouponToMember(couponId, member.member_id);
        couponUrl = webappUrl ? webappUrl + '/coupon.html?token=' + issueResult.token : '';
      }

      var unsubscribeUrl = webappUrl ? webappUrl + '/unsubscribe.html?mid=' + member.member_id : '';
      var vars = { name: member.name, coupon_url: couponUrl, store_name: storeName, unsubscribe_url: unsubscribeUrl };

      var personalizedSubject = replaceTemplateVars(subject, vars);
      var personalizedBody = replaceTemplateVars(body, vars);
      personalizedBody += '\n\n---\n配信停止はこちら: ' + unsubscribeUrl;

      GmailApp.sendEmail(member.email, personalizedSubject, personalizedBody);
      sentCount++;
    } catch(e) {
      Logger.log('メール送信エラー (' + member.email + '): ' + e.message);
      failCount++;
    }
  });

  var logStatus = failCount === 0 ? 'success' : (sentCount === 0 ? 'failed' : 'partial_fail');
  appendRow(SHEET_NAMES.MAIL_LOG, MAIL_LOG_HEADERS, {
    log_id: generateUuid(),
    mail_type: type === 'individual' ? 'individual' : 'magazine',
    subject: subject,
    body_template: body.substring(0, 200),
    sent_to: type === 'individual' ? memberIds.join(',') : 'ALL',
    sent_at: nowISO(),
    sent_count: sentCount,
    status: logStatus
  });

  return { success: true, data: { sent_count: sentCount, fail_count: failCount } };
}

/**
 * メール配信ログ取得
 */
function getMailLogs(params) {
  var data = getSheetData(SHEET_NAMES.MAIL_LOG);
  data.sort(function(a, b) { return new Date(b.sent_at) - new Date(a.sent_at); });

  var page = parseInt(params.page) || 1;
  var limit = parseInt(params.limit) || 20;
  var offset = (page - 1) * limit;
  var paged = data.slice(offset, offset + limit);

  paged = paged.map(function(log) {
    var obj = {};
    MAIL_LOG_HEADERS.forEach(function(h) { obj[h] = log[h]; });
    return obj;
  });

  return { success: true, data: { logs: paged, total: data.length } };
}

/**
 * 誕生日自動配信
 */
function sendBirthdayAutoMails() {
  var birthdayCouponId = getSetting('birthday_coupon_id');
  if (!birthdayCouponId) { Logger.log('誕生日クーポンID未設定'); return 0; }

  var sendDay = parseInt(getSetting('birthday_send_day')) || 1;
  var today = new Date();
  if (today.getDate() !== sendDay) return 0;

  var currentMonth = ('0' + (today.getMonth() + 1)).slice(-2);
  var members = getSheetData(SHEET_NAMES.MEMBERS);
  var storeName = getSetting('store_name');
  var webappUrl = getSetting('webapp_url');
  var yearMonth = today.getFullYear() + '-' + currentMonth;
  var mailLogs = getSheetData(SHEET_NAMES.MAIL_LOG);
  var sentCount = 0;

  members.forEach(function(member) {
    if (member.status !== 'active') return;
    if (member.mail_opt_in !== true && member.mail_opt_in !== 'TRUE') return;
    if (!member.email || !member.birthday) return;

    var birthMonth = String(member.birthday).split('/')[0];
    if (birthMonth.length === 1) birthMonth = '0' + birthMonth;
    if (birthMonth !== currentMonth) return;

    var alreadySent = mailLogs.some(function(log) {
      return log.mail_type === 'birthday_auto' && log.sent_to === member.member_id &&
             log.sent_at && log.sent_at.indexOf(yearMonth) !== -1;
    });
    if (alreadySent) return;

    try {
      var issueResult = issueCouponToMember(birthdayCouponId, member.member_id);
      var couponUrl = webappUrl ? webappUrl + '/coupon.html?token=' + issueResult.token : '';
      var unsubscribeUrl = webappUrl ? webappUrl + '/unsubscribe.html?mid=' + member.member_id : '';

      var subject = '【' + storeName + '】お誕生日おめでとうございます！';
      var body = member.name + ' 様\n\nお誕生日おめでとうございます！\n' +
        storeName + 'より、バースデークーポンをお届けします。\n\n' +
        'クーポンはこちら: ' + couponUrl + '\n\n素敵な一日をお過ごしください。\n\n' + storeName +
        '\n\n---\n配信停止はこちら: ' + unsubscribeUrl;

      GmailApp.sendEmail(member.email, subject, body);

      appendRow(SHEET_NAMES.MAIL_LOG, MAIL_LOG_HEADERS, {
        log_id: generateUuid(), mail_type: 'birthday_auto', subject: subject,
        body_template: 'birthday_template', sent_to: member.member_id,
        sent_at: nowISO(), sent_count: 1, status: 'success'
      });
      sentCount++;
    } catch(e) { Logger.log('誕生日メール送信エラー: ' + e.message); }
  });

  Logger.log('誕生日メール送信完了: ' + sentCount + '件');
  return sentCount;
}
