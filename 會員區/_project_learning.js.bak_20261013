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
  var EXISTING_MEMBERS = ['m.lopez@students.sample-u.example']; /* 已是 TLI 會員的 Email（加綁分支用） */

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
    if (!general && (!r || r.status !== '已啟用')) { return { rid: rid, active: false, started: false, done: 0, total: TOTAL_LESSONS, pct: 0, minutes: 0, hours: '0.0', last: null, units: UNITS.map(function (u) { return { id: u.id, zh: u.zh, en: u.en, lessons: u.lessons, done: 0, pct: 0 }; }), recent: [] }; }
    var fresh = !general && isFresh(rid);
    var done = general ? 21 : (fresh ? 0 : Math.round(TOTAL_LESSONS * (0.15 + 0.75 * rnd(rid + ':p'))));
    var left = done;
    var units = UNITS.map(function (u) { var d = Math.min(u.lessons, left); left -= d; return { id: u.id, zh: u.zh, en: u.en, lessons: u.lessons, done: d, pct: Math.round(d / u.lessons * 100) }; });
    var minutes = done === 0 ? 0 : done * 13 + Math.round(rnd(rid + ':m') * 45);
    var lastGap = general ? 1 : Math.floor(rnd(rid + ':d') * 12);
    var last = done === 0 ? null : { date: addDays(TODAY, -lastGap), time: pad(8 + Math.floor(rnd(rid + ':t') * 14)) + ':' + pad(Math.floor(rnd(rid + ':t2') * 6) * 10) };
    var recent = [];
    var idx = done, gap = lastGap;
    while (recent.length < 5 && idx > 0) {
      var acc = 0, ui = 0; for (ui = 0; ui < UNITS.length; ui++) { if (idx <= acc + UNITS[ui].lessons) { break; } acc += UNITS[ui].lessons; }
      recent.push({ date: addDays(TODAY, -gap), unitId: UNITS[ui].id, zh: UNITS[ui].zh, en: UNITS[ui].en, lesson: idx - acc, minutes: 9 + Math.floor(rnd(rid + ':r' + idx) * 10) });
      idx--; gap += 1 + Math.floor(rnd(rid + ':g' + idx) * 3);
    }
    return { rid: rid, active: true, started: done > 0, done: done, total: TOTAL_LESSONS, pct: Math.round(done / TOTAL_LESSONS * 100), minutes: minutes, hours: (minutes / 60).toFixed(1), last: last, lastGap: lastGap, units: units, recent: recent };
  }
  function behind(p) { return p.active && p.started && (p.pct < 25 || p.lastGap >= 7); }

  /* ---------- Mandarin Lounge 場次與預約 ---------- */
  function bookings() { return jget(BK_KEY, []).map(function (b) { b.type = 'group'; return b; }); }
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
    '.pj-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#101828;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:300}';
  function pjToast(msg) {
    var t = document.getElementById('pjToast');
    if (!t) { t = document.createElement('div'); t.id = 'pjToast'; t.className = 'pj-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.style.display = 'block'; clearTimeout(g._pjTt); g._pjTt = setTimeout(function () { t.style.display = 'none'; }, 2200);
  }
  function pjSessLine(b) { return mdLabel(b.date) + ' ' + wd(b.date) + ' ' + b.time + T('（亞利桑那時間）', ' (Arizona time)'); }
  function pjTypeLbl(t) { return T('團體場次', 'Group session'); }
  function pjUpcoming(rid) { return myBookings(rid).filter(function (b) { return b.status === 'booked' && b.utc > NOW_UTC; }).sort(function (a, b) { return a.utc - b.utc; }); }
  function pjHead(title, sub) { return '<p class="page-h">' + esc(title) + '</p><p class="page-sub">' + esc(sub) + '</p>'; }
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
      P.units.forEach(function (x, i) {
        var st = x.pct >= 100 ? '<span class="badge badge-ok">' + T('已完成', 'Completed') + '</span>' : (x.done > 0 ? '<span class="badge badge-info">' + T('進行中', 'In progress') + '</span>' : '<span class="badge badge-muted">' + T('未開始', 'Not started') + '</span>');
        h += '<div class="pj-unit' + (i === nextU ? ' open' : '') + '" data-u="' + i + '"><div class="pj-top" data-pj="toggle"><span>' + T('單元 ', 'Unit ') + (i + 1) + '　' + esc(T(x.zh, x.en)) + '</span>' + st + '</div>' +
          '<div class="progress" style="margin-top:8px"><div style="width:' + x.pct + '%"></div></div><div class="pj-meta"><span>' + T('已完成 ', 'Done ') + x.done + '／' + x.lessons + T(' 課', ' lessons') + '</span><span>' + x.pct + '%</span></div><div class="pj-les">';
        for (var k = 1; k <= x.lessons; k++) {
          var dn = k <= x.done;
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
        '<div class="pj-row"><span>' + T('結業證書', 'Certificate') + '</span><b>' + T('完成課程後核發', 'Issued on completion') + '</b></div>' +
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
    function draw() {
      box.innerHTML = pjBuild(kind, u);
      var tt = document.querySelector('.topbar-title'); if (tt) { tt.removeAttribute('data-i18n'); tt.removeAttribute('data-en'); tt.textContent = T(titles[kind][0], titles[kind][1]); }
    }
    draw();
    if (g.TLI_I18N && g.TLI_I18N.onRefresh) { g.TLI_I18N.onRefresh(draw); }
    box.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-pj]') : null; if (!el) { return; }
      var a = el.getAttribute('data-pj');
      if (a === 'toggle') { el.parentNode.classList.toggle('open'); }
      else if (a === 'continue') { var un = box.querySelector('.pj-unit:not(.open)'); box.querySelectorAll('.pj-unit').forEach(function (x) { x.classList.remove('open'); }); var P = progress(u.rid), i = 0; P.units.some(function (x, k) { i = k; return x.done < x.lessons; }); var tgt = box.querySelector('.pj-unit[data-u="' + i + '"]'); if (tgt) { tgt.classList.add('open'); tgt.scrollIntoView({ behavior: 'smooth', block: 'center' }); } pjToast(T('已定位到下一個要學的單元', 'Jumped to your next unit')); }
      else if (a === 'lesson') { pjToast(T('開啟單元 ', 'Opening unit ') + el.getAttribute('data-n').replace('-', T(' 第 ', ' lesson ')) + T(' 課', '')); }
      else if (a === 'save') { pjToast(T('已儲存', 'Saved')); }
      else if (a === 'logout') { setSS({}); location.href = '../公開網站/p01_home.html'; }
    });
  }
  function pjNav(u) {
    var map = { 'm02_booking.html': ['m14_chat_booking.html', 'Mandarin Lounge'], 'm03_schedule.html': [null, T('我的課表', 'My Schedule')], 'm04_course_detail.html': [null, T('我的專案', 'My Program')] };
    document.querySelectorAll('.side-nav a.side-link, .bottom-nav a').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      if (/m06_renew|m13_checkout/.test(href)) { a.style.display = 'none'; return; }
      Object.keys(map).forEach(function (k) {
        if (href.indexOf(k) < 0) { return; }
        var sp = a.querySelector('span'); if (sp) { sp.removeAttribute('data-i18n'); sp.removeAttribute('data-en'); sp.textContent = k === 'm02_booking.html' ? 'Mandarin Lounge' : map[k][1]; }
        if (map[k][0]) { a.setAttribute('href', map[k][0]); }
      });
    });
  }
  function projectMember() {
    var u = me(); if (u.mode !== 'project') { return; }
    pjNav(u);
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
