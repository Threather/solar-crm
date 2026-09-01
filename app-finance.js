/* ---------------- FINANCE ----------------
   Won deals with the money attached: what the contract says, what has been
   paid, what is left. Contract total is kept separate from the sale value
   sales recorded at closing, so a disagreement between them is visible
   rather than quietly overwritten. */
const sysLine=l=>[l.system_type,l.panel_kwp?l.panel_kwp+' kWp':null,
  l.inverter_kw_total?l.inverter_kw_total+' kW':null].filter(Boolean).join(' · ')||'—';
const finPaid=r=>(r.payments||[]).reduce((a,p)=>a+Number(p.amount_usd||0),0);
/* An extra charge belongs to the payment it turned up with, not to the
   contract: one deal can pick up several, and one flat field on the contract
   could only ever hold the last one. */
const finFees=r=>(r.payments||[]).reduce((a,p)=>a+Number(p.other_fee_usd||0),0);
/* The contract is the sale value the customer accepted plus anything agreed on
   top of it at signing. Nobody retypes the quotation price: the only number a
   person enters here is the addition, and the reason for it. Deals contracted
   before this was derived keep whatever total was typed at the time. */
const finContract=r=>r.fin?.contract_extra_usd==null&&r.fin?.contract_total_usd!=null
  ? Number(r.fin.contract_total_usd)
  : Number(r.final_sale_usd??r.fin?.contract_total_usd??0)+Number(r.fin?.contract_extra_usd||0);
const finDue=r=>finContract(r)+finFees(r);
/* the card being looked at, so the derived total can be recomputed as the
   addition is typed */
let FINROW=null;
/* stored as well as derived, so the finance CSV and anything reading
   lead_finance directly still see one number */
function finTotalNow(){
  if(!FINROW)return null;
  const base=FINROW.final_sale_usd??FINROW.fin?.contract_total_usd??0;
  return Number(base)+Number($('f-extra')?.value||0);
}
/* the total follows the addition as it is typed, the same way kWp follows
   watt x pcs */
function finTotal(){
  const t=$('f-total');if(t)t.value=fmtMoney(finTotalNow());
}
/* due today or overdue, and only while there is still money outstanding */
const finFollowDue=r=>!!r.fin?.follow_up_date&&r.fin.follow_up_date<=localDay(new Date())&&finDue(r)-finPaid(r)>0;

async function renderFinance(){
  $('main').innerHTML=SKEL;
  const leads=await fetchLeads(q=>q.eq('stage_code',WON));
  const ids=leads.map(l=>l.id);
  const [{data:fins},{data:pays},{data:sale}]=await Promise.all([
    sb.from('lead_finance').select('*'),
    sb.from('lead_payments').select('*').order('paid_on'),
    sb.from('lead_financials').select('lead_id,final_sale_usd')
  ]);
  const finBy=Object.fromEntries((fins||[]).map(f=>[f.lead_id,f]));
  const saleBy=Object.fromEntries((sale||[]).map(f=>[f.lead_id,f.final_sale_usd]));
  FINROWS=leads.map(l=>({...l,fin:finBy[l.id]||null,final_sale_usd:saleBy[l.id]??null,
    payments:(pays||[]).filter(p=>p.lead_id===l.id)}));

  const contracted=FINROWS.filter(r=>r.fin?.contract_signed_date);
  const totalDue=FINROWS.reduce((a,r)=>a+finDue(r),0);
  const totalPaid=FINROWS.reduce((a,r)=>a+finPaid(r),0);
  const dueNow=FINROWS.filter(r=>finFollowDue(r));
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Finance</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Won deals. Open a row to record the contract and its payments.</p>
    <div class="stats">
      <div class="stat hero ${totalDue-totalPaid>0?'alert':''}"><div class="n">${fmtMoney(totalDue-totalPaid)}</div><div class="l">Outstanding payment</div></div>
      <div class="stat"><div class="n">${dueNow.length}</div><div class="l">Follow up now</div></div>
      <div class="stat"><div class="n">${fmtMoney(totalPaid)}</div><div class="l">Payment collected</div></div>
      <div class="stat"><div class="n">${FINROWS.length}</div><div class="l">Closed-Won</div></div>
      <div class="stat"><div class="n">${contracted.length}</div><div class="l">Contract signed</div></div>
    </div>
    <div class="toolbar">
      <div class="scope">
        <button class="${FINSCOPE==='owing'?'on':''}" onclick="setFinScope('owing')">Still owing</button>
        <button class="${FINSCOPE==='paid'?'on':''}" onclick="setFinScope('paid')">Paid in full</button>
        <button class="${FINSCOPE==='pay'?'on':''}" onclick="setFinScope('pay')">Payments</button>
      </div>
      <input placeholder="Search customer or ref ID…" oninput="FILTER.q=this.value;drawFinance()" value="${esc(FILTER.q||'')}">
      ${FINSCOPE==='pay'?`
      <span class="daterange">
        <input type="date" value="${esc(FINFILTER.from||'')}" onchange="setFinFilter('from',this.value)" title="Paid from">
        to
        <input type="date" value="${esc(FINFILTER.to||'')}" onchange="setFinFilter('to',this.value)" title="Paid to">
      </span>
      <button class="btn-line" onclick="setFinMonth(0)">This month</button>
      <button class="btn-line" onclick="setFinMonth(1)">Last month</button>`:`
      <select onchange="setFinFilter('status',this.value)" title="Contract status">
        <option value="">Any contract</option>
        ${CONTRACT_STATUS.map(v=>`<option value="${esc(v)}" ${FINFILTER.status===v?'selected':''}>${esc(v)}</option>`).join('')}
        <option value="__none" ${FINFILTER.status==='__none'?'selected':''}>Not recorded</option>
      </select>
      <select onchange="setFinFilter('acct',this.value)" title="Type of account">
        <option value="">Any account</option>
        ${ACCOUNT_TYPES.map(v=>`<option value="${esc(v)}" ${FINFILTER.acct===v?'selected':''}>${esc(v)}</option>`).join('')}
        <option value="__none" ${FINFILTER.acct==='__none'?'selected':''}>Not set</option>
      </select>
      <select onchange="setFinFilter('eng',this.value)" title="Sale engineer">
        <option value="">Any sale engineer</option>
        ${[...new Set(FINROWS.map(r=>r.assigned_to).filter(Boolean))]
          .map(id=>`<option value="${id}" ${FINFILTER.eng===id?'selected':''}>${esc(staffName(id))}</option>`).join('')}
      </select>
      <select onchange="setFinFilter('due',this.value)" title="Collection follow-up">
        <option value="">Any follow-up</option>
        <option value="over" ${FINFILTER.due==='over'?'selected':''}>Follow-up due now</option>
        <option value="none" ${FINFILTER.due==='none'?'selected':''}>No date set</option>
      </select>`}
      <button class="btn-line" onclick="clearFinFilters()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="${FINSCOPE==='pay'?'exportPayments()':'exportFinance()'}">Export CSV</button>
    </div>
    <div class="tablewrap" id="finwrap"></div>`;
  drawFinance();
}
/* a deal that owes nothing is finished work, not today's work */
const finSettled=r=>finDue(r)>0&&finDue(r)-finPaid(r)<=0;
/* finance works its list by contract, by account type, by whose customer it is
   and by what is due — so those are the filters, not a second search box */
function setFinFilter(k,v){FINFILTER[k]=v;drawFinance();}
function clearFinFilters(){FILTER.q='';FINFILTER={status:'',acct:'',eng:'',due:'',from:'',to:''};renderFinance();}
/* the two questions finance actually asks of a payment list */
function setFinMonth(back){
  const n=new Date(), d=new Date(n.getFullYear(),n.getMonth()-back,1);
  const end=new Date(d.getFullYear(),d.getMonth()+1,0);
  FINFILTER.from=localDay(d);FINFILTER.to=localDay(end);
  renderFinance();
}
/* Every payment, across every customer, as its own list. The deal screens
   answer "who still owes"; this answers "what came in, and when" — which the
   card could only ever answer one customer at a time. */
function allPayments(){
  const out=[];
  FINROWS.forEach(r=>(r.payments||[]).forEach(p=>out.push({...p,lead:r})));
  let rows=out.filter(p=>p.paid_on);
  if(FINFILTER.from)rows=rows.filter(p=>localDay(p.paid_on)>=FINFILTER.from);
  if(FINFILTER.to)rows=rows.filter(p=>localDay(p.paid_on)<=FINFILTER.to);
  if(FILTER.q){const s=FILTER.q.toLowerCase();
    rows=rows.filter(p=>(p.lead.customer_name||'').toLowerCase().includes(s)
      ||(p.lead.ref_id||'').toLowerCase().includes(s));}
  if(FINFILTER.eng)rows=rows.filter(p=>p.lead.assigned_to===FINFILTER.eng);
  return rows.sort((a,b)=>localDay(b.paid_on).localeCompare(localDay(a.paid_on)));
}
function drawPayments(){
  const rows=allPayments();
  if(!rows.length){$('finwrap').innerHTML=blank('No payments in this period',
    'Widen the dates, or clear the search. Payments are recorded on a deal.');return;}
  const total=rows.reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const fees=rows.reduce((a,p)=>a+Number(p.other_fee_usd||0),0);
  const word=FINFILTER.from||FINFILTER.to
    ? (FINFILTER.from?fmtDate(FINFILTER.from):'the start')+' to '+(FINFILTER.to?fmtDate(FINFILTER.to):'today')
    : 'all time';
  $('finwrap').innerHTML=`<p class="days" style="margin:0 0 8px">${rows.length} payment${rows.length===1?'':'s'} · ${esc(word)} · <b>${fmtMoney(total)}</b> received${fees?' · '+fmtMoney(fees)+' in fees on top':''}</p>
    <table class="table-compact"><thead><tr>
    <th style="width:118px">Date</th><th>Customer</th><th style="width:110px">Type of account</th>
    <th style="width:104px">Ref ID</th>
    <th style="width:110px">Amount</th><th style="width:100px">Other fee</th>
    <th style="width:150px">Sale engineer</th><th>Note</th><th>Remark</th>
  </tr></thead><tbody>`+rows.map(p=>`
    <tr class="rowlink" onclick="openFinance('${p.lead.id}')">
      <td class="nowrap">${fmtDate(p.paid_on)}</td>
      <td><b>${esc(p.lead.customer_name)}</b></td>
      <td>${p.lead.fin?.account_type?esc(p.lead.fin.account_type):'<span class="quiet">—</span>'}</td>
      <td class="refid">${esc(p.lead.ref_id||'—')}</td>
      <td class="numcell"><b>${fmtMoney(p.amount_usd)}</b></td>
      <td>${Number(p.other_fee_usd||0)?fmtMoney(p.other_fee_usd):'<span class="quiet">—</span>'}</td>
      <td>${esc(staffName(p.lead.assigned_to))}</td>
      <td>${esc(p.note||'')}${p.other_fee_note?`<span class="days">fee: ${esc(p.other_fee_note)}</span>`:''}</td>
      <td class="rem">${p.lead.fin?.finance_remark?esc(p.lead.fin.finance_remark):'<span class="quiet">—</span>'}</td>
    </tr>`).join('')+`</tbody></table>`;
}
function exportPayments(){
  const rows=allPayments();
  downloadCSV('payments',['Date','Customer','Type of account','Ref ID','Amount (USD)',
    'Other fee (USD)','What the fee was for','Sale engineer','Note','Contract remark'],
    rows.map(p=>[localDay(p.paid_on),p.lead.customer_name,p.lead.fin?.account_type,p.lead.ref_id,
      p.amount_usd,p.other_fee_usd,p.other_fee_note,
      staffName(p.lead.assigned_to),p.note,p.lead.fin?.finance_remark]));
}
function filteredFin(){
  let rows=FINROWS.filter(r=>FINSCOPE==='paid'?finSettled(r):!finSettled(r));
  if(FILTER.q){const s=FILTER.q.toLowerCase();
    rows=rows.filter(r=>(r.customer_name||'').toLowerCase().includes(s)||(r.ref_id||'').toLowerCase().includes(s));}
  if(FINFILTER.status)rows=rows.filter(r=>FINFILTER.status==='__none'
    ?!r.fin?.contract_status : r.fin?.contract_status===FINFILTER.status);
  if(FINFILTER.acct)rows=rows.filter(r=>FINFILTER.acct==='__none'
    ?!r.fin?.account_type : r.fin?.account_type===FINFILTER.acct);
  if(FINFILTER.eng)rows=rows.filter(r=>r.assigned_to===FINFILTER.eng);
  if(FINFILTER.due==='over')rows=rows.filter(r=>finFollowDue(r));
  if(FINFILTER.due==='none')rows=rows.filter(r=>!r.fin?.follow_up_date&&finDue(r)-finPaid(r)>0);
  return rows;
}
/* switching scope clears the filters, since a contract filter means nothing on
   a payment list and a date range means nothing on a deal list */
function setFinScope(v){
  if(FINSCOPE===v)return;
  FINSCOPE=v;FILTER.q='';FINFILTER={status:'',acct:'',eng:'',due:'',from:'',to:''};
  renderFinance();
}
const finFiltered=()=>!!(FILTER.q||FINFILTER.status||FINFILTER.acct||FINFILTER.eng||FINFILTER.due);
function drawFinance(){
  if(FINSCOPE==='pay')return drawPayments();
  const rows=filteredFin();
  const all=FINROWS.filter(r=>FINSCOPE==='paid'?finSettled(r):!finSettled(r));
  if(!rows.length){$('finwrap').innerHTML=finFiltered()
    ?blank('No matches','No deal fits the current search and filters. Clear them to see everything.')
    :FINSCOPE==='paid'?blank('Nothing settled yet','Deals move here once the balance reaches zero.')
    :blank('Nothing outstanding','Every won deal has been paid in full.');return;}
  /* the figures above count the whole list, so when a filter is on, say what
     is actually on screen rather than letting the two disagree in silence */
  const note=finFiltered()
    ? `<p class="days" style="margin:0 0 8px">Showing ${rows.length} of ${all.length} deals · ${fmtMoney(rows.reduce((a,r)=>a+(finDue(r)-finPaid(r)),0))} outstanding in this selection</p>`
    : '';
  /* Nine columns, not thirteen. What is still owed leads, because that is the
     question this page exists to answer; won month, channel, system and the
     sale value moved to the card and the CSV, where nobody had to scroll
     sideways to reach them. */
  $('finwrap').innerHTML=note+`<table class="table-compact"><thead><tr>
    <th>Ref ID</th><th>Customer</th><th style="width:110px">Type of account</th><th>Phone</th>
    <th>Balance</th><th>Paid</th>
    <th>Total due</th><th>Contract</th><th>Follow-up</th><th>Sale engineer</th><th>Remark</th>
  </tr></thead><tbody>`+rows.map(r=>{
    const paid=finPaid(r), due=finDue(r), bal=due-paid, dueNow=finFollowDue(r);
    return `<tr class="rowlink" onclick="openFinance('${r.id}')">
      <td class="refid">${esc(r.ref_id||'—')}</td>
      <td><b>${esc(r.customer_name)}</b></td>
      <td>${r.fin?.account_type?esc(r.fin.account_type):'<span class="quiet">—</span>'}</td>
      <td class="phone">${r.phone?esc(r.phone):'<span class="quiet">—</span>'}</td>
      <td><b class="${bal>0.005?'overdue':''}">${fmtMoney(bal)}</b></td>
      <td>${fmtMoney(paid)}<span class="days">${r.payments.length} payment${r.payments.length===1?'':'s'}</span></td>
      <td>${fmtMoney(due)}</td>
      <td>${esc(r.fin?.contract_status||'—')}<span class="days">${r.fin?.contract_signed_date?fmtDate(r.fin.contract_signed_date):''}</span></td>
      <td class="nowrap">${r.fin?.follow_up_date?`<b class="${dueNow?'overdue':''}">${fmtDate(r.fin.follow_up_date)}</b>`:'—'}</td>
      <td>${esc(staffName(r.assigned_to))}</td>
      <td class="rem">${r.fin?.finance_remark
        ?esc(r.fin.finance_remark)
        :'<span class="quiet">—</span>'}${r.fin?.payment_term?`<span class="days">${esc(r.fin.payment_term)}</span>`:''}</td>
    </tr>`;}).join('')+`</tbody></table>`;
}

function openFinance(id){
  const r=FINROWS.find(x=>x.id===id); if(!r)return;
  FINROW=r;
  const f=r.fin||{}, paid=finPaid(r), due=finDue(r);
  $('lead-modal').innerHTML=`
    <h2>${esc(r.customer_name)} <span class="refid">${esc(r.ref_id||'')}</span></h2>
    <div class="sub">${esc(staffName(r.assigned_to))} · ${esc(r.lead_channel||'—')} · received ${fmtDate(r.created_at)} · Closed-Won ${fmtDate(r.stage_entered_at)}</div>

    ${siteSpec(r,true)}

    <div class="section sec-sales"><h4>Deal</h4>
      <div class="grid3">
        <div><label>System</label><input value="${esc(sysLine(r))}" disabled></div>
        <div><label>Sale value recorded at closing</label><input value="${fmtMoney(r.final_sale_usd)}" disabled></div>
        <div><label>Site</label><input value="${esc([r.site_address,r.commune,r.district,r.province||r.city_province].filter(Boolean).join(', ')||'—')}" disabled></div>
      </div>
    </div>

    <div class="section sec-fin"><h4>Contract</h4>
      <div class="grid3">
        <div><label>Contract status</label><select id="f-status">${optList(CONTRACT_STATUS,f.contract_status)}</select></div>
        <div><label>Date signed</label><input id="f-signed" type="date" value="${f.contract_signed_date||''}"></div>
        <div><label>Contract total (USD)</label><input id="f-total" value="${fmtMoney(finContract(r))}" disabled title="The sale value at closing, plus anything additional"></div>
        <div><label>Additional (USD)</label><input id="f-extra" type="number" step="0.01" value="${f.contract_extra_usd??''}" placeholder="Only if there is more" oninput="finTotal()"></div>
        <div style="grid-column:2/-1"><label>What it is for</label><input id="f-extranote" value="${esc(f.contract_extra_note||'')}" placeholder="Optional"></div>
        <div><label>Type of account</label><select id="f-acct">${optList(ACCOUNT_TYPES,f.account_type)}</select></div>
        <div style="grid-column:2/-1"><label>Payment term</label><input id="f-term" value="${esc(f.payment_term||'')}" placeholder="50% deposit, 50% on completion"></div>
        <div style="grid-column:1/-1"><label>Remark</label><textarea id="f-remark" rows="2" placeholder="Anything worth knowing about this contract">${esc(f.finance_remark||'')}</textarea></div>
      </div>
      <div class="modal-actions"><button class="btn-sun" onclick="saveFinance('${r.id}')">Save contract</button></div>
    </div>

    <div class="section sec-fin"><h4>Record a payment</h4>
      <div class="grid3">
        <div><label>Date</label><input id="p-date" type="date"></div>
        <div><label>Amount (USD)</label><input id="p-amt" type="number" step="0.01"></div>
        <div><label>Note</label><input id="p-note" placeholder="Deposit, second instalment…"></div>
        <div><label>Other fee (USD)</label><input id="p-fee" type="number" step="0.01" placeholder="Only if there is one"></div>
        <div style="grid-column:2/-1"><label>What the fee is for</label><input id="p-feenote" placeholder="Extra battery, longer cable run…"></div>
      </div>
      <div class="modal-actions"><button class="btn-sun" onclick="addPayment('${r.id}')">Add payment</button></div>
    </div>

    <div class="section sec-fin"><h4>Payments (${r.payments.length})</h4>
      ${r.payments.length?`<div class="tablewrap"><table class="table-compact"><thead><tr>
        <th style="width:34px">#</th><th style="width:120px">Date</th><th style="width:100px">Amount</th>
        <th style="width:100px">Other fee</th><th style="width:110px">Still owing after</th>
        <th>Note</th><th style="width:86px"></th></tr></thead><tbody>`
        +(()=>{
          /* a running balance turns three separate figures into a story: what
             was left to pay the moment each one landed */
          let run=0;
          return r.payments.map((p,i)=>{
            run+=Number(p.amount_usd||0);
            const left=due-run;
            return `<tr>
              <td>${i+1}</td><td class="nowrap">${fmtDate(p.paid_on)}</td>
              <td><b>${fmtMoney(p.amount_usd)}</b></td>
              <td>${Number(p.other_fee_usd||0)?fmtMoney(p.other_fee_usd):'<span class="quiet">—</span>'}</td>
              <td class="nowrap ${left<=0?'':'overdue'}">${left<=0?'<span class="mark mark-done">settled</span>':fmtMoney(left)}</td>
              <td>${esc(p.note||'')}${p.other_fee_note?`<span class="days">fee: ${esc(p.other_fee_note)}</span>`:''}</td>
              <td><button class="btn-mini" onclick="deletePayment('${p.id}','${r.id}')">Remove</button></td>
            </tr>`;}).join('');
        })()+`</tbody></table></div>`
        :'<p style="font-size:13px;color:var(--ink-soft);margin:6px 0">No payments recorded.</p>'}
    </div>

    <div class="section sec-fin"><h4>Delivery and installation</h4>
      <div class="grid2">
        <div><label>Planned by the site engineer</label><input value="${r.delivery_date?fmtDate(r.delivery_date):'not set'}" disabled></div>
        <div><label>Arrived at the customer</label><input value="${r.delivery_confirmed_at?fmtDT(r.delivery_confirmed_at):'not confirmed yet'}" disabled></div>
        <div><label>Installation finished</label><input value="${r.installation_confirmed_at?fmtDT(r.installation_confirmed_at)+' · '+staffName(r.installation_confirmed_by):'not confirmed yet'}" disabled></div>
        <div style="align-self:end;display:flex;gap:8px;flex-wrap:wrap">
          ${!r.delivery_confirmed_at?`<button class="btn-line" onclick="confirmArrived('${r.id}',${JSON.stringify(r.customer_name||'')})">Confirm it arrived</button>`:''}
          ${!r.installation_confirmed_at?`<button class="btn-line" onclick="confirmInstalled('${r.id}',${JSON.stringify(r.customer_name||'')})">Confirm install finished</button>`:''}
        </div>
      </div>
    </div>

    <div class="section sec-fin"><h4>Next follow-up</h4>
      <div class="grid3">
        <div><label>Date</label><input id="f-follow" type="date" value="${f.follow_up_date||''}"></div>
        <div style="align-self:end"><button class="btn-sun" onclick="saveFollowUp('${r.id}')">Save date</button></div>
        <div style="align-self:end"><button class="btn-line" onclick="skipFollowUp('${r.id}')">Skip a month</button></div>
        <div style="grid-column:1/-1"><span class="days">Recording a payment moves this on a month by itself.</span></div>
      </div>
    </div>

    <div class="section sec-fin"><h4>Balance</h4>
      <div class="grid3">
        <div><label>Total due</label><input value="${fmtMoney(due)}" disabled></div>
        <div><label>Paid</label><input value="${fmtMoney(paid)}" disabled></div>
        <div><label>Outstanding</label><input value="${fmtMoney(due-paid)}" disabled></div>
      </div>
    </div>

    <div class="modal-actions"><button class="btn-line" onclick="closeLead()">Close</button></div>`;
  $('lead-overlay').classList.add('open');
}
async function saveFinance(id){
  const row={lead_id:id,
    contract_status:$('f-status').value||null,
    contract_signed_date:$('f-signed').value||null,
    contract_total_usd:finTotalNow(),
    contract_extra_usd:$('f-extra').value||null,
    contract_extra_note:$('f-extranote').value.trim()||null,
    account_type:$('f-acct').value||null,
    payment_term:$('f-term').value.trim()||null,
    finance_remark:$('f-remark').value.trim()||null,
    follow_up_date:$('f-follow').value||null,
    updated_by:ME.id,updated_at:new Date().toISOString()};
  const {error}=await sb.from('lead_finance').upsert(row,{onConflict:'lead_id'});
  if(error){toast('Could not save the contract. '+why(error));console.error(error);return;}
  toast('Contract saved');closeLead();renderFinance();
}
/* whoever is standing there when the goods land confirms it, and everyone
   hears about it — this used to be admin only, which meant the person who
   actually saw the delivery had to go and find someone */
async function confirmArrived(id,name){
  const {error}=await sb.from('leads').update({delivery_confirmed_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Could not confirm it. '+why(error));console.error(error);return;}
  await notify('delivered',id,`Delivered: ${name||'a customer'} received their system`);
  await logActivity(id,'edit',null,null,'Delivery confirmed as arrived');
  toast('Delivery confirmed');closeLead();go(VIEW);
}
/* the install being finished is what finance are waiting on to chase the last
   payment, so it is a company-wide notification like the delivery */
async function confirmInstalled(id,name){
  if(!confirm('Confirm the installation is finished?\n\nEveryone is notified, and it cannot be undone from the app.'))return;
  const {error}=await sb.from('leads').update({
    installation_confirmed_at:new Date().toISOString(),
    installation_confirmed_by:ME.id}).eq('id',id);
  if(error){toast('Could not confirm it. '+why(error));console.error(error);return;}
  await notify('installed',id,`Installation finished: ${name||'a customer'}, confirmed by ${staffName(ME.id)}`);
  await logActivity(id,'edit',null,null,'Installation confirmed as finished');
  toast('Installation confirmed');closeLead();go(VIEW);
}
/* The date had no save of its own: it was written by Save contract, three
   sections above and named for something else, so finance typed a date, found
   nothing to press and lost it on closing. */
async function saveFollowUp(id){
  const {error}=await sb.from('lead_finance')
    .upsert({lead_id:id,follow_up_date:$('f-follow').value||null,
             updated_by:ME.id,updated_at:new Date().toISOString()},{onConflict:'lead_id'});
  if(error){toast('Could not save the date. '+why(error));console.error(error);return;}
  toast($('f-follow').value?'Follow-up set for '+fmtDate($('f-follow').value):'Follow-up cleared');
  closeLead();renderFinance();
}
/* the customer paid ahead, so this month's follow-up is not needed */
async function skipFollowUp(id){
  const cur=$('f-follow').value;
  if(!cur){toast('Set a follow-up date first');return;}
  const next=addMonths(cur,1);
  const {error}=await sb.from('lead_finance')
    .upsert({lead_id:id,follow_up_date:next,updated_by:ME.id,updated_at:new Date().toISOString()},{onConflict:'lead_id'});
  if(error){toast('Could not move the follow-up');console.error(error);return;}
  toast('Follow-up moved to '+fmtDate(next));closeLead();renderFinance();
}
async function addPayment(id){
  const amt=$('p-amt').value;
  if(!amt){toast('Enter the amount');return;}
  /* the fee is optional: most payments carry none */
  const {error}=await sb.from('lead_payments').insert({lead_id:id,
    paid_on:$('p-date').value||null,amount_usd:amt,
    other_fee_usd:$('p-fee').value||null,
    other_fee_note:$('p-feenote').value.trim()||null,
    note:$('p-note').value.trim()||null,created_by:ME.id});
  if(error){toast('Could not add the payment. '+why(error));console.error(error);return;}
  /* this month is settled, so the follow-up rolls to the same day next month */
  const cur=$('f-follow')?$('f-follow').value:'';
  if(cur)await sb.from('lead_finance')
    .upsert({lead_id:id,follow_up_date:addMonths(cur,1),updated_by:ME.id,updated_at:new Date().toISOString()},{onConflict:'lead_id'});
  toast('Payment added');closeLead();renderFinance();
}
async function deletePayment(pid,leadId){
  if(!confirm('Remove this payment?'))return;
  const {error}=await sb.from('lead_payments').delete().eq('id',pid);
  if(error){toast('Could not remove it');return;}
  toast('Payment removed');closeLead();renderFinance();
}
function exportFinance(){
  downloadCSV('finance',['Ref ID','Customer','Closed-Won month','Received','Sale engineer',
    'Channel','Sub-channel','System type','Panel kWp','Inverter total kW',
    'Sale value (USD)','Contract total (USD)','Contract status','Date signed',
    'Type of account','Payment term','Remark','Next follow-up',
    'Other fees (USD)','What the fees were for',
    'Payments','Paid (USD)','Total due (USD)','Outstanding (USD)'],
    filteredFin().map(r=>[r.ref_id,r.customer_name,
      r.stage_entered_at?localDay(r.stage_entered_at).slice(0,7):'',
      localDay(r.created_at),staffName(r.assigned_to),
      r.lead_channel,r.lead_sub_channel,r.system_type,r.panel_kwp,r.inverter_kw_total,
      r.final_sale_usd,r.fin?.contract_total_usd,r.fin?.contract_status,r.fin?.contract_signed_date,
      r.fin?.account_type,r.fin?.payment_term,r.fin?.finance_remark,
      r.fin?.follow_up_date,finFees(r)||'',
      (r.payments||[]).map(p=>p.other_fee_note).filter(Boolean).join('; '),
      r.payments.length,finPaid(r),finDue(r),finDue(r)-finPaid(r)]));
}
