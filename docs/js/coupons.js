/**
 * coupons.js - クーポン管理ロジック
 */

var allCouponsCache = [];

document.addEventListener('DOMContentLoaded', function() {
  loadCouponsList();
  loadIssuedList();
});

async function loadCouponsList() {
  try {
    var result = await apiGet('couponMasters');
    if (!result.success) return;
    allCouponsCache = result.data.coupons || [];
    renderCouponsTable(allCouponsCache);
  } catch(e) { console.error(e); }
}

function renderCouponsTable(coupons) {
  var html = '';
  var typeNames = { percent: '割引率', fixed: '固定金額', benefit: '特典', point: 'ポイント' };
  var flowNames = { customer_swipe: 'お客様', staff_operate: 'スタッフ' };

  if (coupons.length === 0) {
    html = '<tr><td colspan="8" style="text-align:center;color:#999;">クーポンがありません</td></tr>';
  } else {
    coupons.forEach(function(c) {
      var expiry = c.expiry_type === 'relative' ? (c.expiry_days + '日間') : (c.expiry_date ? formatDateDisplay(c.expiry_date) : '-');
      var isActive = (c.is_active === true || c.is_active === 'TRUE');
      html += '<tr>' +
        '<td>' + escapeHtml(c.coupon_id) + '</td>' +
        '<td>' + escapeHtml(c.coupon_name) + '</td>' +
        '<td>' + (typeNames[c.coupon_type] || c.coupon_type) + '</td>' +
        '<td>' + escapeHtml(String(c.coupon_value)) + '</td>' +
        '<td>' + expiry + '</td>' +
        '<td>' + (flowNames[c.usage_flow] || c.usage_flow) + '</td>' +
        '<td><span class="badge badge-' + (isActive ? 'active' : 'inactive') + '">' + (isActive ? '有効' : '無効') + '</span></td>' +
        '<td>' +
          '<button class="btn btn-small btn-primary" onclick="editCouponModal(\'' + c.coupon_id + '\')" style="margin-right:4px;">編集</button>' +
          '<button class="btn btn-small" style="background:#4CAF50;color:#fff;" onclick="showIssueModal(\'' + c.coupon_id + '\', \'' + escapeHtml(c.coupon_name) + '\')">発行</button>' +
        '</td></tr>';
    });
  }
  document.getElementById('couponsTable').innerHTML = html;
}

async function loadIssuedList() {
  try {
    var result = await apiGet('issuedCoupons', { limit: 50 });
    if (!result.success) return;

    var membersResult = await apiGet('members', { limit: 1000 });
    var memberMap = {};
    if (membersResult.success) {
      (membersResult.data.members || []).forEach(function(m) { memberMap[m.member_id] = m.name; });
    }

    var couponMap = {};
    allCouponsCache.forEach(function(c) { couponMap[c.coupon_id] = c.coupon_name; });

    var html = '';
    var issued = result.data.issued || [];
    var statusNames = { unused: '未使用', used: '利用済', expired: '期限切れ' };

    if (issued.length === 0) {
      html = '<tr><td colspan="5" style="text-align:center;color:#999;">発行済みクーポンがありません</td></tr>';
    } else {
      issued.forEach(function(item) {
        html += '<tr>' +
          '<td>' + escapeHtml(couponMap[item.coupon_id] || item.coupon_id) + '</td>' +
          '<td>' + escapeHtml(memberMap[item.member_id] || item.member_id) + '</td>' +
          '<td>' + formatDateTimeDisplay(item.issued_at) + '</td>' +
          '<td>' + formatDateTimeDisplay(item.expires_at) + '</td>' +
          '<td><span class="badge badge-' + item.status + '">' + (statusNames[item.status] || item.status) + '</span></td></tr>';
      });
    }
    document.getElementById('issuedTable').innerHTML = html;
  } catch(e) { console.error(e); }
}

function showCouponModal(data) {
  document.getElementById('couponModalTitle').textContent = data ? 'クーポン編集' : '新規クーポン作成';
  document.getElementById('editCouponId').value = data ? data.coupon_id : '';
  document.getElementById('cName').value = data ? data.coupon_name : '';
  document.getElementById('cType').value = data ? data.coupon_type : 'percent';
  document.getElementById('cValue').value = data ? data.coupon_value : '';
  document.getElementById('cDescription').value = data ? (data.description || '') : '';
  document.getElementById('cExpiryType').value = data ? data.expiry_type : 'relative';
  document.getElementById('cExpiryDays').value = data ? (data.expiry_days || 30) : 30;
  document.getElementById('cExpiryDate').value = data ? (data.expiry_date || '') : '';
  document.getElementById('cDistribution').value = data ? data.distribution_method : 'individual';
  document.getElementById('cUsageFlow').value = data ? data.usage_flow : 'customer_swipe';
  document.getElementById('cDesignColor').value = data ? (data.design_color || '#F8BBD0') : '#F8BBD0';
  document.getElementById('cIsActive').checked = data ? (data.is_active === true || data.is_active === 'TRUE') : true;
  updateValueLabel();
  toggleExpiryFields();
  openModal('couponModal');
}

async function editCouponModal(couponId) {
  var result = await apiGet('couponMaster', { id: couponId });
  if (result.success) showCouponModal(result.data);
}

function updateValueLabel() {
  var type = document.getElementById('cType').value;
  var labels = { percent: '割引率（数値）', fixed: '割引金額（円）', benefit: '特典内容', point: '付与ポイント数' };
  document.getElementById('cValueLabel').textContent = labels[type] || '値';
}

function toggleExpiryFields() {
  var type = document.getElementById('cExpiryType').value;
  document.getElementById('expiryDaysGroup').style.display = type === 'relative' ? 'block' : 'none';
  document.getElementById('expiryDateGroup').style.display = type === 'absolute' ? 'block' : 'none';
}

async function saveCoupon() {
  var couponId = document.getElementById('editCouponId').value;
  var data = {
    coupon_name: document.getElementById('cName').value.trim(),
    coupon_type: document.getElementById('cType').value,
    coupon_value: document.getElementById('cValue').value.trim(),
    description: document.getElementById('cDescription').value.trim(),
    expiry_type: document.getElementById('cExpiryType').value,
    expiry_days: parseInt(document.getElementById('cExpiryDays').value) || 30,
    expiry_date: document.getElementById('cExpiryDate').value,
    distribution_method: document.getElementById('cDistribution').value,
    usage_flow: document.getElementById('cUsageFlow').value,
    design_color: document.getElementById('cDesignColor').value,
    is_active: document.getElementById('cIsActive').checked
  };
  if (!data.coupon_name) { alert('クーポン名を入力してください'); return; }

  var action = couponId ? 'updateCouponMaster' : 'createCouponMaster';
  if (couponId) data.coupon_id = couponId;

  var result = await apiPost(action, data);
  if (result.success) { closeModal('couponModal'); loadCouponsList(); loadIssuedList(); }
  else { alert(result.error || '保存に失敗しました'); }
}

async function showIssueModal(couponId, couponName) {
  document.getElementById('issueCouponId').value = couponId;
  document.getElementById('issueCouponInfo').textContent = 'クーポン: ' + couponName;

  var result = await apiGet('members', { limit: 1000 });
  var html = '';
  if (result.success) {
    var active = (result.data.members || []).filter(function(m) { return m.status === 'active'; });
    active.forEach(function(m) {
      html += '<label class="checkbox-label" style="padding:6px 0;border-bottom:1px solid #f0f0f0;">' +
        '<input type="checkbox" name="issueMember" value="' + m.member_id + '">' +
        escapeHtml(m.name) + ' (' + escapeHtml(m.email || '未登録') + ')</label>';
    });
    if (active.length === 0) html = '<p style="color:#999;text-align:center;">アクティブな会員がいません</p>';
  }
  document.getElementById('issueMemberList').innerHTML = html;
  openModal('issueModal');
}

async function executeIssueCoupon() {
  var couponId = document.getElementById('issueCouponId').value;
  var checkboxes = document.querySelectorAll('input[name="issueMember"]:checked');
  var memberIds = [];
  checkboxes.forEach(function(cb) { memberIds.push(cb.value); });
  if (memberIds.length === 0) { alert('発行先会員を選択してください'); return; }

  var result = await apiPost('issueCoupons', { coupon_id: couponId, member_ids: memberIds });
  if (result.success) {
    closeModal('issueModal');
    loadIssuedList();
    alert(result.data.count + '名にクーポンを発行しました');
  } else { alert(result.error || '発行に失敗しました'); }
}
