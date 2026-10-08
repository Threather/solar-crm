/* ---------------- Sales Report: every won deal on one row ----------------
   The client's "Sales Report" sheet (Solarworks Master Lead, 5 Oct 2026),
   column for column, so they can read a won customer's whole history - sale,
   system, installation, EDC and each payment - without opening the lead.
   Admin, the manager and finance; read only. Payment method is blank until
   lead_payments has somewhere to keep it.

   Made easier to read on 7 Oct 2026, when the client found forty columns hard
   going: a filter in each heading that has a short list of values, a
   scrollbar on top as well as underneath, coloured column groups that can be
   hidden, Ref ID and Customer pinned on the left, the headings pinned on top,
   Remaining read as Paid or owed, and a total row. The export keeps every
   column in the client's own order, whatever is hidden on screen. */
let SRROWS=[], SRF={q:''}, SRCF={}, SRHIDE=new Set(), SROPEN='';

const canSalesReport=()=>['admin','manager','finance'].includes(ME.role);

async function renderWonSheet(){
  if(!canSalesReport()){
    $('main').innerHTML=blank('The sales report is not open to your role','Ask an admin if you need it.');return;}
  $('main').innerHTML=SKEL;
  /* forty columns: the table needs the whole screen */
  $('main').style.maxWidth='none';
  const leads=await fetchLeads(q=>q.eq('stage_code',WON));
  const ids=leads.map(l=>l.id);
  const [{data:fins},{data:pays},{data:sale},{data:expd},acts]=await Promise.all([
    rowsOf(()=>sb.from('lead_finance').select('*').order('lead_id')),
    rowsOf(()=>sb.from('lead_payments').select('*').order('paid_on').order('id')),
    rowsOf(()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id')),
    rowsOf(()=>sb.from('lead_expected_payments').select('*').order('expected_on').order('id')),
    byLeadIds(()=>sb.from('lead_activities').select('lead_id').in('activity_type',['call','note']).order('id'),ids)
  ]);
  const finBy=Object.fromEntries((fins||[]).map(f=>[f.lead_id,f]));
  const saleBy=Object.fromEntries((sale||[]).map(f=>[f.lead_id,f.final_sale_usd]));
  const contacts={};(acts||[]).forEach(a=>contacts[a.lead_id]=(contacts[a.lead_id]||0)+1);
  SRROWS=leads.map(l=>({...l,fin:finBy[l.id]||null,final_sale_usd:saleBy[l.id]??null,
    payments:(pays||[]).filter(p=>p.lead_id===l.id),
    expected:(expd||[]).filter(p=>p.lead_id===l.id),
    contacts:contacts[l.id]||0}))
    .sort((a,b)=>String(a.stage_entered_at||'').localeCompare(String(b.stage_entered_at||'')));

  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Sales Report</h2>
    <div class="toolbar">
      <input placeholder="Search name, phone or ref ID…" value="${esc(SRF.q)}" oninput="SRF.q=this.value;drawSalesReport()">
      <div class="scope srgroups" id="srgroups" role="group" aria-label="Column groups"></div>
      <button class="btn-line" onclick="exportSalesReport()">Export Excel</button>
    </div>
    <div id="srsum" class="hint"></div>
    <div id="srchips"></div>
    <div class="srtop" id="srtop" onscroll="srSync(this)"><div></div></div>
    <div class="tablewrap srwrap" id="srwrap" onscroll="srSync(this)"></div>`;
  drawSalesReport();
}

const srMonth=r=>r.stage_entered_at?localDay(r.stage_entered_at).slice(0,7):'';
/* at least five payment columns, as on their sheet, more if a deal has more */
const srPayCols=rows=>Math.max(5,...rows.map(r=>r.payments.length));
const srDays=(a,b)=>a&&b?Math.round((new Date(localDay(b))-new Date(localDay(a)))/864e5):null;
/* EDC Inform is the submission date on either form; Inspection the first
   inspection on record; EAC Inform the approval letter */
const srEdcInform=r=>r.edc_doc_date||r.edc_portal_date||null;
const srInspect=r=>r.edc_inspection_date||r.edc_provincial_date||r.edc_pp_date||null;
const srEstimate=r=>{const n=r.expected.find(p=>p.expected_on>=localDay(new Date()))||r.expected[r.expected.length-1];
  return n?monthName(n.expected_on.slice(0,7)):'';};
const srBattery=r=>r.battery_kwh||(r.battery_kwh_each&&r.battery_pcs?r.battery_kwh_each*r.battery_pcs:null);
const srLeft=r=>Math.max(0,finDue(r)-finPaid(r));

/* THE COLUMNS, once. h = the client's heading, g = group, v = the value,
   t = how it is drawn (money, date, name, cut, n), f = has a heading filter.
   `x` is the position in the client's sheet, which the export keeps. */
const SR_GROUPS=[['deal','Deal'],['cust','Customer'],['sys','System'],['inst','Installation'],['edc','EDC'],['money','Money'],['pay','Payments']];
function srCols(n){
  const c=[
    {x:0,h:'No',g:'pin',v:(r,i)=>i+1,t:'n'},
    {x:2,h:'Lead Reference ID',g:'pin',v:r=>r.ref_id||''},
    {x:8,h:'Customer Name',g:'pin',v:r=>r.customer_name||'',t:'name'},
    {x:1,h:'Month won',g:'deal',v:r=>srMonth(r)?monthName(srMonth(r)):'',f:1},
    {x:3,h:'Agreement Sign Off Date',g:'deal',v:r=>r.stage_entered_at?localDay(r.stage_entered_at):'',t:'date'},
    {x:4,h:'Lead Received Date',g:'deal',v:r=>r.lead_date||localDay(r.created_at),t:'date'},
    {x:5,h:'Sales Person',g:'deal',v:r=>r.assigned_to?staffName(r.assigned_to):'',f:1},
    {x:6,h:'Referral By',g:'deal',v:r=>r.referrer_name||'',f:1},
    {x:7,h:'Lead Channel',g:'deal',v:r=>(r.lead_channel||'').replace(/_/g,' '),f:1},
    {x:17,h:'#Days to Closed',g:'deal',v:r=>srDays(r.lead_date||r.created_at,r.stage_entered_at)??'',t:'n'},
    {x:18,h:'#Times Contacted',g:'deal',v:r=>r.contacts,t:'n'},
    {x:9,h:'Contact Number',g:'cust',v:r=>r.phone||''},
    {x:999,h:'Location',g:'cust',v:r=>r.site_link||r.site_address||'',t:'cut'},
    {x:10,h:'System Size (Pcs)',g:'sys',v:r=>r.panel_pcs??'',t:'n'},
    {x:11,h:'Panel brand',g:'sys',v:r=>[r.panel_brand,r.panel_watt?r.panel_watt+'W':''].filter(Boolean).join(' '),f:1},
    {x:12,h:'Inverter Size (kW)',g:'sys',v:r=>r.inverter_kw_total??r.inverter_kw??'',t:'n'},
    {x:13,h:'Inverter brand',g:'sys',v:r=>r.inverter_brand||'',f:1},
    {x:14,h:'Battery Size (kWh)',g:'sys',v:r=>srBattery(r)??'',t:'n'},
    {x:15,h:'Battery brand',g:'sys',v:r=>r.battery_brand||'',f:1},
    {x:16,h:'Engineering Name',g:'inst',v:r=>r.site_engineer_id?staffName(r.site_engineer_id):'',f:1},
    {x:19,h:'BOQ Released Date',g:'inst',v:r=>r.boq_date||'',t:'date',fv:r=>srMon(r.boq_date),f:1},
    {x:20,h:'Delivery Date',g:'inst',v:r=>r.delivery_date||'',t:'date',fv:r=>srMon(r.delivery_date),f:1},
    {x:21,h:'Installation Start Date',g:'inst',v:r=>r.installation_start||'',t:'date',fv:r=>srMon(r.installation_start),f:1},
    {x:22,h:'Installation End Date',g:'inst',v:r=>r.installation_end||'',t:'date',fv:r=>srMon(r.installation_end),f:1},
    {x:26,h:'Installer Team',g:'inst',v:r=>r.installation_team||'',f:1},
    {x:23,h:'EDC Inform',g:'edc',v:r=>srEdcInform(r)||'',t:'date'},
    {x:24,h:'Inspection Date',g:'edc',v:r=>srInspect(r)||'',t:'date'},
    {x:25,h:'EAC Inform',g:'edc',v:r=>r.edc_approval_date||'',t:'date'},
    {x:27,h:'Amount (USD)',g:'money',v:r=>finDue(r),t:'money',sum:1},
    {x:28,h:'Payment Method',g:'money',v:()=>''},
    {x:29,h:'Remaining Amount',g:'money',v:r=>srLeft(r),t:'left',sum:1,
      fv:r=>srLeft(r)>0.005?'Still owing':'Paid in full',f:1},
    {x:30,h:'Estimate Received Month',g:'money',v:r=>srEstimate(r),f:1},
    {x:1000,h:'Remark',g:'money',v:r=>r.fin?.finance_remark||'',t:'cut'}];
  for(let k=0;k<n;k++){
    c.push({x:31+k*2,h:`Payment ${k+1} (USD)`,g:'pay',v:r=>r.payments[k]?Number(r.payments[k].amount_usd||0):'',t:'money',sum:1});
    c.push({x:32+k*2,h:`Payment ${k+1} date`,g:'pay',v:r=>r.payments[k]?localDay(r.payments[k].paid_on):'',t:'date'});
  }
  /* Location and Remark close the client's sheet, after the payments */
  c.forEach(o=>{if(o.x===999)o.x=31+n*2;if(o.x===1000)o.x=32+n*2;});
  return c;
}
/* a date filters by its month, or "Not yet" while empty (as EDC, council 8 Oct) */
const srMon=d=>d?monthName(String(d).slice(0,7)):'Not yet';
/* the value a heading filter ticks: the cell's own text, or its word */
const srFv=(c,r,i)=>{const v=c.fv?c.fv(r):c.v(r,i);return v===''||v==null?'(blank)':String(v);};

function srRows(skip){
  const q=SRF.q.trim().toLowerCase(), cols=srCols(5);
  return SRROWS.filter(r=>{
    if(q&&![r.customer_name,r.phone,r.ref_id].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    for(const h in SRCF){
      if(h===skip||!SRCF[h].length)continue;
      const c=cols.find(o=>o.h===h); if(c&&!SRCF[h].includes(srFv(c,r)))return false;
    }
    return true;
  });
}

function drawSalesReport(){
  const rows=srRows(), n=srPayCols(rows), cols=srCols(n).filter(c=>c.g==='pin'||!SRHIDE.has(c.g));
  const total=rows.reduce((a,r)=>a+finDue(r),0), left=rows.reduce((a,r)=>a+srLeft(r),0);
  const on=Object.values(SRCF).filter(v=>v.length).length;
  $('srsum').textContent=`${rows.length} won deal${rows.length===1?'':'s'} · ${fmtMoney(total)} · ${fmtMoney(left)} remaining`
    ;
  $('srchips').innerHTML=hfChips(Object.entries(SRCF).map(([h,v])=>[h,v,`SRCF['${esc(h)}']=[];drawSalesReport()`]),
    'SRCF={};drawSalesReport()');
  $('srgroups').innerHTML=SR_GROUPS.map(([k,l])=>
    `<button class="${SRHIDE.has(k)?'':'on'} srg-${k}" aria-pressed="${!SRHIDE.has(k)}" onclick="srToggle('${k}')">${l}</button>`).join('');
  if(!rows.length){$('srwrap').innerHTML=blank('No won deal matches','Clear the filters or the search.');srSizeTop();return;}
  /* the band above the headings: one cell per run of a group */
  const runs=[];cols.forEach(c=>{const L=runs[runs.length-1];if(L&&L.g===c.g)L.n++;else runs.push({g:c.g,n:1});});
  const gname=g=>g==='pin'?'':(SR_GROUPS.find(x=>x[0]===g)||[])[1]||'';
  const head=`<tr class="srband">${runs.map(x=>`<th colspan="${x.n}" class="srg-${x.g}${x.g==='pin'?' srpin srpin0':''}">${esc(gname(x.g))}</th>`).join('')}</tr>
    <tr>${cols.map((c,k)=>`<th class="srg-${c.g}${k<3?' srpin srpin'+k:''}">${c.f
      ?hfHead(c.h,SRCF[c.h]&&SRCF[c.h].length,`srFilterOpen(event,'${esc(c.h)}')`)
      :esc(c.h)}</th>`).join('')}</tr>`;
  const cell=(c,r,i,k)=>{
    const v=c.v(r,i), pin=k<3?` class="srpin srpin${k}"`:'';
    if(c.t==='left')return `<td${pin} class="nowrap">${v>0.005?`<b class="sr-owe">${fmtMoney(v)}</b>`:'<span class="mark mark-done">Paid</span>'}</td>`;
    if(v===''||v==null)return `<td${pin}><span class="quiet">—</span></td>`;
    if(c.t==='money')return `<td${pin} class="nowrap"><b>${fmtMoney(v)}</b></td>`;
    if(c.t==='date')return `<td${pin} class="nowrap">${fmtDate(v)}</td>`;
    if(c.t==='name')return `<td class="srpin srpin${k}"><b class="nm">${esc(v)}</b></td>`;
    if(c.t==='cut')return `<td class="sr-cut" title="${esc(v)}">${c.h==='Location'&&/^https?:/.test(v)?`<a href="${esc(v)}" target="_blank" rel="noopener">map</a>`:esc(v)}</td>`;
    return `<td${pin} class="nowrap">${esc(String(v))}</td>`;};
  const foot=`<tr class="srtotal">${cols.map((c,k)=>k===2?'<td class="srpin srpin2"><b>Total</b></td>'
    :c.sum?`<td class="nowrap"><b>${fmtMoney(rows.reduce((a,r,i)=>a+Number(c.v(r,i)||0),0))}</b></td>`
    :`<td${k<3?` class="srpin srpin${k}"`:''}></td>`).join('')}</tr>`;
  $('srwrap').innerHTML=`<table class="table-compact srtable"><thead>${head}</thead><tbody>`
    +rows.map((r,i)=>'<tr>'+cols.map((c,k)=>cell(c,r,i,k)).join('')+'</tr>').join('')
    +`</tbody><tfoot>${foot}</tfoot></table>`;
  srSizeTop();
}
function srToggle(g){SRHIDE.has(g)?SRHIDE.delete(g):SRHIDE.add(g);drawSalesReport();}

/* the scrollbar on top is an empty strip as wide as the table, scrolled in
   step with the table itself */
function srSizeTop(){const t=$('srtop'),w=$('srwrap');if(!t||!w)return;
  t.firstElementChild.style.width=w.scrollWidth+'px';t.style.display=w.scrollWidth>w.clientWidth?'':'none';}
function srSync(el){const o=el.id==='srtop'?$('srwrap'):$('srtop');
  if(o&&o.scrollLeft!==el.scrollLeft)o.scrollLeft=el.scrollLeft;}

/* the heading filter: that column's values, counted from the rows the other
   filters leave (app-filter.js draws it) */
function srFilterOpen(ev,h){
  const c=srCols(5).find(o=>o.h===h);if(!c)return;
  const cnt={},ord={};srRows(h).forEach((r,i)=>{const v=srFv(c,r,i);cnt[v]=(cnt[v]||0)+1;
    if(c.t==='date')ord[v]=String(c.v(r,i)||'9999').slice(0,7);});
  const vals=Object.keys(cnt).sort((a,b)=>a==='(blank)'?1:b==='(blank)'?-1
    :c.t==='date'?ord[a].localeCompare(ord[b]):a.localeCompare(b,undefined,{numeric:true}));
  hfOpen(ev,{title:h,values:vals.map(v=>[v,cnt[v]]),selected:SRCF[h]||[],apply:sel=>{SRCF[h]=sel;drawSalesReport();}});
}

/* every column in the client's order, whatever is hidden on screen */
async function exportSalesReport(){
  const rows=srRows(), n=srPayCols(rows), cols=srCols(n).slice().sort((a,b)=>a.x-b.x);
  if(!window.XLSX)await new Promise((ok,no)=>{const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);})
    .catch(()=>toast('Could not load the Excel writer'));
  if(!window.XLSX)return;
  const ws=XLSX.utils.aoa_to_sheet([cols.map(c=>c.h),...rows.map((r,i)=>cols.map(c=>{const v=c.v(r,i);return v===''?null:v;}))]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Sales Report');
  XLSX.writeFile(wb,'Sales Report.xlsx');
}
