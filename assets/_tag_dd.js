/* 內容標籤下拉選單：可複選、選單內可用關鍵字篩選；已選的標籤以小標籤顯示在欄位內，可按 × 移除。
 * 20261110 使用者要求：資源庫 a18 的內容標籤由整排按鈕改為下拉選單，並同步到 a02 課程編輯器、a25 教材管理的素材挑選器「新增」分頁。
 * 20261110 起 a18 列表上方的「內容標籤」篩選也用這個元件（未選＝全部）。
 * 用法：TLI_TagDD.html(id, selectedArray, optionsArray, onChange, placeholder)
 *   - selectedArray 由呼叫端持有，元件直接增刪其內容（不換成新陣列），呼叫端隨時讀同一個陣列即可
 *   - onChange()：勾選或移除後呼叫，供呼叫端重新檢查必填
 * 需在 _i18n.js 之後載入（取 TLI_I18N.t 做中英切換；沒有也可運作）。 */
(function(){
  var REG = {};
  function t(zh, en){ return window.TLI_I18N ? TLI_I18N.t(zh, en) : zh; }
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  var css = ''
    + '.tagdd{position:relative;text-align:left;}'
    + '.tagdd-trigger{display:flex;flex-wrap:wrap;gap:4px;align-items:center;min-height:36px;padding:4px 30px 4px 8px;border:1px solid var(--g200,#E5E7EB);'
    + 'border-radius:6px;background:#fff;cursor:pointer;position:relative;box-sizing:border-box;}'
    + '.tagdd-trigger:after{content:"";position:absolute;right:12px;top:50%;width:6px;height:6px;border-right:1.5px solid var(--g500,#6B7280);'
    + 'border-bottom:1.5px solid var(--g500,#6B7280);transform:translateY(-70%) rotate(45deg);}'
    + '.tagdd.open .tagdd-trigger{border-color:var(--navy,#1F3A68);}'
    + '.tagdd-ph{color:var(--g500,#6B7280);font-size:13px;padding-left:2px;}'
    + '.tagdd-chip{display:inline-flex;align-items:center;gap:2px;background:#FCE9DA;color:var(--orange,#C8641E);border-radius:10px;padding:2px 3px 2px 9px;font-size:12px;}'
    + '.tagdd-chip button{background:none;border:none;color:inherit;cursor:pointer;font-size:13px;line-height:1;padding:0 4px;font-family:inherit;width:auto;}'
    + '.tagdd-panel{display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);background:#fff;border:1px solid var(--g200,#E5E7EB);'
    + 'border-radius:8px;box-shadow:0 8px 24px rgba(16,24,40,.12);z-index:30;padding:8px;}'
    + '.tagdd.open .tagdd-panel{display:block;}'
    + '.tagdd .tagdd-panel input.tagdd-q{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid var(--g200,#E5E7EB);border-radius:6px;font-size:13px;font-family:inherit;margin:0;}'
    + '.tagdd-list{max-height:200px;overflow-y:auto;margin-top:6px;}'
    + '.tagdd label.tagdd-opt{display:flex !important;align-items:center;gap:8px;padding:6px;margin:0;border-radius:4px;font-size:13px;color:var(--g900,#111827);cursor:pointer;font-weight:normal;}'
    + '.tagdd label.tagdd-opt:hover{background:var(--g50,#F9FAFB);}'
    + '.tagdd label.tagdd-opt input{width:auto !important;padding:0;margin:0;flex:none;}'
    + '.tagdd-empty{padding:8px 6px;font-size:12.5px;color:var(--g500,#6B7280);}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function triggerInner(id){
    var r = REG[id];
    if (!r.sel.length) return '<span class="tagdd-ph">'+(r.ph ? t(r.ph[0], r.ph[1]) : t('請選擇內容標籤','Select content tags'))+'</span>';
    return r.sel.map(function(tag, i){
      return '<span class="tagdd-chip">'+esc(tag)+'<button type="button" onclick="event.stopPropagation();TLI_TagDD.remove(\''+id+'\','+i+')" aria-label="'+t('移除','Remove')+'">×</button></span>';
    }).join('');
  }
  function optionsHtml(id){
    var r = REG[id], q = r.q.trim().toLowerCase();
    var rows = r.options.map(function(tag, i){
      if (q && String(tag).toLowerCase().indexOf(q) < 0) return '';
      return '<label class="tagdd-opt"><input type="checkbox" '+(r.sel.indexOf(tag) > -1 ? 'checked' : '')+' onchange="TLI_TagDD.pick(\''+id+'\','+i+')">'+esc(tag)+'</label>';
    }).join('');
    return rows || '<div class="tagdd-empty">'+t('找不到符合的標籤','No matching tags')+'</div>';
  }
  function refresh(id){
    var trig = document.getElementById('tagdd_trig_'+id); if (trig) trig.innerHTML = triggerInner(id);
    var list = document.getElementById('tagdd_list_'+id); if (list) list.innerHTML = optionsHtml(id);
    if (REG[id].onChange) REG[id].onChange();
  }
  function closeAll(){ document.querySelectorAll('.tagdd.open').forEach(function(d){ d.classList.remove('open'); }); }

  window.TLI_TagDD = {
    /* placeholder（選填）：[中文, 英文]，未選任何標籤時顯示；例：篩選用的 ['全部','All'] */
    html: function(id, sel, options, onChange, placeholder){
      var prev = REG[id];
      REG[id] = {sel:sel, options:options || [], onChange:onChange || null, ph:placeholder || null, q:(prev && prev.sel === sel) ? prev.q : ''};
      return '<div class="tagdd" id="tagdd_'+id+'" onclick="event.stopPropagation()">' +
        '<div class="tagdd-trigger" id="tagdd_trig_'+id+'" onclick="TLI_TagDD.toggle(\''+id+'\')">'+triggerInner(id)+'</div>' +
        '<div class="tagdd-panel"><input type="text" class="tagdd-q" id="tagdd_q_'+id+'" value="'+esc(REG[id].q)+'" placeholder="'+t('輸入關鍵字篩選','Filter by keyword')+'" oninput="TLI_TagDD.search(\''+id+'\',this.value)">' +
        '<div class="tagdd-list" id="tagdd_list_'+id+'">'+optionsHtml(id)+'</div></div></div>';
    },
    toggle: function(id){
      var dd = document.getElementById('tagdd_'+id);
      if (!dd) return;
      var willOpen = !dd.classList.contains('open');
      closeAll();
      if (willOpen){ dd.classList.add('open'); var q = document.getElementById('tagdd_q_'+id); if (q) q.focus(); }
    },
    search: function(id, v){ REG[id].q = v; var list = document.getElementById('tagdd_list_'+id); if (list) list.innerHTML = optionsHtml(id); },
    pick: function(id, idx){
      var r = REG[id], tag = r.options[idx], j = r.sel.indexOf(tag);
      if (j > -1) r.sel.splice(j, 1); else r.sel.push(tag);
      refresh(id);
    },
    remove: function(id, i){ REG[id].sel.splice(i, 1); refresh(id); },
    closeAll: closeAll
  };
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeAll(); });
})();
