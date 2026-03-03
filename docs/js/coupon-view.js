/**
 * coupon-view.js - クーポン表示＆スワイプロジック（お客様向け）
 */

var couponData = null;
var holdTimer = null;
var holdProgress = 0;
var isHolding = false;

document.addEventListener('DOMContentLoaded', function() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');

  if (!token) {
    showCouponError('無効なURL', 'クーポンのURLが正しくありません。');
    return;
  }

  loadCoupon(token);
  setupSwipe();
});

async function loadCoupon(token) {
  try {
    var result = await apiPublicGet('couponView', { token: token });
    document.getElementById('loadingArea').style.display = 'none';

    if (!result.success) {
      showCouponError('クーポンが見つかりません', result.error || '');
      return;
    }

    couponData = result.data;
    renderCoupon(result.data);
  } catch(e) {
    document.getElementById('loadingArea').style.display = 'none';
    showCouponError('読み込みエラー', e.message);
  }
}

function renderCoupon(data) {
  document.getElementById('couponArea').style.display = 'block';
  document.getElementById('cpStoreName').textContent = data.store_name || '';

  var header = document.getElementById('couponHeader');
  header.style.background = data.coupon.design_color || '#F8BBD0';

  document.getElementById('couponName').textContent = data.coupon.coupon_name;
  document.getElementById('couponValue').textContent = data.display_value;
  document.getElementById('couponDesc').textContent = data.coupon.description || '';

  if (data.issued.expires_at) {
    var exp = new Date(data.issued.expires_at);
    document.getElementById('couponExpiry').textContent =
      '有効期限: ' + exp.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  if (data.member_name) {
    document.getElementById('memberName').textContent = data.member_name + ' 様';
  }

  var status = data.issued.status;
  if (status === 'unused') {
    document.getElementById('useArea').style.display = 'block';
    if (data.coupon.usage_flow === 'customer_swipe') {
      document.getElementById('swipeSection').style.display = 'block';
    } else {
      document.getElementById('staffSection').style.display = 'block';
    }
  } else if (status === 'used') {
    showStatusOverlay('used', 'USED');
    if (data.issued.used_at) {
      var ud = new Date(data.issued.used_at);
      document.getElementById('couponExpiry').textContent =
        '利用日: ' + ud.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
    }
  } else if (status === 'expired') {
    showStatusOverlay('expired', 'EXPIRED');
  }
}

function showStatusOverlay(type, text) {
  var overlay = document.getElementById('statusOverlay');
  overlay.className = 'status-overlay active ' + type;
  document.getElementById('statusStamp').textContent = text;
}

function showCouponError(title, message) {
  document.getElementById('loadingArea').style.display = 'none';
  document.getElementById('errorArea').style.display = 'block';
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorMessage').textContent = message;
}

// 長押し処理
function startHold(e) {
  e.preventDefault();
  if (isHolding) return;
  isHolding = true;
  holdProgress = 0;

  holdTimer = setInterval(function() {
    holdProgress += 5;
    document.getElementById('progressBar').style.width = holdProgress + '%';
    if (holdProgress >= 100) {
      clearInterval(holdTimer);
      isHolding = false;
      confirmUse();
    }
  }, 100);
}

function endHold(e) {
  if (e) e.preventDefault();
  if (holdTimer) { clearInterval(holdTimer); holdTimer = null; }
  isHolding = false;
  holdProgress = 0;
  document.getElementById('progressBar').style.width = '0%';
}

function confirmUse() {
  if (confirm('このクーポンを利用しますか？\n※一度利用すると元に戻せません')) {
    executeCouponUse();
  }
}

async function executeCouponUse() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');

  var btn = document.getElementById('useButton');
  btn.disabled = true;
  btn.querySelector('span').textContent = '処理中...';

  try {
    var result = await apiPublicPost('useCoupon', { token: token });
    if (result.success) {
      document.getElementById('useArea').style.display = 'none';
      document.getElementById('usedMessage').style.display = 'block';
      showStatusOverlay('used', 'USED');
    } else {
      alert(result.error || '利用に失敗しました');
      btn.disabled = false;
      btn.querySelector('span').textContent = '長押しで利用する';
    }
  } catch(e) {
    alert('エラーが発生しました: ' + e.message);
    btn.disabled = false;
    btn.querySelector('span').textContent = '長押しで利用する';
  }
}

function setupSwipe() {
  var card = document.getElementById('couponCard');
  if (!card) return;
  var startX = 0, currentX = 0, swiping = false;

  card.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; swiping = true; });
  card.addEventListener('touchmove', function(e) {
    if (!swiping) return;
    currentX = e.touches[0].clientX;
    var diff = currentX - startX;
    if (diff > 0) {
      card.style.transform = 'translateX(' + Math.min(diff, 100) + 'px)';
      card.style.opacity = 1 - Math.min(diff / 300, 0.3);
    }
  });
  card.addEventListener('touchend', function() {
    if (!swiping) return;
    swiping = false;
    var diff = currentX - startX;
    card.style.transform = '';
    card.style.opacity = '';
    if (diff > 150 && couponData && couponData.issued.status === 'unused' && couponData.coupon.usage_flow === 'customer_swipe') {
      confirmUse();
    }
  });
}
