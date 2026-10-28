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

  const qualified=got.filter(l=>isQualLead(l));
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
  const mtdQual=mtd.filter(l=>isQualLead(l));
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
  const subQ=s=>got.filter(l=>l.lead_sub_channel===s&&isQualLead(l)).length;
  const subD=s=>got.filter(l=>l.lead_sub_channel===s&&!isQualLead(l)).length;

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
  /* marketing see qualified and disqualified on this dashboard (Kevin, 28 Oct
     2026); their lead list still hides the stage */
  const noStage=false;

  /* leads carry a creation date, so this month against last is real */
  const thisM=mStart.slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const inMonth=(l,m)=>localDay(dayOf(l)).slice(0,7)===m;
  const madeIn=m=>rows.filter(l=>inMonth(l,m)).length;
  const prevWord=monthName(prevM);

  /* laid out like Management and Operations (council, 28 Oct 2026): logo and
     facts, dark band, the boxes, then panels with big headings */
  const xl=l=>({Ref:l.ref_id||'',Customer:l.customer_name||'',Channel:String(chOf(l)).replace(/_/g,' '),Sub:l.lead_sub_channel||'','Lead date':localDay(dayOf(l)),Phone:l.phone?'Yes':'No',Status:qualText(l)});
  const mkEnd=range[1]<localDay(new Date())?range[1]:localDay(new Date());
  const mkStart=REPPERIOD==='all'?(rows.map(l=>localDay(dayOf(l))).filter(Boolean).sort()[0]||mkEnd):range[0];
  const mkDays=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5)+1;
  const mkFmt=d=>new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const mkOne=mkStart.slice(8)==='01'&&mkStart.slice(0,7)===mkEnd.slice(0,7);
  const mkBand=(mkOne?new Date(mkStart+'T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'})
    :mkFmt(mkStart)+' - '+mkFmt(mkEnd)).toUpperCase();

  /* the counts every block below reads (council, 28 Oct 2026): leads, with a
     phone, qualified, closed-lost, disqualified, not yet - the same tests the
     Management board uses - and qualified by lead month, last against this */
  /* qualified = ever qualified, lost since or not - Management's rule, so
     the two boards agree; Closed-Lost is the part of it lost since */
  const everQ=l=>qualText(l)==='Qualified';
  const qualAll=got.filter(everQ);
  const withPhone=got.filter(l=>l.phone);
  const closedLost=got.filter(isClosedLost);
  const disq=got.filter(isDisqualified);
  const qThis=rows.filter(l=>inMonth(l,thisM)&&everQ(l));
  const qPrev=rows.filter(l=>inMonth(l,prevM)&&everQ(l));
  const cpqlM=spend!=null&&qThis.length?spend/qThis.length:null;
  const cnt=set=>{const q=set.filter(everQ).length,c=set.filter(isClosedLost).length,d=set.filter(isDisqualified).length;
    return {n:set.length,ph:set.filter(l=>l.phone).length,q,c,d,y:set.length-q-d};};
  const ZERO='<span class="quiet">—</span>';
  const z=v=>v?v:ZERO;
  const pc=(a,b)=>b&&a?` <span class="quiet">${Math.round(a/b*100)}%</span>`:'';
  const MIX=[['Qualified, still open','var(--c-qual)'],['Closed-Lost','var(--c-lost)'],['Disqualified','var(--c-disq)']];
  const mix=s=>s.n?`<span class="sqmix">${[s.q-s.c,s.c,s.d].map((v,i)=>v?`<i style="width:${v/s.n*100}%;background:${MIX[i][1]}" title="${MIX[i][0]}: ${v}"></i>`:'').join('')}</span>`:'';
  const trend=(a,b)=>`${z(a)} <span class="quiet">→</span> <b>${z(b)}</b>${b>a?' <span class="cmpup">▲</span>':b<a?' <span class="cmpdown">▼</span>':''}`;
  /* one row per channel with its sub-channels under it, largest first */
  const scoreRows=[...MKT_CH,'Other'].map(c=>{
    const set=got.filter(l=>chOf(l)===c);
    const all=rows.filter(l=>chOf(l)===c);
    const subsOf=[...new Set(set.map(l=>l.lead_sub_channel||'(none)'))]
      .map(n=>[n,set.filter(l=>(l.lead_sub_channel||'(none)')===n),all.filter(l=>(l.lead_sub_channel||'(none)')===n)])
      .sort((a,b)=>b[1].length-a[1].length);
    return [c,set,all,subsOf];}).filter(r=>r[1].length);
  const line=(name,set,all,cls)=>{const s=cnt(set);
    const qa=all.filter(l=>inMonth(l,prevM)&&everQ(l)).length,qb=all.filter(l=>inMonth(l,thisM)&&everQ(l)).length;
    return `<tr class="${cls}"><td>${cls==='scch'?`<b>${esc(name)}</b>`:`<span class="scsub">${esc(name)}</span>`}</td>
      <td><b>${s.n}</b></td><td>${z(s.ph)}${pc(s.ph,s.n)}</td><td>${z(s.q)}${pc(s.q,s.n)}</td><td>${z(s.c)}</td><td>${z(s.d)}</td><td>${z(s.y)}</td>
      <td class="nowrap">${trend(qa,qb)}</td><td>${mix(s)}</td></tr>`;};
  xrows({'Channel scorecard':scoreRows.flatMap(([c,set,all,subsOf])=>[[c.replace(/_/g,' '),'',set,all]].concat(subsOf.map(([n,s,a])=>[c.replace(/_/g,' '),n,s,a])))
    .map(([c,n,set,all])=>{const s=cnt(set);return {Channel:c,'Sub-channel':n||'(all)',Leads:s.n,'With phone':s.ph,Qualified:s.q,'Closed-Lost':s.c,Disqualified:s.d,'Not yet':s.y,
      ['Qualified '+prevWord]:all.filter(l=>inMonth(l,prevM)&&everQ(l)).length,['Qualified '+monthName(thisM)]:all.filter(l=>inMonth(l,thisM)&&everQ(l)).length};})});
  const T=cnt(got);
  const scorecard=got.length?`<div class="tablewrap"><table class="table-compact sctable"><thead><tr>
      <th>Channel / Sub-channel</th><th>Leads</th><th>With phone</th><th>Qualified</th><th>Closed-Lost</th><th>Disqualified</th><th>Not yet</th>
      <th>Qualified ${esc(prevWord)} → ${esc(monthName(thisM))}</th>
      <th><span class="sclegend">${MIX.map(([k,c])=>`<i style="background:${c}" title="${k}"></i>`).join('')}</span>Mix</th></tr></thead><tbody>`
    +scoreRows.map(([c,set,all,subsOf])=>line(c.replace(/_/g,' '),set,all,'scch')+subsOf.map(([n,s,a])=>line(n,s,a,'scsubrow')).join('')).join('')
    +`</tbody><tfoot><tr class="srtotal"><td><b>Total</b></td><td><b>${T.n}</b></td><td><b>${T.ph}</b></td><td><b>${T.q}</b></td><td><b>${T.c}</b></td><td><b>${T.d}</b></td><td><b>${T.y}</b></td>
      <td class="nowrap"><b>${qPrev.length} → ${qThis.length}</b></td><td></td></tr></tfoot></table></div>`
    :blank('No leads in this window','');

  /* qualified per channel per lead month, last twelve months */
  const qMonths=lastMonths(rows,dayOf,12);
  const CHCOL={Digital_Marketing:'var(--viz-1)',Offline_Marketing:'var(--viz-3)',Third_Party:'var(--viz-2)',Direct_Sales:'var(--viz-good)',Existing_Customer:'var(--viz-4)',Other:'var(--viz-mute)'};
  const qSeries=[...MKT_CH,'Other'].map(c=>({name:c.replace(/_/g,' '),color:CHCOL[c],
    values:qMonths.map(m=>rows.filter(l=>chOf(l)===c&&inMonth(l,m)&&everQ(l)).length)})).filter(s=>s.values.some(Boolean));
  /* best sub-channels by qualification rate - only those with enough leads to mean it */
  const rateRows=[...new Set(got.map(l=>l.lead_sub_channel).filter(Boolean))]
    .map(n=>{const s=got.filter(l=>l.lead_sub_channel===n);return [n,s.length,s.filter(everQ).length];})
    .filter(r=>r[1]>=2).sort((a,b)=>b[2]/b[1]-a[2]/a[1]||b[1]-a[1]).map(r=>[r[0]+' ('+r[1]+')',Math.round(r[2]/r[1]*100)]);

  $('main').innerHTML=repBar('Marketing dashboard')+`
    <div class="mg-head">
      <img src="img/logo.png" alt="Solarworks" onerror="this.remove()">
      <div class="mg-facts">
        <span>Start date</span><b>${esc(mkFmt(mkStart))}</b>
        <span>Today</span><b>${esc(mkFmt(mkEnd))}</b>
        <span>Days passed</span><b>${mkDays(mkStart,mkEnd)}</b>
      </div>
    </div>
    <div class="mg-band">${esc(mkBand)} MARKETING DASHBOARD</div>
    <div class="kpis seven mk6">
      ${kpi({label:'Leads Received',value:got.length,lead:true,x:got.map(xl),
        delta:momPct(madeIn(thisM),madeIn(prevM)),deltaOf:prevWord})}
      ${kpi({label:'With Phone',value:withPhone.length+(got.length?' ('+Math.round(withPhone.length/got.length*100)+'%)':''),x:withPhone.map(xl)})}
      ${kpi({label:'Qualified',value:qualAll.length+(got.length?' ('+Math.round(qualAll.length/got.length*100)+'%)':''),x:qualAll.map(xl)})}
      ${kpi({label:'Disqualified',value:disq.length,x:disq.map(xl)})}
      ${kpi({label:'Qualified '+monthName(thisM),value:qThis.length,x:qThis.map(xl),
        delta:momPct(qThis.length,qPrev.length),deltaOf:prevWord})}
      ${kpi({label:'Cost per Qualified Lead',value:cash(cpqlM)})}
    </div>

    <div class="homegrid mgrid mkwide">
      ${repPanel('Channel scorecard',scorecard)}
    </div>

    <div class="homegrid level mgrid">
      ${leadTarget&&days.length>1
        ?lineChart(days.map(String),
          [{name:'Actual',color:'var(--viz-1)',values:cumActual},
           {name:'Target',color:'var(--viz-2)',values:cumTarget}],
          {title:'MTD trend, target vs actual',compact:true})
        : repPanel('MTD trend, target vs actual',blank('No lead target set',''))}
      ${repPanel('Conversion funnel',xrows({'With phone':withPhone.map(xl),'Won':toWon.map(xl)})+gFunnel([
        ['Leads',got.length,'var(--viz-s1)'],
        ['With phone',withPhone.length,'var(--viz-s3)'],
        ['Qualified',qualAll.length,'var(--c-qual)'],
        ['Won',toWon.length,'var(--viz-good)']
      ])+ledger([
        ['Lead to phone',pct(withPhone.length,got.length)],
        ['Phone to qualified',pct(qualAll.length,withPhone.length)],
        ['Lead to won',pct(toWon.length,got.length)]
      ]))}
    </div>

    <div class="homegrid level mgrid">
      ${qSeries.length?groupChart(qMonths.map(monthName),qSeries,{title:'Qualified by channel, last twelve months',stacked:true,compact:true,noSide:true})
        :repPanel('Qualified by channel, last twelve months',blank('Nothing to chart yet',''))}
      ${repPanel('Sub-channels by qualification rate',rateRows.length
        ?gRank(rateRows,{color:'var(--c-qual)',order:true,keepZero:true,limit:rateRows.length,fmt:v=>v+'%'})
        :blank('No sub-channel with 2 leads or more',''))}
    </div>

    <div class="homegrid level mgrid">
      ${repPanel('Daily and monthly summary',ledger([
        ['Monthly lead target',leadTarget??'—',leadTarget?mtd.length+' so far':''],
        ['Monthly budget',budget==null?'—':fmtMoney(budget),spend==null?'':fmtMoney(spend)+' spent'],
        ['Cost per lead',cash(cpl),targetCpl==null?'':'target '+cash(targetCpl)],
        ['Pacing',pacing==null?'—':(pacing>0?'+':'')+pacing+'%',
          pacing==null?'':(pacing>=0?'ahead':'behind')+' on day '+dayNow+' of '+dim]
      ]))}
      ${colChart(MKT_CH.map(c=>c.replace(/_/g,' ')),MKT_CH.map(c=>byCh(c)),
        {title:'Lead gen by channel type',color:'var(--viz-1)',compact:true,table:false})}
    </div>

    <div class="homegrid mgrid mkwide">
      ${months.length?barChart(months,counts,used)
        :repPanel('Leads by channel, last twelve months',blank('Nothing to chart yet',''))}
    </div>`;
}
