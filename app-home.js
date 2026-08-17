/* ---------------- HOME ----------------
   The first screen after signing in. It answers one question — what needs me
   today — and every figure on it is one the database can already produce.
   No trends, no month-on-month deltas: nothing here is stored twice, so there
   is nothing to compare against and nothing worth inventing. */

/* the queue rows all look alike and all open something, so they share a shape */
const qrow=(id,name,meta,late,fn)=>`<div class="qrow" onclick="${fn||'openLead'}('${id}')">
    <span class="nm">${esc(name)}</span>
    <span class="meta${late?' late':''}">${esc(meta)}</span></div>`;
const panel=(title,body)=>`<div class="panel"><h4>${title}</h4>${body}</div>`;
/* "6 days late" reads faster than a date when the date is already past */
const lateText=d=>{
  if(!d)return '';
  const n=Math.floor((new Date().setHours(0,0,0,0)-new Date(d).getTime())/86400000);
  return n>0?n+' day'+(n>1?'s':'')+' late':n===0?'due today':'due '+fmtDate(d);
};
const isLate=d=>d&&new Date(d)<new Date().setHours(0,0,0,0);

function dayBar(sub){
  const today=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
  return `<div class="daybar"><h1>${today}</h1><div class="sub">${esc(sub)}</div></div>`;
}
/* Bars rather than a wheel. A stage holding one lead still reads as a stage
   holding one lead; a one-degree slice of a donut just looks broken. */
function pipePanel(rows){
  const live=STAGES.filter(s=>!TERMINAL.includes(s.stage_code));
  const counts=live.map(s=>[s,rows.filter(l=>l.stage_code===s.stage_code).length]);
  const won=rows.filter(l=>l.stage_code===WON).length;
  const max=Math.max(1,...counts.map(([,n])=>n),won);
  const bar=(name,n,cls)=>`<div class="row${cls}">
      <span class="nm">${esc(name)}</span>
      <span class="track"><span class="fill" style="width:${n?Math.round(n/max*100):0}%"></span></span>
      <span class="ct">${n}</span></div>`;
  return panel('Pipeline',`<div class="pipe">
    ${counts.map(([s,n])=>bar(s.stage_name,n,n?'':' zero')).join('')}
    ${bar('Won',won,' won')}</div>`);
}

async function renderHome(){
  $('main').innerHTML=SKEL;
  if(ME.role==='finance')return homeFinance();
  const rows=await fetchLeads(q=>{
    if(ME.role==='sales')return q.eq('assigned_to',ME.id);
    if(ME.role==='site_engineer')return q.eq('site_engineer_id',ME.id);
    return q;
  });
  if(ME.role==='site_engineer')return homeSite(rows);
  if(ME.role==='marketing')return homeMarketing(rows);
  return homeSales(rows);
}

/* sales, manager and admin all work the pipeline; the difference is only how
   much of it they can see, which fetchLeads has already decided */
function homeSales(rows){
  const live=rows.filter(l=>!TERMINAL.includes(l.stage_code));
  const due=live.filter(l=>l.next_follow_up&&new Date(l.next_follow_up)<=new Date().setHours(23,59,59,999))
    .sort((a,b)=>(a.next_follow_up||'').localeCompare(b.next_follow_up||''));
  const overdue=due.filter(l=>isLate(l.next_follow_up));
  const pool=rows.filter(l=>!l.assigned_to&&!TERMINAL.includes(l.stage_code));
  const stale=live.filter(l=>!l.next_follow_up);
  const canPool=['manager','admin'].includes(ME.role);
  /* a won deal with no BOQ blocks the install, so it is counted here as well
     as raised at login — one of those is missable, two is not */
  const noBoq=rows.filter(l=>l.stage_code===WON&&l.boq_status!=='Done');

  $('main').innerHTML=dayBar(`${ME.full_name} · ${live.length} lead${live.length===1?'':'s'} in play`)+`
    <div class="stats">
      <div class="stat hero ${overdue.length?'alert':''}">
        <div class="n">${overdue.length}</div><div class="l">Follow-ups overdue</div></div>
      <div class="stat"><div class="n">${live.length}</div><div class="l">In pipeline</div></div>
      ${canPool?`<div class="stat"><div class="n">${pool.length}</div><div class="l">Unassigned</div></div>`:''}
      <div class="stat"><div class="n">${stale.length}</div><div class="l">No follow-up set</div></div>
    </div>
    ${noBoq.length?`<div class="hint" style="border-left-color:var(--own-eng);color:var(--own-eng)">
      <b>${noBoq.length} won deal${noBoq.length>1?'s':''} with no BOQ released.</b>
      ${noBoq.slice(0,4).map(l=>`<span class="rowlink" style="cursor:pointer;text-decoration:underline" onclick="openLead('${l.id}')">${esc(l.customer_name)}</span>`).join(' · ')}
      ${noBoq.length>4?` and ${noBoq.length-4} more`:''}
    </div>`:''}
    <div class="homegrid">
      ${pipePanel(live)}
      ${panel('Needs you today',due.length
        ?`<div class="qlist">${due.slice(0,8).map(l=>
            qrow(l.id,l.customer_name,lateText(l.next_follow_up),isLate(l.next_follow_up))).join('')}</div>`
        +(due.length>8?`<div class="days" style="margin-top:8px">${due.length-8} more in Leads</div>`:'')
        :blank('Nothing due','Leads appear here on the day their follow-up falls, and stay until you move them.'))}
    </div>`;
}

/* marketing is measured on what they put into the top of the pipeline, and on
   the leads that cannot move until someone captures a phone number */
function homeMarketing(rows){
  const live=rows.filter(l=>!TERMINAL.includes(l.stage_code));
  const mine=live.filter(l=>l.created_by===ME.id);
  const early=live.filter(l=>EARLY_STAGES.includes(l.stage_code));
  const nophone=live.filter(l=>!l.phone)
    .sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));

  $('main').innerHTML=dayBar(`${ME.full_name} · ${mine.length} lead${mine.length===1?'':'s'} created by you`)+`
    <div class="stats">
      <div class="stat hero ${nophone.length?'alert':''}">
        <div class="n">${nophone.length}</div><div class="l">Waiting on a phone number</div></div>
      <div class="stat"><div class="n">${live.length}</div><div class="l">In pipeline</div></div>
      <div class="stat"><div class="n">${early.length}</div><div class="l">Still early stage</div></div>
      <div class="stat"><div class="n">${mine.length}</div><div class="l">Yours</div></div>
    </div>
    <div class="homegrid">
      ${pipePanel(live)}
      ${panel('No phone number yet',nophone.length
        ?`<div class="qlist">${nophone.slice(0,8).map(l=>
            qrow(l.id,l.customer_name,daysIn(l.created_at)+'d old',daysIn(l.created_at)>7)).join('')}</div>`
        :blank('Every lead has a number','A salesperson is assigned automatically as soon as the number is captured.'))}
    </div>`;
}

/* the site engineer's day is dates: what has arrived, what is booked, what has
   neither and is therefore waiting on them */
function homeSite(rows){
  const won=rows.filter(l=>l.stage_code===WON);
  const delivered=won.filter(l=>l.delivery_confirmed_at);
  const booked=won.filter(l=>l.installation_start);
  const waiting=won.filter(l=>!l.installation_start)
    .sort((a,b)=>new Date(a.stage_entered_at)-new Date(b.stage_entered_at));

  $('main').innerHTML=dayBar(`${ME.full_name} · ${won.length} job${won.length===1?'':'s'}`)+`
    <div class="stats">
      <div class="stat hero ${waiting.length?'alert':''}">
        <div class="n">${waiting.length}</div><div class="l">No install date yet</div></div>
      <div class="stat"><div class="n">${won.length}</div><div class="l">Won deals</div></div>
      <div class="stat"><div class="n">${delivered.length}</div><div class="l">Goods delivered</div></div>
      <div class="stat"><div class="n">${booked.length}</div><div class="l">Installation booked</div></div>
    </div>
    <div class="homegrid">
      ${panel('Waiting on a date',waiting.length
        ?`<div class="qlist">${waiting.slice(0,8).map(l=>
            qrow(l.id,l.customer_name,l.delivery_confirmed_at?'delivered':'not delivered',
              !!l.delivery_confirmed_at)).join('')}</div>`
        :blank('Everything is booked','Won deals appear here until you set an installation date.'))}
      ${panel('Booked in',booked.length
        ?`<div class="qlist">${booked.slice(0,8).map(l=>
            qrow(l.id,l.customer_name,fmtDate(l.installation_start),false)).join('')}</div>`
        :blank('Nothing booked yet','Set an installation date on a job and it shows up here.'))}
    </div>`;
}

/* finance counts money, not leads, so it asks the finance tables directly —
   the same three the Finance page reads */
async function homeFinance(){
  const leads=await fetchLeads(q=>q.eq('stage_code',WON));
  const [{data:fins},{data:pays},{data:sale}]=await Promise.all([
    sb.from('lead_finance').select('*'),
    sb.from('lead_payments').select('lead_id,amount_usd'),
    sb.from('lead_financials').select('lead_id,final_sale_usd')
  ]);
  const finBy=Object.fromEntries((fins||[]).map(f=>[f.lead_id,f]));
  const saleBy=Object.fromEntries((sale||[]).map(f=>[f.lead_id,f.final_sale_usd]));
  const paidBy={};
  (pays||[]).forEach(p=>{paidBy[p.lead_id]=(paidBy[p.lead_id]||0)+Number(p.amount_usd||0);});

  const rows=leads.map(l=>{
    const total=Number(saleBy[l.id]||0), paid=paidBy[l.id]||0;
    return {...l,total,paid,due:total-paid,fin:finBy[l.id]||{}};
  });
  /* a deal only counts as due while money is still outstanding, so a fully
     paid one never appears in the follow-up count */
  const owing=rows.filter(r=>r.due>0.005);
  const settled=rows.filter(r=>r.total>0&&r.due<=0.005);
  const unsigned=rows.filter(r=>(r.fin.contract_status||'Not signed')!=='Signed');
  const due=owing.filter(r=>r.fin.follow_up_date&&new Date(r.fin.follow_up_date)<=new Date().setHours(23,59,59,999))
    .sort((a,b)=>(a.fin.follow_up_date||'').localeCompare(b.fin.follow_up_date||''));
  const outstanding=owing.reduce((a,r)=>a+r.due,0);

  $('main').innerHTML=dayBar(`${ME.full_name} · ${owing.length} deal${owing.length===1?'':'s'} still owing`)+`
    <div class="stats">
      <div class="stat hero ${due.length?'alert':''}">
        <div class="n">${due.length}</div><div class="l">Follow-ups due</div></div>
      <div class="stat"><div class="n">${fmtMoney(outstanding)}</div><div class="l">Outstanding</div></div>
      <div class="stat"><div class="n">${unsigned.length}</div><div class="l">Contract not signed</div></div>
      <div class="stat"><div class="n">${settled.length}</div><div class="l">Paid in full</div></div>
    </div>
    <div class="homegrid">
      ${panel('Chase today',due.length
        ?`<div class="qlist">${due.slice(0,8).map(r=>
            qrow(r.id,r.customer_name,lateText(r.fin.follow_up_date),isLate(r.fin.follow_up_date),
              'openFinance')).join('')}</div>`
        :blank('Nothing to chase','A deal appears here when its follow-up date arrives and money is still owed.'))}
      ${panel('Largest balances',owing.length
        ?`<div class="qlist">${owing.slice().sort((a,b)=>b.due-a.due).slice(0,8).map(r=>
            qrow(r.id,r.customer_name,fmtMoney(r.due)+' of '+fmtMoney(r.total),false,
              'openFinance')).join('')}</div>`
        :blank('Everything is settled','Won deals appear here until their balance reaches zero.'))}
    </div>`;
}
