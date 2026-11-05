/* ---------------- Heading filters, shared (7 Oct 2026) ----------------
   One filter for every table that has one: a quiet funnel beside the column
   name, a card with search, Select all and counts, and chips above the table
   saying what is on. The Sales Report and EDC both use it, so the two look and
   behave the same. A screen supplies the values and what Apply does; this
   file owns only the look. Selecting every value is the same as no filter. */
const HF_ICON='<svg class="hf-ic" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11L9.2 8.6v4.1l-2.4 1.2V8.6z"/></svg>';

/* the heading itself: the name, then the funnel; bold and coloured when on */
function hfHead(label,on,onclick){
  return `<button type="button" class="hf-btn${on?' on':''}" onclick="${onclick}" title="Filter by ${esc(label)}" aria-haspopup="dialog"><span>${esc(label)}</span>${HF_ICON}</button>`;
}

/* A list of months only ever grows, so a filter never shows one. Month ticks
   and a Year box stand in for the rows, which stay in the list hidden and
   still carry the selection - each screen's own filter is untouched. Values
   that are not months, like Not yet, stay as ordinary ticks (5 Nov 2026). */
const MF_PAT=/^([A-Z][a-z]{2,3}) (\d{4})$/;
const MF_NAMES=[...Array(12)].map((_,i)=>monthName('2000-'+String(i+1).padStart(2,'0')).split(' ')[0]);
function mfInit(list,emptyAll,changed){
  const rows=[...list.querySelectorAll('input[type=checkbox]')].map(i=>({i,m:MF_PAT.exec(i.value)})).filter(r=>r.m);
  if(!rows.length)return;
  rows.forEach(r=>{r.i.closest('label').classList.add('mfhid');});
  const years=[...new Set(rows.map(r=>r.m[2]))].sort().reverse();
  const on=rows.filter(r=>r.i.checked), full=on.length===rows.length;
  const curY=!full&&on.length&&new Set(on.map(r=>r.m[2])).size===1?on[0].m[2]:'';
  const inY=rows.filter(r=>!curY||r.m[2]===curY);
  const curM=full||!on.length||on.length===inY.length?[]:[...new Set(on.map(r=>r.m[1]))];
  const box=document.createElement('div');
  box.className='mf';
  box.innerHTML=`<label>Year</label><select><option value="">All years</option>${years.map(y=>`<option ${y===curY?'selected':''}>${y}</option>`).join('')}</select>
    <label>Month</label><div class="mfgrid">${MF_NAMES.map(n=>`<button type="button" class="${curM.includes(n)?'on':''}" data-m="${n}">${n}</button>`).join('')}</div>`;
  const sel=box.querySelector('select'), btns=[...box.querySelectorAll('button')];
  const apply=()=>{
    const y=sel.value, ms=btns.filter(b=>b.classList.contains('on')).map(b=>b.dataset.m), any=y||ms.length;
    rows.forEach(r=>{r.i.checked=any?(!y||r.m[2]===y)&&(!ms.length||ms.includes(r.m[1])):emptyAll;});
    changed();
  };
  sel.onchange=apply;
  btns.forEach(b=>{b.onclick=()=>{b.classList.toggle('on');apply();};});
  list.parentNode.insertBefore(box,list);
  const s=list.parentNode.querySelector(':scope>input,:scope>.hf-sbox');
  if(s&&rows.length>=list.querySelectorAll('input[type=checkbox]').length-7)s.remove();
}
/* one month picked from two boxes, for a screen that shows a single month */
function myPick(cur,years,fn,blank){
  const [y,m]=String(cur||'').split('-');
  return `<span class="mypick"><select onchange="myGo(this,${fn})">${blank?'<option value="">All months</option>':''}${MF_NAMES.map((n,i)=>{const v=String(i+1).padStart(2,'0');return `<option value="${v}" ${v===m?'selected':''}>${n}</option>`;}).join('')}</select>
    <select onchange="myGo(this,${fn})">${blank?'<option value="">All years</option>':''}${years.map(v=>`<option ${String(v)===y?'selected':''}>${v}</option>`).join('')}</select></span>`;
}
function myGo(el,fn){const [m,y]=el.parentNode.querySelectorAll('select');
  if(m.value&&!y.value)y.selectedIndex=1;
  fn(y.value?(m.value?y.value+'-'+m.value:y.value):'');}

let HF=null;
/* o = {title, values:[[value,count],...], selected:[...], apply:fn(selected)} */
function hfOpen(ev,o){
  ev.stopPropagation();hfClose();
  HF=o;
  const sel=new Set(o.selected&&o.selected.length?o.selected:o.values.map(v=>v[0]));
  const box=document.createElement('div');
  box.className='hf-pop';box.id='hf-pop';box.setAttribute('role','dialog');box.setAttribute('aria-label','Filter '+o.title);
  box.onclick=e=>e.stopPropagation();
  box.innerHTML=`<div class="hf-title">${esc(o.title)}</div>
    ${o.values.length>7?'<div class="hf-sbox"><input class="hf-search" placeholder="Search" oninput="hfSearch(this.value)"></div>':''}
    <label class="hf-row hf-all"><input type="checkbox" onchange="hfAll(this.checked)"><span class="hf-v">Select all</span></label>
    <div class="hf-list">${o.values.map(([v,n])=>`<label class="hf-row" data-v="${esc(String(v).toLowerCase())}">
      <input type="checkbox" value="${esc(v)}" ${sel.has(v)?'checked':''} onchange="hfSync()"><span class="hf-v" title="${esc(v)}">${esc(v)}</span><span class="hf-n">${n}</span></label>`).join('')}</div>
    <div class="hf-foot"><button type="button" class="hf-reset" onclick="hfReset()">Reset</button>
      <button type="button" class="hf-apply" onclick="hfApply()">Apply</button></div>`;
  document.body.appendChild(box);
  mfInit(box.querySelector('.hf-list'),true,hfSync);
  if(box.querySelector('.mf')&&!box.querySelector('.hf-list label:not(.mfhid)'))box.querySelector('.hf-all').style.display='none';
  hfSync();
  const r=ev.currentTarget.getBoundingClientRect();
  box.style.left=Math.max(12,Math.min(r.left,window.innerWidth-box.offsetWidth-12))+'px';
  box.style.top=(r.bottom+6+window.scrollY)+'px';
  const s=box.querySelector('.hf-search');(s||box.querySelector('.hf-apply')).focus({preventScroll:true});
  setTimeout(()=>{document.addEventListener('click',hfClose);document.addEventListener('keydown',hfKey);},0);
}
const hfBoxes=()=>[...document.querySelectorAll('#hf-pop .hf-list input')];
const hfSeen=i=>{const r=i.closest('.hf-row');return r.style.display!=='none'&&!r.classList.contains('mfhid');};
/* Select all reads the rows the search leaves on screen */
function hfSync(){const vis=hfBoxes().filter(hfSeen);
  const all=document.querySelector('#hf-pop .hf-all input');if(!all)return;
  all.checked=vis.length&&vis.every(i=>i.checked);all.indeterminate=!all.checked&&vis.some(i=>i.checked);}
function hfAll(on){hfBoxes().forEach(i=>{if(hfSeen(i))i.checked=on;});hfSync();}
function hfSearch(q){q=q.trim().toLowerCase();
  hfBoxes().forEach(i=>{const row=i.closest('.hf-row');if(row.classList.contains('mfhid'))return;row.style.display=!q||row.dataset.v.includes(q)?'':'none';});hfSync();}
function hfReset(){const fn=HF&&HF.apply;hfClose();if(fn)fn([]);}
function hfApply(){
  if(!HF)return;
  const boxes=hfBoxes(),picked=boxes.filter(i=>i.checked).map(i=>i.value);
  if(!picked.length){toast('Tick at least one, or press Reset');return;}
  const fn=HF.apply;hfClose();fn(picked.length===boxes.length?[]:picked);
}
function hfKey(e){if(e.key==='Escape')hfClose();if(e.key==='Enter'&&$('hf-pop'))hfApply();}
function hfClose(){const b=$('hf-pop');if(b)b.remove();HF=null;
  document.removeEventListener('click',hfClose);document.removeEventListener('keydown',hfKey);}

/* what is filtered, above the table: one chip per column, each with its own
   remove, and Clear all. `items` = [[label, values, removeOnclick]] */
function hfChips(items,clearAll,note){
  const on=items.filter(i=>i[1]&&i[1].length);
  if(!on.length)return note?`<div class="hf-chips"><span class="hf-note">${note}</span></div>`:'';
  return `<div class="hf-chips">${on.map(([l,v,rm])=>`<span class="hf-chip"><b>${esc(l)}</b> ${esc(v.length===1?v[0]:v.length+' selected')}
    <button type="button" onclick="${rm}" aria-label="Remove ${esc(l)} filter">×</button></span>`).join('')}
    <button type="button" class="hf-clear" onclick="${clearAll}">Clear all</button>${note?`<span class="hf-note">${note}</span>`:''}</div>`;
}
