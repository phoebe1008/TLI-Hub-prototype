/* =====================================================================
   閒置自動登出（20261111，使用者指定）
   - 閒置上限依 docs/10-安全政策.md §4「閒置逾時」：前台 30 分鐘、後台 15 分鐘。
     前／後台的界線文件未定義；目前「管理後台、顧問工作台」算後台（15 分），
     「會員區、教師端、組織端、夥伴端」算前台（30 分）（使用者 2026-11-11 選定）。
   - 剩 5 分鐘時跳出「是否要繼續使用？」並倒數；按「繼續使用」重新計時；
     按「登出」或倒數歸零即登出，導回登入頁並帶 ?timeout=<分鐘> 顯示原因。
   - 右上角（頂欄語言按鈕左邊）一直顯示「30:00 後自動登出」的 分:秒 倒數，每秒更新；剩 5 分鐘變橘色。
     沒有頂欄的頁面（m15 付款、m16 教室）固定在畫面右上角。
   - 「閒置」＝沒有點擊、鍵盤、捲動、觸控、滑鼠移動，且頁面上沒有正在播放的 <video>／<audio>
     （播放中算有操作，使用者 2026-11-11 指定）。嵌入式播放器（iframe，如 YouTube）偵測不到，
     會照一般規則在剩 5 分鐘時跳提示。
   - 提示出現後，只有按「繼續使用」（或媒體正在播放）才重新計時，移動滑鼠不算。
   - 多分頁：最後操作時間存 localStorage，同一瀏覽器多個分頁共用同一個計時。
   - 開啟／切換頁面視同一次操作（正式系統中每次換頁都會打到伺服器、延長 Session）。
   ===================================================================== */
(function () {
  'use strict';

  var path = decodeURIComponent(location.pathname);
  var isAdmin = path.indexOf('/管理後台/') > -1;
  var isBackOffice = isAdmin || path.indexOf('/顧問工作台/') > -1;

  var IDLE_MIN = isBackOffice ? 15 : 30;
  var IDLE_MS = IDLE_MIN * 60 * 1000;
  var WARN_MS = 5 * 60 * 1000;    // 剩多少時間跳提示：5 分鐘
  var KEY = 'tliIdleLastActive';
  var WRITE_THROTTLE_MS = 5000;   // 操作事件寫入 localStorage 的節流間隔
  var loginUrl = isAdmin ? 'a00_admin_login.html' : '../公開網站/p07_login_register.html';

  var memLast = Date.now();
  var lastWrite = 0;
  var warning = false;
  var loggedOut = false;
  var overlay, countEl, badge, badgeText;

  function tr(zh, o) {
    return (window.TLI_I18N && typeof window.TLI_I18N.t === 'function') ? window.TLI_I18N.t(zh, o) : zh;
  }
  function readLast() {
    var v = null;
    try { v = parseInt(localStorage.getItem(KEY), 10); } catch (e) { /* 私密瀏覽等情境略過 */ }
    return (v && !isNaN(v)) ? Math.max(v, memLast) : memLast;
  }
  function writeLast(ts) {
    memLast = ts;
    lastWrite = ts;
    try { localStorage.setItem(KEY, String(ts)); } catch (e) { /* 略過 */ }
  }
  function mediaPlaying() {
    var list = document.querySelectorAll('video, audio');
    for (var i = 0; i < list.length; i++) {
      if (!list[i].paused && !list[i].ended && list[i].readyState > 2) return true;
    }
    return false;
  }
  function fmtClock(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000));
    var m = Math.floor(s / 60);
    s = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------- 樣式 ---------- */
  function injectStyle() {
    var css =
      /* 彈窗 */
      '.tli-idle-ov{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:10000;padding:16px;}' +
      '.tli-idle-ov.show{display:flex;}' +
      '.tli-idle-box{background:#fff;border-radius:14px;box-shadow:0 12px 40px rgba(15,23,42,.25);width:100%;max-width:400px;padding:26px 24px 20px;text-align:center;font-family:inherit;color:#1f2937;}' +
      '.tli-idle-icon{width:52px;height:52px;border-radius:50%;background:#E6EEF8;color:#1B4E8C;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;}' +
      '.tli-idle-box h3{margin:0 0 8px;font-size:18px;font-weight:700;}' +
      '.tli-idle-box p{margin:0;font-size:14px;line-height:1.7;color:#4b5563;}' +
      '.tli-idle-count{display:block;font-size:30px;font-weight:700;color:#1B4E8C;margin:12px 0 4px;font-variant-numeric:tabular-nums;letter-spacing:1px;}' +
      '.tli-idle-btns{display:flex;gap:10px;margin-top:18px;}' +
      '.tli-idle-btns button{flex:1;padding:10px 12px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}' +
      '.tli-idle-out{background:#fff;color:#4b5563;border:1px solid #d1d5db;}' +
      '.tli-idle-out:hover{background:#f3f4f6;}' +
      '.tli-idle-go{background:#1B4E8C;color:#fff;border:1px solid #1B4E8C;}' +
      '.tli-idle-go:hover{background:#123A68;}' +
      '.tli-idle-btns button:focus-visible{outline:2px solid #1B4E8C;outline-offset:2px;}' +
      /* 右上角倒數標籤 */
      '.tli-idle-badge{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#4b5563;font-size:12.5px;font-weight:600;white-space:nowrap;font-family:inherit;font-variant-numeric:tabular-nums;flex:none;margin-right:8px;box-sizing:border-box;}' +
      '.tli-idle-badge svg{flex:none;}' +
      '.tli-idle-badge.warn{background:#FFF4E5;border-color:#F5C27A;color:#B45309;}' +
      '.tli-idle-badge.float{position:fixed;top:12px;right:12px;z-index:9000;margin:0;box-shadow:0 2px 8px rgba(15,23,42,.12);}' +
      '.tli-idle-badge .tli-idle-short{display:none;}' +
      '@media (max-width:640px){.tli-idle-badge .tli-idle-long{display:none;}.tli-idle-badge .tli-idle-short{display:inline;}.tli-idle-badge{padding:0 8px;}}';
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- 彈窗 ---------- */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'tli-idle-ov';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tliIdleTitle');
    overlay.setAttribute('aria-describedby', 'tliIdleDesc');
    overlay.innerHTML =
      '<div class="tli-idle-box">' +
        '<div class="tli-idle-icon"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 7 12 12 15 14"/></svg></div>' +
        '<h3 id="tliIdleTitle"></h3>' +
        '<p id="tliIdleDesc"></p>' +
        '<span class="tli-idle-count" id="tliIdleCount" aria-live="off"></span>' +
        '<div class="tli-idle-btns">' +
          '<button type="button" class="tli-idle-out" id="tliIdleOut"></button>' +
          '<button type="button" class="tli-idle-go" id="tliIdleGo"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    countEl = document.getElementById('tliIdleCount');
    document.getElementById('tliIdleGo').addEventListener('click', keepAlive);
    document.getElementById('tliIdleOut').addEventListener('click', logout);
  }

  /* ---------- 右上角倒數標籤 ---------- */
  function buildBadge() {
    badge = document.createElement('span');
    badge.className = 'tli-idle-badge';
    badge.setAttribute('role', 'timer');
    badge.setAttribute('aria-live', 'off');
    badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 7 12 12 15 14"/></svg><span class="tli-idle-long"></span><span class="tli-idle-short"></span>';
    badgeText = { long: badge.querySelector('.tli-idle-long'), short: badge.querySelector('.tli-idle-short') };
    mountBadge();
  }
  function mountBadge() {
    var host = document.querySelector('.tb-actions, .topbar-actions');
    if (host) {
      badge.classList.remove('float');
      var sw = document.getElementById('tliI18nSwitch');
      if (sw && sw.parentNode === host) host.insertBefore(badge, sw);  // 語言按鈕左邊
      else host.insertBefore(badge, host.firstChild);
    } else {
      badge.classList.add('float');
      document.body.appendChild(badge);
    }
  }
  function renderBadge(left) {
    if (!badge) return;
    // 語言按鈕可能晚於本腳本掛上，確保標籤維持在它左邊
    var sw = document.getElementById('tliI18nSwitch');
    if (sw && badge.nextElementSibling !== sw && sw.parentNode === badge.parentNode) mountBadge();
    badge.classList.toggle('warn', left <= WARN_MS);
    var c = fmtClock(left); // 一律 分:秒，例 30:00、04:30（使用者 2026-11-11 指定）
    badgeText.long.textContent = tr(c + ' 後自動登出', { en: 'Sign-out in ' + c, ja: c + ' 後に自動ログアウト', de: 'Abmeldung in ' + c });
    badgeText.short.textContent = c;
    badge.title = tr('閒置 ' + IDLE_MIN + ' 分鐘會自動登出，有任何操作就重新計時。', {
      en: 'You will be signed out after ' + IDLE_MIN + ' minutes of inactivity. Any activity resets the timer.',
      ja: IDLE_MIN + ' 分間操作がないと自動的にログアウトします。操作するとタイマーがリセットされます。',
      de: 'Nach ' + IDLE_MIN + ' Minuten Inaktivität werden Sie abgemeldet. Jede Aktivität setzt den Timer zurück.'
    });
  }

  function renderText() {
    if (!overlay) return;
    document.getElementById('tliIdleTitle').textContent = tr('是否要繼續使用？', { en: 'Still there?', ja: '引き続きご利用になりますか？', de: 'Möchten Sie fortfahren?' });
    document.getElementById('tliIdleDesc').textContent = tr('你已經一段時間沒有操作，為了保護帳號安全，系統將在倒數結束後自動登出。', {
      en: 'You have been inactive for a while. To keep your account secure, you will be signed out automatically when the countdown ends.',
      ja: 'しばらく操作がありませんでした。アカウント保護のため、カウントダウン終了後に自動的にログアウトします。',
      de: 'Sie waren eine Weile inaktiv. Zum Schutz Ihres Kontos werden Sie nach Ablauf des Countdowns automatisch abgemeldet.'
    });
    document.getElementById('tliIdleOut').textContent = tr('登出', { en: 'Sign out', ja: 'ログアウト', de: 'Abmelden' });
    document.getElementById('tliIdleGo').textContent = tr('繼續使用', { en: 'Continue', ja: '続ける', de: 'Fortfahren' });
    renderBadge(IDLE_MS - (Date.now() - readLast()));
  }

  /* ---------- 計時 ---------- */
  function showWarn() {
    if (warning) return;
    warning = true;
    overlay.classList.add('show');
    try { document.getElementById('tliIdleGo').focus(); } catch (e) { /* 略過 */ }
  }
  function hideWarn() {
    if (!warning) return;
    warning = false;
    overlay.classList.remove('show');
  }
  function keepAlive() {
    writeLast(Date.now());
    hideWarn();
    renderBadge(IDLE_MS);
  }
  function logout() {
    if (loggedOut) return;
    loggedOut = true;
    try { localStorage.removeItem(KEY); } catch (e) { /* 略過 */ }
    try {
      ['tliLoggedIn', 'tliAcct', 'tliAdminSession_v1'].forEach(function (k) { sessionStorage.removeItem(k); });
    } catch (e) { /* 略過 */ }
    location.href = loginUrl + '?timeout=' + IDLE_MIN;
  }
  function tick() {
    if (loggedOut) return;
    if (mediaPlaying()) writeLast(Date.now()); // 播放中算有操作
    var left = IDLE_MS - (Date.now() - readLast());
    if (left <= 0) { logout(); return; }
    if (left <= WARN_MS) {
      showWarn();
      countEl.textContent = fmtClock(left);
    } else {
      hideWarn(); // 其他分頁按了「繼續使用」或有操作時，這裡跟著收起
    }
    renderBadge(left);
  }
  function onActivity() {
    if (warning || loggedOut) return; // 提示出現後，只有按「繼續使用」才重新計時
    var now = Date.now();
    memLast = now;
    if (now - lastWrite >= WRITE_THROTTLE_MS) writeLast(now);
  }

  function init() {
    injectStyle();
    buildOverlay();
    buildBadge();
    writeLast(Date.now()); // 開啟頁面視同一次操作
    renderText();
    if (window.TLI_I18N && typeof window.TLI_I18N.onRefresh === 'function') window.TLI_I18N.onRefresh(renderText);
    ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(function (ev) {
      document.addEventListener(ev, onActivity, { capture: true, passive: true });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
    setInterval(tick, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
