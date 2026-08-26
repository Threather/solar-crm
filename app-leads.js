/* ---------------- LEADS ---------------- */
/* Active, won and lost are one list sliced three ways. renderLeads fetches,
   paintLeads draws — kept apart so switching slice is instant and never
   round-trips to Supabase for rows it already holds. */
async function renderLeads(scope){
  LEADSCOPE=scope||LEADSCOPE;
  $('main').innerHTML=SKEL;
  LEADS=await fetchLeads(q=>{
    if(ME.role==='sales')return q.eq('assigned_to',ME.id);
    if(ME.role==='site_engineer')return q.eq('site_engineer_id',ME.id);
    /* marketing is left to RLS, which since 17 Aug 2026 gives them the leads
       they created and nothing else */
    return q;
  });
  /* sale values come from their own table, and only for roles the database
     lets read it — for anyone else they simply stay undefined */
  if(canSeeMoney()&&LEADS.length){
    const {data:fins}=await sb.from('lead_financials')
      .select('lead_id,final_sale_usd').in('lead_id',LEADS.map(l=>l.id));
    const byId=Object.fromEntries((fins||[]).map(f=>[f.lead_id,f.final_sale_usd]));
    LEADS.forEach(l=>{l.final_sale_usd=byId[l.id]??null;});
  }
  /* the newest remark per lead, so sales can read the list without opening rows */
  if(LEADS.length){
    const {data:rem}=await sb.from('lead_activities')
      .select('lead_id,note,note_date,created_at,actor_id')
      .in('lead_id',LEADS.map(l=>l.id)).not('note','is',null)
      .order('created_at',{ascending:false});
    const by={};
    (rem||[]).forEach(a=>{(by[a.lead_id]=by[a.lead_id]||[]).push(a);});
    LEADS.forEach(l=>{
      l.remarks=(by[l.id]||[]).sort((x,y)=>remarkDate(y).localeCompare(remarkDate(x)));
      l.last_remark=l.remarks[0]||null;
    });
    /* the last price quoted, for the column that replaces the salesperson's
       own name when they are looking at their own list */
    const {data:qs}=await sb.from('quotations')
      .select('lead_id,price_usd,created_at').in('lead_id',LEADS.map(l=>l.id))
      .order('created_at',{ascending:false});
    const qby={};
    (qs||[]).forEach(q=>{if(!qby[q.lead_id])qby[q.lead_id]=q;});
    LEADS.forEach(l=>{l.last_quot=qby[l.id]||null;});
  }
  paintLeads();
}
/* Marketing sees who the customer is, not where the deal has got to: no stage,
   no qualification, no ref ID (which is only issued on qualifying), no aging,
   no sales follow-up, and no Won/Lost tabs — those are stage by another name. */
const mktOnly=()=>ME.role==='marketing';
function paintLeads(){
  const stg=STAGES.map(s=>`<option value="${s.stage_code}" ${s.stage_code===FILTER.stage?'selected':''}>${esc(s.stage_name)}</option>`).join('');
  const rows=scopeLeads();
  $('main').innerHTML=(mktOnly()?mktStats(rows):LEADSCOPE==='active'?activeStats():LEADSCOPE==='won'?wonStats(rows):lostStats(rows))+`
    <div class="toolbar">
      ${(ME.role==='site_engineer'||mktOnly())?'':`<div class="scope">
        ${[['active','Active'],['won','Won'],['lost','Lost']].map(([k,label])=>
          `<button class="${LEADSCOPE===k?'on':''}" onclick="setScope('${k}')">${label}</button>`).join('')}
      </div>`}
      <input placeholder="Search name, phone or ref ID…" value="${esc(FILTER.q||'')}" oninput="FILTER.q=this.value;drawTable()">
      ${(LEADSCOPE==='active'&&!mktOnly())?`
      <select onchange="FILTER.stage=this.value;drawTable()"><option value="">All stages</option>${stg}</select>
      <select onchange="FILTER.qual=this.value;drawTable()">
        <option value="">All leads</option>
        <option value="qualified" ${FILTER.qual==='qualified'?'selected':''}>Qualified only</option>
        <option value="none" ${FILTER.qual==='none'?'selected':''}>Not qualified yet</option>
      </select>`:''}
      <button class="btn-line" onclick="FILTER={stage:'',q:'',qual:''};paintLeads()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="exportLeads()" title="Exports the rows currently shown">Export CSV</button>
    </div>
    <div class="tablewrap" id="tablewrap"></div>`;
  drawTable();
}
/* filters are cleared on a scope change, since a stage filter means nothing
   on Won or Lost and would silently hide rows */
function setScope(s){
  if(LEADSCOPE===s)return;
  LEADSCOPE=s;
  FILTER={stage:'',q:'',qual:''};
  paintLeads();
}
function mktStats(rows){
  const nophone=rows.filter(l=>!l.phone);
  const due=rows.filter(l=>l.mkt_follow_up_date&&new Date(l.mkt_follow_up_date)<=new Date().setHours(23,59,59,999));
  return `<div class="stats">
      <div class="stat hero"><div class="n">${rows.length}</div><div class="l">Leads created</div></div>
      <div class="stat ${due.length?'alert':''}"><div class="n">${due.length}</div><div class="l">Follow-up due</div></div>
      <div class="stat"><div class="n">${nophone.length}</div><div class="l">No phone yet</div></div>
    </div>`;
}
function activeStats(){
  const rows=scopeLeads();
  const qual=rows.filter(l=>qualText(l)==='Qualified');
  const waiting=rows.filter(l=>qualText(l)!=='Qualified');
  const overdue=rows.filter(l=>l.next_follow_up&&new Date(l.next_follow_up)<new Date().setHours(0,0,0,0));
  return `<div class="stats">
      <div class="stat hero ${overdue.length?'alert':''}"><div class="n">${overdue.length}</div><div class="l">Follow-up overdue</div></div>
      <div class="stat"><div class="n">${rows.length}</div><div class="l">In pipeline</div></div>
      <div class="stat"><div class="n">${qual.length}</div><div class="l">Qualified</div></div>
      <div class="stat"><div class="n">${waiting.length}</div><div class="l">Awaiting decision</div></div>
    </div>`;
}
function wonStats(rows){
  const value=rows.reduce((a,l)=>a+Number(l.final_sale_usd||0),0);
  const booked=rows.filter(l=>l.installation_start);
  const teamed=rows.filter(l=>l.installation_team);
  return `<div class="stats">
      <div class="stat hero"><div class="n">${rows.length}</div><div class="l">Won deals</div></div>
      ${canSeeMoney()?`<div class="stat"><div class="n">${fmtMoney(value)}</div><div class="l">Total sale value</div></div>`:''}
      <div class="stat"><div class="n">${booked.length}</div><div class="l">Installation booked</div></div>
      <div class="stat"><div class="n">${teamed.length}</div><div class="l">Team assigned</div></div>
    </div>`;
}
function lostStats(rows){
  return `<div class="stats">
      <div class="stat hero"><div class="n">${rows.length}</div><div class="l">Lost leads</div></div>
    </div>`;
}
/* rows for the current tab, before the toolbar filters */
function scopeLeads(){
  if(mktOnly())return LEADS;
  if(LEADSCOPE==='won')return LEADS.filter(l=>l.stage_code===WON);
  if(LEADSCOPE==='lost')return LEADS.filter(l=>l.stage_code===LOST);
  return LEADS.filter(l=>!STAGES.find(s=>s.stage_code===l.stage_code)?.is_terminal);
}
function filteredLeads(){
  let rows=scopeLeads();
  if(LEADSCOPE==='active'){
    if(FILTER.stage)rows=rows.filter(l=>l.stage_code===FILTER.stage);
    if(FILTER.qual==='none')rows=rows.filter(l=>qualText(l)!=='Qualified');
    else if(FILTER.qual==='qualified')rows=rows.filter(l=>qualText(l)==='Qualified');
  }
  if(FILTER.q){const q=FILTER.q.toLowerCase();rows=rows.filter(l=>
    (l.customer_name||'').toLowerCase().includes(q)||(l.phone||'').includes(q)||(l.ref_id||'').toLowerCase().includes(q));}
  return rows;
}
function drawTable(){
  const rows=filteredLeads();
  if(!rows.length){$('tablewrap').innerHTML=FILTER.q||FILTER.stage||FILTER.qual
    ?blank('No matches','Nothing in this list fits the current search or filters. Clear them to see everything.')
    :LEADSCOPE==='won'?blank('No won deals yet','Deals appear here once a sale engineer marks them Closed-Won.')
    :LEADSCOPE==='lost'?blank('Nothing lost','Leads marked Closed-Lost are kept here.')
    :blank('No active leads','New leads land here as soon as they are created.');return;}
  if(mktOnly())return drawMktTable(rows);
  if(LEADSCOPE==='won')return drawWonTable(rows);
  if(LEADSCOPE==='lost')return drawLostTable(rows);
  $('tablewrap').innerHTML=`<table class="${showRemarks()?'with-rem':''}"><thead><tr>
    <th>Ref ID</th><th>Customer</th><th>Phone</th><th>Stage</th><th>Qualified</th><th>${ME.role==='sales'?'Quotation':'Sale engineer'}</th><th>Follow-up</th><th>Aging</th>${showRemarks()?'<th>Remarks</th>':''}
  </tr></thead><tbody>`+rows.map(l=>{
    const od=l.next_follow_up&&new Date(l.next_follow_up)<new Date().setHours(0,0,0,0);
    return `<tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="refid">${esc(l.ref_id||'—')}</td>
      <td class="cust"><b>${esc(l.customer_name)}</b><span class="days">${esc(l.customer_type||'')}</span></td>
      <td class="phone">${l.phone?esc(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${stagePill(l.stage_code)}</td>
      <td>${qualPill(l)}</td>
      <td>${ME.role==='sales'
        ?(l.last_quot?`<b>${fmtMoney(l.last_quot.price_usd)}</b><span class="days">${fmtDate(l.last_quot.created_at)}</span>`:'—')
        :(l.assigned_to?esc(staffName(l.assigned_to)):'<span class="pooltag">NOT YET</span>')}</td>
      <td class="${od?'overdue':''}">${fmtDate(l.next_follow_up)}</td>
      <td class="nowrap"><b>${daysIn(l.created_at)}d</b> old<span class="days">${daysIn(l.stage_entered_at)}d in stage</span></td>
      ${showRemarks()?`<td class="rem">${remarkStack(l)}</td>`:''}</tr>`;
  }).join('')+`</tbody></table>`;
}
/* the six things marketing needs: who, what kind, how to reach them, whose it
   is, where it came from and where it is */
function drawMktTable(rows){
  $('tablewrap').innerHTML=`<table><thead><tr>
    <th>Customer</th><th>Phone</th><th>Sale engineer</th><th>Channel</th><th>Address</th><th>Follow-up</th>
  </tr></thead><tbody>`+rows.map(l=>{
    const od=l.mkt_follow_up_date&&new Date(l.mkt_follow_up_date)<new Date().setHours(0,0,0,0);
    return `<tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="cust"><b>${esc(l.customer_name)}</b><span class="days">${esc(l.customer_type||'')}</span></td>
      <td class="phone">${l.phone?esc(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${l.assigned_to?esc(staffName(l.assigned_to)):'<span class="pooltag">NOT YET</span>'}</td>
      <td>${esc(l.lead_channel||l.lead_source||'—')}${l.lead_sub_channel?`<span class="days">${esc(l.lead_sub_channel)}</span>`:''}</td>
      <td>${esc(l.site_address||'—')}</td>
      <td class="${od?'overdue':''}">${fmtDate(l.mkt_follow_up_date)}</td></tr>`;
  }).join('')+`</tbody></table>`;
}
/* the date the contact happened, which is not always the day it was typed */
const remarkDate=a=>a?(a.note_date||localDay(a.created_at)):'';
/* the running log is the salesperson's working view, and nobody else's */
const showRemarks=()=>ME.role==='sales'||ME.role==='admin';
/* three most recent in the row, the rest one click away and still in the row */
function remarkStack(l){
  const rs=l.remarks||[];
  if(!rs.length)return '<span class="rl none">no remark yet</span>';
  const extra=rs.length-3;
  return `<div class="rstack collapsed">
    ${rs.map(a=>`<span class="rl"><i>${fmtDate(remarkDate(a))}</i>${esc(a.note)}</span>`).join('')}
    ${extra>0?`<button class="rmore" onclick="event.stopPropagation();toggleRemarks(this)">${extra} more</button>`:''}
  </div>`;
}
function toggleRemarks(btn){
  const box=btn.parentElement, open=box.classList.toggle('collapsed');
  btn.textContent=open?((box.querySelectorAll('.rl').length-3)+' more'):'Show less';
}
/* Won deals are a build schedule, not a pipeline, so the columns change */
function drawWonTable(rows){
  $('tablewrap').innerHTML=`<table><thead><tr>
    <th>Ref ID</th><th>Customer</th><th>Phone</th>${canSeeMoney()?'<th>Sale value</th>':''}<th>Sale engineer</th><th>Site engineer</th><th>Schedule</th>${ME.role==='admin'?'<th>EDC</th>':''}<th>Won</th>
  </tr></thead><tbody>`+rows.map(l=>`
    <tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="refid">${esc(l.ref_id||'—')}</td>
      <td><b>${esc(l.customer_name)}</b></td>
      <td class="phone">${l.phone?esc(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      ${canSeeMoney()?`<td><b>${fmtMoney(l.final_sale_usd)}</b></td>`:''}
      <td>${esc(staffName(l.assigned_to))}</td>
      <td>${l.site_engineer_id?esc(staffName(l.site_engineer_id)):'<span class="pooltag">NONE</span>'}<span class="days">${esc(l.installation_team||'no team')}</span></td>
      <td>${l.installation_start||l.installation_end
        ?`${fmtDate(l.installation_start)} → ${fmtDate(l.installation_end)}<span class="days">${l.delivery_date?'delivery '+fmtDate(l.delivery_date):'no delivery date'}</span>`
        :`<span class="quiet">not scheduled</span>${l.delivery_date?`<span class="days">delivery ${fmtDate(l.delivery_date)}</span>`:''}`}</td>
      ${ME.role==='admin'?`<td>${edcExempt(l)?'<span class="mark">off-grid</span>'
        :!edcApplies(l)||!edcFields(l)?'<span class="mark mark-wait">pending</span>'
        :`<span class="mark ${edcDone(l)===edcFields(l).length?'mark-done':'mark-open'}">${edcDone(l)}/${edcFields(l).length}</span>`}</td>`:''}
      <td>${fmtDate(l.stage_entered_at)}</td></tr>`).join('')+`</tbody></table>`;
}
function drawLostTable(rows){
  $('tablewrap').innerHTML=`<table><thead><tr>
    <th>Ref ID</th><th>Customer</th><th>Phone</th><th>Channel</th><th>Qualified</th><th>Sale engineer</th><th>Lost</th><th>Created</th>
  </tr></thead><tbody>`+rows.map(l=>`
    <tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="refid">${esc(l.ref_id||'—')}</td>
      <td><b>${esc(l.customer_name)}</b></td>
      <td class="phone">${l.phone?esc(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${esc(l.lead_channel||l.lead_source||'—')}</td>
      <td>${qualPill(l)}</td>
      <td>${l.assigned_to?esc(staffName(l.assigned_to)):'—'}</td>
      <td>${fmtDate(l.stage_entered_at)}</td>
      <td>${fmtDate(l.created_at)}</td></tr>`).join('')+`</tbody></table>`;
}

/* ---------------- POOL ---------------- */
async function renderPool(){
  $('main').innerHTML=SKEL;
  const pool=await fetchLeads(q=>q.is('assigned_to',null));
  const canAssign=['manager','admin'].includes(ME.role);
  const salesOpts=STAFF.filter(s=>s.role==='sales'&&s.is_active)
    .map(s=>`<option value="${s.id}">${esc(s.full_name)} (${esc(s.staff_id)})</option>`).join('');
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Not yet with sales</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">No phone number yet, so no sale engineer. Add a number and one gets assigned automatically. Assign by hand only if you need to.</p>
    ${pool.length?`<div class="tablewrap"><table><thead><tr>
      <th>Ref ID</th><th>Customer</th><th>Phone</th><th>Channel</th><th>Waiting</th><th>Created by</th><th style="min-width:220px">Assign</th>
    </tr></thead><tbody>`+pool.map(l=>`
      <tr><td class="refid">${esc(l.ref_id||'—')}</td>
      <td><b class="rowlink" style="cursor:pointer" onclick="openLead('${l.id}')">${esc(l.customer_name)}</b></td>
      <td>${esc(l.phone||'—')}</td><td>${esc(l.lead_channel||l.lead_source||'—')}</td>
      <td>${daysIn(l.created_at)}d</td><td>${esc(staffName(l.created_by))}</td>
      <td>${canAssign?`<div style="display:flex;gap:6px"><select id="as-${l.id}">${salesOpts}</select>
            <button class="btn-sun" onclick="assignLead('${l.id}',document.getElementById('as-${l.id}').value)">Assign</button></div>`:'—'}</td>
      </tr>`).join('')+`</tbody></table></div>`:blank('Everything is with sales','Leads appear here only while they have no phone number. Adding one assigns a sale engineer automatically.')}`;
}
async function assignLead(leadId,staffId){
  if(!staffId)return;
  const {error}=await sb.from('leads').update({assigned_to:staffId,assigned_at:new Date().toISOString()}).eq('id',leadId);
  if(error){toast('Assign failed');console.error(error);return;}
  await logActivity(leadId,'assigned',null,null,'Assigned to '+staffName(staffId));
  toast('Lead assigned to '+staffName(staffId));renderPool();
}

/* ---------------- NEW LEAD ---------------- */
function renderNew(){
  $('main').innerHTML=`
    <h2 style="margin-bottom:12px">New lead</h2>
    <div style="background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:20px;max-width:820px">
      ${['sales','manager','admin'].includes(ME.role)?`<div class="section sec-eng" style="margin:0 0 18px">
        <h4>Coming back for more?</h4>
        <div class="grid2">
          <div style="grid-column:1/-1"><label>Their reference ID or phone number</label>
            <input id="f-find" placeholder="202608-00009 or 0889898890" onkeydown="if(event.key==='Enter'){event.preventDefault();findCustomer();}"></div>
        </div>
        <div class="modal-actions"><button class="btn-line" onclick="findCustomer()">Find customer</button></div>
        <div id="f-found"></div>
      </div>`:''}
      <div class="grid2">
        <div><label>Customer name *</label><input id="f-name"></div>
        <div><label>Phone</label><input id="f-phone" placeholder="Can be added later"></div>
        <div><label>Customer type *</label><select id="f-ctype">${optList(CUSTOMER_TYPES,'Residential',false)}</select></div>
        <div><label>Monthly electricity bill (USD)</label><input id="f-bill" type="number" min="0" step="0.01"></div>
        <div><label>Lead channel *</label><select id="f-chan" onchange="subChan()">${optList(Object.keys(CHANNELS),'Digital_Marketing',false)}</select></div>
        <div><label>Sub-channel *</label><select id="f-sub"></select></div>
      </div>
      <div id="f-refwrap" style="display:none" class="grid2">
        <div><label>Referrer name</label><input id="f-refname"></div>
        <div><label>Referrer phone</label><input id="f-refphone"></div>
      </div>
      <div id="f-eventwrap" style="display:none" class="grid2">
        <div><label>Event name</label><input id="f-eventname" placeholder="e.g. Aeon Mall roadshow"></div>
        <div><label>Event date</label><input id="f-eventdate" type="date"></div>
      </div>
      <div class="grid2">
        <div style="grid-column:1/-1"><label>Site address (home no. &amp; street)</label><input id="f-addr"></div>
        <div><label>Province / City</label><select id="f-prov" onchange="geoProv()">${optList(PROVINCES,'')}</select></div>
        <div><label>District</label><select id="f-district" onchange="geoDist()"></select></div>
        <div><label>Commune</label><select id="f-commune"></select></div>
        <div><label>Type of site</label><input id="f-sitetype" placeholder="e.g. 3-Storey House"></div>
        <div style="grid-column:1/-1"><label>Note</label><textarea id="f-note" rows="2" placeholder="First info about the customer…"></textarea></div>
      </div>
      <div class="modal-actions"><button class="btn-sun" onclick="createLead()">Create lead</button></div>
      <p style="font-size:12px;color:var(--ink-soft);margin-top:10px">Name and sub-channel are required. Add the phone later and a sale engineer is assigned automatically.${ME.role==='marketing'?'':' A lead counts as qualified from Telling Price onwards.'}</p>
    </div>`;
  subChan(); geoProv(); NEWPARENT=null;
}
/* A customer who already bought. They will not remember a reference from a
   year ago but they know their own phone number, so both find them. Their
   details and the system already on the roof are copied in; the sale engineer
   keys it up to the total after the expansion, because EDC bands are worked on
   total inverter kWac. */
let NEWPARENT=null;
async function findCustomer(){
  const q=($('f-find').value||'').trim();
  const box=$('f-found');
  if(!q){box.innerHTML='';toast('Type a reference ID or a phone number');return;}
  const like='%'+q.replace(/[%,]/g,'')+'%';
  const {data,error}=await sb.from('leads').select('*')
    .eq('is_deleted',false)
    .or('ref_id.ilike.'+like+',phone.ilike.'+like)
    .order('created_at',{ascending:false}).limit(6);
  if(error){box.innerHTML='';toast('Could not search. '+why(error));console.error(error);return;}
  if(!(data||[]).length){
    box.innerHTML=blank('Nobody found','Check the reference ID or phone number. You only see customers on leads you are allowed to open.');
    return;
  }
  FOUND=data;
  box.innerHTML=data.map((l,i)=>`<div class="qcard">
      <b>${esc(l.customer_name||'No name')}</b> · ${esc(l.ref_id||'no ref')} · ${esc(l.phone||'no phone')}
      <span class="days">${esc(stageName(l.stage_code))}${l.stage_code===WON?' · won '+fmtDate(l.stage_entered_at):''} · ${esc(sysLine(l)||'no system recorded')}</span>
      <div class="acts"><button class="btn-mini" onclick="useCustomer(${i})">Use this customer</button></div>
    </div>`).join('');
}
let FOUND=[];
function useCustomer(i){
  const l=FOUND[i];
  if(!l)return;
  NEWPARENT=l;
  const set=(id,v)=>{const e=$(id);if(e)e.value=v??'';};
  set('f-name',l.customer_name);set('f-phone',l.phone);
  set('f-bill',l.monthly_bill_usd);
  const ct=$('f-ctype');if(ct&&l.customer_type)ct.value=l.customer_type;
  set('f-addr',l.site_address);set('f-sitetype',l.site_type);
  const prov=$('f-prov');
  if(prov&&(l.province||l.city_province)){
    prov.value=l.province||l.city_province;geoProv();
    const d=$('f-district');if(d&&l.district){d.value=l.district;geoDist();}
    const c=$('f-commune');if(c&&l.commune)c.value=l.commune;
  }
  const ch=$('f-chan');if(ch){ch.value='Existing_Customer';subChan();}
  const sub=$('f-sub');if(sub)sub.value='Expansion';
  $('f-found').innerHTML=`<div class="hint" style="border-left-color:var(--own-eng);color:var(--own-eng)">
    Following on from <b>${esc(l.ref_id||'their earlier deal')}</b>. Their system as it stands is copied across.
    Key in the system as it will be <b>after</b> the expansion, not just what is being added.
  </div>`;
  toast('Customer details filled in');
}
function subChan(){
  const ch=$('f-chan').value;
  let subs=CHANNELS[ch]||[];
  if(ch==='Direct_Sales') subs=STAFF.filter(s=>s.role==='sales'&&s.is_active).map(s=>s.full_name);
  $('f-sub').innerHTML=optList(subs,'');
  $('f-refwrap').style.display  = ch==='Third_Party'      ? 'grid' : 'none';
  $('f-eventwrap').style.display= ch==='Offline_Marketing'? 'grid' : 'none';
}
function geoProv(){
  const d=GEO[$('f-prov').value]||{};
  $('f-district').innerHTML=optList(Object.keys(d),'');
  geoDist();
}
function geoDist(){
  const list=(GEO[$('f-prov').value]||{})[$('f-district').value]||[];
  $('f-commune').innerHTML=optList(list,'');
}
async function createLead(){
  const name=$('f-name').value.trim(),phone=$('f-phone').value.trim();
  if(!name){toast('Customer name is required');return;}
  if(!$('f-sub').value){toast('Pick a sub-channel');return;}
  /* the same number turning up twice is usually a customer who called back,
     not a mistake — so this says so and lets it through. It only sees leads
     the person is allowed to see, so a silent no would be worse than this. */
  /* an expansion is the same customer on purpose, so the duplicate warning
     below would fire every single time and train people to click through it */
  if(phone&&!NEWPARENT){
    const {data:dupes}=await sb.from('leads').select('ref_id,customer_name,created_at')
      .eq('phone',phone).eq('is_deleted',false).order('created_at').limit(3);
    if(dupes&&dupes.length){
      const lines=dupes.map(d=>`  ${d.ref_id||'no ref'} — ${d.customer_name} (${fmtDate(d.created_at)})`).join('\n');
      if(!confirm(`This phone number is already on ${dupes.length} lead${dupes.length>1?'s':''}:\n\n${lines}\n\nCreate this one anyway?`))return;
    }
  }
  const row={
    customer_name:name,phone:phone||null,
    customer_type:$('f-ctype').value,
    monthly_bill_usd:$('f-bill').value||null,
    lead_channel:$('f-chan').value,
    lead_sub_channel:$('f-sub').value||null,
    referrer_name:$('f-refname')?($('f-refname').value.trim()||null):null,
    referrer_phone:$('f-refphone')?($('f-refphone').value.trim()||null):null,
    site_address:$('f-addr').value.trim()||null,
    commune:$('f-commune').value.trim()||null,
    district:$('f-district').value||null,
    province:$('f-prov').value||null,
    city_province:$('f-prov').value||null,
    site_type:$('f-sitetype').value.trim()||null,
    created_by:ME.id
  };
  /* an expansion carries the system already installed and stays with the
     person who sold it; the deal it follows is recorded on the row */
  if(NEWPARENT){
    const p=NEWPARENT;
    Object.assign(row,{
      parent_lead_id:p.id,
      assigned_to:p.assigned_to||null,
      assigned_at:p.assigned_to?new Date().toISOString():null,
      site_engineer_id:p.site_engineer_id||null,
      site_link:p.site_link||null,
      roof_type:p.roof_type,system_type:p.system_type,phase_type:p.phase_type,
      panel_brand:p.panel_brand,panel_watt:p.panel_watt,panel_pcs:p.panel_pcs,panel_kwp:p.panel_kwp,
      inverter_brand:p.inverter_brand,inverter_kw:p.inverter_kw,inverter_pcs:p.inverter_pcs,
      inverter_kw_total:p.inverter_kw_total,
      battery_brand:p.battery_brand,battery_kwh_each:p.battery_kwh_each,
      battery_pcs:p.battery_pcs,battery_kwh:p.battery_kwh
    });
  }
  if($('f-chan').value==='Offline_Marketing'){
    row.event_name=$('f-eventname').value.trim()||null;
    row.event_date=$('f-eventdate').value||null;
  }
  const {data,error}=await sb.from('leads').insert(row).select().single();
  if(error){toast('Create failed. '+why(error));console.error(error);return;}
  await logActivity(data.id,'created',null,'info_gathering',$('f-note').value.trim()||'Lead created');
  if(NEWPARENT){
    await logActivity(data.id,'note',null,null,
      'Expansion of '+(NEWPARENT.ref_id||'an earlier deal')+' for the same customer');
    await logActivity(NEWPARENT.id,'note',null,null,'A new deal was opened for this customer');
    NEWPARENT=null;
  }
  toast((data.ref_id?'Lead '+data.ref_id+' created':'Lead created')
    +(data.assigned_to?', assigned to '+staffName(data.assigned_to)
      :' Add the phone number to hand it to sales.'));
  LEADSCOPE='active';go('leads');
}

/* installation and BOQ: the site engineer's whole job, so for them it sits
   first and everything else is context they scroll past */
/* What is actually going on the roof, read only. The site engineer used to be
   sent to a house with dates, a team and a map link but no specification at
   all — not a panel count, not an inverter size. The key-in box is still the
   sale engineer's, so this is shown only to whoever cannot see that one. */
function siteSpec(l,always){
  if(!always&&['sales','manager','admin'].includes(ME.role))return '';
  const parts=[
    ['Panel',   panelModel(l.panel_brand,l.panel_watt),                l.panel_brand,    l.panel_pcs],
    ['Inverter',inverterModel(l.inverter_brand,l.inverter_kw,l.phase_type), l.inverter_brand, l.inverter_pcs],
    ['Battery', batteryModel(l.battery_brand,l.battery_kwh_each),      l.battery_brand,  l.battery_pcs]
  ].filter(([,,brand])=>brand);
  const facts=[
    ['Roof',l.roof_type],['System',l.system_type],['Ampere & phase',l.phase_type],
    ['Panels',l.panel_pcs&&l.panel_watt?`${l.panel_pcs} × ${l.panel_watt}W${l.panel_kwp?` · ${l.panel_kwp} kWp`:''}`:null],
    ['Inverter',l.inverter_pcs&&l.inverter_kw?`${l.inverter_pcs} × ${l.inverter_kw} kW`:null],
    ['Battery',l.battery_kwh?`${l.battery_kwh} kWh${l.battery_pcs?` · ${l.battery_pcs} pcs`:''}`:null]
  ].filter(([,v])=>v);
  if(!facts.length&&!parts.length)
    return `<div class="section sec-eng"><h4>System</h4>${blank('Not specified yet','The sale engineer keys the system in before installation.')}</div>`;
  return `<div class="section sec-eng"><h4>System</h4>
      <div class="grid3">
        ${facts.map(([k,v])=>`<div><label>${esc(k)}</label><input value="${esc(v)}" disabled></div>`).join('')}
      </div>
      ${parts.length?`<div class="kit">${parts.map(([kind,model,brand,pcs])=>{
        const img=imgFor(model);
        return `<div class="kit-item">
          <div class="kit-pic">${img?`<img src="${esc(img)}" alt="" onerror="this.remove()">`:''}</div>
          <div class="kit-txt"><b>${esc(model||brand)}</b>
            <span>${esc(kind)}${pcs?' · '+esc(pcs)+' pcs':''}${model?'':' · no part number'}</span></div>
        </div>`;}).join('')}</div>`:''}
    </div>`;
}
function siteBox(l,canSite,first,isAdmin){
  return siteSpec(l)+`<div class="section sec-install${first?' lead-first':''}"><h4>Installation ${l.site_engineer_id?('· '+esc(staffName(l.site_engineer_id))):'· no site engineer yet'}</h4>
      <div class="grid3">
        <div><label>Delivery date</label><input id="d-deliv" type="date" value="${l.delivery_date||''}" ${canSite?'':'disabled'}></div>
        <div><label>Installation start</label><input id="d-cstart" type="date" value="${l.installation_start||''}" ${canSite?'':'disabled'}></div>
        <div><label>Installation end</label><input id="d-cend" type="date" value="${l.installation_end||''}" ${canSite?'':'disabled'}></div>
        <div><label>Installation team</label><select id="d-team" ${canSite?'':'disabled'}>${optList(INSTALL_TEAMS,l.installation_team)}</select></div>
        <div><label>BOQ release</label><input value="${esc(l.boq_status||'not set yet')}" disabled title="Set by the sale engineer"></div>
        <div><label>BOQ date</label><input value="${l.boq_date?fmtDate(l.boq_date):'—'}" disabled></div>
        <div><label>Arrived at the customer</label><input value="${l.delivery_confirmed_at?fmtDT(l.delivery_confirmed_at):'not confirmed'}" disabled></div>
        <div style="align-self:end">${!l.delivery_confirmed_at?`<button class="btn-line" onclick="confirmArrived('${l.id}',${JSON.stringify(l.customer_name||'')})">Confirm it arrived</button>`:''}</div>
        <div><label>Installation finished</label><input value="${l.installation_confirmed_at?fmtDT(l.installation_confirmed_at)+' · '+staffName(l.installation_confirmed_by):'not confirmed'}" disabled></div>
        <div style="align-self:end">${!l.installation_confirmed_at?`<button class="btn-line" onclick="confirmInstalled('${l.id}',${JSON.stringify(l.customer_name||'')})">Confirm it is finished</button>`:''}</div>
        <div style="grid-column:1/-1"><label>Location</label>${l.site_link
          ?`<a href="${esc(l.site_link)}" target="_blank" rel="noopener noreferrer" style="display:block;padding:9px 0;font-size:13px">Open the map link →</a>`
          :`<input value="No link yet. Ask the sale engineer." disabled>`}</div>
        <div style="grid-column:1/-1"><label>Site notes</label><textarea id="d-sitenotes" rows="2" placeholder="Access, materials, anything the crew needs to know…" ${canSite?'':'disabled'}>${esc(l.site_notes||'')}</textarea></div>
      </div>
    </div>`+serviceBox(l,canSite);
}
/* After handover. The job is finished and the relationship is not: a system
   gets checked and cleaned every year, and whatever the customer raises
   afterwards has to land somewhere the next visit will read it. Operations
   fill this in, which in this app is the site engineer. It only appears once
   the installation is actually finished — before that it is noise on a job
   nobody has done yet. */
function serviceBox(l,canSite){
  if(!(l.installation_confirmed_at||l.installation_end))return '';
  return `<div class="section sec-site"><h4>After installation</h4>
      <div class="grid2">
        <div><label>Yearly check-up due</label><input id="d-svchk" type="date" value="${l.service_checkup_date||''}" ${canSite?'':'disabled'} title="When this system is next due a service check"></div>
        <div><label>Yearly clean due</label><input id="d-svclean" type="date" value="${l.service_clean_date||''}" ${canSite?'':'disabled'} title="When the panels are next due a clean"></div>
        <div style="grid-column:1/-1"><label>General information or issue</label><textarea id="d-svgen" rows="2" placeholder="What the customer told you" ${canSite?'':'disabled'}>${esc(l.service_general_note||'')}</textarea></div>
        <div style="grid-column:1/-1"><label>Technical issue</label><textarea id="d-svtech" rows="2" placeholder="Faults, replacements, anything the next visit needs" ${canSite?'':'disabled'}>${esc(l.service_technical_note||'')}</textarea></div>
        <div style="grid-column:1/-1"><label>Other</label><textarea id="d-svother" rows="2" ${canSite?'':'disabled'}>${esc(l.service_other_note||'')}</textarea></div>
      </div>
    </div>`;
}
