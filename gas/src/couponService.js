/**
 * couponService.js - クーポンマスタCRUD
 */

/**
 * クーポンマスタ一覧取得
 */
function getCouponMasters() {
  var data = getSheetData(SHEET_NAMES.COUPON_MASTER);
  var coupons = data.map(function(c) {
    var obj = {};
    COUPON_MASTER_HEADERS.forEach(function(h) { obj[h] = c[h]; });
    if (obj.expiry_date && obj.expiry_date instanceof Date) {
      obj.expiry_date = Utilities.formatDate(obj.expiry_date, 'Asia/Tokyo', 'yyyy/MM/dd');
    }
    if (obj.created_at && obj.created_at instanceof Date) {
      obj.created_at = toJSTString(obj.created_at);
    }
    return obj;
  });
  return { success: true, data: { coupons: coupons } };
}

/**
 * クーポンマスタ詳細取得
 */
function getCouponMasterDetail(couponId) {
  var coupon = findRow(SHEET_NAMES.COUPON_MASTER, 'coupon_id', couponId);
  if (!coupon) return { success: false, error: 'クーポンが見つかりません' };
  var obj = {};
  COUPON_MASTER_HEADERS.forEach(function(h) { obj[h] = coupon[h]; });
  if (obj.expiry_date && obj.expiry_date instanceof Date) {
    obj.expiry_date = Utilities.formatDate(obj.expiry_date, 'Asia/Tokyo', 'yyyy/MM/dd');
  }
  if (obj.created_at && obj.created_at instanceof Date) {
    obj.created_at = toJSTString(obj.created_at);
  }
  return { success: true, data: obj };
}

/**
 * クーポンマスタ作成
 */
function createCouponMaster(data) {
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
    created_by: data.created_by || '',
    is_active: true
  };
  appendRow(SHEET_NAMES.COUPON_MASTER, COUPON_MASTER_HEADERS, coupon);
  return { success: true, data: { coupon_id: couponId } };
}

/**
 * クーポンマスタ更新
 */
function updateCouponMaster(data) {
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
  return { success: false, error: 'クーポンが見つかりません' };
}

/**
 * クーポン値の表示フォーマット
 */
function formatCouponValue(coupon) {
  switch (coupon.coupon_type) {
    case 'percent': return coupon.coupon_value + '%OFF';
    case 'fixed': return coupon.coupon_value + '円引き';
    case 'benefit': return String(coupon.coupon_value);
    case 'point': return coupon.coupon_value + 'ポイント';
    default: return String(coupon.coupon_value);
  }
}
