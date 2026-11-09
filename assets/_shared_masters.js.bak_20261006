/* ==================================================================
   TLI Hub 原型：單一共用主檔（20260928）
   所有頁面的下拉選項與示範資料唯一來源；不要在個別頁面各自寫死同名資料。
   純 JS、無模組語法，用 <script src="../assets/_shared_masters.js"></script> 載入，
   建立全域物件 window.TLI_MASTERS。管理頁（見各清單對應的 manageLink）可直接
   push／splice／修改欄位，因為其他頁拿到的是同一個陣列參照，不是複製本。
   ================================================================== */
(function(global){

/* ---- 1. 校區與線上據點（來源 a17「校區與線上據點」） ---- */
var campuses = [
 {id:'rsf', name:'羅斯福校區', address:'台北市大安區羅斯福路三段', consultHours:'週一至週六 09:00–20:00', invoiceEntityDefault:'中華語文（羅斯福校區預設）', enabled:true},
 {id:'ss', name:'士林校區', address:'台北市士林區中山北路', consultHours:'週一至週六 09:00–20:00', invoiceEntityDefault:'世華（士林校區預設）', enabled:true},
 {id:'tc', name:'台中校區', address:'台中市西區台灣大道', consultHours:'週二至週日 10:00–19:00', invoiceEntityDefault:'大西華（台中校區預設）', enabled:true},
 {id:'kh', name:'高雄校區', address:'高雄市前金區中山一路', consultHours:'週二至週日 10:00–19:00', invoiceEntityDefault:'南華（高雄校區預設）', enabled:true},
 {id:'online', name:'線上', address:'無實體據點', consultHours:'依課程班表時段', invoiceEntityDefault:'線上課程用總部預設法人（中華語文）', enabled:true}
];

/* ---- 2. 上課方式：預約制／直播制／隨選（來源 a17「上課方式」）
   每項只留「是否需要視訊教室」布林，不寫死 Zoom；實際用哪套視訊工具由 videoTools 與各夥伴設定決定 ---- */
var deliveryModes = [
 {id:'booking', name:'預約制', desc:'顧問或學生指定日期時段，一對一排課', needsVideoRoom:true, allowSelfSchedule:true, enabled:true},
 {id:'live', name:'直播制', desc:'固定班表時段直播上課，依課程班表進行', needsVideoRoom:true, allowSelfSchedule:false, enabled:true},
 {id:'ondemand', name:'隨選', desc:'預錄課程內容，學生自行安排學習進度', needsVideoRoom:false, allowSelfSchedule:true, enabled:true}
];

/* ---- 3. 教學語言（來源 a17，原本叫「語言」；產品用哪種語言教學，與介面語系是兩回事）
   20260930 新增 legacyNames：部分頁面／教師示範資料仍用舊版「語」尾命名（如「英語」「日語」），
   為避免逐一改寫既有示範資料造成選中值消失，新頁改讀本主檔時可用 legacyNames 做相容比對 ---- */
var teachLangs = [
 {id:'zh', name:'中文', nameMulti:'Chinese／中文（繁體）', enabled:true},
 {id:'en', name:'英文', nameMulti:'English', enabled:true, legacyNames:['英語']},
 {id:'ja', name:'日文', nameMulti:'Japanese／日本語', enabled:true, legacyNames:['日語']},
 {id:'ko', name:'韓文', nameMulti:'Korean／한국어', enabled:true, legacyNames:['韓語']},
 {id:'de', name:'德文', nameMulti:'German／Deutsch', enabled:true, legacyNames:['德語']},
 {id:'fr', name:'法文', nameMulti:'French／Français', enabled:true, legacyNames:['法語']},
 {id:'tw', name:'台語', nameMulti:'Taiwanese／臺語', enabled:true},
 {id:'wu', name:'上海話', nameMulti:'Shanghainese／上海話', enabled:true},
 {id:'yue', name:'廣東話', nameMulti:'Cantonese／廣東話', enabled:true}
];

/* ---- 4. 等級體系（來源 a17「等級體系」）：依教學語言分組
   ranges：一般等級範圍表（Lv 對應 CEFR／HSK／TOCFL），目前各語言共用同一份範圍定義
   byLang：升等規則用的 9 級升等條件表，依教學語言各自建立；沿用原本「產品分類（中文／外文／師資班／方言）」
   的資料——中文已建立，其餘語言尚未建立（與改版前行為一致，需要時在 a17 點「＋新增本系列等級表」） ---- */
function defaultLadder(langName){
  var arr = [];
  for (var i=1;i<=9;i++){
    arr.push({id:'lv'+i, name:'Lv'+i,
      condTest:true, condCourse:false, combine:'any',
      attendPct:'', assessReq:true,
      testEnabled:true, testName:langName+' Lv'+i+' 等級測驗', testQCount:'', testPass:'',
      editor:'', editedAt:''});
  }
  return arr;
}
var levelSystems = {
  ranges:[
   {id:'r1', levelFrom:'Lv.1', levelTo:'Lv.4', name:'初級', cefr:'A1–A2', hsk:'HSK1–HSK2', tocfl:'準備級–入門基礎級', enabled:true},
   {id:'r2', levelFrom:'Lv.5', levelTo:'Lv.8', name:'中級', cefr:'B1–B2', hsk:'HSK3–HSK4', tocfl:'基礎級–進階級', enabled:true},
   {id:'r3', levelFrom:'Lv.9', levelTo:'Lv.9', name:'中高級', cefr:'C1', hsk:'HSK5', tocfl:'高階級', enabled:true},
   {id:'r4', levelFrom:'Lv.H', levelTo:'Lv.H', name:'高級', cefr:'C2', hsk:'HSK6', tocfl:'流利級', enabled:true}
  ],
  byLang:{
    zh:{seeded:true, ladder:defaultLadder('中文')},
    en:{seeded:false, ladder:[]},
    ja:{seeded:false, ladder:[]},
    ko:{seeded:false, ladder:[]},
    de:{seeded:false, ladder:[]},
    fr:{seeded:false, ladder:[]},
    tw:{seeded:false, ladder:[]},
    wu:{seeded:false, ladder:[]},
    yue:{seeded:false, ladder:[]}
  },
  defaultLadder: defaultLadder
};
/* 用 levelRange 文字粗略對應到 ranges 的 id，僅供產品主檔示範連結用，非精確判定 */
function guessLevelId(range){
  if (!range) return null;
  if (/不分級|不限|全級別|依合約/.test(range) && !/Lv\./.test(range)) return null;
  if (/Lv\.H/.test(range)) return 'r4';
  if (/Lv\.9/.test(range)) return 'r3';
  if (/Lv\.5/.test(range) && !/Lv\.1/.test(range)) return 'r2';
  if (/Lv\.1/.test(range)) return 'r1';
  return null;
}

/* ---- 5. 介面語系：固定三項，不開放自助新增（來源 a17 新增區塊） ---- */
var uiLocales = [
 {id:'zh-TW', name:'繁體中文', abbr:'繁中'},
 {id:'zh-CN', name:'簡體中文', abbr:'簡中'},
 {id:'en', name:'英文', abbr:'EN'}
];

/* ---- 6. 使用規則組：線上／實體分開，不共用同一組（來源 a17「預約、請假與取消」規則組；示範值，正式數字待拍板） ---- */
var ruleSets = [
 {id:'online_std', name:'標準線上', scope:'online', cancelWindow:12, freeCancel:2, rescheduleMax:2},
 {id:'onsite_std', name:'標準實體', scope:'onsite', cancelWindow:24, freeCancel:1, rescheduleMax:1},
 {id:'strict_online', name:'嚴格（線上）', scope:'online', cancelWindow:48, freeCancel:0, rescheduleMax:0},
 {id:'strict_onsite', name:'嚴格（實體）', scope:'onsite', cancelWindow:48, freeCancel:0, rescheduleMax:0},
 {id:'loose_online', name:'寬鬆（線上）', scope:'online', cancelWindow:6, freeCancel:4, rescheduleMax:4},
 {id:'loose_onsite', name:'寬鬆（實體）', scope:'onsite', cancelWindow:6, freeCancel:4, rescheduleMax:4}
];

/* ---- 7. 視訊工具與授權（新增，來源 a17「視訊工具與授權」；示範值） ---- */
var videoTools = [
 {id:'zoom', name:'Zoom', licenses:20, inUse:14, owner:'TLI'},
 {id:'teams', name:'Microsoft Teams', licenses:10, inUse:3, owner:'TLI'}
];

/* ---- 8. 產品分類：固定五類（來源 a02「產品管理」；20260929 拍板不用分級測驗，移除原 c_leveltest 分類與其產品） ---- */
var productCategories = [
 {id:'c_1to1', name:'一對一課程', desc:'教師一對一授課，依約時段預約上課。', order:1, status:'啟用'},
 {id:'c_group', name:'團體直播班', desc:'固定班級、多人共學，依課表排定上課時間；含實體、線上與混合班。', order:2, status:'啟用'},
 {id:'c_selfpace', name:'自學課程', desc:'不綁時段的隨選學習內容，含影音課程包。', order:3, status:'啟用'},
 {id:'c_event', name:'活動', desc:'單場次的體驗課、工作坊、講座與相關活動費。', order:4, status:'啟用'},
 {id:'c_chat', name:'聊天室與會話預約', desc:'會員權益型的會話練習，含團體聊天室與一對一會話預約。', order:5, status:'啟用'}
];

/* ---- 9. 產品（來源 a02「產品管理」＋a04「銷售方案設定」SKU 明細合併，消除兩頁各自一套產品清單的問題）
   categoryId／teachLangId／deliveryModeId／needsVideoRoom／levelId 為新增的跨頁對照欄位；
   unit／feeCat／tax／courseType／line 為 a04 計價與型態欄位；沿用兩邊原始資料，欄位名稱不變，頁面邏輯不用改 ---- */
var products = [
 {id:'skuC01', code:'CN-ZH-1V1', name:'中文一對一線上課 50 分鐘 1 堂', categoryId:'c_1to1', teachLangId:'zh', deliveryModeId:'booking', needsVideoRoom:true, mode:'線上', classType:'一對一', duration:'50 分鐘', unit:'堂', levelRange:'Lv.1–8（全級別）', levelId:'r1', materials:[], feeCat:'學費', tax:'免稅', courseType:'一對一', desc:'一對一預約制線上中文課，依學生程度安排教師。', enabled:true},
 {id:'skuC02', code:'CN-EN-1V1', name:'英語一對一線上課 50 分鐘 1 堂', categoryId:'c_1to1', teachLangId:'en', deliveryModeId:'booking', needsVideoRoom:true, mode:'線上', classType:'一對一', duration:'50 分鐘', unit:'堂', levelRange:'初級–商務英語', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'一對一', desc:'一對一預約制線上英語課。', enabled:true},
 {id:'sku01', code:'ZH-1V1-50', name:'中文一對一 50 分鐘 1 堂', categoryId:'c_1to1', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'一對一', duration:'50 分鐘', unit:'堂', levelRange:'Lv.1–8（全級別）', levelId:'r1', materials:['實用視聽華語 第一冊'], feeCat:'學費', tax:'免稅', courseType:'', line:'中文', legacyCategory:'中文一對一', desc:'實體教室一對一中文課，依教材冊別安排進度。', enabled:true},
 {id:'sku06', code:'ZH-ON-60', name:'中文線上課 60 分鐘 1 堂', categoryId:'c_1to1', teachLangId:'zh', deliveryModeId:'booking', needsVideoRoom:true, mode:'線上', classType:'一對一', duration:'60 分鐘', unit:'堂', levelRange:'Lv.1–8', levelId:'r1', materials:[], feeCat:'學費', tax:'免稅', courseType:'一對一', line:'中文', legacyCategory:'線上課', desc:'中文部自有線上一對一課。', enabled:true},
 {id:'sku08', code:'EN-1V1-50', name:'英語一對一 50 分鐘 1 堂', categoryId:'c_1to1', teachLangId:'en', deliveryModeId:'booking', needsVideoRoom:true, mode:'實體', classType:'一對一', duration:'50 分鐘', unit:'堂', levelRange:'初級–商務英語', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'一對一', line:'外文', legacyCategory:'英語課程', desc:'外文部實體英語一對一課。', enabled:true},

 {id:'skuC03', code:'CN-ZH-FLEX', name:'中文彈性團體直播班 一期（8 堂）', categoryId:'c_group', teachLangId:'zh', deliveryModeId:'live', needsVideoRoom:true, mode:'線上', classType:'小班', duration:'8 堂／期', unit:'期', levelRange:'Lv.1–6', levelId:'r1', materials:[], feeCat:'學費', tax:'免稅', courseType:'團體直播', desc:'線上小組直播班，一期 8 堂，依報名情況開班。', enabled:true},
 {id:'skuC04', code:'CN-EN-FLEX', name:'英語彈性團體直播班 一期（8 堂）', categoryId:'c_group', teachLangId:'en', deliveryModeId:'live', needsVideoRoom:true, mode:'線上', classType:'小班', duration:'8 堂／期', unit:'期', levelRange:'初級–中級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'團體直播', desc:'線上英語小組直播班。', enabled:true},
 {id:'skuC07', code:'CN-CORP', name:'企業華語線上培訓（團體班）', categoryId:'c_group', teachLangId:'zh', deliveryModeId:'live', needsVideoRoom:true, mode:'線上', classType:'小班', duration:'依合約', unit:'期', levelRange:'不分級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'團體直播', desc:'依企業合約排定的線上團體培訓班。', enabled:true},
 {id:'skuC08', code:'CN-CERT-24', name:'線上華語師資認證班 24 小時', categoryId:'c_group', teachLangId:'zh', deliveryModeId:'live', needsVideoRoom:true, mode:'線上', classType:'小班', duration:'24 小時／期', unit:'期', levelRange:'不分級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'團體直播', desc:'線上開課的華語師資認證課程。', enabled:true},
 {id:'sku02', code:'ZH-SEM-58', name:'學期班 Lv.5–8 一期', categoryId:'c_group', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'大班', duration:'16 週／期', unit:'期', levelRange:'Lv.5–8', levelId:'r2', materials:['新版實用視聽華語 第二冊'], feeCat:'學費', tax:'免稅', courseType:'', line:'中文', legacyCategory:'學期班', desc:'實體學期班，依教材冊別排定進度，完課須通過線上小測。', enabled:true},
 {id:'sku05', code:'ZH-GRP4-90', name:'小組班（4 人）90 分鐘 1 堂', categoryId:'c_group', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'小班', duration:'90 分鐘', unit:'堂', levelRange:'Lv.1–6', levelId:'r1', materials:['新版實用視聽華語 第二冊'], feeCat:'學費', tax:'免稅', courseType:'', line:'中文', legacyCategory:'小組班', desc:'4 人小組實體班。', enabled:true},
 {id:'sku09', code:'JA-SEM', name:'日語學期班 一期', categoryId:'c_group', teachLangId:'ja', deliveryModeId:'live', needsVideoRoom:true, mode:'混合', classType:'大班', duration:'12 週／期', unit:'期', levelRange:'Lv.1–6', levelId:'r1', materials:[], feeCat:'學費', tax:'免稅', courseType:'團體直播', line:'外文', legacyCategory:'日語課程', desc:'日語學期班，部分課堂提供線上直播同步。', enabled:true},
 {id:'sku10', code:'TC-CERT-32', name:'華語師資培訓認證班 32 小時', categoryId:'c_group', teachLangId:'zh', deliveryModeId:'live', needsVideoRoom:true, mode:'混合', classType:'大班', duration:'32 小時／期', unit:'期', levelRange:'不分級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'團體直播', line:'師資班', legacyCategory:'師資認證班', desc:'師資培訓認證班，實體加線上混合排課。', enabled:true},
 {id:'sku12', code:'DL-TW-10', name:'台語會話 10 堂', categoryId:'c_group', teachLangId:'tw', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'小班', duration:'60 分鐘／堂，共 10 堂', unit:'堂', levelRange:'初級會話', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'', line:'方言', legacyCategory:'台語班', desc:'台語會話課程，小組上課。', enabled:true},

 {id:'skuC05', code:'CN-ZH-VOD', name:'自學影音課程包（中文基礎）', categoryId:'c_selfpace', teachLangId:'zh', deliveryModeId:'ondemand', needsVideoRoom:false, mode:'線上', classType:'自學', duration:'不限（隨選觀看）', unit:'套', levelRange:'不分級', levelId:null, materials:['實用視聽華語 第一冊'], feeCat:'學費', tax:'免稅', courseType:'自學影音', desc:'隨選觀看的中文基礎自學影音課程包。', enabled:true},
 {id:'p_self02', code:'CN-EN-VOD', name:'英語自學影音課程包', categoryId:'c_selfpace', teachLangId:'en', deliveryModeId:'ondemand', needsVideoRoom:false, mode:'線上', classType:'自學', duration:'不限（隨選觀看）', unit:'套', levelRange:'不分級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'自學影音', desc:'隨選觀看的英語自學影音課程包。', enabled:true},

 {id:'skuC06', code:'CN-CUL-TEA', name:'文化主題線上工作坊－茶道體驗', categoryId:'c_event', teachLangId:'zh', deliveryModeId:'live', needsVideoRoom:true, mode:'線上', classType:'活動', duration:'90 分鐘／場', unit:'場', levelRange:'不分級', levelId:null, materials:[], feeCat:'活動', tax:'應稅', courseType:'團體直播', desc:'線上文化體驗工作坊，單場次活動。', enabled:true},
 {id:'sku07', code:'ZH-CUL-TEA', name:'文化體驗活動－茶道體驗', categoryId:'c_event', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'活動', duration:'2 小時／場', unit:'場', levelRange:'不分級', levelId:null, materials:[], feeCat:'活動', tax:'應稅', courseType:'', line:'中文', legacyCategory:'文化課', desc:'實體文化體驗活動。', enabled:true},
 {id:'sku13', code:'ZH-EVT-TEA', name:'活動費－結業茶會', categoryId:'c_event', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'活動', duration:'不限', unit:'場', levelRange:'不分級', levelId:null, materials:[], feeCat:'活動', tax:'應稅', courseType:'', line:'中文', legacyCategory:'學期班', desc:'學期班結業茶會活動。', enabled:false},

 {id:'skuC09', code:'CN-CHAT-ZH', name:'中文團體聊天室（會員權益）', categoryId:'c_chat', teachLangId:'zh', deliveryModeId:'booking', needsVideoRoom:true, mode:'線上', classType:'大班', duration:'不限', unit:'期', levelRange:'不分級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'團體聊天室', desc:'會員權益型的團體聊天室，供會員預約加入練習會話。', enabled:true},
 {id:'p_chat02', code:'CN-CHAT-EN', name:'英語會話預約（15 分鐘／次）', categoryId:'c_chat', teachLangId:'en', deliveryModeId:'booking', needsVideoRoom:true, mode:'線上', classType:'一對一', duration:'15 分鐘／次', unit:'次', levelRange:'不分級', levelId:null, materials:[], feeCat:'學費', tax:'免稅', courseType:'', desc:'一對一線上會話預約，供會員單次預約練習口說。', enabled:true},

 /* 20260929：移除原 c_leveltest 分類下的 p_level01（中文分級測驗）、p_level02（英語分級測驗）——分級測驗功能整體下架 */

 /* ---- 以下 3 筆只在 a04 SKU 表出現過，非教學產品（教材／註冊費），categoryId 掛在最相關的課程分類供顯示用 ---- */
 {id:'sku03', code:'', name:'教材《新實用華語》上冊', categoryId:'c_group', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'', duration:'－', unit:'冊', levelRange:'不分級', levelId:null, materials:['新實用華語（上冊）'], feeCat:'教材', tax:'應稅', courseType:'', line:'中文', legacyCategory:'學期班', desc:'學期班搭配教材。', enabled:true, nonTeaching:true},
 {id:'sku04', code:'', name:'入學註冊費', categoryId:'c_group', teachLangId:null, deliveryModeId:null, needsVideoRoom:false, mode:'實體', classType:'', duration:'－', unit:'次', levelRange:'不分級', levelId:null, materials:[], feeCat:'註冊費', tax:'免稅', courseType:'', line:'中文', legacyCategory:'學期班', desc:'學期班入學時收取的註冊費。', enabled:true, nonTeaching:true},
 {id:'sku11', code:'', name:'師培教材包', categoryId:'c_group', teachLangId:'zh', deliveryModeId:null, needsVideoRoom:false, mode:'混合', classType:'', duration:'－', unit:'套', levelRange:'不分級', levelId:null, materials:['師培教材包'], feeCat:'教材', tax:'應稅', courseType:'', line:'師資班', legacyCategory:'師資認證班', desc:'師資認證班搭配教材包。', enabled:true, nonTeaching:true}
];

/* ---- 10. 教師（來源 a10「老師管理」；type:'center' 中心教師／'local' 在地教師；
   certified：是否已完成認證（中心教師視為既有正職教師，預設已認證；在地教師依 certStatus 判定）；
   partnerId：在地教師所屬加盟方，對應 partners 的 id ---- */
var teachers = [
 {id:'tc1', type:'center', name:'林俊傑', campus:'羅斯福校區', timezone:'GMT+8（台北）', centerSchedule:true, langs:['中文'], level:'資深', tenure:8, totalHours:5200, status:'在職', email:'jj.lin@tli.example', phone:'0912-345-678', active:true, certified:true,
  langLevels:[{lang:'中文',range:'Lv.1–8（全級別）'}],
  slotSummary:{'一':['09:00–12:00','14:00–17:00'],'二':[],'三':['09:00–12:00'],'四':['14:00–17:00','19:00–21:00'],'五':['09:00–12:00'],'六':[],'日':[]},
  salary:{t1_2:750,t3_5:650,t6_9:580,t10p:520},
  records:[
    {date:'2026-08-20', course:'中文一對一 50 分鐘', students:1, hours:1, note:'C 類會員，日常會話'},
    {date:'2026-08-18', course:'學期班 Lv.5–8', students:8, hours:2, note:'固定班，第 6 週'},
    {date:'2026-08-15', course:'中文一對一 50 分鐘', students:1, hours:1, note:'B 類企業補助學員'}
  ]},
 {id:'tc2', type:'center', name:'陳美惠', campus:'士林校區', timezone:'GMT+8（台北）', centerSchedule:true, langs:['中文','台語'], level:'中階', tenure:4, totalHours:2100, status:'在職', email:'meihui.chen@tli.example', phone:'0928-113-225', active:true, certified:true,
  langLevels:[{lang:'中文',range:'Lv.1–5'},{lang:'台語',range:'初級會話'}],
  slotSummary:{'一':[],'二':['09:00–12:00'],'三':['09:00–12:00','14:00–17:00'],'四':[],'五':['14:00–17:00'],'六':['09:00–12:00'],'日':[]},
  salary:{t1_2:700,t3_5:600,t6_9:540,t10p:490},
  records:[
    {date:'2026-08-19', course:'台語會話 10 堂', students:6, hours:1, note:'小組班第 3 堂'},
    {date:'2026-08-12', course:'中文一對一 50 分鐘', students:1, hours:1, note:''}
  ]},
 {id:'tc3', type:'center', name:'Michael Turner', campus:'羅斯福校區', timezone:'GMT-5（美東）', centerSchedule:true, langs:['英語'], level:'資深', tenure:6, totalHours:3800, status:'在職', email:'michael.turner@tli.example', phone:'+1-917-555-0138', active:true, certified:true,
  langLevels:[{lang:'英語',range:'全級別（含商務英語）'}],
  slotSummary:{'一':['19:00–21:00'],'二':['19:00–21:00'],'三':[],'四':['19:00–21:00'],'五':[],'六':['10:00–13:00'],'日':['10:00–13:00']},
  salary:{t1_2:820,t3_5:700,t6_9:620,t10p:560},
  records:[
    {date:'2026-08-21', course:'英語一對一 50 分鐘', students:1, hours:1, note:'企業補助方案'},
    {date:'2026-08-17', course:'英語一對一 50 分鐘', students:1, hours:1, note:''}
  ]},
 {id:'tc4', type:'center', name:'王淑芬', campus:'高雄校區', timezone:'GMT+8（台北）', centerSchedule:true, langs:['中文'], level:'中階', tenure:3, totalHours:1500, status:'在職', email:'shufen.wang@tli.example', phone:'0937-220-114', active:true, certified:true,
  langLevels:[{lang:'中文',range:'Lv.1–6'}],
  slotSummary:{'一':['09:00–12:00'],'二':[],'三':['14:00–17:00'],'四':['09:00–12:00'],'五':[],'六':['09:00–12:00'],'日':[]},
  salary:{t1_2:700,t3_5:600,t6_9:540,t10p:490},
  records:[
    {date:'2026-08-22', course:'中文一對一 50 分鐘', students:1, hours:1, note:''}
  ]},
 {id:'tc6', type:'center', name:'黃志遠', campus:'羅斯福校區', timezone:'GMT+8（台北）', centerSchedule:false, langs:['中文'], level:'資深', tenure:10, totalHours:6400, status:'留職停薪', email:'chihyuan.huang@tli.example', phone:'0933-771-042', active:false, certified:true,
  langLevels:[{lang:'中文',range:'Lv.1–8（含師資培訓班）'}],
  slotSummary:{'一':[],'二':[],'三':[],'四':[],'五':[],'六':[],'日':[]},
  salary:{t1_2:780,t3_5:660,t6_9:600,t10p:540},
  records:[
    {date:'2026-06-30', course:'華語師資培訓認證班', students:12, hours:4, note:'留停前最後一期'}
  ]},
 {id:'tc7', type:'center', name:'李佩珊', campus:'士林校區', timezone:'GMT+8（台北）', centerSchedule:false, langs:['中文','英語'], level:'中階', tenure:5, totalHours:2900, status:'離職', email:'peishan.lee@tli.example', phone:'0955-660-981', active:false, certified:true,
  langLevels:[{lang:'中文',range:'Lv.1–6'},{lang:'英語',range:'初中級'}],
  slotSummary:{'一':[],'二':[],'三':[],'四':[],'五':[],'六':[],'日':[]},
  salary:{t1_2:700,t3_5:600,t6_9:0,t10p:0},
  records:[
    {date:'2026-05-10', course:'中文一對一 50 分鐘', students:1, hours:1, note:'離職前最後授課'}
  ]},
 {id:'tl1', type:'local', name:'王建國', org:'範例大學語言中心', partnerId:'p02', langs:['中文'], level:'中階', tenure:2, totalHours:900, status:'在職', email:'chienkuo.wang@az.example', phone:'+1-520-555-0142', active:true, createdDate:'2026-08-15', certStatus:'已認證', certified:true,
  langLevels:[{lang:'中文',range:'大學班・會話與商務中文'}],
  certDate:'2026-01-15', lastRetrain:'2026-01-15', nextRetrainDue:'2027-01-15',
  records:[
    {date:'2026-09-24', course:'企業管理學系 範例交換班 B・第 5 課', students:11, hours:2, note:'11／12 出席'},
    {date:'2026-09-08', course:'人文學院 範例選修會話班・第 2 課', students:5, hours:2, note:'5／6 出席'}
  ]},
 {id:'tl2', type:'local', name:'張惠玲', org:'台灣普動教育股份有限公司', partnerId:'p01', langs:['中文'], level:'初階', tenure:1, totalHours:320, status:'在職', email:'huiling.chang@pudong.example', phone:'0965-224-118', active:true, createdDate:'2025-02-10', certStatus:'待回訓', certified:false,
  langLevels:[{lang:'中文',range:'Lv.1–3'}],
  certDate:'2025-03-01', lastRetrain:'2025-03-01', nextRetrainDue:'2026-10-15',
  records:[
    {date:'2026-09-20', course:'中文初級會話班・第 8 週', students:9, hours:2, note:''}
  ]},
 {id:'tl3', type:'local', name:'田中 小百合', org:'日本翼教育學院', partnerId:'p03', langs:['日語'], level:'中階', tenure:3, totalHours:1400, status:'在職', email:'sayuri.tanaka@tsubasa.example', phone:'+81-90-1234-5678', active:true, createdDate:'2025-05-20', certStatus:'已認證', certified:true,
  langLevels:[{lang:'日語',range:'學期班 Lv.1–6'}],
  certDate:'2025-06-01', lastRetrain:'2025-06-01', nextRetrainDue:'2027-06-01',
  records:[
    {date:'2026-09-18', course:'日語學期班 二期・第 3 週', students:7, hours:2, note:''}
  ]},
 {id:'tl4', type:'local', name:'小林 健二', org:'日本翼教育學院', partnerId:'p03', langs:['日語'], level:'初階', tenure:0, totalHours:0, status:'在職', email:'kenji.kobayashi@tsubasa.example', phone:'+81-80-2345-6789', active:true, createdDate:'2026-07-01', certStatus:'未認證', certified:false,
  langLevels:[{lang:'日語',range:'Lv.1–2'}],
  certDate:null, lastRetrain:null, nextRetrainDue:null,
  records:[]},
 {id:'tl5', type:'local', name:'佐藤直樹', org:'日本翼教育學院', partnerId:'p03', langs:['日語'], level:'中階', tenure:2, totalHours:1100, status:'在職', email:'naoki.sato@tsubasa.example', phone:'+81-90-9876-5432', active:true, createdDate:'2025-09-01', certStatus:'已認證', certified:true,
  langLevels:[{lang:'日語',range:'學期班 Lv.1–6'}],
  certDate:'2025-10-01', lastRetrain:'2025-10-01', nextRetrainDue:'2027-10-01',
  records:[
    {date:'2026-09-15', course:'日語學期班 一期・第 4 週', students:6, hours:2, note:''}
  ]},
 {id:'tl6', type:'local', name:'Sarah Whitfield', org:'範例大學語言中心', partnerId:'p02', langs:['中文'], level:'中階', tenure:1, totalHours:420, status:'在職', email:'s.whitfield@az.example', phone:'+1-520-555-0177', active:true, createdDate:'2026-08-20', certStatus:'已認證', certified:true,
  langLevels:[{lang:'中文',range:'大學班・初級會話'}],
  certDate:'2026-02-10', lastRetrain:'2026-02-10', nextRetrainDue:'2027-02-10',
  records:[]},
 {id:'tl7', type:'local', name:'陳嘉玲', org:'範例大學語言中心', partnerId:'p02', langs:['中文'], level:'高階', tenure:1, totalHours:760, status:'在職', email:'chialing.chen@az.example', phone:'+1-520-555-0193', active:true, createdDate:'2026-08-20', certStatus:'已認證', certified:true,
  langLevels:[{lang:'中文',range:'大學班・進階讀寫'}],
  certDate:'2026-02-10', lastRetrain:'2026-02-10', nextRetrainDue:'2027-02-10',
  records:[]},
 {id:'tl8', type:'local', name:'David Okafor', org:'範例大學語言中心', partnerId:'p02', langs:['中文'], level:'初階', tenure:1, totalHours:0, status:'在職', email:'d.okafor@az.example', phone:'+1-520-555-0208', active:true, createdDate:'2026-08-20', certStatus:'待總部認證', certified:false,
  langLevels:[{lang:'中文',range:'大學班・初級會話'}],
  certDate:null, lastRetrain:null, nextRetrainDue:null,
  records:[]}
];

/* ---- 11. 合作夥伴（來源 a20「合作夥伴管理」）
   uiLocales：對外開放的介面語系（id 對照 uiLocales 清單）；代理型態不經手租戶無需設定，留空陣列
   videoLicense：'tli' 使用 TLI 授權額度／'own' 使用自有視訊授權，僅加盟／經銷型態適用 ---- */
var partners = [
 {id:'p01', name:'台灣普動教育股份有限公司', contact:'林建宏', country:'台灣', type:'franchise',
  tenant:'TENANT-TW-PUDONG', status:'啟用', from:'2025-09-01', to:'2028-08-31',
  brandFee:1500000, setupFee:800000, royaltyRate:8, materialFee:'依教材品項計價', teacherTrainFee:120000, retrainFee:40000,
  brandExposure:'整個掛TLI', coMarketing:true, langs:['zh-TW'], uiLocales:['zh-TW'], videoLicense:'tli'},
 {id:'p02', name:'範例大學語言中心', contact:'Dr. Chen', country:'美國', type:'franchise',
  tenant:'TENANT-US-AZU', status:'啟用', from:'2026-02-01', to:'2029-01-31',
  brandFee:2000000, setupFee:1000000, royaltyRate:6, materialFee:'依教材品項計價', teacherTrainFee:150000, retrainFee:50000,
  brandExposure:'雙品牌並列', coMarketing:false, langs:['en','zh-TW'], uiLocales:['zh-TW','zh-CN','en'], videoLicense:'own'},
 {id:'p03', name:'日本翼教育學院', contact:'佐藤直樹', country:'日本', type:'franchise',
  tenant:'TENANT-JP-TSUBASA', status:'啟用', from:'2025-11-01', to:'2028-10-31',
  brandFee:1600000, setupFee:850000, royaltyRate:7, materialFee:'依教材品項計價', teacherTrainFee:130000, retrainFee:42000,
  brandExposure:'整個掛TLI', coMarketing:true, langs:['en'], uiLocales:['en'], videoLicense:'tli'},
 {id:'p04', name:'新加坡橋樑語言中心', contact:'Tan Wei Ling', country:'新加坡', type:'franchise',
  tenant:'TENANT-SG-BRIDGE', status:'啟用', from:'2026-05-01', to:'2029-04-30',
  brandFee:1700000, setupFee:900000, royaltyRate:7.5, materialFee:'依教材品項計價', teacherTrainFee:135000, retrainFee:45000,
  brandExposure:'雙品牌並列', coMarketing:false, langs:['en','zh-TW','zh-CN'], uiLocales:['en','zh-TW','zh-CN'], videoLicense:'own'},
 {id:'p05', name:'大馬旅遊教育集團', contact:'Ahmad Faisal', country:'馬來西亞', type:'distributor',
  tenant:'TENANT-MY-TRAVEL', status:'啟用', from:'2025-06-01', to:'2027-05-31',
  depositRate:20, distSettleCycle:'每季',
  rebateTiers:[{min:'0',max:'500,000',rate:'2'},{min:'500,001',max:'1,500,000',rate:'4'},{min:'1,500,001',max:'',rate:'6'}],
  coMarketing:true, langs:['en','zh-TW'], uiLocales:['en','zh-TW'], videoLicense:'tli'},
 {id:'p06', name:'越南遊學顧問公司', contact:'Nguyen Thi Lan', country:'越南', type:'distributor',
  tenant:'TENANT-VN-STUDY', status:'啟用', from:'2025-08-01', to:'2027-07-31',
  depositRate:15, distSettleCycle:'每年',
  rebateTiers:[{min:'0',max:'300,000',rate:'1.5'},{min:'300,001',max:'1,000,000',rate:'3'},{min:'1,000,001',max:'',rate:'5'}],
  coMarketing:false, langs:['en'], uiLocales:['en'], videoLicense:'tli'},
 {id:'p07', name:'韓國語言留學社', contact:'김민준', country:'韓國', type:'distributor',
  tenant:'TENANT-KR-LANG', status:'啟用', from:'2026-01-01', to:'2027-12-31',
  depositRate:25, distSettleCycle:'每月',
  rebateTiers:[{min:'0',max:'400,000',rate:'2'},{min:'400,001',max:'',rate:'4.5'}],
  coMarketing:true, langs:['en','zh-TW'], uiLocales:['en','zh-TW'], videoLicense:'tli'},
 {id:'p08', name:'中東教育顧問公司', contact:'Fatima Al-Sayed', country:'阿聯', type:'agent',
  tenant:null, status:'啟用', from:'2025-03-01', to:'2027-02-28', commRate:10, validDays:60, langs:[], uiLocales:[], videoLicense:'tli'},
 {id:'p09', name:'香港教育橋樑', contact:'陳曉明', country:'香港', type:'agent',
  tenant:null, status:'啟用', from:'2025-01-01', to:'2026-12-31', commRate:8, validDays:45, langs:[], uiLocales:[], videoLicense:'tli'},
 {id:'p10', name:'歐洲文化交流協會', contact:'Hans Müller', country:'德國', type:'agent',
  tenant:null, status:'停用', from:'2024-10-01', to:'2026-09-30', commRate:12, validDays:90, langs:[], uiLocales:[], videoLicense:'tli'},
 {id:'p11', name:'環球遊學顧問', contact:'山田花子', country:'日本', type:'distributor',
  tenant:'TENANT-JP-GLOBALSTUDY', slug:'global-study', status:'啟用', from:'2026-01-01', to:'2028-12-31',
  depositRate:30, distSettleCycle:'年度',
  rebateTiers:[{min:'0',max:'1,000,000',rate:'3'},{min:'1,000,001',max:'3,000,000',rate:'5'},{min:'3,000,001',max:'',rate:'8'}],
  brandExposure:'露出授權標示', coMarketing:true, langs:['ja','zh-TW'], uiLocales:['en','zh-TW'], videoLicense:'tli'},
 {id:'p12', name:'環宇教育顧問', contact:'張家瑜', country:'台灣', type:'agent',
  tenant:null, status:'啟用', from:'2026-01-01', to:'2027-12-31', commRate:10, validDays:90, langs:[], uiLocales:[], videoLicense:'tli'},
];

/* ---- 12. 組織客戶（來源 a19「組織客戶」；type:'general' 企業／'institution' 學校，學校本質走加盟型態，
   partnerId 對應 partners 的加盟夥伴）---- */
var orgCustomers = [
 {id:'ent0', name:'和霖科技股份有限公司', type:'general'},
 {id:'ent1', name:'北辰精密工業股份有限公司', type:'general'},
 {id:'ent2', name:'裕發國際貿易有限公司', type:'general'},
 {id:'ent3', name:'安泰保經股份有限公司', type:'general'},
 {id:'ent4', name:'瑞新金融顧問股份有限公司', type:'general'},
 {id:'ent5', name:'範例州立大學', type:'institution'},
 {id:'ent6', name:'東岳生技股份有限公司', type:'general'},
 {id:'ent7', name:'大西華國際物流股份有限公司', type:'general'},
 {id:'ent8', name:'崇信會計師事務所', type:'general'},
 {id:'ent9', name:'範例州立大學 分校A', type:'institution'},
 {id:'ent10', name:'立準工程顧問股份有限公司', type:'general'},
 {id:'ent11', name:'翔宇航運股份有限公司', type:'general'},
 /* 20260928：移除原 ent12「範例大學語言中心」——它是加盟夥伴（見 partners 的 p02），不該同時是組織客戶，
    合約與加盟資訊統一在「合作夥伴管理」a20 維護；原索引改補企業管理者角色（h00–h07，陳雅婷）示範租戶，
    合約明細（方案／期間／6,000 小時時數池／月結／負責顧問王大明）見 a19 該筆 ENT_TYPE_OVERRIDE 覆寫 */
 {id:'ent12', name:'範例半導體股份有限公司', type:'general'}
];

/* ---- 13. 銷售方案（來源 a04「銷售方案設定」，直接沿用原始欄位，包含折扣、優惠碼、班表、專案報價等） ---- */
var packages = [
 {id:'pk1', name:'中文一對一線上課 20 堂方案', type:'pkg', nameEn:'', nameJa:'', desc:'',
  salesMode:'direct', requireLogin:true,
  courseTypes:['一對一'],
  items:[{sku:'skuC01',qty:20}],
  audiences:['C','BIP'], prices:{C:20000,BIP:19000}, consultantQuote:{},
  discountRules:[
    {id:'dr_pk1_1', name:'新生首購折扣', kind:'pct', value:5, audiences:['C','BIP'], valuesByAud:{C:8,BIP:5}, periodStart:'2026-09-01', periodEnd:'2026-10-31', stackable:false, status:'上架'}
  ],
  promoCodes:[
    {id:'pc_pk1_1', code:'WELCOME10', kind:'pct', value:10, audiences:['C'], scope:'all', periodStart:'2026-09-01', periodEnd:'2026-12-31', maxTotalUses:100, maxPerUser:1, maxDiscountAmount:2000, minSpend:0, status:'上架', usageCount:12, lastUsed:'2026-08-15'}
  ],
  channel:['公開網站','顧問建訂單'], periodStart:'2026-09-01', periodEnd:'2027-02-28',
  schedule:null,
  creditRule:{type:'once', totalQty:20},
  status:'上架'},
 {id:'pk2', name:'中文彈性團體直播班 一期方案', type:'pkg', nameEn:'', nameJa:'', desc:'',
  salesMode:'direct', requireLogin:true,
  items:[{sku:'skuC03',qty:1},{sku:'skuC09',qty:1}],
  audiences:['B','G','C','BIP'], prices:{B:9800,G:9500,C:10800,BIP:10200}, consultantQuote:{B:true,G:false},
  discountRules:[
    {id:'dr_pk2_1', name:'開學早鳥優惠', kind:'pct', value:5, audiences:['B','G','C','BIP'], valuesByAud:{}, periodStart:'2026-09-01', periodEnd:'2026-09-30', stackable:true, status:'上架'}
  ],
  promoCodes:[
    {id:'pc_pk2_1', code:'OPENFALL', kind:'pct', value:5, audiences:['B','G','C','BIP'], scope:'this', periodStart:'2026-09-01', periodEnd:'2027-01-31', maxTotalUses:200, maxPerUser:1, maxDiscountAmount:0, minSpend:0, status:'上架', usageCount:36, lastUsed:'2026-08-20'}
  ],
  channel:['公開網站','顧問建訂單','企業專案'], periodStart:'2026-09-01', periodEnd:'2027-01-31',
  schedule:{weekdays:['二','四'], time:'19:30', weeks:8, capacity:15},
  creditRule:{type:'once', totalQty:16},
  status:'上架'},
 {id:'pk3', name:'自學影音課程包（中文基礎）方案', type:'pkg', nameEn:'', nameJa:'', desc:'',
  salesMode:'direct', requireLogin:true,
  courseTypes:['自學影音'],
  items:[{sku:'skuC05',qty:1}],
  audiences:['C','BIP'], prices:{C:2400,BIP:2200}, consultantQuote:{},
  discountRules:[], promoCodes:[],
  channel:['公開網站'], periodStart:'', periodEnd:'',
  schedule:null,
  creditRule:{type:'once', totalQty:1},
  status:'上架'},
 {id:'pk4', name:'企業華語線上培訓方案（企業專案）', type:'pkg', nameEn:'', nameJa:'', desc:'',
  salesMode:'advisor', requireLogin:false,
  courseTypes:['團體直播'],
  items:[{sku:'skuC07',qty:1}],
  audiences:['B','G'], prices:{}, consultantQuote:{B:true,G:true},
  discountRules:[], promoCodes:[],
  channel:['企業專案'], periodStart:'', periodEnd:'',
  schedule:{weekdays:['六'], time:'09:00', weeks:8, capacity:20},
  creditRule:{type:'once', totalQty:0},
  status:'下架'},
 {id:'pk5', name:'中文一對一 30 堂＋教材＋註冊費', type:'pkg', nameEn:'', nameJa:'', desc:'',
  salesMode:'direct', requireLogin:true,
  courseTypes:['一對一'],
  items:[{sku:'sku01',qty:30},{sku:'sku03',qty:1},{sku:'sku04',qty:1}],
  audiences:['C','BIP'], prices:{C:32000,BIP:30500}, consultantQuote:{},
  discountRules:[], promoCodes:[],
  channel:['公開網站','顧問建訂單'], periodStart:'2026-09-01', periodEnd:'2027-02-28',
  schedule:null,
  creditRule:{type:'once', totalQty:30},
  status:'上架'},
 {id:'pk6', name:'學期班 Lv.5–8 一期方案', type:'pkg', nameEn:'', nameJa:'', desc:'',
  salesMode:'direct', requireLogin:true,
  courseTypes:[],
  items:[{sku:'sku02',qty:1},{sku:'sku03',qty:1},{sku:'sku04',qty:1}],
  audiences:['B','G','C','BIP'], prices:{B:34000,G:33500,C:36000,BIP:35000}, consultantQuote:{B:true,G:false},
  discountRules:[
    {id:'dr_pk6_1', name:'開學早鳥優惠', kind:'pct', value:5, audiences:['B','G','C','BIP'], valuesByAud:{B:5,G:8,C:5,BIP:5}, periodStart:'2026-09-01', periodEnd:'2026-09-30', stackable:true, status:'上架'}
  ],
  promoCodes:[
    {id:'pc_pk6_1', code:'OPENFALL', kind:'pct', value:5, audiences:['B','G','C','BIP'], scope:'this', periodStart:'2026-09-01', periodEnd:'2027-01-31', maxTotalUses:200, maxPerUser:1, maxDiscountAmount:0, minSpend:0, status:'上架', usageCount:36, lastUsed:'2026-08-20'}
  ],
  channel:['公開網站','顧問建訂單','企業專案'], periodStart:'2026-09-01', periodEnd:'2027-01-31',
  schedule:null,
  creditRule:{type:'once', totalQty:32},
  status:'上架'},
 {id:'pk7', name:'客製化企業華語專案方案', type:'pkg', nameEn:'', nameJa:'', desc:'依企業客戶需求由顧問自組課程項目之專案型方案，價格另議。',
  salesMode:'advisor', requireLogin:false,
  courseTypes:['團體直播'],
  items:[],
  audiences:['B'], prices:{}, consultantQuote:{B:true},
  discountRules:[], promoCodes:[],
  channel:['企業專案'], periodStart:'', periodEnd:'',
  schedule:null,
  creditRule:{type:'once', totalQty:0},
  planType:'project',
  projectClient:'和霖科技股份有限公司',
  projectItems:[
    {course:'企業華語線上培訓（團體班）', qty:24, qtyType:'堂', paymentMethod:'月結'},
    {course:'文化主題線上工作坊－茶道體驗', qty:2, qtyType:'堂', paymentMethod:'預付款倒扣'}
  ],
  projectVersions:[
    {version:'v1.0', date:'2026-03-15', summary:'首次簽約，含企業華語培訓 20 堂', status:'歷史版本'},
    {version:'v1.1', date:'2026-08-20', summary:'續約加開茶道體驗工作坊 2 場', status:'生效中'}
  ],
  status:'草稿'}
];

/* ---- 14. 專案（來源 a21「專案設定」） ---- */
var projects = [
 {code:'PRJ-B2C-TW', name:'個人線上課．台灣直營', market:'台灣', status:'已上線', from:'2026-01-01', to:'2026-12-31', version:'v3', tpl:'tpl-b2c',
  sell:{categories:['cat-1on1'], items:['pkgself-01']}, openRange:false, /* 20260928 移除殘留舊方案 id pkgself-02（packages 主檔無對應項目，LEGACY_PACKAGE_MAP 也未收錄） */
  channels:{direct:true,franchise:false,distributor:false,agent:false}, partners:[],
  rulesOnline:{leave:'標準線上規則', makeup:'可補課＋提供回放', validity:'每月重置', refund:'可退費可轉讓', approval:'學員自主'},
  rulesOffline:{leave:'標準實體規則', makeup:'僅可補課，無回放', validity:'一次性（效期到即失效）', refund:'只可轉讓不可退費', approval:'學員自主'},
  brandExposure:'整個掛TLI', domain:'connect.tli.com.tw', sender:'TLI Connect 台灣'},
 {code:'PRJ-ENT-JP', name:'企業培訓．日本（直營＋代理介紹）', market:'日本', status:'已上線', from:'2026-04-01', to:'2027-03-31', version:'v2', tpl:'tpl-ent',
  sell:{categories:[], items:['pkggroup-02']}, openRange:false,
  channels:{direct:true,franchise:false,distributor:false,agent:true}, partners:['中東教育顧問公司'],
  rulesOnline:{leave:'寬鬆規則（企業合約）', makeup:'可補課＋提供回放', validity:'依堂數門檻延展', refund:'只可轉讓不可退費', approval:'HR／機構管理者核准'},
  rulesOffline:{leave:'寬鬆規則（企業合約）', makeup:'僅提供回放', validity:'依堂數門檻延展', refund:'不可退費不可轉讓', approval:'HR／機構管理者核准'},
  brandExposure:'整個掛TLI', domain:'enterprise.tli.com.tw', sender:'TLI 企業培訓服務'},
 {code:'PRJ-EDU-AZU', name:'大學加盟．美國 範例大學', market:'美國', status:'已上線', from:'2026-02-01', to:'2029-01-31', version:'v1', tpl:'tpl-edu',
  sell:{categories:['cat-1on1','cat-group','cat-selfpaced'], items:[]}, openRange:true,
  channels:{direct:false,franchise:true,distributor:false,agent:false}, partners:['範例大學語言中心'],
  rulesOnline:{leave:'嚴格規則（機構加盟）', makeup:'僅可補課，無回放', validity:'一次性（效期到即失效）', refund:'不可退費不可轉讓', approval:'僅能改期不能取消'},
  rulesOffline:{leave:'嚴格規則（機構加盟）', makeup:'不可補課不提供回放', validity:'一次性（效期到即失效）', refund:'不可退費不可轉讓', approval:'僅能改期不能取消'},
  brandExposure:'雙品牌並列', domain:'sample-u.tliconnect.com', sender:'Sample University × TLI'},
 {code:'PRJ-RESELL-SEA', name:'個人線上課．東南亞經銷', market:'東南亞', status:'草稿', from:'2026-10-01', to:'2027-09-30', version:'v1', tpl:'tpl-resell',
  sell:{categories:[], items:['pkg1on1-01','pkggroup-01']}, openRange:false,
  channels:{direct:false,franchise:false,distributor:true,agent:false}, partners:['大馬旅遊教育集團'],
  rulesOnline:{leave:'標準線上規則', makeup:'可補課＋提供回放', validity:'每月重置', refund:'可退費可轉讓', approval:'學員自主'},
  rulesOffline:{leave:'標準實體規則', makeup:'僅可補課，無回放', validity:'一次性（效期到即失效）', refund:'只可轉讓不可退費', approval:'學員自主'},
  brandExposure:'完全不露出', domain:'（由經銷商自有通路銷售，無獨立網域）', sender:'（由經銷商自有品牌發送）'}
];

/* ---- 15. 教學影片庫（20260930 新增，來源 a03「產品詳情」CONTENT_VIDEOS；供自學課程單元挑選教學影片用。
   欄位刻意精簡，只留單元挑選需要的部分；a18「資源庫」影片庫本身有更完整的管理欄位（狀態／標籤／來源等），
   兩邊示範資料的影片主題彼此對應但非同一份，正式串接時建議合併為一份 ---- */
var videoLibrary = [
 {id:'cv1', name:'機場入境情境示範', en:'Airport Arrival Scenario Demo', platform:'Vimeo', duration:'6:20'},
 {id:'cv2', name:'校園生活會話示範', en:'Campus Life Conversation Demo', platform:'CloudFront', duration:'7:05'},
 {id:'cv3', name:'商務會議開場示範', en:'Business Meeting Opening Demo', platform:'Vimeo', duration:'6:45'},
 {id:'cv4', name:'電話聯繫用語示範', en:'Phone Contact Phrases Demo', platform:'Vimeo', duration:'5:50'},
 {id:'cv5', name:'Email 商務書信示範', en:'Business Email Writing Demo', platform:'Vimeo', duration:'6:10'},
 {id:'cv6', name:'產品簡報練習示範', en:'Product Presentation Practice Demo', platform:'CloudFront', duration:'7:30'},
 {id:'cv7', name:'價格協商情境示範', en:'Price Negotiation Scenario Demo', platform:'Vimeo', duration:'6:55'},
 {id:'cv8', name:'期中口說總複習示範', en:'Midterm Speaking Review Demo', platform:'Vimeo', duration:'8:10'}
];

/* ---- 16. 測驗庫（20260930 新增，來源 a03「產品詳情」CONTENT_QUIZZES；供自學課程單元挑選單元測驗用，
   source：'self' 平台自建／'wordwall' 外部 Wordwall 資源 ---- */
var quizzes = [
 {id:'qz_u1', name:'第 1 單元：機場入境與問候・單元測驗', en:'Unit 1: Airport Arrival & Greetings · Unit Quiz', source:'self'},
 {id:'qz_u2', name:'第 2 單元：校園生活會話・單元測驗', en:'Unit 2: Campus Life Conversation · Unit Quiz', source:'self'},
 {id:'qz_u3', name:'第 3 單元：商務會議開場・單元測驗', en:'Unit 3: Business Meeting Opening · Unit Quiz', source:'self'},
 {id:'qz_u4', name:'第 4 單元：電話聯繫用語・單元測驗', en:'Unit 4: Phone Contact Phrases · Unit Quiz', source:'self'},
 {id:'qz_u5', name:'第 5 單元：Email 商務書信・單元測驗', en:'Unit 5: Business Email Writing · Unit Quiz', source:'self'},
 {id:'qz_u6', name:'第 6 單元：產品簡報練習・單元測驗', en:'Unit 6: Product Presentation Practice · Unit Quiz', source:'self'},
 {id:'qz_u7', name:'第 7 單元：價格協商情境・單元測驗', en:'Unit 7: Price Negotiation Scenario · Unit Quiz', source:'self'},
 {id:'qz_u8', name:'第 8 單元：期中口說總複習・單元測驗', en:'Unit 8: Midterm Speaking Review · Unit Quiz', source:'self'},
 {id:'qz_ww01', name:'機場情境互動練習（Wordwall・配對遊戲）', en:'Airport Scenario Interactive Practice (Wordwall · Matching Game)', source:'wordwall'},
 {id:'qz_ww02', name:'商務會話綜合練習（Wordwall・隨機轉盤）', en:'Business Conversation Practice (Wordwall · Random Wheel)', source:'wordwall'}
];

/* ---- 17. 組合包（20260930 新增，來源 a04「銷售方案設定」BUNDLES；供 a04／a08 對應組合包促銷下拉共用） ---- */
var bundles = [
 {id:'bd1', name:'新生開學組合', en:'New Student Back-to-School Bundle', type:'bundle', salesMode:'direct', packages:['pk1','pk2'], discountPct:10, channel:['公開網站'], periodStart:'2026-09-01', periodEnd:'2027-02-28', status:'上架'},
 {id:'bd2', name:'企業培訓組合（不顯示於前台）', en:'Corporate Training Bundle (Not Shown on Storefront)', type:'bundle', salesMode:'advisor', packages:['pk4','pk2'], discountPct:15, channel:['企業專案'], periodStart:'', periodEnd:'', status:'上架'}
];

/* ---- 18. 顧問／業務人員（20260930 新增，來源顧問工作台 c08「詢問管理」示範資料；
   20260930 c05／c08 已改讀本集合：fAdvisor／batchAdvisor／reassignSel（c08）與
   payModalWay／payEditWay（c05，見下方 19. 收款方式集合，非本集合） ---- */
var advisors = [
 {id:'adv1', name:'王大明', en:'Wang Da-Ming', campus:'羅斯福校區'},
 {id:'adv2', name:'林顧問', en:'Advisor Lin', campus:'士林校區'},
 {id:'adv3', name:'陳顧問', en:'Advisor Chen', campus:'台中校區'}
];

/* ---- 19. 收款方式（20260930 新增，來源顧問工作台 c05「訂單詳情」示範資料；
   管理後台 a23「金流／收單設定」目前只有 POS 收單機清單，沒有獨立的收款方式集合，
   故本集合以 c05 既有 PAY_WAYS／PAY_WAY_EN 為準整理。availableForNew：登記新收款
   （payModalWay）只開放常用方式；既有收款紀錄（payEditWay）可選到全部方式 ---- */
var paymentMethods = [
 {id:'wire', name:'匯款', en:'Wire Transfer', availableForNew:true, enabled:true},
 {id:'card', name:'信用卡', en:'Credit Card', availableForNew:true, enabled:true},
 {id:'cash', name:'現金', en:'Cash', availableForNew:true, enabled:true},
 {id:'linepay', name:'LinePay', en:'LinePay', availableForNew:true, enabled:true},
 {id:'newebpay', name:'藍新付款連結', en:'NewebPay Payment Link', availableForNew:false, enabled:true},
 {id:'stripe', name:'Stripe（海外學生）', en:'Stripe (Overseas Students)', availableForNew:false, enabled:true},
 {id:'posterm', name:'現場刷卡機', en:'On-site Card Terminal', availableForNew:false, enabled:true}
];

/* ---- 19. 會員學習主題（20260930 新增；三個會員頁情境各自的挑選清單彼此獨立，用子物件分組。
   chatTopics 僅提供 m14／m14b 下拉選項與翻譯，主題詳細教材（等級／簡介／討論題綱／帶領老師）
   仍在各頁本地 TOPIC_INFO 維護，正式串接時建議與本集合合併 ---- */
var learningTopics = {
  requestCourses: [
   {id:'individual-conversation', name:'中文一對一－會話進階', en:'1-on-1 Mandarin — Advanced Conversation'},
   {id:'individual-listening', name:'中文一對一－聽力加強', en:'1-on-1 Mandarin — Listening Practice'}
  ],
  selfPacedFocus: [
   {id:'發音', name:'發音', en:'Pronunciation'},
   {id:'商務', name:'商務', en:'Business'},
   {id:'生活', name:'生活', en:'Daily Life'},
   {id:'文化', name:'文化', en:'Culture'},
   {id:'寫作', name:'寫作', en:'Writing'},
   {id:'聽力', name:'聽力', en:'Listening'}
  ],
  chatTopics: [
   {id:'日常對話練習', name:'日常對話練習', en:'Everyday Conversation Practice'},
   {id:'時事話題討論', name:'時事話題討論', en:'Current Events Discussion'},
   {id:'商務情境會話', name:'商務情境會話', en:'Business Scenario Conversation'},
   {id:'旅遊實用會話', name:'旅遊實用會話', en:'Practical Travel Conversation'},
   {id:'影視片段討論', name:'影視片段討論', en:'Film Clip Discussion'},
   {id:'文化觀察分享', name:'文化觀察分享', en:'Cultural Observation Sharing'}
  ]
};

/* ================= 工具函式 ================= */
function options(listName, opts){
  opts = opts || {};
  var valueKey = opts.valueKey || 'id';
  var labelKey = opts.labelKey || 'name';
  var list = global.TLI_MASTERS[listName] || [];
  if (opts.filter) list = list.filter(opts.filter);
  return list.map(function(item){
    return '<option value="'+item[valueKey]+'">'+item[labelKey]+'</option>';
  }).join('');
}
function byId(listName, id){
  var list = global.TLI_MASTERS[listName] || [];
  return list.find(function(item){ return item.id === id; }) || null;
}
var MANAGE_LINKS = {
  campuses:'a17_master_data.html#master-campus',
  deliveryModes:'a17_master_data.html#master-mode',
  teachLangs:'a17_master_data.html#master-lang',
  levelSystems:'a17_master_data.html#master-level',
  uiLocales:'a17_master_data.html#master-lang',
  ruleSets:'a17_master_data.html#rule-cancel',
  videoTools:'a17_master_data.html#rule-classroom',
  productCategories:'a02_products.html',
  products:'a02_products.html',
  teachers:'a10_teachers.html',
  orgCustomers:'a19_b2b_enterprise.html',
  partners:'a20_agents.html',
  packages:'a04_packages.html',
  projects:'a21_projects.html',
  videoLibrary:'a18_resource_library.html',
  quizzes:'a22_quizzes.html',
  bundles:'a04_packages.html',
  advisors:'a14_feedback.html',
  paymentMethods:'a23_payment_gateways.html'
};
function manageLink(listName){
  var href = MANAGE_LINKS[listName] || 'a17_master_data.html';
  return '<a class="manage-link" href="'+href+'">管理選項 →</a>';
}

global.TLI_MASTERS = {
  campuses: campuses,
  deliveryModes: deliveryModes,
  teachLangs: teachLangs,
  levelSystems: levelSystems,
  uiLocales: uiLocales,
  /* 20260929 會員分類（客戶 2024-08 原文定義）：全站顯示一律「中文（代碼）」，選 B／G 才需填企業／機構名稱 */
  memberTiers: [
    {code:'C',   name:'一般學生',         en:'Individual',            needOrg:false},
    {code:'BIP', name:'公司預算未簽約',   en:'Company-funded (no contract)', needOrg:false},
    {code:'B',   name:'企業簽約',         en:'Corporate contract',    needOrg:true},
    {code:'G',   name:'政府單位',         en:'Government contract',   needOrg:true}
  ],
  ruleSets: ruleSets,
  videoTools: videoTools,
  productCategories: productCategories,
  products: products,
  teachers: teachers,
  partners: partners,
  orgCustomers: orgCustomers,
  packages: packages,
  projects: projects,
  videoLibrary: videoLibrary,
  quizzes: quizzes,
  bundles: bundles,
  advisors: advisors,
  paymentMethods: paymentMethods,
  learningTopics: learningTopics,
  guessLevelId: guessLevelId,
  options: options,
  byId: byId,
  manageLink: manageLink
};

})(window);
