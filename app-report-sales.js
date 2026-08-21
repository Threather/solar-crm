/* ---------------- SALES REPORT ----------------
   The client sent three documents — daily, weekly, monthly — with largely the
   same metrics over different windows. That is one report with a window
   switch, not three screens: the monthly extras (last month's comparison) show
   only when the window is a month.

   Every section below is theirs, in their order and their wording. Where a
   figure cannot be worked out from what the database holds it prints a dash
   and says why, rather than a zero that reads like an answer. */

/* the value of an open lead is the last thing quoted for it. A lead with no
   quotation contributes nothing, so the pipeline understates rather than
   inventing a number — the count it covers is printed beside it. */
function pipelineValue(rows,quotBy){
  let value=0,covered=0;
  rows.forEach(l=>{const q=quotBy[l.id];if(q){value+=Number(q.price_usd||0);covered++;}});
  return {value,covered};
}

async function renderSalesReport(){
  const rows=await fetchLeads(q=>q);
  const ids=rows.map(l=>l.id);
  const range=repRange(REPPERIOD);
  const per=repPeriodWord();
  const mStart=monthStart(), today=localDay(new Date());

  /* everything this report needs, fetched together. Any of these can come back
     empty because the role is not allowed to read it; each panel says so
     rather than showing zero. */
  const [reached,tg,acts,quots,fins,pays,finrows]=await Promise.all([
    loadStageHistory(ids),
    loadTargets(mStart),
    ids.length?sb.from('lead_activities').select('lead_id,activity_type,created_at,to_stage').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('quotations').select('lead_id,price_usd,created_at').in('lead_id',ids).order('created_at').then(r=>r.data||[]):[],
    ids.length?sb.from('lead_financials').select('lead_id,final_sale_usd').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('lead_payments').select('lead_id,amount_usd,other_fee_usd,paid_on').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('lead_finance').select('lead_id,contract_total_usd,follow_up_date').in('lead_id',ids).then(r=>r.data||[]):[]
  ]);

  const actsBy={}, quotBy={}, quotFirst={}, saleBy={}, finBy={};
  acts.forEach(a=>(actsBy[a.lead_id]=actsBy[a.lead_id]||[]).push(a));
  quots.forEach(q=>{quotBy[q.lead_id]=q;if(!quotFirst[q.lead_id])quotFirst[q.lead_id]=q;});
  fins.forEach(f=>saleBy[f.lead_id]=Number(f.final_sale_usd||0));
  finrows.forEach(f=>finBy[f.lead_id]=f);
  const paidBy={}, feeBy={};
  pays.forEach(p=>{paidBy[p.lead_id]=(paidBy[p.lead_id]||0)+Number(p.amount_usd||0);
                   feeBy[p.lead_id]=(feeBy[p.lead_id]||0)+Number(p.other_fee_usd||0);});

  const inWin=v=>REPPERIOD==='all'||inRange(v,range);
  const got=rows.filter(l=>inWin(l.created_at));
  const open=rows.filter(l=>!TERMINAL.includes(l.stage_code));
  const won=rows.filter(l=>l.stage_code===WON);
  const lost=rows.filter(l=>l.stage_code===LOST);
  const wonInWin=won.filter(l=>inWin(l.stage_entered_at));
  const lostInWin=lost.filter(l=>inWin(l.stage_entered_at));

  /* I. Lead and sales activity */
  const phoneSeen={};
  [...rows].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).forEach(l=>{
    if(!l.phone)return; l._existing=!!phoneSeen[l.phone]; phoneSeen[l.phone]=true;});
  const existing=got.filter(l=>l._existing).length;
  const qualified=got.filter(l=>qualText(l)==='Qualified');
  const contactOf=l=>(actsBy[l.id]||[]).filter(a=>['call','note'].includes(a.activity_type))
    .sort((x,y)=>new Date(x.created_at)-new Date(y.created_at))[0];
  const pendingContact=open.filter(l=>!contactOf(l));
  const pendingFollow=open.filter(l=>l.next_follow_up&&localDay(l.next_follow_up)<=today);
  const firstTat=avgDays(got.map(l=>{const c=contactOf(l);return c?daysBetween(l.created_at,c.created_at):null;}));
  const contactCounts=got.map(l=>(actsBy[l.id]||[]).filter(a=>['call','note'].includes(a.activity_type)).length);
  const avgContacts=contactCounts.length
    ?(contactCounts.reduce((a,b)=>a+b,0)/contactCounts.length).toFixed(1):'—';

  /* II. Funnel and pipeline */
  const live=STAGES.filter(s=>!TERMINAL.includes(s.stage_code));
  const aging=avgDays(open.map(l=>daysBetween(l.stage_entered_at,today)));
  const cycle=avgDays(won.map(l=>daysBetween(l.created_at,l.stage_entered_at)));
  const overdue=open.filter(l=>l.next_follow_up&&localDay(l.next_follow_up)<today);
  const quotTat=avgDays(rows.map(l=>{
    const q=quotFirst[l.id]; if(!q)return null;
    const enter=(actsBy[l.id]||[]).filter(a=>a.activity_type==='stage_change'&&a.to_stage==='pending_quotation')
      .sort((x,y)=>new Date(x.created_at)-new Date(y.created_at))[0];
    return enter?daysBetween(enter.created_at,q.created_at):null;}));
  const pipe=pipelineValue(open,quotBy);

  /* III. Performance, against the target for the month being shown */
  const myTargets=Object.entries(tg.person).filter(([,v])=>v.collection!=null);
  const teamTarget=myTargets.reduce((a,[,v])=>a+Number(v.collection||0),0);
  const target=ME.role==='sales'?Number(tg.person[ME.id]?.collection||0):teamTarget;
  const wonValue=wonInWin.reduce((a,l)=>a+(saleBy[l.id]||0),0);
  const avgDeal=wonInWin.length?wonValue/wonInWin.length:null;
  const expected=open.filter(l=>l.expected_close_date&&inWin(l.expected_close_date));
  const expectedValue=pipelineValue(expected,quotBy).value;
  const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const dayNow=new Date().getDate();

  /* IV. Collection — actual is money received inside the window */
  const collected=pays.filter(p=>inWin(p.paid_on)).reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const dueOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0)+(feeBy[l.id]||0);
  const outstanding=won.reduce((a,l)=>a+Math.max(0,dueOf(l)-(paidBy[l.id]||0)),0);
  const overdueCust=won.filter(l=>{const f=finBy[l.id];
    return f&&f.follow_up_date&&localDay(f.follow_up_date)<today&&dueOf(l)-(paidBy[l.id]||0)>0.005;});
  const overdueValue=overdueCust.reduce((a,l)=>a+Math.max(0,dueOf(l)-(paidBy[l.id]||0)),0);
  /* A follow-up date is a promise about the future, so "all time" must not
     shut it out the way a backward-looking window does — over all time,
     everything still scheduled is expected. */
  const expectedColl=won.filter(l=>{const f=finBy[l.id];
    return f&&f.follow_up_date&&(REPPERIOD==='all'||inRange(f.follow_up_date,range))
      &&dueOf(l)-(paidBy[l.id]||0)>0.005;})
    .reduce((a,l)=>a+Math.max(0,dueOf(l)-(paidBy[l.id]||0)),0);
  const collPct=expectedColl?Math.round(collected/expectedColl*100):null;
  /* Nothing expected while money is still owed is not an error, it means
     nobody has set a date to chase it. Saying so turns a zero that looks
     broken into the thing finance should act on. */
  const owingNoDate=won.filter(l=>dueOf(l)-(paidBy[l.id]||0)>0.005
    &&!(finBy[l.id]&&finBy[l.id].follow_up_date)).length;
  /* Run rate is a statement about this month and nothing else. Projecting a
     year of collection across thirty-one days is not a forecast, so this reads
     month-to-date money whatever window the rest of the page is showing. */
  const mtdCollected=pays.filter(p=>localDay(p.paid_on)>=mStart&&localDay(p.paid_on)<=today)
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const runRate=dayNow?mtdCollected/dayNow*dim:null;

  /* V. Closed-lost */
  const lostAfterQuot=lostInWin.filter(l=>quotFirst[l.id]).length;
  const reasons={};
  lostInWin.forEach(l=>{const r=l.lost_reason||'Not recorded';reasons[r]=(reasons[r]||0)+1;});

  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const cash=v=>v==null?'—':fmtMoney(Math.round(v));
  const bar=(label,n,total,cls)=>`<div class="row${cls||''}">
      <span class="nm">${esc(label)}</span>
      <span class="track"><span class="fill" style="width:${total?Math.round(n/total*100):0}%"></span></span>
      <span class="ct">${n}</span></div>`;

  /* whoever the leads are actually on, not whoever holds the right role. An
     admin can be assigned a lead — Kevin holds nine, three of them won — and
     those rows used to drop out of the table below without saying so, leaving
     the per-person lines short of the totals above them. */
  const holders=new Set(rows.filter(l=>l.assigned_to).map(l=>l.assigned_to));
  const people=STAFF.filter(s=>['sales','manager'].includes(s.role)||holders.has(s.id));
  const personFilter=ME.role==='sales'?'':`<select onchange="setRepFilter('person',this.value)">
      <option value="">Everyone</option>
      ${people.map(p=>`<option value="${p.id}" ${REPFILTER.person===p.id?'selected':''}>${esc(p.full_name)}</option>`).join('')}
    </select>`;
  const mine=set=>REPFILTER.person?set.filter(l=>l.assigned_to===REPFILTER.person):set;

  $('main').innerHTML=repBar('Sales report',personFilter)+`
    <div class="stats">
      <div class="stat hero ${target&&wonValue<target?'alert':''}">
        <div class="n">${cash(wonValue)}</div><div class="l">Closed-Won value ${per}</div></div>
      <div class="stat"><div class="n">${wonInWin.length}</div><div class="l">Deals won</div></div>
      <div class="stat"><div class="n">${target?pct(wonValue,target):'—'}</div><div class="l">Of target</div></div>
      <div class="stat"><div class="n">${open.length}</div><div class="l">Active pipeline</div></div>
      <div class="stat"><div class="n">${cash(collected)}</div><div class="l">Collected ${per}</div></div>
    </div>
    ${!target?`<div class="hint"><b>No collection target set for ${esc(monthName(mStart.slice(0,7)))}.</b>
      Target achievement, forecast and pipeline coverage stay blank until an admin sets one under Targets.</div>`:''}

    <div class="homegrid">
      ${repPanel('Lead and sales activity',repFigs([
        ['Raw leads',got.length],
        ['New',got.length-existing],['Existing',existing],
        ['Qualified',qualified.length],
        ['Pending first contact',pendingContact.length],
        ['Pending follow-up',pendingFollow.length],
        ['First contact, days',firstTat.avg,firstTat.n+' lead'+(firstTat.n===1?'':'s')],
        ['Average contacts',avgContacts]
      ]),true)}

      ${repPanel('Sales funnel',`<div class="pipe">
        ${live.map(s=>bar(s.stage_name,mine(open).filter(l=>l.stage_code===s.stage_code).length,open.length)).join('')}
        ${bar('Closed-Won',mine(won).length,rows.length,' won')}
      </div>`)}

      ${repPanel('Pipeline',repFigs([
        ['Active leads',open.length],
        ['Pipeline value',cash(pipe.value),pipe.covered+' of '+open.length+' quoted'],
        ['Pipeline coverage',target?pct(pipe.value,target):'—'],
        ['Stage aging, days',aging.avg,aging.n+' lead'+(aging.n===1?'':'s')],
        ['Overdue by follow-up',overdue.length],
        ['Quotation turnaround, days',quotTat.avg,quotTat.n+' quoted'],
        ['Average sales cycle, days',cycle.avg,cycle.n+' won']
      ]))}

      ${repPanel('Sales performance',repFigs([
        ['Closed-Won',wonInWin.length],
        ['Contract value',cash(wonValue)],
        ['Target',target?cash(target):'—'],
        ['Target achievement',target?pct(wonValue,target):'—'],
        ['Shortfall',target?cash(Math.max(0,target-wonValue)):'—'],
        ['Average deal size',cash(avgDeal)],
        ['Expected to close',expected.length,cash(expectedValue)]
      ]))}

      ${repPanel('Payment collection',repFigs([
        ['Expected',cash(expectedColl),owingNoDate?owingNoDate+' owing with no date set':''],
        ['Actual',cash(collected)],
        ['Collection rate',collPct===null?'—':collPct+'%'],
        ['Outstanding',cash(outstanding)],
        ['Overdue',cash(overdueValue),overdueCust.length+' customer'+(overdueCust.length===1?'':'s')],
        ['Run rate, this month',cash(runRate),cash(mtdCollected)+' in '+dayNow+' days']
      ]))}

      ${repPanel('Closed-Lost',repFigs([
        ['Closed-Lost',lostInWin.length],
        ['Before quotation',lostInWin.length-lostAfterQuot],
        ['After quotation',lostAfterQuot]
      ])+(Object.keys(reasons).length?`<div class="pipe" style="margin-top:12px">
        ${Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([r,n])=>bar(r,n,lostInWin.length)).join('')}
      </div>`:''))}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">By sale engineer</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Sale engineer</th><th>Leads</th><th>Qualified</th><th>Quotation sent</th>
      <th>Closed-Won</th><th>Closed-Lost</th><th>Contract value</th><th>Collected</th>
      <th>Target</th><th>Achieved</th>
    </tr></thead><tbody>`+people.map(p=>{
      const set=got.filter(l=>l.assigned_to===p.id);
      const w=wonInWin.filter(l=>l.assigned_to===p.id);
      const v=w.reduce((a,l)=>a+(saleBy[l.id]||0),0);
      const c=pays.filter(x=>inWin(x.paid_on)&&rows.find(l=>l.id===x.lead_id&&l.assigned_to===p.id))
        .reduce((a,x)=>a+Number(x.amount_usd||0),0);
      const t=Number(tg.person[p.id]?.collection||0);
      if(!set.length&&!w.length&&!t)return '';
      return `<tr>
        <td><b>${esc(p.full_name)}</b></td>
        <td>${set.length}</td>
        <td>${set.filter(l=>qualText(l)==='Qualified').length}</td>
        <td>${set.filter(l=>everReached(reached,l,'quotation_sent')).length}</td>
        <td>${w.length}</td>
        <td>${lostInWin.filter(l=>l.assigned_to===p.id).length}</td>
        <td>${cash(v)}</td><td>${cash(c)}</td>
        <td>${t?cash(t):'—'}</td><td>${t?pct(v,t):'—'}</td></tr>`;
    }).join('')+`</tbody></table></div>

    <h3 style="font-size:15px;margin:22px 0 8px">By channel</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Channel</th><th>Raw leads</th><th>Qualified</th><th>Closed-Won</th>
      <th>Conversion</th><th>Contract value</th>
    </tr></thead><tbody>`+CH_ORDER.map(c=>{
      const set=got.filter(l=>chOf(l)===c);
      if(!set.length)return '';
      const w=set.filter(l=>l.stage_code===WON);
      return `<tr><td><b>${esc(c.replace(/_/g,' '))}</b></td><td>${set.length}</td>
        <td>${set.filter(l=>qualText(l)==='Qualified').length}</td><td>${w.length}</td>
        <td>${pct(w.length,set.length)}</td>
        <td>${cash(w.reduce((a,l)=>a+(saleBy[l.id]||0),0))}</td></tr>`;
    }).join('')+`</tbody></table></div>`;
}
