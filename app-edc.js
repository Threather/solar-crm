/* ---------------- EDC (admin) ----------------
   Operations work is a worklist, not a lead-by-lead hunt. Every won deal with
   its outstanding dates, edited in place. The two size bands need different
   columns, so they get a table each. */
/* HEADING FILTERS (7 Oct 2026, the client): every column with a short list
   of values filters from its own heading, as on Leads and the Sales Report.
   A date filters by its month, or "Not yet" while it is empty. EDCCOL says
   what each column reads; a lead may give several values (the Progress
   column lists every step), and it passes when any of them is ticked. */
let EDCF={}, EDCSRC=[];
const edMon=d=>d?monthName(localDay(d).slice(0,7)):'Not yet';
/* WAITING ON (council, 8 Oct 2026): the next step a deal needs, and how long
   it has waited for it - counted from the step before, or from the win for
   the first step. "Not yet" on a later step also catches deals that simply
   have not got there, so this is the question she actually asks: what do I
   chase next, and which has waited longest. */
const edcWait=l=>{const f=edcFields(l)||[];const i=f.findIndex(([k])=>!l[k]);
  if(i<0)return null;
  const from=i>0?l[f[i-1][0]]:l.stage_entered_at;
  return {step:f[i][1],days:from?Math.max(0,Math.round((new Date(localDay(new Date()))-new Date(localDay(from)))/864e5)):null};};
const edcWaitDays=l=>{const w=edcWait(l);return w&&w.days!=null?w.days:-1;};
const EDCCOL={
  branch:l=>[l.edc_branch||'(blank)'],
  price:l=>[l.edc_fee_usd==null?'Not set':'Set'],
  eng:l=>[l.site_engineer_id?staffName(l.site_engineer_id):'No site engineer'],
  done:l=>[edcDone(l)+' of '+(edcFields(l)||[]).length],
  won:l=>[edMon(l.stage_entered_at)],
  sys:l=>[l.system_type||'(blank)'],
  wait:l=>{const w=edcWait(l);return [w?w.step:'All done'];},
  sale:l=>[l.assigned_to?staffName(l.assigned_to):'(blank)'],
  miss:l=>[!edcApplies(l)?'System type':'Inverter total']
};
[...EDC_SMALL,...EDC_LARGE].forEach(([k])=>{EDCCOL['d:'+k]=l=>[edMon(l[k])];});
/* a date column only filters the table that has it - picking Inspection on
   the small band leaves the large band, which has no such step, alone */
const edcHasCol=(l,k)=>!k.startsWith('d:')||(edcFields(l)||[]).some(([f])=>'d:'+f===k);
const edcPass=(l,skip)=>Object.entries(EDCF).every(([k,v])=>k===skip||!v.length||!edcHasCol(l,k)||EDCCOL[k](l).some(x=>v.includes(x)));
const edcHead=(label,key,title)=>`<th${title?` title="${esc(title)}"`:''}>${hfHead(label,EDCF[key]&&EDCF[key].length,`edcFilterOpen(event,'${key}','${esc(label)}')`)}</th>`;
const EDCLABEL={};
function edcFilterOpen(ev,key,label){
  EDCLABEL[key]=label;
  const cnt={};EDCSRC.filter(l=>edcHasCol(l,key)&&edcPass(l,key)).forEach(l=>[...new Set(EDCCOL[key](l))].forEach(v=>cnt[v]=(cnt[v]||0)+1));
  /* months in date order, grouped by step on Progress; "Not yet" and blanks last */
  const ord=v=>{const parts=v.split(': '),tail=parts.pop(),m=/^([A-Z][a-z]+) (\d{4})$/.exec(tail);
    const mo=m?'JanFebMarAprMayJunJulAugSepOctNovDec'.indexOf(m[1].slice(0,3))/3+1:0;
    return parts.join('')+'|'+(m?m[2]+String(mo).padStart(2,'0'):'~'+tail);};
  const vals=Object.keys(cnt).sort((a,b)=>ord(a).localeCompare(ord(b),undefined,{numeric:true}));
  hfOpen(ev,{title:label,values:vals.map(v=>[v,cnt[v]]),selected:EDCF[key]||[],apply:sel=>{EDCF[key]=sel;renderEdc();}});
}

async function renderEdc(){
  /* admin only, and typing the route must not get round that */
  if(ME.role!=='admin'){
    $('main').innerHTML=blank('EDC is admin only','Ask an admin about the grid paperwork.');return;}
  $('main').innerHTML=SKEL;
  const rows=await fetchLeads(q=>q.eq('stage_code',WON));
  const applicable=rows.filter(edcApplies);
  const small=applicable.filter(l=>edcFields(l)===EDC_SMALL);
  const large=applicable.filter(l=>edcFields(l)===EDC_LARGE);
  /* anything not off-grid that we still cannot place: either nobody has set
     the system type, or there is no inverter total to give a kWac */
  const pending=rows.filter(l=>!edcExempt(l)&&!edcFields(l));
  /* the worklist is what is left to do, so a deal leaves it the moment its
     last date is recorded. The full record stays under Submitted. */
  const smallOpen=small.filter(l=>edcDone(l)<EDC_SMALL.length);
  const largeOpen=large.filter(l=>edcDone(l)<EDC_LARGE.length);
  const outstanding=[...smallOpen,...largeOpen];
  /* anything with at least one date filled in, kept as a record to look back on */
  const started=[...small,...large].filter(l=>edcDone(l)>0)
    .sort((a,b)=>edcDone(b)/edcFields(b).length-edcDone(a)/edcFields(a).length);
  EDCSRC=EDCSCOPE==='work'?outstanding:EDCSCOPE==='sent'?started:EDCSCOPE==='miss'?pending:[];
  const fSmall=smallOpen.filter(l=>edcPass(l)),fLarge=largeOpen.filter(l=>edcPass(l));
  const fStarted=started.filter(l=>edcPass(l)),fPending=pending.filter(l=>edcPass(l));
  const nOn=Object.values(EDCF).filter(v=>v.length).length;
  const fNote=nOn&&EDCSCOPE!=='edit'?hfChips(Object.entries(EDCF).map(([k,v])=>[EDCLABEL[k]||k,v,`EDCF['${k}']=[];renderEdc()`]),
    'EDCF={};renderEdc()',`Showing ${EDCSCOPE==='work'?fSmall.length+fLarge.length:EDCSCOPE==='sent'?fStarted.length:fPending.length} of ${EDCSRC.length}`):'';
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">EDC / EAC Submissions</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">On-Grid and Hybrid won deals, split by inverter kWac. Dates save when you pick them.</p>
    <div class="stats">
      <div class="stat hero ${outstanding.length?'alert':''}"><div class="n">${outstanding.length}</div><div class="l">Pending</div></div>
      <div class="stat"><div class="n">${applicable.length}</div><div class="l">Closed-Won</div></div>
      <div class="stat"><div class="n">${small.length}</div><div class="l">≤ 10 kWac</div></div>
      <div class="stat"><div class="n">${large.length}</div><div class="l">&gt; 10 kWac</div></div>
    </div>
    <div class="toolbar">
      <div class="scope">
        <button class="${EDCSCOPE==='work'?'on':''}" onclick="setEdcScope('work')">Worklist</button>
        <button class="${EDCSCOPE==='sent'?'on':''}" onclick="setEdcScope('sent')">Submitted (${started.length})</button>
        <button class="${EDCSCOPE==='miss'?'on':''}" onclick="setEdcScope('miss')">Missing information (${pending.length})</button>
        <button class="${EDCSCOPE==='edit'?'on':''}" onclick="setEdcScope('edit')">Edit deals (${rows.length})</button>
      </div>
    </div>

    ${fNote}
    ${EDCSCOPE==='edit'?`<p style="color:var(--ink-soft);font-size:13px;margin:-6px 0 12px">Every won deal. BOQ, dates, EDC, customer and system - changes save as you make them.</p>`+drawEditDeals(rows):''}

    ${EDCSCOPE==='work'?(outstanding.length?`
      ${edcTable('Inverter ≤ 10 kWac',fSmall,EDC_SMALL)}
      ${edcTable('Inverter &gt; 10 kWac',fLarge,EDC_LARGE)}`
      :blank('Every date is in','Nothing is waiting on EDC. A deal returns here if a new one is won, and every date already recorded is under Submitted.')):''}

    ${EDCSCOPE==='sent'?(started.length?`<div class="tablewrap"><table><thead><tr>
        <th>Ref ID</th><th>Customer</th>${edcHead('Closed-Won','won')}${edcHead('System','sys')}${edcHead('EDC price','price')}${edcHead('Steps done','done')}<th>Progress</th>${edcHead('Waiting on','wait','The next step, or All done')}${edcHead('Sale engineer','sale')}
      </tr></thead><tbody>`+(fStarted.length?'':`<tr><td colspan="9">${blank('Nothing matches','Clear the filters.')}</td></tr>`)+fStarted.map(l=>{
        const fl=edcFields(l),d=edcDone(l);
        return `<tr class="rowlink" onclick="edcReview('${l.id}')">
          <td class="refid">${esc(l.ref_id||'—')}</td>
          <td><b>${esc(l.customer_name)}</b></td>
          <td class="nowrap">${fmtDate(l.stage_entered_at)}</td>
          <td>${esc(sysLine(l))}</td>
          <td class="nowrap">${l.edc_fee_usd==null?'<span class="quiet">—</span>':fmtMoney(l.edc_fee_usd)}</td>
          <td><b>${d} of ${fl.length}</b></td>
          <td><div class="edc-steps">${fl.map(([k,short])=>`<span class="${l[k]?'ok':''}" title="${short}${l[k]?': '+fmtDate(l[k]):''}">${short}</span>`).join('')}</div></td>
          <td class="nowrap">${(()=>{const w=edcWait(l);return w?`<b>${esc(w.step)}</b><span class="days">${w.days==null?'':w.days+' day'+(w.days===1?'':'s')}</span>`:'<span class="mark mark-done">All done</span>';})()}</td>
          <td>${esc(staffName(l.assigned_to))}</td></tr>`;}).join('')
      +`</tbody></table></div>`
      :blank('Nothing submitted yet','A deal appears here as soon as its first EDC date is recorded.')):''}

    ${EDCSCOPE==='miss'?(pending.length?`<h3 style="font-size:15px;margin:0 0 6px">Missing information (${pending.length})</h3>
      <p style="color:var(--ink-soft);font-size:13px;margin-bottom:10px">Not placed yet. The sale engineer needs to finish the spec.</p>
      <div class="tablewrap"><table><thead><tr><th>Ref ID</th><th>Customer</th>${edcHead('Closed-Won','won')}${edcHead('Missing','miss')}${edcHead('Sale engineer','sale')}</tr></thead><tbody>`
      +(fPending.length?'':`<tr><td colspan="5">${blank('Nothing matches','Clear the filters.')}</td></tr>`)+fPending.map(l=>`<tr class="rowlink" onclick="openLead('${l.id}')">
        <td class="refid">${esc(l.ref_id||'—')}</td><td><b>${esc(l.customer_name)}</b></td>
        <td class="nowrap">${fmtDate(l.stage_entered_at)}</td>
        <td>${!edcApplies(l)?'System type':'Inverter total'}</td>
        <td>${esc(staffName(l.assigned_to))}</td></tr>`).join('')
      +`</tbody></table></div>`
      :blank('Nothing missing','Every won deal has enough information to be placed.')):''}`;
  if(EDCSCOPE==='edit')drawDeals();
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
    <div class="sub">${esc(sysLine(l))} · Closed-Won ${fmtDate(l.stage_entered_at)} · ${esc(staffName(l.assigned_to))}</div>

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

function setEdcScope(v){EDCSCOPE=v;EDCF={};$('main').style.maxWidth='';renderEdc();}
function edcTable(title,rows,fields){
  if(!rows.length)return `<h3 style="font-size:15px;margin:0 0 6px">${title}</h3>
    <div class="empty" style="margin-bottom:22px"><b>${Object.values(EDCF).some(v=>v.length)?'Nothing matches the filters':'Nothing pending here'}</b><span>A deal in this size band shows up while it still has an EDC date to record.</span></div>`;
  rows=rows.slice().sort((a,b)=>edcWaitDays(b)-edcWaitDays(a));
  return `<h3 style="font-size:15px;margin:0 0 8px">${title}</h3>
    <div class="tablewrap" style="margin-bottom:22px"><table><thead><tr>
      <th>Ref ID</th>${edcHead('Customer','eng','Filter by site engineer')}${edcHead('Waiting on','wait','The next step and how long it has waited')}${edcHead('Branch','branch')}${edcHead('EDC price','price','What EDC charges for this submission')}${fields.map(([k,short,full])=>edcHead(short,'d:'+k,full)).join('')}${edcHead('Done','done')}
    </tr></thead><tbody>`+rows.map(l=>{
      const next=fields.find(([k])=>!l[k]);
      return `<tr>
      <td class="refid" style="cursor:pointer" onclick="openLead('${l.id}')" title="Open the lead">${esc(l.ref_id||'—')}</td>
      <td><b>${esc(l.customer_name)}</b><span class="days">${kwac(l)} kWac · ${esc(staffName(l.site_engineer_id))}</span></td>
      <td class="nowrap">${(()=>{const w=edcWait(l);return w?`<b>${esc(w.step)}</b><span class="days ${w.days>30?'overdue':''}">${w.days==null?'no start date':w.days+' day'+(w.days===1?'':'s')}</span>`:'<span class="mark mark-done">All done</span>';})()}</td>
      <td><select style="min-width:170px" onchange="setEdcBranch('${l.id}',this.value)">${optList(EDC_BRANCHES,l.edc_branch)}</select></td>
      <td>${numBox('edcfee-'+l.id,l.edc_fee_usd,{attrs:`style="min-width:110px" placeholder="\u2014" onchange="setEdcFee('${l.id}',this.value)"`})}</td>
      ${fields.map(([k])=>`<td class="${next&&next[0]===k?'edc-next':''}"><input type="date" style="min-width:130px" value="${l[k]||''}" onchange="setEdcDate('${l.id}','${k}',this.value)"></td>`).join('')}
      <td><b>${edcDone(l)}/${fields.length}</b></td>
    </tr>`;}).join('')+`</tbody></table></div>`;
}
/* what EDC charged for the submission. Admin types it; it saves on the spot
   like the branch and the dates, so nothing on this screen needs a Save. */
async function setEdcFee(id,v){
  const val=v===''?null:Number(v);
  if(val!==null&&(isNaN(val)||val<0)){toast('EDC price must be a number');return;}
  const {error}=await sb.from('leads').update({edc_fee_usd:val}).eq('id',id);
  if(error){toast('Could not save the price. '+why(error));console.error(error);return;}
  await logActivity(id,'edit',null,null,'EDC price: '+(val==null?'cleared':fmtMoney(val)));
  toast('EDC price saved');
}
/* which EDC office the file goes to, saved the moment it is picked, the same
   as the dates beside it */
async function setEdcBranch(id,v){
  const {error}=await sb.from('leads').update({edc_branch:v||null}).eq('id',id);
  if(error){toast('Could not save the branch. '+why(error));console.error(error);return;}
  await logActivity(id,'edit',null,null,'EDC branch: '+(v||'cleared'));
  toast('Saved');
}
async function setEdcDate(id,col,v){
  const {error}=await sb.from('leads').update({[col]:v||null}).eq('id',id);
  if(error){toast('Could not save that date. '+why(error));console.error(error);return;}
  await logActivity(id,'edit',null,null,'EDC '+col.replace(/^edc_/,'').replace(/_/g,' ')+': '+(v||'cleared'));
  /* with a filter on, the row may no longer match - redraw so the list and
     "Showing X of Y" stay true, and say why a row left */
  if(Object.values(EDCF).some(x=>x.length)){
    await renderEdc();
    const still=EDCSRC.find(l=>l.id===id);
    toast(!still?'Saved · every step is in, so it moved to Submitted'
      :edcPass(still)?'Saved':'Saved · it no longer matches the filter, so it left the list');
  } else toast('Saved');
}
