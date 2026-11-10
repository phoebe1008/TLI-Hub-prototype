/* ============================================================================
   自學課程 新增／編輯頁（a02_products.html 的「課程」頁籤）
   依據：客戶 Connect 2.0「4.4-自學課程編輯原型.html」與 規格書 4.4（SS-C*、SS-S*、§2-5 教材資源）、4.1、4.2、4.9
   2026-11-08 使用者指示「課程的新增可以參考客戶提供的自學課程編輯原型」。
   做的：頁首固定操作列（狀態／儲存狀態／前台預覽／儲存草稿／檢核並發佈）、整頁一組資料語系分頁（繁中、English★）＋對照語系＋翻譯完成度、
         基本資訊（名稱、代碼、描述、分級＋說明、內容標籤、桌機／手機封面）、語言支援摘要（唯讀）、引用中的 Package（唯讀）、
         老師（挑選、本課程介紹、顯示開關、排序、移除）、四層內容結構（章／節／項目、1 項目＝1 素材、試聽開關、類型彙總、排序、移除警示）、
         教材資源（掛載 4.8 教材／從素材庫取用，不計完課）、發佈檢核、異動紀錄、離開前未儲存提醒。
   沒做的（資料不足，不自行補）：
     - 內容標籤篩選：資源庫示範資料沒有帶標籤（只有 a18 內部有），選素材時只能依類型與名稱找；「新增」分頁新增的素材會帶標籤。
     - 影音時長：示範資料沒有時長 → 含影片／音頻時一律標示「總時長尚不完整」，不當作 0。
     - 分級說明內容：客戶的分級與 CEFR／TOCFL 對照文件不在資料包 → 說明視窗只標示待提供。
     - 儲存衝突、歷史快照、複製、前台預覽（只示意）。
   資料只存在頁面記憶體（SS_PRODUCTS），重新整理即還原。
   20261110：資料語系改為官網五種（繁中／簡中／English★／日本語／Deutsch）；畫面上的規格編號、開發說明與示範註解已移除（只留程式註解）。
   ============================================================================ */
(function(){ var st = document.createElement('style'); st.textContent = '#pageBody .pickrow input[type=text]{width:100%}' +
  /* 語系頁籤：與 a25 教材管理相同樣式（使用者 2026-11-10 要求） */
  '.loctabs{display:flex;gap:2px;border-bottom:1px solid var(--g200);margin-bottom:10px;flex-wrap:wrap}' +
  '.loctabs button{background:none;border:1px solid transparent;border-bottom:0;padding:8px 14px;font-size:13px;color:var(--g500);cursor:pointer;border-radius:6px 6px 0 0;font-family:inherit}' +
  '.loctabs button.on{background:#fff;border-color:var(--g200);color:var(--g900);font-weight:600;margin-bottom:-1px}'; document.head.appendChild(st); })();
/* 錨點：目標位置＝區塊頂端 − 浮動區塊底緣（top 107px＋本身高度）− 12px 間距；捲動時標示目前所在區塊 */
(function(){ var st = document.createElement('style'); st.textContent =
  '.sse-anchors{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;padding-top:8px;border-top:1px solid var(--g200);font-size:13px}' +
  '.sse-anchors a{color:var(--g500);text-decoration:none;padding-bottom:2px;border-bottom:2px solid transparent}' +
  '.sse-anchors a:hover{color:var(--navy)}.sse-anchors a.on{color:var(--navy);font-weight:600;border-bottom-color:var(--navy)}';
  document.head.appendChild(st); })();
function sseStickyOffset(){ var s = document.getElementById('sse_sticky'); return s ? 107 + s.offsetHeight + 12 : 120; }
function sseGo(id){
  var el = document.getElementById(id); if (!el) return;
  window.scrollTo({top: Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - sseStickyOffset()), behavior:'smooth'});
  sseSetActive(id);
  window._sseLock = id; clearTimeout(window._sseLockT); window._sseLockT = setTimeout(function(){ window._sseLock = null; }, 900);   // 平滑捲動期間維持點選的錨點
}
function sseSetActive(id){ document.querySelectorAll('.sse-anchors a').forEach(function(a){ a.classList.toggle('on', a.getAttribute('data-anchor') === id); }); }
function sseSpy(){
  var links = document.querySelectorAll('.sse-anchors a'); if (!links.length) return;
  if (window._sseLock){ sseSetActive(window._sseLock); return; }
  var off = sseStickyOffset() + 4, cur = links[0].getAttribute('data-anchor');
  links.forEach(function(a){ var el = document.getElementById(a.getAttribute('data-anchor')); if (el && el.getBoundingClientRect().top <= off) cur = a.getAttribute('data-anchor'); });
  /* 捲到頁底時，最後一個區塊可能到不了浮動區塊下方，改標最後一個 */
  if (window.innerHeight + window.pageYOffset >= document.documentElement.scrollHeight - 2) cur = links[links.length-1].getAttribute('data-anchor');
  sseSetActive(cur);
}
window.addEventListener('scroll', function(){ if (window.SSE && document.getElementById('sse_sticky')) sseSpy(); }, {passive:true});
function sseLocTabBtn(t, onclick){ return '<button type="button" class="'+(SSE.locale===t[0]?'on':'')+'" onclick="'+onclick+'">'+t[2]+(t[4] ? ' <span title="'+T('回退語系','Fallback locale')+'" style="color:var(--navy);font-size:12px">★</span>' : '')+'</button>'; }
var SSE = null;          // 目前編輯中的自學課程
var SSE_P = null;        // 素材挑選器狀態
var SSE_TEACH = null;    // 老師彈窗狀態
var SSE_AUDIT_ALL = false;
/* 資料語系：同官網五種（使用者 2026-11-10 要求）；English 為回退語系★（前台缺內容時改顯示英文） */
var SSE_LOC = [['zh','TW','繁體中文','Traditional Chinese',''], ['cn','CN','简体中文','Simplified Chinese',''], ['en','US','English','English',' ★'], ['ja','JP','日本語','Japanese',''], ['de','DE','Deutsch','German','']];
var SSE_LKEYS = SSE_LOC.map(function(t){ return t[0]; });
function sseML(){ var o = {}; SSE_LKEYS.forEach(function(k){ o[k] = ''; }); return o; }
function sseV(obj, l){ return (obj && obj[l]) || ''; }

function sseUid(p){ return p + Date.now().toString(36) + Math.floor(Math.random()*1e4).toString(36); }
function sseLocName(l){ var t = SSE_LOC.filter(function(x){ return x[0] === l; })[0]; return t ? T(t[2], t[3]) : l; }
function sseTxt(html){ return String(html||'').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').trim(); }
function sseLibs(){ return TLI_MASTERS.resourceLibraries; }
function sseLib(key){ return sseLibs().find(function(l){ return l.key === key; }); }
function sseAsset(libKey, assetId){
  var lib = sseLib(libKey); if (!lib) return null;
  var n = parseInt(String(assetId).slice(lib.prefix.length), 10);
  return (lib.items[n] != null) ? {id:assetId, name:lib.items[n], lib:lib, tags:(lib.tags||{})[assetId]||[]} : null;
}
function sseTypeLabel(libKey){ var l = sseLib(libKey); return l ? l.label.replace('庫','') : ''; }
function sseIsAV(libKey){ return libKey === 'videos' || libKey === 'audio'; }

/* ---------- 開啟 ---------- */
function sseBlank(){
  return { id:null, code:'', subId:(typeof COURSE_SUB!=='undefined' ? COURSE_SUB : ''), locale:'zh', name:sseML(), desc:sseML(), level:'', tags:[], cover:{d:null,m:null},
    teachers:[], chapters:[], resources:[], status:'草稿', hasDraft:false, dirty:false, savedAt:null, audit:[] };
}
function ssEdOpen(id){
  var p = id ? ssFind(id) : null;
  if (!p){ SSE = sseBlank(); }
  else if (p.sse){ SSE = JSON.parse(JSON.stringify(p.sse)); SSE.locale = 'zh'; SSE.dirty = false; SSE.subId = p.subId || SSE.subId || 'c_selfpace'; }
  else {
    SSE = sseBlank(); SSE.id = p.id; SSE.code = p.code; SSE.name = {zh:p.zh||'', en:p.en||''}; SSE.level = p.level || ''; SSE.subId = p.subId || 'c_selfpace';
    SSE.status = p.status; SSE.hasDraft = !!p.draft; SSE.savedAt = p.at; SSE.legacy = {ch:p.ch, sec:p.sec, items:p.items, min:p.min, unk:p.unk};
    SSE.audit = [{at:p.at, actor:p.actor||'', act:p.act || (p.status==='封存'?'封存':p.status==='已發佈'?'發佈':'儲存草稿')}];
  }
  SSE_AUDIT_ALL = false;
  curView = 'ssEdit'; closeSsMenu(); renderAll(); window.scrollTo(0,0);
}
function sseDirty(){ SSE.dirty = true; var el = document.getElementById('sse_savestate'); if (el) el.innerHTML = sseSaveStateHtml(); }
function sseSaveStateHtml(){
  if (SSE.dirty) return '<span class="badge orange">'+T('有未儲存變更','Unsaved changes')+'</span>';
  return '<span class="badge green">'+(SSE.savedAt ? T('已儲存（'+ssFmtTime(SSE.savedAt)+'）','Saved ('+ssFmtTime(SSE.savedAt)+')') : T('尚未儲存','Not saved yet'))+'</span>';
}

/* ---------- 離開／返回 ---------- */
function sseBack(){
  if (!SSE.dirty){ sseLeave(); return; }
  document.getElementById('ssModalBody').innerHTML = '<h3>'+T('尚有未儲存變更','You have unsaved changes')+'</h3><p>'+T('離開前要儲存目前內容嗎？','Save the current content before leaving?')+'</p>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn ghost" onclick="closeModalId(\'ssModal\')">'+T('留在本頁','Stay')+'</button>' +
    '<button class="btn ghost" onclick="closeModalId(\'ssModal\');sseLeave()">'+T('捨棄並離開','Discard and leave')+'</button>' +
    '<button class="btn" onclick="closeModalId(\'ssModal\');if(sseSaveDraft(true))sseLeave()">'+T('儲存並離開','Save and leave')+'</button></div>';
  document.getElementById('ssModal').classList.add('open');
}
function sseLeave(){ SSE = null; curView = 'list'; renderAll(); }

/* ---------- 儲存／發佈 ---------- */
function sseCounts(){
  var ch = SSE.chapters.length, sec = 0, it = 0, av = false;
  SSE.chapters.forEach(function(c){ sec += c.sections.length; c.sections.forEach(function(s){ it += s.items.length; s.items.forEach(function(x){ if (sseIsAV(x.libKey)) av = true; }); }); });
  return {ch:ch, sec:sec, items:it, av:av};
}
function sseNextCode(){
  var max = 0; SS_PRODUCTS.forEach(function(p){ var m = /^SS-(\d{4})$/.exec(p.code||''); if (m) max = Math.max(max, +m[1]); });
  return 'SS-' + String(max + 1).padStart(4, '0');
}
function sseSaveDraft(silent){
  if (!SSE_LKEYS.some(function(l){ return sseV(SSE.name,l).trim(); })){ showToast(T('請先輸入產品名稱（任一資料語系）','Enter a product name first (any data language)')); return false; }
  sseWrite('儲存草稿');
  if (!silent) showToast(T('已儲存草稿','Draft saved'));
  renderAll();
  return true;
}
function sseWrite(act){
  var c = sseCounts(), now = new Date().toISOString(), p = SSE.id ? ssFind(SSE.id) : null;
  if (!SSE.code) SSE.code = sseNextCode();
  if (act === '發佈'){ SSE.status = '已發佈'; SSE.hasDraft = false; }
  else if (SSE.status === '已發佈'){ SSE.hasDraft = true; }
  SSE.dirty = false; SSE.savedAt = now;
  SSE.audit.unshift({at:now, actor:'王大明', act:act});
  var legacy = SSE.legacy && !c.items;      // 既有示意列沒有內容樹時，保留原本的內容摘要，不覆寫成 0
  var rec = p || {id:'ss'+Date.now()};
  rec.code = SSE.code; rec.subId = SSE.subId; rec.zh = (SSE.status==='已發佈' && SSE.hasDraft && p) ? p.zh : SSE.name.zh; rec.en = (SSE.status==='已發佈' && SSE.hasDraft && p) ? p.en : SSE.name.en;
  rec.draft = SSE.hasDraft ? {zh:SSE.name.zh, en:SSE.name.en} : null; rec.level = SSE.level; rec.status = SSE.status;
  if (!legacy){ rec.ch = c.ch; rec.sec = c.sec; rec.items = c.items; rec.min = 0; rec.unk = c.av; }
  rec.actor = '王大明'; rec.at = now; rec.act = act; rec.sse = JSON.parse(JSON.stringify(SSE));
  if (!p){ SS_PRODUCTS.unshift(rec); SSE.id = rec.id; }
}
function sseValidate(){
  var errs = [];
  if (!SSE.subId) errs.push({msg:T('子分類未選','Sub-category is not selected'), jump:'sse_subId'});
  if (!SSE.name.en.trim()) errs.push({msg:T('產品名稱（English）未填','Product name (English) is empty'), jump:'sse_name'});
  if (!SSE.level) errs.push({msg:T('分級未選','Level is not selected'), jump:'sse_level'});
  if (!SSE.chapters.length) errs.push({msg:T('至少需要一章','At least one chapter is required'), jump:'sse_structure'});
  SSE.chapters.forEach(function(c, ci){
    var cn = T('第 '+(ci+1)+' 章','Chapter '+(ci+1));
    if (!c.title.en.trim()) errs.push({msg:cn+T('：標題（English）未填',': title (English) is empty'), jump:'ch_'+c.id});
    if (!c.sections.length) errs.push({msg:cn+T('：至少需要一節',': needs at least one section'), jump:'ch_'+c.id});
    c.sections.forEach(function(s, si){
      var sn = cn+' '+(ci+1)+'-'+(si+1);
      if (!s.title.en.trim()) errs.push({msg:sn+T('：節標題（English）未填',': section title (English) is empty'), jump:'sec_'+s.id});
      if (!s.items.length) errs.push({msg:sn+T('：至少需要一個項目',': needs at least one item'), jump:'sec_'+s.id});
      s.items.forEach(function(x, xi){ if (!x.title.en.trim()) errs.push({msg:sn+' '+T('項目 ','item ')+(xi+1)+T('：標題（English）未填',': title (English) is empty'), jump:'it_'+x.id}); });
    });
  });
  return errs;
}
function sseJump(id){ closeModalId('ssModal'); var el = document.getElementById(id); if (el){ el.scrollIntoView({block:'center'}); if (el.focus) el.focus(); } }
function ssePublish(){
  var errs = sseValidate();
  var body = document.getElementById('ssModalBody');
  if (errs.length){
    body.innerHTML = '<h3>'+T('產品發佈檢核','Publish check')+'</h3><p style="color:#B91C1C"><b>'+T('以下項目未通過，產品維持目前狀態、已輸入內容保留：','These items failed. The product keeps its current status and your input is kept:')+'</b></p>' +
      '<ul style="margin:6px 0 0 18px">'+errs.map(function(e){ return '<li>'+escHtml(e.msg)+' <a href="javascript:void(0)" onclick="sseJump(\''+e.jump+'\')" style="color:var(--navy)">'+T('前往','Go')+'</a></li>'; }).join('')+'</ul>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn" onclick="closeModalId(\'ssModal\')">'+T('關閉','Close')+'</button></div>';
  } else {
    body.innerHTML = '<h3>'+T('產品發佈檢核','Publish check')+'</h3><p>'+T('檢核通過。發佈後，銷售方案即可選用這門課程；是否上架販售仍由銷售方案設定。','Check passed. After publishing, sales plans can include this course; whether it is on sale is still set in Sales Plans.')+'</p>' +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px"><button class="btn ghost" onclick="closeModalId(\'ssModal\')">'+T('取消','Cancel')+'</button><button class="btn" onclick="closeModalId(\'ssModal\');sseDoPublish()">'+T('確認發佈','Confirm publish')+'</button></div>';
  }
  document.getElementById('ssModal').classList.add('open');
}
function sseDoPublish(){ sseWrite('發佈'); showToast(T('已發佈','Published')); renderAll(); }

/* ---------- 語系 ---------- */
function sseSwitchLocale(l){ SSE.locale = l; renderAll(); }
function sseFieldCounts(){
  var out = {}; SSE_LKEYS.forEach(function(l){ out[l] = {f:0,t:0}; });
  function add(obj, isHtml){ SSE_LKEYS.forEach(function(l){ out[l].t++; if ((isHtml ? sseTxt(sseV(obj,l)) : String(sseV(obj,l)).trim())) out[l].f++; }); }
  add(SSE.name); add(SSE.desc, true);
  SSE.chapters.forEach(function(c){ add(c.title); c.sections.forEach(function(s){ add(s.title); s.items.forEach(function(x){ add(x.title); }); }); });
  return out;
}
function sseLocaleTabsHtml(){
  var fc = sseFieldCounts();
  return '<div class="loctabs" style="margin-bottom:0">' + SSE_LOC.map(function(t){ return sseLocTabBtn(t, 'sseSwitchLocale(\''+t[0]+'\')'); }).join('') + '</div><div class="small" style="color:var(--g500);margin:8px 0 0">'+T('翻譯完成度','Translation')+'：'+
    SSE_LOC.map(function(t){ return t[2]+' '+fc[t[0]].f+'/'+fc[t[0]].t; }).join('　·　')+'　<span>★ '+T('回退語系：其他語系沒填的內容，前台改顯示英文','Fallback: content missing in another language is shown in English')+'</span></div>';
}
function sseRefHtml(obj, isHtml){
  if (SSE.locale === 'zh') return '';
  var v = isHtml ? sseTxt(obj.zh) : String(obj.zh||'').trim();
  return '<div class="hint" style="background:var(--g50);border-radius:6px;padding:5px 8px;margin-top:4px">'+T('對照語系：繁體中文（唯讀）','Reference: Traditional Chinese (read-only)')+'：'+(v ? escHtml(v) : '<i>'+T('無參考內容','No reference content')+'</i>')+'</div>';
}

/* ---------- 版面 ---------- */
function ssEdHtml(){
  var st = SSE.status, cls = {'草稿':'grey','已發佈':'green','封存':'orange'}[st];
  var bar = edBarHtml({status:SSE.status, hasDraft:SSE.hasDraft, saveId:'sse_savestate', saveHtml:sseSaveStateHtml(),
    onPreview:"sseAct('preview')", onSave:'sseSaveDraft()', onPublish:'ssePublish()'});
  /* 錨點導覽放進浮動置頂的語系區塊（使用者 2026-11-10 要求），捲動時一起固定；點擊時扣掉浮動區塊高度，讓區塊標題剛好停在下方 */
  var nav = '<div class="sse-anchors">'+['sse_basic|'+T('基本資訊','Basics'),'sse_teachers|'+T('老師','Teachers'),'sse_structure|'+T('內容結構','Content')].concat(SSE.id ? ['sse_audit|'+T('異動紀錄','History')] : []).map(function(x){ var a = x.split('|'); return '<a href="javascript:void(0)" data-anchor="'+a[0]+'" onclick="sseGo(\''+a[0]+'\')">'+a[1]+'</a>'; }).join('')+'</div>';
  var loc = '<div id="sse_sticky" style="position:sticky;top:107px;z-index:19;background:#fff;border:1px solid var(--g200);border-radius:12px;padding:10px 14px;margin-bottom:12px">'+sseLocaleTabsHtml()+nav+'</div>';
  setTimeout(sseSpy, 0);
  return edHeadHtml(SSE.id ? T('編輯自學課程','Edit Self-study Course') : T('新增自學課程','New Self-study Course'), T('← 自學課程列表','← Self-study courses'), 'sseBack()') +
        bar + loc + sseBasicHtml() + sseTeachersHtml() + sseStructureHtml() + sseLevelHelpHtml() + (SSE.id ? sseAuditHtml() : '');   // 新增時沒有異動紀錄，儲存過（編輯）才出現
}
function sseBasicHtml(){
  var L = SSE.locale;
  var lv = '<option value="">'+T('未設定','Not set')+'</option>' + SS_LEVELS.map(function(l){ return '<option value="'+l[0]+'"'+(SSE.level===l[0]?' selected':'')+'>'+T(l[1],l[2])+'</option>'; }).join('');
  var avail = CONTENT_TAGS.filter(function(t){ return SSE.tags.indexOf(t) < 0; });
  var tb = function(label, cmd, val){ return '<button type="button" class="btn ghost sm" onmousedown="event.preventDefault()" onclick="ssFmt(\''+cmd+'\''+(val?',\''+val+'\'':'')+')">'+label+'</button>'; };
  var imgs = sseLib('images').items.map(function(n,i){ return {id:'img'+i, name:n}; });
  function cover(k, label, defLabel){
    var cur = SSE.cover[k], it = cur ? imgs.find(function(x){ return x.id === cur; }) : null;
    return '<div class="formrow"><label>'+label+'</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><img src="'+(TLI_MASTERS.productTypeCover ? TLI_MASTERS.productTypeCover('c_selfpace', k==='m'?'mobile':'desktop') : '')+'" alt="" style="'+(k==='m'?'width:40px;height:50px':'width:90px;height:50px')+';border-radius:6px;object-fit:cover">' +
      '<div style="flex:1;min-width:150px"><div>'+(it ? escHtml(it.name) : '<span style="color:var(--g500)">'+defLabel+'</span>')+'</div></div>' +
      '<button type="button" class="btn ghost sm" onclick="ssePickOpen(\'cover\',\''+k+'\')">'+(it ? T('更換圖片','Change image') : T('選擇圖片','Choose image'))+'</button>' +
      (it ? '<button type="button" class="btn ghost sm" onclick="sseSetCover(\''+k+'\',\'\');renderAll()">'+T('移除','Remove')+'</button>' : '') + '</div></div>';
  }
  var langSum = '<table style="width:100%"><tr><th>'+T('輔助語言','Language')+'</th><th>'+T('影片字幕','Video subtitles')+'</th><th>'+T('教材版本','Material versions')+'</th></tr>' +
    ['English','日本語'].map(function(l){ return '<tr><td>'+l+'</td><td>'+T('不適用','N/A')+'</td><td>'+sseBookLangStatus(l==='English'?'en':'ja')+'</td></tr>'; }).join('') + '</table>';
  return '<div class="card" id="sse_basic"><h2>'+T('基本資訊','Basics')+'</h2>' +
    '<div class="formrow"><label>'+T('產品名稱','Product name')+'</label><span class="req">*</span><input type="text" id="sse_name" value="'+escAttr(sseV(SSE.name,L))+'" oninput="SSE.name[SSE.locale]=this.value;sseDirty()">'+sseRefHtml(SSE.name)+'</div>' +
    '<div class="formrow"><label>'+T('子分類','Sub-category')+'</label><span class="req">*</span><select id="sse_subId" onchange="SSE.subId=this.value;sseDirty()"><option value="">'+T('請選擇','Please select')+'</option>'+CATEGORIES.filter(function(c){ return c.groupId==='g_course'; }).sort(function(a,b){ return a.order-b.order; }).map(function(c){ return '<option value="'+c.id+'"'+(SSE.subId===c.id?' selected':'')+'>'+escHtml(c.name)+'</option>'; }).join('')+'</select></div>' +
    '<div class="grid2"><div class="formrow"><label>'+T('產品代碼／SKU','Product code / SKU')+'</label><input type="text" class="ro-input" readonly value="'+escAttr(SSE.code || T('儲存時由系統產生','Generated on first save'))+'"><div class="hint">'+T('系統自動產生，不可修改。','Generated automatically; cannot be edited.')+'</div></div>' +
    '<div class="formrow"><label>'+T('分級（發佈必填）','Level (required to publish)')+' <a href="javascript:void(0)" class="fieldlink" onclick="sseLevelHelp()" title="'+T('分級與國際標準對照','Level and international standards')+'" style="display:inline-block;width:18px;height:18px;line-height:16px;text-align:center;border:1.5px solid var(--g500);border-radius:50%;text-decoration:none;color:var(--g500);font-size:11px">?</a></label><select id="sse_level" onchange="SSE.level=this.value;sseDirty()">'+lv+'</select></div></div>' +
    '<div class="formrow"><label>'+T('描述','Description')+'</label><div style="border:1px solid var(--g200);border-radius:10px;overflow:hidden"><div style="background:var(--g50);padding:6px 8px;display:flex;gap:4px;flex-wrap:wrap;border-bottom:1px solid var(--g200)">'+
      tb('<b>B</b>','bold')+tb('<i>I</i>','italic')+tb('<u>U</u>','underline')+tb('1.','insertOrderedList')+tb('•','insertUnorderedList')+'</div>' +
      '<div id="sse_desc" contenteditable="true" style="min-height:110px;padding:10px 12px;background:#fff" oninput="SSE.desc[SSE.locale]=this.innerHTML;sseDirty()">'+sseV(SSE.desc,L)+'</div></div>'+sseRefHtml(SSE.desc,true)+'</div>' +
    '<div class="formrow">'+tagLabelHtml('sse', false)+'<select onchange="sseAddTag(this.value)"><option value="">'+T('選擇既有標籤...','Choose an existing tag...')+'</option>'+avail.map(function(t){ return '<option>'+escHtml(t)+'</option>'; }).join('')+'</select>' +
      (SSE.tags.length ? '<div class="pickChips" style="margin-top:8px">'+SSE.tags.map(function(t){ return '<span class="pickChip">'+escHtml(t)+'<button type="button" onclick="sseRemoveTag(\''+escAttr(t)+'\')">×</button></span>'; }).join('')+'</div>' : '')+'</div>' +
    '<div class="grid2">'+cover('d',T('桌機版封面','Desktop cover'),T('使用預設封面','Using the default cover'))+cover('m',T('手機版封面','Mobile cover'),T('使用預設封面','Using the default cover'))+'</div>' +
    '<div class="hint" style="margin:-6px 0 12px">'+T('桌機、手機各自設定，未設定時使用預設封面；移除只取消本課程的設定，不會刪除圖片庫的圖片。','Desktop and mobile are set separately; unset ones use the default cover. Removing only clears this course’s setting and never deletes the library image.')+'</div>' +
    '<div class="formrow"><label>'+T('語言支援摘要','Language support summary')+' <span class="small" style="color:var(--g500)">'+T('自動彙整、唯讀','auto, read-only')+'</span></label>'+langSum+
      '<div class="hint">'+T('依影片字幕與教材版本自動計算。','Computed from video subtitles and material versions.')+'</div></div>' +
    (SSE.id ? '<div class="formrow"><label>'+T('引用中的銷售方案','Referencing sales plans')+' <span class="small" style="color:var(--g500)">'+T('唯讀；請至銷售方案設定調整','read-only; manage them in Sales Plans')+'</span></label><div class="note">'+T('目前沒有銷售方案引用本課程。','No sales plan references this course yet.')+'</div></div>' : '') +   // 新增時尚無被引用，編輯才顯示
    '</div>';
}
function sseBookLangStatus(lang){
  var books = SSE.resources.filter(function(r){ return r.kind === 'book'; }).map(function(r){ return bookById(r.bookId); }).filter(Boolean);
  if (!books.length) return T('不適用','N/A');
  var has = books.filter(function(b){ return Object.keys(b.versions||{}).some(function(k){ return k.split('-')[1] === lang; }); }).length;
  return has === books.length ? T('完整','Complete') : has ? T('部分','Partial') : T('無','None');
}
function ssFmt(cmd, val){ document.getElementById('sse_desc').focus(); document.execCommand(cmd, false, val || null); SSE.desc[SSE.locale] = document.getElementById('sse_desc').innerHTML; sseDirty(); }
function sseSetCover(k, v){ SSE.cover[k] = v || null; sseDirty(); }
function sseAddTag(t){ if (!t) return; if (SSE.tags.indexOf(t) < 0) SSE.tags.push(t); sseDirty(); renderAll(); }
function sseRemoveTag(t){ SSE.tags = SSE.tags.filter(function(x){ return x !== t; }); sseDirty(); renderAll(); }
function sseLevelHelpHtml(){ return ''; }
function sseLevelHelp(){
  /* 內容由使用者 2026-11-08 提供的截圖；全站共用一份，後台與前台共用（SS-C5）。目前只有繁體中文版，英文版待提供 */
  var li = function(n, cefr, tocfl, d){ return '<li style="margin-bottom:6px"><b>'+n+'</b>：'+cefr+'｜'+tocfl+'｜'+d+'</li>'; };
  ssNotice('分級與國際標準對照',
    '<p style="color:var(--g500)">本平台的自學課程採四個程度分級，方便依程度篩選課程。以下為與歐洲共同語言參考架構（CEFR）及華語文能力測驗（TOCFL）的大致對應，僅供選課參考，不代表通過任何檢定。</p>' +
    '<ul style="margin:8px 0 0 18px">' +
    li('初級','CEFR A1–A2','TOCFL 準備級、入門基礎級（Band A）','剛開始學習，能進行日常基本溝通') +
    li('中級','CEFR B1','TOCFL 進階級（Band B 第 3 級）','能處理熟悉主題的對話與短文') +
    li('中高級','CEFR B2','TOCFL 高階級（Band B 第 4 級）','能討論較抽象的主題、閱讀一般文章') +
    li('高級','CEFR C1–C2','TOCFL 流利精通級（Band C）','能流利表達並理解專業或長篇內容') +
    '</ul>');
}

/* ---------- 老師 ---------- */
function sseTeachersHtml(){
  var rows = SSE.teachers.map(function(t, i){
    var m = TLI_MASTERS.teachers.find(function(x){ return x.id === t.tid; });
    var intro = sseTxt(sseV(t.intro,SSE.locale)) || sseTxt(t.intro.zh) || sseTxt(t.intro.en);
    return '<div class="pickrow" style="align-items:flex-start;gap:10px"><span class="ss-thumb" style="width:36px;height:36px;border-radius:50%">'+T('頭像','Img')+'</span>' +
      '<div style="flex:1"><b>'+escHtml(m?m.name:t.tid)+'</b><div class="hint">'+(intro ? escHtml(intro.slice(0,80)) : T('尚未填寫本課程介紹','No course introduction yet'))+'</div></div>' +
      '<label class="small" style="white-space:nowrap"><input type="checkbox" '+(t.show?'checked':'')+' onchange="SSE.teachers['+i+'].show=this.checked;sseDirty()" style="width:auto"> '+T('前台顯示','Show')+'</label>' +
      '<button class="btn ghost sm" onclick="sseTeachMove('+i+',-1)">↑</button><button class="btn ghost sm" onclick="sseTeachMove('+i+',1)">↓</button>' +
      '<button class="btn ghost sm" onclick="sseTeachOpen('+i+')">'+T('編輯老師','Edit')+'</button><button class="btn ghost sm" onclick="sseTeachRemove('+i+')">'+T('移除','Remove')+'</button></div>';
  }).join('');
  return '<div class="card" id="sse_teachers"><div style="display:flex;justify-content:space-between;align-items:center"><h2>'+T('老師（選填・可多筆）','Teachers (optional, multiple)')+'</h2><button class="btn ghost sm" onclick="sseTeachOpen(-1)">'+T('＋ 新增老師','+ Add teacher')+'</button></div>' +
    '<div class="hint" style="margin-bottom:8px">'+T('老師從老師管理挑選；姓名與頭像在老師管理維護，這裡只填「這位老師在本課程的介紹」。','Teachers are picked from Teacher Management; name and photo are maintained there, and here you only enter the course-specific introduction.')+'</div>' +
    (rows || '<div class="note">'+T('尚未加入老師（可不填，或關閉前台顯示）。','No teachers added (optional, or hide on the front end).')+'</div>') + '</div>';
}
function sseTeachMove(i, d){ var a = SSE.teachers, j = i + d; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; sseDirty(); renderAll(); }
function sseTeachRemove(i){
  var m = TLI_MASTERS.teachers.find(function(x){ return x.id === SSE.teachers[i].tid; });
  ssConfirm(T('移除老師？','Remove teacher?'), T('只解除與本課程的關聯與本課程介紹，不刪除、不停用老師主檔。','Only the link to this course and the course introduction are removed; the teacher record is not deleted or disabled.')+'<br><b>'+escHtml(m?m.name:'')+'</b>', T('移除','Remove'), true, function(){ SSE.teachers.splice(i,1); sseDirty(); renderAll(); });
}
function sseTeachOpen(i){
  SSE_TEACH = { idx:i, tid: i >= 0 ? SSE.teachers[i].tid : '', q:'', intro: i >= 0 ? JSON.parse(JSON.stringify(SSE.teachers[i].intro)) : sseML() };
  sseTeachRender(); document.getElementById('ssModal').classList.add('open');
}
function sseTeachRender(){
  var S = SSE_TEACH, used = SSE.teachers.map(function(t){ return t.tid; });
  var q = S.q.trim().toLowerCase();
  var list = TLI_MASTERS.teachers.filter(function(t){ return used.indexOf(t.id) < 0 && (!q || t.name.toLowerCase().indexOf(q) >= 0); });
  var picker = S.idx >= 0 ? '<div class="formrow"><label>'+T('老師','Teacher')+'</label><input class="ro-input" readonly value="'+escAttr((TLI_MASTERS.teachers.find(function(t){return t.id===S.tid;})||{}).name||'')+'"><div class="hint">'+T('姓名與頭像在老師管理維護，課程內唯讀。','Name and photo are maintained in Teacher Management and are read-only here.')+'</div></div>' :
    '<div class="formrow"><label>'+T('選擇老師','Choose teacher')+'</label><span class="req">*</span><input type="text" placeholder="'+T('以姓名搜尋','Search by name')+'" value="'+escAttr(S.q)+'" oninput="SSE_TEACH.q=this.value;sseTeachRender();document.getElementById(\'sse_tq\').focus()" id="sse_tq">' +
    '<div class="pickListWrap" style="margin-top:6px">'+(list.map(function(t){ return '<div class="pickrow"><input type="radio" name="sse_t" '+(S.tid===t.id?'checked':'')+' onchange="SSE_TEACH.tid=\''+t.id+'\'" style="width:auto"><span class="pname" onclick="this.previousElementSibling.click()">'+escHtml(t.name)+'</span></div>'; }).join('') || '<div class="small" style="padding:8px 0">'+T('查無可選老師。','No teachers available.')+'</div>')+'</div>' +
    '<div class="hint">'+T('找不到老師？','Cannot find the teacher?')+' <a href="a10_teachers.html" style="color:var(--navy)">'+T('前往老師管理新增','Go to Teacher Management')+'</a></div></div>';
  document.getElementById('ssModalBody').innerHTML = '<h3>'+(S.idx>=0?T('編輯老師','Edit teacher'):T('新增老師','Add teacher'))+'</h3>' + picker +
    '<div class="loctabs" style="margin-top:6px">'+SSE_LOC.map(function(t){ return sseLocTabBtn(t, 'sseTeachCollect();SSE.locale=\''+t[0]+'\';sseTeachRender()'); }).join('')+'</div>' +
    '<div class="formrow"><label>'+T('本課程老師介紹','Course-specific introduction')+' <span class="small" style="color:var(--g500)">'+T('選填・只存在本課程，不寫回老師主檔','optional · stored in this course only, never written back to the teacher record')+'</span></label><textarea id="sse_tintro" rows="5">'+escHtml(sseV(S.intro,SSE.locale))+'</textarea></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" onclick="closeModalId(\'ssModal\');renderAll()">'+T('取消','Cancel')+'</button><button class="btn" onclick="sseTeachSave()">'+T('儲存','Save')+'</button></div>';
}
function sseTeachCollect(){ var el = document.getElementById('sse_tintro'); if (el) SSE_TEACH.intro[SSE.locale] = el.value; }
function sseTeachSave(){
  var S = SSE_TEACH, el = document.getElementById('sse_tintro'); if (el) S.intro[SSE.locale] = el.value;
  if (!S.tid){ showToast(T('請先選擇老師','Choose a teacher first')); return; }
  if (S.idx >= 0){ SSE.teachers[S.idx].intro = S.intro; } else { SSE.teachers.push({tid:S.tid, intro:S.intro, show:true}); }
  closeModalId('ssModal'); sseDirty(); renderAll();
}

/* ---------- 四層內容結構 ---------- */
function sseFind(kind, id){
  var r = null;
  SSE.chapters.forEach(function(c, ci){
    if (kind==='ch' && c.id===id) r = {o:c, arr:SSE.chapters, i:ci};
    c.sections.forEach(function(s, si){
      if (kind==='sec' && s.id===id) r = {o:s, arr:c.sections, i:si, ch:c, ci:ci};
      s.items.forEach(function(x, xi){ if (kind==='it' && x.id===id) r = {o:x, arr:s.items, i:xi, sec:s, ch:c}; });
    });
  });
  return r;
}
function sseTypesOf(items){ var seen = {}, out = []; items.forEach(function(x){ var t = sseTypeLabel(x.libKey); if (t && !seen[t]){ seen[t] = 1; out.push(t); } }); return out; }
function sseTypeTags(types){ return types.map(function(t){ return '<span class="badge grey" style="margin-left:4px">'+t+'</span>'; }).join(''); }
function sseStructureHtml(){
  var L = SSE.locale, c = sseCounts();
  var totalTxt = c.items ? (c.av ? T('總時長尚不完整（影音素材時長未知）','Total duration incomplete (some media durations unknown)') : T('無影音素材','No audio/video')) : '—';
  var chap = SSE.chapters.map(function(ch, ci){
    var secs = ch.sections.map(function(s, si){
      var items = s.items.map(function(x, xi){
        var a = sseAsset(x.libKey, x.assetId);
        return '<div class="pickrow" style="gap:8px;padding-left:34px;flex-wrap:wrap"><span class="badge blue">'+sseTypeLabel(x.libKey)+'</span>' +
          '<div style="flex:1;min-width:200px"><input type="text" id="it_'+x.id+'" value="'+escAttr(sseV(x.title,L))+'" placeholder="'+T('項目標題（學員看到的）','Item title (seen by students)')+'" oninput="sseFind(\'it\',\''+x.id+'\').o.title[SSE.locale]=this.value;sseDirty()">'+sseRefHtml(x.title)+'<div class="hint">'+T('素材：','Asset: ')+escHtml(a?a.name:x.assetId)+'（'+(a?a.lib.label:'')+'）</div></div>' +
          '<label class="small" style="white-space:nowrap"><input type="checkbox" '+(x.trial?'checked':'')+' onchange="sseFind(\'it\',\''+x.id+'\').o.trial=this.checked;sseDirty()" style="width:auto"> '+T('開放試聽','Free preview')+'</label>' +
          '<button class="btn ghost sm" onclick="sseMove(\'it\',\''+x.id+'\',-1)">↑</button><button class="btn ghost sm" onclick="sseMove(\'it\',\''+x.id+'\',1)">↓</button>' +
          '<button class="btn ghost sm" onclick="ssePickOpen(\'replace\',\''+x.id+'\')">'+T('更換素材','Replace')+'</button><button class="btn ghost sm" onclick="sseRemove(\'it\',\''+x.id+'\')">'+T('移除','Remove')+'</button></div>';
      }).join('');
      return '<div style="border:1px solid var(--g200);border-radius:8px;margin:6px 0 6px 18px" id="sec_'+s.id+'"><div class="pickrow" style="gap:8px;background:var(--g50);flex-wrap:wrap"><button class="btn ghost sm" onclick="sseFind(\'sec\',\''+s.id+'\').o.open=!sseFind(\'sec\',\''+s.id+'\').o.open;renderAll()">'+(s.open?'▾':'▸')+'</button>' +
        '<b style="min-width:34px">'+(ci+1)+'-'+(si+1)+'</b><div style="flex:1;min-width:180px"><input type="text" value="'+escAttr(sseV(s.title,L))+'" placeholder="'+T('節標題','Section title')+'" oninput="sseFind(\'sec\',\''+s.id+'\').o.title[SSE.locale]=this.value;sseDirty()">'+sseRefHtml(s.title)+'</div>' +
        sseTypeTags(sseTypesOf(s.items)) + '<button class="btn ghost sm" onclick="sseMove(\'sec\',\''+s.id+'\',-1)">↑</button><button class="btn ghost sm" onclick="sseMove(\'sec\',\''+s.id+'\',1)">↓</button>' +
        '<button class="btn ghost sm" onclick="ssePickOpen(\'item\',\''+s.id+'\')">'+T('＋ 加入項目','+ Add item')+'</button><button class="btn ghost sm" onclick="sseRemove(\'sec\',\''+s.id+'\')">'+T('移除','Remove')+'</button></div>' +
        (s.open ? (items || '<div class="small" style="padding:8px 34px;color:var(--g500)">'+T('此節尚無項目（草稿可先留空，發佈前至少一個）。','No items yet (a draft may stay empty; at least one is required to publish).')+'</div>') : '') + '</div>';
    }).join('');
    var allItems = []; ch.sections.forEach(function(s){ allItems = allItems.concat(s.items); });
    return '<div style="border:1px solid var(--g200);border-radius:10px;margin-bottom:10px" id="ch_'+ch.id+'"><div class="pickrow" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" onclick="sseFind(\'ch\',\''+ch.id+'\').o.open=!sseFind(\'ch\',\''+ch.id+'\').o.open;renderAll()">'+(ch.open?'▾':'▸')+'</button>' +
      '<b>'+T('第 '+(ci+1)+' 章','Lesson '+(ci+1))+'</b><div style="flex:1;min-width:200px"><input type="text" value="'+escAttr(sseV(ch.title,L))+'" placeholder="'+T('章標題','Lesson title')+'" oninput="sseFind(\'ch\',\''+ch.id+'\').o.title[SSE.locale]=this.value;sseDirty()">'+sseRefHtml(ch.title)+'</div>' + sseTypeTags(sseTypesOf(allItems)) +
      '<button class="btn ghost sm" onclick="sseMove(\'ch\',\''+ch.id+'\',-1)">↑</button><button class="btn ghost sm" onclick="sseMove(\'ch\',\''+ch.id+'\',1)">↓</button>' +
      '<button class="btn ghost sm" onclick="sseSecNew(\''+ch.id+'\')">'+T('＋ 新增節','+ Add section')+'</button><button class="btn ghost sm" onclick="sseRemove(\'ch\',\''+ch.id+'\')">'+T('移除','Remove')+'</button></div>' +
      (ch.open ? (secs || '<div class="small" style="padding:8px 14px;color:var(--g500)">'+T('此章尚無節。','No sections yet.')+'</div>') : '') + '</div>';
  }).join('');
  var res = SSE.resources.map(function(r, i){
    var name, type;
    if (r.kind === 'book'){ var b = bookById(r.bookId); name = b ? ((SSE.locale==='zh'||SSE.locale==='cn') ? b.titleZh : (b.titleEn||b.titleZh)) : r.bookId; type = T('教材','Material'); }
    else { var a = sseAsset(r.libKey, r.assetId); name = a ? a.name : r.assetId; type = sseTypeLabel(r.libKey); }
    var titleIn = r.kind === 'asset' ? '<input type="text" value="'+escAttr(sseV(r.title,L))+'" placeholder="'+T('前台標題（多語）','Front-end title (per language)')+'" oninput="SSE.resources['+i+'].title[SSE.locale]=this.value;sseDirty()">' : '';
    return '<div class="pickrow" style="gap:8px;flex-wrap:wrap"><span class="badge blue">'+type+'</span><div style="flex:1;min-width:200px"><b>'+escHtml(name)+'</b>'+titleIn+'</div>' +
      '<button class="btn ghost sm" onclick="sseResMove('+i+',-1)">↑</button><button class="btn ghost sm" onclick="sseResMove('+i+',1)">↓</button><button class="btn ghost sm" onclick="sseResRemove('+i+')">'+T('移除','Remove')+'</button></div>';
  }).join('');
  return '<div class="card" id="sse_structure"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h2 style="margin:0">'+T('課程內容（章 → 節 → 項目）','Course content (Lesson → Section → Item)')+'</h2>' +
    '<span><button class="btn ghost sm" onclick="sseExpand(false)">'+T('全部收合','Collapse all')+'</button> <button class="btn ghost sm" onclick="sseExpand(true)">'+T('全部展開','Expand all')+'</button> <button class="btn sm" onclick="sseChNew()">'+T('＋ 新增章','+ Add lesson')+'</button></span></div>' +
    '<div class="hint" style="margin:6px 0 10px">'+T('每個項目引用一筆素材；章、節的編號依位置自動產生。項目標題是學員看到的內容，素材名稱只供後台辨識。','Each item links one asset; lesson and section numbers follow their position. Item titles are what students see; asset names are for admins only.')+'</div>' +
    '<div class="small" style="margin-bottom:8px"><b>'+T('內容摘要：','Summary: ')+'</b>'+c.ch+T(' 章 · ',' lessons · ')+c.sec+T(' 節 · ',' sections · ')+c.items+T(' 項',' items')+'　<b>'+T('總時長：','Total duration: ')+'</b>'+totalTxt+'</div>' +
    (chap || '<div class="note">'+T('尚未建立章。草稿可先留空；發佈前至少一章、每章至少一節、每節至少一個項目。','No lessons yet. A draft may stay empty; publishing needs at least one lesson, each with a section, each with an item.')+'</div>') +
    '<div style="border-top:1px dashed var(--g200);margin-top:14px;padding-top:12px"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">'+T('教材資源','Course resources')+'</h2><button class="btn ghost sm" onclick="sseResOpen()">'+T('＋ 新增教材資源','+ Add resource')+'</button></div>' +
    '<div class="hint" style="margin:6px 0">'+T('教材資源不列入學習進度計算。','Course resources are not counted in learning progress.')+' '+T('可混合加入多本教材與資源庫素材，並可排序、移除。','Mix textbooks and library assets; reorder or remove them anytime.')+'</div>' +
    (res || '<div class="note">'+T('尚未加入教材資源。','No resources yet.')+'</div>') + '</div></div>';
}
function sseExpand(open){ SSE.chapters.forEach(function(c){ c.open = open; c.sections.forEach(function(s){ s.open = open; }); }); renderAll(); }
function sseChNew(){ SSE.chapters.push({id:sseUid('ch'), title:sseML(), open:true, sections:[]}); sseDirty(); renderAll(); }
function sseSecNew(chId){
  document.getElementById('ssModalBody').innerHTML = '<h3>'+T('新增節','Add section')+'</h3><div class="formrow"><label>'+T('目前資料語系的節標題（'+sseLocName(SSE.locale)+'）','Section title in the current data language ('+sseLocName(SSE.locale)+')')+'</label><span class="req">*</span><input type="text" id="sse_secname"><div class="hint">'+T('草稿可先建立空白節；發佈前每一節至少需有一個項目。','A draft may start with an empty section; each section needs at least one item before publishing.')+'</div></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px"><button class="btn ghost" onclick="closeModalId(\'ssModal\')">'+T('取消','Cancel')+'</button><button class="btn" onclick="sseSecCreate(\''+chId+'\')">'+T('建立節','Create')+'</button></div>';
  document.getElementById('ssModal').classList.add('open');
}
function sseSecCreate(chId){
  var v = document.getElementById('sse_secname').value.trim(); if (!v){ showToast(T('請先填寫節標題','Enter the section title first')); return; }
  var ch = sseFind('ch', chId).o, t = sseML(); t[SSE.locale] = v;
  ch.sections.push({id:sseUid('sec'), title:t, open:true, items:[]}); ch.open = true;
  closeModalId('ssModal'); sseDirty(); renderAll();
}
function sseMove(kind, id, d){ var f = sseFind(kind, id); if (!f) return; var j = f.i + d; if (j < 0 || j >= f.arr.length) return; var t = f.arr[f.i]; f.arr[f.i] = f.arr[j]; f.arr[j] = t; sseDirty(); renderAll(); }
function sseRemove(kind, id){
  var f = sseFind(kind, id); if (!f) return;
  var n = '', secN = 0, itN = 0;
  if (kind === 'ch'){ secN = f.o.sections.length; f.o.sections.forEach(function(s){ itN += s.items.length; }); n = T('將一併移除 '+secN+' 節、'+itN+' 個項目。','This also removes '+secN+' section(s) and '+itN+' item(s).'); }
  else if (kind === 'sec'){ n = T('將一併移除 '+f.o.items.length+' 個項目。','This also removes '+f.o.items.length+' item(s).'); }
  else { n = T('只解除素材引用，不刪除資源庫中的素材。','Only the asset link is removed; the library asset is not deleted.'); }
  ssConfirm(T('確認移除','Confirm removal'), n, T('確認移除','Remove'), true, function(){ f.arr.splice(f.i, 1); sseDirty(); renderAll(); });
}

/* ---------- 素材挑選器（加入項目／更換素材／教材資源的素材庫路徑） ---------- */
function ssePickOpen(mode, target){
  SSE_P = { mode:mode, target:target, lib:'videos', q:'', sel:[], tab:'lib', newName:'', newTags:[], newFile:'', nameAuto:false };
  if (mode === 'replace'){ var f = sseFind('it', target); if (f) SSE_P.lib = f.o.libKey; }
  if (mode === 'cover'){ SSE_P.lib = 'images'; if (SSE.cover[target]) SSE_P.sel = [SSE.cover[target]]; }   // 封面只能從圖片庫選，素材類型固定
  ssePickRender(); document.getElementById('ssModal').classList.add('open');
}
function ssePickRender(){
  var P = SSE_P, lib = sseLib(P.lib), multi = P.mode !== 'replace' && P.mode !== 'cover';
  var q = P.q.trim().toLowerCase();
  var typeSel = P.mode === 'cover' ? '<select disabled><option>'+lib.label+'</option></select>' : '<select onchange="SSE_P.lib=this.value;SSE_P.sel=[];ssePickTypeChanged();ssePickRender()">'+sseLibs().map(function(l){ return '<option value="'+l.key+'"'+(P.lib===l.key?' selected':'')+'>'+l.label+'</option>'; }).join('')+'</select>';
  var body;
  if (P.tab === 'lib'){
    var tagF = P.tagF || [];
    var rows = lib.items.map(function(n, i){ var id = lib.prefix+i; return {id:id, name:n, tags:(lib.tags||{})[id]||[]}; })
      .filter(function(x){ return !q || x.name.toLowerCase().indexOf(q) >= 0; })
      .filter(function(x){ return !tagF.length || x.tags.some(function(t){ return tagF.indexOf(t) >= 0; }); });   // 4.9 §二：同時符合類型、名稱、標籤；多選標籤符合任一個
    body = '<input type="text" placeholder="'+T('搜尋素材名稱','Search asset name')+'" value="'+escAttr(P.q)+'" id="sse_pq" oninput="SSE_P.q=this.value;ssePickRender();var e=document.getElementById(\'sse_pq\');e.focus();e.setSelectionRange(e.value.length,e.value.length)">' +
      '<div style="display:flex;gap:6px 14px;flex-wrap:wrap;align-items:center;margin-top:10px"><span style="font-size:13.5px;color:var(--g500)">'+T('內容標籤','Content tags')+'</span>'+CONTENT_TAGS.map(function(t){ return '<label style="cursor:pointer;display:inline-flex;align-items:center;gap:5px"><input type="checkbox" '+(tagF.indexOf(t)>=0?'checked':'')+' onchange="ssePickTagFilter(\''+escAttr(t)+'\',this.checked)" style="width:auto"> '+escHtml(t)+'</label>'; }).join('')+'<span class="hint" style="margin:0">'+T('複選時符合任一標籤即可','Matches any selected tag')+'</span></div>' +
      '<div class="pickListWrap" style="margin-top:8px;max-height:260px">'+(rows.map(function(x){ return '<div class="pickrow"><input type="'+(multi?'checkbox':'radio')+'" name="sse_pk" '+(P.sel.indexOf(x.id)>=0?'checked':'')+' onchange="ssePickToggle(\''+x.id+'\',this.checked)" style="width:auto"><span class="pname" onclick="this.previousElementSibling.click()">'+escHtml(x.name)+(x.tags.length?' <span class="small" style="color:var(--g500)">'+escHtml(x.tags.join('、'))+'</span>':'')+'</span></div>'; }).join('') || '<div class="small" style="padding:8px 0">'+T('此庫沒有符合的素材。','No matching assets in this library.')+'</div>')+'</div>' +
      '';
  } else {
    /* 新增分頁（4.9 §三；版面依客戶 4.4 原型）：上傳檔案、素材名稱（自動帶入可改）、內容標籤必填；必填未完成前插入按鈕停用
       20261110 使用者要求與資源庫 a18 一致，拿掉「輸入網址／iframe 嵌入碼」，只能上傳檔案 */
    body = '<div style="border:1px dashed var(--g500);border-radius:10px;background:var(--g50);padding:22px 16px;text-align:center"><button type="button" class="btn ghost" onclick="ssePickChooseFile()">'+T('選擇新的素材檔案','Choose a new asset file')+'</button>' +
        '<div class="hint" id="sse_fileState" style="margin-top:8px">'+(P.newFile ? T('已選擇檔案','File selected') : T('尚未選擇檔案','No file selected'))+'</div>' +
        '<div class="hint">'+T('僅限 '+(lib.formats||'').split(',').join('、')+' 格式。','Formats: '+(lib.formats||'').split(',').join(', ')+' only.')+'</div></div>' +
      '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--g200)"><label style="font-size:13.5px;color:var(--g500)">'+T('素材名稱','Asset name')+' <span class="req">*</span></label>' +
        '<input type="text" id="sse_newname" style="margin-top:5px" value="'+escAttr(P.newName)+'" placeholder="'+T('例：L5 教學影片-描述外表','e.g. L5 Teaching Video - Describing Appearance')+'" oninput="ssePickNameInput(this.value)">' +
        '<p class="hint">'+T('由檔名自動帶入，可修改；不必手動命名，但不可清空新增。','Filled in from the file name and editable; no need to name it manually, but it cannot be empty.')+'</p>' +
        '<div style="margin-top:12px"><span style="font-size:13.5px;color:var(--g500)">'+T('內容標籤','Content tags')+' <span class="req">*</span></span>' +
        '<div style="margin-top:6px">'+TLI_TagDD.html('sse_new', P.newTags, CONTENT_TAGS, ssePickValid)+'</div>' +   // 20261110 改為下拉選單（可複選、關鍵字篩選），元件在 assets/_tag_dd.js
        '<p class="hint">'+T('至少選一個。素材數量一多，標籤是唯一有效的篩選方式。','Pick at least one. As assets multiply, tags are the only effective way to filter.')+'</p></div></div>';
  }
  var footer = P.tab === 'lib'
    ? '<button class="btn" onclick="ssePickConfirm()">'+(P.mode==='cover' ? T('選用','Use') : P.mode==='replace' ? T('更換','Replace') : T('加入所選（'+P.sel.length+'）','Add selected ('+P.sel.length+')'))+'</button>'
    : '<button class="btn" id="sse_newInsert" onclick="ssePickCreate()"'+(ssePickMiss().miss.length?' disabled':'')+'>'+T('新增並插入','Create and insert')+'</button>';
  document.getElementById('ssModalBody').innerHTML = '<h3>'+(P.mode==='cover' ? T('選擇封面圖片（'+(P.target==='d'?'桌機版':'手機版')+'）','Choose cover image ('+(P.target==='d'?'desktop':'mobile')+')') : P.mode==='replace' ? T('更換素材','Replace asset') : P.mode==='edres' ? T('新增資源・選擇素材','Add resource · choose asset') : P.mode==='res' ? T('從素材庫取用','Take from the library') : T('加入項目・選擇素材','Add item · choose asset'))+'</h3>' +
    '<div class="formrow"><label>'+T('素材類型','Asset type')+'</label>'+typeSel+'<div class="hint">'+(P.mode==='cover' ? T('封面只能從圖片庫選，素材類型固定為圖片庫。','Covers can only come from the image library; the asset type is fixed.') : T('選定後，資源庫只顯示該類型素材。','The library shows only assets of the selected type.'))+'</div></div>' +
    '<div class="tabs" style="margin:6px 0 10px"><button class="'+(P.tab==='lib'?'active':'')+'" onclick="SSE_P.tab=\'lib\';ssePickRender()">'+T('資源庫','Library')+'</button><button class="'+(P.tab==='new'?'active':'')+'" onclick="SSE_P.tab=\'new\';ssePickRender()">'+T('新增','New')+'</button></div>' + body +
    '<div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:14px">'+(P.tab==='new' ? '<span class="hint" id="sse_newWhy" style="margin:0 auto 0 0">'+ssePickMiss().why+'</span>' : '')+'<button class="btn ghost" onclick="closeModalId(\'ssModal\')">'+T('取消','Cancel')+'</button>'+footer+'</div>';
}
function ssePickToggle(id, on){
  var P = SSE_P;
  if (P.mode === 'replace' || P.mode === 'cover'){ P.sel = on ? [id] : []; }
  else { if (on){ if (P.sel.indexOf(id) < 0) P.sel.push(id); } else { P.sel = P.sel.filter(function(x){ return x !== id; }); } }
  var btn = document.querySelector('#ssModalBody .btn:not(.ghost)'); if (btn && P.mode !== 'replace' && P.mode !== 'cover') btn.textContent = T('加入所選（'+P.sel.length+'）','Add selected ('+P.sel.length+')');
}
function ssePickMiss(){
  var P = SSE_P, miss = [];
  if (!P.newFile) miss.push(T('素材檔案','Asset file'));
  if (!P.newName.trim()) miss.push(T('素材名稱','Asset name'));
  if (!P.newTags.length) miss.push(T('內容標籤','Content tags'));
  return {miss:miss, why: miss.length ? T('尚缺：','Missing: ')+miss.join(T('、',', ')) : ''};
}
function ssePickValid(){
  var m = ssePickMiss(), w = document.getElementById('sse_newWhy'), b = document.getElementById('sse_newInsert');
  if (w) w.textContent = m.why; if (b) b.disabled = m.miss.length > 0;
}
function ssePickTagFilter(t, on){ var a = SSE_P.tagF || []; SSE_P.tagF = on ? (a.indexOf(t)<0 ? a.concat(t) : a) : a.filter(function(x){ return x !== t; }); ssePickRender(); }
function ssePickNameInput(v){ SSE_P.newName = v; SSE_P.nameAuto = false; ssePickValid(); }
function ssePickTypeChanged(){   // 4.9 §三：變更素材類型後，先前選取且不相容的檔案不得保留
  var P = SSE_P; if (P.newFile){ P.newFile = ''; if (P.nameAuto) P.newName = ''; }
  P.nameAuto = false;
}
function ssePickChooseFile(){
  var P = SSE_P, lib = sseLib(P.lib);
  P.newFile = 'type-valid-demo';
  if (!P.newName.trim()){ P.newName = lib.label.replace('庫','') + '_新素材'; P.nameAuto = true; }
  ssePickRender();
}
function ssePickCreate(){
  var P = SSE_P, m = ssePickMiss();
  if (m.miss.length){ showToast(m.why); return; }
  var lib = sseLib(P.lib); lib.items.push(P.newName.trim()); lib.tags = lib.tags || {};
  var id = lib.prefix + (lib.items.length - 1); lib.tags[id] = P.newTags.slice();
  P.sel = [id]; ssePickConfirm();
}
function ssePickConfirm(){
  var P = SSE_P; if (!P.sel.length){ showToast(T('請先選擇素材','Choose an asset first')); return; }
  if (P.mode === 'edres'){ closeModalId('ssModal'); apResApply(P.sel); return; }   // 預約／活動的「使用資源」共用同一個挑選彈窗
  if (P.mode === 'item'){
    var s = sseFind('sec', P.target).o;
    P.sel.forEach(function(id){ var a = sseAsset(P.lib, id), t = sseML(); t[SSE.locale] = a ? a.name : ''; s.items.push({id:sseUid('it'), title:t, libKey:P.lib, assetId:id, trial:false}); });
    s.open = true;
  } else if (P.mode === 'cover'){
    SSE.cover[P.target] = P.sel[0];
  } else if (P.mode === 'replace'){
    var it = sseFind('it', P.target).o; it.libKey = P.lib; it.assetId = P.sel[0];
  } else if (P.mode === 'res'){
    P.sel.forEach(function(id){ var a = sseAsset(P.lib, id), t = sseML(); t[SSE.locale] = a ? a.name : ''; SSE.resources.push({id:sseUid('rs'), kind:'asset', libKey:P.lib, assetId:id, title:t}); });
  }
  closeModalId('ssModal'); sseDirty(); renderAll();
}

/* ---------- 教材資源 ---------- */
function sseResOpen(){ SSE_P = {mode:'res', tab:'book', q:'', lib:'videos', sel:[], newName:'', newTags:[]}; sseResRender(); document.getElementById('ssModal').classList.add('open'); }
function sseResRender(){
  var q = SSE_P.q.trim().toLowerCase(), used = SSE.resources.filter(function(r){ return r.kind==='book'; }).map(function(r){ return r.bookId; });
  var books = bookList().filter(function(b){ return b.status !== '停用' && used.indexOf(b.id) < 0 && (!q || (b.titleZh||'').toLowerCase().indexOf(q) >= 0 || (b.titleEn||'').toLowerCase().indexOf(q) >= 0); });
  document.getElementById('ssModalBody').innerHTML = '<h3>'+T('新增教材資源','Add course resource')+'</h3>' +
    '<div class="tabs" style="margin:6px 0 10px"><button class="active">'+T('掛載教材','Mount a material')+'</button><button onclick="ssePickOpen(\'res\',null)">'+T('從素材庫取用','From the library')+'</button></div>' +
    '<div class="hint" style="margin-bottom:6px">'+T('可加入多本不同的教材，同一本不重複加入。可用中文或英文標題搜尋。','Add several different textbooks; the same one cannot be added twice. Search by Chinese or English title.')+'</div>' +
    '<input type="text" id="sse_bq" placeholder="'+T('搜尋教材標題','Search material title')+'" value="'+escAttr(SSE_P.q)+'" oninput="SSE_P.q=this.value;sseResRender();var e=document.getElementById(\'sse_bq\');e.focus();e.setSelectionRange(e.value.length,e.value.length)">' +
    '<div class="pickListWrap" style="margin-top:8px;max-height:280px">'+(books.map(function(b){ return '<div class="pickrow"><span class="pname"><b>'+escHtml(b.titleZh)+'</b><span class="small" style="color:var(--g500)"> '+escHtml(b.titleEn||'')+'</span></span><button class="btn sm" onclick="sseResAddBook(\''+b.id+'\')">'+T('加入','Add')+'</button></div>'; }).join('') || '<div class="small" style="padding:8px 0">'+T('沒有可掛載的教材。','No materials available.')+'</div>')+'</div>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn ghost" onclick="closeModalId(\'ssModal\')">'+T('關閉','Close')+'</button></div>';
}
function sseResAddBook(id){ SSE.resources.push({id:sseUid('rs'), kind:'book', bookId:id}); sseDirty(); closeModalId('ssModal'); renderAll(); }
function sseResMove(i, d){ var a = SSE.resources, j = i + d; if (j < 0 || j >= a.length) return; var t = a[i]; a[i] = a[j]; a[j] = t; sseDirty(); renderAll(); }
function sseResRemove(i){ ssConfirm(T('移除教材資源？','Remove resource?'), T('只解除與本課程的關聯，不會刪除教材或資源庫素材。','Only the link to this course is removed; the textbook or library asset is not deleted.'), T('移除','Remove'), true, function(){ SSE.resources.splice(i,1); sseDirty(); renderAll(); }); }

/* ---------- 其他 ---------- */
function sseAct(a){ if (a === 'preview') showToast(T('前台預覽會另開分頁；有未儲存的變更時，會先提示儲存。','The preview opens in a new tab; you will be asked to save unsaved changes first.')); }
function sseAuditHtml(){
  var list = SSE.audit, show = SSE_AUDIT_ALL ? list : list.slice(0, 5);
  return '<div class="card" id="sse_audit"><h2>'+T('異動紀錄','Change history')+'</h2>' +
    (show.length ? '<div class="tablewrap"><table><tr><th>'+T('時間','Time')+'</th><th>'+T('操作者','By')+'</th><th>'+T('操作','Action')+'</th></tr>'+show.map(function(a){ return '<tr><td>'+ssFmtTime(a.at)+'</td><td>'+escHtml(a.actor)+'</td><td>'+escHtml(a.act)+'</td></tr>'; }).join('')+'</table></div>' : '<div class="note">'+T('尚無紀錄；儲存草稿或發佈後會新增一筆。','No records yet; one is added after saving or publishing.')+'</div>') +
    (list.length > 5 ? '<a href="javascript:void(0)" onclick="SSE_AUDIT_ALL=!SSE_AUDIT_ALL;renderAll()" style="color:var(--navy)">'+(SSE_AUDIT_ALL ? T('收合較早的紀錄','Collapse older records') : T('顯示較早的紀錄','Show older records'))+'</a>' : '') + '</div>';
}
