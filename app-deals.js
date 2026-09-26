/* ---------------- Won deals (admin) ----------------
   One table of every won deal where admin corrects what the record says:
   the customer, the system, the EDC file, BOQ and installation. Asked for on
   27 Sep 2026 for Cheanich - EDC dates could only be typed while a deal was
   still on the worklist (Submitted is read-only), and BOQ or an install date
   meant opening the lead, unlocking it and finding the box.

   Every cell saves the moment it changes, like the EDC worklist. The four tabs
   are column sets over the same rows, so the table fits a laptop screen. */
let DEALS=[], DEALTAB='edc', DEALF={q:'',sys:'',edc:''}, DEALPAGE=0;

async function renderDeals(){
  if(ME.role!=='admin'){
    $('main').innerHTML=blank('Won deals is admin only','Ask an admin to correct a deal.');return;}
  $('main').innerHTML=SKEL;
  const gen=NAVGEN;
  const rows=await fetchLeads(q=>q.eq('stage_code',WON));
  if(gen!==NAVGEN)return;
  DEALS=rows.slice().sort((a,b)=>String(b.stage_entered_at||'').localeCompare(String(a.stage_entered_at||'')));
  const tab=(k,label)=>`<button class="${DEALTAB===k?'on':''}" onclick="DEALTAB='${k}';drawDeals();paintDealTabs()" data-tab="${k}">${label}</button>`;
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Won deals</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Every won deal. Changes save as you make them.</p>
    <div class="toolbar">
      <div class="scope" id="deal-tabs">${tab('edc','EDC')}${tab('install','BOQ &amp; installation')}${tab('cust','Customer')}${tab('sys','System')}</div>
      <input placeholder="Search name, phone or ref ID…" value="${esc(DEALF.q)}" oninput="DEALF.q=this.value;DEALPAGE=0;drawDeals()">
      <select onchange="DEALF.sys=this.value;DEALPAGE=0;drawDeals()" title="System type">
        <option value="">All systems</option>${SYSTEM_TYPES.map(v=>opt(v,DEALF.sys)).join('')}<option value="-" ${DEALF.sys==='-'?'selected':''}>Not set</option></select>
      <select onchange="DEALF.edc=this.value;DEALPAGE=0;drawDeals()" title="EDC">
        <option value="">Any EDC state</option>
        ${[['open','EDC pending'],['done','EDC complete'],['miss','Missing system info'],['exempt','Off-Grid']].map(([v,t])=>`<option value="${v}" ${DEALF.edc===v?'selected':''}>${t}</option>`).join('')}</select>
    </div>
    <div id="dealwrap"></div>`;
  drawDeals();
}
function paintDealTabs(){
  document.querySelectorAll('#deal-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===DEALTAB));
}
/* older rows carry only city_province, as the lead modal allows for */
const dealProv=l=>l.province||l.city_province||'';
const dealEdcState=l=>edcExempt(l)?'exempt':!edcFields(l)?'miss':edcDone(l)<edcFields(l).length?'open':'done';

function dealRows(){
  const q=DEALF.q.trim().toLowerCase();
  return DEALS.filter(l=>{
    if(q&&![l.customer_name,l.phone,l.ref_id].some(v=>String(v||'').toLowerCase().includes(q)))return false;
    if(DEALF.sys==='-'?!!l.system_type:DEALF.sys&&l.system_type!==DEALF.sys)return false;
    if(DEALF.edc&&dealEdcState(l)!==DEALF.edc)return false;
    return true;
  });
}

function drawDeals(){
  const wrap=$('dealwrap'); if(!wrap)return;
  const all=dealRows();
  if(!all.length){wrap.innerHTML=blank('No won deal matches','Clear the search or the filters to see every won deal.');return;}
  const pages=Math.ceil(all.length/PAGE_SIZE);
  if(DEALPAGE>pages-1)DEALPAGE=pages-1;
  const rows=all.slice(DEALPAGE*PAGE_SIZE,(DEALPAGE+1)*PAGE_SIZE);
  const cols=DEAL_COLS[DEALTAB];
  wrap.innerHTML=`<div class="tablewrap deals"><table><thead><tr>
      <th>Ref ID</th><th>Customer</th>${cols.map(c=>`<th title="${esc(c.tip||'')}">${c.head}</th>`).join('')}
    </tr></thead><tbody>`
    +rows.map(l=>`<tr id="deal-${l.id}">${dealRow(l)}</tr>`).join('')
    +`</tbody></table></div>`
    +(pages>1?`<div class="pager">
      <button class="btn-line" onclick="DEALPAGE--;drawDeals()" ${DEALPAGE?'':'disabled'}>Previous</button>
      <span class="pg">${DEALPAGE*PAGE_SIZE+1}–${Math.min(all.length,(DEALPAGE+1)*PAGE_SIZE)} of ${all.length}</span>
      <button class="btn-line" onclick="DEALPAGE++;drawDeals()" ${DEALPAGE<pages-1?'':'disabled'}>Next</button></div>`:'');
}
function dealRow(l){
  return `<td class="refid" style="cursor:pointer" onclick="openLead('${l.id}')" title="Open the lead">${esc(l.ref_id||'—')}</td>
    <td><b>${esc(l.customer_name)}</b><span class="days">won ${fmtDate(l.stage_entered_at)}</span></td>`
    +DEAL_COLS[DEALTAB].map(c=>`<td>${c.cell(l)}</td>`).join('');
}
/* redraw one row after a save, so a derived cell (kWac, the EDC band, the
   commune list) follows without the table losing its place */
function redrawDeal(id){
  const l=DEALS.find(x=>x.id===id), tr=$('deal-'+id);
  if(l&&tr)tr.innerHTML=dealRow(l);
}

/* the cells. `k` is the column; every input calls saveDeal with it. */
const dDate=(l,k)=>`<input type="date" style="min-width:130px" value="${l[k]||''}" onchange="saveDeal('${l.id}','${k}',this.value,this)">`;
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

const DEAL_COLS={
  edc:[
    {head:'Size',cell:dealEdcBand},
    {head:'Branch',cell:l=>edcApplies(l)?dSel(l,'edc_branch',EDC_BRANCHES,170):'<span class="quiet">—</span>'},
    {head:'EDC price',tip:'What EDC charges for this submission',cell:l=>edcApplies(l)?dNum(l,'edc_fee_usd',false,90):'<span class="quiet">—</span>'},
    ...EDC_SMALL.map(([k,s,f])=>({head:s+' ≤10',tip:f+' (10 kWac or under)',cell:l=>dEdc(l,k)})),
    ...EDC_LARGE.map(([k,s,f])=>({head:s+(k==='edc_portal_date'?' >10':''),tip:f+' (above 10 kWac)',cell:l=>dEdc(l,k)}))
  ],
  install:[
    {head:'BOQ',cell:l=>dSel(l,'boq_status',BOQ_STATUS,100)},
    {head:'BOQ date',cell:l=>dDate(l,'boq_date')},
    {head:'Delivery',cell:l=>dDate(l,'delivery_date')},
    {head:'Install start',cell:l=>dDate(l,'installation_start')},
    {head:'Install end',cell:l=>dDate(l,'installation_end')},
    {head:'Team',cell:l=>dSel(l,'installation_team',INSTALL_TEAMS,150)},
    {head:'Site engineer',cell:l=>`<select style="min-width:150px" onchange="saveDeal('${l.id}','site_engineer_id',this.value,this)"><option value="">—</option>${
      STAFF.filter(s=>s.role==='site_engineer'&&(s.is_active||s.id===l.site_engineer_id))
        .map(s=>`<option value="${s.id}" ${s.id===l.site_engineer_id?'selected':''}>${esc(s.full_name)}</option>`).join('')}</select>`}
  ],
  cust:[
    {head:'Name',cell:l=>dText(l,'customer_name',170)},
    {head:'Type',cell:l=>dSel(l,'customer_type',CUSTOMER_TYPES,110)},
    {head:'Phone',cell:l=>dText(l,'phone',130)},
    {head:'Address',cell:l=>dText(l,'site_address',180)},
    {head:'Province',cell:l=>`<select style="min-width:130px" onchange="saveDeal('${l.id}','province',this.value,this)">${optList(PROVINCES,dealProv(l))}</select>`},
    {head:'District',cell:l=>dSel(l,'district',Object.keys(GEO[dealProv(l)]||{}),130)},
    {head:'Commune',cell:l=>dSel(l,'commune',((GEO[dealProv(l)]||{})[l.district])||[],130)}
  ],
  sys:[
    {head:'System',cell:l=>dSel(l,'system_type',SYSTEM_TYPES,100)},
    {head:'Phase',cell:l=>dSel(l,'phase_type',PHASE_TYPES,110)},
    {head:'Panel',cell:l=>dSel(l,'panel_brand',PANEL_BRANDS,100)},
    {head:'Watt',cell:l=>dNum(l,'panel_watt',true,60)},
    {head:'Pcs',cell:l=>dNum(l,'panel_pcs',true,50)},
    {head:'Inverter',cell:l=>dSel(l,'inverter_brand',INVERTER_BRANDS,100)},
    {head:'kW each',cell:l=>dNum(l,'inverter_kw',false,55)},
    {head:'Pcs',cell:l=>dNum(l,'inverter_pcs',true,45)},
    {head:'Battery',cell:l=>dSel(l,'battery_brand',BATTERY_BRANDS,100)},
    {head:'kWh each',cell:l=>dNum(l,'battery_kwh_each',false,55)},
    {head:'Pcs',cell:l=>dNum(l,'battery_pcs',true,45)}
  ]
};

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
