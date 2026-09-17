/* ---------------- MARKETING REPORT ----------------
   The client's Daily Marketing Report, in their sections and their order.
   Cost per lead needs a spend figure and the target needs a number, both set
   by admin on the Targets screen. Where one is missing this says so rather
   than dividing by nothing and printing a confident zero. */
const MKT_CH=['Digital_Marketing','Offline_Marketing','Third_Party','Direct_Sales','Existing_Customer'];

async function renderMktReport(){
  const rows=await fetchLeads(q=>q);
  const range=repRange(REPPERIOD);
  const per=repPeriodWord();
  const mStart=monthStart();
  const [tg,reached]=await Promise.all([loadTargets(mStart),loadStageHistory(rows.map(l=>l.id))]);

  /* lead_date is the day the lead came in and created_at only the day it was
     typed up. The other three dashboards read it that way; this one did not,
     so a backdated lead landed in a different month here than everywhere
     else. */
  const dayOf=l=>l.lead_date||l.created_at;
  const inWin=l=>REPPERIOD==='all'||inRange(dayOf(l),range);
  const got=rows.filter(inWin);
  const byCh=c=>got.filter(l=>chOf(l)===c).length;

  const qualified=got.filter(l=>qualText(l)==='Qualified');
  const disqualified=got.filter(l=>qualText(l)==='Disqualified');
  const qualRate=got.length?Math.round(qualified.length/got.length*100):null;

  /* month to date is the frame the target is set in, whatever window is shown */
  const mtd=rows.filter(l=>inRange(dayOf(l),[mStart,localDay(new Date())]));
  const todayRows=rows.filter(l=>inRange(dayOf(l),repRange('today')));
  const leadTarget=tg.company.leads??null;
  /* budget is what may be spent, spent is what has been. Both are company rows
     on the Targets screen, set by the manager each month - the same place
     every other target in this app lives. */
  const budget=tg.company.spend??null;
  const spend=tg.company.spend_actual??null;
  const cpl=spend!=null&&mtd.length?spend/mtd.length:null;
  const mtdQual=mtd.filter(l=>qualText(l)==='Qualified');
  const cpql=spend!=null&&mtdQual.length?spend/mtdQual.length:null;
  const targetCpl=budget!=null&&leadTarget?budget/leadTarget:null;

  /* Pacing: leads so far against where the month should have got to by today,
     at a straight line. It follows the month, never the window switch - a
     figure about how this month is going cannot answer for "all time". */
  const nowD=new Date(), dim=new Date(nowD.getFullYear(),nowD.getMonth()+1,0).getDate();
  const dayNow=nowD.getDate();
  const expectedByNow=leadTarget?leadTarget*(dayNow/dim):null;
  const pacing=expectedByNow?Math.round((mtd.length-expectedByNow)/expectedByNow*100):null;

  /* his sheet breaks digital down by sub-channel, which is where the money
     actually goes - Facebook against Telegram, not "digital" as one lump */
  const subs=[...new Set(got.filter(l=>l.lead_sub_channel).map(l=>l.lead_sub_channel))].sort();
  const subQ=s=>got.filter(l=>l.lead_sub_channel===s&&qualText(l)==='Qualified').length;
  const subD=s=>got.filter(l=>l.lead_sub_channel===s&&qualText(l)!=='Qualified').length;

  /* "contact captured" can only mean a phone number: the app records no email
     on a lead. Marketing capture it once and then only admin may change it. */
  const capture=MKT_CH.map(c=>{const set=got.filter(l=>chOf(l)===c);
    return [c.replace(/_/g,' '),set.length,set.filter(l=>l.phone).length];})
    .filter(r=>r[1]>0);

  /* cumulative leads by day of this month against a straight line to target */
  const days=Array.from({length:dayNow},(_,i)=>i+1);
  /* counted per day by re-scanning every lead, which is a full scan for each
     of up to 31 days - and it read created_at, not the lead's own date, so it
     disagreed with the KPI above it. Bucketed once. */
  const perDay={};
  rows.forEach(l=>{const d=localDay(dayOf(l));perDay[d]=(perDay[d]||0)+1;});
  const cumActual=[];let run=0;
  days.forEach(d=>{run+=perDay[mStart.slice(0,8)+String(d).padStart(2,'0')]||0;cumActual.push(run);});
  const cumTarget=leadTarget?days.map(d=>Math.round(leadTarget*(d/dim))):null;

  /* conversion is measured on the window's own leads, so it answers "of what
     came in, how much moved" rather than mixing cohorts */
  const toQuot=got.filter(l=>everReached(reached,l,'quotation_sent'));
  const toWon=got.filter(l=>everReached(reached,l,WON));
  const pct=repPct, cash=repCash;

  const months=[...new Set(rows.map(l=>localDay(l.created_at).slice(0,7)))].filter(Boolean).sort().slice(-12);
  const counts={};
  months.forEach(m=>{counts[m]={};CH_ORDER.forEach(c=>counts[m][c]=0);});
  rows.forEach(l=>{const m=localDay(l.created_at).slice(0,7);if(counts[m])counts[m][chOf(l)]++;});
  const used=CH_ORDER.filter(c=>months.some(m=>counts[m][c]>0));

  const bar=(label,n,total,cls)=>`<div class="row${cls||''}">
      <span class="nm">${esc(label)}</span>
      <span class="track"><span class="fill" style="width:${total?Math.round(n/total*100):0}%"></span></span>
      <span class="ct">${n}</span></div>`;
  const missing=[leadTarget==null?'Lead target':'',spend==null?'marketing spend':''].filter(Boolean);
  const digital=got.filter(l=>l.lead_channel==='Digital_Marketing');
  /* Marketing owns customer identity, not where the deal has got to, so their
     own copy of this report drops qualification and the funnel. Admin, who
     reaches the same report through the scope switch, keeps all of it. */
  const noStage=ME.role==='marketing';

  /* leads carry a creation date, so this month against last is real */
  const thisM=mStart.slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const madeIn=m=>rows.filter(l=>localDay(dayOf(l)).slice(0,7)===m).length;
  const prevWord=monthName(prevM);

  $('main').innerHTML=repBar('Marketing report')+`
    <!-- his five boxes, in his order -->
    <div class="kpis six">
      ${kpi({label:'Total Leads',value:got.length,lead:true,
        delta:momPct(madeIn(thisM),madeIn(prevM)),deltaOf:prevWord,
        note:leadTarget?mtd.length+' of '+leadTarget+' this month':'no lead target set'})}
      ${kpi({label:'Digital Leads',value:digital.length,
        note:pct(digital.length,got.length)+' of total'})}
      ${noStage?'':kpi({label:'Qualification Rate',value:qualRate===null?'\u2014':qualRate+'%',
        note:qualified.length+' of '+got.length})}
      ${kpi({label:'Spend',value:spend==null?'\u2014':fmtMoney(spend),
        note:budget==null?'no budget set':'of '+fmtMoney(budget)+' budget'})}
      ${kpi({label:'Cost per Lead',value:cash(cpl),
        note:targetCpl==null?'no target CPL':'target '+cash(targetCpl)})}
    </div>
    ${missing.length?`<div class="hint">
      <b>${esc(missing.join(' and '))} not set for ${esc(monthName(mStart.slice(0,7)))}.</b>
      Set under Targets.
    </div>`:''}

    <div class="homegrid">
      ${noStage||!subs.length
        ?repPanel('Leads by sub-channel',
          subs.length?gRank(subs.map(s=>[s,got.filter(l=>l.lead_sub_channel===s).length]),
            {color:'var(--viz-1)'})
          :blank('No sub-channel recorded','Marketing pick one on the New lead form.'))
        :groupChart(subs,
          [{name:'Qualified',color:'var(--viz-good)',values:subs.map(subQ)},
           {name:'Not qualified',color:'var(--viz-s5)',values:subs.map(subD)}],
          {title:'Leads by sub-channel and quality',compact:true,stacked:true})}

      ${repPanel('Customer contact captured',
        capture.length
          ?gRank(capture.map(r=>[r[0],Math.round(r[2]/r[1]*100)]),
             {color:'var(--viz-2)',order:true,keepZero:true,limit:capture.length,
              fmt:v=>v+'%'})
           +ledger(capture.map(r=>[r[0],r[2]+'/'+r[1],'have a phone number']))
          :blank('Nothing to count yet','This fills in as leads are created.'))}
    </div>

    <div class="homegrid">
      ${colChart(MKT_CH.map(c=>c.replace(/_/g,' ')),MKT_CH.map(c=>byCh(c)),
        {title:'Lead gen by channel type',color:'var(--viz-1)',compact:true,table:false})}
      ${leadTarget&&days.length>1
        ?lineChart(days.map(String),
          [{name:'Actual',color:'var(--viz-1)',values:cumActual},
           {name:'Target',color:'var(--viz-2)',values:cumTarget}],
          {title:'MTD trend, target vs actual',compact:true,
           cap:'Cumulative, by day of '+monthName(thisM)})
        : repPanel('MTD trend, target vs actual',
            blank('No lead target set','The line needs a target for '+monthName(thisM)+', set under Targets.'))}
    </div>

    <div class="homegrid">
      ${noStage?'':repPanel('Conversion funnel',gFunnel([
        /* one hue darkening down the funnel. It used to run s2, s4, viz-1,
           and s4 against viz-1 is a colourblind delta of 1.1 - the same
           colour to any eye. These steps are three apart. */
        ['Total',got.length,'var(--viz-s1)'],
        ['Qualified',qualified.length,'var(--viz-s3)'],
        ['Quotation',toQuot.length,'var(--viz-s5)'],
        ['Won',toWon.length,'var(--viz-good)']
      ])+ledger([
        ['Lead to qualified',pct(qualified.length,got.length)],
        ['Qualified to quotation',pct(toQuot.length,qualified.length)],
        ['Lead to won',pct(toWon.length,got.length)]
      ]))}

      ${repPanel('Daily and monthly summary',ledger([
        ['Monthly lead target',leadTarget??'\u2014',leadTarget?mtd.length+' so far':'set under Targets'],
        ['Monthly budget',budget==null?'\u2014':fmtMoney(budget),
          spend==null?'nothing spent recorded':fmtMoney(spend)+' spent'],
        ['Target CPL',cash(targetCpl),cpl==null?'':'actual '+cash(cpl)],
        ['Pacing',pacing==null?'\u2014':(pacing>0?'+':'')+pacing+'%',
          pacing==null?'needs a lead target':(pacing>=0?'ahead':'behind')+' on day '+dayNow+' of '+dim]
      ]))}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">Leads by channel, last twelve months</h3>
    ${months.length?barChart(months,counts,used)
      :blank('Nothing to chart yet','The breakdown by channel appears once leads have been created.')}

    <h3 style="font-size:15px;margin:22px 0 8px">Channel detail ${esc(per==='ever'?'':per)}</h3>
    ${got.length?`<div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Channel</th><th>Leads</th>${noStage?'':`<th>Qualified</th><th>Qualification rate</th>
      <th>Quotation sent</th><th>Closed-Won</th><th>Lead to won</th>`}
    </tr></thead><tbody>`+[...MKT_CH,'Other'].map(c=>{
      const set=got.filter(l=>chOf(l)===c);
      if(!set.length)return '';
      const q=set.filter(l=>qualText(l)==='Qualified');
      const qt=set.filter(l=>everReached(reached,l,'quotation_sent'));
      const w=set.filter(l=>everReached(reached,l,WON));
      return `<tr><td><b>${esc(c.replace(/_/g,' '))}</b></td><td>${set.length}</td>
        ${noStage?'':`<td>${q.length}</td><td>${pct(q.length,set.length)}</td>
        <td>${qt.length}</td><td>${w.length}</td><td>${pct(w.length,set.length)}</td>`}</tr>`;
    }).join('')+`</tbody></table></div>`
    :blank('No leads in this window','Widen the period to see the channel breakdown.')}`;
}
