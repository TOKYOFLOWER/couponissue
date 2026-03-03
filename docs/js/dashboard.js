/**
 * dashboard.js - ダッシュボード
 */

document.addEventListener('DOMContentLoaded', function() {
  loadDashboard();
});

async function loadDashboard() {
  try {
    var result = await apiGet('dashboard');
    if (!result.success) return;
    var d = result.data;

    document.getElementById('statTotalMembers').textContent = d.total_members || 0;
    document.getElementById('statActiveMembers').textContent = d.active_members || 0;
    document.getElementById('statUnusedCoupons').textContent = d.unused_coupons || 0;
    document.getElementById('statBirthday').textContent = d.birthday_members ? d.birthday_members.length : 0;

    // 誕生日会員
    if (d.birthday_members && d.birthday_members.length > 0) {
      document.getElementById('birthdayCard').style.display = 'block';
      var html = '';
      d.birthday_members.forEach(function(m) {
        html += '<tr><td>' + escapeHtml(m.name) + '</td><td>' + escapeHtml(m.email) + '</td><td>' + escapeHtml(m.phone) + '</td></tr>';
      });
      document.getElementById('birthdayTable').innerHTML = html;
    }

    // 配信ログ
    var logsHtml = '';
    var typeNames = { magazine: 'メルマガ', individual: '個別', birthday_auto: '誕生日', coupon_notify: 'クーポン通知' };
    if (d.recent_logs && d.recent_logs.length > 0) {
      d.recent_logs.forEach(function(log) {
        logsHtml += '<tr>' +
          '<td>' + formatDateTimeDisplay(log.sent_at) + '</td>' +
          '<td>' + (typeNames[log.mail_type] || log.mail_type) + '</td>' +
          '<td>' + escapeHtml(log.subject || '') + '</td>' +
          '<td>' + (log.sent_count || 0) + '</td>' +
          '<td><span class="badge badge-' + log.status + '">' + log.status + '</span></td></tr>';
      });
    } else {
      logsHtml = '<tr><td colspan="5" style="text-align:center;color:#999;">配信ログがありません</td></tr>';
    }
    document.getElementById('recentLogsTable').innerHTML = logsHtml;
  } catch(e) {
    console.error('ダッシュボード読み込みエラー:', e);
  }
}
