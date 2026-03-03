/**
 * memberService.js - 会員CRUD全機能
 */

/**
 * 会員を登録する
 */
function registerMember(data) {
  try {
    var memberId = generateUuid();
    var member = {
      member_id: memberId,
      name: data.name || '',
      name_kana: data.name_kana || '',
      phone: data.phone || '',
      email: data.email || '',
      birthday: data.birthday || '',
      registration_date: nowISO(),
      registration_method: data.registration_method || 'web',
      total_points: 0,
      available_points: 0,
      memo: data.memo || '',
      status: 'active',
      mail_opt_in: data.mail_opt_in !== false
    };

    appendRow(SHEET_NAMES.MEMBERS, MEMBER_HEADERS, member);

    // ウェルカムクーポンの自動発行
    var welcomeCouponId = getSetting('welcome_coupon_id');
    if (welcomeCouponId) {
      try {
        issueCouponToMember(welcomeCouponId, memberId);
      } catch (e) {
        Logger.log('ウェルカムクーポン発行エラー: ' + e.message);
      }
    }

    // Web登録の場合、ウェルカムメール送信
    if (member.registration_method === 'web' && member.email) {
      try {
        var storeName = getSetting('store_name');
        var subject = '【' + storeName + '】会員登録ありがとうございます';
        var body = member.name + ' 様\n\n' +
          storeName + 'の会員登録が完了しました。\n' +
          '今後ともよろしくお願いいたします。\n\n' +
          storeName;
        GmailApp.sendEmail(member.email, subject, body);
      } catch (e) {
        Logger.log('ウェルカムメール送信エラー: ' + e.message);
      }
    }

    return { success: true, memberId: memberId };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 会員情報を更新する
 */
function updateMember(data) {
  try {
    var members = getSheetData(SHEET_NAMES.MEMBERS);
    for (var i = 0; i < members.length; i++) {
      if (members[i].member_id === data.member_id) {
        var updated = {};
        MEMBER_HEADERS.forEach(function(h) {
          updated[h] = data[h] !== undefined ? data[h] : members[i][h];
        });
        updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
        return { success: true };
      }
    }
    return { error: '会員が見つかりません' };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 会員を検索する（名前・電話・メールで部分一致）
 */
function searchMembers(query) {
  try {
    if (!query) return getAllMembers();
    var data = getSheetData(SHEET_NAMES.MEMBERS);
    var q = query.toLowerCase();
    var results = data.filter(function(m) {
      return (m.name && m.name.toLowerCase().indexOf(q) !== -1) ||
             (m.name_kana && m.name_kana.toLowerCase().indexOf(q) !== -1) ||
             (m.phone && String(m.phone).indexOf(q) !== -1) ||
             (m.email && m.email.toLowerCase().indexOf(q) !== -1);
    });
    return { success: true, members: results };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 会員情報を取得する
 */
function getMember(memberId) {
  try {
    var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', memberId);
    if (!member) return { error: '会員が見つかりません' };
    return { success: true, member: member };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 全会員を取得する
 */
function getAllMembers() {
  try {
    var members = getSheetData(SHEET_NAMES.MEMBERS);
    return { success: true, members: members };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 配信停止処理
 */
function unsubscribeMember(memberId) {
  try {
    var members = getSheetData(SHEET_NAMES.MEMBERS);
    for (var i = 0; i < members.length; i++) {
      if (members[i].member_id === memberId) {
        var updated = {};
        MEMBER_HEADERS.forEach(function(h) {
          updated[h] = members[i][h];
        });
        updated.mail_opt_in = false;
        updated.status = 'unsubscribed';
        updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
        return { success: true };
      }
    }
    return { error: '会員が見つかりません' };
  } catch (e) {
    return { error: e.message };
  }
}
