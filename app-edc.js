/* ---------------- EDC (admin) ----------------
   Operations work is a worklist, not a lead-by-lead hunt. Every won deal with
   its outstanding dates, edited in place. The two size bands need different
   columns, so they get a table each. */
async function renderEdc(){
  $('main').innerHTML=SKEL;
  const rows=await fetchLeads(q=>q.eq('stage_code',WON));
  const applicable=rows.filter(edcApplies);
  const small=applicable.filter(l=>edcFields(l)===EDC_SMALL);
  const large=applicable.filter(l=>edcFields(l)===EDC_LARGE);
  /* anything not off-grid that we still cannot place: either nobody has set
     the system type, or there is no inverter total to give a kWac */
  const pending=rows.filter(l=>!edcExempt(l)&&!edcFields(l));
  const outstanding=[...small,...large].filter(l=>edcDone(l)<edcFields(l).length);
  /* anything with at least one date filled in, kept as a record to look back on */
  const started=[...small,...large].filter(l=>edcDone(l)>0)
    .sort((a,b)=>edcDone(b)/edcFields(b).length-edcDone(a)/edcFields(a).length);
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">EDC approval letter</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">On-Grid and Hybrid won deals, split by inverter kWac. Dates save when you pick them.</p>
    <div class="stats">
      <div class="stat hero ${outstanding.length?'alert':''}"><div class="n">${outstanding.length}</div><div class="l">Still outstanding</div></div>
      <div class="stat"><div class="n">${applicable.length}</div><div class="l">Won deals</div></div>
      <div class="stat"><div class="n">${small.length}</div><div class="l">≤ 10 kWac</div></div>
      <div class="stat"><div class="n">${large.length}</div><div class="l">&gt; 10 kWac</div></div>
    </div>
    <div class="toolbar">
      <div class="scope">
        <button class="${EDCSCOPE==='work'?'on':''}" onclick="setEdcScope('work')">Worklist</button>
        <button class="${EDCSCOPE==='sent'?'on':''}" onclick="setEdcScope('sent')">Submitted (${started.length})</button>
        <button class="${EDCSCOPE==='miss'?'on':''}" onclick="setEdcScope('miss')">Missing information (${pending.length})</button>
      </div>
    </div>

    ${EDCSCOPE==='work'?`
      ${edcTable('Inverter ≤ 10 kWac',small,EDC_SMALL)}
      ${edcTable('Inverter &gt; 10 kWac',large,EDC_LARGE)}`:''}

    ${EDCSCOPE==='sent'?(started.length?`<div class="tablewrap"><table><thead><tr>
        <th>Ref ID</th><th>Customer</th><th>System</th><th>Steps done</th><th>Progress</th><th>Salesperson</th><th>Won</th>
      </tr></thead><tbody>`+started.map(l=>{
        const fl=edcFields(l),d=edcDone(l);
        return `<tr class="rowlink" onclick="edcReview('${l.id}')">
          <td class="refid">${esc(l.ref_id||'—')}</td>
          <td><b>${esc(l.customer_name)}</b></td>
          <td>${esc(sysLine(l))}</td>
          <td><b>${d} of ${fl.length}</b></td>
          <td><div class="edc-steps">${fl.map(([k,short])=>`<span class="${l[k]?'ok':''}" title="${short}${l[k]?': '+fmtDate(l[k]):''}">${short}</span>`).join('')}</div></td>
          <td>${esc(staffName(l.assigned_to))}</td>
          <td>${fmtDate(l.stage_entered_at)}</td></tr>`;}).join('')
      +`</tbody></table></div>`
      :blank('Nothing submitted yet','A deal appears here as soon as its first EDC date is recorded.')):''}

    ${EDCSCOPE==='miss'?(pending.length?`<h3 style="font-size:15px;margin:0 0 6px">Missing information (${pending.length})</h3>
      <p style="color:var(--ink-soft);font-size:13px;margin-bottom:10px">Not placed yet. The sale engineer needs to finish the spec.</p>
      <div class="tablewrap"><table><thead><tr><th>Ref ID</th><th>Customer</th><th>Missing</th><th>Salesperson</th><th>Won</th></tr></thead><tbody>`
      +pending.map(l=>`<tr class="rowlink" onclick="openLead('${l.id}')">
        <td class="refid">${esc(l.ref_id||'—')}</td><td><b>${esc(l.customer_name)}</b></td>
        <td>${!edcApplies(l)?'System type':'Inverter total'}</td>
        <td>${esc(staffName(l.assigned_to))}</td><td>${fmtDate(l.stage_entered_at)}</td></tr>`).join('')
      +`</tbody></table></div>`
      :blank('Nothing missing','Every won deal has enough information to be placed.')):''}`;
}

/* a submitted EDC file, with every date and the lead's own history beside it */
async function edcReview(id){
  const [{data:l},{data:acts}]=await Promise.all([
    sb.from('leads').select('*').eq('id',id).single(),
    sb.from('lead_activities').select('*').eq('lead_id',id).order('created_at',{ascending:false})
  ]);
  if(!l){toast('Could not open it');return;}
  const fl=edcFields(l)||[];
  $('lead-modal').innerHTML=`
    <h2>${esc(l.customer_name)} <span class="refid">${esc(l.ref_id||'')}</span></h2>
    <div class="sub">${esc(sysLine(l))} · won ${fmtDate(l.stage_entered_at)} · ${esc(staffName(l.assigned_to))}</div>

    <div class="section sec-edc"><h4>EDC steps</h4>
      <div class="grid2">
        ${fl.map(([k,short,full])=>`<div><label title="${esc(full)}">${short}</label>
          <input value="${l[k]?fmtDate(l[k]):'not yet'}" disabled></div>`).join('')}
      </div>
    </div>

    <div class="section sec-install"><h4>Installation</h4>
      <div class="grid3">
        <div><label>Delivery</label><input value="${l.delivery_date?fmtDate(l.delivery_date):'not set'}" disabled></div>
        <div><label>Install start</label><input value="${l.installation_start?fmtDate(l.installation_start):'not set'}" disabled></div>
        <div><label>Install end</label><input value="${l.installation_end?fmtDate(l.installation_end):'not set'}" disabled></div>
        <div><label>Team</label><input value="${esc(l.installation_team||'not set')}" disabled></div>
        <div><label>BOQ</label><input value="${esc(l.boq_status||'not set')}" disabled></div>
        <div><label>BOQ date</label><input value="${l.boq_date?fmtDate(l.boq_date):'—'}" disabled></div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn-line" onclick="closeLead();openLead('${l.id}')">Open the full lead</button>
      <button class="btn-line" onclick="closeLead()">Close</button>
    </div>

    <h3 style="margin-top:22px;font-size:15px">History</h3>
    <div class="timeline">${(acts||[]).map(a=>`
      <div class="tl-item">
        <div class="t-head">${esc(a.activity_type==='stage_change'?`Stage: ${a.from_stage||'—'} → ${a.to_stage}`:a.activity_type)}</div>
        <div class="t-meta">${a.note_date?fmtDate(a.note_date)+' · ':''}${esc(staffName(a.actor_id))} · ${fmtDT(a.created_at)}</div>
        ${a.note?`<div class="t-note">${esc(a.note)}</div>`:''}
      </div>`).join('')||blank('No history yet','Nothing has been recorded on this lead.')}
    </div>`;
  $('lead-overlay').classList.add('open');
}

function setEdcScope(v){EDCSCOPE=v;renderEdc();}
function edcTable(title,rows,fields){
  if(!rows.length)return `<h3 style="font-size:15px;margin:0 0 6px">${title}</h3>
    <div class="empty" style="margin-bottom:22px"><b>Nothing in this band</b><span>Won deals land here once their inverter total puts them in this size.</span></div>`;
  return `<h3 style="font-size:15px;margin:0 0 8px">${title}</h3>
    <div class="tablewrap" style="margin-bottom:22px"><table><thead><tr>
      <th>Ref ID</th><th>Customer</th>${fields.map(([,short,full])=>`<th title="${esc(full)}">${short}</th>`).join('')}<th>Done</th>
    </tr></thead><tbody>`+rows.map(l=>{
      const next=fields.find(([k])=>!l[k]);
      return `<tr>
      <td class="refid" style="cursor:pointer" onclick="openLead('${l.id}')" title="Open the lead">${esc(l.ref_id||'—')}</td>
      <td><b>${esc(l.customer_name)}</b><span class="days">${kwac(l)} kWac · ${esc(staffName(l.site_engineer_id))}</span></td>
      ${fields.map(([k])=>`<td class="${next&&next[0]===k?'edc-next':''}"><input type="date" style="min-width:130px" value="${l[k]||''}" onchange="setEdcDate('${l.id}','${k}',this.value)"></td>`).join('')}
      <td><b>${edcDone(l)}/${fields.length}</b></td>
    </tr>`;}).join('')+`</tbody></table></div>`;
}
async function setEdcDate(id,col,v){
  const {error}=await sb.from('leads').update({[col]:v||null}).eq('id',id);
  if(error){toast('Could not save that date');console.error(error);return;}
  await logActivity(id,'edit',null,null,'EDC '+col.replace(/^edc_/,'').replace(/_/g,' ')+': '+(v||'cleared'));
  toast('Saved');
}
