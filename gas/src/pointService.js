/**
 * pointService.js - ポイント管理
 */

/**
 * ポイント付与（内部用）
 */
function addPointsInternal(memberId, points, reason, relatedId) {
  appendRow(SHEET_NAMES.POINT_HISTORY, POINT_HISTORY_HEADERS, {
    history_id: generateUuid(),
    member_id: memberId,
    change_type: 'earn',
    points: points,
    reason: reason || '',
    related_id: relatedId || '',
    created_at: nowISO()
  });

  var members = getSheetData(SHEET_NAMES.MEMBERS);
  for (var i = 0; i < members.length; i++) {
    if (members[i].member_id === memberId) {
      var updated = {};
      MEMBER_HEADERS.forEach(function(h) { updated[h] = members[i][h]; });
      updated.total_points = (parseInt(members[i].total_points) || 0) + points;
      updated.available_points = (parseInt(members[i].available_points) || 0) + points;
      updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
      return;
    }
  }
}

/**
 * ポイント手動調整（管理API）
 */
function adjustPoints(data) {
  var memberId = data.member_id;
  var changeType = data.change_type || 'earn';
  var pts = parseInt(data.points);
  var reason = data.reason || '手動調整';

  if (!memberId) return { success: false, error: '会員IDが必要です' };
  if (!pts || pts <= 0) return { success: false, error: 'ポイント数を正しく入力してください' };

  var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', memberId);
  if (!member) return { success: false, error: '会員が見つかりません' };

  if (changeType === 'use') {
    var available = parseInt(member.available_points) || 0;
    if (pts > available) return { success: false, error: '利用可能ポイントが不足しています（残: ' + available + 'pt）' };

    appendRow(SHEET_NAMES.POINT_HISTORY, POINT_HISTORY_HEADERS, {
      history_id: generateUuid(), member_id: memberId, change_type: 'use',
      points: -pts, reason: reason, related_id: '', created_at: nowISO()
    });

    var members = getSheetData(SHEET_NAMES.MEMBERS);
    for (var i = 0; i < members.length; i++) {
      if (members[i].member_id === memberId) {
        var updated = {};
        MEMBER_HEADERS.forEach(function(h) { updated[h] = members[i][h]; });
        updated.available_points = available - pts;
        updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
        break;
      }
    }
  } else {
    addPointsInternal(memberId, pts, reason, '');
  }

  return { success: true };
}

/**
 * ポイント履歴取得
 */
function getPointHistory(memberId) {
  if (!memberId) return { success: false, error: '会員IDが必要です' };
  var history = findRows(SHEET_NAMES.POINT_HISTORY, 'member_id', memberId);
  history.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });

  history = history.map(function(h) {
    var obj = {};
    POINT_HISTORY_HEADERS.forEach(function(k) { obj[k] = h[k]; });
    return obj;
  });

  return { success: true, data: { history: history } };
}
