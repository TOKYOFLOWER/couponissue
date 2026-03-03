/**
 * couponIssueService.js - クーポン発行・利用処理（LockService排他制御）
 */

/**
 * 発行済みクーポン一覧取得
 */
function getIssuedCoupons(params) {
  var data = getSheetData(SHEET_NAMES.COUPON_ISSUED);

  if (params.couponId) {
    data = data.filter(function(c) { return c.coupon_id === params.couponId; });
  }
  if (params.status) {
    data = data.filter(function(c) { return c.status === params.status; });
  }

  data.sort(function(a, b) { return new Date(b.issued_at) - new Date(a.issued_at); });

  var page = parseInt(params.page) || 1;
  var limit = parseInt(params.limit) || 50;
  var offset = (page - 1) * limit;
  var paged = data.slice(offset, offset + limit);

  paged = paged.map(function(c) {
    var obj = {};
    COUPON_ISSUED_HEADERS.forEach(function(h) { obj[h] = c[h]; });
    return obj;
  });

  return { success: true, data: { issued: paged, total: data.length } };
}

/**
 * 単一会員にクーポン発行
 */
function issueCouponToMember(couponId, memberId) {
  var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', couponId);
  if (!coupon) throw new Error('クーポンマスタが見つかりません: ' + couponId);

  var token = generateUuid();
  var now = new Date();
  var expiresAt = '';

  if (coupon.expiry_type === 'relative') {
    expiresAt = addDays(now, parseInt(coupon.expiry_days) || 30).toISOString();
  } else if (coupon.expiry_type === 'absolute') {
    expiresAt = coupon.expiry_date ? new Date(coupon.expiry_date).toISOString() : addDays(now, 30).toISOString();
  }

  var issued = {
    issue_id: generateUuid(),
    coupon_id: couponId,
    member_id: memberId,
    token: token,
    issued_at: nowISO(),
    expires_at: expiresAt,
    status: 'unused',
    used_at: '',
    used_by: ''
  };
  appendRow(SHEET_NAMES.COUPON_ISSUED, COUPON_ISSUED_HEADERS, issued);
  return { token: token, issue_id: issued.issue_id };
}

/**
 * 複数会員にクーポン一括発行
 */
function issueCoupons(couponId, memberIds) {
  if (!couponId || !memberIds || memberIds.length === 0) {
    return { success: false, error: 'クーポンIDと会員IDが必要です' };
  }

  var webappUrl = getSetting('webapp_url');
  var storeName = getSetting('store_name');
  var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', couponId);
  if (!coupon) return { success: false, error: 'クーポンが見つかりません' };

  var results = [];
  for (var i = 0; i < memberIds.length; i++) {
    try {
      var result = issueCouponToMember(couponId, memberIds[i]);
      var couponUrl = webappUrl ? webappUrl + '/coupon.html?token=' + result.token : '';

      // メール送信
      var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', memberIds[i]);
      if (member && member.email) {
        try {
          GmailApp.sendEmail(member.email,
            '【' + storeName + '】クーポンが届きました',
            member.name + ' 様\n\n' + storeName + 'よりクーポンをお届けします。\n\n' +
            'クーポン: ' + coupon.coupon_name + '\n' +
            '特典: ' + formatCouponValue(coupon) + '\n\n' +
            'こちらからご利用ください:\n' + couponUrl + '\n\n' + storeName
          );
        } catch(e) { Logger.log('メール送信エラー: ' + e.message); }
      }

      results.push({ member_id: memberIds[i], token: result.token, url: couponUrl });
    } catch(e) {
      results.push({ member_id: memberIds[i], error: e.message });
    }
  }

  return { success: true, data: { issued: results, count: results.length } };
}

/**
 * クーポン表示データ取得（公開API）
 */
function getCouponView(token) {
  if (!token) return { success: false, error: 'トークンが必要です' };

  var issued = findRow(SHEET_NAMES.COUPON_ISSUED, 'token', token);
  if (!issued) return { success: false, error: 'クーポンが見つかりません' };

  // 期限切れチェック
  if (issued.status === 'unused' && issued.expires_at) {
    if (new Date() > new Date(issued.expires_at)) {
      issued.status = 'expired';
      updateIssuedStatus(token, 'expired', '', '');
    }
  }

  var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', issued.coupon_id);
  if (!coupon) return { success: false, error: 'クーポン情報が見つかりません' };

  var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', issued.member_id);

  var issuedObj = {};
  COUPON_ISSUED_HEADERS.forEach(function(h) { issuedObj[h] = issued[h]; });
  var couponObj = {};
  COUPON_MASTER_HEADERS.forEach(function(h) { couponObj[h] = coupon[h]; });

  return {
    success: true,
    data: {
      issued: issuedObj,
      coupon: couponObj,
      member_name: member ? member.name : '',
      display_value: formatCouponValue(coupon),
      store_name: getSetting('store_name')
    }
  };
}

/**
 * お客様によるクーポン利用（排他制御付き・公開API）
 */
function useCouponByCustomer(token) {
  return useCouponInternal(token, 'customer');
}

/**
 * スタッフによるクーポン利用
 */
function useCouponByStaff(token, staffName) {
  return useCouponInternal(token, staffName || 'staff');
}

/**
 * クーポン利用の内部処理（排他制御）
 */
function useCouponInternal(token, usedBy) {
  if (!token) return { success: false, error: 'トークンが必要です' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch(e) {
    return { success: false, error: '処理が混み合っています。しばらく待ってから再度お試しください。' };
  }

  try {
    var issued = findRow(SHEET_NAMES.COUPON_ISSUED, 'token', token);
    if (!issued) { lock.releaseLock(); return { success: false, error: 'クーポンが見つかりません' }; }
    if (issued.status !== 'unused') { lock.releaseLock(); return { success: false, error: 'このクーポンは既に利用済みまたは期限切れです' }; }

    if (issued.expires_at && new Date() > new Date(issued.expires_at)) {
      updateIssuedStatus(token, 'expired', '', '');
      lock.releaseLock();
      return { success: false, error: 'このクーポンは期限切れです' };
    }

    updateIssuedStatus(token, 'used', nowISO(), usedBy);

    // ポイントクーポンの場合
    var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', issued.coupon_id);
    if (coupon && coupon.coupon_type === 'point') {
      var pts = parseInt(coupon.coupon_value) || 0;
      if (pts > 0) addPointsInternal(issued.member_id, pts, 'クーポン利用: ' + coupon.coupon_name, issued.issue_id);
    }

    lock.releaseLock();
    return { success: true, data: { message: 'クーポンを利用しました' } };
  } catch(e) {
    lock.releaseLock();
    return { success: false, error: e.message };
  }
}

/**
 * 発行済みクーポンステータス更新
 */
function updateIssuedStatus(token, status, usedAt, usedBy) {
  var list = getSheetData(SHEET_NAMES.COUPON_ISSUED);
  for (var i = 0; i < list.length; i++) {
    if (list[i].token === token) {
      var updated = {};
      COUPON_ISSUED_HEADERS.forEach(function(h) { updated[h] = list[i][h]; });
      updated.status = status;
      if (usedAt) updated.used_at = usedAt;
      if (usedBy) updated.used_by = usedBy;
      updateRow(SHEET_NAMES.COUPON_ISSUED, list[i]._rowIndex, COUPON_ISSUED_HEADERS, updated);
      return;
    }
  }
}

/**
 * 期限切れクーポン一括更新
 */
function expireOldCoupons() {
  var issued = getSheetData(SHEET_NAMES.COUPON_ISSUED);
  var now = new Date();
  var count = 0;
  for (var i = 0; i < issued.length; i++) {
    if (issued[i].status === 'unused' && issued[i].expires_at && now > new Date(issued[i].expires_at)) {
      updateIssuedStatus(issued[i].token, 'expired', '', '');
      count++;
    }
  }
  Logger.log('期限切れ処理完了: ' + count + '件');
  return count;
}
