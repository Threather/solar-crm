/* ---------------- TARGETS (admin) ----------------
   A target belongs to a month, so last month's is not overwritten when this
   month's is set — every report that compares against a target has to be able
   to look backwards and find the number that applied at the time.

   Two kinds of row: a company-wide lead count and marketing spend, and one
   sales target per salesperson. Both live in the same table, told apart by
   whether profile_id is filled in. */
let TGMONTH='';

async function renderTargets(){
  if(ME.role!=='admin'){
    $('main').innerHTML=blank('Targets are admin only','Ask an admin to set them.');return;}
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
          <input id="tg-leads" type="number" step="1" value="${num(tg.company.leads)}" placeholder="700"></div>
        <div><label>Marketing spend (USD)</label>
          <input id="tg-spend" type="number" step="0.01" value="${num(tg.company.spend)}" placeholder="200"></div>
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
        <td><input id="tg-p-${p.id}" type="number" step="0.01" value="${num(tg.person[p.id]?.collection)}" placeholder="0"></td>
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
  STAFF.filter(s=>['sales','manager'].includes(s.role)&&s.is_active)
    .forEach(p=>push('collection',p.id,'tg-p-'+p.id));
  if(!rows.length){toast('Nothing to save');return;}
  /* one row per month, person and metric, so saving again corrects rather
     than stacking a second target on the same month */
  const {error}=await sb.from('targets').upsert(rows,{onConflict:'month,profile_id,metric'});
  if(error){toast('Could not save. '+why(error));console.error(error);return;}
  toast('Targets saved for '+monthName(TGMONTH.slice(0,7)));
  renderTargets();
}
