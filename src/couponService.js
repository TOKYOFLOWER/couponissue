/**
 * couponService.js - クーポンマスタCRUD
 */

/**
 * クーポンマスタを作成する
 */
function createCoupon(data) {
  try {
    var couponId = generateCouponId();
    var coupon = {
      coupon_id: couponId,
      coupon_name: data.coupon_name || '',
      coupon_type: data.coupon_type || 'percent',
      coupon_value: data.coupon_value || '',
      description: data.description || '',
      expiry_type: data.expiry_type || 'relative',
      expiry_days: data.expiry_days || 30,
      expiry_date: data.expiry_date || '',
      distribution_method: data.distribution_method || 'individual',
      usage_flow: data.usage_flow || 'customer_swipe',
      design_color: data.design_color || '#F8BBD0',
      design_image_url: data.design_image_url || '',
      created_at: nowISO(),
      created_by: getCurrentUserEmail(),
      is_active: true
    };

    appendRow(SHEET_NAMES.COUPON_MASTER, COUPON_MASTER_HEADERS, coupon);
    return { success: true, couponId: couponId };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * クーポンマスタを更新する
 */
function updateCouponMaster(data) {
  try {
    var coupons = getSheetData(SHEET_NAMES.COUPON_MASTER);
    for (var i = 0; i < coupons.length; i++) {
      if (coupons[i].coupon_id === data.coupon_id) {
        var updated = {};
        COUPON_MASTER_HEADERS.forEach(function(h) {
          updated[h] = data[h] !== undefined ? data[h] : coupons[i][h];
        });
        updateRow(SHEET_NAMES.COUPON_MASTER, coupons[i]._rowIndex, COUPON_MASTER_HEADERS, updated);
        return { success: true };
      }
    }
    return { error: 'クーポンが見つかりません' };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * 全クーポンマスタを取得する
 */
function getAllCoupons() {
  try {
    var coupons = getSheetData(SHEET_NAMES.COUPON_MASTER);
    return { success: true, coupons: coupons };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * クーポンマスタを1件取得する
 */
function getCoupon(couponId) {
  try {
    var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', couponId);
    if (!coupon) return { error: 'クーポンが見つかりません' };
    return { success: true, coupon: coupon };
  } catch (e) {
    return { error: e.message };
  }
}

/**
 * クーポン値を表示用にフォーマット
 */
function formatCouponValue(coupon) {
  switch (coupon.coupon_type) {
    case 'percent':
      return coupon.coupon_value + '%OFF';
    case 'fixed':
      return coupon.coupon_value + '円引き';
    case 'benefit':
      return coupon.coupon_value;
    case 'point':
      return coupon.coupon_value + 'ポイント';
    default:
      return coupon.coupon_value;
  }
}
