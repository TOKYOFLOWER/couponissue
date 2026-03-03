/**
 * main.js - doGet / doPost エントリーポイント
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
  var apiKey = (e && e.parameter) ? e.parameter.apiKey || '' : '';
  var result;

  try {
    // 公開API（apiKey不要）
    if (action === 'couponView') {
      result = getCouponView(e.parameter.token || '');
    } else if (action === 'unsubscribe') {
      result = processUnsubscribe(e.parameter.memberId || '');
    }
    // 管理API（認証チェック）
    else if (!isValidApiKey(apiKey)) {
      result = { success: false, error: '認証エラー' };
    } else {
      switch (action) {
        case 'dashboard':
          result = getDashboard();
          break;
        case 'members':
          result = getMembers(e.parameter);
          break;
        case 'member':
          result = getMemberDetail(e.parameter.id || '');
          break;
        case 'couponMasters':
          result = getCouponMasters();
          break;
        case 'couponMaster':
          result = getCouponMasterDetail(e.parameter.id || '');
          break;
        case 'issuedCoupons':
          result = getIssuedCoupons(e.parameter);
          break;
        case 'mailLogs':
          result = getMailLogs(e.parameter);
          break;
        case 'pointHistory':
          result = getPointHistory(e.parameter.memberId || '');
          break;
        case 'settings':
          result = getAllSettings();
          break;
        default:
          // GET フォールバック（POSTが失敗した場合のリクエスト）
          if (e.parameter.data) {
            result = handlePostFallback(action, apiKey, e.parameter.data);
          } else {
            result = { success: false, error: '不明なアクション: ' + action };
          }
      }
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return jsonResponse(result);
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ success: false, error: 'リクエスト解析エラー' });
  }

  var action = body.action || '';
  var apiKey = body.apiKey || '';
  var data = body.data || {};
  var result;

  try {
    // 公開API（apiKey不要）
    if (action === 'registerMember') {
      result = registerMemberPublic(data);
    } else if (action === 'useCoupon') {
      result = useCouponByCustomer(data.token || body.token || '');
    }
    // 管理API（認証チェック）
    else if (!isValidApiKey(apiKey)) {
      result = { success: false, error: '認証エラー' };
    } else {
      switch (action) {
        case 'createMember':
          result = createMember(data);
          break;
        case 'updateMember':
          result = updateMember(data);
          break;
        case 'deleteMember':
          result = deleteMember(data.member_id || '');
          break;
        case 'createCouponMaster':
          result = createCouponMaster(data);
          break;
        case 'updateCouponMaster':
          result = updateCouponMaster(data);
          break;
        case 'issueCoupons':
          result = issueCoupons(data.coupon_id || '', data.member_ids || []);
          break;
        case 'useCouponByStaff':
          result = useCouponByStaff(data.token || '', data.staff_name || '');
          break;
        case 'sendMail':
          result = sendMail(data);
          break;
        case 'adjustPoints':
          result = adjustPoints(data);
          break;
        case 'updateSettings':
          result = updateSettingsBulk(data);
          break;
        case 'initializeSheets':
          result = initializeSheets();
          break;
        default:
          result = { success: false, error: '不明なアクション: ' + action };
      }
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return jsonResponse(result);
}

/**
 * GETフォールバック（POST失敗時にGETで代替実行）
 */
function handlePostFallback(action, apiKey, dataStr) {
  var data;
  try { data = JSON.parse(dataStr); } catch(e) { data = {}; }

  // 公開API
  if (action === 'registerMember') return registerMemberPublic(data);
  if (action === 'useCoupon') return useCouponByCustomer(data.token || '');

  // 管理API
  if (!isValidApiKey(apiKey)) return { success: false, error: '認証エラー' };

  switch (action) {
    case 'createMember': return createMember(data);
    case 'updateMember': return updateMember(data);
    case 'deleteMember': return deleteMember(data.member_id || '');
    case 'createCouponMaster': return createCouponMaster(data);
    case 'updateCouponMaster': return updateCouponMaster(data);
    case 'issueCoupons': return issueCoupons(data.coupon_id || '', data.member_ids || []);
    case 'useCouponByStaff': return useCouponByStaff(data.token || '', data.staff_name || '');
    case 'sendMail': return sendMail(data);
    case 'adjustPoints': return adjustPoints(data);
    case 'updateSettings': return updateSettingsBulk(data);
    case 'initializeSheets': return initializeSheets();
    default: return { success: false, error: '不明なアクション: ' + action };
  }
}
