/* ---------------- CSV EXPORT ----------------
   Everyone exports, but only what RLS already lets them read, so a sales
   export contains that salesperson's leads and nothing else. */
function csvCell(v){
  let s=v==null?'':String(v);
  /* Excel executes a cell starting with these, so defuse it */
  if(/^[=+\-@\t\r]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function downloadCSV(name,headers,rows){
  if(!rows.length){toast('Nothing to export');return;}
  const csv=[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
  /* the BOM is what stops Excel mangling Khmer text and accented names */
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');
  a.href=url; a.download=`${name}-${localDay(new Date())}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast(`Exported ${rows.length} row${rows.length>1?'s':''}`);
}
const stageName=c=>(STAGES.find(s=>s.stage_code===c)||{}).stage_name||c||'';

function exportLeads(){
  /* the sale value only appears for roles the database serves it to, so an
     export can never leak what the screen hides */
  const money=canSeeMoney();
  const rows=filteredLeads().map(l=>[
    l.ref_id,l.customer_name,l.phone,l.customer_type,stageName(l.stage_code),
    l.lead_channel,l.lead_sub_channel,l.event_name,l.event_date,
    l.site_address,l.commune,l.district,l.province||l.city_province,l.site_type,
    l.monthly_bill_usd,staffName(l.assigned_to),
    l.next_follow_up,qualText(l),
    ...(money?[l.final_sale_usd]:[]),
    l.roof_type,l.system_type,l.phase_type,l.panel_brand,l.panel_watt,l.panel_pcs,l.panel_kwp,
    l.inverter_brand,l.inverter_kw,l.inverter_pcs,l.inverter_kw_total,
    l.battery_brand,l.battery_kwh,l.site_link,
    staffName(l.site_engineer_id),l.installation_team,
    l.delivery_date,l.installation_start,l.installation_end,
    l.inverter_kw_total,l.edc_doc_date,l.edc_inspection_date,
    l.edc_portal_date,l.edc_approval_date,l.edc_meter_date,
    l.edc_provincial_date,l.edc_pp_date,
    staffName(l.created_by),localDay(l.created_at),
    remarkDate(l.last_remark),l.last_remark?.note]);
  downloadCSV(LEADSCOPE==='won'?'won-deals':LEADSCOPE==='lost'?'lost-leads':'leads',
    ['Ref ID','Customer','Phone','Customer type','Stage',
    'Channel','Sub-channel','Event name','Event date',
    'Address','Commune','District','Province','Type of site',
    'Monthly bill (USD)','Sale engineer',
    'Next follow-up','Qualification',
    ...(money?['Final sale (USD)']:[]),
    'Roof type','System type','Ampere & phase','Panel brand','Panel watt','Panel pcs','Panel kWp',
    'Inverter brand','Inverter kW each','Inverter pcs','Inverter total kW',
    'Battery brand','Battery kWh','Location link',
    'Site engineer','Installation team',
    'Delivery date','Installation start','Installation end',
    'kWac','EDC doc submission','EDC inspection',
    'EDC portal submission','EDC approval letter','EDC smart meter & grid',
    'EDC provincial inspection','EDC Phnom Penh inspection',
    'Created by','Created','Latest remark date','Latest remark'],rows);
}
function exportQuots(){
  downloadCSV('quotations',['Ref ID','Customer','System type','Ampere & phase',
    'Roof type','Panel brand','Panel watt','Panel pcs','Panel kWp',
    'Inverter brand','Inverter kW each','Inverter pcs','Inverter total kW',
    'Battery brand','Battery kWh','Price (USD)','Released','By'],
    filteredQuots().map(q=>[q.leads?.ref_id,q.leads?.customer_name,q.system_type,q.ampere_phase,
      q.roof_type,q.panel_brand,q.panel_watt,q.panel_pcs,q.panel_kwp,
      q.inverter_brand,q.inverter_kw,q.inverter_pcs,q.inverter_kw_total,
      q.battery_brand,q.battery_kwh,
      q.price_usd,q.released_date?localDay(q.released_date):'',staffName(q.provided_by)]));
}
function exportComms(){
  downloadCSV('commissions',['Ref ID','Customer','Beneficiary','Type','Deal value (USD)',
    'Amount (USD)','Paid','Paid on'],
    (COMMS||[]).map(c=>[c.leads?.ref_id,c.leads?.customer_name,
      c.beneficiary_type==='referrer'?(c.referrer_name||'External referrer'):staffName(c.profile_id),
      c.beneficiary_type,c.leads?.lead_financials?.final_sale_usd,c.amount_usd,
      c.is_paid?'yes':'no',c.paid_at?localDay(c.paid_at):'']));
}

/* ---------------- REPORTS ----------------
   Categorical hues are the validated slots 1-4, assigned to a fixed channel
   (never by rank), so filtering never repaints a series. Legacy leads with no
   channel fold into a gray "Other" rather than earning a 5th hue.
   Aqua and gold sit under 3:1 on this surface, so the relief rule applies:
   segment values are labelled and the full table sits under the chart. */
const CH_ORDER=['Digital_Marketing','Third_Party','Direct_Sales','Offline_Marketing','Other'];
const CH_COLOR={Digital_Marketing:'#2a78d6',Third_Party:'#eb6834',Direct_Sales:'#1baf7a',
                Offline_Marketing:'#eda100',Other:'#898781'};
const chOf=l=>CH_ORDER.includes(l.lead_channel)?l.lead_channel:'Other';

async function renderReports(){
  $('main').innerHTML=SKEL;
  LEADS=await fetchLeads(q=>ME.role==='manager'||ME.role==='admin'?q:q.eq('created_by',ME.id));
  const won=LEADS.filter(l=>l.stage_code===WON);
  const lost=LEADS.filter(l=>l.stage_code===LOST);
  const open=LEADS.filter(l=>!STAGES.find(s=>s.stage_code===l.stage_code)?.is_terminal);
  const decided=won.length+lost.length;
  const winRate=decided?Math.round(won.length/decided*100):null;
  /* marketing reaches this tab but cannot read sale values, so the money tile
     is left out for them rather than shown as zero */
  let wonValue=null;
  if(canSeeMoney()&&won.length){
    const {data:fins}=await sb.from('lead_financials')
      .select('final_sale_usd').in('lead_id',won.map(l=>l.id));
    wonValue=(fins||[]).reduce((a,f)=>a+Number(f.final_sale_usd||0),0);
  }

  const months=[...new Set(LEADS.map(l=>localDay(l.created_at).slice(0,7)))].filter(Boolean).sort().slice(-12);
  const counts={};
  months.forEach(m=>{counts[m]={};CH_ORDER.forEach(c=>counts[m][c]=0);});
  LEADS.forEach(l=>{const m=localDay(l.created_at).slice(0,7);if(counts[m])counts[m][chOf(l)]++;});
  const used=CH_ORDER.filter(c=>months.some(m=>counts[m][c]>0));

  $('main').innerHTML=`
    <h2 style="margin-bottom:14px">Reports</h2>
    <div class="stats">
      <div class="stat hero"><div class="n">${winRate===null?'—':winRate+'%'}</div><div class="l">Win rate</div></div>
      <div class="stat"><div class="n">${LEADS.length}</div><div class="l">Total leads</div></div>
      <div class="stat"><div class="n">${open.length}</div><div class="l">In pipeline</div></div>
      <div class="stat"><div class="n">${won.length}</div><div class="l">Closed-Won</div></div>
      ${wonValue===null?'':`<div class="stat"><div class="n">${fmtMoney(wonValue)}</div><div class="l">Won value</div></div>`}
    </div>
    ${months.length?barChart(months,counts,used):blank('Nothing to chart yet','The breakdown by channel appears once leads have been created.')}
    ${stageTable()}`;
}

/* Stacked column chart, hand-rolled SVG: no chart library, no build step. */
function barChart(months,counts,used){
  const W=760,PL=42,PR=12,PT=12,PH=210,AX=34,H=PT+PH+AX;
  const plotW=W-PL-PR;
  const max=Math.max(1,...months.map(m=>used.reduce((a,c)=>a+counts[m][c],0)));
  const step=Math.max(1,Math.ceil(max/4));
  const top=step*4;
  const y=v=>PT+PH-(v/top)*PH;
  const band=plotW/months.length;
  const bw=Math.min(46,band*0.58);
  const GAP=2, R=4;
  const topPath=(x,yy,w,h,r)=>`M${x},${yy+h}V${yy+r}a${r},${r} 0 0 1 ${r},-${r}h${w-2*r}a${r},${r} 0 0 1 ${r},${r}V${yy+h}Z`;

  let grid='',bars='',xlab='';
  for(let i=0;i<=4;i++){
    const v=step*i, yy=y(v);
    grid+=`<line x1="${PL}" y1="${yy}" x2="${W-PR}" y2="${yy}" stroke="var(--line)" stroke-width="1"/>`
        + `<text class="tick" x="${PL-8}" y="${yy+3}" text-anchor="end">${v}</text>`;
  }
  months.forEach((m,mi)=>{
    const cx=PL+band*mi+band/2, x=cx-bw/2;
    let acc=0;
    const stack=used.filter(c=>counts[m][c]>0);
    stack.forEach((c,si)=>{
      const v=counts[m][c];
      const y0=y(acc), y1=y(acc+v);
      let h=y0-y1; const isTop=si===stack.length-1;
      if(si>0){h-=GAP;}
      const yy=y1;
      bars+= (isTop&&h>R*2 ? `<path d="${topPath(x,yy,bw,h,R)}" fill="${CH_COLOR[c]}">`
                           : `<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(1,h)}" fill="${CH_COLOR[c]}">`)
           + `<title>${esc(monthName(m))} · ${esc(c.replace(/_/g,' '))}: ${v}</title>`
           + (isTop&&h>R*2?'</path>':'</rect>');
      if(h>=14&&bw>=22) bars+=`<text class="seglabel" x="${cx}" y="${yy+h/2+3}" text-anchor="middle">${v}</text>`;
      acc+=v;
    });
    xlab+=`<text class="tick" x="${cx}" y="${PT+PH+18}" text-anchor="middle">${esc(monthName(m))}</text>`;
  });

  const legend=used.map(c=>`<span><i style="background:${CH_COLOR[c]}"></i>${esc(c.replace(/_/g,' '))}</span>`).join('');
  const rows=months.map(m=>`<tr><td>${esc(monthName(m))}</td>${used.map(c=>`<td>${counts[m][c]||0}</td>`).join('')}
      <td><b>${used.reduce((a,c)=>a+counts[m][c],0)}</b></td></tr>`).join('');

  return `
  <div class="chartcard">
    <h3>Leads per month by channel</h3>
    <div class="cap">Leads grouped by the month they were created and the channel they came from.</div>
    <div class="legend">${legend}</div>
    <svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Leads per month by channel">
      ${grid}${bars}${xlab}
      <line x1="${PL}" y1="${PT+PH}" x2="${W-PR}" y2="${PT+PH}" stroke="var(--line)" stroke-width="1"/>
    </svg>
  </div>
  <div class="tablewrap" style="margin-bottom:18px"><table style="min-width:520px"><thead><tr>
    <th>Month</th>${used.map(c=>`<th>${esc(c.replace(/_/g,' '))}</th>`).join('')}<th>Total</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function stageTable(){
  const n=LEADS.length||1;
  const rows=STAGES.map(s=>{
    const c=LEADS.filter(l=>l.stage_code===s.stage_code).length;
    return `<tr><td>${stagePill(s.stage_code)}</td><td>${c}</td><td>${Math.round(c/n*100)}%</td></tr>`;
  }).join('');
  return `<h3 style="font-size:15px;margin-bottom:8px">Pipeline by stage</h3>
    <div class="tablewrap"><table style="min-width:380px"><thead><tr>
      <th>Stage</th><th>Leads</th><th>Share</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------------- QUOTATIONS TAB ---------------- */
async function renderQuots(){
  $('main').innerHTML=SKEL;
  const {data:quots,error}=await sb.from('quotations').select('*, leads(ref_id, customer_name)').order('created_at',{ascending:false});
  if(error){$('main').innerHTML=blank('Could not load quotations','Check your connection and refresh. If it keeps happening, tell your admin.');return;}
  QUOTS=quots||[];
  /* only offer months that actually have quotations, newest first */
  const monthOpts=[...new Set(QUOTS.map(q=>localDay(q.released_date||q.created_at).slice(0,7)))].filter(Boolean)
    .sort().reverse().map(m=>`<option value="${m}" ${m===QFILTER.month?'selected':''}>${monthName(m)}</option>`).join('');
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Quotation log</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Every quotation released, newest first. Add quotations from inside a lead.</p>
    <div class="toolbar">
      <input placeholder="Search customer or ref ID…" value="${esc(QFILTER.q||'')}" oninput="QFILTER.q=this.value;drawQuots()">
      <select title="Released in month" onchange="QFILTER.month=this.value;QFILTER.date='';drawQuots()">
        <option value="">All months</option>${monthOpts}</select>
      <input type="date" title="Released on this exact date" value="${esc(QFILTER.date||'')}" onchange="QFILTER.date=this.value;QFILTER.month='';drawQuots()">
      <button class="btn-line" onclick="QFILTER={q:'',month:'',date:''};renderQuots()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="exportQuots()" title="Exports the rows currently shown">Export CSV</button>
    </div>
    <div class="tablewrap" id="quotwrap"></div>`;
  drawQuots();
}
function filteredQuots(){
  let rows=QUOTS;
  const day=q=>localDay(q.released_date||q.created_at);
  if(QFILTER.month)rows=rows.filter(q=>day(q).slice(0,7)===QFILTER.month);
  if(QFILTER.date)rows=rows.filter(q=>day(q)===QFILTER.date);
  if(QFILTER.q){const s=QFILTER.q.toLowerCase();rows=rows.filter(q=>
    (q.leads?.customer_name||'').toLowerCase().includes(s)||(q.leads?.ref_id||'').toLowerCase().includes(s));}
  return rows;
}
function drawQuots(){
  const rows=filteredQuots();
  if(!rows.length){$('quotwrap').innerHTML=QUOTS.length
    ?blank('No matches','No quotation fits the current search or dates.')
    :blank('No quotations yet','An engineer releases a quotation from inside a lead, and it is logged here.');return;}
  $('quotwrap').innerHTML=`<table><thead><tr>
      <th>Ref ID</th><th>Customer</th><th>System</th><th>Panels</th><th>Inverter</th><th>Battery</th><th>Price</th><th>Released</th><th>By</th><th>Document</th>
    </tr></thead><tbody>`+rows.map(q=>`
      <tr><td class="refid">${esc(q.leads?.ref_id||'—')}</td>
      <td><b>${esc(q.leads?.customer_name||'?')}</b></td>
      <td>${esc(q.system_type||'—')}<span class="days">${esc(q.ampere_phase||'')}</span></td>
      <td>${q.panel_pcs??'—'} ${esc(q.panel_brand||'')}<span class="days">${q.panel_kwp?q.panel_kwp+' kWp':''}</span></td>
      <td>${q.inverter_pcs??'—'} × ${q.inverter_kw??'—'}kW ${esc(q.inverter_brand||'')}<span class="days">${q.inverter_kw_total?q.inverter_kw_total+' kW total':''}</span></td>
      <td>${esc(q.battery_kwh||'—')} ${esc(q.battery_brand||'')}</td>
      <td><b>${fmtMoney(q.price_usd)}</b></td>
      <td>${fmtDate(q.released_date)}</td>
      <td>${esc(staffName(q.provided_by))}</td>
      <td><button class="btn-line" onclick="printQuote('${q.id}')">Document</button></td></tr>`).join('')+`</tbody></table>`;
}
