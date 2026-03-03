/**
 * api.js - GAS API呼び出しヘルパー
 */

async function apiGet(action, params) {
  params = params || {};
  var url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('apiKey', CONFIG.API_KEY);
  Object.keys(params).forEach(function(key) {
    url.searchParams.set(key, params[key]);
  });

  var response = await fetch(url.toString());
  return await response.json();
}

async function apiPost(action, data) {
  data = data || {};
  try {
    var response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: action,
        apiKey: CONFIG.API_KEY,
        data: data
      })
    });
    return await response.json();
  } catch (e) {
    // POST失敗時はGETフォールバック
    var url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('apiKey', CONFIG.API_KEY);
    url.searchParams.set('data', JSON.stringify(data));
    var response = await fetch(url.toString());
    return await response.json();
  }
}

async function apiPublicGet(action, params) {
  params = params || {};
  var url = new URL(CONFIG.API_URL);
  url.searchParams.set('action', action);
  Object.keys(params).forEach(function(key) {
    url.searchParams.set(key, params[key]);
  });
  var response = await fetch(url.toString());
  return await response.json();
}

async function apiPublicPost(action, data) {
  data = data || {};
  try {
    var response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: action, data: data })
    });
    return await response.json();
  } catch (e) {
    var url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    url.searchParams.set('data', JSON.stringify(data));
    var response = await fetch(url.toString());
    return await response.json();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateTimeDisplay(dateStr) {
  if (!dateStr) return '';
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch(e) { return dateStr; }
}

function showAlert(containerId, type, message) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.className = 'alert alert-' + type;
  el.textContent = message;
  el.style.display = 'block';
  setTimeout(function() { el.style.display = 'none'; }, 5000);
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
