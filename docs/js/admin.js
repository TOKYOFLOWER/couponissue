/**
 * admin.js - 管理画面共通ロジック（ナビゲーションハイライト）
 */

document.addEventListener('DOMContentLoaded', function() {
  // 現在のページに対応するナビリンクをアクティブにする
  var path = window.location.pathname;
  var filename = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  document.querySelectorAll('.admin-nav .nav-links a').forEach(function(link) {
    var href = link.getAttribute('href');
    if (href === filename || (filename === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});

/**
 * 管理画面のナビゲーションHTMLを返す
 */
function getAdminNavHtml() {
  return '<nav class="admin-nav">' +
    '<a href="index.html" class="nav-brand">' +
      '<img src="img/logo.svg" alt="logo">' +
      '<h1>' + CONFIG.SITE_NAME + '</h1>' +
    '</a>' +
    '<ul class="nav-links">' +
      '<li><a href="index.html">ダッシュボード</a></li>' +
      '<li><a href="members.html">会員管理</a></li>' +
      '<li><a href="coupons.html">クーポン</a></li>' +
      '<li><a href="mail.html">メルマガ</a></li>' +
    '</ul>' +
  '</nav>';
}
