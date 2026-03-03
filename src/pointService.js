/**
 * pointService.js - ポイント付与・利用・履歴記録
 */

/**
 * ポイントを付与する（内部用）
 */
function addPointsInternal(memberId, points, reason, relatedId) {
  // ポイント履歴に記録
  appendRow(SHEET_NAMES.POINT_HISTORY, POINT_HISTORY_HEADERS, {
    history_id: generateUuid(),
    member_id: memberId,
    change_type: 'earn',
    points: points,
    reason: reason || '',
    related_id: relatedId || '',
    created_at: nowISO()
  });

  // 会員のポイントを更新
  var members = getSheetData(SHEET_NAMES.MEMBERS);
  for (var i = 0; i < members.length; i++) {
    if (members[i].member_id === memberId) {
      var updated = {};
      MEMBER_HEADERS.forEach(function(h) {
        updated[h] = members[i][h];
      });
      updated.total_points = (parseInt(members[i].total_points) || 0) + points;
      updated.available_points = (parseInt(members[i].available_points) || 0) + points;
      updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
      return;
    }
  }
}

/**
 * ポイントを付与する（管理画面用）
 */
function addPoints(memberId, points, reason) {
  try {
    var pts = parseInt(points);
    if (!pts || pts <= 0) return { error: 'ポイント数を正しく入力してください' };
    addPointsInternal(memberId, pts, reason || '手動付与', '');
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * ポイントを利用する
 */
function usePoints(memberId, points, reason) {
  try {
    var pts = parseInt(points);
    if (!pts || pts <= 0) return { error: 'ポイント数を正しく入力してください' };

    var member = findRow(SHEET_NAMES.MEMBERS, 'member_id', memberId);
    if (!member) return { error: '会員が見つかりません' };

    var available = parseInt(member.available_points) || 0;
    if (pts > available) return { error: '利用可能ポイントが不足しています（残: ' + available + 'pt）' };

    // ポイント履歴に記録
    appendRow(SHEET_NAMES.POINT_HISTORY, POINT_HISTORY_HEADERS, {
      history_id: generateUuid(),
      member_id: memberId,
      change_type: 'use',
      points: -pts,
      reason: reason || 'ポイント利用',
      related_id: '',
      created_at: nowISO()
    });

    // 会員のポイントを更新
    var members = getSheetData(SHEET_NAMES.MEMBERS);
    for (var i = 0; i < members.length; i++) {
      if (members[i].member_id === memberId) {
        var updated = {};
        MEMBER_HEADERS.forEach(function(h) {
          updated[h] = members[i][h];
        });
        updated.available_points = available - pts;
        updateRow(SHEET_NAMES.MEMBERS, members[i]._rowIndex, MEMBER_HEADERS, updated);
        break;
      }
    }

    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * ポイント履歴を取得する
 */
function getPointHistory(memberId) {
  try {
    var history = findRows(SHEET_NAMES.POINT_HISTORY, 'member_id', memberId);
    history.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return { success: true, history: history };
  } catch (e) {
    return { error: e.message };
  }
}
