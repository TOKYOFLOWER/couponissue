/**
 * memberService.js - 会員CRUD
 */

/**
 * 会員一覧取得（検索・ページネーション対応）
 */
function getMembers(params) {
  var data = getSheetData(SHEET_NAMES.MEMBERS);
  var search = (params.search || '').toLowerCase();

  if (search) {
    data = data.filter(function(m) {
      return (m.name && m.name.toLowerCase().indexOf(search) !== -1) ||
             (m.name_kana && m.name_kana.toLowerCase().indexOf(search) !== -1) ||
             (m.phone && String(m.phone).indexOf(search) !== -1) ||
             (m.email && m.email.toLowerCase().indexOf(search) !== -1);
    });
  }

  var total = data.length;
  var page = parseInt(params.page) || 1;
  var limit = parseInt(params.limit) || 20;
  var offset = (page - 1) * limit;
  var paged = data.slice(offset, offset + limit);

  // _rowIndex を除去
  paged = paged.map(function(m) {
    var obj = {};
    MEMBER_HEADERS.forEach(function(h) { obj[h] = m[h]; });
    return obj;
  });

  return { success: true, data: { members: paged, total: total, page: page, limit: limit } };
}

/**
 * 会員詳細取得
 */
function getMemberDetail(memberId) {
  var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', memberId);
  if (!member) return { success: false, error: '会員が見つかりません' };
  var obj = {};
  MEMBER_HEADERS.forEach(function(h) { obj[h] = member[h]; });
  return { success: true, data: obj };
}

/**
 * 会員登録（スタッフ）
 */
function createMember(data) {
  var memberId = generateUuid();
  var member = {
    member_id: memberId,
    name: data.name || '',
    name_kana: data.name_kana || '',
    phone: data.phone || '',
    email: data.email || '',
    birthday: data.birthday || '',
    registration_date: nowISO(),
    registration_method: 'staff',
    total_points: 0,
    available_points: 0,
    memo: data.memo || '',
    status: 'active',
    mail_opt_in: data.mail_opt_in !== false
  };
  appendRow(SHEET_NAMES.MEMBERS, MEMBER_HEADERS, member);
  return { success: true, data: { member_id: memberId } };
}

/**
 * 会員登録（お客様Web登録 - 公開API）
 */
function registerMemberPublic(data) {
  var memberId = generateUuid();
  var member = {
    member_id: memberId,
    name: data.name || '',
    name_kana: data.name_kana || '',
    phone: data.phone || '',
    email: data.email || '',
    birthday: data.birthday || '',
    registration_date: nowISO(),
    registration_method: 'web',
    total_points: 0,
    available_points: 0,
    memo: '',
    status: 'active',
    mail_opt_in: data.mail_opt_in !== false
  };
  appendRow(SHEET_NAMES.MEMBERS, MEMBER_HEADERS, member);

  // ウェルカムクーポン自動発行
  var welcomeCouponId = getSetting('welcome_coupon_id');
  if (welcomeCouponId) {
    try { issueCouponToMember(welcomeCouponId, memberId); } catch(e) {
      Logger.log('ウェルカムクーポン発行エラー: ' + e.message);
    }
  }

  // ウェルカムメール送信
  if (member.email) {
    try {
      var storeName = getSetting('store_name');
      GmailApp.sendEmail(member.email,
        '【' + storeName + '】会員登録ありがとうございます',
        member.name + ' 様\n\n' + storeName + 'の会員登録が完了しました。\n今後ともよろしくお願いいたします。\n\n' + storeName
      );
    } catch(e) { Logger.log('ウェルカムメール送信エラー: ' + e.message); }
  }

  return { success: true, data: { member_id: memberId } };
}

/**
 * 会員情報更新
 */
function updateMember(data) {
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
  return { success: false, error: '会員が見つかりません' };
}

/**
 * 会員削除（論理削除）
 */
function deleteMember(memberId) {
  return updateMember({ member_id: memberId, status: 'inactive' });
}

/**
 * 配信停止処理（公開API）
 */
function processUnsubscribe(memberId) {
  if (!memberId) return { success: false, error: 'member_idが必要です' };
  var members = getSheetData(SHEET_NAMES.MEMBERS);
  for (var i = 0; i < members.length; i++) {
    if (members[i].member_id === memberId) {
      var updated = {};
      MEMBER_HEADERS.forEach(function(h) { updated[h] = members[i][h]; });
      updated.mail_opt_in = false;
      updated.status = 'unsubscribed';
      updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
      return { success: true, data: { message: '配信停止が完了しました' } };
    }
  }
  return { success: false, error: '会員が見つかりません' };
}
