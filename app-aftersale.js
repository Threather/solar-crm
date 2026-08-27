/* ---------------- AFTER-SALE ----------------
   What happens after the system is on the roof and the money is in. A customer
   phones a year later with a fault; this is where that case lives.

   One row per case, not fields on the lead — the same customer can raise a
   problem in year one and another in year three, and each has its own dates,
   its own cause and its own solution. Their earlier cases are shown beside a
   new one, so whoever takes the call can see this is the third time that
   inverter has failed. */
const AS_CAUSES=['Installation issue','Sale error','Customer issue','Product issue',
                 'Internal issue','Technical issue','Learn more'];
const AS_STATUS=['Pending','Solved'];
let ASROWS=[], ASFOUND=[], ASPICK=null, ASFILTER={q:'',status:'',cause:''};

async function renderAfterSale(){
  if(!['admin','manager','sales','site_engineer'].includes(ME.role)){
    $('main').innerHTML=blank('After-sale is not open to your role','Ask an admin if you need a case raised.');return;}
  $('main').innerHTML=SKEL;
  /* leads and after_sales have one foreign key between them, but naming it
     keeps this safe if a second one is ever added */
  const {data,error}=await sb.from('after_sales')
    .select('*, leads!after_sales_lead_id_fkey(ref_id,customer_name,phone,site_address,commune,district,province,city_province,assigned_to,site_engineer_id,system_type,panel_kwp,inverter_kw,inverter_pcs,stage_entered_at)')
    .order('issue_date',{ascending:false});
  if(error){$('main').innerHTML=blank('Could not load after-sale cases',why(error));console.error(error);return;}
  ASROWS=data||[];
  paintAfterSale();
}
function asFiltered(){
  let rows=ASROWS;
  if(ASFILTER.status)rows=rows.filter(r=>(r.status||'Pending')===ASFILTER.status);
  if(ASFILTER.cause)rows=rows.filter(r=>r.cause===ASFILTER.cause);
  if(ASFILTER.q){const q=ASFILTER.q.toLowerCase();
    rows=rows.filter(r=>(r.leads?.customer_name||'').toLowerCase().includes(q)
      ||(r.leads?.ref_id||'').toLowerCase().includes(q)
      ||(r.leads?.phone||'').includes(q));}
  return rows;
}
function paintAfterSale(){
  const open=ASROWS.filter(r=>(r.status||'Pending')!=='Solved');
  const overThird=ASROWS.filter(r=>r.level3_date);
  $('main').innerHTML=`
    <h2 style="margin-bottom:4px">After-sale report</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">A problem raised by a customer after handover, and how far it got. Find the customer by reference ID, name or phone number.</p>

    <div class="stats">
      <div class="stat hero ${open.length?'alert':''}"><div class="n">${open.length}</div><div class="l">Still pending</div></div>
      <div class="stat"><div class="n">${ASROWS.length}</div><div class="l">Cases raised</div></div>
      <div class="stat"><div class="n">${ASROWS.length-open.length}</div><div class="l">Solved</div></div>
      <div class="stat"><div class="n">${overThird.length}</div><div class="l">Reached third level</div></div>
    </div>

    <div class="section sec-eng" style="margin-bottom:18px">
      <h4>Raise a case for a customer</h4>
      <div class="grid2">
        <div style="grid-column:1/-1"><label>Reference ID, name or phone number</label>
          <input id="as-find" placeholder="202608-00009, June or 0889898890" onkeydown="if(event.key==='Enter'){event.preventDefault();asFind();}"></div>
      </div>
      <div class="modal-actions"><button class="btn-line" onclick="asFind()">Find customer</button></div>
      <div id="as-found"></div>
    </div>

    <div class="toolbar">
      <input placeholder="Search a case by customer, ref or phone…" value="${esc(ASFILTER.q||'')}" oninput="ASFILTER.q=this.value;asDraw()">
      <select onchange="ASFILTER.status=this.value;asDraw()">
        <option value="">Any status</option>
        ${AS_STATUS.map(v=>`<option value="${esc(v)}" ${ASFILTER.status===v?'selected':''}>${esc(v)}</option>`).join('')}
      </select>
      <select onchange="ASFILTER.cause=this.value;asDraw()">
        <option value="">Any cause</option>
        ${AS_CAUSES.map(v=>`<option value="${esc(v)}" ${ASFILTER.cause===v?'selected':''}>${esc(v)}</option>`).join('')}
      </select>
      <button class="btn-line" onclick="ASFILTER={q:'',status:'',cause:''};paintAfterSale()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="exportAfterSale()">Export CSV</button>
    </div>
    <div class="tablewrap" id="as-wrap"></div>`;
  asDraw();
}
function asDraw(){
  const rows=asFiltered();
  if(!rows.length){$('as-wrap').innerHTML=(ASFILTER.q||ASFILTER.status||ASFILTER.cause)
    ?blank('No matches','No case fits the current search and filters.')
    :blank('No cases yet','Find a customer above to raise the first one.');return;}
  /* how far it got, read off the dates rather than stored twice */
  const lvl=r=>r.level3_date?'3rd':r.level2_date?'2nd':r.level1_date?'1st':'—';
  $('as-wrap').innerHTML=`<table class="table-compact"><thead><tr>
    <th style="width:104px">Ref ID</th><th>Customer</th><th style="width:110px">Issue date</th>
    <th style="width:80px">Level</th><th style="width:104px">Status</th>
    <th style="width:140px">Caused by</th><th style="width:130px">PIC</th>
    <th style="width:130px">Solved by</th><th>Problem</th>
  </tr></thead><tbody>`+rows.map(r=>`
    <tr class="rowlink" onclick="asOpen('${r.id}')">
      <td class="refid">${esc(r.leads?.ref_id||'—')}</td>
      <td><b>${esc(r.leads?.customer_name||'—')}</b><span class="days">${esc(r.leads?.phone||'')}</span></td>
      <td class="nowrap">${fmtDate(r.issue_date)}</td>
      <td>${esc(lvl(r))}</td>
      <td>${(r.status||'Pending')==='Solved'
        ?'<span class="mark mark-done">Solved</span>'
        :'<span class="mark mark-open">Pending</span>'}</td>
      <td>${esc(r.cause||'—')}</td>
      <td>${esc(r.pic_id?staffName(r.pic_id):'—')}</td>
      <td>${esc(r.solved_by||'—')}</td>
      <td class="rem">${esc(r.problem_detail||'')}${r.status_remark?`<span class="days">${esc(r.status_remark)}</span>`:''}</td>
    </tr>`).join('')+`</tbody></table>`;
}
/* the same lookup the repeat-customer flow uses: nobody remembers a reference
   from a year ago, but the customer knows their own number */
async function asFind(){
  const q=($('as-find').value||'').trim();
  const box=$('as-found');
  if(!q){box.innerHTML='';toast('Type a reference ID, name or phone number');return;}
  const like='%'+q.replace(/[%,]/g,'')+'%';
  const {data,error}=await sb.from('leads').select('*')
    .eq('is_deleted',false)
    .or('ref_id.ilike.'+like+',customer_name.ilike.'+like+',phone.ilike.'+like)
    .order('created_at',{ascending:false}).limit(6);
  if(error){box.innerHTML='';toast('Could not search. '+why(error));console.error(error);return;}
  if(!(data||[]).length){
    box.innerHTML=blank('Nobody found','Check the reference ID, name or phone number. You only see customers on leads you are allowed to open.');
    return;}
  ASFOUND=data;
  box.innerHTML=data.map((l,i)=>`<div class="qcard">
      <b>${esc(l.customer_name||'No name')}</b> · ${esc(l.ref_id||'no ref')} · ${esc(l.phone||'no phone')}
      <span class="days">${esc(stageName(l.stage_code))}${l.stage_code===WON?' · Closed-Won '+fmtDate(l.stage_entered_at):''} · ${esc(sysLine(l)||'no system recorded')}</span>
      <div class="acts"><button class="btn-mini" onclick="asNew(${i})">Raise a case</button></div>
    </div>`).join('');
}
function asNew(i){
  const l=ASFOUND[i];
  if(!l)return;
  asCard(null,l);
}
async function asOpen(id){
  const r=ASROWS.find(x=>x.id===id);
  if(!r)return;
  const {data:l}=await sb.from('leads').select('*').eq('id',r.lead_id).maybeSingle();
  asCard(r,l||r.leads||{id:r.lead_id});
}
/* one case, with the customer above it and their earlier cases beside it */
function asCard(r,l){
  ASPICK={caseId:r?r.id:null,leadId:l.id};
  const past=ASROWS.filter(x=>x.lead_id===l.id&&(!r||x.id!==r.id));
  const g=k=>r?(r[k]??''):'';
  const staffOpts=STAFF.filter(s=>s.is_active)
    .map(s=>`<option value="${s.id}" ${g('pic_id')===s.id?'selected':''}>${esc(s.full_name)}</option>`).join('');
  const site=[l.site_address,l.commune,l.district,l.province||l.city_province].filter(Boolean).join(', ');
  $('lead-modal').innerHTML=`
    <h2>${esc(l.customer_name||'')} <span class="refid">${esc(l.ref_id||'')}</span></h2>
    <div class="sub">${esc(l.phone||'no phone')} · ${esc(sysLine(l)||'no system recorded')}${l.stage_entered_at?' · Closed-Won '+fmtDate(l.stage_entered_at):''}</div>

    ${past.length?`<div class="hint" style="border-left-color:var(--own-eng);color:var(--own-eng)">
      <b>${past.length} earlier case${past.length>1?'s':''} for this customer.</b>
      ${past.map(p=>esc(fmtDate(p.issue_date)+' · '+(p.cause||'no cause recorded')+' · '+(p.status||'Pending'))).join(' · ')}
    </div>`:''}

    <div class="section sec-cust"><h4>Customer</h4>
      <div class="grid2">
        <div><label>Name</label><input value="${esc(l.customer_name||'')}" disabled></div>
        <div><label>Phone</label><input value="${esc(l.phone||'')}" disabled></div>
        <div><label>Sale engineer</label><input value="${esc(staffName(l.assigned_to))}" disabled></div>
        <div><label>Site engineer</label><input value="${esc(l.site_engineer_id?staffName(l.site_engineer_id):'none')}" disabled></div>
        <div style="grid-column:1/-1"><label>Site</label><input value="${esc(site||'—')}" disabled></div>
      </div>
    </div>

    <div class="section sec-install"><h4>The problem</h4>
      <div class="grid2">
        <div><label>Issue date</label><input id="as-issue" type="date" value="${esc(g('issue_date'))}"></div>
        <div><label>Problem status</label><select id="as-status">${optList(AS_STATUS,g('status')||'Pending',false)}</select></div>
        <div><label>Caused by</label><select id="as-cause">${optList(AS_CAUSES,g('cause'))}</select></div>
        <div><label>Occurred from</label><input id="as-from" value="${esc(g('cause_from'))}" placeholder="What it came from"></div>
        <div style="grid-column:1/-1"><label>Details of the problem</label><textarea id="as-detail" rows="3" placeholder="What the customer reported">${esc(g('problem_detail'))}</textarea></div>
        <div style="grid-column:1/-1"><label>Why it is still pending</label><input id="as-remark" value="${esc(g('status_remark'))}" placeholder="Only if it is not solved yet"></div>
      </div>
    </div>

    <div class="section sec-eng"><h4>Solving it</h4>
      <div class="grid3">
        <div><label>First level solved</label><input id="as-l1" type="date" value="${esc(g('level1_date'))}"></div>
        <div><label>Second level solved</label><input id="as-l2" type="date" value="${esc(g('level2_date'))}" title="The visit to the customer's house"></div>
        <div><label>Third level solved</label><input id="as-l3" type="date" value="${esc(g('level3_date'))}"></div>
        <div><label>Solved by</label><input id="as-by" value="${esc(g('solved_by'))}" placeholder="Site engineer or installer name"></div>
        <div><label>PIC</label><select id="as-pic"><option value="">—</option>${staffOpts}</select></div>
        <div style="grid-column:1/-1"><label>Solution</label><textarea id="as-solution" rows="3" placeholder="What was actually done">${esc(g('solution'))}</textarea></div>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn-sun" onclick="asSave()">${r?'Save case':'Create case'}</button>
      <button class="btn-line" onclick="closeLead()">Close</button>
    </div>`;
  $('lead-overlay').classList.add('open');
}
async function asSave(){
  if(!ASPICK)return;
  const v=id=>{const e=$(id);return e?e.value.trim():'';};
  const row={
    lead_id:ASPICK.leadId,
    issue_date:v('as-issue')||null,
    level1_date:v('as-l1')||null,
    level2_date:v('as-l2')||null,
    level3_date:v('as-l3')||null,
    solved_by:v('as-by')||null,
    pic_id:v('as-pic')||null,
    status:v('as-status')||'Pending',
    status_remark:v('as-remark')||null,
    cause:v('as-cause')||null,
    cause_from:v('as-from')||null,
    problem_detail:v('as-detail')||null,
    solution:v('as-solution')||null,
    updated_by:ME.id,updated_at:new Date().toISOString()};
  /* a case with neither a date nor a description is an empty row nobody can
     act on, and it would sit in the pending count for ever */
  if(!row.issue_date&&!row.problem_detail){toast('Set the issue date, or describe the problem');return;}
  /* solved means solved: without a dated level the record says it was fixed
     and cannot say when, which is what breaks a turnaround figure later */
  if(row.status==='Solved'&&!row.level1_date&&!row.level2_date&&!row.level3_date){
    toast('Date the level it was solved at before marking it Solved');return;}
  const q=ASPICK.caseId
    ? sb.from('after_sales').update(row).eq('id',ASPICK.caseId)
    : sb.from('after_sales').insert(row);
  const {error}=await q;
  if(error){toast('Could not save the case. '+why(error));console.error(error);return;}
  toast(ASPICK.caseId?'Case saved':'Case created');
  closeLead();renderAfterSale();
}
function exportAfterSale(){
  const rows=asFiltered();
  if(!rows.length){toast('Nothing to export');return;}
  downloadCSV('after-sale',['Ref ID','Customer','Phone','Issue date','Status','Why pending',
    'Caused by','Occurred from','Problem','Solution',
    'First level','Second level','Third level','Solved by','PIC','Raised'],
    rows.map(r=>[r.leads?.ref_id,r.leads?.customer_name,r.leads?.phone,r.issue_date,
      r.status||'Pending',r.status_remark,r.cause,r.cause_from,r.problem_detail,r.solution,
      r.level1_date,r.level2_date,r.level3_date,r.solved_by,
      r.pic_id?staffName(r.pic_id):'',localDay(r.created_at)]));
}
