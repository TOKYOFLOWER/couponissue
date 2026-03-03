/**
 * auth.js - APIキー認証
 */

/**
 * APIキーが有効か検証する
 */
function isValidApiKey(key) {
  return key && key === API_KEY;
}
