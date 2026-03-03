/**
 * main.js - doGet / doPost ルーティング
 */

/**
 * GETリクエストハンドラ
 */
function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'admin';
  var token = (e && e.parameter && e.parameter.token) ? e.parameter.token : '';

  // お客様向けページ（認証不要）
  if (page === 'coupon' && token) {
    return serveCouponPage(token);
  }
  if (page === 'register') {
    return serveRegisterPage();
  }
  if (page === 'unsubscribe' && e.parameter.mid) {
    return serveUnsubscribePage(e.parameter.mid);
  }

  // 管理画面（認証必要）
  if (!isAdmin()) {
    return HtmlService.createHtmlOutput('<h2>アクセス権限がありません</h2><p>管理者に連絡してください。</p>')
      .setTitle('アクセス拒否');
  }
  return serveAdminPage();
}

/**
 * POSTリクエストハンドラ
 */
function doPost(e) {
  try {
    var action = JSON.parse(e.postData.contents);
    var result = routeAction(action);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * HTMLファイルをインクルードする
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 管理画面を配信
 */
function serveAdminPage() {
  var template = HtmlService.createTemplateFromFile('html/admin/index');
  return template.evaluate()
    .setTitle('クーポン管理システム - ' + getSetting('store_name'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 会員登録ページを配信
 */
function serveRegisterPage() {
  var template = HtmlService.createTemplateFromFile('html/public/register');
  return template.evaluate()
    .setTitle('会員登録 - ' + getSetting('store_name'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * クーポン表示ページを配信
 */
function serveCouponPage(token) {
  var template = HtmlService.createTemplateFromFile('html/public/coupon');
  template.token = token;
  return template.evaluate()
    .setTitle('クーポン - ' + getSetting('store_name'))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * 配信停止ページ
 */
function serveUnsubscribePage(memberId) {
  var result = unsubscribeMember(memberId);
  var html = '<html><body style="text-align:center;padding:40px;font-family:sans-serif;">';
  if (result.success) {
    html += '<h2>配信停止が完了しました</h2><p>今後メールマガジンは配信されません。</p>';
  } else {
    html += '<h2>エラーが発生しました</h2><p>' + (result.error || '不明なエラー') + '</p>';
  }
  html += '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('配信停止 - ' + getSetting('store_name'));
}

/**
 * POSTアクションのルーティング
 */
function routeAction(action) {
  switch (action.type) {
    // 会員管理
    case 'registerMember':
      return registerMember(action.data);
    case 'updateMember':
      return updateMember(action.data);
    case 'searchMembers':
      return searchMembers(action.query);
    case 'getMember':
      return getMember(action.memberId);
    case 'getAllMembers':
      return getAllMembers();

    // クーポンマスタ
    case 'createCoupon':
      return createCoupon(action.data);
    case 'updateCoupon':
      return updateCouponMaster(action.data);
    case 'getAllCoupons':
      return getAllCoupons();
    case 'getCoupon':
      return getCoupon(action.couponId);

    // クーポン発行
    case 'issueCoupon':
      return issueCouponToMembers(action.couponId, action.memberIds);
    case 'useCoupon':
      return useCoupon(action.token, action.usedBy);
    case 'getCouponByToken':
      return getCouponByToken(action.token);

    // メール
    case 'sendMagazine':
      return sendMagazine(action.subject, action.body, action.couponId);
    case 'sendIndividualMail':
      return sendIndividualMail(action.memberId, action.subject, action.body, action.couponId);
    case 'getMailLogs':
      return getMailLogs();

    // ポイント
    case 'addPoints':
      return addPoints(action.memberId, action.points, action.reason);
    case 'usePoints':
      return usePoints(action.memberId, action.points, action.reason);
    case 'getPointHistory':
      return getPointHistory(action.memberId);

    // ダッシュボード
    case 'getDashboard':
      return getDashboardData();

    // 設定
    case 'getSettings':
      return getAllSettings();
    case 'updateSettings':
      return updateSettings(action.data);

    default:
      return { error: '不明なアクション: ' + action.type };
  }
}
