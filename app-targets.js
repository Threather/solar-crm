/* ---------------- TARGETS (admin) ----------------
   A target belongs to a month, so last month's is not overwritten when this
   month's is set — every report that compares against a target has to be able
   to look backwards and find the number that applied at the time.

   Two kinds of row: company-wide ones - the lead count, marketing spend and
   the four operations turnaround targets - and one sales target per
   salesperson. Both live in the same table, told apart by whether profile_id
   is filled in.

   EVERY TARGET IN THIS APP BELONGS HERE. The sales and marketing manager sets
   them each month, and she has had write access since 10 Sep 2026. A new
   measure that needs something to be judged against gets a row on this screen,
   never a constant in code. */
let TGMONTH='';

async function renderTargets(){
  if(!['admin','manager'].includes(ME.role)){
    $('main').innerHTML=blank('Targets are not open to your role','Ask an admin or the sales manager to set them.');return;}
  $('main').innerHTML=SKEL;
  if(!TGMONTH)TGMONTH=monthStart();
  const tg=await loadTargets(TGMONTH);
  const people=STAFF.filter(s=>['sales','manager'].includes(s.role)&&s.is_active);
  const num=v=>v==null?'':v;

  /* twelve months back and three forward, so next quarter can be set early */
  const opts=[];
  const now=new Date();
  for(let i=-12;i<=3;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1);
    const iso=localDay(d);
    opts.push(`<option value="${iso}" ${iso===TGMONTH?'selected':''}>${esc(monthName(iso.slice(0,7)))}</option>`);
  }

  const teamTotal=people.reduce((a,p)=>a+Number(tg.person[p.id]?.collection||0),0);

  $('main').innerHTML=`
    <h2 style="margin-bottom:4px">Targets</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Set per month. Reports compare against the target for the month they are showing, so changing this month leaves last month alone.</p>
    <div class="toolbar">
      <select onchange="setTgMonth(this.value)">${opts.join('')}</select>
      <span class="spacer"></span>
    </div>

    <div class="homegrid">
      ${repPanel('Company',`<div class="grid2">
        <div><label>Lead target, raw leads</label>
          ${numBox('tg-leads',num(tg.company.leads),{attrs:'placeholder="700"'},true)}</div>
        <div><label>Marketing budget (USD)</label>
          ${numBox('tg-spend',num(tg.company.spend),{attrs:'placeholder="200"'})}</div>
        <div><label>Marketing spent (USD)</label>
          ${numBox('tg-spent',num(tg.company.spend_actual),{attrs:'placeholder="0"'})}</div>
      </div>
      <div class="modal-actions"><button class="btn-sun" onclick="saveTargets()">Save targets</button></div>`,true)}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">Operations turnaround, in days</h3>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:10px">The operations dashboard measures each step against these.</p>
    <div class="homegrid">
      ${repPanel('Target turnaround',`<div class="grid2">
        <div><label>BOQ to installation</label>
          ${numBox('tg-sla-boq',num(tg.company.sla_boq),{attrs:'placeholder="3"'})}</div>
        <div><label>Installation duration</label>
          ${numBox('tg-sla-install',num(tg.company.sla_install),{attrs:'placeholder="4"'})}</div>
        <div><label>Installation to EDC submission</label>
          ${numBox('tg-sla-edcinform',num(tg.company.sla_edcinform),{attrs:'placeholder="2"'})}</div>
        <div><label>EDC submission to inspection</label>
          ${numBox('tg-sla-edcinspect',num(tg.company.sla_edcinspect),{attrs:'placeholder="5"'})}</div>
      </div>
      <div class="modal-actions"><button class="btn-sun" onclick="saveTargets()">Save targets</button></div>`,true)}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">Sales targets</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Sale engineer</th><th>Role</th><th style="width:200px">Monthly collection target (USD)</th>
    </tr></thead><tbody>`+people.map(p=>`
      <tr>
        <td><b>${esc(p.full_name)}</b><span class="days">${esc(p.staff_id||'')}</span></td>
        <td>${esc(p.role)}</td>
        <td>${numBox('tg-p-'+p.id,num(tg.person[p.id]?.collection),{attrs:'placeholder="0"'})}</td>
      </tr>`).join('')+`</tbody>
      <tfoot><tr><td><b>Team total</b></td><td></td>
        <td><b>${fmtMoney(teamTotal)}</b></td></tr></tfoot>
    </table></div>
    <div class="modal-actions"><button class="btn-sun" onclick="saveTargets()">Save targets</button></div>`;
}
function setTgMonth(m){TGMONTH=m;renderTargets();}

async function saveTargets(){
  const rows=[];
  const push=(metric,profile_id,el)=>{
    const v=$(el)?$(el).value.trim():'';
    if(v==='')return;
    rows.push({month:TGMONTH,profile_id,metric,value:Number(v),
      updated_by:ME.id,updated_at:new Date().toISOString()});
  };
  push('leads',null,'tg-leads');
  push('spend',null,'tg-spend');
  /* what was actually spent that month, beside the budget it is judged
     against. Cost per lead is this over the leads that came in. */
  push('spend_actual',null,'tg-spent');
  /* the operations turnaround targets, in days. Company rows like the two
     above - a step is the company's, not a person's. */
  push('sla_boq',null,'tg-sla-boq');
  push('sla_install',null,'tg-sla-install');
  push('sla_edcinform',null,'tg-sla-edcinform');
  push('sla_edcinspect',null,'tg-sla-edcinspect');
  STAFF.filter(s=>['sales','manager'].includes(s.role)&&s.is_active)
    .forEach(p=>push('collection',p.id,'tg-p-'+p.id));
  if(!rows.length){toast('Nothing to save');return;}
  /* One row per month, person and metric, so saving again corrects rather than
     stacking a second target on the same month.

     THE COMPANY ROWS CANNOT USE THE UPSERT. Their profile_id is null, and a
     unique index never matches null against null, so onConflict found nothing
     to replace and inserted a second row on every save - the lead target had
     quietly doubled up by the time this was noticed, and whichever row came
     back last was the one the reports read. They are cleared for the month and
     written fresh instead. The per-person rows carry a real profile_id, so the
     upsert works for them.
     A partial unique index on (month, metric) where profile_id is null would
     let both use it, but that is SQL and this does not need any. */
  const company=rows.filter(r=>r.profile_id==null);
  const person=rows.filter(r=>r.profile_id!=null);
  if(company.length){
    const {error}=await sb.from('targets').delete()
      .eq('month',TGMONTH).is('profile_id',null).in('metric',company.map(r=>r.metric));
    if(error){toast('Could not save. '+why(error));console.error(error);return;}
    const ins=await sb.from('targets').insert(company);
    if(ins.error){toast('Could not save. '+why(ins.error));console.error(ins.error);return;}
  }
  const {error}=person.length
    ?await sb.from('targets').upsert(person,{onConflict:'month,profile_id,metric'})
    :{error:null};
  if(error){toast('Could not save. '+why(error));console.error(error);return;}
  toast('Targets saved for '+monthName(TGMONTH.slice(0,7)));
  renderTargets();
}
