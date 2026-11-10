/* 後台角色與人員示範資料：a09 帳號管理、a27 角色管理、a28 操作紀錄共用（20261110 由 a09 拆出）
 * 需在 _phase_core.js、_i18n.js 之後載入。原型無後端，各頁的新增／修改只存在當頁，換頁會還原。 */
var ROLES = ['總公司管理者','校區主管','行政人員','財務','顧問','顧問專員','顧問主管','總部專員','總部主管','系統管理員','系統客服','校務','其他'];
/* 顧問專員～系統管理員：使用者 2026-11-06 提供的角色清單截圖補入；系統客服、校務、其他：同日截圖「職員新增 → 員工角色」下拉選單補入（原為簡體，「顧問」已存在不重複加）；各角色預設權限與資料範圍尚無依據，先全部留空／全公司，待確認 */
var ACCOUNTS = [
 {id:'u1', name:'王大明', email:'daming.wang@tli.example', roles:['總公司管理者'], units:['總公司'], status:'啟用', lastLogin:'2026-08-25 09:12'},
 {id:'u2', name:'李美玲', email:'meiling.lee@tli.example', roles:['校區主管'], units:['士林校區'], status:'啟用', lastLogin:'2026-08-24 17:40'},
 {id:'u3', name:'陳俊宏', email:'junhong.chen@tli.example', roles:['校區主管','顧問'], units:['台中校區'], status:'啟用', lastLogin:'2026-08-23 11:05'},
 {id:'u4', name:'林秀娟', email:'hsiuchuan.lin@tli.example', roles:['行政人員'], units:['士林校區'], status:'啟用', lastLogin:'2026-08-25 08:50'},
 {id:'u5', name:'黃志成', email:'chihcheng.huang@tli.example', roles:['財務','行政人員'], units:['總公司'], status:'啟用', lastLogin:'2026-08-24 15:22'},
 {id:'u6', name:'顧問 A', email:'advisorA@tli.example', roles:['顧問'], units:['羅斯福校區'], status:'啟用', lastLogin:'2026-08-25 10:03'},
 {id:'u7', name:'顧問 D', email:'advisorD@tli.example', roles:['顧問'], units:['士林校區'], status:'停用', lastLogin:'2026-06-11 09:30'}
];
/* 一人可兼任多個角色（客戶需求）：功能權限取各角色聯集 */
/* 檢視階段：校區與實體分校屬第二階段，1A～1C 不出現校區主管角色、校區帳號與校區資料範圍，所屬單位欄位一併隱藏 */
var SHOW_UNIT = TLI_PHASE.atLeast('2');
if (!SHOW_UNIT) {
  ROLES = ROLES.filter(function(r){ return r !== '校區主管'; });
  ACCOUNTS.forEach(function(a){ a.roles = a.roles.filter(function(r){ return r !== '校區主管'; }); a.units = ['總公司']; });
  ACCOUNTS = ACCOUNTS.filter(function(a){ return a.roles.length > 0; });
}
/* 系統至少要留一位啟用中的總公司管理者；此角色固定擁有全部權限 */
var ADMIN_ROLE = '總公司管理者';
function i18nT(zh, en){ return window.TLI_I18N ? TLI_I18N.t(zh, en) : zh; }
var ROLE_EN = {'總公司管理者':'HQ Administrator','校區主管':'Campus Manager','行政人員':'Admin Staff','財務':'Finance','顧問':'Advisor','顧問專員':'Advisor Specialist','顧問主管':'Advisor Supervisor','總部專員':'HQ Specialist','總部主管':'HQ Supervisor','系統管理員':'System Administrator','系統客服':'Customer Service','校務':'Academic Affairs','其他':'Other'};
function roleLabel(r){ return i18nT(r, ROLE_EN[r] || r); }
function roleMemberCount(r){ return ACCOUNTS.filter(function(a){ return a.roles.indexOf(r) > -1; }).length; }
