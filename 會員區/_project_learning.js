/* 專案合作（Gateway）學習資料層：會員區、教師端、開通頁共用。
 * 依賴：assets/_shared_masters.js（TLI_MASTERS：partners p02、projectClasses、projectRoster、teachers、videoTools）。
 * 班級、名單、教師一律讀主檔；本檔只補「學習進度、Mandarin Lounge 場次與預約」這兩類主檔沒有的運作資料，
 * 進度由名單 id 決定性推算，預約存 localStorage（key：tliLoungeBookings_v1）。
 * 登入身分只存在目前分頁（sessionStorage），關掉分頁即回到一般會員畫面。 */
(function (g) {
  'use strict';
  var M = g.TLI_MASTERS;
  if (!M) { return; }

  var TODAY = '2027-03-15';                       /* 合作期間內的「今天」（2027-02-01～05-31） */
  var NOW_UTC = Date.UTC(2027, 2, 15, 16, 0);     /* 2027-03-15 09:00 亞利桑那時間（UTC-7） */
  var BK_KEY = 'tliLoungeBookings_v1';
  var OPEN_KEY = 'tliLoungeOpened_v1';             /* 中心教師開設的團體場次（直營）；專案合作場次由 TLI 中心教師帶，一階段 A 由新達於資料庫設定 */
  var FRESH_KEY = 'tliPLFreshActivated_v1';       /* 由開通頁剛啟用、尚無學習紀錄的名單 id */
  var SS_KEY = 'tliPLSession_v1';
  var LS_KEY = 'tliPLItems_v1';                    /* 專案合作學員項目完成紀錄（20261110 改為章節四層）：{ 名單id: { 項目id: { done, at, hm, minutes } } }；進度以項目為最小單位（客戶規格 4.4 §2-3） */
  var PASS_SCORE = 60;
  /* 單元測驗（課內作答）先隱藏：false 時課程頁不顯示測驗與達標條件，看完影片即完成本課。待確認出現階段後再開（docs/05 R31、R43、R98；m11_quiz 隨堂考／單元考為 1B） */
  var SHOW_UNIT_QUIZ = false;
  var EXISTING_MEMBERS = ['m.lopez@students.sample-u.example']; /* 已有 TLI 帳號的 Email（Email 全系統唯一，不能再開通專案合作帳號） */

  function T(zh, en) { return g.TLI_I18N ? g.TLI_I18N.t(zh, en) : zh; }

  /* ---------- 小工具 ---------- */
  function hash(s) { var x = 7; for (var i = 0; i < s.length; i++) { x = (x * 31 + s.charCodeAt(i)) >>> 0; } return x; }
  function rnd(s) { return (hash(s) % 1000) / 1000; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function addDays(str, n) { var p = str.split('-'); var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return ymd(d); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  var WD_ZH = ['日', '一', '二', '三', '四', '五', '六'];
  var WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function wd(str) { var p = str.split('-'); var i = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); return T('週' + WD_ZH[i], WD_EN[i]); }
  function mdLabel(str) { return str.slice(5).replace('-', '/'); }
  function jget(k, d) { try { var v = JSON.parse(g.localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { try { g.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- 主檔讀取 ---------- */
  function partner() { return M.partners.filter(function (p) { return p.id === 'p02'; })[0]; }
  function quotaCfg() { var q = (partner() || {}).loungeQuota || {}; return { perWeek: q.perStudentPerWeek || 3, groupCap: q.groupCap || 8 }; }
  function toolName(id) { var v = (M.videoTools || []).filter(function (t) { return t.id === id; })[0]; return v ? v.name : (id === 'zoom' ? 'Zoom' : 'Microsoft Teams'); }
  function project() { return (M.projects || []).filter(function (p) { return p.id === 'PRJ-EDU-AZU'; })[0]; }
  function projectName() { var p = project(); return p ? p.name : 'Gateway 專案合作．美國 範例州立大學'; }
  function classes() { return M.projectClasses.filter(function (c) { return c.partnerId === 'p02'; }); }
  function classById(id) { return M.projectClasses.filter(function (c) { return c.id === id; })[0]; }
  function teacherById(id) { return M.teachers.filter(function (t) { return t.id === id; })[0]; }
  /* 班級老師＝名單中 role 為老師的成員；班級的 teacherRid 指向名單成員 id */
  function teacherRosters() { return M.projectRoster.filter(function (r) { return r.role === '老師'; }); }
  function rosterById(id) { return M.projectRoster.filter(function (r) { return r.id === id; })[0]; }
  function students(classId) { return M.projectRoster.filter(function (r) { return r.role === '學生' && (!classId || r.classId === classId); }); }
  function rosterByEmail(em) { em = String(em || '').toLowerCase(); return M.projectRoster.filter(function (r) { return r.email.toLowerCase() === em; })[0]; }
  function teacherOfClass(cid) { var c = classById(cid); return c ? (rosterById(c.teacherRid) || null) : null; }
  function teacherForRoster(r) { return r && r.role === '老師' ? r : null; }
  function isExistingMember(email) { return EXISTING_MEMBERS.indexOf(String(email).toLowerCase()) >= 0; }
  function centerTeachers() { return M.teachers.filter(function (t) { return t.type === 'center' && t.status === '在職'; }).slice(0, 4); }

  /* ---------- 自學課程：課程 › 章 › 節 › 項目（20261110 改版） ----------
     結構讀主檔 TLI_MASTERS.selfPacedOutlines（與後台 a03「課程內容」同一份），前後台章節用詞一致：
     「第 N 章」「N-N」為系統標示；進度以項目為最小單位，往上彙總節 → 章 → 課程（客戶規格 4.4 §2-1～2-3）。
     第二門課 demo2 是示範「多門課程」列表用的佔位課程（名稱與內容待定，專案主檔目前只賣 skuC05，使用者 2026-11-10 同意先佔位）。 */
  function placeholderOutline() {
    return [1, 2].map(function (n) {
      return { id: 'demo2-c' + n, zh: '章標題待定', en: 'Lesson title TBD', status: '已發布', sections: [1, 2].map(function (m) {
        var base = 'demo2-' + n + '-' + m;
        return { id: base, zh: '節標題待定', en: 'Section title TBD', items: [
          { id: base + '-v', type: 'video', zh: '教學影片', en: 'Teaching video', durSec: 330 + n * 20 + m * 15 },
          { id: base + '-m', type: 'material', zh: '學習講義', en: 'Study handout', pages: 2 }
        ] };
      }) };
    });
  }
  function publishedOnly(chs) { return (chs || []).filter(function (c) { return c.status !== '草稿'; }); }
  var COURSES = [
    { id: 'skuC05', chapters: publishedOnly((M.selfPacedOutlines || {}).skuC05) },
    { id: 'demo2', zh: '示範課程（名稱待定）', en: 'Sample course (name TBD)', chapters: placeholderOutline(), placeholder: true }
  ];
  function courseById(id) { return COURSES.filter(function (c) { return c.id === id; })[0] || COURSES[0]; }
  function flatItems(C) {
    var out = [];
    C.chapters.forEach(function (ch, ci) { ch.sections.forEach(function (s, si) { s.items.forEach(function (it, ii) { out.push({ ci: ci, si: si, ii: ii, id: it.id, it: it }); }); }); });
    return out;
  }
  var TOTAL_ITEMS = flatItems(COURSES[0]).length;
  function courseName(cid) {
    var C = courseById(cid || 'skuC05');
    if (C.id === 'skuC05') { var p = (M.products || []).filter(function (x) { return x.id === 'skuC05'; })[0]; return p ? p.name : '自學影音課程包（中文基礎）'; }
    return T(C.zh, C.en);
  }
  function chapterLabel(ci) { return T('第 ' + (ci + 1) + ' 章', 'Lesson ' + (ci + 1)); }
  function secNo(ci, si) { return (ci + 1) + '-' + (si + 1); }
  function unitName(u) { return T(u.zh, u.en); }
  function typeName(t) { var x = (M.selfPacedItemTypes || []).filter(function (y) { return y.id === t; })[0]; return x ? T(x.zh, x.en) : t; }
  function courseDurSec(C) { return flatItems(C).reduce(function (a, x) { return a + (x.it.durSec || 0); }, 0); }
  function durLabel(sec) { var m = Math.round(sec / 60), h = Math.floor(m / 60); return h ? T(h + ' 小時 ' + (m % 60) + ' 分', h + ' h ' + (m % 60) + ' min') : T(m + ' 分鐘', m + ' min'); }

  /* ---------- 身分（目前分頁） ---------- */
  function getSS() { try { return JSON.parse(g.sessionStorage.getItem(SS_KEY)) || {}; } catch (e) { return {}; } }
  function setSS(o) { try { g.sessionStorage.setItem(SS_KEY, JSON.stringify(o)); } catch (e) {} }
  function qs(name) { try { return new URLSearchParams(g.location.search).get(name); } catch (e) { return null; } }

  function firstActiveStudent() { return students().filter(function (r) { return r.status === '已啟用' && !isFresh(r.id); })[0] || students()[0]; }
  /* 回傳目前會員：project（專案合作學員）或 general（一般學生 Emma） */
  function me() {
    var ss = getSS();
    var sid = qs('sid');
    var mode = qs('mode');
    if (mode === 'general' || qs('new') === '1') { ss = {}; setSS(ss); }
    if (sid && rosterById(sid)) { ss.mode = 'project'; ss.rid = sid; setSS(ss); }
    var act = qs('activated');
    if ((act === 'project' || act === 'university') && ss.mode !== 'project') { ss.mode = 'project'; ss.rid = (firstActiveStudent() || {}).id; setSS(ss); }
    if (ss.mode === 'project' && ss.rid && rosterById(ss.rid)) {
      var r = rosterById(ss.rid), c = classById(r.classId), t = c ? rosterById(c.teacherRid) : null, q = quotaCfg();
      return { mode: 'project', rid: r.id, name: r.name, email: r.email, classId: r.classId, className: c ? c.name : '', teacherName: t ? t.name : '', teacherId: t ? t.id : '',
        partnerName: partner().name, projectName: projectName(), perWeek: q.perWeek, groupCap: q.groupCap, tool: partner().videoTool, tzOffset: -7, from: partner().from, to: partner().to };
    }
    return { mode: 'general', rid: 'gen', name: 'Emma Johnson', email: 'emma.johnson@example.com', classId: '', className: '', teacherName: '', partnerName: '', projectName: '',
      perWeek: 3, groupCap: quotaCfg().groupCap, tool: 'zoom', tzOffset: 8 };
  }
  function signInStudent(rid) { setSS({ mode: 'project', rid: rid }); }
  function signInTeacher(rid) { var s = getSS(); s.trid = rid; setSS(s); }
  function isFresh(rid) { return jget(FRESH_KEY, []).indexOf(rid) >= 0; }

  /* 開通：寫回名單狀態（與後台 a20 共用 localStorage），學生記為剛啟用 */
  function activate(rid) {
    var r = rosterById(rid); if (!r) { return false; }
    var was = r.status;
    r.status = '已啟用'; r.activatedAt = TODAY + ' ' + pad(new Date().getHours()) + ':' + pad(new Date().getMinutes());
    if (typeof M.saveProjectData === 'function') { M.saveProjectData(); }
    if (r.role === '學生' && was !== '已啟用') { var f = jget(FRESH_KEY, []); if (f.indexOf(rid) < 0) { f.push(rid); jset(FRESH_KEY, f); } }
    return true;
  }

  /* ---------- 學習進度（名單 id 決定性推算） ---------- */
  /* 回傳某學員某課程的進度：chapters（＝units，向下相容舊欄位 lessons＝該章項目數）含各節完成數；itemsDone 以項目 id 為 key */
  function progress(rid, cid) {
    var C = courseById(cid || 'skuC05'), items = flatItems(C), TOT = items.length;
    var r = rosterById(rid);
    var general = rid === 'gen';
    function rollup(doneMap) {
      return C.chapters.map(function (ch, ci) {
        var secs = ch.sections.map(function (s, si) {
          var d = s.items.filter(function (it) { return doneMap[it.id]; }).length;
          return { id: s.id, zh: s.zh, en: s.en, no: secNo(ci, si), total: s.items.length, done: d };
        });
        var t = secs.reduce(function (a, x) { return a + x.total; }, 0), d2 = secs.reduce(function (a, x) { return a + x.done; }, 0);
        return { id: ch.id, zh: ch.zh, en: ch.en, total: t, lessons: t, done: d2, pct: t ? Math.round(d2 / t * 100) : 0, sections: secs };
      });
    }
    if (!general && (!r || r.status !== '已啟用')) { var z = rollup({}); return { rid: rid, cid: C.id, active: false, started: false, done: 0, total: TOT, pct: 0, minutes: 0, hours: '0.0', last: null, units: z, chapters: z, recent: [], itemsDone: {}, lessonsDone: {} }; }
    var fresh = !general && isFresh(rid);
    var baseDone = C.placeholder ? 0 : (general ? 21 : (fresh ? 0 : Math.round(TOT * (0.15 + 0.75 * rnd(rid + ':p')))));
    /* 逐項目完成旗標：先放示範底稿（前 baseDone 個項目），再疊上學生實際完成的項目（localStorage），合併後才彙總各節、各章進度 */
    var flags = [], exList = [], ex = general ? {} : (jget(LS_KEY, {})[rid] || {});
    items.forEach(function (x, i) {
      flags.push(i < baseDone);
      var e = ex[x.id];
      if (e && e.done && !flags[i]) { flags[i] = true; exList.push({ i: i, minutes: e.minutes || 6, at: e.at || '', hm: e.hm || '09:00' }); }
    });
    exList.sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
    var itemsDone = {};
    items.forEach(function (x, i) { if (flags[i]) { itemsDone[x.id] = true; } });
    var chapters = rollup(itemsDone);
    var done = chapters.reduce(function (a, x) { return a + x.done; }, 0);
    var exMin = exList.reduce(function (a, x) { return a + x.minutes; }, 0);
    var minutes = done === 0 ? 0 : baseDone * 7 + (baseDone ? Math.round(rnd(rid + ':m') * 45) : 0) + exMin;
    var lastGap = exList.length ? 0 : (general ? 1 : Math.floor(rnd(rid + ':d') * 12));
    var last = done === 0 ? null : (exList.length ? { date: TODAY, time: exList[0].hm } : { date: addDays(TODAY, -lastGap), time: pad(8 + Math.floor(rnd(rid + ':t') * 14)) + ':' + pad(Math.floor(rnd(rid + ':t2') * 6) * 10) });
    function rec(i, date, mins) {
      var x = items[i], ch = C.chapters[x.ci], s = ch.sections[x.si];
      return { date: date, unitId: ch.id, ci: x.ci, zh: ch.zh, en: ch.en, sec: secNo(x.ci, x.si), secZh: s.zh, secEn: s.en, type: x.it.type, itemZh: x.it.zh, itemEn: x.it.en, minutes: mins };
    }
    var recent = exList.slice(0, 5).map(function (x) { return rec(x.i, TODAY, x.minutes); });
    var idx = baseDone, gap = general ? 1 : Math.floor(rnd(rid + ':d') * 12);
    if (exList.length) { gap = Math.max(1, gap); }
    while (recent.length < 5 && idx > 0 && baseDone > 0) {
      recent.push(rec(idx - 1, addDays(TODAY, -gap), 4 + Math.floor(rnd(rid + ':r' + idx) * 6)));
      idx--; gap += 1 + Math.floor(rnd(rid + ':g' + idx) * 3);
    }
    return { rid: rid, cid: C.id, active: true, started: done > 0, done: done, total: TOT, pct: TOT ? Math.round(done / TOT * 100) : 0, minutes: minutes, hours: (minutes / 60).toFixed(1), last: last, lastGap: lastGap, units: chapters, chapters: chapters, recent: recent, itemsDone: itemsDone, lessonsDone: itemsDone };
  }
  /* 下一個未完成項目（繼續學習用）；全部完成時回傳第一節 */
  function nextOpenItem(rid, cid) {
    var C = courseById(cid || 'skuC05'), P = progress(rid, C.id), items = flatItems(C);
    for (var i = 0; i < items.length; i++) { if (!P.itemsDone[items[i].id]) { return items[i]; } }
    return items[0] || null;
  }
  function behind(p) { return p.active && p.started && (p.pct < 25 || p.lastGap >= 7); }

  /* ---------- Mandarin Lounge 場次與預約 ---------- */
  /* 示範預約：專案合作學員第一次開啟時，依名單 id 決定性放 1–2 筆已預約的班級場次（寫入同一份 localStorage，m03 與 m14 讀同一份） */
  var _seeding = false;
  function seedBookings() {
    var out = [];
    _seeding = true;
    try {
      var all = allSessions(8);
      students().filter(function (r) { return r.status === '已啟用' && !isFresh(r.id); }).forEach(function (r) {
        var mine = all.filter(function (s) { return s.audience === 'project' && s.classId === r.classId; });
        if (!mine.length) { return; }
        var n = Math.max(1, Math.min(1 + hash(r.id + ':bk') % 2, 3 - seedUsed(r.id)));
        for (var k = 0; k < n; k++) {
          var s = mine[(hash(r.id + ':bs') % 3 + k * 4) % mine.length], L = fmtLocal(s.utc, -7);
          out.push({ id: 'LB-seed-' + r.id + '-' + k, rid: r.id, mode: 'project', classId: r.classId, sessionId: s.id, type: 'group', utc: s.utc, date: L.date, time: L.time,
            tpDate: s.tpDate, tpTime: s.tpTime, teacher: s.teacher, topic: s.topic || '', topicEn: s.topicEn || '', tool: s.tool, name: r.name, status: 'booked', createdAt: '2027-03-10T00:00:00.000Z' });
        }
      });
    } catch (e) { out = []; }
    _seeding = false;
    return out;
  }
  function bookings() {
    var st = jget(BK_KEY, null);
    if (st === null && !_seeding) { st = seedBookings(); jset(BK_KEY, st); }
    return (st || []).map(function (b) { b.type = 'group'; return b; });
  }
  function openedSessions() { return jget(OPEN_KEY, []); }
  function saveOpened(a) { jset(OPEN_KEY, a); }
  function saveBookings(a) { jset(BK_KEY, a); }
  function seedUsed(rid) { if (rid === 'gen') { return 1; } var r = rosterById(rid); if (!r || r.status !== '已啟用' || isFresh(rid)) { return 0; } return Math.floor(rnd(rid + ':l') * 3); }
  function seedTerm(rid) { if (rid === 'gen') { return 3; } var r = rosterById(rid); if (!r || r.status !== '已啟用' || isFresh(rid)) { return 0; } return Math.max(2, seedUsed(rid) + Math.floor(rnd(rid + ':f') * 4)); }
  function myBookings(rid) { return bookings().filter(function (b) { return b.rid === rid; }); }
  /* 週以週一為首日、週日為末日；回傳該日所在週的週一日期（YYYY-MM-DD） */
  function weekStart(str) { var p = str.split('-'); var dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); return addDays(str, -((dow + 6) % 7)); }
  var WEEK = weekStart(TODAY);
  /* 額度以週計：只算該週內仍有效的預約；種子歷史場次（seedHistory）都在本週之前，不計入本週 */
  function usedInWeek(rid, wk) {
    return myBookings(rid).filter(function (b) { return b.status === 'booked' && weekStart(b.date) === wk; }).length;
  }
  function lounge(rid, perWeek, wk) {
    wk = wk || WEEK;
    var used = usedInWeek(rid, wk);
    return { week: wk, weekEnd: addDays(wk, 6), quota: perWeek, used: used, remaining: Math.max(0, perWeek - used), term: seedTerm(rid) + myBookings(rid).filter(function (b) { return b.status === 'booked'; }).length };
  }
  /* 已上過的場次（示範）：數量＝累計參加場次 seedTerm（已開通學員至少 2 場，20261110 調整，原本可能為 0 場），都在本週之前、不計入本週額度 */
  function seedHistory(rid) {
    var n = Math.min(6, seedTerm(rid)), out = [];
    for (var i = 0; i < n; i++) {
      var tp = TOPICS[(hash(rid + ':h' + i) + i) % TOPICS.length];
      out.push({ id: 'LH-' + rid + '-' + i, rid: rid, type: 'group', date: addDays(TODAY, -(2 + i * 4)), time: i % 2 ? '18:30' : '19:30', status: 'done', teacher: (function(){ return (centerTeachers()[i % 3] || { name: '林俊傑' }).name; })(), tool: partner().videoTool, topic: tp[0], topicEn: tp[1] });
    }
    return out;
  }

  /* 場次以台北時間排定；依使用者所在時區顯示（專案合作學員：亞利桑那 UTC-7） */
  var TOPICS = [['日常對話：自我介紹', 'Everyday Talk: Self-introduction'], ['點餐與購物', 'Ordering Food and Shopping'], ['週末計畫', 'Weekend Plans'], ['交通與問路', 'Transport and Directions'], ['校園生活', 'Campus Life'], ['天氣與季節', 'Weather and Seasons'], ['節慶與習俗', 'Festivals and Customs']];
  function fmtLocal(utcMs, off) { var d = new Date(utcMs + off * 3600000); return { date: ymd(d), time: pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()), hm: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
  /* 全部團體場次（與使用者無關）。off：顯示時區偏移。每場 30 分鐘、名額 6–10、視訊工具由場次設定 */
  function allSessions(off) {
    var tchs = centerTeachers(), out = [];
    for (var i = 0; i < 24; i++) {
      var tp = addDays('2027-03-15', i);      /* 台北日期 */
      var p = tp.split('-'), dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
      var defs = [];
      if (dow >= 1 && dow <= 5) { defs.push('09:30'); defs.push('10:30'); }
      if (dow === 2 || dow === 4) { defs.push('20:00'); }
      if (dow === 6) { defs.push('09:00'); defs.push('10:00'); }
      defs.forEach(function (t) {
        var hm = t.split(':');
        var utc = Date.UTC(+p[0], +p[1] - 1, +p[2], +hm[0] - 8, +hm[1]);
        if (utc <= NOW_UTC) { return; }
        var id = 'LS-' + tp.replace(/-/g, '') + '-' + t.replace(':', '') + 'g';
        var th = tchs.length ? tchs[hash(id) % tchs.length] : { id: 'tc1', name: '林俊傑' };
        var ti = TOPICS[hash(id) % TOPICS.length];
        var cap = 6 + hash(id + 'c') % 5;
        out.push({ id: id, type: 'group', utc: utc, tpDate: tp, tpTime: t, minutes: 30, teacher: th.name, teacherId: th.id, topic: ti[0], topicEn: ti[1], cap: cap,
          tool: ((hash(id + 't') >>> 5) % 2) ? 'zoom' : 'teams', audience: 'direct', baseTaken: (hash(id) % 7 === 0) ? cap : 2 + (hash(id) % 4), opened: false });
        /* 專案合作場次：由 TLI 中心教師帶領，只給該班學生；與直營場次共用同一套場次機制 */
        classes().forEach(function (c) {
          var ct = tchs.length ? tchs[hash(id + c.id) % tchs.length] : { id: 'tc1', name: '林俊傑' }, pid = id.replace(/g$/, 'p') + '-' + c.id;
          if (hash(pid) % 2 !== 0) { return; }
          var pcap = 6 + hash(pid + 'c') % 5, pti = TOPICS[hash(pid) % TOPICS.length];
          out.push({ id: pid, type: 'group', utc: utc, tpDate: tp, tpTime: t, minutes: 30, teacher: ct.name, teacherId: ct.id, topic: pti[0], topicEn: pti[1], cap: pcap,
            tool: partner().videoTool || 'teams', audience: 'project', classId: c.id, baseTaken: hash(pid) % 4 === 0 ? 0 : 1 + (hash(pid) % 3), opened: false });
        });
      });
    }
    openedSessions().forEach(function (o) {
      var hm = o.tpTime.split(':'), p = o.tpDate.split('-');
      var utc = Date.UTC(+p[0], +p[1] - 1, +p[2], +hm[0] - 8, +hm[1]);
      if (utc <= NOW_UTC) { return; }
      out.push({ id: o.id, type: 'group', utc: utc, tpDate: o.tpDate, tpTime: o.tpTime, minutes: 30, teacher: o.teacher, teacherId: o.teacherId, topic: o.topic, topicEn: o.topicEn || o.topic, cap: o.cap, tool: o.tool, audience: 'direct', baseTaken: o.baseTaken || 0, opened: true });
    });
    out.sort(function (a, b) { return a.utc - b.utc; });
    var bs = bookings();
    out.forEach(function (s) {
      var L = fmtLocal(s.utc, off);
      s.date = L.date; s.time = L.time;
      s.live = bs.filter(function (b) { return b.sessionId === s.id && b.status === 'booked'; });
      s.taken = s.baseTaken + s.live.length;
      s.left = Math.max(0, s.cap - s.taken);
    });
    return out;
  }
  function sessionsFor(user) {
    var out = allSessions(user.tzOffset).filter(function (s) {
      return (s.audience === 'project' && user.mode === 'project' && s.classId === user.classId) || ((s.audience === 'direct' || s.audience === 'all') && user.mode !== 'project');
    });
    out.forEach(function (s) {
      var TP = fmtLocal(s.utc, 8); s.tpDate = TP.date; s.tpTime = TP.time;
      s.mineBooking = s.live.filter(function (b) { return b.rid === user.rid; })[0] || null;
      s.full = s.left === 0 && !s.mineBooking;
    });
    return out;
  }
  /* 教師端：全部場次（台北時間）。teacherId 有值時只回該老師的場次 */
  function teacherSessions(teacherId) {
    return allSessions(8).filter(function (s) { return !teacherId || s.teacherId === teacherId; });
  }
  function openSession(o) {
    var a = openedSessions(); o.id = 'LS-OP-' + Date.now().toString(36) + Math.floor(Math.random() * 99); a.push(o); saveOpened(a); return o;
  }
  /* 教師端整批同步：換掉 id 以 prefix 開頭的場次 */
  function replaceOpened(prefix, list) { saveOpened(openedSessions().filter(function (o) { return o.id.indexOf(prefix) !== 0; }).concat(list)); }
  function closeOpened(id) { saveOpened(openedSessions().filter(function (o) { return o.id !== id; })); }
  /* 預約團體場次，視訊工具由場次設定 */
  function book(user, session, opts) {
    opts = opts || {};
    var lg = lounge(user.rid, user.perWeek, weekStart(session.date));
    if (lg.remaining <= 0) { return { ok: false, code: 'quota' }; }
    if (session.mineBooking) { return { ok: false, code: 'dup' }; }
    if (session.full) { return { ok: false, code: 'full' }; }
    var clash = myBookings(user.rid).filter(function (b) { return b.status === 'booked' && b.utc === session.utc; })[0];
    if (clash) { return { ok: false, code: 'clash' }; }
    var b = { id: 'LB-' + Date.now().toString(36) + Math.floor(Math.random() * 99), rid: user.rid, mode: user.mode, classId: user.classId, sessionId: session.id, type: 'group',
      utc: session.utc, date: session.date, time: session.time, tpDate: session.tpDate, tpTime: session.tpTime, teacher: session.teacher, topic: session.topic || '', topicEn: session.topicEn || '',
      tool: session.tool, name: user.name, status: 'booked', createdAt: new Date().toISOString() };
    var all = bookings(); all.push(b); saveBookings(all);
    return { ok: true, booking: b };
  }
  function cancel(id) {
    var all = bookings(), hit = null;
    all.forEach(function (b) { if (b.id === id && b.status === 'booked') { b.status = 'cancelled'; hit = b; } });
    if (hit) { saveBookings(all); }
    return !!hit;
  }
  function cancellable(b) { return b.status === 'booked' && (b.utc - NOW_UTC) >= 2 * 3600000; }

  /* ---------- 匯出 ---------- */
  function csv(rows) { return '﻿' + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n'); }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- 教師身分 ---------- */
  function teacherMe() {
    var rid = qs('rid'), tid = qs('tid'), s = getSS();
    /* ?rid=名單老師 id；?tid= 為舊參數，仍相容（舊 tl 編號無對應就忽略） */
    var cand = rid || tid;
    if (cand && rosterById(cand) && rosterById(cand).role === '老師') { s.trid = cand; setSS(s); }
    var r = rosterById(s.trid);
    if (!r || r.role !== '老師') { r = rosterById('pr18') || teacherRosters()[0]; }
    return { id: r.id, name: r.name, email: r.email, certified: true, classes: M.projectClasses.filter(function (c) { return c.teacherRid === r.id || (c.id === r.classId && !c.teacherRid); }) };
  }

  /* ---------- 英文／簡中：標了 data-en 的元素依語言換字 ---------- */
  function xl(root) {
    (root || document).querySelectorAll('[data-en]').forEach(function (el) {
      if (el.dataset.zh === undefined) { el.dataset.zh = el.textContent; }
      el.textContent = T(el.dataset.zh, el.getAttribute('data-en'));
    });
    (root || document).querySelectorAll('[data-en-ph]').forEach(function (el) {
      if (el.dataset.zhPh === undefined) { el.dataset.zhPh = el.getAttribute('placeholder') || ''; }
      el.setAttribute('placeholder', T(el.dataset.zhPh, el.getAttribute('data-en-ph')));
    });
  }
  if (g.TLI_I18N && g.TLI_I18N.onRefresh) { g.TLI_I18N.onRefresh(function () { xl(document); }); }

  /* 會員區各頁：側欄身分列帶入專案合作學員姓名 */
  function decorateMember() {
    var u = me();
    if (u.mode === 'project') {
      var el = document.querySelector('.side-identity');
      if (el && el.firstChild && el.firstChild.nodeType === 3) { el.firstChild.nodeValue = u.name + '｜'; }
    }
    projectMember();
    xl(document);
  }
  document.addEventListener('DOMContentLoaded', function () { if (document.querySelector('.side-nav .side-identity')) { decorateMember(); } else { xl(document); } });

  /* ---------- 專案合作學員：會員區各頁改讀本人資料（無付費入口） ---------- */
  var PJ_CSS = '[data-pj-hidden]{display:none!important}' +
    '.pj-row{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--c-border);font-size:13.5px;flex-wrap:wrap}.pj-row:first-child{border-top:none}.pj-row span{color:var(--c-muted)}.pj-row b{text-align:right}' +
    '.pj-unit{border-top:1px solid var(--c-border);padding:12px 0}.pj-unit:first-child{border-top:none}.pj-top{display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;font-size:14px;font-weight:700}' +
    '.pj-meta{display:flex;justify-content:space-between;font-size:12px;color:var(--c-muted);margin-top:6px}.pj-les{display:none;margin-top:8px}.pj-unit.open .pj-les{display:block}' +
    '.pj-lesson{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;font-size:13px;background:var(--c-bg);margin-top:6px;cursor:pointer}' +
    '.pj-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:12px 0}.pj-kpis div{background:var(--c-bg);border-radius:10px;padding:10px 12px}.pj-kpis small{display:block;font-size:11.5px;color:var(--c-muted)}.pj-kpis b{font-size:20px}' +
    '.pj-form label{display:block;font-size:12.5px;font-weight:700;margin:12px 0 4px}.pj-form input,.pj-form select{width:100%;border:1px solid var(--c-border);border-radius:8px;padding:10px 12px;font-size:14px;font-family:inherit;background:#fff;box-sizing:border-box}.pj-form input[readonly]{background:var(--c-bg);color:var(--c-muted)}' +
    '.pj-bk{margin-bottom:12px}.pj-ls-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin:10px 0 4px}.pj-ls-h h2{margin:0;font-size:19px}.pj-ls-h small{color:var(--c-muted);font-size:12.5px}' +
    '.pj-conds{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 14px}.pj-cond{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;padding:5px 10px;border-radius:14px;background:var(--c-bg);color:var(--c-muted)}.pj-cond.ok{background:#ECFDF3;color:#067647}.pj-cond svg{width:14px;height:14px}' +
    '.pj-st{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;margin:0 0 10px}.pj-st svg{width:18px;height:18px;flex:none}' +
    '.pj-vid{background:#1D2939;border-radius:12px;overflow:hidden;color:#fff}.pj-vscreen{position:relative;aspect-ratio:16/9;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:12px}.pj-vscreen b{font-size:clamp(16px,3.4vw,24px)}.pj-vscreen small{color:#D0D5DD;font-size:12.5px}' +
    '.pj-playbtn{width:56px;height:56px;border-radius:50%;border:2px solid #fff;background:transparent;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0}.pj-playbtn svg{width:24px;height:24px}' +
    '.pj-vbar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#101828}.pj-vbtn{background:none;border:0;color:#fff;cursor:pointer;padding:4px;display:inline-flex}.pj-vbtn svg{width:18px;height:18px}.pj-vbar input[type=range]{flex:1;min-width:0;accent-color:#fff}.pj-vbar span{font-size:12px;color:#D0D5DD;white-space:nowrap}' +
    '.pj-file{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--c-border)}.pj-file:first-of-type{border-top:none}.pj-file>svg{width:22px;height:22px;flex:none;color:var(--c-muted)}.pj-file div{flex:1;min-width:0}.pj-file b{display:block;font-size:13.5px;overflow-wrap:anywhere}.pj-file small{color:var(--c-muted);font-size:12px}' +
    '.pj-q{border-top:1px solid var(--c-border);padding:12px 0}.pj-q:first-of-type{border-top:none}.pj-q p{margin:0 0 8px;font-size:14px;font-weight:700}.pj-opt{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--c-border);border-radius:8px;margin-top:6px;font-size:14px;cursor:pointer;background:#fff}.pj-opt input{margin:0;flex:none}.pj-opt.sel{border-color:#1570EF;background:#EFF8FF}.pj-opt.good{border-color:#12B76A;background:#ECFDF3}.pj-opt.bad{border-color:#F04438;background:#FEF3F2}.pj-opt.dis{cursor:default}' +
    '.pj-score{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}.pj-score b{font-size:30px}.pj-foot{display:flex;justify-content:space-between;gap:10px;margin-top:16px;flex-wrap:wrap}.pj-foot .btn{flex:1 1 140px;display:inline-flex;align-items:center;justify-content:center;gap:6px}.pj-foot svg,.pj-bk svg,.pj-file .btn svg{width:16px;height:16px}' +
    '.pj-course{cursor:pointer;margin-bottom:12px;display:flex;gap:18px;align-items:flex-start}.pj-course:hover{border-color:var(--c-primary)}' +
    '.pj-cv{flex:none;width:220px}.pj-cv img{display:block;width:100%;border-radius:10px}.pj-cv .m{display:none}.pj-cb{flex:1;min-width:0}' +
    '@media(max-width:639px){.pj-course{gap:12px}.pj-cv{width:84px}.pj-cv .d{display:none}.pj-cv .m{display:block}}' +
    '.pj-ch{border-top:1px solid var(--c-border);padding:12px 0}.pj-ch:first-child{border-top:none}.pj-secs{display:none;margin-top:8px}.pj-ch.open .pj-secs{display:block}' +
    '.pj-sec{margin-top:8px;border:1px solid var(--c-border);border-radius:8px}.pj-sec-h{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 10px;cursor:pointer;font-size:13.5px;font-weight:700}' +
    '.pj-items{display:none;padding:0 10px 10px}.pj-sec.open .pj-items{display:block}' +
    '.pj-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;background:var(--c-bg);margin-top:6px;cursor:pointer;font-size:13px}.pj-item:hover{outline:1px solid var(--c-primary)}.pj-it{flex:1;min-width:0}' +
    '.pj-ic,.pj-dn,.pj-td{display:inline-flex;flex:none}.pj-ic svg,.pj-dn svg,.pj-td svg{width:16px;height:16px}.pj-ic{color:var(--c-primary)}.pj-dn{color:#067647}.pj-td{color:var(--c-muted)}' +
    '.pj-tt{display:inline-flex;align-items:center;gap:6px;min-width:0}.pj-car{display:inline-flex;flex:none}.pj-car svg{width:14px;height:14px;transition:transform .15s}.pj-ch.open>.pj-top .pj-car svg,.pj-sec.open>.pj-sec-h .pj-car svg{transform:rotate(90deg)}' +
    '.pj-oh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:22px 0 10px}.pj-oh-b{display:flex;gap:6px}' +
    '.pj-bkhead{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}.pj-bcover{flex:none;width:130px;aspect-ratio:3/4;border-radius:6px;background:linear-gradient(170deg,#fff 0 70%,#2E7D5B 70%);border:1px solid var(--c-border);display:flex;flex-direction:column;justify-content:flex-start;gap:6px;padding:14px 12px;box-sizing:border-box;box-shadow:0 2px 6px rgba(16,24,40,.12)}.pj-bcover span{font-size:10px;color:var(--c-muted)}.pj-bcover b{font-size:15px;line-height:1.3}.pj-bcover small{font-size:9.5px;color:var(--c-muted)}' +
    '.pj-binfo{flex:1;min-width:220px}.pj-binfo h2{margin:0 0 10px;font-size:20px}.pj-brow2{display:flex;align-items:center;gap:12px;margin-top:8px;font-size:13.5px}.pj-brow2>span{color:var(--c-muted);min-width:64px}.pj-seg{display:inline-flex;background:var(--c-bg);border-radius:8px;padding:3px}.pj-seg button{border:0;background:none;padding:5px 12px;border-radius:6px;font:inherit;font-size:13px;cursor:pointer;color:var(--c-muted)}.pj-seg button.on{background:#fff;color:var(--c-primary);font-weight:700;box-shadow:0 1px 2px rgba(16,24,40,.12)}' +
    '.pj-btabs{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--c-primary);margin:20px 0 10px}.pj-btabs span{padding:8px 16px;font-weight:700;color:var(--c-primary);border-bottom:2px solid var(--c-primary);margin-bottom:-1px}.pj-btabs .btn{margin-bottom:6px}.pj-btabs .btn svg,.pj-ebrow .btn svg{width:16px;height:16px;flex:none}' +
    '.pj-eblist{padding:0;overflow:hidden}.pj-ebrow{display:flex;align-items:center;gap:14px;padding:14px 16px;border-top:1px solid var(--c-border);flex-wrap:wrap}.pj-ebrow:first-child{border-top:none}.pj-ebrow:nth-child(odd){background:var(--c-bg)}.pj-eb-l{min-width:110px;font-weight:700}.pj-eb-f{flex:1;min-width:140px;color:var(--c-muted);font-size:13px}' +
    '.pj-reader{display:flex;gap:10px;background:#3A3A3A;border-radius:10px;padding:10px;height:520px}.pj-thumbs{flex:none;width:96px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px}.pj-th{border:2px solid transparent;background:#fff;border-radius:3px;aspect-ratio:3/4;cursor:pointer;display:flex;align-items:flex-end;justify-content:center;padding:4px;font-size:11px;color:var(--c-muted);flex:none}.pj-th.on{border-color:#F2C94C}' +
    '.pj-pagewrap{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}.pj-page{flex:1;background:#fff;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:16px}.pj-page small{color:var(--c-muted)}.pj-page b{font-size:56px;color:#D0D5DD}.pj-page em{font-style:normal;font-size:12px;color:var(--c-muted)}.pj-pg-au{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--c-primary);font-weight:700}.pj-pg-au svg{width:16px;height:16px}.pj-pnav{display:flex;justify-content:space-between}' +
    '.pj-abar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:12px;background:#fff;border:1px solid var(--c-border);border-radius:10px;padding:10px 12px}.pj-aud{border:1px solid var(--c-border);border-radius:8px;padding:7px 8px;font:inherit;font-size:13px;background:#fff;max-width:260px}.pj-abtn{background:none;border:0;cursor:pointer;display:inline-flex;padding:4px;color:var(--c-text)}.pj-abtn svg{width:20px;height:20px}.pj-abar input[type=range]{flex:1;min-width:120px;accent-color:var(--c-primary)}#pjAtime{font-size:12px;color:var(--c-muted);white-space:nowrap}' +
    '@media(max-width:639px){.pj-reader{height:420px}.pj-thumbs{width:60px}}' +
    '.pj-ver{border:1px solid var(--c-border);border-radius:8px;padding:6px 8px;font-size:12.5px;font-family:inherit;background:#fff;max-width:150px}' +
    '.pj-mk{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}.pj-lesson.cur{background:#EFF8FF;outline:1px solid #B2DDFF}' +
    '.pj-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#101828;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:300}';
  function pjToast(msg) {
    var t = document.getElementById('pjToast');
    if (!t) { t = document.createElement('div'); t.id = 'pjToast'; t.className = 'pj-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(g._pjTt); g._pjTt = setTimeout(function () { t.style.display = 'none'; }, 2200);
  }
  function pjToastHide() { var t = document.getElementById('pjToast'); if (t) { t.style.display = 'none'; } clearTimeout(g._pjTt); }
  function pjSessLine(b) { return mdLabel(b.date) + ' ' + wd(b.date) + ' ' + b.time + T('（亞利桑那時間）', ' (Arizona time)') + (b.tpTime ? T('・台北 ', ' · Taipei ') + mdLabel(b.tpDate) + ' ' + b.tpTime : ''); }
  function pjTypeLbl(t) { return T('團體場次', 'Group session'); }
  function pjUpcoming(rid) { return myBookings(rid).filter(function (b) { return b.status === 'booked' && b.utc > NOW_UTC; }).sort(function (a, b) { return a.utc - b.utc; }); }
  function pjHead(title, sub) { return '<p class="page-h">' + esc(title) + '</p><p class="page-sub">' + esc(sub) + '</p>'; }

  /* ---------- 單元學習：測驗題庫、教材、完成條件 ---------- */
  /* 題庫每單元 5 題；格式 [關鍵詞, 正確選項, [錯誤選項…], 自訂題幹中文, 自訂題幹英文]；選項「英文|中文」，無 | 者兩語相同 */
  var QBANK = [
    [['mǎ', 'third tone|第三聲', ['first tone|第一聲', 'second tone|第二聲', 'fourth tone|第四聲'], '「mǎ」是第幾聲？', 'Which tone is "mǎ"?'],
     ['妈 mā', 'first tone|第一聲', ['second tone|第二聲', 'third tone|第三聲', 'fourth tone|第四聲'], '「妈 mā」是第幾聲？', 'Which tone is "妈 mā"?'],
     ['四 sì', 'fourth tone|第四聲', ['first tone|第一聲', 'second tone|第二聲', 'third tone|第三聲'], '「四 sì」是第幾聲？', 'Which tone is "四 sì"?'],
     ['你好 nǐ hǎo', 'second tone|第二聲', ['first tone|第一聲', 'third tone|第三聲', 'fourth tone|第四聲'], '兩個第三聲相連時，第一個字通常會變成哪一聲？', 'When two third tones come together, the first one is usually pronounced as which tone?'],
     ['聲調', '4|4 個', ['3|3 個', '5|5 個', '6|6 個'], '普通話有幾個聲調（不含輕聲）？', 'How many tones does Mandarin have (not counting the neutral tone)?']],
    [['你好', 'Hello|哈囉，你好', ['Thank you|謝謝', 'Goodbye|再見', 'Sorry|對不起']],
     ['我叫 Anna', 'My name is Anna|我的名字是 Anna', ['I am 3 years old|我三歲', 'I live in Taipei|我住在台北', 'I am fine|我很好']],
     ['很高興認識你', 'Nice to meet you|很高興認識你', ['See you tomorrow|明天見', 'I am sorry|對不起', 'Please sit down|請坐']],
     ['你是哪國人？', 'Where are you from?|你來自哪裡？', ['How old are you?|你幾歲？', 'What do you do?|你做什麼工作？', 'What is your name?|你叫什麼名字？']],
     ['我是學生', 'I am a student|我是學生', ['I am a teacher|我是老師', 'I am a doctor|我是醫生', 'I am hungry|我餓了']]],
    [['十二', '12|12', ['2|2', '20|20', '102|102']],
     ['星期三', 'Wednesday|星期三', ['Tuesday|星期二', 'Thursday|星期四', 'Friday|星期五']],
     ['三點半', '3:30|3:30', ['3:15|3:15', '5:30|5:30', '3:50|3:50']],
     ['三月十五日', 'March 15|3 月 15 日', ['May 13|5 月 13 日', 'June 15|6 月 15 日', 'January 3|1 月 3 日']],
     ['二十五', '25|25', ['52|52', '205|205', '15|15']]],
    [['媽媽', 'mother|媽媽', ['father|爸爸', 'older sister|姊姊', 'grandmother|奶奶']],
     ['我有一個哥哥', 'I have an older brother|我有一個哥哥', ['I have a younger brother|我有一個弟弟', 'I have an older sister|我有一個姊姊', 'I have a twin|我有一個雙胞胎']],
     ['朋友', 'friend|朋友', ['family|家人', 'teacher|老師', 'neighbor|鄰居']],
     ['這是我的奶奶', 'This is my grandmother|這是我的奶奶', ['This is my aunt|這是我的阿姨', 'This is my mother|這是我的媽媽', 'This is my sister|這是我的姊妹']],
     ['你有兄弟姐妹嗎？', 'Do you have siblings?|你有兄弟姊妹嗎？', ['Do you have friends?|你有朋友嗎？', 'Do you have a pet?|你有寵物嗎？', 'Do you have children?|你有小孩嗎？']]],
    [['我要一碗牛肉麵', 'I would like a bowl of beef noodles|我要一碗牛肉麵', ['I want a plate of rice|我要一盤飯', 'I want a cup of tea|我要一杯茶', 'I want the bill|我要結帳']],
     ['可以結帳嗎？', 'Can I pay the bill?|我可以結帳嗎？', ['Where is the restroom?|洗手間在哪裡？', 'Is there a table?|有位子嗎？', 'Is it cheap?|便宜嗎？']],
     ['不要辣', 'No spicy food, please|請不要辣', ['Extra spicy, please|請多辣一點', 'No salt, please|請不要鹽', 'No sugar, please|請不要糖']],
     ['水', 'water|水', ['tea|茶', 'coffee|咖啡', 'milk|牛奶']],
     ['請給我菜單', 'Please give me the menu|請給我菜單', ['Please give me a bag|請給我袋子', 'Please give me a receipt|請給我收據', 'Please give me a seat|請給我位子']]],
    [['捷運站在哪裡？', 'Where is the MRT station?|捷運站在哪裡？', ['What time is the train?|火車幾點？', 'How far is the airport?|機場有多遠？', 'Where is the bus stop?|公車站在哪裡？']],
     ['左轉', 'turn left|向左轉', ['turn right|向右轉', 'go straight|直走', 'make a U-turn|迴轉']],
     ['直走', 'go straight|直走', ['turn left|向左轉', 'turn right|向右轉', 'stop here|在這裡停']],
     ['我要搭公車', 'I will take the bus|我要搭公車', ['I will take a taxi|我要搭計程車', 'I will walk|我要走路', 'I will ride a bike|我要騎腳踏車']],
     ['離這裡很遠', 'It is far from here|離這裡很遠', ['It is near here|離這裡很近', 'It is next to here|在這裡隔壁', 'It is across the street|在對面']]],
    [['這個多少錢？', 'How much is this?|這個多少錢？', ['Where is this?|這個在哪裡？', 'Who is this?|這是誰？', 'When is this?|這是什麼時候？']],
     ['太貴了', 'Too expensive|太貴了', ['Too cheap|太便宜了', 'Too big|太大了', 'Too small|太小了']],
     ['可以便宜一點嗎？', 'Can it be a bit cheaper?|可以算便宜一點嗎？', ['Can I pay by card?|可以刷卡嗎？', 'Can I have a bag?|可以給我袋子嗎？', 'Can I return it?|可以退貨嗎？']],
     ['一百二十元', '120 dollars|120 元', ['102 dollars|102 元', '1,200 dollars|1,200 元', '12 dollars|12 元']],
     ['我想試穿', 'I would like to try it on|我想試穿', ['I would like to buy two|我想買兩件', 'I would like a refund|我想退費', 'I would like a gift box|我想要禮盒']]],
    [['這個週末你有什麼計畫？', 'What are your plans this weekend?|這個週末你有什麼計畫？', ['What did you do last weekend?|上個週末你做了什麼？', 'What time is it now?|現在幾點？', 'Where do you live?|你住在哪裡？']],
     ['我打算去爬山', 'I plan to go hiking|我打算去爬山', ['I plan to go swimming|我打算去游泳', 'I plan to stay up late|我打算熬夜', 'I plan to cook|我打算煮飯']],
     ['下個星期', 'next week|下個星期', ['last week|上個星期', 'this week|這個星期', 'every week|每個星期']],
     ['你想不想一起去？', 'Do you want to go together?|你想不想一起去？', ['Do you know the way?|你知道路嗎？', 'Do you have time?|你有時間嗎？', 'Do you like it?|你喜歡嗎？']],
     ['我週末要在家休息', 'I will rest at home on the weekend|我週末要在家休息', ['I will work on the weekend|我週末要工作', 'I will travel on the weekend|我週末要旅行', 'I will study on the weekend|我週末要讀書']]]
  ];
  function pair(str) { var a = String(str).split('|'); return { en: a[0], zh: a.length > 1 ? a[1] : a[0] }; }
  /* 取某一課的測驗：同單元題庫，依課次調整正確選項位置（決定性，不隨機） */
  function lessonQuiz(ui, k) {
    return QBANK[ui].map(function (e, qi) {
      var opts = [e[1]].concat(e[2]), off = (ui * 3 + qi + k) % 4, arr = new Array(4), rest = opts.slice(1), r = 0;
      for (var j = 0; j < 4; j++) { arr[j] = j === off ? opts[0] : rest[r++]; }
      return { key: e[0], zh: e[3] || ('「' + e[0] + '」的意思是？'), en: e[4] || ('What does "' + e[0] + '" mean?'), opts: arr.map(pair), a: off, ans: pair(e[1]) };
    });
  }
  function mmss(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  function fmtSize(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }
  /* 「教材」項目的示範下載檔：本節學習重點，下載為 PDF（使用者 2026-11-11 要求，原為 TXT）。
     中文基礎課取題庫詞句；佔位課程只放標題。頁數＝項目設定的頁數，第 1 頁放學習重點，其餘為示範頁。 */
  function materialFile(C, ci, si) {
    var ch = C.chapters[ci], s = ch.sections[si], nm = (C.id === 'skuC05' ? 'Lesson' : 'Sample_Lesson') + (ci + 1) + '_Section' + (ci + 1) + '-' + (si + 1);
    var mi = s.items.filter(function (x) { return x.type === 'material'; })[0];
    var lines = (C.id === 'skuC05' && QBANK[ci]) ? lessonQuiz(ci, si + 1).map(function (x, i) { return (i + 1) + '. ' + x.key + '　＝　' + x.ans.en + '／' + x.ans.zh; }) : [T('（示範課程，內容待定）', '(Sample course — content TBD)')];
    return { name: nm + '_handout.pdf', fmt: 'PDF', pages: (mi && mi.pages) || 1, course: courseName(C.id), chapter: chapterLabel(ci) + '　' + T(ch.zh, ch.en),
      section: secNo(ci, si) + '　' + T(s.zh, s.en), heading: T('學習重點', 'Key points'), lines: lines };
  }
  /* 產生講義 PDF：每頁先用 canvas 繪製（可顯示中文），轉 JPEG 後包成 PDF（A4，DCTDecode 影像），不需外部套件 */
  function handoutPageJpeg(f, p, total) {
    var w = 1240, h = 1754, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var c = cv.getContext('2d'), font = '"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif', y;
    function wrap(t, x, y0, maxW, lh) { var line = '', yy = y0; String(t).split('').forEach(function (ch) { if (c.measureText(line + ch).width > maxW && line) { c.fillText(line, x, yy); line = ch; yy += lh; } else { line += ch; } }); if (line) { c.fillText(line, x, yy); } return yy + lh; }
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1B4E8C'; c.fillRect(0, 0, w, 16);
    c.fillStyle = '#667085'; c.font = '28px ' + font; c.fillText(f.course, 100, 120);
    c.fillStyle = '#101828'; c.font = 'bold 40px ' + font; c.fillText(f.chapter, 100, 190);
    c.font = 'bold 54px ' + font; c.fillText(f.section, 100, 270);
    c.fillStyle = '#1B4E8C'; c.font = 'bold 34px ' + font; c.fillText(f.heading, 100, 360);
    c.strokeStyle = '#E4E7EC'; c.lineWidth = 2; c.beginPath(); c.moveTo(100, 390); c.lineTo(w - 100, 390); c.stroke();
    c.font = '32px ' + font; y = 460;
    if (p === 1) { c.fillStyle = '#101828'; f.lines.forEach(function (t) { y = wrap(t, 100, y, w - 200, 50) + 16; }); }
    else { c.fillStyle = '#98A2B3'; c.fillText(T('（示範頁面）', '(Sample page)'), 100, y); }
    c.fillStyle = '#98A2B3'; c.font = '24px ' + font; c.fillText('TLI Connect', 100, h - 80); c.textAlign = 'right'; c.fillText(p + ' / ' + total, w - 100, h - 80);
    var bin = atob(cv.toDataURL('image/jpeg', 0.85).split(',')[1]), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { u[i] = bin.charCodeAt(i); }
    return { data: u, w: w, h: h };
  }
  function pdfFromJpegs(pages) {
    var chunks = [], len = 0, offs = [], n = pages.length, W = '595.28', H = '841.89', total = 2 + 3 * n;
    function bytes(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) { u[i] = s.charCodeAt(i) & 255; } return u; }
    function put(x) { var u = typeof x === 'string' ? bytes(x) : x; chunks.push(u); len += u.length; }
    function obj(num, body) { offs[num] = len; put(num + ' 0 obj\n'); body(); put('\nendobj\n'); }
    put('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, function () { put('<< /Type /Catalog /Pages 2 0 R >>'); });
    obj(2, function () { put('<< /Type /Pages /Kids [' + pages.map(function (_, k) { return (3 + 3 * k) + ' 0 R'; }).join(' ') + '] /Count ' + n + ' >>'); });
    pages.forEach(function (pg, k) {
      var pn = 3 + 3 * k, cn = 4 + 3 * k, im = 5 + 3 * k, cs = 'q ' + W + ' 0 0 ' + H + ' 0 0 cm /Im' + k + ' Do Q';
      obj(pn, function () { put('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im' + k + ' ' + im + ' 0 R >> >> /Contents ' + cn + ' 0 R >>'); });
      obj(cn, function () { put('<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream'); });
      obj(im, function () { put('<< /Type /XObject /Subtype /Image /Width ' + pg.w + ' /Height ' + pg.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + pg.data.length + ' >>\nstream\n'); put(pg.data); put('\nendstream'); });
    });
    var xref = len, i;
    put('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
    for (i = 1; i <= total; i++) { put(('0000000000' + offs[i]).slice(-10) + ' 00000 n \n'); }
    put('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }
  function handoutPdf(f) { var pgs = []; for (var p = 1; p <= f.pages; p++) { pgs.push(handoutPageJpeg(f, p, f.pages)); } return pdfFromJpegs(pgs); }
  function downloadBlob(name, blob) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function itemState(rid, id) { var a = jget(LS_KEY, {}); return (a[rid] && a[rid][id]) || {}; }
  function saveItemState(rid, id, st) { var a = jget(LS_KEY, {}); if (!a[rid]) { a[rid] = {}; } a[rid][id] = st; jset(LS_KEY, a); }
  /* 項目完成：影片播完自動完成；教材以「標記完成」手動完成（4.4 §2-3 完課條件依素材類型為「自動（播放至結束）／手動標記」） */
  function markItemDone(rid, it) {
    var st = itemState(rid, it.id); if (st.done) { return false; }
    var d = new Date(); st.done = true; st.minutes = it.durSec ? Math.round(it.durSec / 60) : 4;
    st.at = TODAY + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); st.hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    saveItemState(rid, it.id, st); return true;
  }
  var IC = {
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4.5v15l12-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14M16 5v14"/></svg>',
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
    circ: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  IC.book = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2z"/><path d="M22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z"/></svg>';
  IC.audio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
  IC.car = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  /* 項目類型圖示（4.1 素材六類） */
  var ICT = {
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none"/></svg>',
    material: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
    audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/></svg>',
    homework: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 9l2 2 4-4M8 16h8"/></svg>'
  };
  /* 課程層「教材資源」（客戶 4.4 §2-5）：整門課共用、不計入學習進度。
     20261111 使用者說明：教材分兩種——「資源教材」（資源庫素材，可下載）與「教材（電子書，4.8 教材）」：
     電子書不能下載，點「閱讀」開電子書頁（漢字版本＋各輔助語言版本），選輔助語言後開閱讀畫面（上方電子書、下方可選附屬音檔）。
     音檔清單依書本課次排序（4.8 TM-7）；選音檔後跳到該音檔在「目前版本」的起始頁（TM-8：頁碼是音檔 × 版本）。
     示範限制：教材主檔沒有封面圖與總頁數 → 封面用暫代圖、總頁數用「最後一個音檔起始頁＋8（至少 24 頁）」示意；音檔時長亦為示範值。 */
  function verLabel(k) { var p = k.split('-'); return (p[0] === 'tc' ? T('繁體', 'Traditional') : T('簡體', 'Simplified')) + ' · ' + (p[1] === 'en' ? T('EN 輔助', 'EN support') : T('JP 輔助', 'JP support')); }
  function courseResources(C) { return C.placeholder ? [] : ((M.selfPacedResources || {})[C.id] || []); }
  function bookById(id) { return (M.materialBooks || []).filter(function (x) { return x.id === id; })[0]; }
  function scriptName(s) { return s === 'tc' ? T('繁體中文', 'Traditional Chinese') : T('簡體中文', 'Simplified Chinese'); }
  function auxName(a) { return a === 'en' ? T('英語 English', 'English') : (a === 'ja' ? T('日語 Japanese', 'Japanese') : a); }
  function bookScripts(b) { var out = []; Object.keys(b.versions || {}).forEach(function (k) { var s = k.split('-')[0]; if (out.indexOf(s) < 0) { out.push(s); } }); return out.sort(function (x, y) { return x === y ? 0 : (x === 'tc' ? -1 : 1); }); }
  function bookAudios(b) { return (b.audios || []).map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) { return ((x.a.lesson || 999) - (y.a.lesson || 999)) || (x.i - y.i); }).map(function (x) { return x.a; }); }
  function bookPages(b, ver) { var m = 0; (b.audios || []).forEach(function (a) { var p = (a.pages || {})[ver]; if (p > m) { m = p; } }); return Math.max(24, m + 8); }
  function audioLen(a) { return 60 + (hash(a.id) % 60); }
  function bookCoverHtml(b) { return '<div class="pj-bcover"><span>TLI</span><b>' + esc(b.titleZh) + '</b>' + (b.titleEn ? '<small>' + esc(b.titleEn) + '</small>' : '') + '</div>'; }
  function resourcesHtml(C) {
    var list = courseResources(C), h = '<div class="section-title">' + T('教材資源', 'Course resources') + '</div><div class="card"><p class="small muted" style="margin:0 0 6px">' + T('整門課共用的教材與素材，不列入學習進度計算。', 'Materials shared by the whole course. They do not count toward progress.') + '</p>';
    if (!list.length) { return h + '<p class="small muted" style="margin:0">' + T('這門課目前沒有教材資源。', 'This course has no resources yet.') + '</p></div>'; }
    list.forEach(function (r) {
      if (r.kind === 'book') {
        var b = bookById(r.bookId); if (!b || b.status === '停用') { return; }
        var auds = (b.audios || []).length;
        h += '<div class="pj-file">' + IC.book + '<div><b>' + esc(T(b.titleZh, b.titleEn || b.titleZh)) + '</b><small>' + T('電子書・線上閱讀', 'E-book · read online') + (auds ? T('・附 ' + auds + ' 個音檔', ' · ' + auds + ' audio tracks') : '') + '</small></div>' +
          '<button type="button" class="btn btn-primary btn-sm" data-pj="book" data-r="' + r.id + '" style="display:inline-flex;align-items:center;gap:6px">' + T('閱讀', 'Read') + '</button></div>';
      } else {
        h += '<div class="pj-file">' + (ICT[r.type] || IC.file) + '<div><b>' + esc(T(r.zh, r.en || r.zh)) + '</b><small>' + typeName(r.type) + '</small></div>' +
          '<button type="button" class="btn btn-outline btn-sm" data-pj="resdl" data-r="' + r.id + '" style="display:inline-flex;align-items:center;gap:6px">' + IC.dl + T('下載', 'Download') + '</button></div>';
      }
    });
    return h + '</div>';
  }
  function resOf(u, rid) { return courseResources(courseById(u._cid)).filter(function (x) { return x.id === rid; })[0] || null; }
  /* 電子書頁：漢字版本切換＋各輔助語言版本列（閱讀）；不提供電子書下載 */
  function bookHtml(u) {
    var B = u._book, r = resOf(u, B.rid), b = r && bookById(r.bookId); if (!b) { return ''; }
    var scs = bookScripts(b), sc = (B.script && scs.indexOf(B.script) >= 0) ? B.script : scs[0], auds = bookAudios(b);
    var keys = Object.keys(b.versions || {}).filter(function (k) { return k.split('-')[0] === sc; });
    var h = '<div class="pj-bk"><button type="button" class="btn btn-outline btn-sm" data-pj="bookback" style="display:inline-flex;align-items:center;gap:6px">' + IC.back + T('返回課程內容', 'Back to course') + '</button></div>';
    h += '<div class="card pj-bkhead">' + bookCoverHtml(b) + '<div class="pj-binfo"><h2>' + esc(T(b.titleZh, b.titleEn || b.titleZh)) + '</h2>' +
      '<div class="pj-brow2"><span>' + T('漢字版本', 'Script') + '</span><div class="pj-seg">' + scs.map(function (s) { return '<button type="button" class="' + (s === sc ? 'on' : '') + '" data-pj="bscript" data-s="' + s + '">' + scriptName(s) + '</button>'; }).join('') + '</div></div>' +
      '<div class="pj-brow2"><span>' + T('附屬音檔', 'Audio tracks') + '</span><b>' + auds.length + T(' 個', '') + '</b></div>' +
      '<div class="pj-brow2"><span>' + T('使用課程', 'Used in') + '</span><b>' + esc(courseName(u._cid)) + '</b></div></div></div>';
    h += '<div class="pj-btabs"><span class="on">' + T('電子書版', 'E-book') + '</span>' + (auds.length ? '<button type="button" class="btn btn-outline btn-sm" data-pj="mp3all" style="display:inline-flex;align-items:center;gap:6px">' + IC.dl + T('下載所有 MP3 錄音檔', 'Download all MP3 audio') + '</button>' : '') + '</div>';
    h += '<div class="card pj-eblist">' + (keys.length ? keys.map(function (k) {
      return '<div class="pj-ebrow"><span class="pj-eb-l">' + auxName(k.split('-')[1]) + '</span><span class="pj-eb-f">' + esc(b.versions[k]) + '</span><span class="small muted">P.1–' + bookPages(b, k) + '</span><button type="button" class="btn btn-primary btn-sm" data-pj="read" data-v="' + k + '">' + T('閱讀', 'Read') + '</button></div>';
    }).join('') : '<p class="small muted" style="margin:0;padding:14px">' + T('這個漢字版本尚無電子書檔案。', 'No e-book file for this script yet.') + '</p>') + '</div>';
    h += '<p class="small muted" style="margin:8px 2px 0">' + T('電子書僅提供線上閱讀，無法下載。選擇輔助語言版本後開始閱讀。', 'E-books are read online only and cannot be downloaded. Choose a support-language version to start reading.') + '</p>';
    return h;
  }
  /* 閱讀畫面：上方電子書（左縮圖、右頁面），下方附屬音檔選單＋播放器 */
  function readerHtml(u) {
    var R = u._reader, r = resOf(u, R.rid), b = r && bookById(r.bookId); if (!b) { return ''; }
    var ver = R.ver, p = ver.split('-'), auds = bookAudios(b), N = bookPages(b, ver), cur = auds[R.ai] || null, thumbs = '', i;
    for (i = 1; i <= N; i++) { thumbs += '<button type="button" class="pj-th' + (i === R.page ? ' on' : '') + '" data-pj="pg" data-p="' + i + '"><span>' + i + '</span></button>'; }
    var onPage = auds.filter(function (a) { return (a.pages || {})[ver] === R.page; });
    var h = '<div class="pj-bk"><button type="button" class="btn btn-outline btn-sm" data-pj="readerback" style="display:inline-flex;align-items:center;gap:6px">' + IC.back + T('返回教材', 'Back to book') + '</button></div>';
    h += '<div class="pj-ls-h"><div><h2>' + esc(T(b.titleZh, b.titleEn || b.titleZh)) + '</h2><small>' + scriptName(p[0]) + '・' + auxName(p[1]) + '</small></div><span class="badge badge-muted">' + T('第 ' + R.page + '／' + N + ' 頁', 'Page ' + R.page + ' of ' + N) + '</span></div>';
    h += '<div class="pj-reader"><div class="pj-thumbs">' + thumbs + '</div><div class="pj-pagewrap"><div class="pj-page"><small>' + esc(b.titleZh) + '・' + esc(b.versions[ver]) + '</small><b>' + R.page + '</b>' +
      (onPage.length ? '<span class="pj-pg-au">' + IC.audio + onPage.map(function (a) { return esc(T(a.titleZh, a.titleEn || a.titleZh)); }).join('、') + '</span>' : '') + '<em>' + T('示範頁面', 'Sample page') + '</em></div>' +
      '<div class="pj-pnav"><button type="button" class="btn btn-outline btn-sm" data-pj="pgprev"' + (R.page <= 1 ? ' disabled' : '') + '>' + T('‹ 上一頁', '‹ Prev') + '</button><button type="button" class="btn btn-outline btn-sm" data-pj="pgnext"' + (R.page >= N ? ' disabled' : '') + '>' + T('下一頁 ›', 'Next ›') + '</button></div></div></div>';
    h += '<div class="pj-abar">' + (auds.length ? '<select class="pj-aud" aria-label="' + T('選擇音檔', 'Choose audio') + '">' + auds.map(function (a, k) {
      var pg = (a.pages || {})[ver];
      return '<option value="' + k + '"' + (k === R.ai ? ' selected' : '') + '>' + (a.lesson ? 'L' + a.lesson + ' ' : '') + esc(T(a.titleZh, a.titleEn || a.titleZh)) + (pg ? '（P.' + pg + '）' : '') + '</option>';
    }).join('') + '</select><button type="button" class="pj-abtn" data-pj="aplay" aria-label="' + T('播放', 'Play') + '">' + IC.play + '</button><input type="range" id="pjAseek" min="0" max="100" value="' + R.apct + '" aria-label="' + T('播放進度', 'Seek') + '"><span id="pjAtime"></span>' : '<span class="small muted">' + T('這本教材沒有附屬音檔。', 'This book has no audio tracks.') + '</span>') + '</div>';
    if (cur && !(cur.pages || {})[ver]) { h += '<p class="small muted" style="margin:6px 2px 0">' + T('這個音檔在此版本沒有設定起始頁。', 'This track has no start page in this version.') + '</p>'; }
    else if (auds.length) { h += '<p class="small muted" style="margin:6px 2px 0">' + T('選擇音檔後，會跳到該音檔在此版本的起始頁。', 'Choosing a track jumps to its start page in this version.') + '</p>'; }
    return h;
  }
  function itemMeta(it) { return it.durSec ? mmss(it.durSec) : (it.pages ? T(it.pages + ' 頁', it.pages + ' pages') : ''); }
  function pjBuild(kind, u) {
    var P = progress(u.rid), LG = lounge(u.rid, u.perWeek), h = '';
    if (kind === 'm08') {
      if (!u._cid) {
        /* 我的課程：一門課一張卡；只有一門課時仍顯示列表，選單「課程」的行為固定（使用者 2026-11-10 同意） */
        h += pjHead(T('課程總覽', 'Course Overview'), T('學校為你的班級安排的自學課程，點選課程查看章節內容。', 'Self-paced courses arranged for your class. Select a course to see its lessons and sections.'));
        COURSES.forEach(function (C) {
          var Pc = progress(u.rid, C.id), nSec = C.chapters.reduce(function (a, ch) { return a + ch.sections.length; }, 0), nx = Pc.started && Pc.pct < 100 ? nextOpenItem(u.rid, C.id) : null;
          var stB = Pc.pct >= 100 ? ['badge-ok', T('已完成', 'Completed')] : (Pc.started ? ['badge-info', T('進行中', 'In progress')] : ['badge-muted', T('未開始', 'Not started')]);
          var nxSec = nx ? C.chapters[nx.ci].sections[nx.si] : null;
          var cvD = M.productCover ? M.productCover(C.id, 'desktop') : '', cvM = M.productCover ? M.productCover(C.id, 'mobile') : '';
          h += '<div class="card pj-course" data-pj="course" data-c="' + C.id + '"><div class="pj-cv"><img class="d" src="' + cvD + '" alt="' + esc(courseName(C.id)) + T(' 封面', ' cover') + '"><img class="m" src="' + cvM + '" alt=""></div><div class="pj-cb"><div class="pj-top"><span>' + esc(courseName(C.id)) + '</span><span class="badge ' + stB[0] + '">' + stB[1] + '</span></div>' +
            '<p class="small muted" style="margin:6px 0 0">' + T(C.chapters.length + ' 章・' + nSec + ' 節・' + Pc.total + ' 個項目・總時長 ', C.chapters.length + ' lessons · ' + nSec + ' sections · ' + Pc.total + ' items · ') + durLabel(courseDurSec(C)) + '</p>' +
            (C.placeholder ? '<p class="small muted" style="margin:4px 0 0">' + T('示範多門課程用的佔位課程，名稱與內容待定。', 'Placeholder to show multiple courses; name and content TBD.') + '</p>' : '') +
            '<div class="progress" style="margin-top:12px"><div style="width:' + Pc.pct + '%"></div></div>' +
            '<div class="pj-meta"><span>' + T('已完成 ', 'Done ') + Pc.done + '／' + Pc.total + T(' 個項目', ' items') + (nxSec ? T('・接下來：', ' · Up next: ') + secNo(nx.ci, nx.si) + ' ' + esc(T(nxSec.zh, nxSec.en)) : '') + '</span><span>' + Pc.pct + '%</span></div>' +
            '<div style="margin-top:12px"><button type="button" class="btn btn-primary btn-sm" data-pj="resume" data-c="' + C.id + '">' + (Pc.pct >= 100 ? T('複習', 'Review') : (Pc.started ? T('繼續學習', 'Continue') : T('開始學習', 'Start'))) + '</button></div></div></div>';
        });
      } else {
        /* 課程內容：章 › 節 › 項目，與後台 a03「課程內容」同結構；章、節各自可收合，另有全部展開／全部收合（4.4 §2-2） */
        var C = courseById(u._cid), Pc = progress(u.rid, C.id), nxt = Pc.pct < 100 ? nextOpenItem(u.rid, C.id) : null, op = u._open || (u._open = {});
        h += '<div class="pj-bk"><button type="button" class="btn btn-outline btn-sm" data-pj="courses" style="display:inline-flex;align-items:center;gap:6px">' + IC.back + T('返回課程總覽', 'Back to course overview') + '</button></div>';
        h += pjHead(courseName(C.id), T('依自己的步調學習各章節，完成每個項目後進度會自動更新。', 'Study each lesson and section at your own pace. Progress updates as you complete each item.'));
        h += '<div class="card"><div class="pj-top" style="cursor:default"><span>' + T('學習進度', 'Progress') + '</span><span class="badge badge-info">' + esc(u.projectName.replace(/^.*．/, '')) + '</span></div>' +
          '<div class="progress" style="margin-top:12px"><div style="width:' + Pc.pct + '%"></div></div>' +
          '<div class="pj-kpis"><div><small>' + T('已完成項目', 'Items completed') + '</small><b>' + Pc.done + '／' + Pc.total + '</b></div><div><small>' + T('完成率', 'Completion') + '</small><b>' + Pc.pct + '%</b></div><div><small>' + T('累計學習時數', 'Study time') + '</small><b>' + Pc.hours + '</b> ' + T('小時', 'hrs') + '</div></div>' +
          (Pc.started ? '' : '<p class="small muted" style="margin:0 0 10px">' + T('尚未開始，從 1-1 開始。', 'Not started yet. Begin with 1-1.') + '</p>') +
          '<button type="button" class="btn btn-primary btn-sm" data-pj="resume" data-c="' + C.id + '">' + (Pc.pct >= 100 ? T('複習', 'Review') : (Pc.started ? T('繼續學習', 'Continue') : T('開始學習', 'Start'))) + '</button> ' +
          (C.id === 'skuC05' ? '<a class="btn btn-outline btn-sm" href="m18_learning_dashboard.html">' + T('學習儀表板', 'Learning Dashboard') + '</a>' : '') + '</div>';
        h += '<div class="pj-oh"><div class="section-title" style="margin:0">' + T('課程內容', 'Course content') + '</div><div class="pj-oh-b"><button type="button" class="btn btn-outline btn-sm" data-pj="expandall">' + T('全部展開', 'Expand all') + '</button><button type="button" class="btn btn-outline btn-sm" data-pj="collapseall">' + T('全部收合', 'Collapse all') + '</button></div></div><div class="card" id="pjOutline">';
        C.chapters.forEach(function (ch, ci) {
          var pc = Pc.chapters[ci], chOpen = op[ch.id] != null ? op[ch.id] : !!(nxt && nxt.ci === ci);
          var stc = pc.pct >= 100 ? '<span class="badge badge-ok">' + T('已完成', 'Completed') + '</span>' : (pc.done > 0 ? '<span class="badge badge-info">' + T('進行中', 'In progress') + '</span>' : '<span class="badge badge-muted">' + T('未開始', 'Not started') + '</span>');
          h += '<div class="pj-ch' + (chOpen ? ' open' : '') + '"><div class="pj-top" data-pj="tog" data-id="' + ch.id + '"><span class="pj-tt"><span class="pj-car">' + IC.car + '</span>' + chapterLabel(ci) + '　' + esc(T(ch.zh, ch.en)) + '</span>' + stc + '</div>' +
            '<div class="progress" style="margin-top:8px"><div style="width:' + pc.pct + '%"></div></div><div class="pj-meta"><span>' + T('已完成 ', 'Done ') + pc.done + '／' + pc.total + T(' 個項目', ' items') + '</span><span>' + pc.pct + '%</span></div><div class="pj-secs">';
          ch.sections.forEach(function (s, si) {
            var ps = pc.sections[si], sOpen = op[s.id] != null ? op[s.id] : !!(nxt && nxt.ci === ci && nxt.si === si);
            h += '<div class="pj-sec' + (sOpen ? ' open' : '') + '"><div class="pj-sec-h" data-pj="tog" data-id="' + s.id + '"><span class="pj-tt"><span class="pj-car">' + IC.car + '</span>' + secNo(ci, si) + '　' + esc(T(s.zh, s.en)) + '</span><span class="small muted">' + ps.done + '／' + ps.total + '</span></div><div class="pj-items">';
            s.items.forEach(function (it) {
              var dn = !!Pc.itemsDone[it.id];
              h += '<div class="pj-item" data-pj="sec" data-ci="' + ci + '" data-si="' + si + '"><span class="pj-ic">' + (ICT[it.type] || IC.file) + '</span><span class="pj-it">' + typeName(it.type) + '・' + esc(T(it.zh, it.en)) + '</span><span class="small muted">' + itemMeta(it) + '</span>' + (dn ? '<span class="pj-dn" title="' + T('已完成', 'Completed') + '">' + IC.ok + '</span>' : '<span class="pj-td" title="' + T('未完成', 'To do') + '">' + IC.circ + '</span>') + '</div>';
            });
            h += '</div></div>';
          });
          h += '</div></div>';
        });
        h += '</div>';
        h += resourcesHtml(C);
      }
    } else if (kind === 'm02') {
      h += pjHead(T('預約 Mandarin Lounge', 'Book Mandarin Lounge'), T('每週可預約的口說練習場次，由 TLI 中心教師帶領。', 'Weekly speaking practice sessions led by TLI center teachers.'));
      h += '<div class="card"><div class="pj-row"><span>' + T('本週剩餘', 'Left this week') + '</span><b>' + LG.remaining + '／' + LG.quota + T(' 次', '') + '</b></div>' +
        '<div class="progress" style="margin:4px 0 12px"><div style="width:' + Math.round(LG.used / Math.max(1, LG.quota) * 100) + '%"></div></div>' +
        '<a class="btn btn-primary" href="m14_chat_booking.html">' + T('預約場次', 'Book a session') + '</a></div>';
      var up = pjUpcoming(u.rid);
      h += '<div class="section-title">' + T('即將開始的預約', 'Upcoming bookings') + '</div><div class="card">' + (up.length ? up.map(function (b) { return '<div class="pj-row"><span>' + esc(pjSessLine(b)) + '</span><b>' + pjTypeLbl(b.type) + '・' + esc(b.teacher) + T(' 老師', '') + '</b></div>'; }).join('') : '<p class="small muted" style="margin:0">' + T('目前沒有預約。', 'No bookings yet.') + '</p>') + '</div>';
    } else if (kind === 'm03') {
      h += pjHead(T('我的課表', 'My Schedule'), T('已預約的 Mandarin Lounge 場次，時間以亞利桑那時間顯示。', 'Your Mandarin Lounge sessions, shown in Arizona time.'));
      var ub = pjUpcoming(u.rid);
      h += '<div class="card">' + (ub.length ? ub.map(function (b) {
        return '<div class="pj-row"><div><b style="text-align:left;display:block">' + esc(pjSessLine(b)) + '</b><span class="small">' + pjTypeLbl(b.type) + '・' + esc(b.teacher) + T(' 老師・', ' · ') + esc(toolName(b.tool)) + '</span></div>' +
          '<a class="btn btn-outline btn-sm" href="m16_classroom.html?lesson=' + encodeURIComponent(b.id) + '&type=chat">' + T('進入教室', 'Enter') + '</a></div>';
      }).join('') : '<div class="empty-state"><h4>' + T('目前沒有預約的場次', 'No sessions booked') + '</h4><p style="margin-bottom:12px">' + T('到預約頁選一個時段。', 'Pick a time slot on the booking page.') + '</p><a class="btn btn-primary btn-sm" href="m14_chat_booking.html">' + T('預約場次', 'Book a session') + '</a></div>') + '</div>';
      var hs = seedHistory(u.rid).concat(myBookings(u.rid).filter(function (b) { return b.status === 'booked' && b.utc <= NOW_UTC; }));
      h += '<div class="section-title">' + T('已上過的場次', 'Past sessions') + '</div><div class="card">' + (hs.length ? hs.map(function (b) { return '<div class="pj-row"><div><b style="text-align:left;display:block">' + mdLabel(b.date) + ' ' + wd(b.date) + ' ' + b.time + T('（亞利桑那時間）', ' (Arizona time)') + (b.topic ? '・' + esc(T(b.topic, b.topicEn || b.topic)) : '') + '</b><span class="small">' + pjTypeLbl(b.type) + '・' + esc(b.teacher) + T(' 老師・', ' · ') + esc(toolName(b.tool)) + '</span></div><span class="badge badge-ok" style="align-self:center;flex:none">' + T('已出席', 'Attended') + '</span></div>'; }).join('') : '<p class="small muted" style="margin:0">' + T('還沒有上過的場次。', 'No past sessions yet.') + '</p>') + '</div>';
    } else if (kind === 'm04') {
      h += pjHead(T('我的專案', 'My Program'), T('學校為你的班級安排的學習內容。', 'What your school arranged for your class.'));
      h += '<div class="card"><div class="pj-row"><span>' + T('專案', 'Program') + '</span><b>' + esc(u.projectName) + '</b></div>' +
        '<div class="pj-row"><span>' + T('學校', 'School') + '</span><b>' + esc(u.partnerName) + '</b></div>' +
        '<div class="pj-row"><span>' + T('班級', 'Class') + '</span><b>' + esc(u.className) + '</b></div>' +
        '<div class="pj-row"><span>' + T('班級老師', 'Class teacher') + '</span><b>' + esc(u.teacherName) + T(' 老師', '') + '</b></div>' +
        '<div class="pj-row"><span>' + T('學習期間', 'Period') + '</span><b>' + u.from.slice(0, 10) + ' – ' + u.to.slice(0, 10) + '</b></div></div>';
      h += '<div class="section-title">' + T('包含內容', 'What is included') + '</div><div class="card">' +
        '<div class="pj-row"><span>' + T('自學課程', 'Self-paced course') + '</span><b>' + esc(courseName()) + '</b></div>' +
        '<div class="pj-row"><span>Mandarin Lounge</span><b>' + T('每週 ', '') + u.perWeek + T(' 次，團體場次', ' group sessions per week') + '</b></div>' +
        '<div class="pj-row"><span>' + T('學習儀表板', 'Learning dashboard') + '</span><b>' + T('進度與學習時數', 'Progress and study time') + '</b></div>' +
        /* 證書與階段考一階段 B 上線（功能展開表），1A 檢視時不列 */
        (g.TLI_PHASE && !g.TLI_PHASE.atLeast('1B') ? '' : '<div class="pj-row"><span>' + T('證書', 'Certificate') + '</span><b>' + T('完成課程後核發', 'Issued on completion') + '</b></div>') +
        '<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-primary btn-sm" href="m08_self_paced.html">' + T('前往自學課程', 'Self-paced course') + '</a><a class="btn btn-outline btn-sm" href="m14_chat_booking.html">' + T('預約 Lounge', 'Book Lounge') + '</a><a class="btn btn-outline btn-sm" href="m18_learning_dashboard.html">' + T('學習儀表板', 'Dashboard') + '</a></div></div>';
    } else if (kind === 'm07') {
      h += pjHead(T('我的', 'Me'), T('基本資料由學校名單帶入，如需更正請洽班級老師。', 'Basic details come from your school roster. Contact your teacher to correct them.'));
      h += '<div class="card pj-form"><label>' + T('姓名', 'Name') + '</label><input readonly value="' + esc(u.name) + '"><label>Email</label><input readonly value="' + esc(u.email) + '">' +
        '<label>' + T('學校', 'School') + '</label><input readonly value="' + esc(u.partnerName) + '"><label>' + T('班級', 'Class') + '</label><input readonly value="' + esc(u.className) + '">' +
        '<label>' + T('班級老師', 'Class teacher') + '</label><input readonly value="' + esc(u.teacherName) + '"><label>' + T('時區', 'Time zone') + '</label><input readonly value="' + T('亞利桑那（UTC-7）', 'Arizona (UTC-7)') + '"></div>';
      h += '<div class="section-title">' + T('偏好設定', 'Preferences') + '</div><div class="card pj-form"><label>' + T('介面語言', 'Interface language') + '</label><select id="pjLang"><option>English</option><option>繁體中文</option></select>' +
        '<label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="pjMail" checked style="width:auto"> ' + T('場次開始前寄 Email 提醒', 'Email me before a session starts') + '</label>' +
        '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-primary btn-sm" data-pj="save">' + T('儲存', 'Save') + '</button><button type="button" class="btn btn-outline btn-sm" data-pj="logout">' + T('登出', 'Sign out') + '</button></div></div>';
    }
    return h;
  }
  function pjMount(kind, u) {
    var main = document.querySelector('main.content'); if (!main) { return; }
    var st = document.createElement('style'); st.textContent = PJ_CSS; document.head.appendChild(st);
    Array.prototype.forEach.call(main.children, function (c) { c.setAttribute('data-pj-hidden', '1'); });
    var box = document.createElement('div'); box.id = 'pjMain'; main.appendChild(box);
    var titles = { m08: ['我的課程', 'My Courses'], m02: ['預約 Mandarin Lounge', 'Book Mandarin Lounge'], m03: ['我的課表', 'My Schedule'], m04: ['我的專案', 'My Program'], m07: ['我的', 'Me'] };
    var V = null, vt = null;   /* V：目前開啟的節 {cid,ci,si,pct,playing}；vt：影片播放計時器 */
    function curC() { return courseById(V.cid); }
    function curSec() { return curC().chapters[V.ci].sections[V.si]; }
    function vidItem() { return curSec().items.filter(function (it) { return it.type === 'video'; })[0] || null; }
    function stopVid() { if (vt) { clearInterval(vt); vt = null; } if (V) { V.playing = false; } }
    /* 前後一節（跨章連續） */
    function stepSec(C, ci, si, d) {
      var all = []; C.chapters.forEach(function (ch, a) { ch.sections.forEach(function (s, b) { all.push({ ci: a, si: b }); }); });
      for (var i = 0; i < all.length; i++) { if (all[i].ci === ci && all[i].si === si) { return all[i + d] || null; } }
      return null;
    }
    function openSection(cid, ci, si) {
      stopVid(); var C = courseById(cid), s = C.chapters[ci].sections[si], vi = s.items.filter(function (it) { return it.type === 'video'; })[0], P = progress(u.rid, cid);
      V = { cid: cid, ci: ci, si: si, pct: (vi && P.itemsDone[vi.id]) ? 100 : 0, playing: false };
      u._cid = cid; draw(); window.scrollTo(0, 0);
    }
    function closeSection() {
      stopVid();
      if (V) { u._open = u._open || {}; u._open[curC().chapters[V.ci].id] = true; u._open[curSec().id] = true; }
      V = null; draw(); window.scrollTo(0, 0);
    }
    function doneItem(it) { var d = markItemDone(u.rid, it); draw(); if (d) { pjToast(T('已完成：', 'Completed: ') + typeName(it.type) + '・' + T(it.zh, it.en)); } }
    function vidUpdate() {
      var vi = vidItem(); if (!vi) { return; }
      var tot = vi.durSec || 300, sk = box.querySelector('#pjSeek'), tm = box.querySelector('#pjTime'), btn = box.querySelectorAll('[data-pj="play"]'), lb = box.querySelector('#pjVlabel');
      if (sk) { sk.value = V.pct; } if (tm) { tm.textContent = mmss(tot * V.pct / 100) + ' / ' + mmss(tot); }
      btn.forEach(function (b) { b.innerHTML = V.playing ? IC.pause : IC.play; b.setAttribute('aria-label', V.playing ? T('暫停', 'Pause') : T('播放', 'Play')); });
      if (lb) { lb.textContent = V.playing ? T('播放中', 'Playing') : (V.pct >= 100 ? T('已播完', 'Finished') : (V.pct > 0 ? T('已暫停', 'Paused') : T('點擊播放', 'Select play to start'))); }
    }
    function playToggle() {
      if (V.playing) { stopVid(); vidUpdate(); return; }
      if (V.pct >= 100) { V.pct = 0; }
      V.playing = true; vidUpdate();
      vt = setInterval(function () {
        V.pct = Math.min(100, V.pct + 2);
        if (V.pct >= 100) { stopVid(); doneItem(vidItem()); } else { vidUpdate(); }
      }, 250);
    }
    /* 節的學習頁：依序列出本節所有項目；下方是本章各節目錄與上一節／下一節 */
    function sectionHtml() {
      var C = curC(), ch = C.chapters[V.ci], s = curSec(), P = progress(u.rid, C.id), pch = P.chapters[V.ci], ps = pch.sections[V.si], allDone = ps.done >= ps.total, vi = vidItem(), h = '';
      var prev = stepSec(C, V.ci, V.si, -1), nx = stepSec(C, V.ci, V.si, 1);
      h += '<div class="pj-bk"><button type="button" class="btn btn-outline btn-sm" data-pj="back" style="display:inline-flex;align-items:center;gap:6px">' + IC.back + T('返回課程內容', 'Back to course') + '</button></div>';
      h += '<div class="pj-ls-h"><div><h2>' + secNo(V.ci, V.si) + '　' + esc(T(s.zh, s.en)) + '</h2><small>' + esc(courseName(C.id)) + '・' + chapterLabel(V.ci) + '　' + esc(T(ch.zh, ch.en)) + '</small></div>' +
        (allDone ? '<span class="badge badge-ok">' + T('本節已完成', 'Section completed') + '</span>' : '<span class="badge badge-muted">' + T('已完成 ', 'Done ') + ps.done + '／' + ps.total + T(' 個項目', ' items') + '</span>') + '</div>';
      h += '<div class="pj-conds">' + s.items.map(function (it) { var dn = !!P.itemsDone[it.id]; return '<span class="pj-cond' + (dn ? ' ok' : '') + '">' + (dn ? IC.ok : IC.circ) + typeName(it.type) + '・' + esc(T(it.zh, it.en)) + '</span>'; }).join('') + '</div>';
      s.items.forEach(function (it, ii) {
        var dn = !!P.itemsDone[it.id];
        h += '<div class="section-title">' + typeName(it.type) + '・' + esc(T(it.zh, it.en)) + '</div>';
        if (it === vi) {
          h += '<div class="card"><div class="pj-vid"><div class="pj-vscreen"><b>' + esc(T(s.zh, s.en)) + '</b><small>' + secNo(V.ci, V.si) + '・' + esc(T(it.zh, it.en)) + '</small>' +
            '<button type="button" class="pj-playbtn" data-pj="play" aria-label="' + T('播放', 'Play') + '">' + IC.play + '</button><small id="pjVlabel"></small></div>' +
            '<div class="pj-vbar"><button type="button" class="pj-vbtn" data-pj="play" aria-label="' + T('播放', 'Play') + '">' + IC.play + '</button><input type="range" id="pjSeek" min="0" max="100" value="' + V.pct + '" aria-label="' + T('播放進度', 'Seek') + '"><span id="pjTime"></span></div></div>' +
            '<p class="small muted" style="margin:10px 0 0">' + (dn ? T('已看完這支影片，此項目已完成。', 'You have finished this video. This item is completed.') : T('播放到結尾，或拖曳進度條到結尾，即完成此項目。', 'Play to the end, or drag the bar to the end, to complete this item.')) + '</p></div>';
        } else if (it.type === 'material') {
          var f = materialFile(C, V.ci, V.si);
          h += '<div class="card"><div class="pj-file">' + IC.file + '<div><b>' + esc(f.name) + '</b><small>' + f.fmt + T('・' + f.pages + ' 頁', ' · ' + f.pages + ' pages') + '</small></div><button type="button" class="btn btn-outline btn-sm" data-pj="dl" style="display:inline-flex;align-items:center;gap:6px">' + IC.dl + T('下載', 'Download') + '</button></div>' +
            '<div class="pj-mk">' + (dn ? '<span class="pj-cond ok">' + IC.ok + T('已完成', 'Completed') + '</span>' : '<button type="button" class="btn btn-outline btn-sm" data-pj="mark" data-it="' + ii + '">' + T('標記為已完成', 'Mark as completed') + '</button>') +
            '<span class="small muted">' + T('教材讀完後請自行標記完成。', 'Mark the handout as completed after you read it.') + '</span></div></div>';
        } else {
          h += '<div class="card"><div class="pj-mk" style="margin-top:0">' + (dn ? '<span class="pj-cond ok">' + IC.ok + T('已完成', 'Completed') + '</span>' : '<button type="button" class="btn btn-outline btn-sm" data-pj="mark" data-it="' + ii + '">' + T('標記為已完成', 'Mark as completed') + '</button>') + '</div></div>';
        }
      });
      h += '<div class="section-title">' + chapterLabel(V.ci) + T('　各節', ' · Sections') + '</div><div class="card">' + ch.sections.map(function (x, si) {
        var p2 = pch.sections[si], fin = p2.done >= p2.total, cur = si === V.si;
        return '<div class="pj-lesson' + (cur ? ' cur' : '') + '" data-pj="sec" data-ci="' + V.ci + '" data-si="' + si + '"><span>' + secNo(V.ci, si) + '　' + esc(T(x.zh, x.en)) + '</span><span class="badge ' + (fin ? 'badge-ok' : (cur ? 'badge-info' : 'badge-muted')) + '">' + (fin ? T('已完成', 'Done') : (cur ? T('目前這節', 'Current') : p2.done + '／' + p2.total)) + '</span></div>';
      }).join('') + '</div>';
      h += '<div class="pj-foot">' + (prev ? '<button type="button" class="btn btn-outline" data-pj="go" data-ci="' + prev.ci + '" data-si="' + prev.si + '">' + IC.back + T('上一節', 'Previous section') + '</button>' : '<button type="button" class="btn btn-outline" data-pj="back">' + IC.back + T('返回課程內容', 'Back to course') + '</button>') +
        (nx ? '<button type="button" class="btn btn-primary" data-pj="go" data-ci="' + nx.ci + '" data-si="' + nx.si + '">' + T('下一節', 'Next section') + IC.next + '</button>' : '<button type="button" class="btn btn-primary" disabled>' + T('已是最後一節', 'Last section') + '</button>') + '</div>';
      return h;
    }
    /* 電子書閱讀畫面的音檔播放（示範：計時器推進進度，時長為示範值） */
    var at = null;
    function readerAudio() { var R = u._reader, r = R && resOf(u, R.rid), b = r && bookById(r.bookId); return b ? (bookAudios(b)[R.ai] || null) : null; }
    function stopAud() { if (at) { clearInterval(at); at = null; } if (u._reader) { u._reader.playing = false; } }
    function aUpdate() {
      var R = u._reader, a = readerAudio(); if (!R || !a) { return; }
      var tot = audioLen(a), sk = box.querySelector('#pjAseek'), tm = box.querySelector('#pjAtime'), bt = box.querySelector('[data-pj="aplay"]');
      if (sk) { sk.value = R.apct; } if (tm) { tm.textContent = mmss(tot * R.apct / 100) + ' / ' + mmss(tot); }
      if (bt) { bt.innerHTML = R.playing ? IC.pause : IC.play; bt.setAttribute('aria-label', R.playing ? T('暫停', 'Pause') : T('播放', 'Play')); }
    }
    function aToggle() {
      var R = u._reader; if (!R || !readerAudio()) { return; }
      if (R.playing) { stopAud(); aUpdate(); return; }
      if (R.apct >= 100) { R.apct = 0; }
      R.playing = true; aUpdate();
      at = setInterval(function () { R.apct = Math.min(100, R.apct + 2); if (R.apct >= 100) { stopAud(); } aUpdate(); }, 300);
    }
    function draw() {
      if (V) { stopVid(); box.innerHTML = sectionHtml(); vidUpdate(); }
      else if (u._reader) { box.innerHTML = readerHtml(u); aUpdate(); var th = box.querySelector('.pj-th.on'); if (th && th.scrollIntoView) { th.parentNode.scrollTop = th.offsetTop - th.parentNode.offsetTop - 60; } }
      else if (u._book) { box.innerHTML = bookHtml(u); }
      else { box.innerHTML = pjBuild(kind, u); }
      var tt = document.querySelector('.topbar-title'); if (tt) { tt.removeAttribute('data-i18n'); tt.removeAttribute('data-en'); tt.textContent = T(titles[kind][0], titles[kind][1]); }
    }
    function setAllOpen(on) {
      var C = courseById(u._cid); u._open = {};
      C.chapters.forEach(function (ch) { u._open[ch.id] = on; ch.sections.forEach(function (s) { u._open[s.id] = on; }); });
      draw();
    }
    /* 深連結：?course=<課程id> 直接開該課程內容（學習儀表板「繼續學習」使用） */
    if (kind === 'm08') { var qc = qs('course'); if (qc && COURSES.some(function (c) { return c.id === qc; })) { u._cid = qc; } }
    draw();
    if (g.TLI_I18N && g.TLI_I18N.onRefresh) { g.TLI_I18N.onRefresh(draw); }
    box.addEventListener('input', function (e) { if (u._reader && e.target && e.target.id === 'pjAseek') { u._reader.apct = +e.target.value; aUpdate(); } });
    /* 選音檔：跳到該音檔在目前版本的起始頁（4.8 TM-8），播放從頭開始 */
    box.addEventListener('change', function (e) {
      if (!u._reader || !e.target || !e.target.classList.contains('pj-aud')) { return; }
      stopAud(); var R = u._reader; R.ai = +e.target.value; R.apct = 0;
      var a = readerAudio(), pg = a && (a.pages || {})[R.ver]; if (pg) { R.page = pg; }
      draw();
    });
    box.addEventListener('input', function (e) { if (V && e.target && e.target.id === 'pjSeek') { V.pct = +e.target.value; if (V.pct >= 95 && V.pct < 100) { V.pct = 100; } if (V.pct >= 100) { stopVid(); doneItem(vidItem()); } else { vidUpdate(); } } });
    box.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-pj]') : null; if (!el) { return; }
      var a = el.getAttribute('data-pj');
      if (a === 'course') { u._cid = el.getAttribute('data-c'); u._open = {}; u._book = null; u._reader = null; draw(); window.scrollTo(0, 0); }
      else if (a === 'resume') { var cid = el.getAttribute('data-c'), it = nextOpenItem(u.rid, cid); if (it) { openSection(cid, it.ci, it.si); } }
      else if (a === 'courses') { u._cid = null; u._book = null; u._reader = null; draw(); window.scrollTo(0, 0); }
      /* 電子書：教材資源「閱讀」→ 電子書頁 →（選輔助語言）閱讀畫面 */
      else if (a === 'book') { u._book = { rid: el.getAttribute('data-r'), script: null }; u._reader = null; draw(); window.scrollTo(0, 0); }
      else if (a === 'bookback') { u._book = null; draw(); var rt = [].filter.call(box.querySelectorAll('.section-title'), function (x) { return x.textContent === T('教材資源', 'Course resources'); })[0]; if (rt) { rt.scrollIntoView(); } }
      else if (a === 'bscript') { u._book.script = el.getAttribute('data-s'); draw(); }
      else if (a === 'mp3all') { var bb = bookById((resOf(u, u._book.rid) || {}).bookId); pjToast(T('示範：下載全部 ' + (bb.audios || []).length + ' 個 MP3 錄音檔', 'Demo: downloading all ' + (bb.audios || []).length + ' MP3 files')); }
      else if (a === 'read') { u._reader = { rid: u._book.rid, ver: el.getAttribute('data-v'), page: 1, ai: 0, apct: 0, playing: false }; draw(); window.scrollTo(0, 0); }
      else if (a === 'readerback') { stopAud(); u._reader = null; draw(); window.scrollTo(0, 0); }
      else if (a === 'pg') { u._reader.page = +el.getAttribute('data-p'); draw(); }
      else if (a === 'pgprev') { u._reader.page = Math.max(1, u._reader.page - 1); draw(); }
      else if (a === 'pgnext') { u._reader.page += 1; draw(); }
      else if (a === 'aplay') { aToggle(); }
      else if (a === 'tog') { var p = el.parentNode; p.classList.toggle('open'); u._open = u._open || {}; u._open[el.getAttribute('data-id')] = p.classList.contains('open'); }
      else if (a === 'expandall') { setAllOpen(true); }
      else if (a === 'collapseall') { setAllOpen(false); }
      else if (a === 'sec' || a === 'go') { openSection(V ? V.cid : u._cid, +el.getAttribute('data-ci'), +el.getAttribute('data-si')); }
      else if (a === 'back') { closeSection(); }
      else if (a === 'play') { playToggle(); }
      else if (a === 'dl') { var fl = materialFile(curC(), V.ci, V.si); downloadBlob(fl.name, handoutPdf(fl)); pjToast(T('已下載 ', 'Downloaded ') + fl.name); }
      else if (a === 'resdl') {
        var rid = el.getAttribute('data-r'), rr = courseResources(courseById(u._cid)).filter(function (x) { return x.id === rid; })[0]; if (!rr) { return; }
        pjToast(T('示範：下載 ', 'Demo: downloading ') + T(rr.zh, rr.en || rr.zh));   /* 只有資源教材（素材）可下載；電子書走「閱讀」 */
      }
      else if (a === 'mark') { doneItem(curSec().items[+el.getAttribute('data-it')]); }
      else if (a === 'save') { pjToast(T('已儲存', 'Saved')); }
      else if (a === 'logout') { setSS({}); location.href = '../公開網站/p01_home.html'; }
    });
  }
  function pjNav(u) {
    var map = { 'm02_booking.html': ['m14_chat_booking.html', 'Mandarin Lounge'], 'm03_schedule.html': [null, T('我的課表', 'My Schedule')], 'm04_course_detail.html': [null, T('我的專案', 'My Program')] };
    document.querySelectorAll('.side-nav a.side-link, .bottom-nav a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      /* 成績單、證書、我的（個人資料）屬一階段 B，1A 專案合作學員不顯示 */
      if (/m06_renew|m13_checkout|m19_certificates|m20_transcripts|m07_profile/.test(href)) { a.style.display = 'none'; return; }
      Object.keys(map).forEach(function (k) {
        if (href.indexOf(k) < 0) { return; }
        var sp = a.querySelector('span'); if (sp) { sp.removeAttribute('data-i18n'); sp.removeAttribute('data-en'); sp.textContent = k === 'm02_booking.html' ? 'Mandarin Lounge' : map[k][1]; }
        if (map[k][0]) { a.setAttribute('href', map[k][0]); }
      });
    });
  }
  /* 側欄拿掉「我的」後，登出改放右上帳號選單（選單會隨語系重繪，故在開啟時補上） */
  function pjAcctLogout() {
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('#acctBtn')) { return; }
      setTimeout(function () {
        var p = document.getElementById('acctPanel'); if (!p || p.querySelector('[data-pj-logout]')) { return; }
        var a = document.createElement('a'); a.href = 'javascript:void(0)'; a.setAttribute('data-pj-logout', '1'); a.textContent = T('登出', 'Sign out');
        a.style.cssText = 'display:block;padding:7px 14px;color:#101828;text-decoration:none;border-top:1px solid #E4E7EC';
        a.onclick = function () { setSS({}); location.href = '../公開網站/p01_home.html'; };
        p.appendChild(a);
      }, 0);
    }, true);
  }
  function projectMember() {
    var u = me(); if (u.mode !== 'project') { return; }
    pjNav(u); pjAcctLogout();
    var m = /(m0[2-478])_[^\/]*\.html/.exec(g.location.pathname);
    if (m && /^m(02|03|04|07|08)$/.test(m[1])) { pjMount(m[1], u); }
  }

  g.TLI_PL = {
    today: TODAY, week: WEEK, weekStart: weekStart, nowUtc: NOW_UTC, T: T, esc: esc, wd: wd, mdLabel: mdLabel, addDays: addDays, pad: pad, qs: qs, xl: xl,
    partner: partner, quotaCfg: quotaCfg, toolName: toolName, projectName: projectName, classes: classes, classById: classById, teacherById: teacherById, teacherRosters: teacherRosters, rosterById: rosterById,
    rosterByEmail: rosterByEmail, students: students, teacherOfClass: teacherOfClass, teacherForRoster: teacherForRoster, isExistingMember: isExistingMember,
    COURSES: COURSES, UNITS: COURSES[0].chapters, TOTAL_ITEMS: TOTAL_ITEMS, courseName: courseName, unitName: unitName, chapterLabel: chapterLabel, secNo: secNo, typeName: typeName, nextOpenItem: nextOpenItem,
    me: me, signInStudent: signInStudent, signInTeacher: signInTeacher, teacherMe: teacherMe, activate: activate, isFresh: isFresh,
    progress: progress, behind: behind, lounge: lounge, seedHistory: seedHistory, sessionsFor: sessionsFor, teacherSessions: teacherSessions, openSession: openSession, replaceOpened: replaceOpened, closeOpened: closeOpened, book: book, cancel: cancel, cancellable: cancellable,
    bookings: bookings, myBookings: myBookings, csv: csv, download: download
  };
})(window);
