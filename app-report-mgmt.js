/* ---------------- MANAGEMENT REPORT ----------------
   Kevin's hand-drawn "September 2026 Sales & Pipeline Dashboard", photographed
   16 Sep 2026 and built here as a fourth Reports scope for the manager and
   admin. Its panels are his, in his order.

   Settled with him before any of it was written:
     - the KPI row is about MONEY COLLECTED. Monthly Target is a collection
       target in dollars, Achievement is collected over target, Remaining is
       target minus collected, and Run Rate projects this month's collection.
     - all FIVE channels are carried, not the four the sheet says. It was drawn
       before Existing_Customer existed.
     - the raw lead target is one COMPANY number, the null-profile row in
       `targets`, not a target per marketing person.
     - closed-lost counts the app's own seven reasons. His sheet lists five of
       his own wording and he chose ours: "the reason pick from the system not
       from sketch".
     - Residential against C&I is `customer_type`, which holds exactly those
       two values.

   The last panel is his thirteenth, asked for on the day: closed-lost split by
   whether a quotation had already gone out. Losing somebody who never got a
   price is a different failure from losing somebody who did.

   READ THAT SPLIT OFF `quotations`, NEVER OFF THE STAGE. Counted on the 27
   real leads that day: 26 sat on info_gathering and one on quotation_sent,
   while six of them already had quotations, and the whole stage_change log
   held one row. Sales quote without moving the stage, so everReached would
   report "lost before quotation" for leads that demonstrably had one out. A
   quotation row is written by the act of making the quotation and cannot
   drift. The same caveat is why nothing else here leans on stage history. */

/* the five channels, in the order the New lead form offers them */
const MG_CHANNELS=['Digital_Marketing','Third_Party','Direct_Sales','Offline_Marketing','Existing_Customer'];
/* the live rungs, which is what "active pipeline" means on his sheet */
const MG_ACTIVE=['info_gathering','telling_price','pending_quotation','quotation_sent','follow_up','agreement_signoff'];

async function renderMgmtReport(){
  if(!['manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('Not your report','The management dashboard is for the manager and admin.');
    return;
  }
  const rows=await fetchLeads(q=>q);
  const ids=rows.map(l=>l.id);
  const range=repRange(REPPERIOD);
  const per=repPeriodWord();
  const mStart=monthStart(), today=localDay(new Date());

  const [tg,acts,quots,fins,pays,finrows]=await Promise.all([
    loadTargets(mStart),
    repByIds(()=>sb.from('lead_activities').select('lead_id,activity_type,created_at,note_date').in('activity_type',['call','note']).order('id'),ids),
    repByIds(()=>sb.from('quotations').select('lead_id,price_usd,provided_by,released_date,created_at').order('created_at').order('id'),ids),
    repByIds(()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id'),ids),
    repByIds(()=>sb.from('lead_payments').select('lead_id,amount_usd,other_fee_usd,paid_on').order('id'),ids),
    repByIds(()=>sb.from('lead_finance').select('lead_id,contract_total_usd,follow_up_date').order('lead_id'),ids)
  ]);

  const actsBy={},quotBy={},saleBy={},finBy={},paidBy={},feeBy={};
  acts.forEach(a=>(actsBy[a.lead_id]=actsBy[a.lead_id]||[]).push(a));
  quots.forEach(q=>quotBy[q.lead_id]=q);
  fins.forEach(f=>saleBy[f.lead_id]=Number(f.final_sale_usd||0));
  finrows.forEach(f=>finBy[f.lead_id]=f);
  pays.forEach(p=>{paidBy[p.lead_id]=(paidBy[p.lead_id]||0)+Number(p.amount_usd||0);
                   feeBy[p.lead_id]=(feeBy[p.lead_id]||0)+Number(p.other_fee_usd||0);});
  /* a lead that has a quotation against it had a price out, whatever its stage
     says. This is the one test the closed-lost split turns on. */
  const wasQuoted=l=>!!quotBy[l.id];

  const inWin=v=>REPPERIOD==='all'||inRange(v,range);
  /* the day the lead came in, which is the writer's own date and not the
     server's - a lead keyed in at 9pm in Phnom Penh is still that day */
  const dayOf=l=>l.lead_date||l.created_at;
  const got=rows.filter(l=>inWin(dayOf(l)));
  const open=rows.filter(l=>!TERMINAL.includes(l.stage_code));
  const won=rows.filter(l=>l.stage_code===WON);
  const wonInWin=won.filter(l=>inWin(l.stage_entered_at));
  const lostInWin=rows.filter(l=>l.stage_code===LOST&&inWin(l.stage_entered_at));

  /* ---- the KPI row: collection ---- */
  const dueOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0)+(feeBy[l.id]||0);
  const owedOf=l=>Math.max(0,dueOf(l)-(paidBy[l.id]||0));
  const collected=pays.filter(p=>inWin(p.paid_on)).reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const outstanding=won.reduce((a,l)=>a+owedOf(l),0);
  const owingNoDate=won.filter(l=>owedOf(l)>0.005&&!(finBy[l.id]&&finBy[l.id].follow_up_date)).length;
  /* every person's collection target added up is the company's for the month.
     `targets` carries collection per person, so the team figure is derived
     rather than typed twice. */
  const target=Object.values(tg.person).reduce((a,v)=>a+Number(v.collection||0),0);
  /* Run rate is a statement about THIS MONTH and must not follow the window
     switch: projecting a year of collection across thirty-one days is not a
     forecast. */
  const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const dayNow=new Date().getDate();
  const mtdCollected=pays.filter(p=>localDay(p.paid_on)>=mStart&&localDay(p.paid_on)<=today)
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const runRate=dayNow?mtdCollected/dayNow*dim:null;
  /* THE TARGET IS MONTHLY, SO WHAT IT IS COMPARED WITH MUST BE. These used to
     divide `collected` - which follows the window switch - by this month's
     target, so on All time they read every dollar ever banked against one
     month's bar and printed achievements in the hundreds of percent. They
     follow month-to-date now, like the run rate beside them, and the cards
     say which month. */
  const achievement=target?Math.round(mtdCollected/target*100):null;
  const remaining=target?Math.max(0,target-mtdCollected):null;
  const runPct=(target&&runRate!=null)?Math.round(runRate/target*100):null;

  /* ---- raw leads against target ----
     Target and actual both count MARKETING'S OWN CHANNELS ONLY - digital and
     offline - which is what his sheet writes under the axis. Third party,
     direct sales and a customer coming back are not leads marketing generated,
     so counting them would flatter the number the target is set against. */
  const leadTarget=Number(tg.company.leads||0);
  const MG_MARKETING=['Digital_Marketing','Offline_Marketing'];
  const qualified=got.filter(l=>qualText(l)==='Qualified');

  /* ---- per person, on whoever holds the rows ---- */
  const holders=new Set(rows.filter(l=>l.assigned_to).map(l=>l.assigned_to));
  /* active sales and managers, plus anyone still holding a lead - the rule
     assignable() uses, and the one the sales report was given. Without the
     active test the four dead test accounts sat on every per-person chart. */
  const people=STAFF.filter(s=>(s.is_active&&['sales','manager'].includes(s.role))||holders.has(s.id));
  const nameOf=id=>staffName(id);

  /* a column chart draws nothing for a zero, so an axis of people who have
     collected nothing and quoted nothing is an empty frame. Only whoever has
     a figure goes on it, and the panel says so when nobody has. */
  const pct=repPct, cash=repCash;

  /* collection per salesperson: money received in the window, against the
     person the lead is assigned to rather than whoever banked it */
  /* indexed once rather than rows.find() per payment, and money on a lead
     nobody holds keeps its own column - it used to vanish from this chart
     while still counting in the headline above it, so the columns did not add
     up to the figure they sit under. */
  const leadById={}; rows.forEach(l=>leadById[l.id]=l);
  const collByPerson={}; let collUnassigned=0;
  pays.filter(p=>inWin(p.paid_on)).forEach(p=>{
    const l=leadById[p.lead_id], amt=Number(p.amount_usd||0);
    if(!l||!l.assigned_to){collUnassigned+=amt;return;}
    collByPerson[l.assigned_to]=(collByPerson[l.assigned_to]||0)+amt;
  });
  const collPeople=people.filter(p=>(collByPerson[p.id]||0)>0);

  /* quotations sent, counted per person on who released them */
  const quotByPerson={};
  quots.filter(q=>inWin(q.released_date||q.created_at)).forEach(q=>{
    const k=q.provided_by||'none'; quotByPerson[k]=(quotByPerson[k]||0)+1;});
  const quotPeople=Object.entries(quotByPerson)
    .map(([id,n])=>[id==='none'?'Not recorded':nameOf(id),n]).filter(r=>r[1]>0);

  /* Average customer contacts a day. A contact is a line in the contact log;
     the divisor is the days that person actually logged something on, not the
     days in the window - somebody who logged four calls on one day averaged
     four a day, not four over thirty. */
  const contactAvg=people.map(p=>{
    const mine=rows.filter(l=>l.assigned_to===p.id);
    const notes=[];
    /* note_date is the day the contact happened and is the writer's own;
       created_at is only the audit trail. A call on Monday typed up on
       Wednesday belongs to Monday. */
    mine.forEach(l=>(actsBy[l.id]||[]).forEach(a=>{
      if(!['call','note'].includes(a.activity_type))return;
      const d=a.note_date||a.created_at;
      if(inWin(d))notes.push(localDay(d));}));
    const days=new Set(notes).size;
    return [p.full_name,days?+(notes.length/days).toFixed(2):0,notes.length,days,p.id];
  }).filter(r=>r[2]>0);

  /* leads handled against leads still active, per person */
  const handled=people.map(p=>{
    const mine=rows.filter(l=>l.assigned_to===p.id);
    return {name:p.full_name,
      handled:mine.filter(l=>inWin(dayOf(l))).length,
      active:mine.filter(l=>!TERMINAL.includes(l.stage_code)).length};
  }).filter(r=>r.handled||r.active);

  /* ---- closed-lost ---- */
  const reasons={};
  lostInWin.forEach(l=>{const r=l.lost_reason||'Not recorded';reasons[r]=(reasons[r]||0)+1;});
  /* read through quoteStage, the one rule the Lost list uses too. It had an
     'unknown' group until the client's quotation history was imported;
     lostUnknown stays so the panel cannot break if one is ever needed again */
  const lostAfter=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='after');
  const lostBefore=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='before');
  const lostUnknown=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='unknown');
  const lostAfterValue=lostAfter.reduce((a,l)=>a+Number(quotBy[l.id]?.price_usd||0),0);

  /* ---- month by month ---- */
  const months=lastMonths(rows,dayOf,12);
  const madeIn=m=>rows.filter(l=>localDay(dayOf(l)).slice(0,7)===m);
  const qualIn=m=>madeIn(m).filter(l=>qualText(l)==='Qualified');
  /* their sheet shows six months of conversion, April to September */
  const convMonths=months.slice(-6);

  const thisM=mStart.slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const paidIn=m=>pays.filter(p=>p.paid_on&&localDay(p.paid_on).slice(0,7)===m)
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const prevWord=monthName(prevM);

  /* Lead trend from marketing, day by day through this month, the way their
     sheet draws it: 1 to today along the bottom, raw and qualified. Headed
     "from marketing", so marketing's own two channels only. */
  const days=Array.from({length:dayNow},(_,i)=>i+1);
  const dayKey=d=>thisM+'-'+String(d).padStart(2,'0');
  const mktDay={},qualDay={};
  rows.forEach(l=>{
    if(!MG_MARKETING.includes(l.lead_channel))return;
    const k=localDay(dayOf(l));
    if(k.slice(0,7)!==thisM)return;
    mktDay[k]=(mktDay[k]||0)+1;
    if(qualText(l)==='Qualified')qualDay[k]=(qualDay[k]||0)+1;
  });

  /* stage distribution, his four bars */
  const stageDist=[
    ['Raw Lead',got.length,'var(--ink)'],
    ['Qualified Lead',qualified.length,'var(--viz-2)'],
    ['Closed-Won',wonInWin.length,'var(--viz-good)'],
    ['Closed-Lost',lostInWin.length,'var(--viz-1)']
  ];

  /* Residential against C&I, per salesperson, two columns each */
  const typePeople=people.filter(p=>got.some(l=>l.assigned_to===p.id));
  const typeOf=(p,want)=>got.filter(l=>l.assigned_to===p.id&&l.customer_type===want).length;

  /* against a MONTHLY target, so this month's leads - never the window's. On
     All time it put 2,711 leads beside a target of 50. */
  const mktLeads=rows.filter(l=>MG_MARKETING.includes(l.lead_channel)&&localDay(dayOf(l)).slice(0,7)===thisM).length;

  /* ONE COLOUR PER PERSON, THE SAME ON EVERY CHART. Their sheet gives each
     salesperson a colour and then changes it from chart to chart; here Morn is
     the same colour wherever Morn appears. */
  const PCOL=['var(--viz-2)','var(--viz-mute)','var(--ink)','var(--viz-1)','var(--viz-3)','var(--viz-4)','var(--viz-good)'];
  const colOf={}; people.forEach((p,i)=>colOf[p.id]=PCOL[i%PCOL.length]);
  const first=p=>p.full_name.split(' ')[0];

  /* Total contract value by each sales: deals won in the window, at the
     contract figure where finance has one and the sale value where not */
  const valueOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0);
  const tcvBy={}; wonInWin.forEach(l=>{if(l.assigned_to)tcvBy[l.assigned_to]=(tcvBy[l.assigned_to]||0)+valueOf(l);});
  const tcvPeople=people.filter(p=>(tcvBy[p.id]||0)>0);

  /* Sales and lead summary: what each person holds open against what they won */
  const summary=people.map(p=>({p,
    active:open.filter(l=>l.assigned_to===p.id).length,
    won:wonInWin.filter(l=>l.assigned_to===p.id).length})).filter(r=>r.active||r.won);

  /* quotations sent, per person, coloured by that person where they hold a colour */
  const quotRows=Object.entries(quotByPerson).filter(r=>r[1]>0);

  /* the facts block at the top right of their sheet */
  const monthLong=new Date(mStart+'T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}).toUpperCase();
  const fmtDay=d=>new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const expected=mtdCollected+outstanding;
  const pct2=v=>v==null?'—':v.toFixed(2)+'%';
  const moneyAxis=v=>!v?'$0':v>=1000?'$'+(v/1000)+'k':'$'+v;

  $('main').innerHTML=repBar('Management dashboard')+`
    <div class="mg-head">
      <img src="img/logo.png" alt="Solarworks" onerror="this.remove()">
      <div class="mg-facts">
        <span>Days in month</span><b>${dim}</b>
        <span>Start date</span><b>${esc(fmtDay(mStart))}</b>
        <span>Today</span><b>${esc(fmtDay(today))}</b>
        <span>Days passed</span><b>${dayNow}</b>
      </div>
    </div>
    <div class="mg-band">${esc(monthLong)} SALES &amp; PIPELINE DASHBOARD</div>
    <div class="kpis seven">
      <!-- their seven boxes, in their order and their wording. The row is this
           month's, as the band above it says, whatever window is picked. -->
      ${kpi({label:'Monthly Target',value:cash(target||null)})}
      ${kpi({label:'Payment Collected',value:cash(mtdCollected),lead:true,
        delta:momPct(paidIn(thisM),paidIn(prevM)),deltaOf:prevWord})}
      ${kpi({label:'Outstanding Payment',value:cash(outstanding),
        note:owingNoDate?owingNoDate+' with no date set':''})}
      ${kpi({label:'Total Payment Expected',value:cash(expected),note:'collected + outstanding'})}
      ${kpi({label:'Achievement %',value:target?pct2(mtdCollected/target*100):'—'})}
      ${kpi({label:'Target Remaining',value:remaining==null?'—':cash(remaining)})}
      ${kpi({label:'Run Rate %',value:(target&&runRate!=null)?pct2(runRate/target*100):'—',
        note:runRate==null?'':cash(runRate)+' by month end'})}
    </div>
    ${!target?`<div class="hint">No collection target set for ${esc(monthName(thisM))}.</div>`:''}

    <div class="homegrid three">
      ${leadTarget?colChart(['Raw Lead Target','Raw Lead'],[leadTarget,mktLeads],
        {title:'Raw lead target vs actual',colors:['var(--ink)','var(--viz-1)'],table:false,compact:true,
         cap:'Digital and offline marketing, '+monthName(thisM)})
        :emptyChart('Raw lead target vs actual','No lead target set',
          'Set one for '+monthName(thisM)+' under Targets. '+mktLeads+' received so far.')}
      ${colChart(stageDist.map(r=>r[0]),stageDist.map(r=>r[1]),
        {title:'Lead stage distribution',colors:stageDist.map(r=>r[2]),
         table:false,compact:true,cap:'All five channels'})}
      ${lineChart(days.map(String),
        [{name:'# Raw Lead',color:'var(--viz-2)',values:days.map(d=>mktDay[dayKey(d)]||0)},
         {name:'# Qualified Lead',color:'var(--viz-1)',values:days.map(d=>qualDay[dayKey(d)]||0)}],
        {title:'Lead trend from marketing',compact:true,values:true,cap:'Each day of '+monthName(thisM)})}
    </div>

    <div class="homegrid three">
      ${convMonths.length
        ?lineChart(convMonths.map(m=>monthName(m)),
          [{name:'Conversion',color:'var(--viz-2)',
            values:convMonths.map(m=>{const r=madeIn(m).length;return r?+(qualIn(m).length/r*100).toFixed(2):0;})}],
          {title:'Conversion % from raw lead to qualified lead',compact:true,values:true,fmt:v=>v.toFixed(2)+'%'})
        :emptyChart('Conversion % from raw lead to qualified lead','No months to show yet','This fills in as leads accumulate.')}
      ${collPeople.length
        ?colChart(collPeople.map(first).concat(collUnassigned?['Unassigned']:[]),
          collPeople.map(p=>collByPerson[p.id]||0).concat(collUnassigned?[collUnassigned]:[]),
          {title:'Payment collection by each sales',colors:collPeople.map(p=>colOf[p.id]).concat(['var(--viz-mute)']),
           compact:true,table:false,fmt:cash,axisFmt:moneyAxis})
        :emptyChart('Payment collection by each sales','Nothing collected '+per,'This fills in as payments are recorded.')}
      ${tcvPeople.length
        ?colChart(tcvPeople.map(first),tcvPeople.map(p=>tcvBy[p.id]),
          {title:'Total contract value (USD) by each sales',colors:tcvPeople.map(p=>colOf[p.id]),
           compact:true,table:false,fmt:cash,axisFmt:moneyAxis,cap:'Deals won '+per})
        :emptyChart('Total contract value (USD) by each sales','Nothing won '+per,'This fills in as deals are won.')}
    </div>

    <div class="homegrid three">
      ${summary.length
        ?groupChart(summary.map(r=>first(r.p)),
          [{name:'# of Active Lead',color:'var(--ink)',values:summary.map(r=>r.active)},
           {name:'# Closed Won',color:'var(--viz-1)',values:summary.map(r=>r.won)}],
          {title:'Sales and lead summary',compact:true})
        :emptyChart('Sales and lead summary','Nobody holds a lead yet','This fills in as leads are assigned.')}
      ${repPanel('Active pipeline stage',
        open.length
          ?gRank(MG_ACTIVE.map(code=>[(STAGES.find(s=>s.stage_code===code)||{}).stage_name||code,
              open.filter(l=>l.stage_code===code).length]),
             {color:'var(--ink)',limit:MG_ACTIVE.length,order:true,keepZero:true,
              emptyWhy:'This fills in as leads move through the pipeline.'})
          :blank('Nothing open','Every lead is won or lost.'))}
      ${repPanel('Closed-lost status',
        lostInWin.length
          ?gRank(Object.entries(reasons),{color:'var(--viz-2)',limit:12,
             emptyWhy:'This fills in as leads are lost.'})
            +`<div class="cap" style="margin-top:10px"><b>*Note:</b> closed-lost ${esc(per)}, including leads that came in earlier.</div>`
          :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'))}
    </div>

    <div class="homegrid three">
      ${contactAvg.length
        ?colChart(contactAvg.map(r=>r[0].split(' ')[0]),contactAvg.map(r=>r[1]),
          {title:'Avg. daily contact to customer',colors:contactAvg.map(r=>colOf[r[4]]),compact:true,table:false,
           fmt:v=>v.toFixed(2)})
        :emptyChart('Avg. daily contact to customer','No contacts logged','Nothing in the contact log '+per+'.')}
      ${handled.length
        ?groupChart(handled.map(r=>r.name.split(' ')[0]),
          [{name:'Handled '+per,color:'var(--viz-2)',values:handled.map(r=>r.handled)},
           {name:'# of Active Lead',color:'var(--viz-1)',values:handled.map(r=>r.active)}],
          {title:'# of leads held and # of active lead',compact:true})
        :emptyChart('# of leads held and # of active lead','Nobody holds a lead yet','This fills in as leads are assigned.')}
      ${typePeople.length
        ?groupChart(typePeople.map(first),
          [{name:'Residential',color:'var(--viz-2)',values:typePeople.map(p=>typeOf(p,'Residential'))},
           {name:'C & I',color:'var(--viz-1)',values:typePeople.map(p=>typeOf(p,'C & I'))}],
          {title:'Residential and C & I',compact:true,cap:'By sale engineer'})
        :emptyChart('Residential and C & I','No customer type recorded','No lead in the window has the field filled in.')}
    </div>

    <div class="homegrid three">
      ${quotRows.length
        ?colChart(quotRows.map(([id])=>id==='none'?'Not recorded':nameOf(id).split(' ')[0]),quotRows.map(r=>r[1]),
          {title:'# of quotation sent',colors:quotRows.map(([id])=>colOf[id]||'var(--viz-mute)'),compact:true,table:false})
        :emptyChart('# of quotation sent','None released '+per,'This fills in as quotations are released.')}
      <!-- asked for on 16 Sep 2026 and not on their sheet, so it follows it -->
      ${repPanel('Closed-lost, before or after a quotation',
        lostInWin.length
          ?gSplit([['After a quotation',lostAfter.length,'var(--viz-1)'],
                   ['Before any quotation',lostBefore.length,'var(--viz-s2)'],
                   ['Unknown',lostUnknown.length,'var(--viz-mute)']],
              'after '+pct(lostAfter.length,lostAfter.length+lostBefore.length)+(lostUnknown.length?' of known':''),'before')
           +ledger([['After a quotation',lostAfter.length,cash(lostAfterValue)+' quoted'],
                    ['Before any quotation',lostBefore.length,''],
                    ...(lostUnknown.length?[['Unknown',lostUnknown.length,'imported, quotation not recorded']]:[])])
          :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'))}
    </div>
  `;
}
