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
  var MONTH = TODAY.slice(0, 7);
  var BK_KEY = 'tliLoungeBookings_v1';
  var OPEN_KEY = 'tliLoungeOpened_v1';             /* 中心教師開設的團體場次（直營）；專案合作場次由 TLI 中心教師帶，一階段 A 由新達於資料庫設定 */
  var FRESH_KEY = 'tliPLFreshActivated_v1';       /* 由開通頁剛啟用、尚無學習紀錄的名單 id */
  var SS_KEY = 'tliPLSession_v1';
  var LS_KEY = 'tliPLLessons_v1';                  /* 專案合作學生單元學習紀錄：{ 名單id: { '單元-課次': { watched, score, passed, minutes, at, hm } } }，passed＝看完影片且測驗達標 */
  var PASS_SCORE = 60;
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
  function quotaCfg() { var q = (partner() || {}).loungeQuota || {}; return { perMonth: q.perStudentPerMonth || 4, groupCap: q.groupCap || 8 }; }
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

  /* ---------- 自學課程（產品 skuC05）單元 ---------- */
  var UNITS = [
    { id: 'u1', zh: '發音與聲調', en: 'Pronunciation and Tones', lessons: 6 },
    { id: 'u2', zh: '問候與自我介紹', en: 'Greetings and Introductions', lessons: 5 },
    { id: 'u3', zh: '數字、日期與時間', en: 'Numbers, Dates and Time', lessons: 6 },
    { id: 'u4', zh: '家人與朋友', en: 'Family and Friends', lessons: 5 },
    { id: 'u5', zh: '飲食與點餐', en: 'Food and Ordering', lessons: 6 },
    { id: 'u6', zh: '問路與交通', en: 'Directions and Transport', lessons: 5 },
    { id: 'u7', zh: '購物與價格', en: 'Shopping and Prices', lessons: 6 },
    { id: 'u8', zh: '週末與計畫', en: 'Weekend and Plans', lessons: 5 }
  ];
  var TOTAL_LESSONS = UNITS.reduce(function (a, u) { return a + u.lessons; }, 0);
  function lessonIndex(ui, k) { if (ui < 0 || ui >= UNITS.length || k < 1 || k > UNITS[ui].lessons) { return -1; } var n = 0; for (var i = 0; i < ui; i++) { n += UNITS[i].lessons; } return n + k - 1; }
  function courseName() { var p = (M.products || []).filter(function (x) { return x.id === 'skuC05'; })[0]; return p ? p.name : '自學影音課程包（中文基礎）'; }
  function unitName(u) { return T(u.zh, u.en); }

  /* ---------- 身分（目前分頁） ---------- */
  function getSS() { try { return JSON.parse(g.sessionStorage.getItem(SS_KEY)) || {}; } catch (e) { return {}; } }
  function setSS(o) { try { g.sessionStorage.setItem(SS_KEY, JSON.stringify(o)); } catch (e) {} }
  function qs(name) { try { return new URLSearchParams(g.location.search).get(name); } catch (e) { return null; } }

  function firstActiveStudent() { return students().filter(function (r) { return r.status === '已啟用' && !isFresh(r.id); })[0] || students()[0]; }
  /* 回傳目前會員：project（專案合作學生）或 general（一般學生 Emma） */
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
        partnerName: partner().name, projectName: projectName(), perMonth: q.perMonth, groupCap: q.groupCap, tool: partner().videoTool, tzOffset: -7, from: partner().from, to: partner().to };
    }
    return { mode: 'general', rid: 'gen', name: 'Emma Johnson', email: 'emma.johnson@example.com', classId: '', className: '', teacherName: '', partnerName: '', projectName: '',
      perMonth: 4, groupCap: quotaCfg().groupCap, tool: 'zoom', tzOffset: 8 };
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
  function progress(rid) {
    var r = rosterById(rid);
    var general = rid === 'gen';
    if (!general && (!r || r.status !== '已啟用')) { return { rid: rid, active: false, started: false, done: 0, total: TOTAL_LESSONS, pct: 0, minutes: 0, hours: '0.0', last: null, units: UNITS.map(function (u) { return { id: u.id, zh: u.zh, en: u.en, lessons: u.lessons, done: 0, pct: 0 }; }), recent: [], lessonsDone: {} }; }
    var fresh = !general && isFresh(rid);
    var baseDone = general ? 21 : (fresh ? 0 : Math.round(TOTAL_LESSONS * (0.15 + 0.75 * rnd(rid + ':p'))));
    /* 逐課完成旗標：先放示範底稿（前 baseDone 課），再疊上學生實際完成的課（localStorage），兩者合併後才算各單元進度 */
    var flags = [], exList = [], ex = general ? {} : (jget(LS_KEY, {})[rid] || {}), i;
    for (i = 0; i < TOTAL_LESSONS; i++) { flags.push(i < baseDone); }
    Object.keys(ex).forEach(function (key) {
      if (!ex[key] || !ex[key].passed) { return; }
      var pp = key.split('-'), gi = lessonIndex(+pp[0] - 1, +pp[1]);
      if (gi >= 0 && !flags[gi]) { flags[gi] = true; exList.push({ key: key, u: +pp[0] - 1, k: +pp[1], minutes: ex[key].minutes || 12, at: ex[key].at || '', hm: ex[key].hm || '09:00' }); }
    });
    exList.sort(function (a, b) { return a.at < b.at ? 1 : (a.at > b.at ? -1 : 0); });
    var lessonsDone = {}, cur = 0;
    var units = UNITS.map(function (u, ui) {
      var d = 0; for (var k = 1; k <= u.lessons; k++) { if (flags[cur++]) { d++; lessonsDone[(ui + 1) + '-' + k] = true; } }
      return { id: u.id, zh: u.zh, en: u.en, lessons: u.lessons, done: d, pct: Math.round(d / u.lessons * 100) };
    });
    var done = units.reduce(function (a, x) { return a + x.done; }, 0);
    var exMin = exList.reduce(function (a, x) { return a + x.minutes; }, 0);
    var minutes = done === 0 ? 0 : baseDone * 13 + (baseDone ? Math.round(rnd(rid + ':m') * 45) : 0) + exMin;
    var lastGap = exList.length ? 0 : (general ? 1 : Math.floor(rnd(rid + ':d') * 12));
    var last = done === 0 ? null : (exList.length ? { date: TODAY, time: exList[0].hm } : { date: addDays(TODAY, -lastGap), time: pad(8 + Math.floor(rnd(rid + ':t') * 14)) + ':' + pad(Math.floor(rnd(rid + ':t2') * 6) * 10) });
    var recent = exList.slice(0, 5).map(function (x) { return { date: TODAY, unitId: UNITS[x.u].id, zh: UNITS[x.u].zh, en: UNITS[x.u].en, lesson: x.k, minutes: x.minutes }; });
    var idx = baseDone, gap = general ? 1 : Math.floor(rnd(rid + ':d') * 12);
    if (exList.length) { gap = Math.max(1, gap); }
    while (recent.length < 5 && idx > 0 && baseDone > 0) {
      var acc = 0, ui = 0; for (ui = 0; ui < UNITS.length; ui++) { if (idx <= acc + UNITS[ui].lessons) { break; } acc += UNITS[ui].lessons; }
      recent.push({ date: addDays(TODAY, -gap), unitId: UNITS[ui].id, zh: UNITS[ui].zh, en: UNITS[ui].en, lesson: idx - acc, minutes: 9 + Math.floor(rnd(rid + ':r' + idx) * 10) });
      idx--; gap += 1 + Math.floor(rnd(rid + ':g' + idx) * 3);
    }
    return { rid: rid, active: true, started: done > 0, done: done, total: TOTAL_LESSONS, pct: Math.round(done / TOTAL_LESSONS * 100), minutes: minutes, hours: (minutes / 60).toFixed(1), last: last, lastGap: lastGap, units: units, recent: recent, lessonsDone: lessonsDone };
  }
  function behind(p) { return p.active && p.started && (p.pct < 25 || p.lastGap >= 7); }

  /* ---------- Mandarin Lounge 場次與預約 ---------- */
  /* 示範預約：專案合作學生第一次開啟時，依名單 id 決定性放 1–2 筆已預約的班級場次（寫入同一份 localStorage，m03 與 m14 讀同一份） */
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
  function seedTerm(rid) { if (rid === 'gen') { return 3; } var r = rosterById(rid); if (!r || r.status !== '已啟用' || isFresh(rid)) { return 0; } return seedUsed(rid) + Math.floor(rnd(rid + ':f') * 4); }
  function myBookings(rid) { return bookings().filter(function (b) { return b.rid === rid; }); }
  function usedInMonth(rid, mk) {
    var n = myBookings(rid).filter(function (b) { return b.status === 'booked' && b.date.slice(0, 7) === mk; }).length;
    return n + (mk === MONTH ? seedUsed(rid) : 0);
  }
  function lounge(rid, perMonth, mk) {
    mk = mk || MONTH;
    var used = usedInMonth(rid, mk);
    return { month: mk, quota: perMonth, used: used, remaining: Math.max(0, perMonth - used), term: seedTerm(rid) + myBookings(rid).filter(function (b) { return b.status === 'booked'; }).length };
  }
  function seedHistory(rid) {
    var n = seedUsed(rid), out = [];
    for (var i = 0; i < n; i++) {
      var gp = (hash(rid + ':h' + i) % 2) === 0;
      out.push({ id: 'LH-' + rid + '-' + i, rid: rid, type: 'group', date: addDays(TODAY, -(2 + i * 4)), time: '19:30', status: 'done', teacher: (function(){ return (centerTeachers()[i % 3] || { name: '林俊傑' }).name; })(), tool: partner().videoTool, topic: '日常對話：自我介紹' });
    }
    return out;
  }

  /* 場次以台北時間排定；依使用者所在時區顯示（專案合作學生：亞利桑那 UTC-7） */
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
    var lg = lounge(user.rid, user.perMonth, session.date.slice(0, 7));
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

  /* 會員區各頁：側欄身分列帶入專案合作學生姓名 */
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

  /* ---------- 專案合作學生：會員區各頁改讀本人資料（無付費入口） ---------- */
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
  function videoLen(ui, k) { return 300 + ((ui * 41 + k * 37) % 150); }   /* 秒，5:00～7:29 */
  function mmss(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
  function fmtSize(n) { return n < 1024 ? n + ' B' : (n / 1024).toFixed(1) + ' KB'; }
  function lessonFiles(ui, k) {
    var U = UNITS[ui], nm = 'Unit' + (ui + 1) + '_Lesson' + k, q = lessonQuiz(ui, k);
    var notes = '\ufeff' + courseName() + '\r\n' + T('單元 ', 'Unit ') + (ui + 1) + '　' + T(U.zh, U.en) + '\r\n' + T('第 ', 'Lesson ') + k + T(' 課 學習重點', ' key points') + '\r\n\r\n' +
      q.map(function (x, i) { return (i + 1) + '. ' + x.key + '　=　' + x.ans.en + ' / ' + x.ans.zh; }).join('\r\n') + '\r\n';
    var vocab = csv([['Unit', 'Lesson', 'Phrase', 'English', '中文']].concat(q.map(function (x) { return [ui + 1, k, x.key, x.ans.en, x.ans.zh]; })));
    return [
      { name: nm + '_notes.txt', fmt: 'TXT', label: T('本課學習重點', 'Lesson key points'), text: notes, mime: 'text/plain;charset=utf-8' },
      { name: nm + '_vocabulary.csv', fmt: 'CSV', label: T('本課詞彙表', 'Vocabulary list'), text: vocab, mime: 'text/csv;charset=utf-8' }
    ].map(function (f) { f.size = fmtSize(new Blob([f.text]).size); return f; });
  }
  function lessonState(rid, key) { var a = jget(LS_KEY, {}); return (a[rid] && a[rid][key]) || {}; }
  function saveLessonState(rid, key, st) { var a = jget(LS_KEY, {}); if (!a[rid]) { a[rid] = {}; } a[rid][key] = st; jset(LS_KEY, a); }
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
  function pjBuild(kind, u) {
    var P = progress(u.rid), LG = lounge(u.rid, u.perMonth), h = '';
    if (kind === 'm08') {
      h += pjHead(T('自學課程', 'Self-paced Course'), T('依自己的步調觀看章節影音，追蹤各單元完成進度。', 'Study at your own pace and track progress by unit.'));
      h += '<div class="card"><div class="pj-top" style="cursor:default"><span>' + esc(courseName()) + '</span><span class="badge badge-info">' + esc(u.projectName.replace(/^.*．/, '')) + '</span></div>' +
        '<div class="progress" style="margin-top:12px"><div style="width:' + P.pct + '%"></div></div>' +
        '<div class="pj-kpis"><div><small>' + T('已完成課數', 'Lessons completed') + '</small><b>' + P.done + '／' + P.total + '</b></div><div><small>' + T('完成率', 'Completion') + '</small><b>' + P.pct + '%</b></div><div><small>' + T('累計學習時數', 'Study time') + '</small><b>' + P.hours + '</b> ' + T('小時', 'hrs') + '</div></div>' +
        (P.started ? '' : '<p class="small muted" style="margin:0 0 10px">' + T('尚未開始，從單元 1 開始。', 'Not started yet. Begin with Unit 1.') + '</p>') +
        '<button type="button" class="btn btn-primary btn-sm" data-pj="continue">' + (P.started ? T('繼續學習', 'Continue') : T('開始學習', 'Start')) + '</button> ' +
        '<a class="btn btn-outline btn-sm" href="m18_learning_dashboard.html">' + T('學習儀表板', 'Learning Dashboard') + '</a></div>';
      h += '<div class="section-title">' + T('各單元', 'Units') + '</div><div class="card" id="pjUnits">';
      var nextU = -1;
      P.units.forEach(function (x, i) { if (nextU < 0 && x.done < x.lessons) { nextU = i; } });
      if (u._openU != null) { nextU = u._openU; }
      P.units.forEach(function (x, i) {
        var st = x.pct >= 100 ? '<span class="badge badge-ok">' + T('已完成', 'Completed') + '</span>' : (x.done > 0 ? '<span class="badge badge-info">' + T('進行中', 'In progress') + '</span>' : '<span class="badge badge-muted">' + T('未開始', 'Not started') + '</span>');
        h += '<div class="pj-unit' + (i === nextU ? ' open' : '') + '" data-u="' + i + '"><div class="pj-top" data-pj="toggle"><span>' + T('單元 ', 'Unit ') + (i + 1) + '　' + esc(T(x.zh, x.en)) + '</span>' + st + '</div>' +
          '<div class="progress" style="margin-top:8px"><div style="width:' + x.pct + '%"></div></div><div class="pj-meta"><span>' + T('已完成 ', 'Done ') + x.done + '／' + x.lessons + T(' 課', ' lessons') + '</span><span>' + x.pct + '%</span></div><div class="pj-les">';
        for (var k = 1; k <= x.lessons; k++) {
          var dn = !!P.lessonsDone[(i + 1) + '-' + k];
          h += '<div class="pj-lesson" data-pj="lesson" data-n="' + (i + 1) + '-' + k + '"><span>' + T('第 ', 'Lesson ') + k + T(' 課', '') + '</span><span class="badge ' + (dn ? 'badge-ok' : 'badge-muted') + '">' + (dn ? T('已完成', 'Done') : T('未完成', 'To do')) + '</span></div>';
        }
        h += '</div></div>';
      });
      h += '</div>';
    } else if (kind === 'm02') {
      h += pjHead(T('預約 Mandarin Lounge', 'Book Mandarin Lounge'), T('每月可預約的口說練習場次，由 TLI 中心教師帶領。', 'Monthly speaking practice sessions led by TLI center teachers.'));
      h += '<div class="card"><div class="pj-row"><span>' + T('本月剩餘', 'Left this month') + '</span><b>' + LG.remaining + '／' + LG.quota + T(' 次', '') + '</b></div>' +
        '<div class="progress" style="margin:4px 0 12px"><div style="width:' + Math.round(LG.used / Math.max(1, LG.quota) * 100) + '%"></div></div>' +
        '<a class="btn btn-primary" href="m14_chat_booking.html">' + T('預約場次', 'Book a session') + '</a></div>';
      var up = pjUpcoming(u.rid);
      h += '<div class="section-title">' + T('即將開始的預約', 'Upcoming bookings') + '</div><div class="card">' + (up.length ? up.map(function (b) { return '<div class="pj-row"><span>' + esc(pjSessLine(b)) + '</span><b>' + pjTypeLbl(b.type) + '・' + esc(b.teacher) + T(' 老師', '') + '</b></div>'; }).join('') : '<p class="small muted" style="margin:0">' + T('目前沒有預約。', 'No bookings yet.') + '</p>') + '</div>';
    } else if (kind === 'm03') {
      h += pjHead(T('我的課表', 'My Schedule'), T('已預約的 Mandarin Lounge 場次，時間以亞利桑那時間顯示。', 'Your Mandarin Lounge sessions, shown in Arizona time.'));
      var ub = pjUpcoming(u.rid);
      h += '<div class="card">' + (ub.length ? ub.map(function (b) {
        return '<div class="pj-row"><div><b style="text-align:left;display:block">' + esc(pjSessLine(b)) + '</b><span class="small">' + pjTypeLbl(b.type) + '・' + esc(b.teacher) + T(' 老師・', ' · ') + esc(toolName(b.tool)) + '</span></div>' +
          '<a class="btn btn-outline btn-sm" href="m16_classroom.html?lesson=' + encodeURIComponent(b.id) + '&type=chat&state=before">' + T('進入教室', 'Enter') + '</a></div>';
      }).join('') : '<div class="empty-state"><h4>' + T('目前沒有預約的場次', 'No sessions booked') + '</h4><p style="margin-bottom:12px">' + T('到預約頁選一個時段。', 'Pick a time slot on the booking page.') + '</p><a class="btn btn-primary btn-sm" href="m14_chat_booking.html">' + T('預約場次', 'Book a session') + '</a></div>') + '</div>';
      var hs = seedHistory(u.rid).concat(myBookings(u.rid).filter(function (b) { return b.status === 'booked' && b.utc <= NOW_UTC; }));
      h += '<div class="section-title">' + T('已上過的場次', 'Past sessions') + '</div><div class="card">' + (hs.length ? hs.map(function (b) { return '<div class="pj-row"><span>' + mdLabel(b.date) + ' ' + b.time + '</span><b>' + pjTypeLbl(b.type) + '・' + esc(b.teacher) + T(' 老師', '') + '</b></div>'; }).join('') : '<p class="small muted" style="margin:0">' + T('還沒有上過的場次。', 'No past sessions yet.') + '</p>') + '</div>';
    } else if (kind === 'm04') {
      h += pjHead(T('我的專案', 'My Program'), T('學校為你的班級安排的學習內容。', 'What your school arranged for your class.'));
      h += '<div class="card"><div class="pj-row"><span>' + T('專案', 'Program') + '</span><b>' + esc(u.projectName) + '</b></div>' +
        '<div class="pj-row"><span>' + T('學校', 'School') + '</span><b>' + esc(u.partnerName) + '</b></div>' +
        '<div class="pj-row"><span>' + T('班級', 'Class') + '</span><b>' + esc(u.className) + '</b></div>' +
        '<div class="pj-row"><span>' + T('班級老師', 'Class teacher') + '</span><b>' + esc(u.teacherName) + T(' 老師', '') + '</b></div>' +
        '<div class="pj-row"><span>' + T('學習期間', 'Period') + '</span><b>' + u.from.slice(0, 10) + ' – ' + u.to.slice(0, 10) + '</b></div></div>';
      h += '<div class="section-title">' + T('包含內容', 'What is included') + '</div><div class="card">' +
        '<div class="pj-row"><span>' + T('自學課程', 'Self-paced course') + '</span><b>' + esc(courseName()) + '</b></div>' +
        '<div class="pj-row"><span>Mandarin Lounge</span><b>' + T('每月 ', '') + u.perMonth + T(' 次，團體場次', ' group sessions per month') + '</b></div>' +
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
    var titles = { m08: ['自學課程', 'Self-paced Course'], m02: ['預約 Mandarin Lounge', 'Book Mandarin Lounge'], m03: ['我的課表', 'My Schedule'], m04: ['我的專案', 'My Program'], m07: ['我的', 'Me'] };
    var V = null, vt = null;   /* V：目前開啟的課 {ui,k,key,ans,pct,playing,result}；vt：影片播放計時器 */
    function stopVid() { if (vt) { clearInterval(vt); vt = null; } if (V) { V.playing = false; } }
    function nextLesson(ui, k) { if (k < UNITS[ui].lessons) { return { ui: ui, k: k + 1 }; } return ui + 1 < UNITS.length ? { ui: ui + 1, k: 1 } : null; }
    function firstOpen() { var P = progress(u.rid); for (var i = 0; i < UNITS.length; i++) { for (var k = 1; k <= UNITS[i].lessons; k++) { if (!P.lessonsDone[(i + 1) + '-' + k]) { return { ui: i, k: k }; } } } return { ui: 0, k: 1 }; }
    function openLesson(ui, k) {
      stopVid(); var key = (ui + 1) + '-' + k, st = lessonState(u.rid, key), P = progress(u.rid);
      V = { ui: ui, k: k, key: key, ans: {}, pct: (st.watched || P.lessonsDone[key]) ? 100 : 0, playing: false, retake: false };
      draw(); window.scrollTo(0, 0);
    }
    function closeLesson() { stopVid(); if (V) { u._openU = V.ui; } V = null; draw(); window.scrollTo(0, 0); }
    /* 影片看完（拖到 95% 以上或播完）＋測驗達標才算完成本課，完成後寫入進度儲存 */
    function checkComplete() {
      var st = lessonState(u.rid, V.key);
      if (st.passed) { return false; }
      if (st.watched && st.score != null && st.score >= PASS_SCORE) {
        var d = new Date(); st.passed = true; st.minutes = Math.round(videoLen(V.ui, V.k) / 60) + 6; st.at = TODAY + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); st.hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
        saveLessonState(u.rid, V.key, st); return true;
      }
      return false;
    }
    function setWatched() { var st = lessonState(u.rid, V.key); if (!st.watched) { st.watched = true; saveLessonState(u.rid, V.key, st); } var done = checkComplete(); draw(); if (done) { pjToast(T('本課已完成', 'Lesson completed')); } }
    function vidUpdate() {
      var tot = videoLen(V.ui, V.k), sk = box.querySelector('#pjSeek'), tm = box.querySelector('#pjTime'), btn = box.querySelectorAll('[data-pj="play"]'), lb = box.querySelector('#pjVlabel');
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
        if (V.pct >= 100) { stopVid(); setWatched(); } else { vidUpdate(); }
      }, 250);
    }
    function lessonHtml() {
      var P = progress(u.rid), U = UNITS[V.ui], key = V.key, st = lessonState(u.rid, key), baseDone = !!P.lessonsDone[key] && !st.passed;
      var isDone = !!P.lessonsDone[key], watched = !!st.watched || baseDone, tot = videoLen(V.ui, V.k), q = lessonQuiz(V.ui, V.k), files = lessonFiles(V.ui, V.k), nx = nextLesson(V.ui, V.k);
      var title = T('單元 ', 'Unit ') + (V.ui + 1) + T(' 第 ', ' Lesson ') + V.k + T(' 課', '');
      var passedQ = st.score != null && st.score >= PASS_SCORE, h = '';
      h += '<div class="pj-bk"><button type="button" class="btn btn-outline btn-sm" data-pj="back" style="display:inline-flex;align-items:center;gap:6px">' + IC.back + T('返回課程', 'Back to course') + '</button></div>';
      h += '<div class="pj-ls-h"><div><h2>' + esc(title) + '</h2><small>' + esc(T(U.zh, U.en)) + '</small></div>' + (isDone ? '<span class="badge badge-ok">' + T('已完成', 'Completed') + '</span>' : '<span class="badge badge-muted">' + T('未完成', 'To do') + '</span>') + '</div>';
      h += '<div class="pj-conds"><span class="pj-cond' + (watched ? ' ok' : '') + '">' + (watched ? IC.ok : IC.circ) + T('看完教學影音', 'Watch the video') + '</span><span class="pj-cond' + (passedQ || baseDone ? ' ok' : '') + '">' + (passedQ || baseDone ? IC.ok : IC.circ) + T('單元測驗 ', 'Unit quiz ') + PASS_SCORE + T(' 分以上', '+ points') + '</span></div>';
      /* 影片 */
      h += '<div class="section-title">' + T('教學影音', 'Video lesson') + '</div><div class="card"><div class="pj-vid"><div class="pj-vscreen"><b>' + esc(T(U.zh, U.en)) + '</b><small>' + esc(title) + '</small>' +
        '<button type="button" class="pj-playbtn" data-pj="play" aria-label="' + T('播放', 'Play') + '">' + IC.play + '</button><small id="pjVlabel"></small></div>' +
        '<div class="pj-vbar"><button type="button" class="pj-vbtn" data-pj="play" aria-label="' + T('播放', 'Play') + '">' + IC.play + '</button><input type="range" id="pjSeek" min="0" max="100" value="' + V.pct + '" aria-label="' + T('播放進度', 'Seek') + '"><span id="pjTime"></span></div></div>' +
        '<p class="small muted" style="margin:10px 0 0">' + (watched ? T('已看完本課影音。', 'You have finished this video.') : T('播放到結尾，或拖曳進度條到結尾，即視為看完。', 'Play to the end, or drag the bar to the end, to mark it watched.')) + '</p></div>';
      /* 教材 */
      h += '<div class="section-title">' + T('教材下載', 'Materials') + '</div><div class="card">' + files.map(function (f, i) {
        return '<div class="pj-file">' + IC.file + '<div><b>' + esc(f.name) + '</b><small>' + esc(f.label) + '・' + f.fmt + '・' + f.size + '</small></div><button type="button" class="btn btn-outline btn-sm" data-pj="dl" data-f="' + i + '" style="display:inline-flex;align-items:center;gap:6px">' + IC.dl + T('下載', 'Download') + '</button></div>';
      }).join('') + '</div>';
      /* 測驗 */
      h += '<div class="section-title">' + T('單元測驗', 'Unit quiz') + '</div><div class="card">';
      var showRes = st.score != null && !V.retake;
      if (showRes) {
        var ra = st.answers || [], right = 0; q.forEach(function (x, i) { if (ra[i] === x.a) { right++; } });
        h += '<div class="pj-score"><b>' + st.score + '</b><span>' + T('分（答對 ', 'points (') + right + '／' + q.length + T(' 題）', ' of ' + q.length + ' correct)') + '</span><span class="badge ' + (passedQ ? 'badge-ok' : 'badge-warn') + '">' + (passedQ ? T('已達標', 'Passed') : T('未達標', 'Not passed')) + '</span></div>';
        h += '<p class="small muted" style="margin:0 0 6px">' + (passedQ ? T('測驗已達 ', 'You reached ') + PASS_SCORE + T(' 分。', ' points.') : T('需達 ', 'You need ') + PASS_SCORE + T(' 分才算完成，請重新作答。', ' points to complete this lesson. Please try again.')) + '</p>';
        q.forEach(function (x, i) {
          h += '<div class="pj-q"><p>' + (i + 1) + '. ' + esc(T(x.zh, x.en)) + '</p>' + x.opts.map(function (o, j) {
            var cls = j === x.a ? ' good' : (ra[i] === j ? ' bad' : '');
            return '<div class="pj-opt dis' + cls + '">' + esc(T(o.zh, o.en)) + (j === x.a ? '<span class="small" style="margin-left:auto">' + T('正確答案', 'Correct') + '</span>' : (ra[i] === j ? '<span class="small" style="margin-left:auto">' + T('你的答案', 'Your answer') + '</span>' : '')) + '</div>';
          }).join('') + '</div>';
        });
        if (!passedQ) { h += '<button type="button" class="btn btn-primary btn-sm" data-pj="retake">' + T('重新作答', 'Try again') + '</button>'; }
      } else {
        if (baseDone) { h += '<p class="small muted" style="margin:0 0 6px">' + T('本課已完成，可再練習。', 'This lesson is completed. You can practice again.') + '</p>'; }
        q.forEach(function (x, i) {
          h += '<div class="pj-q"><p>' + (i + 1) + '. ' + esc(T(x.zh, x.en)) + '</p>' + x.opts.map(function (o, j) {
            return '<label class="pj-opt' + (V.ans[i] === j ? ' sel' : '') + '"><input type="radio" name="pjq' + i + '" value="' + j + '"' + (V.ans[i] === j ? ' checked' : '') + '> ' + esc(T(o.zh, o.en)) + '</label>';
          }).join('') + '</div>';
        });
        h += '<button type="button" class="btn btn-primary" data-pj="submit">' + T('送出答案', 'Submit answers') + '</button>';
      }
      h += '</div>';
      /* 完成狀態與導覽 */
      h += '<div class="pj-st" style="margin-top:16px">' + (isDone ? IC.ok + '<span>' + T('本課已完成，進度已更新。', 'Lesson completed. Your progress is updated.') + '</span>' : '<span class="muted" style="font-weight:600;font-size:13.5px">' + T('尚未完成：', 'Not completed yet: ') + (watched ? '' : T('看完影片', 'finish the video')) + (!watched && !passedQ ? T('、', ', ') : '') + (passedQ ? '' : T('測驗達 ', 'score ') + PASS_SCORE + T(' 分', '+ on the quiz')) + '</span>') + '</div>';
      h += '<div class="pj-foot"><button type="button" class="btn btn-outline" data-pj="back">' + IC.back + T('返回課程', 'Back to course') + '</button>' +
        (nx ? '<button type="button" class="btn btn-primary" data-pj="nextlesson">' + T('下一課', 'Next lesson') + IC.next + '</button>' : '<button type="button" class="btn btn-primary" disabled>' + T('已是最後一課', 'Last lesson') + '</button>') + '</div>';
      return h;
    }
    function draw() {
      if (V) { stopVid(); box.innerHTML = lessonHtml(); vidUpdate(); }
      else { box.innerHTML = pjBuild(kind, u); }
      var tt = document.querySelector('.topbar-title'); if (tt) { tt.removeAttribute('data-i18n'); tt.removeAttribute('data-en'); tt.textContent = T(titles[kind][0], titles[kind][1]); }
    }
    draw();
    if (g.TLI_I18N && g.TLI_I18N.onRefresh) { g.TLI_I18N.onRefresh(draw); }
    box.addEventListener('input', function (e) { if (V && e.target && e.target.id === 'pjSeek') { V.pct = +e.target.value; if (V.pct >= 95 && V.pct < 100) { V.pct = 100; } if (V.pct >= 100) { stopVid(); setWatched(); } else { vidUpdate(); } } });
    box.addEventListener('change', function (e) { var t = e.target; if (V && t && t.type === 'radio') { V.ans[+t.name.replace('pjq', '')] = +t.value; box.querySelectorAll('input[name="' + t.name + '"]').forEach(function (r) { r.parentNode.classList.toggle('sel', r.checked); }); } });
    box.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-pj]') : null; if (!el) { return; }
      var a = el.getAttribute('data-pj');
      if (a === 'toggle') { el.parentNode.classList.toggle('open'); }
      else if (a === 'continue') { var f = firstOpen(); openLesson(f.ui, f.k); }
      else if (a === 'lesson') { var nn = el.getAttribute('data-n').split('-'); openLesson(+nn[0] - 1, +nn[1]); }
      else if (a === 'back') { closeLesson(); }
      else if (a === 'nextlesson') { var nl = nextLesson(V.ui, V.k); if (nl) { openLesson(nl.ui, nl.k); } }
      else if (a === 'play') { playToggle(); }
      else if (a === 'dl') { var fl = lessonFiles(V.ui, V.k)[+el.getAttribute('data-f')]; if (fl) { download(fl.name, fl.text, fl.mime); pjToast(T('已下載 ', 'Downloaded ') + fl.name); } }
      else if (a === 'retake') { V.retake = true; V.ans = {}; pjToastHide(); draw(); }
      else if (a === 'submit') {
        var qz = lessonQuiz(V.ui, V.k), n = 0, all = true, answers = [];
        qz.forEach(function (x, i) { if (V.ans[i] == null) { all = false; } else { answers.push(V.ans[i]); if (V.ans[i] === x.a) { n++; } } });
        if (!all) { pjToast(T('請回答所有題目', 'Please answer every question')); return; }
        var st = lessonState(u.rid, V.key); st.score = Math.round(n / qz.length * 100); st.answers = answers; saveLessonState(u.rid, V.key, st);
        V.retake = false; pjToastHide(); var dn = checkComplete(); draw(); window.scrollTo(0, box.querySelector('.pj-score') ? box.querySelector('.pj-score').getBoundingClientRect().top + window.pageYOffset - 80 : 0);
        if (dn) { pjToast(T('本課已完成', 'Lesson completed')); }
      }
      else if (a === 'save') { pjToast(T('已儲存', 'Saved')); }
      else if (a === 'logout') { setSS({}); location.href = '../公開網站/p01_home.html'; }
    });
  }
  function pjNav(u) {
    var map = { 'm02_booking.html': ['m14_chat_booking.html', 'Mandarin Lounge'], 'm03_schedule.html': [null, T('我的課表', 'My Schedule')], 'm04_course_detail.html': [null, T('我的專案', 'My Program')] };
    document.querySelectorAll('.side-nav a.side-link, .bottom-nav a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      /* 成績單、證書、我的（個人資料）屬一階段 B，1A 專案合作學生不顯示 */
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
    today: TODAY, month: MONTH, nowUtc: NOW_UTC, T: T, esc: esc, wd: wd, mdLabel: mdLabel, addDays: addDays, pad: pad, qs: qs, xl: xl,
    partner: partner, quotaCfg: quotaCfg, toolName: toolName, projectName: projectName, classes: classes, classById: classById, teacherById: teacherById, teacherRosters: teacherRosters, rosterById: rosterById,
    rosterByEmail: rosterByEmail, students: students, teacherOfClass: teacherOfClass, teacherForRoster: teacherForRoster, isExistingMember: isExistingMember,
    UNITS: UNITS, TOTAL_LESSONS: TOTAL_LESSONS, courseName: courseName, unitName: unitName,
    me: me, signInStudent: signInStudent, signInTeacher: signInTeacher, teacherMe: teacherMe, activate: activate, isFresh: isFresh,
    progress: progress, behind: behind, lounge: lounge, seedHistory: seedHistory, sessionsFor: sessionsFor, teacherSessions: teacherSessions, openSession: openSession, replaceOpened: replaceOpened, closeOpened: closeOpened, book: book, cancel: cancel, cancellable: cancellable,
    bookings: bookings, myBookings: myBookings, csv: csv, download: download
  };
})(window);
