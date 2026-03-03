/**
 * register.js - 会員登録ロジック（お客様向け）
 */

document.addEventListener('DOMContentLoaded', function() {
  // 月・日セレクトボックス初期化
  var monthSelect = document.getElementById('birthMonth');
  var daySelect = document.getElementById('birthDay');
  for (var m = 1; m <= 12; m++) {
    var opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m + '月';
    monthSelect.appendChild(opt);
  }
  for (var d = 1; d <= 31; d++) {
    var opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d + '日';
    daySelect.appendChild(opt);
  }
});

async function submitRegistration() {
  var name = document.getElementById('regName').value.trim();
  var nameKana = document.getElementById('regNameKana').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var phone = document.getElementById('regPhone').value.trim();
  var birthMonth = document.getElementById('birthMonth').value;
  var birthDay = document.getElementById('birthDay').value;
  var mailOptIn = document.getElementById('regMailOptIn').checked;

  if (!name) return showRegError('お名前を入力してください');
  if (!nameKana) return showRegError('フリガナを入力してください');
  if (!email) return showRegError('メールアドレスを入力してください');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showRegError('メールアドレスの形式が正しくありません');

  var birthday = '';
  if (birthMonth && birthDay) {
    birthday = ('0' + birthMonth).slice(-2) + '/' + ('0' + birthDay).slice(-2);
  }

  var btn = document.getElementById('regSubmitBtn');
  btn.disabled = true;
  btn.textContent = '登録中...';
  document.getElementById('regError').style.display = 'none';

  try {
    var result = await apiPublicPost('registerMember', {
      name: name,
      name_kana: nameKana,
      phone: phone,
      email: email,
      birthday: birthday,
      mail_opt_in: mailOptIn
    });

    if (result.success) {
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('completeScreen').style.display = 'block';
    } else {
      showRegError(result.error || '登録に失敗しました');
      btn.disabled = false;
      btn.textContent = '会員登録する';
    }
  } catch(e) {
    showRegError('エラーが発生しました: ' + e.message);
    btn.disabled = false;
    btn.textContent = '会員登録する';
  }
}

function showRegError(msg) {
  var el = document.getElementById('regError');
  el.textContent = msg;
  el.style.display = 'block';
}
