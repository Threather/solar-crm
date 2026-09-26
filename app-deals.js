/* ---------------- Edit deals: a scope of the EDC screen (admin) ----------------
   One table of every won deal where admin corrects what the record says: the
   EDC file with its branch and the BOQ first, then installation, the customer
   and the system.
   Asked for on 27 Sep 2026 for Cheanich - EDC dates could only be typed while
   a deal was still on the worklist (Submitted is read-only), and BOQ or an
   install date meant opening the lead, unlocking it and finding the box.
   It lives inside EDC rather than on the nav, as Kevin asked.

   Every cell saves the moment it changes, like the EDC worklist. The tabs are
   column sets over the same rows, so the table fits a laptop screen. */
let DEALS=[], DEALTAB='edc', DEALF={q:'',sys:''}, DEALPAGE=0;

/* called by renderEdc with the won deals it has already fetched */
function drawEditDeals(rows){
  /* the table needs the whole screen, not the 1180px reading width */
  $('main').style.maxWidth='none';
  DEALS=rows.slice().sort((a,b)=>String(b.stage_entered_at||'').localeCompare(String(a.stage_entered_at||'')));
  const tab=(k,label)=>`<button class="${DEALTAB===k?'on':''}" onclick="DEALTAB='${k}';drawDeals();paintDealTabs()" data-tab="${k}">${label}</button>`;
  return `
    <div class="toolbar">
      <div class="scope" id="deal-tabs">${tab('edc','EDC &amp; BOQ')}${tab('install','Installation')}${tab('cust','Customer')}${tab('sys','System')}</div>
      <input placeholder="Search name, phone or ref ID…" value="${esc(DEALF.q)}" oninput="DEALF.q=this.value;DEALPAGE=0;drawDeals()">
      <select onchange="DEALF.sys=this.value;DEALPAGE=0;drawDeals()" title="System type">
        <option value="">All systems</option>${SYSTEM_TYPES.map(v=>opt(v,DEALF.sys)).join('')}<option value="-" ${DEALF.sys==='-'?'selected':''}>Not set</option></select>
    </div>
    <div id="dealwrap"></div>`;
}
function paintDealTabs(){
  document.querySelectorAll('#deal-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===DEALTAB));
}
/* older rows carry only city_province, as the lead modal allows for */
const dealProv=l=>l.province||l.city_province||'';

function dealRows(){
  const q=DEALF.q.trim().toLowerCase();
  return DEALS.filter(l=>{
    if(q&&![l.customer_name,l.phone,l.ref_id].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(DEALF.sys==='-'?!!l.system_type:DEALF.sys&&l.system_type!==DEALF.sys)return false;
    return true;
  });
}

function drawDeals(){
  const wrap=$('dealwrap'); if(!wrap)return;
  const found=dealRows();
  const band=b=>found.filter(l=>dealBand(l)===b);
  const bands=DEALTAB!=='edc'?'':`<div class="scope saleview">${[['small','10 kWac or under'],['large','Above 10 kWac'],['miss','Not placed yet']]
    .map(([b,t])=>`<button class="${DEALBAND===b?'on':''}" onclick="DEALBAND='${b}';DEALPAGE=0;drawDeals()">${t} (${band(b).length})</button>`).join('')}</div>`;
  const all=DEALTAB==='edc'?band(DEALBAND):found;
  if(!all.length){wrap.innerHTML=bands+blank('No won deal here','Clear the search or the filters, or pick another size above.');return;}
  const pages=Math.ceil(all.length/PAGE_SIZE);
  if(DEALPAGE>pages-1)DEALPAGE=pages-1;
  const rows=all.slice(DEALPAGE*PAGE_SIZE,(DEALPAGE+1)*PAGE_SIZE);
  const cols=dealCols();
  wrap.innerHTML=bands+`<div class="tablewrap deals"><table><thead><tr>
      <th>Customer</th>${cols.map(c=>`<th title="${esc(c.tip||'')}">${c.head}</th>`).join('')}
    </tr></thead><tbody>`
    +rows.map(l=>`<tr id="deal-${l.id}">${dealRow(l)}</tr>`).join('')
    +`</tbody></table></div>`
    +(pages>1?`<div class="pager">
      <button class="btn-line" onclick="DEALPAGE--;drawDeals()" ${DEALPAGE?'':'disabled'}>Previous</button>
      <span class="pg">${DEALPAGE*PAGE_SIZE+1}–${Math.min(all.length,(DEALPAGE+1)*PAGE_SIZE)} of ${all.length}</span>
      <button class="btn-line" onclick="DEALPAGE++;drawDeals()" ${DEALPAGE<pages-1?'':'disabled'}>Next</button></div>`:'');
}
function dealRow(l){
  return `<td class="who"><b>${esc(l.customer_name)}</b>
      <a class="refid" onclick="openLead('${l.id}')" title="Open the lead">${esc(l.ref_id||'no ref')}</a>
      <span class="days">won ${fmtDate(l.stage_entered_at)}</span></td>`
    +dealCols().map(c=>`<td>${c.cell(l)}</td>`).join('');
}
/* redraw one row after a save, so a derived cell (kWac, the EDC band, the
   commune list) follows without the table losing its place */
function redrawDeal(id){
  const l=DEALS.find(x=>x.id===id), tr=$('deal-'+id);
  /* a system type or inverter size can move the deal to another size band */
  if(l&&DEALTAB==='edc'&&dealBand(l)!==DEALBAND){drawDeals();return;}
  if(l&&tr)tr.innerHTML=dealRow(l);
}

/* the cells. `k` is the column; every input calls saveDeal with it. */
const dDate=(l,k)=>`<input type="date" value="${l[k]||''}" onchange="saveDeal('${l.id}','${k}',this.value,this)">`;
const dText=(l,k,w)=>`<input style="min-width:${w||140}px" value="${esc(l[k]||'')}" onchange="saveDeal('${l.id}','${k}',this.value,this)">`;
const dSel=(l,k,arr,w)=>`<select style="min-width:${w||120}px" onchange="saveDeal('${l.id}','${k}',this.value,this)">${optList(arr,l[k])}</select>`;
const dNum=(l,k,int,w)=>numBox('dn-'+k+'-'+l.id,l[k],{attrs:`style="min-width:${w||70}px;width:${w||70}px" onchange="saveDeal('${l.id}','${k}',this.value,this)"`},int);
/* an EDC step that belongs to the other size band is not a blank to fill */
const dEdc=(l,k)=>{
  const f=edcFields(l);
  if(edcExempt(l))return '<span class="quiet">Off-Grid</span>';
  if(!f)return '<span class="quiet" title="Set the system type and inverter on the System tab">—</span>';
  if(!f.some(([x])=>x===k))return '<span class="quiet">n/a</span>';
  const next=f.find(([x])=>!l[x]);
  return `<span class="${next&&next[0]===k?'edc-next':''}" style="display:block">${dDate(l,k)}</span>`;
};
const dealEdcBand=l=>edcExempt(l)?'Exempt':!edcFields(l)?'<span class="quiet">no spec</span>'
  :`${kwac(l)} kWac<span class="days">${edcDone(l)} of ${edcFields(l).length} done</span>`;

/* Two related fields share a cell, one above the other, so every tab fits a
   laptop screen with no sideways scrolling (Kevin, 27 Sep 2026: the right
   end of the table was cut off). Each carries its own small label. */
const stk=(...parts)=>`<div class="stk">${parts.map(([lab,html])=>`<label>${lab}</label>${html}`).join('')}</div>`;
const dEng=l=>`<select onchange="saveDeal('${l.id}','site_engineer_id',this.value,this)"><option value="">—</option>${
  STAFF.filter(s=>s.role==='site_engineer'&&(s.is_active||s.id===l.site_engineer_id))
    .map(s=>`<option value="${s.id}" ${s.id===l.site_engineer_id?'selected':''}>${esc(s.full_name)}</option>`).join('')}</select>`;
const dealOffice=l=>stk(['Branch',dSel(l,'edc_branch',EDC_BRANCHES)],['EDC price',dNum(l,'edc_fee_usd',false,90)]);
const dealBoq=l=>stk(['BOQ',dSel(l,'boq_status',BOQ_STATUS)],['BOQ date',dDate(l,'boq_date')]);

/* The EDC tab shows one size band at a time, because the two bands have
   different steps: two dates at 10 kWac or under, five above. Deals EDC cannot
   place yet get their own view with the two fields that place them. */
const DEAL_EDC={
  small:[{head:'Size',cell:dealEdcBand},{head:'EDC office',cell:dealOffice},{head:'BOQ',cell:dealBoq},
    ...EDC_SMALL.map(([k,s,f])=>({head:s,tip:f,cell:l=>dEdc(l,k)}))],
  /* five dates leave no room for a size column; the size rides under the office */
  large:[{head:'EDC office &amp; BOQ',cell:l=>dealOffice(l)+dealBoq(l)+`<div class="days" style="margin-top:4px">${kwac(l)} kWac · ${edcDone(l)} of 5 done</div>`},
    ...EDC_LARGE.map(([k,s,f])=>({head:s,tip:f,cell:l=>dEdc(l,k)}))],
  miss:[
    {head:'Why',cell:l=>edcExempt(l)?'<span class="quiet">Off-Grid, no EDC</span>':!edcApplies(l)?'<b>No system type</b>':'<b>No inverter size</b>'},
    {head:'System type',cell:l=>dSel(l,'system_type',SYSTEM_TYPES)},
    {head:'Inverter',cell:l=>`<div class="inl">${dNum(l,'inverter_kw',false,60)}<span>kW ×</span>${dNum(l,'inverter_pcs',true,48)}<span>pcs</span></div>`},
    {head:'BOQ',cell:dealBoq},
    {head:'Sale engineer',cell:l=>esc(staffName(l.assigned_to))}]
};
const DEAL_COLS={
  install:[
    {head:'Delivery',cell:l=>dDate(l,'delivery_date')},
    {head:'Install start',cell:l=>dDate(l,'installation_start')},
    {head:'Install end',cell:l=>dDate(l,'installation_end')},
    {head:'Who installs',cell:l=>stk(['Team',dSel(l,'installation_team',INSTALL_TEAMS)],['Site engineer',dEng(l)])}
  ],
  cust:[
    {head:'Name',cell:l=>dText(l,'customer_name',160)},
    {head:'Type &amp; phone',cell:l=>stk(['Type',dSel(l,'customer_type',CUSTOMER_TYPES)],['Phone',dText(l,'phone',120)])},
    {head:'Address',cell:l=>dText(l,'site_address',200)},
    {head:'Location',cell:l=>stk(
      ['Province',`<select onchange="saveDeal('${l.id}','province',this.value,this)">${optList(PROVINCES,dealProv(l))}</select>`],
      ['District',dSel(l,'district',Object.keys(GEO[dealProv(l)]||{}))],
      ['Commune',dSel(l,'commune',((GEO[dealProv(l)]||{})[l.district])||[])])}
  ],
  sys:[
    {head:'System',cell:l=>stk(['Type',dSel(l,'system_type',SYSTEM_TYPES)],['Phase',dSel(l,'phase_type',PHASE_TYPES)])},
    {head:'Panel',cell:l=>stk(['Brand',dSel(l,'panel_brand',PANEL_BRANDS)],
      ['Watt × pcs',`<div class="inl">${dNum(l,'panel_watt',true,60)}<span>×</span>${dNum(l,'panel_pcs',true,48)}</div>`])},
    {head:'Inverter',cell:l=>stk(['Brand',dSel(l,'inverter_brand',INVERTER_BRANDS)],
      ['kW each × pcs',`<div class="inl">${dNum(l,'inverter_kw',false,60)}<span>×</span>${dNum(l,'inverter_pcs',true,48)}</div>`])},
    {head:'Battery',cell:l=>stk(['Brand',dSel(l,'battery_brand',BATTERY_BRANDS)],
      ['kWh each × pcs',`<div class="inl">${dNum(l,'battery_kwh_each',false,60)}<span>×</span>${dNum(l,'battery_pcs',true,48)}</div>`])}
  ]
};
let DEALBAND='small';
const dealBand=l=>!edcApplies(l)||!edcFields(l)?'miss':edcFields(l)===EDC_SMALL?'small':'large';
const dealCols=()=>DEALTAB==='edc'?DEAL_EDC[DEALBAND]:DEAL_COLS[DEALTAB];

/* One save for every cell. The derived columns the lead modal works out on
   save - panel kWp, battery total, inverter total - are worked out here too,
   or EDC would read a stale kWac. */
async function saveDeal(id,k,raw,el){
  const l=DEALS.find(x=>x.id===id); if(!l)return;
  let v=String(raw==null?'':raw).trim()||null;
  const NUM=['edc_fee_usd','panel_watt','panel_pcs','inverter_kw','inverter_pcs','battery_kwh_each','battery_pcs'];
  if(v!==null&&NUM.includes(k)){v=Number(v);if(isNaN(v)||v<0){toast('That must be a number');el.value=l[k]??'';return;}}
  const cur=k==='province'?(dealProv(l)||null):(l[k]??null);
  if(cur===v||(cur!=null&&v!=null&&String(cur)===String(v)))return;
  if(k==='customer_name'&&!v){toast('Customer name cannot be empty');el.value=l[k]||'';return;}
  /* Done with no date breaks BOQ turnaround - the same guard as the lead */
  if(k==='boq_status'&&v==='Done'&&!l.boq_date){
    toast('Set the BOQ date first, then mark it Done');el.value=l[k]||'';return;}
  if(k==='boq_date'&&!v&&l.boq_status==='Done'){
    toast('BOQ is Done, so it needs its date');el.value=l[k]||'';return;}
  const upd={[k]:v};
  if(k==='province'){upd.city_province=v;upd.district=null;upd.commune=null;}
  if(k==='district')upd.commune=null;
  const n=x=>Number(x??0)||0, nx={...l,...upd};
  if(k==='panel_watt'||k==='panel_pcs')upd.panel_kwp=(n(nx.panel_watt)*n(nx.panel_pcs)/1000)||null;
  if(k==='inverter_kw'||k==='inverter_pcs')upd.inverter_kw_total=(n(nx.inverter_kw)*n(nx.inverter_pcs))||null;
  if(k==='battery_kwh_each'||k==='battery_pcs'){
    const t=n(nx.battery_kwh_each)*n(nx.battery_pcs);upd.battery_kwh=t?String(+t.toFixed(2)):null;}
  const {error}=await sb.from('leads').update(upd).eq('id',id);
  if(error){toast('Could not save. '+why(error));console.error(error);el.value=l[k]??'';return;}
  Object.assign(l,upd);
  /* EDC lines keep the wording the EDC worklist writes, so they stay out of
     the Remarks column the same way; anything else is a plain edit line */
  if(k==='edc_fee_usd')await logActivity(id,'edit',null,null,'EDC price: '+(v==null?'cleared':fmtMoney(v)));
  else if(k==='edc_branch')await logActivity(id,'edit',null,null,'EDC branch: '+(v||'cleared'));
  else if(/^edc_.*_date$/.test(k))await logActivity(id,'edit',null,null,'EDC '+k.replace(/^edc_/,'').replace(/_/g,' ')+': '+(v||'cleared'));
  else await logActivity(id,'edit',null,null,null);
  toast('Saved');
  redrawDeal(id);
}
