/**
 * mailService.js - メール送信（一斉/個別/誕生日配信、配信停止処理）
 */

/**
 * テンプレート変数を置換する
 */
function replaceTemplateVars(text, vars) {
  var result = text;
  var keys = Object.keys(vars);
  for (var i = 0; i < keys.length; i++) {
    var regex = new RegExp('\\{\\{' + keys[i] + '\\}\\}', 'g');
    result = result.replace(regex, vars[i] || vars[keys[i]] || '');
  }
  return result;
}

/**
 * メルマガ一斉配信
 */
function sendMagazine(subject, body, couponId) {
  try {
    var members = getSheetData(SHEET_NAMES.MEMBERS);
    var optInMembers = members.filter(function(m) {
      return m.status === 'active' && (m.mail_opt_in === true || m.mail_opt_in === 'TRUE') && m.email;
    });

    if (optInMembers.length === 0) {
      return { error: '配信対象の会員がいません' };
    }

    var storeName = getSetting('store_name');
    var webappUrl = getSetting('webapp_url');
    var sentCount = 0;
    var failCount = 0;

    for (var i = 0; i < optInMembers.length; i++) {
      try {
        var member = optInMembers[i];
        var couponUrl = '';

        // クーポン付きの場合、発行してURLを生成
        if (couponId) {
          var issueResult = issueCouponToMember(couponId, member.member_id);
          couponUrl = webappUrl ? webappUrl + '?page=coupon&token=' + issueResult.token : '';
        }

        var unsubscribeUrl = webappUrl ? webappUrl + '?page=unsubscribe&mid=' + member.member_id : '';

        var vars = {
          name: member.name,
          coupon_url: couponUrl,
          store_name: storeName,
          unsubscribe_url: unsubscribeUrl
        };

        var personalizedBody = replaceTemplateVars(body, vars);
        var personalizedSubject = replaceTemplateVars(subject, vars);

        // 配信停止リンクをフッターに追加
        personalizedBody += '\n\n---\n配信停止はこちら: ' + unsubscribeUrl;

        GmailApp.sendEmail(member.email, personalizedSubject, personalizedBody);
        sentCount++;
      } catch (e) {
        Logger.log('メール送信エラー (' + optInMembers[i].email + '): ' + e.message);
        failCount++;
      }
    }

    // メールログ記録
    var logStatus = failCount === 0 ? 'success' : (sentCount === 0 ? 'failed' : 'partial_fail');
    appendRow(SHEET_NAMES.MAIL_LOG, MAIL_LOG_HEADERS, {
      log_id: generateUuid(),
      mail_type: 'magazine',
      subject: subject,
      body_template: body.substring(0, 200),
      sent_to: 'ALL',
      sent_at: nowISO(),
      sent_count: sentCount,
      status: logStatus
    });

    return { success: true, sentCount: sentCount, failCount: failCount };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 個別メール送信
 */
function sendIndividualMail(memberId, subject, body, couponId) {
  try {
    var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', memberId);
    if (!member) return { error: '会員が見つかりません' };
    if (!member.email) return { error: 'メールアドレスが登録されていません' };

    var storeName = getSetting('store_name');
    var webappUrl = getSetting('webapp_url');
    var couponUrl = '';

    if (couponId) {
      var issueResult = issueCouponToMember(couponId, memberId);
      couponUrl = webappUrl ? webappUrl + '?page=coupon&token=' + issueResult.token : '';
    }

    var unsubscribeUrl = webappUrl ? webappUrl + '?page=unsubscribe&mid=' + member.member_id : '';

    var vars = {
      name: member.name,
      coupon_url: couponUrl,
      store_name: storeName,
      unsubscribe_url: unsubscribeUrl
    };

    var personalizedBody = replaceTemplateVars(body, vars);
    var personalizedSubject = replaceTemplateVars(subject, vars);
    personalizedBody += '\n\n---\n配信停止はこちら: ' + unsubscribeUrl;

    GmailApp.sendEmail(member.email, personalizedSubject, personalizedBody);

    appendRow(SHEET_NAMES.MAIL_LOG, MAIL_LOG_HEADERS, {
      log_id: generateUuid(),
      mail_type: 'individual',
      subject: subject,
      body_template: body.substring(0, 200),
      sent_to: memberId,
      sent_at: nowISO(),
      sent_count: 1,
      status: 'success'
    });

    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 誕生日自動配信
 */
function sendBirthdayAutoMails() {
  var birthdayCouponId = getSetting('birthday_coupon_id');
  if (!birthdayCouponId) {
    Logger.log('誕生日クーポンIDが未設定です');
    return 0;
  }

  var sendDay = parseInt(getSetting('birthday_send_day')) || 1;
  var today = new Date();
  var todayDay = today.getDate();

  // 送信日でなければスキップ
  if (todayDay !== sendDay) return 0;

  var currentMonth = ('0' + (today.getMonth() + 1)).slice(-2);
  var members = getSheetData(SHEET_NAMES.MEMBERS);
  var storeName = getSetting('store_name');
  var webappUrl = getSetting('webapp_url');
  var sentCount = 0;

  // 当月配信済みチェック用
  var mailLogs = getSheetData(SHEET_NAMES.MAIL_LOG);
  var yearMonth = today.getFullYear() + '-' + currentMonth;

  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (member.status !== 'active') continue;
    if (member.mail_opt_in !== true && member.mail_opt_in !== 'TRUE') continue;
    if (!member.email || !member.birthday) continue;

    // 誕生月チェック（MM/DD形式）
    var birthMonth = String(member.birthday).split('/')[0];
    if (birthMonth.length === 1) birthMonth = '0' + birthMonth;
    if (birthMonth !== currentMonth) continue;

    // 重複チェック（当月に同じ会員に誕生日メールを送信済みか）
    var alreadySent = mailLogs.some(function(log) {
      return log.mail_type === 'birthday_auto' &&
             log.sent_to === member.member_id &&
             log.sent_at && log.sent_at.indexOf(yearMonth) !== -1;
    });
    if (alreadySent) continue;

    try {
      var issueResult = issueCouponToMember(birthdayCouponId, member.member_id);
      var couponUrl = webappUrl ? webappUrl + '?page=coupon&token=' + issueResult.token : '';

      var subject = '【' + storeName + '】お誕生日おめでとうございます！';
      var body = member.name + ' 様\n\n' +
        'お誕生日おめでとうございます！\n' +
        storeName + 'より、バースデークーポンをお届けします。\n\n' +
        'クーポンはこちら: ' + couponUrl + '\n\n' +
        '素敵な一日をお過ごしください。\n\n' +
        storeName;

      var unsubscribeUrl = webappUrl ? webappUrl + '?page=unsubscribe&mid=' + member.member_id : '';
      body += '\n\n---\n配信停止はこちら: ' + unsubscribeUrl;

      GmailApp.sendEmail(member.email, subject, body);

      appendRow(SHEET_NAMES.MAIL_LOG, MAIL_LOG_HEADERS, {
        log_id: generateUuid(),
        mail_type: 'birthday_auto',
        subject: subject,
        body_template: 'birthday_template',
        sent_to: member.member_id,
        sent_at: nowISO(),
        sent_count: 1,
        status: 'success'
      });

      sentCount++;
    } catch (e) {
      Logger.log('誕生日メール送信エラー (' + member.email + '): ' + e.message);
    }
  }

  Logger.log('誕生日メール送信完了: ' + sentCount + '件');
  return sentCount;
}

/**
 * メールログを取得する
 */
function getMailLogs() {
  try {
    var logs = getSheetData(SHEET_NAMES.MAIL_LOG);
    logs.sort(function(a, b) {
      return new Date(b.sent_at) - new Date(a.sent_at);
    });
    return { success: true, logs: logs };
  } catch (e) {
    return { error: e.message };
  }
}
