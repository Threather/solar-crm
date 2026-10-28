/* ---------------- INCENTIVE ----------------
   Two tabs (client, 28 Oct 2026): Sales and Agent. Calculates and shows; it
   never marks anything paid. Everything in the scheme is admin's to edit:
   the tiers, the override, the held part, and per person the position,
   joining date, probation and whether they are in the scheme at all.

   Sales, worked on payment counted in the month (count_month or paid_on, as
   every report counts it):
     pool comes from the tier reached by the month's total collection
     the manager takes the override off the top
     what remains is split by each person's share of collection
     the manager also earns their own share of what remains
     on probation, a person earns the probation % admin typed for them
     held % of everyone's incentive is paid held-months later
   Agent: won deals in a date range, by sign-off date, times the agent's own
   commission %. Both export to the client's own two-sheet payout files. */

/* the scheme as it stood before admin could edit it; used until the
   settings row is read, or if it cannot be */
const INC_DEFAULT={tiers:[
  {name:'Starter',min:0,pool:0.3,pct:true},{name:'Bronze',min:160000,pool:1500},
  {name:'Silver',min:180000,pool:2250},{name:'Gold',min:200000,pool:3000},
  {name:'Platinum',min:220000,pool:3600},{name:'Diamond',min:250000,pool:4500}],
  override_pct:20,held_pct:15,held_months:2};
const AGENT_DEFAULT_RATE=3;
let INCSET=null, INCTAB='sales', INCMONTH='', AGFROM='', AGTO='';
let INCDATA=null; /* what the screen last worked out, so the export cannot drift */

const incPool=(t,total)=>t.pct?total*Number(t.pool||0)/100:Number(t.pool||0);
function incTier(total){
  const ts=[...INCSET.tiers].sort((a,b)=>Number(a.min)-Number(b.min));
  let t=ts[0];ts.forEach(x=>{if(total>=Number(x.min))t=x;});return t;
}
const monthAdd=(iso,n)=>{const d=new Date(iso+'T00:00:00');return localDay(new Date(d.getFullYear(),d.getMonth()+n,1));};
const monthEndOf=iso=>{const d=new Date(iso+'T00:00:00');return localDay(new Date(d.getFullYear(),d.getMonth()+1,0));};
const monUpper=iso=>new Date(iso+'T00:00:00').toLocaleDateString('en-GB',{month:'long'}).toUpperCase();
const cash2=v=>'$'+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

/* one month of the sales scheme for these people; free of any screen */
function incMonth(people,pays,byLead,m){
  const end=monthEndOf(m);
  const col={};let total=0;
  pays.filter(p=>localDay(countDay(p)).slice(0,7)===m.slice(0,7)).forEach(p=>{
    const v=Number(p.amount_usd||0);total+=v;
    const l=byLead[p.lead_id];if(l&&l.assigned_to)col[l.assigned_to]=(col[l.assigned_to]||0)+v;});
  const tier=incTier(total), pool=incPool(tier,total);
  const override=pool*INCSET.override_pct/100, rest=pool-override;
  const rows=people.map(p=>{
    const collection=col[p.id]||0, share=total?collection/total:0;
    const standard=rest*share+(p.isManager?override:0);
    /* on probation for any part of the month (probation_until on or after its first day) */
    const onProb=!!p.probation_until&&p.probation_until>=m;
    const rate=onProb&&p.probation_pct!=null?Number(p.probation_pct)/100:1;
    const earned=p.exclude?0:standard*rate;
    const held=earned*INCSET.held_pct/100;
    return {...p,collection,share,standard,onProb,rate,earned,held,paidNow:earned-held};
  });
  return {m,end,total,tier,pool,override,rest,rows};
}

async function incLoadSettings(){
  const r=await sb.from('incentive_settings').select('*').eq('id',1).maybeSingle();
  INCSET=r.data?{tiers:r.data.tiers,override_pct:Number(r.data.override_pct),held_pct:Number(r.data.held_pct),held_months:Number(r.data.held_months)}
    :JSON.parse(JSON.stringify(INC_DEFAULT));
}

async function renderIncentive(){
  if(!['admin','manager'].includes(ME.role)){
    $('main').innerHTML=blank('Incentive is admin and manager only','Ask an admin if you need the figures.');return;}
  $('main').innerHTML=SKEL;$('main').style.maxWidth='none';
  await incLoadSettings();
  if(INCTAB==='agent')return renderAgentIncentive();
  if(!INCMONTH)INCMONTH=monthStart();
  const admin=ME.role==='admin';

  const [leads,profR,payR]=await Promise.all([fetchLeads(q=>q),
    sb.from('profiles').select('*').in('role',['sales','manager']).order('full_name'),
    rowsOf(()=>sb.from('lead_payments').select('id,lead_id,amount_usd,paid_on,count_month').order('id'))]);
  const byLead={};leads.forEach(l=>byLead[l.id]=l);
  const pays=payR.data||[];
  const profs=profR.data||[];
  /* everyone in the scheme: active sales and managers, plus anyone holding
     collection this month or marked excluded, so the sheet names them */
  const m=INCMONTH;
  const heldMonths=INCSET.held_months;
  const people=profs.map(p=>({id:p.id,name:p.full_name,role:p.role,isManager:p.role==='manager',
    position:p.position||(p.role==='manager'?'Sales & Marketing Manager':'Sales Executive'),
    joined:p.joined_date,probation_until:p.probation_until,probation_pct:p.probation_pct,
    exclude:!!p.incentive_exclude,active:p.is_active}));
  const cur=incMonth(people,pays,byLead,m);
  const inSheet=cur.rows.filter(r=>r.active||r.collection>0||r.exclude);
  /* the held part of each earlier month, paid held-months after the payout
     month: this month's hold, then the one before, back to the one paid next month */
  const holdCols=[];
  for(let k=0;k<=heldMonths;k++){
    const src=monthAdd(m,-k), r=k?incMonth(people,pays,byLead,src):cur;
    holdCols.push({src,paidIn:monthAdd(m,1+heldMonths-k),by:Object.fromEntries(r.rows.map(x=>[x.id,x.held]))});
  }
  const nextPaid=holdCols[holdCols.length-1];
  INCDATA={m,cur,rows:inSheet,holdCols,nextPaid,leads,byLead,pays};

  const opts=[];const now=new Date();
  for(let i=-12;i<=1;i++){const iso=localDay(new Date(now.getFullYear(),now.getMonth()+i,1));
    opts.push(`<option value="${iso}" ${iso===m?'selected':''}>${esc(monthName(iso.slice(0,7)))}</option>`);}
  const box=(id,f,v,type)=>admin?(type==='date'?`<input type="date" value="${esc(v||'')}" onchange="incSaveStaff('${id}','${f}',this.value)">`
      :type==='check'?`<input type="checkbox" ${v?'checked':''} onchange="incSaveStaff('${id}','${f}',this.checked)">`
      :type==='num'?numBox('inc-'+f+'-'+id,v,{then:`incSaveStaff('${id}','${f}',normNum(this.value))`,attrs:'placeholder="—" style="width:60px"'})
      :`<input value="${esc(v||'')}" onchange="incSaveStaff('${id}','${f}',this.value)">`)
    :type==='check'?(v?'Yes':'—'):esc(type==='date'?(v?fmtDate(v):'—'):(v??'—'));
  const hid=incHidden(),shown=profs.filter(p=>INC_SHOWHID||!hid.includes(p.id)),nHid=profs.length-profs.filter(p=>!hid.includes(p.id)).length;
  const staffT=`<div class="tablewrap"><table class="table-compact inctable"><thead><tr>
      <th>Name</th><th>Position</th><th>Joined</th><th>Probation until</th><th>Probation pay %</th><th>Exclude</th><th>Active</th><th></th></tr></thead><tbody>`
    +shown.map(p=>`<tr${p.is_active?'':' class="quietrow"'}><td>${box(p.id,'full_name',p.full_name)}</td><td>${box(p.id,'position',p.position)}</td>
      <td>${box(p.id,'joined_date',p.joined_date,'date')}</td><td>${box(p.id,'probation_until',p.probation_until,'date')}</td>
      <td>${box(p.id,'probation_pct',p.probation_pct,'num')}</td><td>${box(p.id,'incentive_exclude',p.incentive_exclude,'check')}</td>
      <td>${box(p.id,'is_active',p.is_active,'check')}</td>
      <td><button class="btn-line lgq" onclick="incHide('${p.id}')">${hid.includes(p.id)?'Show':'Hide'}</button></td></tr>`).join('')+`</tbody></table></div>`
    +(nHid?`<button class="btn-line" style="margin-top:8px" onclick="INC_SHOWHID=!INC_SHOWHID;renderIncentive()">${INC_SHOWHID?'Hide them again':'Show hidden ('+nHid+')'}</button>`:'');

  const T=k=>inSheet.reduce((a,r)=>a+(r[k]||0),0);
  const payT=`<div class="tablewrap"><table class="table-compact inctable"><thead><tr>
      <th>No</th><th>Name</th><th>Position</th><th>Join date</th><th>Total payment collection</th><th>% of team sales</th>
      <th>Total sales incentive</th><th>Received this month</th><th>This month + ${esc(monUpper(nextPaid.paidIn).slice(0,3))} (${INCSET.held_pct}% hold)</th>
      ${holdCols.map(c=>`<th>To be paid in ${esc(monthName(c.paidIn.slice(0,7)))}</th>`).join('')}<th>Remark</th></tr></thead><tbody>`
    +inSheet.map((r,i)=>`<tr><td>${i+1}</td><td><b class="nm">${esc(r.name)}</b></td><td>${esc(r.position)}</td>
      <td class="nowrap">${r.joined?fmtDate(r.joined):'—'}</td><td>${cash2(r.collection)}</td><td>${(r.share*100).toFixed(2)}%</td>
      <td><b>${cash2(r.earned)}</b></td><td>${cash2(r.paidNow)}</td><td>${cash2(r.paidNow+(nextPaid.by[r.id]||0))}</td>
      ${holdCols.map(c=>`<td>${cash2(c.by[r.id]||0)}</td>`).join('')}
      <td>${r.exclude?'Excluded from Incentive':r.onProb?'Probation '+Math.round(r.rate*100)+'%':''}</td></tr>`).join('')
    +`</tbody><tfoot><tr class="srtotal"><td colspan="4"><b>Total</b></td><td><b>${cash2(cur.total)}</b></td><td><b>100%</b></td>
      <td><b>${cash2(T('earned'))}</b></td><td><b>${cash2(T('paidNow'))}</b></td>
      <td><b>${cash2(T('paidNow')+inSheet.reduce((a,r)=>a+(nextPaid.by[r.id]||0),0))}</b></td>
      ${holdCols.map(c=>`<td><b>${cash2(inSheet.reduce((a,r)=>a+(c.by[r.id]||0),0))}</b></td>`).join('')}<td></td></tr></tfoot></table></div>`;

  $('main').innerHTML=incHead('sales')+`
    <div class="toolbar"><select onchange="INCMONTH=this.value;renderIncentive()">${opts.join('')}</select>
      <span class="spacer"></span><button class="btn-line" onclick="incExportPdf()">Export PDF</button><button class="btn-line" onclick="exportSalesIncentive()">Export Excel</button></div>
    <div class="stats">
      <div class="stat hero"><div class="n">${cash2(cur.total)}</div><div class="l">Collected in ${esc(monthName(m.slice(0,7)))}</div></div>
      <div class="stat"><div class="n">${esc(cur.tier.name)}</div><div class="l">Tier reached</div></div>
      <div class="stat"><div class="n">${cash2(cur.pool)}</div><div class="l">Incentive pool</div></div>
      <div class="stat"><div class="n">${cash2(cur.override)}</div><div class="l">Override ${INCSET.override_pct}%</div></div>
      <div class="stat"><div class="n">${cash2(cur.rest)}</div><div class="l">Remaining</div></div>
    </div>
    <div class="incsheet">
      <div class="mg-band">SALES INCENTIVE PAYOUT AS OF ${esc(monUpper(m).slice(0,3)+'-'+m.slice(0,4))}</div>
      ${payT}
      <div class="incpool">${[['Incentive Pool',cash2(cur.pool),cur.tier.name+(cur.tier.pct?' · '+cur.tier.pool+'% of collection':'')],
        ['Override '+INCSET.override_pct+'%',cash2(cur.override),''],['Remaining',cash2(cur.rest),'']]
        .map(([k,v,n])=>`<div><span>${esc(k)}</span><b>${v}</b>${n?`<i>${esc(n)}</i>`:''}</div>`).join('')}</div>
    </div>
    <div class="toolbar"><span class="spacer"></span><button class="btn-line" onclick="incExportPdf()">Export PDF</button><button class="btn-line" onclick="exportSalesIncentive()">Export Excel</button></div>
    <div class="incsheet">
      <h3 class="increfh">INCENTIVE REFERENCE</h3>
      ${incRefHtml(m,pays,byLead)}
    </div>
    <h3 class="sechead" style="margin-top:22px">Sales staff</h3>${staffT}
    ${incSettingsHtml(admin)}`;
}

/* the REF sheet on screen: every deal paid in the month, each payment under
   its number on the deal (1st, 2nd...), the same rows the export writes */
/* names admin hides from Sales staff, e.g. the sample Sale Engineer A-D (29 Oct 2026) */
let INC_SHOWHID=false;
function incHidden(){try{return JSON.parse(localStorage.getItem('inchidden')||'[]');}catch(e){return [];}}
function incHide(id){const h=new Set(incHidden());h.has(id)?h.delete(id):h.add(id);
  try{localStorage.setItem('inchidden',JSON.stringify([...h]));}catch(e){}renderIncentive();}
function incRef(m,pays,byLead){
  const mm=m.slice(0,7);
  const inM=pays.filter(p=>localDay(countDay(p)).slice(0,7)===mm);
  const ord={},byL={};
  pays.forEach(p=>(byL[p.lead_id]=byL[p.lead_id]||[]).push(p));
  Object.values(byL).forEach(ps=>ps.sort((a,b)=>String(a.paid_on).localeCompare(String(b.paid_on))).forEach((p,i)=>ord[p.id]=i+1));
  const ids=[...new Set(inM.map(p=>p.lead_id))];
  const maxOrd=Math.max(1,...inM.map(p=>ord[p.id]||1));
  return {maxOrd,rows:ids.map(id=>({l:byLead[id]||{},pays:inM.filter(p=>p.lead_id===id).map(p=>({...p,ord:ord[p.id]||1}))})),
    total:inM.reduce((a,p)=>a+Number(p.amount_usd||0),0)};
}
const ORDW=['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'];
function incRefHtml(m,pays,byLead){
  const R=incRef(m,pays,byLead);
  if(!R.rows.length)return blank('No payment counted in this month','');
  const nm=id=>(STAFF.find(s=>s.id===id)||{}).full_name||'';
  const colT=o=>R.rows.reduce((a,r)=>a+r.pays.filter(p=>p.ord===o).reduce((x,p)=>x+Number(p.amount_usd||0),0),0);
  const ords=Array.from({length:R.maxOrd},(_,i)=>i+1);
  return `<div class="tablewrap"><table class="table-compact inctable incref"><thead><tr><th>No</th><th>Lead reference ID</th><th>Agreement sign off date</th><th>Lead received date</th>
    <th>Sales person</th><th>Referral by</th><th>Lead channel</th><th>Customer name</th><th>Contact number</th><th>Installation end date</th>
    ${ords.map(o=>`<th>${ORDW[o-1]} payment collection</th><th>Date</th>`).join('')}</tr></thead><tbody>`
    +R.rows.map(({l,pays},i)=>`<tr class="rowlink" onclick="openLead('${l.id}')"><td>${i+1}</td><td class="refid">${esc(l.ref_id||'')}</td>
      <td class="nowrap">${l.stage_code===WON?fmtDate(l.stage_entered_at):''}</td><td class="nowrap">${fmtDate(l.lead_date||l.created_at)}</td>
      <td class="nowrap">${esc(nm(l.assigned_to))}</td><td>${esc(agentOf(l)||l.referrer_name||'')}</td><td class="nowrap">${esc(l.lead_channel||'')}</td>
      <td><b class="nm">${esc(l.customer_name||'')}</b></td><td class="nowrap">${esc(l.phone||'')}</td><td class="nowrap">${l.installation_end?fmtDate(l.installation_end):''}</td>
      ${ords.map(o=>{const p=pays.find(x=>x.ord===o);return p?`<td class="nowrap">${cash2(p.amount_usd)}</td><td class="nowrap">${fmtDate(p.paid_on)}</td>`:'<td></td><td></td>';}).join('')}</tr>`).join('')
    +`</tbody><tfoot><tr class="srtotal"><td colspan="10"><b>Total payment collection ${cash2(R.total)}</b></td>
      ${ords.map(o=>`<td class="nowrap"><b>${cash2(colT(o))}</b></td><td></td>`).join('')}</tr></tfoot></table></div>`;
}
function incHead(tab){
  return `<h2 style="margin-bottom:4px">Incentive</h2>
    <div class="scope" role="group" aria-label="Which incentive" style="margin:10px 0 14px">
      ${[['sales','Sales'],['agent','Agent']].map(([k,l])=>`<button class="${tab===k?'on':''}" aria-pressed="${tab===k}" onclick="INCTAB='${k}';renderIncentive()">${l}</button>`).join('')}</div>`;
}

/* the scheme itself, admin only to change */
function incSettingsHtml(admin){
  const dis=admin?'':'disabled';
  return `<h3 class="sechead" style="margin-top:22px">Incentive settings</h3>
    <div class="tablewrap"><table class="table-compact inctable" style="max-width:640px"><thead><tr>
      <th>Tier</th><th>Monthly collection from</th><th>Pool</th><th>Pool is % of collection</th>${admin?'<th></th>':''}</tr></thead><tbody>`
    +INCSET.tiers.map((t,i)=>`<tr><td><input ${dis} value="${esc(t.name)}" onchange="INCSET.tiers[${i}].name=this.value"></td>
      <td>${numBox('inct-min-'+i,t.min,{then:`INCSET.tiers[${i}].min=Number(normNum(this.value)||0)`,attrs:dis})}</td>
      <td>${numBox('inct-pool-'+i,t.pool,{then:`INCSET.tiers[${i}].pool=Number(normNum(this.value)||0)`,attrs:dis})}</td>
      <td><input type="checkbox" ${dis} ${t.pct?'checked':''} onchange="INCSET.tiers[${i}].pct=this.checked"></td>
      ${admin?`<td><button class="btn-line" onclick="INCSET.tiers.splice(${i},1);renderIncentive.keep=1;incRedrawSettings()">×</button></td>`:''}</tr>`).join('')
    +`</tbody></table></div>
    <div class="grid3" style="max-width:640px;margin-top:10px">
      <div><label>Manager override %</label>${numBox('inc-ov',INCSET.override_pct,{then:'INCSET.override_pct=Number(normNum(this.value)||0)',attrs:dis})}</div>
      <div><label>Held %</label>${numBox('inc-held',INCSET.held_pct,{then:'INCSET.held_pct=Number(normNum(this.value)||0)',attrs:dis})}</div>
      <div><label>Held for (months)</label>${numBox('inc-hm',INCSET.held_months,{then:'INCSET.held_months=Number(normNum(this.value)||0)',attrs:dis})}</div>
    </div>
    ${admin?`<div class="modal-actions" style="justify-content:flex-start">
      <button class="btn-line" onclick="INCSET.tiers.push({name:'New tier',min:0,pool:0});incRedrawSettings()">+ Tier</button>
      <button class="btn" onclick="incSaveSettings()">Save settings</button></div>`:''}`;
}
function incRedrawSettings(){const h=[...document.querySelectorAll('#main h3.sechead')].find(x=>x.textContent==='Incentive settings');
  if(!h)return;while(h.nextSibling)h.nextSibling.remove();h.outerHTML=incSettingsHtml(ME.role==='admin');}
async function incSaveSettings(){
  const {error}=await sb.from('incentive_settings').upsert({id:1,tiers:INCSET.tiers,override_pct:INCSET.override_pct,
    held_pct:INCSET.held_pct,held_months:INCSET.held_months,updated_at:new Date().toISOString()});
  if(error){toast(why(error));return;}
  toast('Settings saved');renderIncentive();
}
async function incSaveStaff(id,f,v){
  if(f==='full_name'&&!String(v).trim()){toast('Name cannot be blank');renderIncentive();return;}
  const {error}=await sb.from('profiles').update({[f]:v===''?null:v}).eq('id',id);
  if(error){toast(why(error));return;}
  const s=STAFF.find(x=>x.id===id);if(s&&f in s)s[f]=v;
  toast('Saved');renderIncentive();
}

/* ---------------- AGENT ---------------- */
/* a typed referrer on an old lead ("Mr. Dalton", "Mr.Low") is matched to the
   agent list loosely, so old deals count without being retyped */
const agentKey=s=>String(s||'').toLowerCase().replace(/\b(mr|mrs|ms|miss|dr)\b\.?/g,'').replace(/[^a-z0-9]/g,'');
function agentOf(l){
  if(l.agent_name)return l.agent_name;
  if(chOf(l)!=='Third_Party'||!l.referrer_name)return '';
  const k=agentKey(l.referrer_name);
  const hit=(AGENTS||[]).find(a=>{const ak=agentKey(a);return ak===k||ak.startsWith(k)||k.startsWith(ak);});
  /* only names on Lists > Agent are agents; other typed referrers are not */
  return hit||'';
}
async function renderAgentIncentive(){
  const admin=ME.role==='admin';
  if(!AGTO)AGTO=localDay(new Date(new Date().getFullYear(),new Date().getMonth(),0));
  if(!AGFROM)AGFROM=monthAdd(AGTO.slice(0,8)+'01',-10);
  const [leads,adR]=await Promise.all([fetchLeads(q=>q),sb.from('agent_details').select('*')]);
  const AD={};(adR.data||[]).forEach(x=>AD[x.name]=x);
  const won=leads.filter(l=>l.stage_code===WON&&l.stage_entered_at&&agentOf(l))
    .filter(l=>{const d=localDay(l.stage_entered_at);return d>=AGFROM&&d<=AGTO;})
    .sort((a,b)=>String(a.stage_entered_at).localeCompare(String(b.stage_entered_at)));
  const ids=won.map(l=>l.id);
  const [fins,finrows,staff]=ids.length?await Promise.all([
    repByIds(()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id'),ids),
    repByIds(()=>sb.from('lead_finance').select('lead_id,contract_total_usd').order('lead_id'),ids),
    Promise.resolve(STAFF)]):[[],[],STAFF];
  const amt={};fins.forEach(f=>amt[f.lead_id]=Number(f.final_sale_usd||0));
  finrows.forEach(f=>{if(f.contract_total_usd!=null)amt[f.lead_id]=Number(f.contract_total_usd);});
  const nameOf=id=>(staff.find(s=>s.id===id)||{}).full_name||'';
  const by={};won.forEach(l=>{const a=agentOf(l);(by[a]=by[a]||[]).push(l);});
  const rows=Object.entries(by).map(([a,ls])=>{const d=AD[a]||{};
    const rate=d.rate!=null?Number(d.rate):AGENT_DEFAULT_RATE;
    const total=ls.reduce((x,l)=>x+(amt[l.id]||0),0);
    return {name:a,cases:ls.length,total,rate,earned:total*rate/100,bank:d.bank_name||'',acct:d.bank_account_name||'',num:d.bank_account||'',
      known:!!AD[a]||(AGENTS||[]).includes(a)};}).sort((a,b)=>b.total-a.total);
  INCDATA={agent:true,rows,won,amt,nameOf,from:AGFROM,to:AGTO};
  const tot=k=>rows.reduce((a,r)=>a+r[k],0);
  const rateBox=r=>admin&&r.known?numBox('agr-'+agentKey(r.name),r.rate,{then:`agSaveRate(${JSON.stringify(r.name).replace(/"/g,'&quot;')},normNum(this.value))`,attrs:'style="width:60px"'})+'%':r.rate+'%';
  $('main').innerHTML=incHead('agent')+`
    <div class="toolbar">
      <span class="datepair"><input type="date" value="${AGFROM}" onchange="AGFROM=this.value;renderIncentive()"> to
        <input type="date" value="${AGTO}" onchange="AGTO=this.value;renderIncentive()"></span>
      <span class="spacer"></span><button class="btn-line" onclick="incExportPdf()">Export PDF</button><button class="btn-line" onclick="exportAgentIncentive()">Export Excel</button></div>
    <div class="incsheet">
    <div class="mg-band">AGENT COMMISSION FROM ${esc(monUpper(AGFROM).slice(0,3)+'-'+AGFROM.slice(0,4)+' TO '+monUpper(AGTO).slice(0,3)+'-'+AGTO.slice(0,4))}</div>
    ${rows.length?`<div class="tablewrap"><table class="table-compact inctable"><thead><tr>
      <th>No</th><th>Name</th><th># of case closed</th><th>Total amount</th><th>Commission %</th><th>Incentive received</th>
      <th>Bank name</th><th>Account name</th><th>Account number</th><th>Remark</th></tr></thead><tbody>`
      +rows.map((r,i)=>`<tr><td>${i+1}</td><td><b class="nm">${esc(r.name)}</b></td><td>${r.cases}</td><td>${cash2(r.total)}</td>
        <td class="nowrap">${rateBox(r)}</td><td><b>${cash2(r.earned)}</b></td><td>${esc(r.bank||'—')}</td><td>${esc(r.acct||'—')}</td><td>${esc(r.num||'—')}</td><td></td></tr>`).join('')
      +`</tbody><tfoot><tr class="srtotal"><td colspan="2"><b>Total</b></td><td><b>${tot('cases')}</b></td><td><b>${cash2(tot('total'))}</b></td><td></td>
        <td><b>${cash2(tot('earned'))}</b></td><td colspan="4"></td></tr></tfoot></table></div>`
      :blank('No agent deal won in these dates','')}
    </div>
    <div class="incsheet">
    <h3 class="increfh">Incentive reference from ${esc(fmtDate(AGFROM))} to ${esc(fmtDate(AGTO))}</h3>
    ${won.length?`<div class="tablewrap"><table class="table-compact inctable incref"><thead><tr><th>Lead reference ID</th><th>Agreement sign off date</th><th>Lead received date</th>
      <th>Sales person</th><th>Referral by</th><th>Lead channel</th><th>Customer name</th><th>Contact number</th><th>System size (pcs)</th><th>Brand</th>
      <th>Inverter size (kW)</th><th>Brand</th><th>Battery size (kWh)</th><th>Brand</th><th>Engineering name</th><th>Amount (USD)</th></tr></thead><tbody>`
      +won.map(l=>`<tr class="rowlink" onclick="openLead('${l.id}')"><td class="refid">${esc(l.ref_id||'')}</td><td class="nowrap">${fmtDate(l.stage_entered_at)}</td>
        <td class="nowrap">${fmtDate(l.lead_date||l.created_at)}</td><td class="nowrap">${esc(nameOf(l.assigned_to))}</td><td class="nowrap">${esc(agentOf(l))}</td>
        <td class="nowrap">${esc(l.lead_channel||'')}</td><td><b class="nm">${esc(l.customer_name||'')}</b></td><td class="nowrap">${esc(l.phone||'')}</td>
        <td>${l.panel_pcs??''}</td><td class="nowrap">${esc([l.panel_brand,l.panel_watt?'('+l.panel_watt+'W)':''].filter(Boolean).join(' '))}</td>
        <td>${l.inverter_kw??''}</td><td class="nowrap">${esc(l.inverter_brand||'')}</td><td>${l.battery_kwh??''}</td><td class="nowrap">${esc(l.battery_brand||'')}</td>
        <td class="nowrap">${esc(nameOf(l.site_engineer_id))}</td><td class="nowrap">${cash2(amt[l.id]||0)}</td></tr>`).join('')
      +`</tbody><tfoot><tr class="srtotal"><td colspan="15"><b>Total</b></td><td><b>${cash2(won.reduce((a,l)=>a+(amt[l.id]||0),0))}</b></td></tr></tfoot></table></div>`:''}
    </div>`;
}
async function agSaveRate(name,v){
  const {error}=await sb.from('agent_details').upsert({name,rate:v===''?null:Number(v),updated_at:new Date().toISOString()},{onConflict:'name'});
  if(error){toast(why(error));return;}
  toast('Saved');renderIncentive();
}

/* ---------------- the two payout files ---------------- */
async function loadExcelJS(){
  if(window.ExcelJS)return;
  await new Promise((ok,no)=>{const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);});
}
async function xlLogo(wb,ws,cols){
  try{const b=await fetch('img/logo.png').then(r=>r.blob());
    const b64=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});
    const id=wb.addImage({base64:b64,extension:'png'});ws.addImage(id,{tl:{col:0,row:0},ext:{width:220,height:52}});}catch(e){}
}
const XL_DARK={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F2328'}};
const XL_THIN={top:{style:'thin'},left:{style:'thin'},bottom:{style:'thin'},right:{style:'thin'}};
function xlTitle(ws,row,text,ncol){
  ws.mergeCells(row,1,row,ncol);const c=ws.getCell(row,1);c.value=text;
  c.font={bold:true,color:{argb:'FFFFFFFF'},size:12};c.fill=XL_DARK;c.alignment={horizontal:'center',vertical:'middle'};
  ws.getRow(row).height=20;
}
function xlHead(ws,row,heads){
  heads.forEach((h,i)=>{const c=ws.getCell(row,i+1);c.value=h;c.font={bold:true,color:{argb:'FFFFFFFF'},size:9};
    c.fill=XL_DARK;c.alignment={horizontal:'center',vertical:'middle',wrapText:true};c.border=XL_THIN;});
  ws.getRow(row).height=42;
}
function xlSign(ws,row,cols){
  [['PREPARED BY',cols[0]],['CHECKED BY',cols[1]],['CHECKED BY',cols[2]],['APPROVED BY',cols[3]]].forEach(([t,c])=>{
    ws.getCell(row,c).value=t;ws.getCell(row,c).font={bold:true};
    ['NAME','POSITION','DATE'].forEach((w,i)=>{ws.getCell(row+7+i,c).value=w;ws.getCell(row+7+i,c).font={bold:true};});});
}
async function xlSave(wb,name){
  const buf=await wb.xlsx.writeBuffer();
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=name;document.body.appendChild(a);a.click();a.remove();
}
const MONEY='"$"#,##0.00';

async function exportSalesIncentive(){
  if(!INCDATA||INCDATA.agent){toast('Nothing to export');return;}
  try{await loadExcelJS();}catch(e){toast('Could not load the Excel writer');return;}
  const {m,cur,rows,holdCols,nextPaid,leads,byLead,pays}=INCDATA;
  const wb=new ExcelJS.Workbook();
  /* Summary - the client's payout sheet */
  const ws=wb.addWorksheet('Summary');
  const heads=['NO','NAME','POSITION','JOIN DATE','TOTAL PAYMENT COLLECTION','% OF TEAM SALES','TOTAL SALES INCENTIVE',
    'TOTAL INCENTIVE RECEIVED THIS MONTH','TOTAL INCENTIVE RECEIVED IN THIS MONTH + '+monUpper(nextPaid.paidIn).slice(0,3)+' ('+INCSET.held_pct+'% HOLD)']
    .concat(holdCols.map(c=>'AMOUNT TO BE PAID IN '+monUpper(c.paidIn))).concat(['REMARK']);
  const N=heads.length;
  ws.columns=heads.map((h,i)=>({width:[6,20,26,12,16,12,14,16,18][i]||16}));
  await xlLogo(wb,ws);
  xlTitle(ws,4,'SALES INCENTIVE PAYOUT AS OF '+monUpper(m).slice(0,3)+'-'+m.slice(0,4),N);
  xlHead(ws,6,heads);
  rows.forEach((r,i)=>{const row=ws.getRow(7+i);
    row.values=[i+1,r.name,r.position,r.joined?new Date(r.joined+'T00:00:00'):'-',r.collection,r.share,r.earned,r.paidNow,
      r.paidNow+(nextPaid.by[r.id]||0)].concat(holdCols.map(c=>c.by[r.id]||0)).concat([r.exclude?'Excluded from Incentive':r.onProb?'Probation '+Math.round(r.rate*100)+'%':'']);
    row.eachCell({includeEmpty:true},(c,ci)=>{c.border=XL_THIN;if(ci>=5&&ci<N&&ci!==6)c.numFmt=MONEY;});
    row.getCell(6).numFmt='0.00%';row.getCell(4).numFmt='m/d/yyyy';});
  const tr=7+rows.length, tot=ws.getRow(tr);
  tot.getCell(1).value='TOTAL';ws.mergeCells(tr,1,tr,4);
  for(let c=5;c<N;c++){const L=ws.getColumn(c).letter;tot.getCell(c).value={formula:`SUM(${L}7:${L}${tr-1})`};tot.getCell(c).numFmt=c===6?'0%':MONEY;}
  tot.eachCell({includeEmpty:true},c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill=XL_DARK;});
  const w=tr+2;
  [['Incentive Pool',cur.pool],['Override '+INCSET.override_pct+'%',cur.override],['Remaining',cur.rest]].forEach(([k,v],i)=>{
    ws.getCell(w+i,1).value=k;ws.getCell(w+i,1).font={bold:true};ws.getCell(w+i,3).value=v;ws.getCell(w+i,3).numFmt=MONEY;});
  ws.getCell(w,4).value=cur.tier.name+(cur.tier.pct?' ('+cur.tier.pool+'% of collection)':'');
  xlSign(ws,w+5,[1,6,9,Math.min(N-1,11)]);

  /* REF - every deal paid in the month, payment by its number on the deal */
  const ref=wb.addWorksheet('REF');
  const mm=m.slice(0,7);
  const inM=pays.filter(p=>localDay(countDay(p)).slice(0,7)===mm);
  const ordOf={};
  const byL={};pays.forEach(p=>(byL[p.lead_id]=byL[p.lead_id]||[]).push(p));
  Object.values(byL).forEach(ps=>ps.sort((a,b)=>String(a.paid_on).localeCompare(String(b.paid_on))).forEach((p,i)=>ordOf[p.id||p.lead_id+p.paid_on+p.amount_usd]=i+1));
  const key=p=>p.id||p.lead_id+p.paid_on+p.amount_usd;
  const dealIds=[...new Set(inM.map(p=>p.lead_id))];
  const maxOrd=Math.max(1,...inM.map(p=>ordOf[key(p)]||1));
  const ORD=['1st','2nd','3rd','4th','5th','6th','7th','8th'];
  const rHeads=['No','Lead Reference ID','Agreement Sign Off Date','Lead Received Date','Sales Person','Referral By','Lead Channel','Customer Name','Contact Number','Installation End Date']
    .concat(Array.from({length:maxOrd},(_,i)=>[ORD[i]+' Payment Collection','Date']).flat());
  ref.columns=rHeads.map((h,i)=>({width:[5,16,12,12,16,14,16,26,14,14][i]||13}));
  await xlLogo(wb,ref);
  ref.getCell(5,1).value='INCENTIVE REFERENCE';ref.getCell(5,1).font={bold:true,underline:true};
  xlHead(ref,7,rHeads);
  const nameOf=id=>(STAFF.find(s=>s.id===id)||{}).full_name||'';
  dealIds.forEach((id,i)=>{const l=byLead[id]||{};const row=ref.getRow(8+i);
    const v=[i+1,l.ref_id||'',l.stage_code===WON&&l.stage_entered_at?new Date(localDay(l.stage_entered_at)+'T00:00:00'):'',
      l.lead_date?new Date(l.lead_date+'T00:00:00'):'',nameOf(l.assigned_to),agentOf(l)||l.referrer_name||'',l.lead_channel||'',l.customer_name||'',l.phone||'',
      l.installation_end?new Date(l.installation_end+'T00:00:00'):''];
    inM.filter(p=>p.lead_id===id).forEach(p=>{const o=ordOf[key(p)]||1;v[10+(o-1)*2]=Number(p.amount_usd||0);v[11+(o-1)*2]=new Date(p.paid_on+'T00:00:00');});
    row.values=v;
    row.eachCell({includeEmpty:true},(c,ci)=>{c.border=XL_THIN;if(ci>10)c.numFmt=(ci-10)%2?MONEY:'m/d/yyyy';});
    [3,4,10].forEach(ci=>row.getCell(ci).numFmt='m/d/yyyy');});
  const rt=8+dealIds.length+1;
  for(let o=0;o<maxOrd;o++){const c=11+o*2,L=ref.getColumn(c).letter;
    ref.getCell(rt,c).value={formula:`SUM(${L}8:${L}${rt-2})`};ref.getCell(rt,c).numFmt=MONEY;ref.getCell(rt,c).font={bold:true};}
  ref.getCell(rt+1,2).value='TOTAL PAYMENT COLLECTION';ref.mergeCells(rt+1,2,rt+1,3);
  ref.getCell(rt+1,2).font={bold:true,color:{argb:'FFFFFFFF'}};ref.getCell(rt+1,2).fill=XL_DARK;
  ref.getCell(rt+1,4).value={formula:Array.from({length:maxOrd},(_,o)=>ref.getColumn(11+o*2).letter+rt).join('+')};
  ref.getCell(rt+1,4).numFmt=MONEY;ref.getCell(rt+1,4).font={bold:true};
  xlSign(ref,rt+4,[2,5,9,Math.min(rHeads.length,15)]);
  await xlSave(wb,monthName(mm)+' - Solarworks - Sales Incentive.xlsx');
}

async function exportAgentIncentive(){
  if(!INCDATA||!INCDATA.agent||!INCDATA.rows.length){toast('Nothing to export');return;}
  try{await loadExcelJS();}catch(e){toast('Could not load the Excel writer');return;}
  const {rows,won,amt,nameOf,from,to}=INCDATA;
  const span=monUpper(from).slice(0,3)+'-'+from.slice(0,4)+' TO '+monUpper(to).slice(0,3)+'-'+to.slice(0,4);
  const wb=new ExcelJS.Workbook();
  const ws=wb.addWorksheet('Agent Commission');
  const heads=['No','Name','# of Case Closed','Total Amount','Commission %','Incentive Received','Bank Name','Account Name','Account Number','Remark'];
  ws.columns=[6,20,14,16,14,18,14,22,18,18].map(w=>({width:w}));
  await xlLogo(wb,ws);
  xlTitle(ws,5,'AGENT COMMISSION FROM '+span,heads.length);
  xlHead(ws,7,heads);ws.getRow(7).height=20;
  rows.forEach((r,i)=>{const row=ws.getRow(8+i);
    row.values=[i+1,r.name,r.cases,r.total,r.rate/100,{formula:`D${8+i}*E${8+i}`},r.bank,r.acct,r.num,''];
    row.getCell(4).numFmt=MONEY;row.getCell(5).numFmt='0.##%';row.getCell(6).numFmt=MONEY;row.getCell(9).numFmt='@';});
  const tr=8+rows.length, t=ws.getRow(tr);
  t.getCell(2).value='Total';t.getCell(3).value={formula:`SUM(C8:C${tr-1})`};t.getCell(4).value={formula:`SUM(D8:D${tr-1})`};
  t.getCell(6).value={formula:`SUM(F8:F${tr-1})`};[4,6].forEach(c=>t.getCell(c).numFmt=MONEY);
  t.eachCell({includeEmpty:true},c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill=XL_DARK;});
  for(let c=1;c<=heads.length;c++)t.getCell(c).fill=XL_DARK;
  xlSign(ws,tr+3,[1,4,7,9]);

  const ref=wb.addWorksheet('Reference');
  const rH=['Lead Reference ID','Agreement Sign Off Date','Lead Received Date','Sales Person','Referral By','Lead Channel','Customer Name','Contact Number',
    'System Size (Pcs)','Brand','Inverter Size (kW)','Brand','Battery Size (kWh)','Brand','Engineering Name','Amount (USD)'];
  ref.columns=[16,14,14,12,14,14,28,14,10,14,10,10,10,10,14,14].map(w=>({width:w}));
  await xlLogo(wb,ref);
  ref.getCell(6,1).value='Incentive Reference from '+fmtDate(from)+' to '+fmtDate(to);
  ref.getCell(6,1).font={bold:true,italic:true,underline:true,color:{argb:'FFC00000'}};
  xlHead(ref,8,rH);
  won.forEach((l,i)=>{const row=ref.getRow(9+i);
    row.values=[l.ref_id||'',new Date(localDay(l.stage_entered_at)+'T00:00:00'),l.lead_date?new Date(l.lead_date+'T00:00:00'):'',
      nameOf(l.assigned_to),agentOf(l),l.lead_channel||'',l.customer_name||'',l.phone||'',
      l.panel_pcs??'',[l.panel_brand,l.panel_watt?'('+l.panel_watt+'W)':''].filter(Boolean).join(' '),
      l.inverter_kw??'',l.inverter_brand||'',l.battery_kwh??'',l.battery_brand||'',nameOf(l.site_engineer_id),amt[l.id]||0];
    [2,3].forEach(c=>row.getCell(c).numFmt='m/d/yyyy');row.getCell(16).numFmt=MONEY;});
  const rt=9+won.length+1;
  ref.getCell(rt,15).value='Total';ref.getCell(rt,15).font={bold:true};
  ref.getCell(rt,16).value={formula:`SUM(P9:P${rt-2})`};ref.getCell(rt,16).numFmt=MONEY;ref.getCell(rt,16).font={bold:true};ref.getCell(rt,16).border=XL_THIN;
  xlSign(ref,rt+3,[1,5,9,15]);
  await xlSave(wb,'Agent Commission '+from+' to '+to+'.xlsx');
}

/* the two sheets as she sees them, one A4 landscape page each, with the
   signature boxes under each (client, 28 Oct 2026) */
async function incExportPdf(){
  const sheets=[...document.querySelectorAll('#main .incsheet')];
  if(!sheets.length){toast('Nothing to export');return;}
  const load=src=>new Promise((ok,no)=>{const x=document.createElement('script');x.src=src;x.onload=ok;x.onerror=no;document.head.appendChild(x);});
  try{
    if(!window.html2canvas)await load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    if(!window.jspdf)await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }catch(e){toast('Could not load the PDF writer');return;}
  toast('Making the PDF…');
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'landscape'});
  const W=297,H=210,M=10;
  const sign=`<div class="incsign">${['PREPARED BY','CHECKED BY','CHECKED BY','APPROVED BY'].map(t=>
    `<div><b>${t}</b><div class="line"></div><span>NAME</span><span>POSITION</span><span>DATE</span></div>`).join('')}</div>`;
  const box=document.createElement('div');box.className='incprint';document.body.appendChild(box);
  try{
    for(let i=0;i<sheets.length;i++){
      box.innerHTML='<img src="img/logo.png" class="inclogo" onerror="this.remove()">'+sheets[i].outerHTML+sign;
      box.querySelectorAll('input').forEach(x=>{const sp=document.createElement('span');sp.textContent=x.value+(x.closest('td')&&/agr-/.test(x.id)?'':'');x.replaceWith(sp);});
      await new Promise(r=>setTimeout(r,60));
      const c=await window.html2canvas(box,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false});
      let w=W-2*M,h=c.height*w/c.width;
      if(h>H-2*M){h=H-2*M;w=c.width*h/c.height;}
      if(i)pdf.addPage();
      pdf.addImage(c.toDataURL('image/jpeg',0.92),'JPEG',M,M,w,h);
    }
  }finally{box.remove();}
  const name=INCDATA&&INCDATA.agent?'Agent Commission '+AGFROM+' to '+AGTO:monthName(INCMONTH.slice(0,7))+' - Solarworks - Sales Incentive';
  pdf.save(name+'.pdf');
}
