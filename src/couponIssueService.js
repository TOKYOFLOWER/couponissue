/**
 * couponIssueService.js - クーポン発行・利用処理
 */

/**
 * 指定会員にクーポンを発行する（1名）
 */
function issueCouponToMember(couponId, memberId) {
  var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', couponId);
  if (!coupon) throw new Error('クーポンマスタが見つかりません: ' + couponId);
  if (!coupon.is_active && coupon.is_active !== 'TRUE') throw new Error('無効なクーポンです');

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
 * 複数会員にクーポンを発行する
 */
function issueCouponToMembers(couponId, memberIds) {
  try {
    var results = [];
    var webappUrl = getSetting('webapp_url');

    for (var i = 0; i < memberIds.length; i++) {
      var result = issueCouponToMember(couponId, memberIds[i]);
      results.push({
        memberId: memberIds[i],
        token: result.token,
        url: webappUrl ? webappUrl + '?page=coupon&token=' + result.token : ''
      });
    }
    return { success: true, issued: results, count: results.length };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * クーポンをトークンから取得する（表示用）
 */
function getCouponByToken(token) {
  try {
    var issued = findRow(SHEET_NAMES.COUPON_ISSUED, 'token', token);
    if (!issued) return { error: 'クーポンが見つかりません' };

    // 期限切れチェック
    if (issued.status === 'unused' && issued.expires_at) {
      var expiryDate = new Date(issued.expires_at);
      if (new Date() > expiryDate) {
        issued.status = 'expired';
        updateIssuedStatus(issued.token, 'expired', '', '');
      }
    }

    var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', issued.coupon_id);
    if (!coupon) return { error: 'クーポン情報が見つかりません' };

    var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', issued.member_id);

    return {
      success: true,
      issued: issued,
      coupon: coupon,
      member: member,
      displayValue: formatCouponValue(coupon)
    };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * クーポンを利用する（排他制御付き）
 */
function useCoupon(token, usedBy) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { error: '処理が混み合っています。しばらく待ってから再度お試しください。' };
  }

  try {
    var issued = findRow(SHEET_NAMES.COUPON_ISSUED, 'token', token);
    if (!issued) {
      lock.releaseLock();
      return { error: 'クーポンが見つかりません' };
    }

    // ステータス再チェック（二重利用防止）
    if (issued.status !== 'unused') {
      lock.releaseLock();
      return { error: 'このクーポンは既に利用済みまたは期限切れです' };
    }

    // 期限切れチェック
    if (issued.expires_at) {
      var expiryDate = new Date(issued.expires_at);
      if (new Date() > expiryDate) {
        updateIssuedStatus(token, 'expired', '', '');
        lock.releaseLock();
        return { error: 'このクーポンは期限切れです' };
      }
    }

    // 利用処理
    updateIssuedStatus(token, 'used', nowISO(), usedBy || 'customer');

    // ポイントクーポンの場合、ポイントを付与
    var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', issued.coupon_id);
    if (coupon && coupon.coupon_type === 'point') {
      var points = parseInt(coupon.coupon_value) || 0;
      if (points > 0) {
        addPointsInternal(issued.member_id, points, 'クーポン利用: ' + coupon.coupon_name, issued.issue_id);
      }
    }

    lock.releaseLock();
    return { success: true, message: 'クーポンを利用しました' };
  } catch (e) {
    lock.releaseLock();
    return { error: e.message };
  }
}

/**
 * 発行済みクーポンのステータスを更新する
 */
function updateIssuedStatus(token, status, usedAt, usedBy) {
  var issuedList = getSheetData(SHEET_NAMES.COUPON_ISSUED);
  for (var i = 0; i < issuedList.length; i++) {
    if (issuedList[i].token === token) {
      var updated = {};
      COUPON_ISSUED_HEADERS.forEach(function(h) {
        updated[h] = issuedList[i][h];
      });
      updated.status = status;
      if (usedAt) updated.used_at = usedAt;
      if (usedBy) updated.used_by = usedBy;
      updateRow(SHEET_NAMES.COUPON_ISSUED, issuedList[i]._rowIndex, COUPON_ISSUED_HEADERS, updated);
      return;
    }
  }
}

/**
 * 期限切れクーポンを一括更新する
 */
function expireOldCoupons() {
  var issued = getSheetData(SHEET_NAMES.COUPON_ISSUED);
  var now = new Date();
  var count = 0;
  for (var i = 0; i < issued.length; i++) {
    if (issued[i].status === 'unused' && issued[i].expires_at) {
      var expiryDate = new Date(issued[i].expires_at);
      if (now > expiryDate) {
        updateIssuedStatus(issued[i].token, 'expired', '', '');
        count++;
      }
    }
  }
  Logger.log('期限切れ処理完了: ' + count + '件');
  return count;
}

/**
 * 全発行済みクーポンを取得する
 */
function getAllIssuedCoupons() {
  return getSheetData(SHEET_NAMES.COUPON_ISSUED);
}
