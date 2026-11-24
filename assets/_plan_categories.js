/* 銷售方案前台分類（2026-11-24 使用者決定）
   - 三層分類，每一層都可新增：
       第一層＝官網上方選單（例：中文課程、外文課程、華語師資班、企業培訓）
       第二層＝課程列表頁的分頁（例：一對一、學期班、小組班、線上課程），可加描述（編輯器）
       第三層＝方案群組，可設「主打」；主打分類在該分頁排最前面並加「主打」標示
   - 方案只掛第三層，可複選（一個方案可在多個分類）
   - 方案可勾「置頂」，顯示在課程列表頁最上方的 banner
   後台 a04（銷售方案設定）維護，前台 p02（課程列表頁）與公開網站頁首選單讀同一份；
   原型以 localStorage 保存，後台改了分類，重新整理前台即可看到。

   示範資料來源：第一層四項、中文課程下的第二層四項、第三層「（初級）日常生活一手包」取自使用者 2026-11-24 提供的現行官網截圖；
   其餘第二、三層名稱為新達依前台既有示範方案（p02 PLANS）分組暫訂，正式名稱待 TLI 提供。
   後台示範方案（pk1～pk6）與前台示範方案（p02 PLANS）本來就是兩份不同的示範資料，兩邊的分類勾選各自示範。 */
(function(){
  var KEY = 'tliPlanCats_v1';

  function c(id, level, parent, zh, en, extra){
    var o = {id:id, level:level, parent:parent, name:{zh:zh, en:en}, desc:{zh:'', en:''}, featured:false};
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  function defaults(){
    return {
      cats: [
        c('c1', 1, null, '中文課程', 'Chinese Courses'),
        c('c1a', 2, 'c1', '一對一', 'One-on-One', {desc:{zh:'<p>一對一線上課程，由顧問依程度安排老師與上課時段。</p>', en:'<p>One-on-one online classes. An advisor arranges your teacher and class times based on your level.</p>'}}),
        c('c1a1', 3, 'c1a', '（初級）日常生活一手包', '(Beginner) Everyday Life Starter Pack', {featured:true}),
        c('c1a2', 3, 'c1a', '中文一對一方案', 'Chinese One-on-One Plans'),
        c('c1b', 2, 'c1', '學期班', 'Semester Classes'),
        c('c1b1', 3, 'c1b', '中文學期班', 'Chinese Semester Classes'),
        c('c1c', 2, 'c1', '小組班', 'Small Group Classes'),
        c('c1c1', 3, 'c1c', '中文彈性團體班', 'Chinese Flexible Group Classes'),
        c('c1d', 2, 'c1', '線上課程', 'Online Courses'),
        c('c1d1', 3, 'c1d', '自學影音', 'Self-paced Video'),
        c('c1d2', 3, 'c1d', 'Mandarin Lounge', 'Mandarin Lounge'),
        c('c1d3', 3, 'c1d', '文化體驗', 'Cultural Experiences'),
        c('c2', 1, null, '外文課程', 'Foreign Language Courses'),
        c('c2a', 2, 'c2', '一對一', 'One-on-One'),
        c('c2a1', 3, 'c2a', '英文一對一方案', 'English One-on-One Plans'),
        c('c2a2', 3, 'c2a', '日韓德法一對一方案', 'Japanese, Korean, German & French One-on-One'),
        c('c2b', 2, 'c2', '小組班', 'Small Group Classes'),
        c('c2b1', 3, 'c2b', '英文彈性團體班', 'English Flexible Group Classes'),
        c('c3', 1, null, '華語師資班', 'Mandarin Teacher Training'),
        c('c3a', 2, 'c3', '線上課程', 'Online Courses'),
        c('c3a1', 3, 'c3a', '師資認證線上課程', 'Teacher Certification Online Course'),
        c('c4', 1, null, '企業培訓', 'Corporate Training'),
        c('c4a', 2, 'c4', '線上課程', 'Online Courses'),
        c('c4a1', 3, 'c4a', '企業線上培訓', 'Corporate Online Training')
      ],
      assign: {
        /* 前台示範方案（p02 PLANS） */
        'zh-1on1-trial':['c1a1','c1a2'], 'zh-1on1-standard':['c1a1','c1a2'], 'zh-1on1-corp':['c1a2'],
        'semester-zh-campus':['c1b1'], 'flex-zh-trial':['c1c1'], 'flex-zh-standard':['c1c1'],
        'self-zh-pack':['c1d1'], 'chatroom-pass-90':['c1d2'], 'culture-zh-single':['c1d3'], 'culture-zh-season':['c1d3'],
        'en-1on1-trial':['c2a1'], 'en-1on1-standard':['c2a1'],
        'jp-1on1-standard':['c2a2'], 'ko-1on1-standard':['c2a2'], 'de-1on1-standard':['c2a2'], 'fr-1on1-standard':['c2a2'],
        'flex-en-standard':['c2b1'], 'cert-teacher-2026':['c3a1'], 'corp-training-custom':['c4a1'],
        /* 後台示範方案（TLI_MASTERS.packages） */
        'pk1':['c1a2'], 'pk5':['c1a1','c1a2'], 'pk2':['c1c1'], 'pk3':['c1d1'], 'pk4':['c4a1'], 'pk6':['c1b1']
      },
      pinned: ['zh-1on1-trial', 'self-zh-pack', 'pk1']
    };
  }

  var S;
  function load(){
    try { var raw = localStorage.getItem(KEY); if (raw){ S = JSON.parse(raw); if (S && S.cats && S.assign && S.pinned) return; } } catch(e){}
    S = defaults();
  }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} }
  function reset(){ try { localStorage.removeItem(KEY); } catch(e){} S = defaults(); }
  load();

  function lang(){ var l = (window.TLI_I18N && TLI_I18N.currentLang) ? TLI_I18N.currentLang() : 'zh-TW'; return /^zh/.test(l) ? 'zh' : 'en'; }
  /* 名稱／描述只存繁中與英文：簡中由語系模組自動轉換，其他語系退回英文，英文未填再退回繁中 */
  function txt(obj){
    if (!obj) return '';
    var zh = obj.zh || '', en = obj.en || zh;
    return (window.TLI_I18N && TLI_I18N.t) ? TLI_I18N.t(zh, en) : zh;
  }
  function byId(id){ return S.cats.filter(function(x){ return x.id === id; })[0] || null; }
  function children(parentId){ return S.cats.filter(function(x){ return x.parent === parentId; }); }
  function roots(){ return children(null); }
  function path(id, sep){
    var out = [], x = byId(id);
    while (x){ out.unshift(txt(x.name)); x = x.parent ? byId(x.parent) : null; }
    return out.join(sep || ' › ');
  }
  function catsOf(planId){ return (S.assign[planId] || []).filter(function(id){ return !!byId(id); }); }
  function plansOf(catId, planIds){
    return planIds.filter(function(pid){ return (S.assign[pid] || []).indexOf(catId) >= 0; });
  }
  function setCat(planId, catId, on){
    var a = (S.assign[planId] || []).filter(function(id){ return id !== catId; });
    if (on) a.push(catId);
    S.assign[planId] = a; save();
  }
  function isPinned(planId){ return S.pinned.indexOf(planId) >= 0; }
  function setPinned(planId, on){
    S.pinned = S.pinned.filter(function(id){ return id !== planId; });
    if (on) S.pinned.push(planId);
    save();
  }
  function uid(){ return 'c' + Date.now().toString(36) + Math.floor(Math.random()*1e3).toString(36); }
  function add(level, parent, name, extra){
    var o = c(uid(), level, parent, name.zh, name.en || '', extra);
    /* 插在同一上層的最後一個子孫之後，讓陣列順序維持樹狀 */
    var idx = S.cats.length;
    if (parent){
      var last = S.cats.indexOf(byId(parent));
      S.cats.forEach(function(x, i){ if (isDescendant(x.id, parent)) last = i; });
      idx = last + 1;
    }
    S.cats.splice(idx, 0, o); save(); return o;
  }
  function isDescendant(id, ancestorId){
    var x = byId(id); while (x && x.parent){ if (x.parent === ancestorId) return true; x = byId(x.parent); } return false;
  }
  function update(id, fields){ var x = byId(id); if (!x) return; for (var k in fields) x[k] = fields[k]; save(); }
  function remove(id){
    S.cats = S.cats.filter(function(x){ return x.id !== id; });
    Object.keys(S.assign).forEach(function(pid){ S.assign[pid] = S.assign[pid].filter(function(cid){ return cid !== id; }); });
    save();
  }
  /* 與同一上層的前／後一個兄弟交換位置（連同各自的下層一起搬） */
  function move(id, d){
    var x = byId(id); if (!x) return;
    var sibs = children(x.parent), i = sibs.indexOf(x), j = i + d;
    if (j < 0 || j >= sibs.length) return;
    var a = d < 0 ? sibs[j] : x, b = d < 0 ? x : sibs[j];   // a 在前、b 在後，交換成 b 在前
    var blockA = [a].concat(S.cats.filter(function(y){ return isDescendant(y.id, a.id); }));
    var blockB = [b].concat(S.cats.filter(function(y){ return isDescendant(y.id, b.id); }));
    var start = S.cats.indexOf(a);
    var rest = S.cats.filter(function(y){ return blockA.indexOf(y) < 0 && blockB.indexOf(y) < 0; });
    rest.splice.apply(rest, [start, 0].concat(blockB, blockA));
    S.cats = rest; save();
  }
  /* 第三層依「主打在前、其餘照排序」 */
  function shelvesOf(l2Id){
    var l3 = children(l2Id);
    return l3.filter(function(x){ return x.featured; }).concat(l3.filter(function(x){ return !x.featured; }));
  }

  /* ---------- 公開網站頁首：第一層選單＋第二層下拉 ---------- */
  var NAV_CSS = '.site-nav:has(.pc-nav){gap:12px;}' +   // 第一層選單較長，縮小間距讓頁首維持一行
    '.pc-nav{position:relative;display:inline-flex;align-items:center;}' +
    '.pc-nav-top{display:inline-flex;align-items:center;gap:4px;}' +
    '.pc-nav-top svg{transition:transform .15s;}' +
    '.pc-nav-menu{display:none;position:absolute;top:100%;left:-12px;padding-top:10px;z-index:60;}' +
    '.pc-nav-menu-in{min-width:170px;background:#fff;border:1px solid #E4E7EC;border-radius:10px;box-shadow:0 10px 28px rgba(16,24,40,.12);padding:6px;}' +
    '.pc-nav-menu a{display:block;padding:9px 12px;border-radius:7px;font-weight:500;white-space:nowrap;}' +
    '.pc-nav-menu a:hover{background:#F2F5FA;}' +
    '.pc-nav:hover .pc-nav-menu,.pc-nav:focus-within .pc-nav-menu{display:block;}' +
    '.pc-nav:hover .pc-nav-top svg{transform:rotate(180deg);}' +
    '@media(max-width:780px){.pc-nav{flex-direction:column;align-items:flex-start;width:100%;}' +
    '.pc-nav-menu{display:block;position:static;padding:0 0 0 14px;}.pc-nav-menu-in{border:0;box-shadow:none;padding:0;background:none;}' +
    '.pc-nav-menu a{min-height:40px;display:flex;align-items:center;padding:0;font-weight:500;}.pc-nav-top svg{display:none;}}';
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
  function renderNav(){
    var nav = document.querySelector('.site-nav'); if (!nav) return;
    if (!document.getElementById('pcNavCss')){ var st = document.createElement('style'); st.id = 'pcNavCss'; st.textContent = NAV_CSS; document.head.appendChild(st); }
    nav.querySelectorAll('.pc-nav').forEach(function(el){ el.remove(); });
    var courses = nav.querySelector('a[data-i18n="nav_courses"]');
    var ent = nav.querySelector('a[data-i18n="nav_enterprise"]');
    var anchor = courses || nav.firstChild;
    var chev = '<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 8 10 12 14 8"/></svg>';
    roots().forEach(function(l1){
      var w = document.createElement('div'); w.className = 'pc-nav';
      var subs = children(l1.id);
      w.innerHTML = '<a class="pc-nav-top" href="p02_courses.html?l1='+l1.id+'">'+esc(txt(l1.name))+(subs.length ? chev : '')+'</a>' +
        (subs.length ? '<div class="pc-nav-menu"><div class="pc-nav-menu-in">'+subs.map(function(l2){ return '<a href="p02_courses.html?l1='+l1.id+'&l2='+l2.id+'">'+esc(txt(l2.name))+'</a>'; }).join('')+'</div></div>' : '');
      nav.insertBefore(w, anchor);
    });
    if (courses) courses.style.display = roots().length ? 'none' : '';
    /* 第一層已有「企業培訓」時，隱藏原本連到企業培訓頁的同名連結，避免選單重複（企業培訓頁仍可由首頁進入） */
    if (ent) ent.style.display = roots().some(function(x){ return x.name.zh === '企業培訓'; }) ? 'none' : '';
  }
  function initNav(){
    renderNav();
    if (window.TLI_I18N && TLI_I18N.onRefresh) TLI_I18N.onRefresh(renderNav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNav); else initNav();

  window.TLI_PLAN_CATS = {
    state: function(){ return S; }, save: save, reset: reset, reload: load,
    byId: byId, children: children, roots: roots, path: path, txt: txt, lang: lang,
    catsOf: catsOf, plansOf: plansOf, setCat: setCat, isPinned: isPinned, setPinned: setPinned,
    add: add, update: update, remove: remove, move: move, shelvesOf: shelvesOf, renderNav: renderNav
  };
})();
