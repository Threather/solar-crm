/* ---------------- SALES INCENTIVE ----------------
   The client's scheme, worked monthly on payment actually collected. This
   screen calculates and shows; it never marks anything paid and never writes
   to commissions. Check it against your own sheet before trusting it.

   The scheme, in their words:
     pool comes from a tier table on the month's total collection
     the sales manager takes a 20% override off the top
     the remaining 80% is split by each person's share of collection
     the manager also earns their own share of that 80%
     15% of everyone's incentive is held and released 60 days later
     anyone inside 90 days of joining earns 70% of standard */
const INCENTIVE_TIERS=[
  {name:'Starter', min:0,      pool:c=>c*0.003, label:'0.3% of collection'},
  {name:'Bronze',  min:160000, pool:()=>1500,   label:'$1,500'},
  {name:'Silver',  min:180000, pool:()=>2250,   label:'$2,250'},
  {name:'Gold',    min:200000, pool:()=>3000,   label:'$3,000'},
  {name:'Platinum',min:220000, pool:()=>3600,   label:'$3,600'},
  {name:'Diamond', min:250000, pool:()=>4500,   label:'$4,500'}
];
const INC_OVERRIDE=0.20, INC_HELD=0.15, INC_PROBATION_DAYS=90, INC_PROBATION_RATE=0.70, INC_RELEASE_DAYS=60;
function incentiveTier(collection){
  let t=INCENTIVE_TIERS[0];
  INCENTIVE_TIERS.forEach(x=>{if(collection>=x.min)t=x;});
  return t;
}
/* the whole scheme in one function, so it can be tested against the client's
   own worked examples without a screen in the way */
function incentiveFor(people){
  const total=people.reduce((a,p)=>a+p.collection,0);
  const tier=incentiveTier(total);
  const pool=tier.pool(total);
  const override=pool*INC_OVERRIDE;
  const rest=pool-override;
  const rows=people.map(p=>{
    const share=total?p.collection/total:0;
    /* exact share, not a rounded percentage — see the note on screen */
    const standard=rest*share+(p.isManager?override:0);
    const earned=p.onProbation?standard*INC_PROBATION_RATE:standard;
    return {...p,share,standard,earned,paidNow:earned*(1-INC_HELD),held:earned*INC_HELD};
  });
  /* What was actually handed out, which is not the pool when there is no
     manager to take the override. A total that disagrees with the column
     above it is worse than no total. */
  const allocated=rows.reduce((a,r)=>a+r.standard,0);
  return {total,tier,pool,override,rest,rows,allocated,
    unallocated:pool-allocated,
    heldTotal:rows.reduce((a,r)=>a+r.held,0),
    paidTotal:rows.reduce((a,r)=>a+r.paidNow,0)};
}

let INCMONTH='';
async function renderIncentive(){
  if(!['admin','manager'].includes(ME.role)){
    $('main').innerHTML=blank('Incentive is admin and manager only','Ask an admin if you need the figures.');return;}
  $('main').innerHTML=SKEL;
  if(!INCMONTH)INCMONTH=monthStart();
  const from=INCMONTH;
  const to=localDay(new Date(new Date(INCMONTH).getFullYear(),new Date(INCMONTH).getMonth()+1,0));

  const rows=await fetchLeads(q=>q);
  const byLead={}; rows.forEach(l=>byLead[l.id]=l);
  const {data:pays}=await sb.from('lead_payments').select('lead_id,amount_usd,paid_on')
    .gte('paid_on',from).lte('paid_on',to);
  const collected={};
  (pays||[]).forEach(p=>{const l=byLead[p.lead_id];if(!l||!l.assigned_to)return;
    collected[l.assigned_to]=(collected[l.assigned_to]||0)+Number(p.amount_usd||0);});
  const unassigned=(pays||[]).filter(p=>{const l=byLead[p.lead_id];return !l||!l.assigned_to;})
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);

  const staff=STAFF.filter(s=>['sales','manager'].includes(s.role)&&s.is_active);
  const manager=staff.find(s=>s.role==='manager');
  const monthEnd=new Date(to);
  const release=new Date(monthEnd.getTime()+INC_RELEASE_DAYS*86400000);
  const people=staff.map(s=>{
    const joined=s.joined_date?new Date(s.joined_date):null;
    const daysIn=joined?Math.floor((monthEnd-joined)/86400000):null;
    return {id:s.id,name:s.full_name,role:s.role,joined:s.joined_date,
      isManager:!!manager&&s.id===manager.id,
      onProbation:daysIn!==null&&daysIn<INC_PROBATION_DAYS,
      collection:collected[s.id]||0};
  });
  const r=incentiveFor(people);

  const opts=[];
  const now=new Date();
  for(let i=-12;i<=1;i++){
    const d=new Date(now.getFullYear(),now.getMonth()+i,1), iso=localDay(d);
    opts.push(`<option value="${iso}" ${iso===INCMONTH?'selected':''}>${esc(monthName(iso.slice(0,7)))}</option>`);
  }
  const cash=v=>'$'+Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

  $('main').innerHTML=`
    <h2 style="margin-bottom:4px">Sales incentive</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Worked on payment collected in the month, from the tier table. Nothing here is marked paid — it is a calculation to check against before you pay anyone.</p>
    <div class="toolbar"><select onchange="setIncMonth(this.value)">${opts.join('')}</select></div>

    <div class="stats">
      <div class="stat hero"><div class="n">${fmtMoney(Math.round(r.total))}</div><div class="l">Collected in ${esc(monthName(INCMONTH.slice(0,7)))}</div></div>
      <div class="stat"><div class="n">${esc(r.tier.name)}</div><div class="l">Tier reached</div></div>
      <div class="stat"><div class="n">${cash(r.pool)}</div><div class="l">Incentive pool</div></div>
      <div class="stat"><div class="n">${cash(r.override)}</div><div class="l">Manager override</div></div>
      <div class="stat"><div class="n">${cash(r.heldTotal)}</div><div class="l">Held to ${fmtDate(release)}</div></div>
    </div>

    ${!manager?`<div class="hint" style="border-left-color:var(--bad);color:var(--bad)">
      <b>No manager account, so the 20% override of ${cash(r.override)} has nobody to go to.</b>
      It is counted out of the pool but not paid to anyone. Give someone the manager role, or say the override should not apply.
    </div>`:''}
    ${unassigned>0.005?`<div class="hint">
      <b>${cash(unassigned)} was collected on leads with no sale engineer assigned.</b>
      It counts toward the tier but earns nobody a share.
    </div>`:''}
    ${people.some(p=>!p.joined)?`<div class="hint">
      <b>${people.filter(p=>!p.joined).length} of ${people.length} have no joining date.</b>
      Nobody without one is treated as being on probation, so they earn the full rate. Set the dates under Users.
    </div>`:''}

    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Name</th><th>Position</th><th>Joined</th><th>Collection</th><th>Share</th>
      <th>Incentive</th><th>Paid now</th><th>Held to ${fmtDate(release)}</th>
    </tr></thead><tbody>`+r.rows.map(p=>`
      <tr>
        <td><b>${esc(p.name)}</b>${p.onProbation?'<span class="days">on probation, 70%</span>':''}</td>
        <td>${p.isManager?'Sales manager':'Sales executive'}</td>
        <td class="nowrap">${p.joined?fmtDate(p.joined):'<span class="quiet">not set</span>'}</td>
        <td>${fmtMoney(Math.round(p.collection))}</td>
        <td>${(p.share*100).toFixed(1)}%</td>
        <td><b>${cash(p.standard)}</b></td>
        <td>${cash(p.paidNow)}</td>
        <td>${cash(p.held)}</td>
      </tr>`).join('')+`</tbody>
      <tfoot><tr>
        <td><b>Total</b></td><td></td><td></td>
        <td><b>${fmtMoney(Math.round(r.total))}</b></td><td>100.0%</td>
        <td><b>${cash(r.allocated)}</b></td><td><b>${cash(r.paidTotal)}</b></td><td><b>${cash(r.heldTotal)}</b></td>
      </tr>${r.unallocated>0.005?`<tr><td colspan="5" style="color:var(--bad)">Override with nobody to receive it</td>
        <td colspan="3" style="color:var(--bad)"><b>${cash(r.unallocated)}</b> of the ${cash(r.pool)} pool</td></tr>`:''}
      </tfoot></table></div>

    <div class="homegrid" style="margin-top:22px">
      ${repPanel('How this was worked out',repFigs([
        ['Collection',fmtMoney(Math.round(r.total))],
        ['Tier',r.tier.name,r.tier.label],
        ['Pool',cash(r.pool)],
        ['Manager override, 20%',cash(r.override)],
        ['Split among the team',cash(r.rest)],
        ['Actually allocated',cash(r.allocated),r.unallocated>0.005?cash(r.unallocated)+' unassigned':''],
        ['Held back, 15%',cash(r.heldTotal),'released '+fmtDate(release)]
      ]),true)}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">Tier table</h3>
    <div class="tablewrap"><table class="table-compact" style="max-width:520px"><thead><tr>
      <th>Tier</th><th>Monthly collection</th><th>Pool</th>
    </tr></thead><tbody>`+INCENTIVE_TIERS.map((t,i)=>{
      const next=INCENTIVE_TIERS[i+1];
      const band=i===0?'Below '+fmtMoney(INCENTIVE_TIERS[1].min)
        :next?fmtMoney(t.min)+' – '+fmtMoney(next.min-1):fmtMoney(t.min)+' and above';
      return `<tr${t.name===r.tier.name?' style="background:var(--card-alt)"':''}>
        <td><b>${t.name}</b></td><td>${band}</td><td>${esc(t.label)}</td></tr>`;
    }).join('')+`</tbody></table></div>

    <div class="hint" style="margin-top:18px">
      <b>Shares are worked to the exact percentage.</b>
      The client's first worked example rounds 26.67% to 26% and 13.33% to 14%,
      which moves $2.40 between two people. Example two uses exact shares and
      matches this calculation to the cent.
    </div>`;
}
function setIncMonth(m){INCMONTH=m;renderIncentive();}
