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
    return [p.full_name,days?+(notes.length/days).toFixed(1):0,notes.length,days];
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
  /* three groups, not two: the imported leads that qualified and were lost
     carried no quotation records, and counting them "before" said nearly
     nobody was ever lost after a price - see quoteStage */
  const lostAfter=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='after');
  const lostBefore=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='before');
  const lostUnknown=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='unknown');
  const lostAfterValue=lostAfter.reduce((a,l)=>a+Number(quotBy[l.id]?.price_usd||0),0);

  /* ---- month by month ---- */
  const months=lastMonths(rows,dayOf,12);
  const madeIn=m=>rows.filter(l=>localDay(dayOf(l)).slice(0,7)===m);
  /* headed "from marketing", so it counts marketing's own channels - the same
     two the target above it is set against. It counted every channel, which
     put third party and repeat business on a marketing trend line. */
  const mktIn=m=>madeIn(m).filter(l=>MG_MARKETING.includes(l.lead_channel));
  const qualIn=m=>madeIn(m).filter(l=>qualText(l)==='Qualified');

  const thisM=mStart.slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const paidIn=m=>pays.filter(p=>p.paid_on&&localDay(p.paid_on).slice(0,7)===m)
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const prevWord=monthName(prevM);

  /* stage distribution, his four bars */
  /* a progression, so one hue darkening rather than four identities - except
     the last, which is not a further stage but the other outcome */
  const stageDist=[
    ['Raw lead',got.length,'var(--viz-s2)'],
    ['Qualified',qualified.length,'var(--viz-s4)'],
    ['Closed-Won',wonInWin.length,'var(--viz-good)'],
    ['Closed-Lost',lostInWin.length,'var(--bad)']
  ];

  /* Residential against C&I. The vocabulary holds exactly those two, so
     anything else is a lead nobody filled the field in on. */
  /* his sheet splits this per salesperson, two columns each, rather than
     giving the two totals for the whole company */
  const typePeople=people.filter(p=>got.some(l=>l.assigned_to===p.id));
  const typeOf=(p,want)=>got.filter(l=>l.assigned_to===p.id&&l.customer_type===want).length;

  const mktLeads=got.filter(l=>MG_MARKETING.includes(l.lead_channel)).length;

  $('main').innerHTML=repBar('Management dashboard')+`
    <div class="kpis six">
      <!-- his six boxes, in his order and his wording. They are the headings
           he reads the sheet by, so they are not tidied. -->
      ${kpi({label:'Monthly Target',value:cash(target||null)})}
      <!-- no alert stripe: red is danger here and nothing else, and being
           short of a monthly target part-way through the month is neither
           danger nor news. Achievement % beside it already says where it is. -->
      ${kpi({label:'Payment Collected',value:cash(collected),lead:true,
        delta:momPct(paidIn(thisM),paidIn(prevM)),deltaOf:prevWord,
        note:target?pct(collected,target)+' of target':''})}
      ${kpi({label:'Outstanding Payment',value:cash(outstanding),
        note:owingNoDate?owingNoDate+' with no date set':''})}
      ${kpi({label:'Achievement %',value:achievement==null?'—':achievement+'%'})}
      ${kpi({label:'Target Remaining',value:remaining==null?'—':cash(remaining)})}
      ${kpi({label:'Run Rate %',value:runPct==null?'—':runPct+'%',
        note:runRate==null?'':cash(runRate)+' by month end'
          +(runPct==null?', no target to measure it against':'')})}
    </div>
    ${!target?`<div class="hint">No collection target set for ${esc(monthName(thisM))}.</div>`:''}

    <div class="homegrid three">
      ${leadTarget?colChart(['Target','Actual'],[leadTarget,mktLeads],
        {title:'Raw lead target vs actual',colors:['var(--viz-mute)','var(--viz-1)'],table:false,compact:true,
         cap:'Digital and offline marketing'})
        /* with no target the Target column drew at zero height, which reads as
           a target of nothing rather than as no target at all */
        :emptyChart('Raw lead target vs actual','No lead target set',
          'Set one for '+monthName(thisM)+' under Targets. '+mktLeads+' received so far.')}
      ${colChart(stageDist.map(r=>r[0]),stageDist.map(r=>r[1]),
        {title:'Lead stage distribution',colors:stageDist.map(r=>r[2]),
         table:false,compact:true,cap:'All five channels'})}
      ${typePeople.length
        ?groupChart(typePeople.map(p=>p.full_name.split(' ')[0]),
          [{name:'Residential',color:'var(--viz-1)',values:typePeople.map(p=>typeOf(p,'Residential'))},
           {name:'C & I',color:'var(--viz-2)',values:typePeople.map(p=>typeOf(p,'C & I'))}],
          {title:'Residential vs C&I',compact:true,cap:'By sale engineer'})
        :emptyChart('Residential vs C&I','No customer type recorded',
          'No lead in the window has the field filled in.')}
    </div>

    <!-- From here down the rows are his, in the order he drew them: active
         pipeline beside collection, contacts beside closed-lost, quotations
         beside the lead trend, leads held beside the conversion. -->
    <div class="homegrid">
      ${repPanel('Active pipeline stage',
        open.length
          ?gRank(MG_ACTIVE.map(code=>[(STAGES.find(s=>s.stage_code===code)||{}).stage_name||code,
              open.filter(l=>l.stage_code===code).length]),
             {color:'var(--viz-1)',limit:MG_ACTIVE.length,order:true,keepZero:true,
              emptyWhy:'This fills in as leads move through the pipeline.'})
          :blank('Nothing open','Every lead is won or lost.'))}
      ${collPeople.length
        ?colChart(collPeople.map(p=>p.full_name.split(' ')[0]).concat(collUnassigned?['Unassigned']:[]),
          collPeople.map(p=>collByPerson[p.id]||0).concat(collUnassigned?[collUnassigned]:[]),
          {title:'Payment collection by each sales',color:'var(--viz-good)',compact:true,table:false,
           fmt:cash,axisFmt:v=>!v?'0':v>=1000?'$'+(v/1000)+'k':'$'+v})
        :repPanel('Payment collection by each sales',
          blank('Nothing collected '+per,'This fills in as payments are recorded.'))}
    </div>

    <div class="homegrid">
      ${contactAvg.length
        ?colChart(contactAvg.map(r=>r[0].split(' ')[0]),contactAvg.map(r=>r[1]),
          {title:'Avg customer contacts a day',color:'var(--viz-2)',compact:true,table:false})
        :repPanel('Avg customer contacts a day',
          blank('No contacts logged','Nothing in the contact log '+per+'.'))}
      ${repPanel('Closed-lost status',
        lostInWin.length
          ?gRank(Object.entries(reasons),{color:'var(--bad)',limit:12,
             emptyWhy:'This fills in as leads are lost.'})
          :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'))}
    </div>

    <div class="homegrid">
      ${quotPeople.length
        ?colChart(quotPeople.map(r=>r[0].split(' ')[0]),quotPeople.map(r=>r[1]),
          {title:'Quotations sent',color:'var(--viz-1)',compact:true,table:false})
        :repPanel('Quotations sent',
          blank('None released '+per,'This fills in as quotations are released.'))}
      ${months.length>1?lineChart(months.map(m=>monthName(m)),
        [{name:'Raw lead',color:'var(--viz-1)',values:months.map(m=>mktIn(m).length)},
         {name:'Qualified',color:'var(--viz-2)',values:months.map(m=>mktIn(m).filter(l=>qualText(l)==='Qualified').length)}],
        {title:'Lead trend from marketing',compact:true})
        :emptyChart('Lead trend from marketing','Not enough history yet',
          'A trend needs two months. There is '+(months.length||'no')+'.')}
    </div>

    <div class="homegrid">
      ${handled.length
        ?groupChart(handled.map(r=>r.name.split(' ')[0]),
          [{name:'Handled',color:'var(--viz-1)',values:handled.map(r=>r.handled)},
           {name:'Active',color:'var(--viz-2)',values:handled.map(r=>r.active)}],
          {title:'Leads held and active',compact:true})
        :repPanel('Leads held and active',
          blank('Nobody holds a lead yet','This fills in as leads are assigned.'))}
      ${months.length
        ?lineChart(months.map(m=>monthName(m)),
          [{name:'Conversion',color:'var(--viz-good)',
            values:months.map(m=>{const r=madeIn(m).length;return r?Math.round(qualIn(m).length/r*100):0;})}],
          {title:'Raw lead to qualified',compact:true,cap:'Percent qualified'})
        :repPanel('Raw lead to qualified',
          blank('No months to show yet','This fills in as leads accumulate.'))}
    </div>

    <!-- asked for on 16 Sep 2026 and not on the sheet, so it follows the rows
         that are. Nothing else does: leads by channel and won value by month
         were ours, were on neither, and were dropped. -->
    ${repPanel('Closed-lost, before or after a quotation',
      lostInWin.length
        ?gSplit([['After a quotation',lostAfter.length,'var(--bad)'],
                 ['Before any quotation',lostBefore.length,'var(--viz-s2)'],
                 ['Unknown',lostUnknown.length,'var(--viz-mute)']],
            'after '+pct(lostAfter.length,lostAfter.length+lostBefore.length)+' of known','before')
         +ledger([['After a quotation',lostAfter.length,cash(lostAfterValue)+' quoted'],
                  ['Before any quotation',lostBefore.length,''],
                  ...(lostUnknown.length?[['Unknown',lostUnknown.length,'imported, quotation not recorded']]:[])])
        :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'),true)}
  `;
}
