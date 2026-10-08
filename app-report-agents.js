/* ---------------- AGENT REPORT (8 Oct 2026) ----------------
   Third Party > Agent leads, per agent and per month the agent sent the
   customer (lead date): referred, qualified, not qualified, Closed-Won,
   Closed-Lost, contract value of the won deals, and what those customers have
   paid. Follows the report dates on lead date. Admin and manager. */
async function renderAgentReport(){
  if(!['admin','manager'].includes(ME.role)){$('main').innerHTML=blank('Agent report is for admin and the manager','');return;}
  const range=repRange(REPPERIOD);
  const all=await fetchLeads(q=>q.eq('lead_sub_channel','Agent'));
  const rows=all.filter(l=>{const d=localDay(l.lead_date||l.created_at);return d>=range[0]&&d<=range[1];});
  const ids=rows.map(l=>l.id);
  const [fins,finrows,pays]=ids.length?await Promise.all([
    repByIds(()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id'),ids),
    repByIds(()=>sb.from('lead_finance').select('lead_id,contract_total_usd').order('lead_id'),ids),
    repByIds(()=>sb.from('lead_payments').select('lead_id,amount_usd').order('id'),ids)]):[[],[],[]];
  const sale={},contract={},paid={};
  fins.forEach(f=>sale[f.lead_id]=Number(f.final_sale_usd||0));
  finrows.forEach(f=>{if(f.contract_total_usd!=null)contract[f.lead_id]=Number(f.contract_total_usd);});
  pays.forEach(p=>paid[p.lead_id]=(paid[p.lead_id]||0)+Number(p.amount_usd||0));
  const won=l=>l.stage_code===WON;
  const sum=set=>({n:set.length,q:set.filter(l=>qualText(l)==='Qualified').length,
    won:set.filter(won).length,lost:set.filter(isClosedLost).length,
    value:set.filter(won).reduce((a,l)=>a+(contract[l.id]??sale[l.id]??0),0),
    paid:set.reduce((a,l)=>a+(paid[l.id]||0),0)});
  const cells=s=>`<td>${s.n}</td><td>${s.q}</td><td>${s.n-s.q}</td><td>${s.won}</td><td>${s.lost}</td>
    <td class="nowrap">${repCash(s.value)}</td><td class="nowrap">${repCash(s.paid)}</td>`;
  const agents=[...new Set(rows.map(l=>l.agent_name||'(no agent picked)'))].sort();
  const body=agents.map(a=>{
    const mine=rows.filter(l=>(l.agent_name||'(no agent picked)')===a);
    const months=[...new Set(mine.map(l=>localDay(l.lead_date||l.created_at).slice(0,7)))].sort();
    return months.map((m,i)=>`<tr>${i===0?`<td rowspan="${months.length+1}"><b class="nm">${esc(a)}</b></td>`:''}
        <td class="nowrap">${esc(monthName(m))}</td>${cells(sum(mine.filter(l=>localDay(l.lead_date||l.created_at).startsWith(m))))}</tr>`).join('')
      +`<tr class="srtotal"><td><b>Total</b></td>${cells(sum(mine))}</tr>`;
  }).join('');
  const t=sum(rows);
  $('main').innerHTML=repBar('Agent report')+`
    <div class="kpis seven five">
      ${kpi({label:'Leads referred',value:t.n,lead:true})}
      ${kpi({label:'Qualified',value:t.q})}
      ${kpi({label:'Closed-Won',value:t.won})}
      ${kpi({label:'Contract value',value:repCash(t.value)})}
      ${kpi({label:'Payment collected',value:repCash(t.paid)})}
    </div>
    <div class="section" style="margin-top:16px">${rows.length?`<div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Agent</th><th>Month referred</th><th>Leads</th><th>Qualified</th><th>Not qualified</th>
      <th>Closed-Won</th><th>Closed-Lost</th><th>Contract value</th><th>Payment collected</th></tr></thead>
      <tbody>${body}</tbody></table></div>`:blank('No agent leads in these dates','')}</div>`;
}
