/**
 * mail.js - メルマガ配信ロジック
 */

document.addEventListener('DOMContentLoaded', function() {
  loadMailPage();
});

async function loadMailPage() {
  // 会員リスト
  try {
    var result = await apiGet('members', { limit: 1000 });
    if (result.success) {
      var select = document.getElementById('mailTarget');
      select.innerHTML = '<option value="">選択してください</option>';
      (result.data.members || []).filter(function(m) { return m.status === 'active' && m.email; })
        .forEach(function(m) {
          var opt = document.createElement('option');
          opt.value = m.member_id;
          opt.textContent = m.name + ' (' + m.email + ')';
          select.appendChild(opt);
        });
    }
  } catch(e) { console.error(e); }

  // クーポンリスト
  try {
    var result = await apiGet('couponMasters');
    if (result.success) {
      var select = document.getElementById('mailCouponId');
      select.innerHTML = '<option value="">クーポンなし</option>';
      (result.data.coupons || []).filter(function(c) { return c.is_active === true || c.is_active === 'TRUE'; })
        .forEach(function(c) {
          var opt = document.createElement('option');
          opt.value = c.coupon_id;
          opt.textContent = c.coupon_name + ' (' + c.coupon_id + ')';
          select.appendChild(opt);
        });
    }
  } catch(e) { console.error(e); }

  loadMailLogs();
}

async function loadMailLogs() {
  try {
    var result = await apiGet('mailLogs');
    if (!result.success) return;
    var logs = result.data.logs || [];
    var typeNames = { magazine: 'メルマガ', individual: '個別', birthday_auto: '誕生日', coupon_notify: 'クーポン通知' };
    var html = '';

    if (logs.length === 0) {
      html = '<tr><td colspan="6" style="text-align:center;color:#999;">配信ログがありません</td></tr>';
    } else {
      logs.forEach(function(log) {
        html += '<tr>' +
          '<td>' + formatDateTimeDisplay(log.sent_at) + '</td>' +
          '<td>' + (typeNames[log.mail_type] || log.mail_type) + '</td>' +
          '<td>' + escapeHtml(log.subject || '') + '</td>' +
          '<td>' + (log.sent_to === 'ALL' ? '全会員' : escapeHtml(log.sent_to || '')) + '</td>' +
          '<td>' + (log.sent_count || 0) + '</td>' +
          '<td><span class="badge badge-' + log.status + '">' + log.status + '</span></td></tr>';
      });
    }
    document.getElementById('mailLogsTable').innerHTML = html;
  } catch(e) { console.error(e); }
}

function toggleMailTarget() {
  var type = document.getElementById('mailType').value;
  document.getElementById('mailTargetGroup').style.display = type === 'individual' ? 'block' : 'none';
}

async function sendMailAction() {
  var type = document.getElementById('mailType').value;
  var subject = document.getElementById('mailSubject').value.trim();
  var body = document.getElementById('mailBody').value.trim();
  var couponId = document.getElementById('mailCouponId').value;

  if (!subject) { alert('件名を入力してください'); return; }
  if (!body) { alert('本文を入力してください'); return; }

  var data = { type: type, subject: subject, body: body };
  if (couponId) data.coupon_id = couponId;

  if (type === 'individual') {
    var memberId = document.getElementById('mailTarget').value;
    if (!memberId) { alert('配信先会員を選択してください'); return; }
    data.member_ids = [memberId];
  } else {
    if (!confirm('opt-in会員全員にメールを配信します。よろしいですか？')) return;
  }

  var btn = document.getElementById('sendMailBtn');
  btn.disabled = true;
  btn.textContent = '配信中...';

  try {
    var result = await apiPost('sendMail', data);
    btn.disabled = false;
    btn.textContent = '配信する';

    if (result.success) {
      var d = result.data;
      var msg = d.sent_count + '件送信完了' + (d.fail_count > 0 ? '（' + d.fail_count + '件失敗）' : '');
      showAlert('mailAlert', 'success', msg);
      loadMailLogs();
      document.getElementById('mailSubject').value = '';
      document.getElementById('mailBody').value = '';
    } else {
      showAlert('mailAlert', 'error', result.error || '配信に失敗しました');
    }
  } catch(e) {
    btn.disabled = false;
    btn.textContent = '配信する';
    showAlert('mailAlert', 'error', e.message);
  }
}
