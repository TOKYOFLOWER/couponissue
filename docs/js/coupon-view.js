/**
 * coupon-view.js - クーポン表示＆スワイプロジック（お客様向け）
 */

var couponData = null;

document.addEventListener('DOMContentLoaded', function() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');

  if (!token) {
    showCouponError('無効なURL', 'クーポンのURLが正しくありません。');
    return;
  }

  loadCoupon(token);
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
      setupSlider();
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

// スライダーUIセットアップ
function setupSlider() {
  var track = document.getElementById('slideTrack');
  var thumb = document.getElementById('slideThumb');
  if (!track || !thumb) return;

  var dragging = false;
  var startX = 0;
  var thumbStartLeft = 0;
  var maxLeft = 0;

  function getMaxLeft() {
    return track.offsetWidth - thumb.offsetWidth - 8; // 4px padding each side
  }

  function onStart(clientX) {
    if (!couponData || couponData.issued.status !== 'unused') return;
    dragging = true;
    startX = clientX;
    thumbStartLeft = thumb.offsetLeft;
    maxLeft = getMaxLeft();
    thumb.classList.add('dragging');
  }

  function onMove(clientX) {
    if (!dragging) return;
    var diff = clientX - startX;
    var newLeft = Math.max(4, Math.min(thumbStartLeft + diff, maxLeft));
    thumb.style.left = newLeft + 'px';
  }

  function onEnd() {
    if (!dragging) return;
    dragging = false;
    thumb.classList.remove('dragging');
    maxLeft = getMaxLeft();
    var currentLeft = thumb.offsetLeft;

    // 80%以上スライドで完了
    if (currentLeft >= maxLeft * 0.8) {
      thumb.style.left = maxLeft + 'px';
      thumb.classList.add('complete');
      executeCouponUse();
    } else {
      thumb.style.left = '4px';
    }
  }

  // Touch events
  thumb.addEventListener('touchstart', function(e) {
    e.preventDefault();
    onStart(e.touches[0].clientX);
  });
  document.addEventListener('touchmove', function(e) {
    if (dragging) { e.preventDefault(); onMove(e.touches[0].clientX); }
  }, { passive: false });
  document.addEventListener('touchend', function() { onEnd(); });

  // Mouse events (for desktop testing)
  thumb.addEventListener('mousedown', function(e) {
    e.preventDefault();
    onStart(e.clientX);
  });
  document.addEventListener('mousemove', function(e) {
    if (dragging) onMove(e.clientX);
  });
  document.addEventListener('mouseup', function() { onEnd(); });
}

async function executeCouponUse() {
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');
  var thumb = document.getElementById('slideThumb');

  try {
    var result = await apiPublicPost('useCoupon', { token: token });
    if (result.success) {
      document.getElementById('useArea').style.display = 'none';
      document.getElementById('usedMessage').style.display = 'block';
      showStatusOverlay('used', 'USED');
    } else {
      alert(result.error || '利用に失敗しました');
      resetSlider();
    }
  } catch(e) {
    alert('エラーが発生しました: ' + e.message);
    resetSlider();
  }
}

function resetSlider() {
  var thumb = document.getElementById('slideThumb');
  if (thumb) {
    thumb.classList.remove('complete');
    thumb.style.left = '4px';
  }
}
