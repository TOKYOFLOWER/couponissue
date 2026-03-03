/**
 * members.js - 会員管理ロジック
 */

document.addEventListener('DOMContentLoaded', function() {
  loadMembersList();
});

async function loadMembersList(search) {
  var params = {};
  if (search) params.search = search;
  try {
    var result = await apiGet('members', params);
    if (!result.success) return;
    renderMembersTable(result.data.members || []);
  } catch(e) { console.error(e); }
}

function renderMembersTable(members) {
  var html = '';
  if (members.length === 0) {
    html = '<tr><td colspan="8" style="text-align:center;color:#999;">会員がいません</td></tr>';
  } else {
    var statusNames = { active: 'アクティブ', inactive: '無効', unsubscribed: '配信停止' };
    members.forEach(function(m) {
      html += '<tr>' +
        '<td>' + escapeHtml(m.name) + '</td>' +
        '<td>' + escapeHtml(m.name_kana || '') + '</td>' +
        '<td>' + escapeHtml(m.phone || '') + '</td>' +
        '<td>' + escapeHtml(m.email || '') + '</td>' +
        '<td>' + escapeHtml(m.birthday || '') + '</td>' +
        '<td>' + (parseInt(m.available_points) || 0) + 'pt</td>' +
        '<td><span class="badge badge-' + m.status + '">' + (statusNames[m.status] || m.status) + '</span></td>' +
        '<td>' +
          '<button class="btn btn-small btn-primary" onclick="editMemberModal(\'' + m.member_id + '\')" style="margin-right:4px;">編集</button>' +
          '<button class="btn btn-small btn-secondary" onclick="showPointModal(\'' + m.member_id + '\', \'' + escapeHtml(m.name) + '\', ' + (parseInt(m.available_points) || 0) + ')">Pt</button>' +
        '</td></tr>';
    });
  }
  document.getElementById('membersTable').innerHTML = html;
}

function searchMembers() {
  var q = document.getElementById('memberSearch').value.trim();
  loadMembersList(q);
}

function showMemberModal(data) {
  document.getElementById('memberModalTitle').textContent = data ? '会員編集' : '新規会員登録';
  document.getElementById('editMemberId').value = data ? data.member_id : '';
  document.getElementById('mName').value = data ? data.name : '';
  document.getElementById('mNameKana').value = data ? (data.name_kana || '') : '';
  document.getElementById('mPhone').value = data ? (data.phone || '') : '';
  document.getElementById('mEmail').value = data ? (data.email || '') : '';
  document.getElementById('mBirthday').value = data ? (data.birthday || '') : '';
  document.getElementById('mStatus').value = data ? (data.status || 'active') : 'active';
  document.getElementById('mMailOptIn').checked = data ? (data.mail_opt_in === true || data.mail_opt_in === 'TRUE') : true;
  document.getElementById('mMemo').value = data ? (data.memo || '') : '';
  openModal('memberModal');
}

async function editMemberModal(memberId) {
  var result = await apiGet('member', { id: memberId });
  if (result.success) showMemberModal(result.data);
}

async function saveMember() {
  var memberId = document.getElementById('editMemberId').value;
  var data = {
    name: document.getElementById('mName').value.trim(),
    name_kana: document.getElementById('mNameKana').value.trim(),
    phone: document.getElementById('mPhone').value.trim(),
    email: document.getElementById('mEmail').value.trim(),
    birthday: document.getElementById('mBirthday').value.trim(),
    status: document.getElementById('mStatus').value,
    mail_opt_in: document.getElementById('mMailOptIn').checked,
    memo: document.getElementById('mMemo').value.trim()
  };

  if (!data.name) { alert('お名前を入力してください'); return; }

  var action = memberId ? 'updateMember' : 'createMember';
  if (memberId) data.member_id = memberId;

  var result = await apiPost(action, data);
  if (result.success) {
    closeModal('memberModal');
    loadMembersList();
  } else {
    alert(result.error || '保存に失敗しました');
  }
}

function showPointModal(memberId, name, points) {
  document.getElementById('pointMemberId').value = memberId;
  document.getElementById('pointMemberInfo').textContent = name + ' （現在: ' + points + 'pt）';
  document.getElementById('pointAmount').value = '';
  document.getElementById('pointReason').value = '';
  openModal('pointModal');
}

async function executePointAction() {
  var memberId = document.getElementById('pointMemberId').value;
  var changeType = document.getElementById('pointAction').value;
  var points = parseInt(document.getElementById('pointAmount').value);
  var reason = document.getElementById('pointReason').value.trim();

  if (!points || points <= 0) { alert('ポイント数を入力してください'); return; }

  var result = await apiPost('adjustPoints', {
    member_id: memberId,
    change_type: changeType,
    points: points,
    reason: reason
  });

  if (result.success) {
    closeModal('pointModal');
    loadMembersList();
    alert('ポイント操作が完了しました');
  } else {
    alert(result.error || '操作に失敗しました');
  }
}
