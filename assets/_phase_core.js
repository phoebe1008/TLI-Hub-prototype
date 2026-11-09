/* 原型「檢視階段」核心：放在每頁 <head>，頁面腳本執行前就決定目前檢視階段
 * 頁內用法：
 *   HTML 區塊：<div data-phase="1C">…</div>      → 檢視階段早於 1C 時隱藏（1C、二階段才顯示）
 *              <div data-phase-max="1A">…</div>  → 只在 1A 顯示（1B 起隱藏），用於 1A 專屬說明
 *   JS 資料：  if (TLI_PHASE.atLeast('1B')) { …經銷相關… }
 * 階段值：'1A'、'1B'、'1C'、'2'（第二階段）；累計：選 1B＝1A＋1B 上線的範圍；預設 '2'（全部） */
(function () {
  var ORDER = ['1A', '1B', '1C', '2'];
  var NAME = { '1A': '一階段 A', '1B': '一階段 B', '1C': '一階段 C', '2': '第二階段' };
  var view = '2';
  try { var v = localStorage.getItem('tliPhaseView'); if (ORDER.indexOf(v) >= 0) { view = v; } } catch (e) {}
  function rank(p) { var i = ORDER.indexOf(p); return i < 0 ? ORDER.length - 1 : i; }
  window.TLI_PHASE = {
    ORDER: ORDER, NAME: NAME, view: view, rank: rank,
    atLeast: function (p) { return rank(view) >= rank(p); },
    is: function (p) { return view === p; }
  };
  document.documentElement.setAttribute('data-ph-view', view);
  /* 依目前階段產生隱藏規則：晚於目前階段的 data-phase、早於目前階段的 data-phase-max */
  var rules = [];
  ORDER.forEach(function (p) {
    if (rank(p) > rank(view)) { rules.push('[data-phase="' + p + '"]'); }
    if (rank(p) < rank(view)) { rules.push('[data-phase-max="' + p + '"]'); }
  });
  if (rules.length) {
    var st = document.createElement('style'); st.id = 'tliPhaseCss';
    st.textContent = rules.join(',') + '{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }
})();
