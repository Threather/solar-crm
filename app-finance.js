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
const finDue=r=>Number(r.fin?.contract_total_usd??r.final_sale_usd??0)+finFees(r);
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
      <div class="stat hero ${totalDue-totalPaid>0?'alert':''}"><div class="n">${fmtMoney(totalDue-totalPaid)}</div><div class="l">Outstanding</div></div>
      <div class="stat"><div class="n">${dueNow.length}</div><div class="l">Follow up now</div></div>
      <div class="stat"><div class="n">${fmtMoney(totalPaid)}</div><div class="l">Collected</div></div>
      <div class="stat"><div class="n">${FINROWS.length}</div><div class="l">Won deals</div></div>
      <div class="stat"><div class="n">${contracted.length}</div><div class="l">Contract signed</div></div>
    </div>
    <div class="toolbar">
      <div class="scope">
        <button class="${FINSCOPE==='owing'?'on':''}" onclick="setFinScope('owing')">Still owing</button>
        <button class="${FINSCOPE==='paid'?'on':''}" onclick="setFinScope('paid')">Paid in full</button>
      </div>
      <input placeholder="Search customer or ref ID…" oninput="FILTER.q=this.value;drawFinance()" value="${esc(FILTER.q||'')}">
      <button class="btn-line" onclick="FILTER.q='';renderFinance()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="exportFinance()">Export CSV</button>
    </div>
    <div class="tablewrap" id="finwrap"></div>`;
  drawFinance();
}
/* a deal that owes nothing is finished work, not today's work */
const finSettled=r=>finDue(r)>0&&finDue(r)-finPaid(r)<=0;
function filteredFin(){
  let rows=FINROWS.filter(r=>FINSCOPE==='paid'?finSettled(r):!finSettled(r));
  if(FILTER.q){const s=FILTER.q.toLowerCase();
    rows=rows.filter(r=>(r.customer_name||'').toLowerCase().includes(s)||(r.ref_id||'').toLowerCase().includes(s));}
  return rows;
}
function setFinScope(v){FINSCOPE=v;renderFinance();}
function drawFinance(){
  const rows=filteredFin();
  if(!rows.length){$('finwrap').innerHTML=FILTER.q
    ?blank('No matches','No deal fits the current search.')
    :FINSCOPE==='paid'?blank('Nothing settled yet','Deals move here once the balance reaches zero.')
    :blank('Nothing outstanding','Every won deal has been paid in full.');return;}
  /* Nine columns, not thirteen. What is still owed leads, because that is the
     question this page exists to answer; won month, channel, system and the
     sale value moved to the card and the CSV, where nobody had to scroll
     sideways to reach them. */
  $('finwrap').innerHTML=`<table class="table-compact"><thead><tr>
    <th>Ref ID</th><th>Customer</th><th>Phone</th><th>Balance</th><th>Paid</th>
    <th>Total due</th><th>Contract</th><th>Follow-up</th><th>Salesperson</th>
  </tr></thead><tbody>`+rows.map(r=>{
    const paid=finPaid(r), due=finDue(r), bal=due-paid, dueNow=finFollowDue(r);
    return `<tr class="rowlink" onclick="openFinance('${r.id}')">
      <td class="refid">${esc(r.ref_id||'—')}</td>
      <td><b>${esc(r.customer_name)}</b></td>
      <td class="phone">${r.phone?esc(r.phone):'<span class="quiet">—</span>'}</td>
      <td><b class="${bal>0.005?'overdue':''}">${fmtMoney(bal)}</b></td>
      <td>${fmtMoney(paid)}<span class="days">${r.payments.length} payment${r.payments.length===1?'':'s'}</span></td>
      <td>${fmtMoney(due)}</td>
      <td>${esc(r.fin?.contract_status||'—')}<span class="days">${r.fin?.contract_signed_date?fmtDate(r.fin.contract_signed_date):''}</span></td>
      <td class="nowrap">${r.fin?.follow_up_date?`<b class="${dueNow?'overdue':''}">${fmtDate(r.fin.follow_up_date)}</b>`:'—'}</td>
      <td>${esc(staffName(r.assigned_to))}</td>
    </tr>`;}).join('')+`</tbody></table>`;
}

function openFinance(id){
  const r=FINROWS.find(x=>x.id===id); if(!r)return;
  const f=r.fin||{}, paid=finPaid(r), due=finDue(r);
  $('lead-modal').innerHTML=`
    <h2>${esc(r.customer_name)} <span class="refid">${esc(r.ref_id||'')}</span></h2>
    <div class="sub">${esc(staffName(r.assigned_to))} · ${esc(r.lead_channel||'—')} · received ${fmtDate(r.created_at)} · won ${fmtDate(r.stage_entered_at)}</div>

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
        <div><label>Contract total (USD)</label><input id="f-total" type="number" step="0.01" value="${f.contract_total_usd??''}"></div>
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
        <th style="width:100px">Other fee</th><th>Note</th><th style="width:86px"></th></tr></thead><tbody>`
        +r.payments.map((p,i)=>`<tr>
          <td>${i+1}</td><td>${fmtDate(p.paid_on)}</td>
          <td><b>${fmtMoney(p.amount_usd)}</b></td>
          <td>${Number(p.other_fee_usd||0)?fmtMoney(p.other_fee_usd):'<span class="quiet">—</span>'}</td>
          <td>${esc(p.note||'')}${p.other_fee_note?`<span class="days">fee: ${esc(p.other_fee_note)}</span>`:''}</td>
          <td><button class="btn-mini" onclick="deletePayment('${p.id}','${r.id}')">Remove</button></td>
        </tr>`).join('')+`</tbody></table></div>`
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
        <div style="align-self:end"><button class="btn-line" onclick="skipFollowUp('${r.id}')">Skip a month</button></div>
        <div style="align-self:end"><span class="days">Recording a payment moves this on a month by itself.</span></div>
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
    contract_total_usd:$('f-total').value||null,
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
  downloadCSV('finance',['Ref ID','Customer','Won month','Received','Salesperson',
    'Channel','Sub-channel','System type','Panel kWp','Inverter total kW',
    'Sale value (USD)','Contract total (USD)','Contract status','Date signed','Next follow-up',
    'Other fees (USD)','What the fees were for',
    'Payments','Paid (USD)','Total due (USD)','Outstanding (USD)'],
    filteredFin().map(r=>[r.ref_id,r.customer_name,
      r.stage_entered_at?localDay(r.stage_entered_at).slice(0,7):'',
      localDay(r.created_at),staffName(r.assigned_to),
      r.lead_channel,r.lead_sub_channel,r.system_type,r.panel_kwp,r.inverter_kw_total,
      r.final_sale_usd,r.fin?.contract_total_usd,r.fin?.contract_status,r.fin?.contract_signed_date,
      r.fin?.follow_up_date,finFees(r)||'',
      (r.payments||[]).map(p=>p.other_fee_note).filter(Boolean).join('; '),
      r.payments.length,finPaid(r),finDue(r),finDue(r)-finPaid(r)]));
}
