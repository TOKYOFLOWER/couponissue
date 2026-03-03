/**
 * auth.js - 管理者認証チェック
 */

/**
 * 現在のユーザーが管理者かどうかを判定する
 */
function isAdmin() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return false;
    return ADMIN_EMAILS.indexOf(email) !== -1;
  } catch (e) {
    return false;
  }
}

/**
 * 現在のユーザーのメールアドレスを取得する
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}
