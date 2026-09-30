/* ---------------- LEADS ---------------- */
/* Active, won and lost are one list sliced three ways. renderLeads fetches,
   paintLeads draws — kept apart so switching slice is instant and never
   round-trips to Supabase for rows it already holds. */
async function renderLeads(scope){
  /* finance work won deals and their money, from their own screen */
  if(ME.role==='finance'){
    $('main').innerHTML=blank('Leads are not open to your role','Won deals and their payments are under Finance.');return;}
  LEADSCOPE=scope||LEADSCOPE;
  /* coming back from Unassigned: its column ticks mean nothing here */
  if(LV!==LV_LEADS){LV=LV_LEADS;COLF={};SEL.clear();LEADPAGE=0;}
  $('main').innerHTML=SKEL;
  /* each orders on something unique, so a table past a thousand rows pages
     without repeating any */
  const B={
    fins:()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id'),
    rem:()=>sb.from('lead_activities').select('lead_id,note,note_date,created_at,actor_id')
      .not('note','is',null).order('created_at',{ascending:false}).order('id'),
    qs:()=>sb.from('quotations').select('lead_id,price_usd,created_at')
      .order('created_at',{ascending:false}).order('id')};
  /* admin and the manager see every lead, so byLeadIds will read these tables
     whole and needs no ids from them - start the downloads now, beside the
     leads, and the calls below join them rather than waiting behind */
  if(['admin','manager'].includes(ME.role)){
    if(canSeeMoney())fetchAll(B.fins).catch(()=>{});
    fetchAll(B.rem).catch(()=>{});fetchAll(B.qs).catch(()=>{});
  }
  LEADS=await fetchLeads(q=>{
    if(ME.role==='sales')return q.eq('assigned_to',ME.id);
    if(ME.role==='site_engineer')return q.eq('site_engineer_id',ME.id);
    /* marketing is left to RLS, which since 17 Aug 2026 gives them the leads
       they created and nothing else */
    return q;
  });
  /* sale values come from their own table, and only for roles the database
     lets read it — for anyone else they simply stay undefined */
  const ids=LEADS.map(l=>l.id);
  /* the three lookups run side by side; one after another they were most of
     the wait */
  const soft=p=>p.catch(e=>{console.error(e);return[];});
  const [fins,rem,qs]=LEADS.length?await Promise.all([
    canSeeMoney()?soft(byLeadIds(B.fins,ids)):[],
    soft(byLeadIds(B.rem,ids)),
    soft(byLeadIds(B.qs,ids))
  ]):[[],[],[]];
  if(canSeeMoney()&&LEADS.length){
    const byId=Object.fromEntries(fins.map(f=>[f.lead_id,f.final_sale_usd]));
    LEADS.forEach(l=>{l.final_sale_usd=byId[l.id]??null;});
  }
  /* the newest remark per lead, so sales can read the list without opening rows */
  if(LEADS.length){
    const by={};
    rem.forEach(a=>{(by[a.lead_id]=by[a.lead_id]||[]).push(a);});
    LEADS.forEach(l=>{
      l.remarks=humanNotes(by[l.id]).sort((x,y)=>remarkDate(y).localeCompare(remarkDate(x)));
      l.last_remark=l.remarks[0]||null;
    });
    /* the last price quoted, for the column that replaces the salesperson's
       own name when they are looking at their own list */
    const qby={};
    qs.forEach(q=>{if(!qby[q.lead_id])qby[q.lead_id]=q;});
    LEADS.forEach(l=>{l.last_quot=qby[l.id]||null;});
  }
  paintLeads();
}
/* Marketing sees who the customer is, not where the deal has got to: no stage,
   no qualification, no ref ID (which is only issued on qualifying), no aging,
   no sales follow-up, and no Won/Lost tabs — those are stage by another name. */
const mktOnly=()=>ME.role==='marketing';
function paintLeads(){
  const rows=scopeLeads();
  $('main').innerHTML=(mktOnly()?mktStats(rows):LEADSCOPE==='all'?allStats(rows):LEADSCOPE==='active'?activeStats():LEADSCOPE==='won'?wonStats(rows):lostStats(rows))
    +(isBoss()&&LEADSCOPE==='active'?teamPanel():'')+`
    <div class="toolbar">
      ${(ME.role==='site_engineer'||mktOnly())?'':`<div class="scope">
        ${[['active','Active'],['won','Won'],['lost','Lost'],['all','All']].map(([k,label])=>
          `<button class="${LEADSCOPE===k?'on':''}" onclick="setScope('${k}')">${label}</button>`).join('')}
      </div>`}
      <input placeholder="Search name, phone or ref ID…" value="${esc(FILTER.q||'')}" oninput="FILTER.q=this.value;LEADPAGE=0;drawTable()">
      <select onchange="FILTER.channel=this.value;LEADPAGE=0;paintLeads()" title="Channel">
        <option value="">All channels</option>
        <option value="__mkt" ${FILTER.channel==='__mkt'?'selected':''}>Marketing (digital + offline)</option>
        ${Object.keys(CHANNELS).map(c=>`<option value="${c}" ${FILTER.channel===c?'selected':''}>${esc(c.replace(/_/g,' '))}</option>`).join('')}
        <option value="__none" ${FILTER.channel==='__none'?'selected':''}>No channel set</option>
      </select>
      <span class="daterange" title="The lead's own date">
        <input type="date" value="${FILTER.from||''}" onchange="FILTER.from=this.value;LEADPAGE=0;paintLeads()" aria-label="From">
        <span>to</span>
        <input type="date" value="${FILTER.to||''}" onchange="FILTER.to=this.value;LEADPAGE=0;paintLeads()" aria-label="To">
      </span>
      ${isBoss()?`
      <select onchange="FILTER.by=this.value;LEADPAGE=0;paintLeads()" title="Created by">
        <option value="">Anyone created</option>
        ${creators().map(s=>`<option value="${s.id}" ${FILTER.by===s.id?'selected':''}>${esc(s.full_name)}</option>`).join('')}
      </select>`:''}
      <button class="btn-line" onclick="FILTER={q:'',from:'',to:'',channel:'',by:''};COLF={};LEADPAGE=0;SEL.clear();paintLeads()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="exportLeads()" title="Exports the rows currently shown">Export CSV</button>
    </div>
    ${isBoss()?'<div class="bulkbar" id="bulkbar" style="display:none"></div>':''}
    <div class="tablewrap" id="tablewrap"></div>`;
  drawTable();
}
/* filters are cleared on a scope change, since a stage filter means nothing
   on Won or Lost and would silently hide rows */
function setScope(s){
  if(LEADSCOPE===s)return;
  LEADSCOPE=s;
  /* the dates and the channel carry across tabs: they say which leads, not
     where a lead has got to */
  FILTER={q:'',from:FILTER.from||'',to:FILTER.to||'',channel:FILTER.channel||'',by:FILTER.by||''};
  /* the person carries across tabs like the dates; a stage or a BOQ does not */
  COLF=COLF.eng?{eng:COLF.eng}:{};
  LEADPAGE=0;SEL.clear();
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
  /* a won deal with no BOQ cannot be installed, so it sits beside the count of
     won deals rather than at the end — and the ones still waiting are the
     half worth reading, so they are named */
  const boq=rows.filter(l=>l.boq_status==='Done');
  const noBoq=rows.length-boq.length;
  return `<div class="stats">
      <div class="stat hero"><div class="n">${rows.length}</div><div class="l">Closed-Won</div></div>
      <div class="stat ${noBoq?'alert':''}"><div class="n">${boq.length}</div><div class="l">BOQ released</div>
        <span class="days">${noBoq?noBoq+' still waiting':'all released'}</span></div>
      ${canSeeMoney()?`<div class="stat"><div class="n">${fmtMoney(value)}</div><div class="l">Total contract value (USD)</div></div>`:''}
      <div class="stat"><div class="n">${booked.length}</div><div class="l">Installation booked</div></div>
    </div>`;
}
/* every lead whatever its stage, which is what an export of "everything
   between two dates" needs */
function allStats(rows){
  const f=filteredLeads();
  return `<div class="stats">
      <div class="stat hero"><div class="n">${f.length.toLocaleString()}</div><div class="l">Leads${f.length!==rows.length?' matching':''}</div></div>
      <div class="stat"><div class="n">${f.filter(l=>!TERMINAL.includes(l.stage_code)).length.toLocaleString()}</div><div class="l">Active</div></div>
      <div class="stat"><div class="n">${f.filter(l=>l.stage_code===WON).length.toLocaleString()}</div><div class="l">Won</div></div>
      <div class="stat"><div class="n">${f.filter(l=>l.stage_code===LOST).length.toLocaleString()}</div><div class="l">Lost</div></div>
    </div>`;
}
function lostStats(rows){
  return `<div class="stats">
      <div class="stat hero"><div class="n">${rows.filter(isClosedLost).length.toLocaleString()}</div><div class="l">Closed-Lost</div></div>
      <div class="stat"><div class="n">${rows.filter(isDisqualified).length.toLocaleString()}</div><div class="l">Disqualified</div></div>
    </div>`;
}
/* rows for the current tab, before the toolbar filters */
/* The manager sees only leads with a phone number: one with none is still
   marketing's, and nobody in sales can call it yet (Kevin, 30 Sep 2026). Her
   Marketing team table still counts them, under No phone. */
const mgrRows=()=>ME.role==='manager'?LEADS.filter(l=>(l.phone||'').trim()):LEADS;
function scopeLeads(){
  if(mktOnly())return LEADS;
  const LEADS_=mgrRows();
  if(LEADSCOPE==='won')return LEADS_.filter(l=>l.stage_code===WON);
  if(LEADSCOPE==='lost')return LEADS_.filter(l=>l.stage_code===LOST);
  if(LEADSCOPE==='all')return LEADS_;
  return LEADS_.filter(l=>!STAGES.find(s=>s.stage_code===l.stage_code)?.is_terminal);
}
function filteredLeads(){
  let rows=colFiltered(scopeLeads());
  /* the lead's own date - the day it came in, as the reports count it - and
     the channel, the two things "which leads" is usually asked by */
  const dayOf=l=>l.lead_date||localDay(l.created_at);
  if(FILTER.from)rows=rows.filter(l=>dayOf(l)>=FILTER.from);
  if(FILTER.to)rows=rows.filter(l=>dayOf(l)<=FILTER.to);
  if(FILTER.channel==='__mkt')rows=rows.filter(l=>['Digital_Marketing','Offline_Marketing'].includes(l.lead_channel));
  else if(FILTER.channel==='__none')rows=rows.filter(l=>!l.lead_channel);
  else if(FILTER.channel)rows=rows.filter(l=>l.lead_channel===FILTER.channel);
  if(FILTER.by)rows=rows.filter(l=>l.created_by===FILTER.by);
  if(FILTER.q){const q=FILTER.q.toLowerCase();rows=rows.filter(l=>
    (l.customer_name||'').toLowerCase().includes(q)||(l.phone||'').includes(q)||(l.ref_id||'').toLowerCase().includes(q));}
  return rows;
}
/* ---- filters in the column headings, the way Excel does it (28 Sep 2026) ----
   A heading with a ▾ lists the values in that column with how many rows carry
   each, and ticking them filters the list. What has no column - search, the
   dates, the channel, who created it - stays in the toolbar. Each column reads
   its value through one function, so the heading, the ticks and the filter
   cannot disagree. */
let COLF={}, ROWNO=0;
/* which list the heading filters, the tick boxes and the pager are driving -
   Leads, or the Unassigned pool (28 Sep 2026). One set of tools, two lists. */
const LV_LEADS={name:'leads',src:()=>scopeLeads(),rows:()=>filteredLeads(),draw:()=>drawTable(),after:()=>paintLeads()};
let LV=LV_LEADS;
const fuWord=l=>!l.next_follow_up?'No date':FU_TEST.overdue(l)?'Overdue':FU_TEST.today(l)?'Today':'Later';
const COLSPEC={
  stage:l=>(STAGES.find(s=>s.stage_code===l.stage_code)||{}).stage_name||l.stage_code||'—',
  qual:l=>qualText(l),
  eng:l=>l.assigned_to?staffName(l.assigned_to):'Not assigned',
  site:l=>l.site_engineer_id?staffName(l.site_engineer_id):'None',
  boq:l=>l.boq_status||'Not set',
  sched:l=>l.installation_start||l.installation_end?'Scheduled':'Not scheduled',
  fu:fuWord,
  rem:l=>FU_TEST.quiet(l)?'No remark in 7 days':'Remark in last 7 days',
  chan:l=>(l.lead_channel||l.lead_source||'—').replace(/_/g,' '),
  ctype:l=>l.customer_type||'—',
  quot:l=>QUOTE_STAGE_TEXT[quoteStage(l,!!l.last_quot)],
  ltype:l=>lostType(l),
  /* the month a lead was lost in, so this month's losses are one tick away */
  lostm:l=>l.stage_entered_at?monthName(localDay(l.stage_entered_at).slice(0,7)):'—',
  by:l=>l.created_by?staffName(l.created_by):'—',
  hasphone:l=>l.phone?'Has phone':'No phone',
  wait:l=>{const d=daysIn(l.created_at);return d<=7?'0-7 days':d<=30?'8-30 days':d<=90?'31-90 days':'Over 90 days';}
};
function colFiltered(rows,skip){
  for(const k in COLF){
    if(k===skip||!COLF[k]||!COLF[k].length)continue;
    const want=new Set(COLF[k]);
    rows=rows.filter(l=>want.has(COLSPEC[k](l)));
  }
  return rows;
}
/* a heading: the label, and a ▾ that lights when its column is filtered */
const th=(label,k)=>k
  ?`<th class="colf ${COLF[k]&&COLF[k].length?'on':''}"><button onclick="event.stopPropagation();openColF(this,'${k}')">${label}<span class="caret">▾</span></button></th>`
  :`<th>${label}</th>`;
function openColF(btn,k){
  closeColF();
  /* the values come from the rows the OTHER filters leave, like Excel */
  const base=colFiltered(LV.src(),k);
  const count={};base.forEach(l=>{const v=COLSPEC[k](l);count[v]=(count[v]||0)+1;});
  const vals=Object.keys(count).sort((a,b)=>count[b]-count[a]||a.localeCompare(b));
  const cur=new Set(COLF[k]||[]);
  const box=document.createElement('div');
  box.className='colpop';box.id='colpop';box.onclick=e=>e.stopPropagation();
  box.innerHTML=`${vals.length>8?`<input placeholder="Find…" oninput="colFind(this.value)">`:''}
    <label class="all"><input type="checkbox" ${!cur.size?'checked':''} onchange="colAll('${k}',this.checked)"> All</label>
    <div class="vals">${vals.map(v=>`<label><input type="checkbox" value="${esc(v)}" ${cur.has(v)?'checked':''} onchange="colTick('${k}')"> <span>${esc(v)}</span><i>${count[v].toLocaleString()}</i></label>`).join('')}</div>`;
  document.body.appendChild(box);
  const r=btn.getBoundingClientRect();
  box.style.top=(r.bottom+scrollY+4)+'px';
  box.style.left=Math.min(r.left+scrollX,scrollX+innerWidth-box.offsetWidth-12)+'px';
  setTimeout(()=>document.addEventListener('click',closeColF,{once:true}),0);
}
function closeColF(){const p=$('colpop');if(p)p.remove();}
function colFind(q){q=q.toLowerCase();document.querySelectorAll('#colpop .vals label').forEach(x=>{x.style.display=x.textContent.toLowerCase().includes(q)?'':'none';});}
function colTick(k){
  COLF[k]=[...document.querySelectorAll('#colpop .vals input:checked')].map(c=>c.value);
  document.querySelector('#colpop .all input').checked=!COLF[k].length;
  colApply();
}
function colAll(k,on){
  if(!on)return;
  COLF[k]=[];document.querySelectorAll('#colpop .vals input').forEach(c=>c.checked=false);
  colApply();
}
/* redraw the table under the open list, keeping the list where it is */
function colApply(){
  LEADPAGE=0;SEL.clear();
  const pop=$('colpop');if(pop)pop.remove();
  LV.draw();
  if(pop)document.body.appendChild(pop);
}
/* ---- the manager's view of her two teams (28 Sep 2026) ----
   She runs sales and marketing and could only read the list one lead at a
   time. So: filter by who holds a lead and who created it, a table of each
   person's backlog that is itself the filter, and assigning many at once. */
const isBoss=()=>ME.role==='manager';
const SEL=new Set();
const todayStr=()=>localDay(new Date());
const isOpen=l=>!TERMINAL.includes(l.stage_code);
/* a lead nobody has written to in a week, counting only what people typed */
const quietDays=7;
const lastTouch=l=>l.last_remark?remarkDate(l.last_remark):localDay(l.created_at);
const FU_TEST={
  overdue:l=>!!l.next_follow_up&&l.next_follow_up.slice(0,10)<todayStr(),
  today:l=>!!l.next_follow_up&&l.next_follow_up.slice(0,10)===todayStr(),
  none:l=>!l.next_follow_up,
  quiet:l=>(new Date(todayStr())-new Date(lastTouch(l)))/864e5>=quietDays
};
/* whoever holds leads, not whoever holds the role - see the per-person rule */
function holders(){
  const ids=new Set(LEADS.map(l=>l.assigned_to).filter(Boolean));
  assignable().forEach(s=>ids.add(s.id));
  return STAFF.filter(s=>ids.has(s.id)).sort((a,b)=>a.full_name.localeCompare(b.full_name));
}
function creators(){
  const ids=new Set(LEADS.map(l=>l.created_by).filter(Boolean));
  return STAFF.filter(s=>ids.has(s.id)).sort((a,b)=>a.full_name.localeCompare(b.full_name));
}
function teamPanel(){
  const mon=todayStr().slice(0,7);
  const open=mgrRows().filter(isOpen);
  const cell=(n,who,fu,cls)=>n?`<a class="tp-n ${cls||''}" onclick="event.stopPropagation();teamPick('who','${who}','${fu||''}')">${n}</a>`:'<span class="quiet">0</span>';
  const people=holders().filter(s=>s.is_active||open.some(l=>l.assigned_to===s.id));
  const sRow=(id,name)=>{
    const mine=id==='__none'?open.filter(inPool):open.filter(l=>l.assigned_to===id);
    const won=id==='__none'?0:mgrRows().filter(l=>l.assigned_to===id&&l.stage_code===WON&&localDay(l.stage_entered_at).slice(0,7)===mon).length;
    return `<tr class="${(COLF.eng||[]).join()===name?'on':''}"><td><a onclick="teamPick('who','${id}','')">${esc(name)}</a></td>
      <td>${cell(mine.length,id,'')}</td>
      <td>${cell(mine.filter(FU_TEST.overdue).length,id,'overdue','bad')}</td>
      <td>${cell(mine.filter(FU_TEST.today).length,id,'today')}</td>
      <td>${cell(mine.filter(FU_TEST.none).length,id,'none')}</td>
      <td>${cell(mine.filter(FU_TEST.quiet).length,id,'quiet','bad')}</td>
      <td>${won||'<span class="quiet">0</span>'}</td></tr>`;
  };
  const mkt=STAFF.filter(s=>s.role==='marketing'&&s.is_active);
  const mRow=s=>{
    const made=LEADS.filter(l=>l.created_by===s.id);
    const month=made.filter(l=>(l.lead_date||localDay(l.created_at)).slice(0,7)===mon);
    const nophone=made.filter(l=>isOpen(l)&&!l.phone);
    const waiting=made.filter(inPool);
    return `<tr class="${FILTER.by===s.id?'on':''}"><td><a onclick="teamPick('by','${s.id}','')">${esc(s.full_name)}</a></td>
      <td>${month.length}</td><td>${nophone.length}</td><td>${waiting.length}</td></tr>`;
  };
  return `<div class="teampanel">
    <div class="tp-box"><h3>Sales team <span class="days">open leads</span></h3>
      <table class="tp"><thead><tr><th>Person</th><th>Open</th><th>Overdue</th><th>Today</th><th>No date</th><th>No remark ${quietDays}d+</th><th>Won this month</th></tr></thead>
      <tbody>${people.map(s=>sRow(s.id,s.full_name)).join('')}${sRow('__none','Not assigned')}</tbody></table></div>
    ${mkt.length?`<div class="tp-box"><h3>Marketing team</h3>
      <table class="tp"><thead><tr><th>Person</th><th>Leads this month</th><th>No phone</th><th>Not assigned</th></tr></thead>
      <tbody>${mkt.map(mRow).join('')}</tbody></table></div>`:''}
  </div>`;
}
/* a number in the team table is the filter that shows those rows */
function teamPick(kind,id,fu){
  const FU={overdue:['fu','Overdue'],today:['fu','Today'],none:['fu','No date'],quiet:['rem','No remark in 7 days']};
  if(kind==='by'){
    FILTER.by=FILTER.by===id?'':id;COLF={};
  }else{
    const name=id==='__none'?'Not assigned':staffName(id);
    /* Not assigned counts only leads with a phone (inPool), so its list does too */
    const want=id==='__none'?{eng:[name],hasphone:['Has phone']}:{eng:[name]};
    if(FU[fu])want[FU[fu][0]]=[FU[fu][1]];
    const same=JSON.stringify(COLF)===JSON.stringify(want);
    FILTER.by='';COLF=same?{}:want;
  }
  LEADPAGE=0;SEL.clear();paintLeads();
  $('tablewrap').scrollIntoView({block:'start',behavior:'smooth'});
}
function toggleSel(id,on){on?SEL.add(id):SEL.delete(id);drawBulkBar();}
function toggleSelPage(on){
  document.querySelectorAll('#tablewrap input.pick').forEach(c=>{c.checked=on;on?SEL.add(c.value):SEL.delete(c.value);});
  drawBulkBar();
}
function selectAllFiltered(){LV.rows().forEach(l=>SEL.add(l.id));LV.draw();}
function drawBulkBar(){
  const bar=$('bulkbar');if(!bar)return;
  const total=LV.rows().length;
  bar.style.display=SEL.size?'flex':'none';
  bar.innerHTML=SEL.size?`<b>${SEL.size} selected</b>
    ${SEL.size<total?`<button class="btn-line" onclick="selectAllFiltered()">Select all ${total.toLocaleString()}</button>`:''}
    <span>Assign to</span>
    <select id="bulk-who">${assignable().map(s=>`<option value="${s.id}">${esc(assignLabel(s))}</option>`).join('')}</select>
    <button class="btn-sun" onclick="bulkAssign()">Assign</button>
    <button class="btn-line" onclick="SEL.clear();LV.draw()">Clear selection</button>
    ${(LV.name==='pool'&&['admin','manager'].includes(ME.role))?`<span class="spacer"></span><button class="btn-line danger" onclick="bulkDelete()">Delete</button>`:''}`:'';
}
/* admin only, and a soft delete like the one on a single lead: the rows keep
   their history and can be brought back (28 Sep 2026) */
async function bulkDelete(){
  if(!['admin','manager'].includes(ME.role))return;
  const ids=[...SEL];if(!ids.length)return;
  if(!confirm(`Delete ${ids.length} lead${ids.length>1?'s':''}? They leave every list and report.`))return;
  const at=new Date().toISOString();
  for(let i=0;i<ids.length;i+=200){
    const {error}=await sb.from('leads').update({is_deleted:true,deleted_at:at,deleted_by:ME.id}).in('id',ids.slice(i,i+200));
    if(error){toast('Delete failed. '+why(error));console.error(error);return;}
  }
  LEADS=LEADS.filter(l=>!SEL.has(l.id));
  SEL.clear();
  toast(ids.length+' deleted');
  LV.after();
}
async function bulkAssign(){
  const who=$('bulk-who').value, ids=[...SEL];
  if(!who||!ids.length)return;
  if(!confirm(`Assign ${ids.length} lead${ids.length>1?'s':''} to ${staffName(who)}?`))return;
  const at=new Date().toISOString();
  for(let i=0;i<ids.length;i+=200){
    const {error}=await sb.from('leads').update({assigned_to:who,assigned_at:at}).in('id',ids.slice(i,i+200));
    if(error){toast('Assign failed. '+why(error));console.error(error);return;}
  }
  await Promise.all(ids.map(id=>logActivity(id,'assigned',null,null,'Assigned to '+staffName(who))));
  LEADS.forEach(l=>{if(SEL.has(l.id)){l.assigned_to=who;l.assigned_at=at;}});
  SEL.clear();
  toast(ids.length+' assigned to '+staffName(who));
  LV.after();
}
/* marketing's list reads by the date the lead came in, which the person can
   backdate - so it is sorted on that, created_at breaking ties. Done before
   the page is cut, or page one would be fifty arbitrary rows sorted among
   themselves rather than the newest fifty. */
function mktSort(rows){
  return rows.slice().sort((a,b)=>
    ((b.lead_date||localDay(b.created_at))+b.created_at)
      .localeCompare((a.lead_date||localDay(a.created_at))+a.created_at));
}
function drawTable(){
  let all=filteredLeads();
  if(!all.length){drawBulkBar();$('tablewrap').innerHTML=FILTER.q||FILTER.from||FILTER.to||FILTER.channel||FILTER.by||Object.values(COLF).some(v=>v&&v.length)
    ?blank('No matches','Nothing in this list fits the current search or filters. Clear them to see everything.')
    :LEADSCOPE==='won'?blank('No won deals yet','Deals appear here once a sale engineer marks them Closed-Won.')
    :LEADSCOPE==='lost'?blank('Nothing lost','Leads marked Closed-Lost are kept here.')
    :blank('No active leads','New leads land here as soon as they are created.');return;}
  if(mktOnly())all=mktSort(all);
  const pages=Math.ceil(all.length/PAGE_SIZE);
  if(LEADPAGE>pages-1)LEADPAGE=pages-1;
  const rows=all.slice(LEADPAGE*PAGE_SIZE,(LEADPAGE+1)*PAGE_SIZE);
  /* the No column counts down what is on screen now, so it restarts with every filter */
  ROWNO=LEADPAGE*PAGE_SIZE;
  if(mktOnly())drawMktTable(rows);
  else if(LEADSCOPE==='won')drawWonTable(rows);
  else if(LEADSCOPE==='lost')drawLostTable(rows);
  else drawActiveTable(rows);
  $('tablewrap').insertAdjacentHTML('beforeend',pager(all.length,pages));
  drawBulkBar();
}
function pager(total,pages){
  if(pages<2)return '';
  const from=LEADPAGE*PAGE_SIZE+1, to=Math.min(total,(LEADPAGE+1)*PAGE_SIZE);
  return `<div class="pager">
      <span>${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}</span>
      <button class="btn-line" onclick="goPage(0)" ${LEADPAGE?'':'disabled'}>First</button>
      <button class="btn-line" onclick="goPage(${LEADPAGE-1})" ${LEADPAGE?'':'disabled'}>Previous</button>
      <span class="pg">Page ${LEADPAGE+1} of ${pages}</span>
      <button class="btn-line" onclick="goPage(${LEADPAGE+1})" ${LEADPAGE<pages-1?'':'disabled'}>Next</button>
      <button class="btn-line" onclick="goPage(${pages-1})" ${LEADPAGE<pages-1?'':'disabled'}>Last</button>
    </div>`;
}
function goPage(n){
  LEADPAGE=Math.max(0,n);
  LV.draw();
  $('tablewrap').scrollIntoView({block:'start',behavior:'smooth'});
}
function drawActiveTable(rows){
  const pick=isBoss();
  $('tablewrap').innerHTML=`<table class="${showRemarks()?'with-rem':''}"><thead><tr>
    ${pick?`<th class="pickcol"><input type="checkbox" title="Select this page" ${rows.length&&rows.every(l=>SEL.has(l.id))?'checked':''} onchange="toggleSelPage(this.checked)"></th>`:''}<th class="rowno">No</th><th>Ref ID</th>${th('Customer','ctype')}<th>Phone</th>${th('Stage','stage')}${th('Qualified','qual')}${ME.role==='sales'?'<th>Quotation</th>':th('Sale engineer','eng')}${th('Follow-up','fu')}<th>Aging</th>${showRemarks()?th('Remarks','rem'):''}
  </tr></thead><tbody>`+rows.map((l,i)=>{
    const od=l.next_follow_up&&new Date(l.next_follow_up)<new Date().setHours(0,0,0,0);
    return `<tr class="rowlink ${SEL.has(l.id)?'picked':''}" onclick="openLead('${l.id}')">
      ${pick?`<td class="pickcol" onclick="event.stopPropagation()"><input type="checkbox" class="pick" value="${l.id}" ${SEL.has(l.id)?'checked':''} onchange="toggleSel(this.value,this.checked);this.closest('tr').classList.toggle('picked',this.checked)"></td>`:''}
      <td class="rowno">${ROWNO+i+1}</td><td class="refid">${esc(l.ref_id||'—')}</td>
      <td class="cust"><b>${esc(l.customer_name)}</b><span class="days">${esc(l.customer_type||'')}</span></td>
      <td class="phone">${l.phone?phoneCell(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${stagePill(l.stage_code)}</td>
      <td>${qualPill(l)}</td>
      <td>${ME.role==='sales'
        ?(l.last_quot?`<b>${fmtMoney(l.last_quot.price_usd)}</b><span class="days">${fmtDate(l.last_quot.created_at)}</span>`:'—')
        :(l.assigned_to?'<span class="nm">'+esc(staffName(l.assigned_to))+'</span>':'<span class="pooltag">NOT YET</span>')}</td>
      <td class="${od?'overdue':''}">${fmtDate(l.next_follow_up)}</td>
      <td class="nowrap"><b>${daysIn(l.created_at)}d</b> old<span class="days">${daysIn(l.stage_entered_at)}d in stage</span></td>
      ${showRemarks()?`<td class="rem">${remarkStack(l)}</td>`:''}</tr>`;
  }).join('')+`</tbody></table>`;
}
/* the seven things marketing needs: when it came in, who, what kind, how to
   reach them, whose it is, where it came from and where it is. The date leads
   because that is how they work the list - today's calls first. */
function drawMktTable(rows){
  /* already sorted by mktSort in drawTable, before the page was cut */
  $('tablewrap').innerHTML=`<table><thead><tr>
    <th class="rowno">No</th><th>Date</th>${th('Customer','ctype')}<th>Phone</th>${th('Sale engineer','eng')}${th('Channel','chan')}<th>Address</th><th>Follow-up</th>
  </tr></thead><tbody>`+rows.map((l,i)=>{
    const od=l.mkt_follow_up_date&&new Date(l.mkt_follow_up_date)<new Date().setHours(0,0,0,0);
    return `<tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="rowno">${ROWNO+i+1}</td><td class="nowrap">${fmtDate(l.lead_date||l.created_at)}</td>
      <td class="cust"><b>${esc(l.customer_name)}</b><span class="days">${esc(l.customer_type||'')}</span></td>
      <td class="phone">${l.phone?phoneCell(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${l.assigned_to?'<span class="nm">'+esc(staffName(l.assigned_to))+'</span>':'<span class="pooltag">NOT YET</span>'}</td>
      <td>${esc(l.lead_channel||l.lead_source||'—')}${l.lead_sub_channel?`<span class="days">${esc(l.lead_sub_channel)}</span>`:''}</td>
      <td>${esc(l.site_address||'—')}</td>
      <td class="${od?'overdue':''}">${fmtDate(l.mkt_follow_up_date)}</td></tr>`;
  }).join('')+`</tbody></table>`;
}
/* the date the contact happened, which is not always the day it was typed */
const remarkDate=a=>a?(a.note_date||localDay(a.created_at)):'';
/* the running log is the salesperson's working view, and nobody else's */
const showRemarks=()=>['sales','admin','manager'].includes(ME.role);
/* A phone field can hold two or three numbers - "0969999989 / 0769999989",
   "077 59 87 89, 070 989 000" - since the Excel import. Each number is kept
   whole and the entry wraps only between them, so a narrow column never
   splits one across two lines. A slash counts as a separator only between
   numbers, so "N/A Telegram" stays together. A long token with no break in
   it (a t.me link) is left free to wrap anywhere. */
function phoneCell(p){
  const parts=String(p).split(/(\s*[,;]\s*|\s+\/\s+|(?<=\d)\s*\/\s*(?=[\d@+]))/);
  return parts.map((s,i)=>{
    if(i%2){const sep=s.trim();return sep===','||sep===';'?esc(sep)+' ':' '+esc(sep)+' ';}
    return s.length<=16?`<span class="ph">${esc(s)}</span>`:esc(s);
  }).join('');
}
/* The newest remark only, cut at two lines, until it is clicked. Three in
   full made every row as tall as its longest story once the Activity sheet
   brought eight dated lines to a lead. A click on the remarks opens them all
   in place and a second click closes them; the row itself still opens the
   lead, so the click stops here. */
function remarkStack(l){
  const rs=l.remarks||[];
  if(!rs.length)return '<span class="rl none">no remark yet</span>';
  const more=rs.length-1;
  return `<div class="rstack collapsed" data-more="${more}" onclick="event.stopPropagation();toggleRemarks(this)" title="Click to show all remarks">
    ${rs.map(a=>`<span class="rl"><i>${fmtDate(remarkDate(a))}</i>${esc(a.note)}</span>`).join('')}
    ${more>0?`<span class="rmore">+${more} more</span>`:''}
  </div>`;
}
function toggleRemarks(box){
  const closed=box.classList.toggle('collapsed');
  const btn=box.querySelector('.rmore');
  if(btn)btn.textContent=closed?`+${box.dataset.more} more`:'Show less';
}
/* Won deals are a build schedule, not a pipeline, so the columns change */
function drawWonTable(rows){
  $('tablewrap').innerHTML=`<table><thead><tr>
    <th class="rowno">No</th><th>Ref ID</th><th>Customer</th><th>Phone</th>${canSeeMoney()?'<th>Sale value</th>':''}${th('Sale engineer','eng')}${th('Site engineer','site')}${th('BOQ','boq')}${th('Schedule','sched')}${ME.role==='admin'?'<th>EDC</th>':''}<th>Closed-Won</th>
  </tr></thead><tbody>`+rows.map((l,i)=>`
    <tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="rowno">${ROWNO+i+1}</td><td class="refid">${esc(l.ref_id||'—')}</td>
      <td><b>${esc(l.customer_name)}</b></td>
      <td class="phone">${l.phone?phoneCell(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      ${canSeeMoney()?`<td><b>${fmtMoney(l.final_sale_usd)}</b></td>`:''}
      <td>${'<span class="nm">'+esc(staffName(l.assigned_to))+'</span>'}</td>
      <td>${l.site_engineer_id?'<span class="nm">'+esc(staffName(l.site_engineer_id))+'</span>':'<span class="pooltag">NONE</span>'}<span class="days">${esc(l.installation_team||'no team')}</span></td>
      <td class="nowrap">${l.boq_status==='Done'
        ?`<span class="mark mark-done">Done</span>${l.boq_date?`<span class="days">${fmtDate(l.boq_date)}</span>`:''}`
        :l.boq_status
          ?`<span class="mark mark-wait">${esc(l.boq_status)}</span>`
          :'<span class="mark mark-open">not set</span>'}</td>
      <td>${l.installation_start||l.installation_end
        ?`${fmtDate(l.installation_start)} → ${fmtDate(l.installation_end)}<span class="days">${l.delivery_date?'delivery '+fmtDate(l.delivery_date):'no delivery date'}</span>`
        :`<span class="quiet">not scheduled</span>${l.delivery_date?`<span class="days">delivery ${fmtDate(l.delivery_date)}</span>`:''}`}</td>
      ${ME.role==='admin'?`<td>${edcExempt(l)?'<span class="mark">off-grid</span>'
        :!edcApplies(l)||!edcFields(l)?'<span class="mark mark-wait">pending</span>'
        :`<span class="mark ${edcDone(l)===edcFields(l).length?'mark-done':'mark-open'}">${edcDone(l)}/${edcFields(l).length}</span>`}</td>`:''}
      <td>${fmtDate(l.stage_entered_at)}</td></tr>`).join('')+`</tbody></table>`;
}
function drawLostTable(rows){
  /* lost before or after a quotation went out - see quoteStage */
  const qcell=l=>{const s=quoteStage(l,!!l.last_quot);
    return s==='unknown'?`<span style="color:var(--ink-mute)">${QUOTE_STAGE_TEXT[s]}</span>`:QUOTE_STAGE_TEXT[s];};
  /* Remark is what sales typed as the detail when they closed it; Revised
     remark is admin's shorter wording of it, typed here and saved on the spot
     (28 Sep 2026). Everyone else reads both. */
  const canRevise=ME.role==='admin';
  /* Remark is what sales wrote, in their own words - never the dropdown reason
     (Kevin, 29 Sep 2026); admin's standard wording is the Revised remark */
  const lostRem=l=>l.lost_note
    ?`<span class="clamp lostnote" title="${esc(l.lost_note)}">${esc(l.lost_note)}</span>`
    :'<span class="quiet">—</span>';
  const revised=l=>canRevise
    ?`<textarea class="revbox" rows="2" placeholder="Shorter wording" onclick="event.stopPropagation()" onchange="saveRevised('${l.id}',this)">${esc(l.lost_note_revised||'')}</textarea>`
    :(l.lost_note_revised?esc(l.lost_note_revised):'<span class="quiet">—</span>');
  $('tablewrap').innerHTML=`<table class="losttable"><thead><tr>
    <th class="rowno">No</th><th>Ref ID</th><th>Customer</th><th>Phone</th>${th('Channel','chan')}${th('Type','ltype')}${th('Quotation','quot')}${th('Sale engineer','eng')}${th('Lost','lostm')}<th>Remark</th><th>Revised remark</th>
  </tr></thead><tbody>`+rows.map((l,i)=>`
    <tr class="rowlink" onclick="openLead('${l.id}')">
      <td class="rowno">${ROWNO+i+1}</td><td class="refid">${esc(l.ref_id||'—')}</td>
      <td class="lcust"><b>${esc(l.customer_name)}</b></td>
      <td class="phone">${l.phone?(/[a-z@]/i.test(l.phone)?`<span class="handle">${esc(l.phone)}</span>`:phoneCell(l.phone)):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${esc((l.lead_channel||l.lead_source||'—').replace(/_/g,' '))}</td>
      <td class="nowrap">${isClosedLost(l)?'<span class="badge b-off" style="white-space:nowrap">Closed-Lost</span>':'<span class="badge" style="white-space:nowrap">Disqualified</span>'}</td>
      <td>${qcell(l)}</td>
      <td>${l.assigned_to?'<span class="nm">'+esc(staffName(l.assigned_to))+'</span>':'—'}</td>
      <td class="nowrap">${fmtDate(l.stage_entered_at)}</td>
      <td class="lostrem">${lostRem(l)}</td>
      <td class="lostrev" ${canRevise?'onclick="event.stopPropagation()"':''}>${revised(l)}</td></tr>`).join('')+`</tbody></table>`;
}
async function saveRevised(id,box){
  const v=box.value.trim()||null;
  const {error}=await sb.from('leads').update({lost_note_revised:v}).eq('id',id);
  if(error){toast('Could not save. '+why(error));console.error(error);return;}
  const l=LEADS.find(x=>x.id===id);if(l)l.lost_note_revised=v;
  toast('Revised remark saved');
}

/* ---------------- POOL ---------------- */
/* The pool runs on the Leads list's own tools (28 Sep 2026): search, the lead's
   date, filters in the headings, the No column, pages of fifty, and tick-and-
   assign in bulk. It held 150 rows in one long table with a dropdown on every
   line, which the manager could not work. */
let POOL=[], PFILTER={q:'',from:'',to:''};
const LV_POOL={name:'pool',
  src:()=>poolBase(),
  rows:()=>colFiltered(poolBase()),
  draw:()=>drawPool(),
  after:()=>renderPool()};
function poolBase(){
  let rows=POOL;
  const dayOf=l=>l.lead_date||localDay(l.created_at);
  if(PFILTER.from)rows=rows.filter(l=>dayOf(l)>=PFILTER.from);
  if(PFILTER.to)rows=rows.filter(l=>dayOf(l)<=PFILTER.to);
  if(PFILTER.q){const q=PFILTER.q.toLowerCase();rows=rows.filter(l=>
    (l.customer_name||'').toLowerCase().includes(q)||(l.phone||'').includes(q)||(l.ref_id||'').toLowerCase().includes(q));}
  return rows;
}
async function renderPool(){
  if(!['manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('The pool is manager and admin only','Leads with no sale engineer are handed out from here.');return;}
  if(LV!==LV_POOL){LV=LV_POOL;COLF={};PFILTER={q:'',from:'',to:''};LEADPAGE=0;}
  SEL.clear();
  $('main').innerHTML=SKEL;
  /* only leads still open. After the 23 Sep 2026 import this list held 1,804
     rows, 1,787 of them Closed-Lost enquiries nobody was ever going to call -
     a lost lead is not waiting for sales, and a pool of dead rows buries the
     seventeen that are */
  POOL=await fetchLeads(q=>q.is('assigned_to',null).not('stage_code','in','(closed_lost,closed_won)'));
  /* least waiting first, newest at the top (manager, 28 Sep 2026) - sorted
     on created_at, the same clock the Waiting column counts from */
  POOL=POOL.filter(inPool);
  POOL.sort((a,b)=>(b.created_at||'').localeCompare(a.created_at||''));
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Not yet with sales</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Open leads with a phone number and no sale engineer. Tick them and assign, or add a phone number and one is assigned automatically.</p>
    <div class="toolbar">
      <input placeholder="Search name, phone or ref ID…" value="${esc(PFILTER.q)}" oninput="PFILTER.q=this.value;LEADPAGE=0;SEL.clear();drawPool()">
      <span class="daterange" title="The lead's own date">
        <input type="date" value="${PFILTER.from}" onchange="PFILTER.from=this.value;LEADPAGE=0;SEL.clear();drawPool()" aria-label="From">
        <span>to</span>
        <input type="date" value="${PFILTER.to}" onchange="PFILTER.to=this.value;LEADPAGE=0;SEL.clear();drawPool()" aria-label="To">
      </span>
      <button class="btn-line" onclick="PFILTER={q:'',from:'',to:''};COLF={};LEADPAGE=0;SEL.clear();renderPool()">Clear</button>
    </div>
    <div class="bulkbar" id="bulkbar" style="display:none"></div>
    <div class="tablewrap" id="tablewrap"></div>`;
  drawPool();
}
function drawPool(){
  const all=LV_POOL.rows();
  if(!all.length){drawBulkBar();$('tablewrap').innerHTML=(PFILTER.q||PFILTER.from||PFILTER.to||Object.values(COLF).some(v=>v&&v.length))
    ?blank('No matches','Nothing waiting fits the current search or filters. Clear them to see everything.')
    :blank('Everything is with sales','Every open lead has a sale engineer.');return;}
  const pages=Math.ceil(all.length/PAGE_SIZE);
  if(LEADPAGE>pages-1)LEADPAGE=pages-1;
  const rows=all.slice(LEADPAGE*PAGE_SIZE,(LEADPAGE+1)*PAGE_SIZE);
  ROWNO=LEADPAGE*PAGE_SIZE;
  $('tablewrap').innerHTML=`<table class="pooltable"><thead><tr>
    <th class="pickcol"><input type="checkbox" title="Select this page" ${rows.every(l=>SEL.has(l.id))?'checked':''} onchange="toggleSelPage(this.checked)"></th>
    <th class="rowno">No</th><th>Ref ID</th><th>Date</th>${th('Customer','ctype')}${th('Phone','hasphone')}${th('Channel','chan')}${th('Stage','stage')}${th('Waiting','wait')}${th('Created by','by')}
  </tr></thead><tbody>`+rows.map((l,i)=>`
    <tr class="rowlink ${SEL.has(l.id)?'picked':''}" onclick="openLead('${l.id}')">
      <td class="pickcol" onclick="event.stopPropagation()"><input type="checkbox" class="pick" value="${l.id}" ${SEL.has(l.id)?'checked':''} onchange="toggleSel(this.value,this.checked);this.closest('tr').classList.toggle('picked',this.checked)"></td>
      <td class="rowno">${ROWNO+i+1}</td>
      <td class="refid">${esc(l.ref_id||'—')}</td>
      <td class="nowrap">${fmtDate(l.lead_date||l.created_at)}</td>
      <td class="cust"><b>${esc(l.customer_name)}</b><span class="days">${esc(l.customer_type||'')}</span></td>
      <td class="phone">${l.phone?phoneCell(l.phone):'<span class="pooltag">NO PHONE</span>'}</td>
      <td>${esc((l.lead_channel||l.lead_source||'—').replace(/_/g,' '))}${l.lead_sub_channel?`<span class="days">${esc(l.lead_sub_channel)}</span>`:''}</td>
      <td>${stagePill(l.stage_code)}</td>
      <td class="nowrap">${daysIn(l.created_at)}d</td>
      <td><span class="nm">${esc(staffName(l.created_by))}</span></td>
    </tr>`).join('')+`</tbody></table>`+pager(all.length,pages);
  drawBulkBar();
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
  /* sales take leads, they do not make them (manager's rule, 28 Sep 2026) -
     a returning customer is still theirs, through New deal on the won lead */
  if(!['marketing','manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('New lead is not open to your role','Marketing creates new leads.');return;}
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
        <div><label>Date *</label><input id="f-date" type="date" value="${localDay(new Date())}"></div>
        <div><label>Customer name *</label><input id="f-name"></div>
        <div><label>Phone</label><input id="f-phone" placeholder="Can be added later"></div>
        <div><label>Customer type *</label><select id="f-ctype">${optList(CUSTOMER_TYPES,'Residential',false)}</select></div>
        <div><label>Monthly electricity bill (USD)</label>${numBox('f-bill','')}</div>
        <div><label>Lead channel *</label><select id="f-chan" onchange="subChan()">${optList(Object.keys(CHANNELS),'Digital_Marketing',false)}</select></div>
        <div><label>Sub-channel *</label><select id="f-sub"></select></div>
        ${['manager','admin'].includes(ME.role)?`<div><label>Sale engineer</label><select id="f-who">
          <option value="">Automatic</option>
          ${assignable().map(s=>`<option value="${s.id}">${esc(assignLabel(s))}</option>`).join('')}</select></div>`:''}
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
  if(ch==='Direct_Sales') subs=STAFF.filter(s=>['sales','manager'].includes(s.role)&&s.is_active).map(s=>s.full_name);
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
  if(!name){needField('f-name','Customer name is required');return;}
  if(!$('f-sub').value){needField('f-sub','Pick a sub-channel before creating the lead');return;}
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
    /* the day the lead actually came in, which is not always the day it was
       keyed in - the same split as note_date on a remark. created_at stays
       as the audit trail. */
    lead_date:$('f-date').value||localDay(new Date()),
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
      ref_id:await repeatRef(p.ref_id),
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
  /* the manager's pick comes first. A lead saved already holding a salesperson
     is left alone by fn_assign_sales_on_phone; left on Automatic, the
     round-robin assigns as it always has */
  if($('f-who')&&$('f-who').value){
    row.assigned_to=$('f-who').value;row.assigned_at=new Date().toISOString();
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
    ['Panel',   panelModel(l.panel_brand,l.panel_watt),                l.panel_brand,    l.panel_pcs, l.panel_watt],
    ['Inverter',inverterModel(l.inverter_brand,l.inverter_kw,l.phase_type), l.inverter_brand, l.inverter_pcs, l.inverter_kw],
    ['Battery', batteryModel(l.battery_brand,l.battery_kwh_each),      l.battery_brand,  l.battery_pcs, l.battery_kwh_each]
  ].filter(([,,brand])=>brand);
  /* the whole specification, not a summary of it. Finance chase money against
     what was actually sold, so every brand, size and count is named — the
     quotation document itself stays out of reach, because it carries the price
     and the database refuses it to them. */
  const kwac=(Number(l.inverter_kw||0)*Number(l.inverter_pcs||0))||Number(l.inverter_kw_total||0);
  const facts=[
    ['Roof',l.roof_type],['System',l.system_type],['Ampere & phase',l.phase_type],
    ['Panel brand',l.panel_brand],
    ['Panels',l.panel_pcs&&l.panel_watt?`${l.panel_pcs} × ${l.panel_watt}W`:null],
    ['Panel total',l.panel_kwp?l.panel_kwp+' kWp':null],
    ['Inverter brand',l.inverter_brand],
    ['Inverter',l.inverter_pcs&&l.inverter_kw?`${l.inverter_pcs} × ${l.inverter_kw} kW`:null],
    ['Inverter total',kwac?kwac.toFixed(2)+' kWac':null],
    ['Battery brand',l.battery_brand],
    ['Battery',l.battery_pcs&&l.battery_kwh_each?`${l.battery_pcs} × ${l.battery_kwh_each} kWh`:null],
    ['Battery total',l.battery_kwh?l.battery_kwh+' kWh':null],
    ...(always?[
      ['BOQ',l.boq_status?l.boq_status+(l.boq_date?' · '+fmtDate(l.boq_date):''):null],
      ['Site',[l.site_address,l.commune,l.district,l.province||l.city_province].filter(Boolean).join(', ')||null]
    ]:[])
  ].filter(([,v])=>v);
  /* Nothing keyed in yet. The site engineer needs telling — they are about to
     drive to that house — but on the finance card it is a third of the screen
     spent saying the sale engineer has not done something finance cannot act
     on, so it simply does not appear. */
  if(!facts.length&&!parts.length)
    return always?'':`<div class="section sec-eng"><h4>System</h4>${blank('Not specified yet','The sale engineer keys the system in before installation.')}</div>`;
  return `<div class="section sec-eng"><h4>System</h4>
      <div class="grid3">
        ${facts.map(([k,v])=>`<div><label>${esc(k)}</label><input value="${esc(v)}" disabled></div>`).join('')}
      </div>
      ${parts.length?`<div class="kit">${parts.map(([kind,model,brand,pcs,size])=>{
        const img=imgFor(model,kind,brand,size);
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
