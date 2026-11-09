/* 原型全站「檢視階段」切換：1A／1B／1C／二階段（累計：選 1B＝1A＋1B 已上線的範圍）
 * 依賴：assets/_phase_map.js（由 _腳本/build_phase_map_20261030.py 從功能展開 Excel 產生）
 * 行為：
 *   1. 右下角切換列；選擇存 localStorage，換頁沿用
 *   2. 側欄／底部導覽：選定階段還沒上線的頁變灰並標「XX 上線」，仍可點
 *   3. 本頁晚於選定階段才上線 → 蓋說明層，可一鍵切到該階段
 *   4. 本頁涉及多個階段的功能 → 展開可看各功能上線階段
 *   5. 同一頁依階段換身分或檢視：會員區 1A＝專案合作學生、其他＝直營學生；t11 1A＝中心教師版；h01 1C 起顯示老師評語 */
(function () {
  var MAP = window.TLI_PHASE_MAP || {};
  var ORDER = ['1A', '1B', '1C', '2'];
  var NAME = { '1A': '一階段 A', '1B': '一階段 B', '1C': '一階段 C', '2': '第二階段' };
  var SHORT = { '1A': '1A', '1B': '1B', '1C': '1C', '2': '二階段' };
  var KEY = 'tliPhaseView', KEY_OPEN = 'tliPhaseOpen';
  function rank(p) { return ORDER.indexOf(p); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function keyOf(url) {
    try { var segs = decodeURIComponent(new URL(url, location.href).pathname).split('/'); return segs.slice(-2).join('/'); } catch (e) { return ''; }
  }
  var sel = lsGet(KEY, '2'); if (rank(sel) < 0) { sel = '2'; }
  var page = keyOf(location.href), info = MAP[page];

  /* ---------- 5. 依階段換身分／檢視（必要時換網址，只換一次） ---------- */
  function withQuery(add, remove) {
    var sp = new URLSearchParams(location.search);
    (remove || []).forEach(function (k) { sp.delete(k); });
    Object.keys(add || {}).forEach(function (k) { sp.set(k, add[k]); });
    var q = sp.toString(); return location.pathname + (q ? '?' + q : '') + location.hash;
  }
  var HOOKS = {
    '教師端/t11_lounge_sessions.html': function (p) { var on = p === '1A', has = /[?&]view=1a\b/.test(location.search); return on === has ? null : (on ? withQuery({ view: '1a' }) : withQuery(null, ['view'])); },
    '組織端/h01_dashboard.html': function (p) { var on = rank(p) >= 2, has = /[?&]phase=1c\b/.test(location.search); return on === has ? null : (on ? withQuery({ phase: '1c' }) : withQuery(null, ['phase'])); }
  };
  /* 1A 只有專案合作學生；1B 起兩種學生並存，所以只在「從 1A 切出去」時才換回直營學生 */
  function memberRedirect(p, leaving1A) {
    if (!/^會員區\//.test(page) || !window.TLI_PL || !window.TLI_PL.me) { return null; }
    var isPj = window.TLI_PL.me().mode === 'project';
    if (p === '1A' && !isPj) { return withQuery({ sid: 'pr12', acct: 'ma03' }, ['mode']); }
    if (p !== '1A' && isPj && leaving1A) { return withQuery({ mode: 'general', acct: 'ma01' }, ['sid', 'activated']); }
    return null;
  }
  function targetFor(p, leaving1A) { return memberRedirect(p, leaving1A) || (HOOKS[page] ? HOOKS[page](p) : null); }
  var first = targetFor(sel);
  if (first) { location.replace(first); return; }

  /* ---------- 樣式 ---------- */
  var css = '' +
    '.ph-sw{position:fixed;right:12px;bottom:12px;z-index:9500;background:#fff;border:1px solid #E4E7EC;border-radius:12px;box-shadow:0 8px 24px rgba(16,24,40,.16);padding:8px 10px;font:13px/1.5 "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;color:#101828;max-width:calc(100vw - 24px);}' +
    '.ph-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}' +
    '.ph-lb{font-size:12px;font-weight:700;color:#667085;white-space:nowrap;}' +
    '.ph-seg{display:flex;background:#F2F4F7;border-radius:8px;padding:3px;}' +
    '.ph-seg button{border:none;background:none;font:inherit;font-weight:600;color:#667085;padding:5px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;}' +
    '.ph-seg button.on{background:#1B4E8C;color:#fff;}' +
    '.ph-pg{font-size:12px;color:#475467;white-space:nowrap;}' +
    '.ph-pg b{color:#1B4E8C;}' +
    '.ph-tg{border:none;background:none;padding:4px;cursor:pointer;color:#667085;border-radius:6px;display:flex;}' +
    '.ph-tg svg{width:16px;height:16px;transition:transform .15s;}' +
    '.ph-sw.open .ph-tg svg{transform:rotate(180deg);}' +
    '.ph-list{display:none;margin:8px 0 2px;padding:8px 0 0;border-top:1px solid #E4E7EC;list-style:none;max-height:40vh;overflow:auto;}' +
    '.ph-sw.open .ph-list{display:block;}' +
    '.ph-list li{display:flex;justify-content:space-between;gap:12px;padding:3px 0;}' +
    '.ph-list li.off{color:#98A2B3;}' +
    '.ph-chip{flex:none;font-size:11.5px;font-weight:700;padding:1px 8px;border-radius:999px;background:#E8F0FB;color:#1B4E8C;align-self:flex-start;}' +
    '.ph-list li.off .ph-chip{background:#F2F4F7;color:#98A2B3;}' +
    '.ph-off{opacity:.45;}' +
    '.ph-tag{display:inline-block;margin-left:6px;font-size:11px;font-weight:700;padding:0 6px;border-radius:999px;background:#F2F4F7;color:#667085;white-space:nowrap;vertical-align:middle;}' +
    '.ph-cover{position:fixed;inset:0;z-index:9400;background:rgba(245,247,250,.88);display:flex;align-items:center;justify-content:center;padding:16px;}' +
    '.ph-card{background:#fff;border:1px solid #E4E7EC;border-radius:12px;box-shadow:0 8px 24px rgba(16,24,40,.12);padding:22px 22px 18px;max-width:420px;width:100%;font:14px/1.6 "Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;color:#101828;}' +
    '.ph-card h3{margin:0 0 6px;font-size:17px;}' +
    '.ph-card p{margin:0 0 16px;color:#475467;}' +
    '.ph-card .ph-acts{display:flex;gap:8px;flex-wrap:wrap;}' +
    '.ph-card button{font:inherit;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;border:1.5px solid #1B4E8C;}' +
    '.ph-card .ph-pri{background:#1B4E8C;color:#fff;}.ph-card .ph-sec{background:#fff;color:#1B4E8C;}' +
    '@media(max-width:520px){.ph-sw{left:12px;right:12px;}.ph-seg{flex:1;}.ph-seg button{flex:1;padding:5px 4px;}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function go(p) {
    lsSet(KEY, p);
    var t = targetFor(p, sel === '1A');
    if (t) { location.href = t; } else { location.reload(); }
  }

  function build() {
    /* ---------- 2. 導覽連結標示 ---------- */
    var isIndex = /(^|\/)index\.html$/.test(page) || /\/$/.test(location.pathname);
    var navSel = isIndex ? 'body a[href]' : '.side-nav a[href], .bottom-nav a[href], .sidebar a[href], .site-nav a[href], .nav-segment a[href]';
    Array.prototype.forEach.call(document.querySelectorAll(navSel), function (a) {
      if (a.classList.contains('brand') || a.closest('.side-brand')) { return; }
      var h = a.getAttribute('href') || ''; if (!/\.html/.test(h)) { return; }
      var m = MAP[keyOf(h)]; if (!m || rank(m.p) <= rank(sel)) { return; }
      a.classList.add('ph-off');
      var tag = document.createElement('span'); tag.className = 'ph-tag'; tag.textContent = SHORT[m.p] + ' 上線';
      var lab = a.querySelector('span') || a; lab.appendChild(tag);
    });

    /* ---------- 1. 切換列 ---------- */
    var feats = info ? info.f : [];
    var multi = feats.some(function (f) { return f[1] !== feats[0][1]; });
    var box = document.createElement('div'); box.className = 'ph-sw' + (lsGet(KEY_OPEN, '0') === '1' && feats.length ? ' open' : '');
    var h = '<div class="ph-row"><span class="ph-lb">檢視階段</span><div class="ph-seg">' +
      ORDER.map(function (p) { return '<button type="button" data-ph="' + p + '" class="' + (p === sel ? 'on' : '') + '" title="' + NAME[p] + '（含之前階段）">' + SHORT[p] + '</button>'; }).join('') + '</div>';
    if (info) { h += '<span class="ph-pg">本頁 <b>' + NAME[info.p] + '</b> 上線' + (multi ? '・功能分階段' : '') + '</span>'; }
    if (feats.length) { h += '<button type="button" class="ph-tg" aria-label="本頁功能與上線階段"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg></button>'; }
    h += '</div>';
    if (feats.length) {
      h += '<ul class="ph-list">' + feats.map(function (f) {
        var off = rank(f[1]) > rank(sel);
        return '<li class="' + (off ? 'off' : '') + '"><span>' + f[0].replace(/[&<>]/g, '') + '</span><span class="ph-chip">' + SHORT[f[1]] + (off ? ' 才上線' : '') + '</span></li>';
      }).join('') + '</ul>';
    }
    box.innerHTML = h; document.body.appendChild(box);
    box.querySelectorAll('[data-ph]').forEach(function (b) { b.onclick = function () { if (b.dataset.ph !== sel) { go(b.dataset.ph); } }; });
    var tg = box.querySelector('.ph-tg');
    if (tg) { tg.onclick = function () { box.classList.toggle('open'); lsSet(KEY_OPEN, box.classList.contains('open') ? '1' : '0'); }; }

    /* 避開右下角既有的固定元件（底部導覽、客服鈕等） */
    function place() {
      if (window.innerWidth <= 520) { box.style.bottom = ''; }
      var top = window.innerHeight;
      Array.prototype.forEach.call(document.body.querySelectorAll('*'), function (el) {
        if (el === box || box.contains(el) || el.classList.contains('ph-cover')) { return; }
        var cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') { return; }
        var r = el.getBoundingClientRect(); if (!r.width || !r.height || r.height > window.innerHeight * 0.5) { return; }
        if (r.bottom >= window.innerHeight - 4 && r.right >= window.innerWidth - 140 && r.top < top) { top = r.top; }
        else if (r.bottom > window.innerHeight - 140 && r.right > window.innerWidth - 140 && r.left > window.innerWidth - 200 && r.top < top) { top = r.top; }
      });
      box.style.bottom = (window.innerHeight - top + 12) + 'px';
    }
    place(); window.addEventListener('resize', place);
    document.body.style.paddingBottom = 'calc(' + (getComputedStyle(document.body).paddingBottom || '0px') + ' + 64px)';

    /* ---------- 3. 本頁還沒上線 ---------- */
    if (info && rank(info.p) > rank(sel)) {
      var cv = document.createElement('div'); cv.className = 'ph-cover';
      cv.innerHTML = '<div class="ph-card"><h3>這個畫面' + NAME[info.p] + '才上線</h3><p>目前檢視的是「' + NAME[sel] + '」上線時的範圍，這時候系統還沒有這個畫面。</p>' +
        '<div class="ph-acts"><button type="button" class="ph-pri">改看' + NAME[info.p] + '</button><button type="button" class="ph-sec">回上一頁</button></div></div>';
      document.body.appendChild(cv);
      cv.querySelector('.ph-pri').onclick = function () { go(info.p); };
      cv.querySelector('.ph-sec').onclick = function () { if (history.length > 1) { history.back(); } else { location.href = '../index.html'; } };
    }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 0); }); } else { setTimeout(build, 0); }
})();
