/* ---------------- Sales Report: every won deal on one row ----------------
   The client's "Sales Report" sheet (Solarworks Master Lead, 5 Oct 2026),
   column for column, so they can read a won customer's whole history - sale,
   system, installation, EDC and each payment - without opening the lead.
   Admin, the manager and finance; read only. Payment method is blank until
   lead_payments has somewhere to keep it. */
let SRROWS=[], SRF={q:'',mon:'',who:''};

const canSalesReport=()=>['admin','manager','finance'].includes(ME.role);

async function renderSalesReport(){
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

  const months=[...new Set(SRROWS.map(srMonth).filter(Boolean))].sort().reverse();
  const people=[...new Set(SRROWS.map(r=>r.assigned_to).filter(Boolean))]
    .map(id=>[id,staffName(id)]).sort((a,b)=>a[1].localeCompare(b[1]));
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Sales Report</h2>
    <div class="toolbar">
      <input placeholder="Search name, phone or ref ID…" value="${esc(SRF.q)}" oninput="SRF.q=this.value;drawSalesReport()">
      <select onchange="SRF.mon=this.value;drawSalesReport()" title="Month won">
        <option value="">Every month</option>${months.map(m=>`<option value="${m}" ${SRF.mon===m?'selected':''}>${esc(monthName(m))}</option>`).join('')}</select>
      <select onchange="SRF.who=this.value;drawSalesReport()" title="Salesperson">
        <option value="">Every salesperson</option>${people.map(([id,n])=>`<option value="${id}" ${SRF.who===id?'selected':''}>${esc(n)}</option>`).join('')}</select>
      <button class="btn-line" onclick="exportSalesReport()">Export Excel</button>
    </div>
    <div id="srsum" class="hint"></div>
    <div class="tablewrap" id="srwrap"></div>`;
  drawSalesReport();
}

const srMonth=r=>r.stage_entered_at?localDay(r.stage_entered_at).slice(0,7):'';
function srRows(){
  const q=SRF.q.trim().toLowerCase();
  return SRROWS.filter(r=>{
    if(q&&![r.customer_name,r.phone,r.ref_id].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(SRF.mon&&srMonth(r)!==SRF.mon)return false;
    if(SRF.who&&r.assigned_to!==SRF.who)return false;
    return true;
  });
}
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

/* one reader for the screen and the export, so the two cannot disagree */
function srCells(r,i,n){
  const pays=[];for(let k=0;k<n;k++){const p=r.payments[k];pays.push(p?Number(p.amount_usd||0):null,p?localDay(p.paid_on):null);}
  return [i+1,srMonth(r)?monthName(srMonth(r)):'',r.ref_id||'',
    r.stage_entered_at?localDay(r.stage_entered_at):'',r.lead_date||localDay(r.created_at),
    r.assigned_to?staffName(r.assigned_to):'',r.referrer_name||'',(r.lead_channel||'').replace(/_/g,' '),
    r.customer_name||'',r.phone||'',
    r.panel_pcs??'',[r.panel_brand,r.panel_watt?r.panel_watt+'W':''].filter(Boolean).join(' '),
    r.inverter_kw_total??r.inverter_kw??'',r.inverter_brand||'',srBattery(r)??'',r.battery_brand||'',
    r.site_engineer_id?staffName(r.site_engineer_id):'',
    srDays(r.lead_date||r.created_at,r.stage_entered_at)??'',r.contacts,
    r.boq_date||'',r.delivery_date||'',r.installation_start||'',r.installation_end||'',
    srEdcInform(r)||'',srInspect(r)||'',r.edc_approval_date||'',r.installation_team||'',
    finDue(r),'',Math.max(0,finDue(r)-finPaid(r)),srEstimate(r),
    ...pays,
    r.site_link||r.site_address||'',r.fin?.finance_remark||''];
}
function srHead(n){
  const pays=[];for(let k=1;k<=n;k++)pays.push(`Payment ${k} (USD)`,`Payment ${k} date`);
  return ['No','Month won','Lead Reference ID','Agreement Sign Off Date','Lead Received Date','Sales Person',
    'Referral By','Lead Channel','Customer Name','Contact Number','System Size (Pcs)','Panel brand',
    'Inverter Size (kW)','Inverter brand','Battery Size (kWh)','Battery brand','Engineering Name',
    '#Days to Closed','#Times Contacted','BOQ Released Date','Delivery Date','Installation Start Date',
    'Installation End Date','EDC Inform','Inspection Date','EAC Inform','Installer Team','Amount (USD)',
    'Payment Method','Remaining Amount','Estimate Received Month',...pays,'Location','Remark'];
}
const SR_MONEY=new Set(['Amount (USD)','Remaining Amount']);
function drawSalesReport(){
  const rows=srRows(), n=srPayCols(rows), head=srHead(n);
  const total=rows.reduce((a,r)=>a+finDue(r),0), left=rows.reduce((a,r)=>a+Math.max(0,finDue(r)-finPaid(r)),0);
  $('srsum').textContent=`${rows.length} won deal${rows.length===1?'':'s'} · ${fmtMoney(total)} · ${fmtMoney(left)} remaining`;
  const isDate=h=>/Date$|date$|Inform$/.test(h);
  $('srwrap').innerHTML=rows.length?`<table class="table-compact srtable"><thead><tr>${head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>`
    +rows.map((r,i)=>'<tr>'+srCells(r,i,n).map((v,k)=>{
      const h=head[k];
      if(v===''||v==null)return '<td><span class="quiet">—</span></td>';
      if(SR_MONEY.has(h)||/^Payment \d+ \(USD\)$/.test(h))return `<td class="nowrap"><b>${fmtMoney(v)}</b></td>`;
      if(isDate(h)&&/^\d{4}-\d\d-\d\d/.test(String(v)))return `<td class="nowrap">${fmtDate(v)}</td>`;
      if(h==='Customer Name')return `<td><b class="nm">${esc(v)}</b></td>`;
      if(h==='Remark'||h==='Location')return `<td class="rem"><span class="clamp" title="${esc(v)}">${esc(v)}</span></td>`;
      return `<td class="nowrap">${esc(String(v))}</td>`;}).join('')+'</tr>').join('')+'</tbody></table>'
    :blank('No won deal matches','Clear the search or pick another month.');
}

async function exportSalesReport(){
  const rows=srRows(), n=srPayCols(rows);
  if(!window.XLSX)await new Promise((ok,no)=>{const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);})
    .catch(()=>toast('Could not load the Excel writer'));
  if(!window.XLSX)return;
  const ws=XLSX.utils.aoa_to_sheet([srHead(n),...rows.map((r,i)=>srCells(r,i,n))]);
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Sales Report');
  XLSX.writeFile(wb,'Sales Report'+(SRF.mon?' - '+monthName(SRF.mon):'')+'.xlsx');
}
