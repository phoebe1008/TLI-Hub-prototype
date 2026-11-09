/* TLI Hub 原型：共用語系切換模組（繁體中文／簡體中文／English；頁面可另宣告日本語／Deutsch）
 * 依賴：需先載入 assets/_i18n_dict.js（提供 TLI_I18N_DICT），本檔次之。
 * 20260929 五語擴充：
 *   - 頁面在載入本檔「之前」宣告 window.TLI_I18N_PAGE_LANGS = ['zh-TW','zh-CN','en','ja','de']，
 *     切換器才會出現日本語／Deutsch；沒宣告的頁面維持原本三語（語系清單照 _shared_masters.js 的 uiLocales）。
 *   - 日文／德文詞典：assets/_i18n_dict_ja.js（TLI_I18N_DICT.ja）、assets/_i18n_dict_de.js（TLI_I18N_DICT.de），
 *     key 與 en 共用；ja／de 查不到時退回 en，再查不到退回原文（不開天窗）。需在本檔之前載入。
 *   - t(zh, en) 維持相容；另支援 t(zh, {en:'...', ja:'...', de:'...'})。
 * 用法：
 *   1. <script src="../assets/_i18n_dict.js"></script>
 *      <script src="../assets/_i18n.js"></script>
 *      放在頁面既有 script（含 _shared_masters.js）之後、頁面自己的初始化流程之前皆可，
 *      但呼叫 TLI_I18N.init() 必須放在頁面自己的初始化流程「最後」（畫面都渲染完再 init）。
 *   2. 在畫面骨架元素上加 data-i18n="key"：
 *        - key 需能在 TLI_I18N_DICT.en 找到對應英文，找不到則英文模式照樣顯示原文（不開天窗）。
 *        - zh-TW／zh-CN 兩種語言一律走「機械繁簡字元對照表」，不理會 data-i18n 是否有標記。
 *      沒標記的節點：zh-CN 一樣會被機械轉換（含示範資料），en 保持原文（示範資料本來就不該翻）。
 *   3. 頁面自己的動態渲染函式（重新產生表格／抽屜／面板內容）結尾建議呼叫 TLI_I18N.refresh()，
 *      讓「已經在切非中文狀態下」的畫面，重繪後的新內容也能立刻套用目前語言（見下方 refresh 說明）。
 *      即使沒有呼叫，使用者之後再手動切一次語言，也會把當下畫面全部重新套用一次（apply() 是全域重繪）。
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'tli_ui_lang';
  var DEFAULT_LANG = 'zh-TW';

  var DICT_SRC = global.TLI_I18N_DICT || {};
  var EN_DICT = DICT_SRC.en || {};
  // 五語擴充：日文／德文詞典（只有宣告 TLI_I18N_PAGE_LANGS 的頁面會用到）
  var JA_DICT = DICT_SRC.ja || {};
  var DE_DICT = DICT_SRC.de || {};
  var PAGE_LANGS = (global.TLI_I18N_PAGE_LANGS && global.TLI_I18N_PAGE_LANGS.length) ? global.TLI_I18N_PAGE_LANGS : null;
  var hasOwn = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  // ja／de 查字典：本語 → en → null（null 代表維持原文）
  function lookupForeign(lang, key) {
    if (!key) return null;
    var d = lang === 'ja' ? JA_DICT : (lang === 'de' ? DE_DICT : null);
    if (d && hasOwn(d, key)) return d[key];
    if (hasOwn(EN_DICT, key)) return EN_DICT[key];
    return null;
  }
  function isJaDe(lang) { return lang === 'ja' || lang === 'de'; }
  var CHARMAP = DICT_SRC.zhTWtoCN || {};

  // 語系清單：優先沿用共用主檔 _shared_masters.js 的 uiLocales（與 a17 基礎資料設定一致），
  // 沒載入主檔（理論上不會發生，保底用）才退回這裡的內建清單。
  var LOCALE_ABBR_EN = { 'zh-TW': 'TW', 'zh-CN': 'CN', 'en': 'EN' };
  var LOCALE_NAME_NATIVE = {
    'zh-TW': { abbr: '繁中', name: '繁體中文' },
    'zh-CN': { abbr: '简中', name: '简体中文' },
    'en': { abbr: 'EN', name: 'English' },
    'ja': { abbr: 'JA', name: '日本語' },
    'de': { abbr: 'DE', name: 'Deutsch' }
  };
  function buildLangs() {
    // 頁面自行宣告語系清單（五語頁）：照宣告順序，只收認得的語系 id
    if (PAGE_LANGS) {
      var list = [];
      for (var pi = 0; pi < PAGE_LANGS.length; pi++) {
        var nm = LOCALE_NAME_NATIVE[PAGE_LANGS[pi]];
        if (nm) list.push({ id: PAGE_LANGS[pi], abbr: nm.abbr, name: nm.name });
      }
      if (list.length) return list;
    }
    var src = (global.TLI_MASTERS && global.TLI_MASTERS.uiLocales) || [
      { id: 'zh-TW', name: '繁體中文', abbr: '繁中' },
      { id: 'zh-CN', name: '簡體中文', abbr: '簡中' },
      { id: 'en', name: '英文', abbr: 'EN' }
    ];
    return src.map(function (l) {
      var native = LOCALE_NAME_NATIVE[l.id] || { abbr: l.abbr, name: l.name };
      return { id: l.id, abbr: native.abbr, name: native.name };
    });
  }
  var LANGS = buildLangs();

  var curLang = DEFAULT_LANG;

  // 原始（繁體中文）文字快取：第一次遇到某個 DOM 節點時，把「當下的文字」視為原文存起來，
  // 之後不論切幾次語言，都從這份原文重算，不會疊加轉換、也不會因為切過語言而回不去繁體。
  // 用 WeakMap 是因為：動態重繪（innerHTML 整段換掉）會產生全新的節點物件，
  // 新節點＝快取沒有紀錄＝視為「剛渲染出來的原始繁體」重新收錄，這正好符合這批頁面的渲染方式
  // （所有列表／抽屜／面板的內容都是從 JS 裡的繁體字串現組出來的）。
  var hasWeakMap = typeof WeakMap !== 'undefined';
  var elOrig = hasWeakMap ? new WeakMap() : null;   // data-i18n 元素 -> 原始文字
  var textOrig = hasWeakMap ? new WeakMap() : null; // 未標記文字節點 -> 原始文字
  var attrOrig = hasWeakMap ? new WeakMap() : null; // 元素 -> { attrName: 原始值 }

  function convertCN(str) {
    if (!str) return str;
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      out += CHARMAP[ch] || ch;
    }
    return out;
  }

  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  var ATTRS_TO_CONVERT = ['placeholder', 'aria-label', 'title'];
  var CJK_RE = /[㐀-鿿]/;

  function closestDataI18n(el) {
    if (!el) return null;
    if (typeof el.closest === 'function') return el.closest('[data-i18n]');
    var cur = el;
    while (cur) {
      if (cur.getAttribute && cur.hasAttribute('data-i18n')) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  function applyTaggedEl(el) {
    var key = el.getAttribute('data-i18n');
    var orig = elOrig ? elOrig.get(el) : el.getAttribute('data-i18n-orig-cache');
    if (orig === undefined || orig === null) {
      orig = el.textContent;
      if (elOrig) elOrig.set(el, orig);
    }
    var fv = isJaDe(curLang) ? lookupForeign(curLang, key) : null;
    if (curLang === 'en' && Object.prototype.hasOwnProperty.call(EN_DICT, key)) {
      el.textContent = EN_DICT[key];
    } else if (fv !== null) {
      el.textContent = fv;
    } else if (curLang === 'zh-CN') {
      el.textContent = convertCN(orig);
    } else {
      el.textContent = orig;
    }
  }

  function applyPlainTextNode(node) {
    var orig = textOrig ? textOrig.get(node) : undefined;
    if (orig === undefined) {
      orig = node.nodeValue;
      if (textOrig) textOrig.set(node, orig);
    }
    node.nodeValue = (curLang === 'zh-CN') ? convertCN(orig) : orig;
  }

  // 屬性也可以指定英文字典 key：在同一元素上加 data-i18n-placeholder="key"／data-i18n-aria-label="key"／
  // data-i18n-title="key"，英文模式查得到就用字典翻譯，查不到（或 zh-TW／zh-CN）就照一般規則處理。
  function applyAttrs(el) {
    var rec = attrOrig ? attrOrig.get(el) : null;
    if (!rec) { rec = {}; if (attrOrig) attrOrig.set(el, rec); }
    for (var i = 0; i < ATTRS_TO_CONVERT.length; i++) {
      var a = ATTRS_TO_CONVERT[i];
      if (!el.hasAttribute(a)) continue;
      if (rec[a] === undefined) rec[a] = el.getAttribute(a);
      var i18nKey = el.getAttribute('data-i18n-' + a);
      var afv = (isJaDe(curLang) && i18nKey) ? lookupForeign(curLang, i18nKey) : null;
      if (curLang === 'en' && i18nKey && Object.prototype.hasOwnProperty.call(EN_DICT, i18nKey)) {
        el.setAttribute(a, EN_DICT[i18nKey]);
      } else if (afv !== null) {
        el.setAttribute(a, afv);
      } else if (curLang === 'zh-CN') {
        el.setAttribute(a, convertCN(rec[a]));
      } else {
        el.setAttribute(a, rec[a]);
      }
    }
  }

  function walk(root) {
    root = root || document.body;
    if (!root) return;

    // 1. 有 data-i18n 標記的骨架元素：英文查字典，繁簡走機械轉換表
    var tagged = root.querySelectorAll('[data-i18n]');
    for (var i = 0; i < tagged.length; i++) applyTaggedEl(tagged[i]);

    // 2. 沒標記的文字節點：zh-CN 機械轉換（含示範資料），zh-TW／en 維持原文
    if (document.createTreeWalker) {
      var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while ((node = tw.nextNode())) {
        var p = node.parentElement || node.parentNode;
        if (!p || !p.tagName || SKIP_TAGS[p.tagName]) continue;
        if (closestDataI18n(p)) continue; // 已由步驟 1 處理，避免重複轉換
        if (!CJK_RE.test(node.nodeValue)) continue; // 沒中文字就跳過，省效能
        applyPlainTextNode(node);
      }
    }

    // 3. 常見屬性（placeholder／aria-label／title）：同樣 zh-CN 機械轉換、其餘維持原文
    var attrEls = root.querySelectorAll('[placeholder],[aria-label],[title]');
    for (var j = 0; j < attrEls.length; j++) applyAttrs(attrEls[j]);
  }

  // 給頁面自己 JS 用的小工具：組字串時常常「中文字＋數字」夾雜（分頁列「第 N／共 M 筆」這類），
  // 沒辦法只靠 data-i18n 屬性處理，頁面可以直接呼叫 TLI_I18N.t(繁體原文, 英文譯文) 取得目前語言版本：
  // zh-TW 原樣、zh-CN 機械轉換、en 用第二參數（沒給就退回原文，不開天窗）。
  // 五語擴充：第二參數也可以是物件 {en, ja, de}；ja／de 缺譯時退回 en，再退回原文。
  function t(zh, en) {
    if (en !== null && typeof en === 'object') {
      if (curLang === 'zh-CN') return convertCN(zh);
      if (curLang === 'zh-TW') return zh;
      var v = en[curLang];
      if (v === undefined || v === null) v = en.en;
      return (v !== undefined && v !== null) ? v : zh;
    }
    if (isJaDe(curLang)) return (en !== undefined && en !== null) ? en : zh;
    if (curLang === 'en') return (en !== undefined && en !== null) ? en : zh;
    if (curLang === 'zh-CN') return convertCN(zh);
    return zh;
  }

  // 有些畫面內容是頁面自己的 JS 用「中文字＋數字」組出來的（不是靠 data-i18n 屬性走字典），
  // 例如分頁列「第 N／共 M 筆」。這類內容只有頁面自己重新 render 一次，配合 TLI_I18N.t() 才會換語言。
  // 頁面可以用 TLI_I18N.onRefresh(fn) 登記自己的渲染函式，語言切換時會自動幫你重跑一次，
  // 不用每個互動事件都自己記得呼叫 TLI_I18N.refresh()。
  var refreshCallbacks = [];
  function onRefresh(cb) {
    if (typeof cb === 'function') refreshCallbacks.push(cb);
  }

  function render() {
    if (document.documentElement) {
      document.documentElement.lang = curLang === 'en' ? 'en' : (isJaDe(curLang) ? curLang : (curLang === 'zh-CN' ? 'zh-Hans' : 'zh-Hant'));
    }
    walk(document.body);
    updateSwitcherUI();
  }

  function apply(lang) {
    var ok = false;
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].id === lang) { ok = true; break; } }
    if (!ok) return;
    curLang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* 私密瀏覽等情境略過 */ }
    for (var i = 0; i < refreshCallbacks.length; i++) {
      try { refreshCallbacks[i](); } catch (e) { /* 單一頁面渲染出錯不影響其他語系處理 */ }
    }
    render();
  }

  function refresh() { render(); }

  function currentLang() { return curLang; }

  /* ================= 切換器 UI ================= */
  var STYLE_ID = 'tliI18nStyle';
  var SWITCH_ID = 'tliI18nSwitch';

  var CSS_TEXT = [
    '.tli-i18n-switch{position:relative;flex-shrink:0;}',
    '.tli-i18n-btn{display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #E4E7EC;border-radius:8px;',
    'padding:5px 9px;font-size:12px;font-weight:600;color:#101828;cursor:pointer;font-family:inherit;line-height:1;white-space:nowrap;}',
    '.tli-i18n-btn:hover{background:#F5F7FA;}',
    '.tli-i18n-btn svg{flex-shrink:0;}',
    '.tli-i18n-menu{display:none;position:absolute;top:36px;right:0;background:#fff;border:1px solid #E4E7EC;border-radius:8px;',
    'box-shadow:0 8px 24px rgba(16,24,40,.16);padding:6px;width:160px;z-index:80;}',
    '.tli-i18n-menu.open{display:block;}',
    '.tli-i18n-opt{display:block;width:100%;text-align:left;background:none;border:none;padding:8px 10px;font-size:12.5px;',
    'color:#101828;cursor:pointer;border-radius:6px;font-family:inherit;}',
    '.tli-i18n-opt:hover{background:#F5F7FA;}',
    '.tli-i18n-opt.active{background:#E6EEF8;color:#1B4E8C;font-weight:600;}',
    '.tli-i18n-sidebar-mount{padding:0 12px 10px;}',
    '.tli-i18n-sidebar-mount .tli-i18n-btn{width:100%;justify-content:center;}',
    '.tli-i18n-sidebar-mount .tli-i18n-menu{left:0;right:0;top:auto;bottom:40px;width:auto;}',
    '@media(max-width:1023px){.tli-i18n-abbr-full{display:none;}}',
    /* 20260929：沒有頂欄、也沒有側欄身分區可掛的獨立頁（開通、登入等），按鈕固定在右上角，選單在按鈕正下方靠右 */
    '.tli-i18n-switch.tli-i18n-float{position:absolute;top:16px;right:16px;z-index:90;}',
    '.tli-i18n-float .tli-i18n-btn{box-shadow:0 1px 2px rgba(16,24,40,.06);}',
    '.tli-i18n-float .tli-i18n-menu{top:calc(100% + 6px);right:0;left:auto;max-width:calc(100vw - 32px);}',
    /* 手機寬：改成頁面最上方獨立一列靠右（不浮在內容上），避免壓到 logo、標題或步驟條 */
    '@media(max-width:600px){.tli-i18n-switch.tli-i18n-float{position:relative;top:auto;right:auto;display:flex;justify-content:flex-end;padding:10px 12px 0;}',
    '.tli-i18n-float .tli-i18n-menu{right:12px;}}'
  ].join('\n');

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  }

  var GLOBE_SVG = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7.5"/><line x1="2.5" y1="10" x2="17.5" y2="10"/><path d="M10 2.5c2.2 2.1 3.4 4.9 3.4 7.5s-1.2 5.4-3.4 7.5c-2.2-2.1-3.4-4.9-3.4-7.5S7.8 4.6 10 2.5z"/></svg>';

  function buildSwitcherHtml() {
    var opts = LANGS.map(function (l) {
      return '<button type="button" class="tli-i18n-opt" data-lang="' + l.id + '" role="menuitemradio">' + l.abbr + '　' + l.name + '</button>';
    }).join('');
    return '<div class="tli-i18n-switch" id="' + SWITCH_ID + '">' +
      '<button type="button" class="tli-i18n-btn" id="tliI18nBtn" aria-haspopup="true" aria-expanded="false" aria-label="Language / 語言切換">' +
      GLOBE_SVG +
      '<span class="tli-i18n-abbr" id="tliI18nAbbr">繁中</span>' +
      '</button>' +
      '<div class="tli-i18n-menu" id="tliI18nMenu" role="menu">' + opts + '</div>' +
      '</div>';
  }

  function closeMenu() {
    var m = document.getElementById('tliI18nMenu');
    var btn = document.getElementById('tliI18nBtn');
    if (m) m.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu(ev) {
    if (ev) ev.stopPropagation();
    // 開語言選單前，順手收掉頁面既有的其他浮層（gear/tb-panel/bell-panel 等），避免疊在一起
    var others = document.querySelectorAll('.tb-panel.open, .gearmenu.open, .bell-panel.open');
    for (var i = 0; i < others.length; i++) others[i].classList.remove('open');
    var m = document.getElementById('tliI18nMenu');
    var btn = document.getElementById('tliI18nBtn');
    if (!m) return;
    m.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', m.classList.contains('open') ? 'true' : 'false');
  }

  function updateSwitcherUI() {
    var abbr = document.getElementById('tliI18nAbbr');
    var meta = null;
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].id === curLang) { meta = LANGS[i]; break; } }
    if (abbr && meta) abbr.textContent = meta.abbr;
    var opts = document.querySelectorAll('.tli-i18n-opt');
    for (var j = 0; j < opts.length; j++) {
      opts[j].classList.toggle('active', opts[j].getAttribute('data-lang') === curLang);
    }
  }

  function mountSwitcher() {
    if (document.getElementById(SWITCH_ID)) return; // 已掛載過
    var host = document.querySelector('.tb-actions') || document.querySelector('.topbar-actions');
    var html = buildSwitcherHtml();
    if (host) {
      host.insertAdjacentHTML('afterbegin', html);
    } else {
      // 沒有 topbar 的頁面：掛在側欄底部身分區塊上方
      var suUser = document.getElementById('sidebarUser') || document.querySelector('.sidebar-user') || document.querySelector('.side-role');
      if (suUser && suUser.parentNode) {
        var wrap = document.createElement('div');
        wrap.className = 'tli-i18n-sidebar-mount';
        wrap.innerHTML = html;
        suUser.parentNode.insertBefore(wrap, suUser);
      } else if (document.body) {
        document.body.insertAdjacentHTML('afterbegin', html); // 保底：固定在右上角
        var fl = document.getElementById(SWITCH_ID);
        if (fl) fl.className += ' tli-i18n-float';
      }
    }
    var btn = document.getElementById('tliI18nBtn');
    if (btn) btn.addEventListener('click', toggleMenu);
    var opts = document.querySelectorAll('.tli-i18n-opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].addEventListener('click', function (ev) {
        ev.stopPropagation();
        apply(this.getAttribute('data-lang'));
        closeMenu();
      });
    }
    document.addEventListener('click', function (ev) {
      var wrap = document.getElementById(SWITCH_ID);
      if (wrap && !wrap.contains(ev.target)) closeMenu();
    });
  }

  function init(options) {
    options = options || {};
    injectStyleOnce();
    mountSwitcher();
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* 私密瀏覽等情境略過 */ }
    var ok = false;
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].id === saved) { ok = true; break; } }
    curLang = ok ? saved : DEFAULT_LANG;
    // 20260929 修正：重新開頁時若已存非預設語言，頁面在 init 前用 t() 組好的動態內容（分頁列、KPI 等）
    // 還是繁中；這裡補跑一次頁面登記的 onRefresh，讓初次載入與手動切換結果一致
    if (curLang !== DEFAULT_LANG) {
      for (var k = 0; k < refreshCallbacks.length; k++) {
        try { refreshCallbacks[k](); } catch (e) { /* 單一頁面渲染出錯不影響其他語系處理 */ }
      }
    }
    render();
  }

  global.TLI_I18N = {
    init: init,
    apply: apply,
    refresh: refresh,
    onRefresh: onRefresh,
    currentLang: currentLang,
    t: t,
    LANGS: LANGS
  };
})(window);
