/* 教師端（班級老師）共用：身分、學生列、個人自學歷程抽屜、匯出。資料一律來自主檔＋會員區 _project_learning.js */
(function(g){
  var PL = g.TLI_PL, T = PL.T, ME = PL.teacherMe();
  function $(i){ return document.getElementById(i); }
  function toast(m){ var t=$('toast'); if(!t) return; t.textContent=m; t.classList.remove('hidden'); clearTimeout(g._tt); g._tt=setTimeout(function(){ t.classList.add('hidden'); },2400); }
  function quota(){ return PL.quotaCfg().perMonth; }
  function classStatus(c){ return PL.today < c.from ? 'pending' : (PL.today > c.to ? 'done' : 'ongoing'); }
  function statusLbl(s){ return s==='ongoing' ? T('上課中','Ongoing') : (s==='pending' ? T('尚未開課','Not started') : T('已結束','Ended')); }
  function myClasses(){ return ME.classes; }
  function rows(classIds){
    var out = [];
    PL.students().forEach(function(r){
      if(classIds.indexOf(r.classId)<0) return;
      var p = PL.progress(r.id), lg = PL.lounge(r.id, quota());
      var flag = r.status!=='已啟用' ? 'inactive' : (PL.behind(p) ? 'behind' : '');
      out.push({r:r, cls:PL.classById(r.classId), p:p, lg:lg, flag:flag});
    });
    return out;
  }
  function stLbl(s){ return s==='已啟用' ? T('已開通','Active') : (s==='已寄開通信' ? T('已寄開通信','Invite sent') : T('未寄送','Not sent')); }
  function stBadge(s){ return s==='已啟用' ? 'badge-ok' : (s==='已寄開通信' ? 'badge-info' : 'badge-muted'); }
  function lastTxt(p){ return p.last ? PL.mdLabel(p.last.date)+' '+p.last.time : '－'; }
  function flagBadge(f){ return f==='behind' ? '<span class="badge badge-warn">'+T('需關心','Needs follow-up')+'</span>' : (f==='inactive' ? '<span class="badge badge-muted">'+T('尚未開通','Not activated')+'</span>' : ''); }
  function bar(p){ return '<div class="skill-bar-track"><div class="skill-bar-fill'+(p<25?' warn':'')+'" style="width:'+p+'%"></div></div>'; }

  /* 個人自學歷程抽屜 */
  function openStudent(rid){
    var r = PL.rosterById(rid), c = PL.classById(r.classId), p = PL.progress(rid), lg = PL.lounge(rid, quota());
    var hist = PL.seedHistory(rid).concat(PL.myBookings(rid).filter(function(b){ return b.status==='booked'; }));
    var h = '<div class="flex-between" style="align-items:flex-start;"><div><h3 style="margin:0;font-size:17px;">'+PL.esc(r.name)+'</h3><div class="small muted">'+PL.esc(r.email)+'</div><div class="small muted">'+PL.esc(c.name)+'</div></div><span class="badge '+stBadge(r.status)+'">'+stLbl(r.status)+'</span></div>'+
      '<div class="kgrid"><div><span>'+T('完成率','Completion')+'</span><b>'+p.pct+'%</b></div><div><span>'+T('自學時數','Study hrs')+'</span><b>'+p.hours+'</b></div><div><span>'+T('最後學習','Last study')+'</span><b>'+lastTxt(p)+'</b></div><div><span>'+T('Lounge 本月','Lounge this month')+'</span><b>'+lg.used+'／'+lg.quota+'</b></div></div>'+
      '<h4 class="dh">'+T('各單元進度','Progress by unit')+'</h4>'+
      p.units.map(function(u,i){ return '<div class="urow"><span>'+(i+1)+' '+PL.esc(T(u.zh,u.en))+'</span><span class="small muted">'+u.done+'／'+u.lessons+'</span></div>'+bar(u.pct); }).join('')+
      '<h4 class="dh">'+T('最近學習','Recent activity')+'</h4>'+
      (p.recent.length ? p.recent.map(function(x){ return '<div class="recent-row"><span class="rr-date">'+PL.mdLabel(x.date)+'</span><span class="rr-unit">'+PL.esc(T(x.zh,x.en))+T(' 第 ',' L')+x.lesson+T(' 課','')+'</span><span class="rr-attend">'+x.minutes+T(' 分鐘',' min')+'</span></div>'; }).join('') : '<div class="small muted">'+T('尚無學習紀錄。','No study activity yet.')+'</div>')+
      '<h4 class="dh">Mandarin Lounge（'+T('累計 ','total ')+lg.term+T(' 場',' sessions')+'）</h4>'+
      (hist.length ? hist.map(function(b){ return '<div class="recent-row"><span class="rr-date">'+PL.mdLabel(b.date)+'</span><span class="rr-unit">'+(b.type==='group'?T('團體','Group'):T('一對一','1-on-1'))+'・'+PL.esc(b.teacher)+'</span><span class="rr-attend">'+(b.status==='done'?T('已完成','Done'):T('已預約','Booked'))+'</span></div>'; }).join('') : '<div class="small muted">'+T('本月尚未使用。','Not used this month.')+'</div>')+
      '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;"><button class="btn btn-primary btn-sm" id="dwCsv">'+T('匯出個人報告','Export student report')+'</button><button class="btn btn-outline btn-sm" id="dwClose">'+T('關閉','Close')+'</button></div>';
    $('drawerBody').innerHTML = h; $('drawerOv').classList.remove('hidden');
    $('dwClose').onclick = closeDrawer;
    $('dwCsv').onclick = function(){
      var rr = [[T('學生自學報告','Student learning report')],[T('姓名','Name'),r.name],['Email',r.email],[T('班級','Class'),c.name],[T('完成率','Completion'),p.pct+'%'],[T('自學時數','Study hours'),p.hours],[T('最後學習','Last study'),lastTxt(p)],[T('Lounge 本月','Lounge this month'),lg.used+'/'+lg.quota],[],[T('單元','Unit'),T('已完成','Done'),T('課數','Lessons'),T('完成率','Rate')]];
      p.units.forEach(function(u,i){ rr.push([(i+1)+' '+T(u.zh,u.en),u.done,u.lessons,u.pct+'%']); });
      PL.download('student_'+r.name.replace(/\s+/g,'_')+'_'+PL.today+'.csv', PL.csv(rr)); toast(T('個人報告已下載','Report downloaded'));
    };
  }
  function closeDrawer(){ $('drawerOv').classList.add('hidden'); }
  function exportRows(list, name){
    var rr = [[T('班級','Class'),T('姓名','Name'),'Email',T('帳號狀態','Account'),T('完成率','Completion'),T('已完成課數','Lessons done'),T('自學時數','Study hours'),T('最後學習','Last study'),T('Lounge 本月已用','Lounge used'),T('Lounge 額度','Quota'),T('Lounge 累計','Lounge total')]];
    list.forEach(function(x){ rr.push([x.cls.name,x.r.name,x.r.email,stLbl(x.r.status),x.p.pct+'%',x.p.done+'/'+x.p.total,x.p.hours,lastTxt(x.p),x.lg.used,x.lg.quota,x.lg.term]); });
    PL.download(name+'_'+PL.today+'.csv', PL.csv(rr)); toast(T('報告已下載','Report downloaded'));
  }
  function sortRows(a, key){
    var k = {name:function(x,y){ return x.r.name.localeCompare(y.r.name); }, pct:function(x,y){ return y.p.pct-x.p.pct; }, pctAsc:function(x,y){ return x.p.pct-y.p.pct; }, hours:function(x,y){ return y.p.minutes-x.p.minutes; }, last:function(x,y){ return (y.p.last?y.p.last.date:'')<(x.p.last?x.p.last.date:'') ? -1 : 1; }, lounge:function(x,y){ return y.lg.used-x.lg.used; }};
    return a.sort(k[key]||k.name);
  }
  /* 學生列（t08 / t10 共用）：點整列開抽屜 */
  function rowHtml(x, showClass){
    return '<div class="srow" onclick="TC.openStudent(\''+x.r.id+'\')"><div class="s-name"><b>'+PL.esc(x.r.name)+'</b> '+flagBadge(x.flag)+'<div class="small muted">'+(showClass?PL.esc(x.cls.name)+'・':'')+PL.esc(x.r.email)+'</div></div>'+
      '<div class="s-st"><span class="badge '+stBadge(x.r.status)+'">'+stLbl(x.r.status)+'</span></div>'+
      '<div class="s-pct"><span class="lab">'+T('完成率','Completion')+'</span><b>'+x.p.pct+'%</b>'+bar(x.p.pct)+'</div>'+
      '<div class="s-hrs"><span class="lab">'+T('自學時數','Study hrs')+'</span><b>'+x.p.hours+'</b></div>'+
      '<div class="s-last"><span class="lab">'+T('最後學習','Last study')+'</span><b>'+lastTxt(x.p)+'</b></div>'+
      '<div class="s-lg"><span class="lab">Lounge</span><b>'+x.lg.used+'／'+x.lg.quota+'</b></div></div>';
  }
  function init(){
    var sr = document.querySelector('.side-role'); if(sr){ sr.innerHTML = '<strong>'+PL.esc(ME.name)+T(' 老師',' (Teacher)')+'</strong><span>'+T('班級老師','Class Teacher')+'｜'+PL.esc(PL.partner().name)+'</span>'; }
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeDrawer(); });
    document.addEventListener('click', function(e){ if(!e.target.closest('.bell-btn')&&!e.target.closest('.bell-panel')){ var b=$('bellPanel'); if(b) b.classList.remove('open'); } });
  }
  g.toggleBell = function(){ $('bellPanel').classList.toggle('open'); };
  g.TC = { ME:ME, PL:PL, T:T, $:$, toast:toast, quota:quota, classStatus:classStatus, statusLbl:statusLbl, myClasses:myClasses, rows:rows, stLbl:stLbl, stBadge:stBadge, lastTxt:lastTxt, flagBadge:flagBadge, bar:bar, openStudent:openStudent, closeDrawer:closeDrawer, exportRows:exportRows, sortRows:sortRows, rowHtml:rowHtml, init:init };
})(window);
