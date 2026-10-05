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
/* Conversion raw to qualified up to August 2026 is the client's own table, off
   the "summary table" sheet of their workbook: raw is rows on Raw Lead, qualified
   is Raw Lead rows with Status "Qualified". The app does not store that status,
   so it cannot recount it; these are their figures as written (28 Sep 2026).
   September onward is counted by the app. [raw, qualified] */
const CONV_HISTORY={
  '2025-07':[24,17],'2025-08':[88,24],'2025-09':[153,29],'2025-10':[133,23],
  '2025-11':[20,7],'2025-12':[41,7],'2026-01':[156,53],'2026-02':[335,61],
  '2026-03':[210,55],'2026-04':[259,69],'2026-05':[179,74],'2026-06':[160,60],
  '2026-07':[187,44],'2026-08':[409,29]
};
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
  /* THE BOARD'S MONTH FOLLOWS THE DATES PICKED (Kevin, 2 Oct 2026). Pick 1-30
     Sep and it is the September board as it stood on 30 Sep: its boxes, its
     target, its daily trend. Today, This month and All time keep this month.
     `today` is the board's "as of" day - the end picked, never past today. */
  const realToday=localDay(new Date());
  const today=REPPERIOD==='custom'&&range[1]<realToday?range[1]:realToday;
  const mStart=today.slice(0,7)+'-01';

  const [tg,acts,quots,fins,pays,finrows,expd]=await Promise.all([
    loadTargets(mStart),
    repByIds(()=>sb.from('lead_activities').select('lead_id,activity_type,created_at,note_date').in('activity_type',['call','note']).order('id'),ids),
    repByIds(()=>sb.from('quotations').select('lead_id,price_usd,provided_by,released_date,created_at').order('created_at').order('id'),ids),
    repByIds(()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id'),ids),
    repByIds(()=>sb.from('lead_payments').select('lead_id,amount_usd,other_fee_usd,paid_on,count_month').order('id'),ids),
    repByIds(()=>sb.from('lead_finance').select('lead_id,contract_total_usd,follow_up_date').order('lead_id'),ids),
    /* what customers have promised to pay, keyed in by admin on Finance */
    rowsOf(()=>sb.from('lead_expected_payments').select('lead_id,expected_on,amount_usd').order('expected_on').order('id')).then(r=>r.data||[])
  ]);

  /* Quotation Sent in the stage history counts as after a quotation too */
  await loadQuotedLog().catch(e=>console.error(e));
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
  /* management reads real Closed-Lost - qualified, then lost. Disqualified
     (lost before ever qualifying) is its own number beside it */
  const lostInWin=rows.filter(l=>isClosedLost(l)&&inWin(l.stage_entered_at));
  const disqInWin=rows.filter(l=>isDisqualified(l)&&inWin(l.stage_entered_at));

  /* ---- the KPI row: collection ---- */
  const dueOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0)+(feeBy[l.id]||0);
  const owedOf=l=>Math.max(0,dueOf(l)-(paidBy[l.id]||0));
  const collected=pays.filter(p=>inWin(countDay(p))).reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const outstanding=won.reduce((a,l)=>a+owedOf(l),0);
  const owingNoDate=won.filter(l=>owedOf(l)>0.005&&!(finBy[l.id]&&finBy[l.id].follow_up_date)).length;
  /* every person's collection target added up is the company's for the month.
     `targets` carries collection per person, so the team figure is derived
     rather than typed twice. */
  const target=Object.values(tg.person).reduce((a,v)=>a+Number(v.collection||0),0);
  /* Run rate is a statement about THIS MONTH and must not follow the window
     switch: projecting a year of collection across thirty-one days is not a
     forecast. */
  const [bY,bM,bD]=today.split('-').map(Number);
  const dim=new Date(bY,bM,0).getDate();
  const dayNow=bD;
  const mtdCollected=pays.filter(p=>localDay(countDay(p))>=mStart&&localDay(countDay(p))<=today)
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
  /* Qualified Lead on the stage chart: qualified IN the window and still open
     - not won, not lost, so no lead sits in two bars (Kevin, 2 Oct 2026).
     The day it qualified is its first move to Telling Price or later in the
     stage history; a lead with no such move is dated by its own lead date. */
  const qualMoves=await fetchAll(()=>sb.from('lead_activities').select('lead_id,created_at')
    .eq('activity_type','stage_change')
    .in('to_stage',['telling_price','pending_quotation','quotation_sent','follow_up','agreement_signoff','closed_won']).order('id'));
  const qualOn={};
  qualMoves.forEach(m=>{const d=localDay(m.created_at);if(!qualOn[m.lead_id]||d<qualOn[m.lead_id])qualOn[m.lead_id]=d;});
  const qualified=rows.filter(l=>isQualLead(l)&&l.stage_code!==WON&&inWin(qualOn[l.id]||localDay(dayOf(l))));

  /* ---- per person, on whoever holds the rows ---- */
  const holders=new Set(rows.filter(l=>l.assigned_to).map(l=>l.assigned_to));
  /* active sales and managers, plus anyone still holding a lead - the rule
     assignable() uses, and the one the sales report was given. Without the
     active test the four dead test accounts sat on every per-person chart. */
  const people=STAFF.filter(s=>(s.is_active&&['sales','manager'].includes(s.role))||holders.has(s.id))
    /* whoever has left (Han) sits at the right of every chart (Kevin, 29 Sep 2026) */
    .sort((a,b)=>(a.is_active?0:1)-(b.is_active?0:1));
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
  pays.filter(p=>inWin(countDay(p))).forEach(p=>{
    const l=leadById[p.lead_id], amt=Number(p.amount_usd||0);
    if(!l||!l.assigned_to){collUnassigned+=amt;return;}
    collByPerson[l.assigned_to]=(collByPerson[l.assigned_to]||0)+amt;
  });
  /* every per-person chart lists the same people, a zero included - Han had
     dropped off every chart he had nothing in (Kevin, 29 Sep 2026) */
  const collPeople=people;

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
  });

  /* leads handled against leads still active, per person */
  /* Still-open is split by where the lead came from - this window or earlier -
     and wins the same way, so a win on last month's customer is not read as
     this month's new business (Kevin, 29 Sep 2026) */
  const handled=people.map(p=>{
    const mine=rows.filter(l=>l.assigned_to===p.id);
    const isNew=l=>inWin(dayOf(l));
    const open=mine.filter(l=>!TERMINAL.includes(l.stage_code));
    const wonHere=wonInWin.filter(l=>l.assigned_to===p.id);
    /* handled = every lead in their hands during the window: new in it,
       still open, or won or lost in it (Kevin, 29 Sep 2026). Active is the
       open ones only, whatever month they came in. */
    return {name:p.full_name,
      handled:mine.filter(l=>isNew(l)||!TERMINAL.includes(l.stage_code)||inWin(l.stage_entered_at)).length,
      active:open.length,
      openNew:open.filter(isNew).length, openOld:open.filter(l=>!isNew(l)).length,
      wonNew:wonHere.filter(isNew).length, wonOld:wonHere.filter(l=>!isNew(l)).length};
  });

  /* ---- closed-lost ---- */
  const reasons={};
  /* only leads that came in during the range and were lost in it (client,
     5 Oct 2026) - an older lead lost this month is not this month's reason */
  lostInWin.filter(l=>inWin(dayOf(l))).forEach(l=>{const r=lostReasonOf(l);reasons[r]=(reasons[r]||0)+1;});
  /* read through quoteStage, the one rule the Lost list uses too. It had an
     'unknown' group until the client's quotation history was imported;
     lostUnknown stays so the panel cannot break if one is ever needed again */
  const lostAfter=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='after');
  const lostBefore=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='before');
  const lostUnknown=lostInWin.filter(l=>quoteStage(l,wasQuoted(l))==='unknown');

  /* ---- month by month ---- */
  const months=lastMonths(rows,dayOf,12);
  const madeIn=m=>rows.filter(l=>localDay(dayOf(l)).slice(0,7)===m);
  const qualIn=m=>madeIn(m).filter(l=>isQualLead(l));
  /* their sheet shows six months of conversion, April to September */
  /* ...ending at the board's month, so picking September stops at September */
  const convMonths=months.filter(m=>m<=mStart.slice(0,7)).slice(-6);

  const thisM=mStart.slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const paidIn=m=>pays.filter(p=>countDay(p)&&localDay(countDay(p)).slice(0,7)===m)
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
    if(isQualLead(l))qualDay[k]=(qualDay[k]||0)+1;
  });

  /* stage distribution, two charts from his drawing (2 Oct 2026).
     Chart 1 is where the window's raw leads went: Qualified, Disqualified, No
     status and Pending contact (defined below). No status overlaps Qualified,
     so the four do not add up to Raw Lead. Chart 2 takes Qualified apart:
     Won + Closed-Lost + In progress = Qualified. Qualified and Disqualified are
     counted on when it happened, split by when the lead came in - dark in the
     window, light earlier. */
  const isNew=l=>inWin(dayOf(l));
  const split=set=>[set.filter(isNew).length,set.filter(l=>!isNew(l)).length];
  const everQual=l=>qualText(l)==='Qualified';
  /* Qualified = every lead that qualified in the window, whatever month it
     came in. Closed-Won = every win in the window, older leads included,
     NOT added into Qualified - so the parts need not add up (Kevin, 5 Oct
     2026). Closed-Lost and In progress are the qualified ones lost / open. */
  const qualSet=rows.filter(l=>everQual(l)&&inWin(qualOn[l.id]||localDay(dayOf(l))));
  const wonSet=wonInWin;
  const lostSet=qualSet.filter(l=>l.stage_code===LOST);
  const progSet=qualSet.filter(l=>!TERMINAL.includes(l.stage_code));
  /* No status = a phone, still open, and no salesperson yet - qualified or
     not, so a qualified one counts here AND under Qualified (Kevin, 2 Oct
     2026). Pending contact = open and not qualified, with no phone, or with a
     phone and a salesperson but still on Information Gathering. */
  const hasPh=l=>!!(l.phone||'').trim();
  /* judged AS OF THE LAST DAY SHOWN, not today (Kevin, 5 Oct 2026): a
     September lead that qualified on 2 Oct was still waiting on 30 Sep, and
     belongs in September's pending bar rather than in no bar at all */
  const asOf=today;
  const qualBy=l=>everQual(l)&&localDay(qualOn[l.id]||dayOf(l))<=asOf;
  const closedBy=l=>TERMINAL.includes(l.stage_code)&&localDay(l.stage_entered_at||dayOf(l))<=asOf;
  const openGot=got.filter(l=>!closedBy(l));
  const noStatus=openGot.filter(l=>hasPh(l)&&!l.assigned_to);
  /* split in two (Kevin, 2 Oct 2026): no phone yet, and a phone with a
     salesperson but not yet qualified - waiting on the customer */
  const pending=openGot.filter(l=>!qualBy(l)&&!hasPh(l));
  const feedback=openGot.filter(l=>!qualBy(l)&&hasPh(l)&&l.assigned_to);
  /* the three shown as one bar, "Not yet qualify" (Kevin, 5 Oct 2026):
     still open and not qualified on the last day shown, phone or not,
     salesperson or not. Its sheet says which of the three each lead is. */
  const notYet=openGot.filter(l=>!qualBy(l));
  const notYetWhy=l=>!hasPh(l)?'Pending phone number':!l.assigned_to?'No status':'Pending feedback from customer';
  const [qN,qE]=split(qualSet),[dN,dE]=split(disqInWin);
  const [wN,wE]=split(wonSet),[lN,lE]=split(lostSet),[pN,pE]=split(progSet);
  /* the leads behind each bar, for the Export Excel button in the zoom */
  const leadRow=l=>({'Ref ID':l.ref_id||'','Customer':l.customer_name||'','Phone':l.phone||'',
    'Lead date':localDay(dayOf(l)),'Came in':isNew(l)?'This period':'Earlier',
    'Channel':(l.lead_channel||'').replace(/_/g,' '),'Sub-channel':l.lead_sub_channel||'',
    'Stage':(STAGES.find(s=>s.stage_code===l.stage_code)||{}).stage_name||l.stage_code,
    'Stage date':l.stage_entered_at?localDay(l.stage_entered_at):'',
    'Salesperson':l.assigned_to?staffName(l.assigned_to):''});
  const sheetsOf=sets=>()=>Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,v.map(l=>k==='Not yet qualify'?{...leadRow(l),'Waiting on':notYetWhy(l)}:leadRow(l))]));
  const flowLabels=['Raw Lead','Qualified','Disqualified','Not yet qualify'];
  const qualLabels=['Qualified','Closed-Won','Closed-Lost','In progress'];

  /* Residential against C&I, per salesperson, two columns each */
  const typePeople=people;
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
  /* Unassigned sits before whoever has left, so Han stays at the far right */
  const collCols=collPeople.map(p=>({name:p.full_name.split(" ")[0],v:collByPerson[p.id]||0,col:colOf[p.id],gone:!p.is_active}));
  if(collUnassigned){const k=collCols.findIndex(c=>c.gone);
    collCols.splice(k<0?collCols.length:k,0,{name:'Unassigned',v:collUnassigned,col:'var(--viz-mute)'});}

  /* Total contract value by each sales: deals won in the window, at the
     contract figure where finance has one and the sale value where not */
  const valueOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0);
  const tcvBy={}; wonInWin.forEach(l=>{if(l.assigned_to)tcvBy[l.assigned_to]=(tcvBy[l.assigned_to]||0)+valueOf(l);});
  const tcvPeople=people;

  /* Sales and lead summary: what each person holds open against what they won */
  const summary=people.map(p=>({p,
    active:open.filter(l=>l.assigned_to===p.id).length,
    won:wonInWin.filter(l=>l.assigned_to===p.id).length}));

  /* quotations sent, per person, coloured by that person where they hold a colour */
  people.forEach(p=>{if(!(p.id in quotByPerson))quotByPerson[p.id]=0;});
  const quotRows=Object.entries(quotByPerson).filter(r=>r[1]>0||people.some(p=>p.id===r[0]))
    .sort((a,b)=>{const i=id=>{const k=people.findIndex(p=>p.id===id);return k<0?people.filter(p=>p.is_active).length-0.5:k;};return i(a[0])-i(b[0]);});

  /* the facts block at the top right of their sheet */
  const monthLong=new Date(mStart+'T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}).toUpperCase();
  const fmtDay=d=>new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  /* Outstanding Payment is what customers have promised to pay THIS calendar
     month, as admin keys it on the Finance card - not every balance still owed
     (Kevin, 28 Sep 2026). Total Payment Expected is that plus what has come in. */
  const mEnd=thisM+'-'+String(dim).padStart(2,'0');
  const expThis=expd.filter(p=>p.expected_on>=mStart&&p.expected_on<=mEnd);
  const expThisSum=expThis.reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const expected=mtdCollected+expThisSum;
  const pct2=v=>v==null?'—':v.toFixed(2)+'%';
  /* a pie with the total under it and a ledger beside it, for the two money
     charts per salesperson (Kevin, 2 Oct 2026); everyone stays on the ledger,
     $0 included, only the pie drops a zero */
  const moneyPie=(title,parts,emptyHead,emptyWhy,cap)=>{
    const tot=parts.reduce((a,p)=>a+Number(p[1]||0),0);
    if(!tot)return emptyChart(title,emptyHead,emptyWhy);
    return repPanel(title,(cap?`<div class="cap" style="margin:-4px 0 10px">${esc(cap)}</div>`:'')
      +`<div class="pieled">`+gPie(parts,'Total '+cash(tot))
      +ledger(parts.map(([k,v,c])=>[k,cash(v),Math.round(v/tot*100)+'%',c]))+`</div>`);};
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
      ${kpi({label:'Outstanding Payment',value:cash(expThisSum)})}
      ${kpi({label:'Total Payment Expected',value:cash(expected)})}
      ${kpi({label:'Achievement %',value:target?pct2(mtdCollected/target*100):'—'})}
      ${kpi({label:'Target Remaining',value:remaining==null?'—':cash(remaining)})}
      ${kpi({label:'Run Rate %',value:(target&&runRate!=null)?pct2(runRate/target*100):'—'})}
    </div>
    ${!target?`<div class="hint">No collection target set for ${esc(monthName(thisM))}.</div>`:''}

    <div class="homegrid three mgrid">
      ${leadTarget?colChart(['Raw Lead Target','Raw Lead'],[leadTarget,mktLeads],
        {title:'Raw lead target vs actual',colors:['var(--c-target)','var(--c-raw)'],table:false,compact:true,
         cap:'Digital and offline marketing, '+monthName(thisM)})
        :emptyChart('Raw lead target vs actual','No lead target set',
          'Set one for '+monthName(thisM)+' under Targets. '+mktLeads+' received so far.')}
      ${/* only the leads that came in during the range - no older leads, no
           light parts (client, 5 Oct 2026). The chart beside it keeps both. */''}
      ${colChart(flowLabels,[got.length,qN,dN,notYet.length],
        {title:'Lead stage distribution',colors:['var(--c-raw)','var(--c-qual)','var(--c-disq)','var(--c-feedback)'],
         table:false,compact:true,noTicks:true,
         sheets:sheetsOf({'Raw Lead':got,'Qualified':qualSet.filter(isNew),'Disqualified':disqInWin.filter(isNew),'Not yet qualify':notYet}),
         cap:'All five channels · leads that came in '+per})}
      ${groupChart(qualLabels,
        [{name:'Lead came in earlier (light)',color:['var(--c-qual-2)','var(--c-won-2)','var(--c-lost-2)','var(--c-active-2)'],values:[0,wE,0,pE]},
         {name:'Lead came in this period (dark)',color:['var(--c-qual)','var(--c-won)','var(--c-lost)','var(--c-active)'],values:[qN,wN,lN,pN]}],
        {title:'Qualified leads',stacked:true,compact:true,
         sheets:sheetsOf({'Qualified':qualSet.filter(isNew),'Closed-Won':wonSet,'Closed-Lost':lostSet.filter(isNew),'In progress':progSet}),
         cap:'Qualified and Closed-Lost: leads that came in '+per+' · Closed-Won and In progress include older leads'})}
    </div>

    <div class="homegrid three mgrid">
      ${lineChart(days.map(String),
        [{name:'# Raw Lead',color:'var(--c-raw)',values:days.map(d=>mktDay[dayKey(d)]||0)},
         {name:'# Qualified Lead',color:'var(--c-qual)',values:days.map(d=>qualDay[dayKey(d)]||0)}],
        {title:'Lead trend from marketing',compact:true,values:true,cap:'Each day of '+monthName(thisM)})}
      ${convMonths.length
        ?lineChart(convMonths.map(m=>monthName(m)),
          [{name:'Conversion',color:'var(--c-qual)',
            values:convMonths.map(m=>{
              if(CONV_HISTORY[m]){const [r,q]=CONV_HISTORY[m];return +(q/r*100).toFixed(2);}
              const r=madeIn(m).length;return r?+(qualIn(m).length/r*100).toFixed(2):0;})}],
          {title:'Conversion % from raw lead to qualified lead',compact:true,values:true,fmt:v=>v.toFixed(2)+'%'})
        :emptyChart('Conversion % from raw lead to qualified lead','No months to show yet','This fills in as leads accumulate.')}
      ${moneyPie('Payment collection by each sales',collCols.map(c=>[c.name,c.v,c.col]),
        'Nothing collected '+per,'This fills in as payments are recorded.')}
    </div>

    <div class="homegrid three mgrid">
      ${summary.length
        ?groupChart(summary.map(r=>first(r.p)),
          [{name:'# of Active Lead',color:'var(--c-active)',values:summary.map(r=>r.active)},
           {name:'# Closed Won',color:'var(--c-won)',values:summary.map(r=>r.won)}],
          {title:'Sales and lead summary',compact:true})
        :emptyChart('Sales and lead summary','Nobody holds a lead yet','This fills in as leads are assigned.')}
      ${repPanel('Active pipeline stage',
        open.length
          ?gRank(MG_ACTIVE.map(code=>[(STAGES.find(s=>s.stage_code===code)||{}).stage_name||code,
              open.filter(l=>l.stage_code===code).length]),
             {color:'var(--c-active)',limit:MG_ACTIVE.length,order:true,keepZero:true,
              emptyWhy:'This fills in as leads move through the pipeline.'})
          :blank('Nothing open','Every lead is won or lost.'))}
      ${repPanel('Closed-lost status',
        lostInWin.length
          ?gRank(Object.entries(reasons),{color:'var(--c-lost)',limit:6,wrap:true,
             emptyWhy:'This fills in as leads are lost.'})
          :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'))}
    </div>

    <div class="homegrid three mgrid">
      ${contactAvg.length
        ?colChart(contactAvg.map(r=>r[0].split(' ')[0]),contactAvg.map(r=>r[1]),
          {title:'Avg. daily contact to customer',colors:contactAvg.map(r=>colOf[r[4]]),compact:true,table:false,
           fmt:v=>v.toFixed(2)})
        :emptyChart('Avg. daily contact to customer','No contacts logged','Nothing in the contact log '+per+'.')}
      ${handled.length
        ?groupChart(handled.map(r=>r.name.split(' ')[0]),
          [{name:'Handled '+per,color:'var(--c-handled)',values:handled.map(r=>r.handled)},
           /* every lead the person still has to work on, whatever month it came
              in - Kevin, 29 Sep 2026, after trying it split by month */
           {name:'# of Active Lead',color:'var(--c-active)',values:handled.map(r=>r.active)}],
          {title:'# of leads held and # of active lead',compact:true})
        :emptyChart('# of leads held and # of active lead','Nobody holds a lead yet','This fills in as leads are assigned.')}
      ${typePeople.length
        ?groupChart(typePeople.map(first),
          [{name:'Residential',color:'var(--viz-2)',values:typePeople.map(p=>typeOf(p,'Residential'))},
           {name:'C & I',color:'var(--viz-1)',values:typePeople.map(p=>typeOf(p,'C & I'))}],
          {title:'Residential and C & I',compact:true,cap:'By sale engineer'})
        :emptyChart('Residential and C & I','No customer type recorded','No lead in the window has the field filled in.')}
    </div>

    <div class="homegrid three mgrid">
      ${quotRows.length
        ?colChart(quotRows.map(([id])=>id==='none'?'Not recorded':nameOf(id).split(' ')[0]),quotRows.map(r=>r[1]),
          {title:'# of quotation sent',colors:quotRows.map(([id])=>colOf[id]||'var(--viz-mute)'),compact:true,table:false})
        :emptyChart('# of quotation sent','None released '+per,'This fills in as quotations are released.')}
      ${moneyPie('Total contract value (USD) by each sales',tcvPeople.map(p=>[first(p),tcvBy[p.id]||0,colOf[p.id]]),
        'Nothing won '+per,'This fills in as deals are won.','Deals won '+per)}
      <!-- asked for on 16 Sep 2026 and not on their sheet; at the foot of the board (Kevin, 2 Oct 2026) -->
      ${repPanel('Closed-lost, before or after a quotation',
        lostInWin.length
          ?gSplit([['After a quotation',lostAfter.length,'var(--c-lost)','After'],
                   ['Before any quotation',lostBefore.length,'var(--c-lost-2)','Before'],
                   ['Unknown',lostUnknown.length,'var(--viz-mute)','Unknown']])
           +ledger([['After a quotation',lostAfter.length,''],
                    ['Before any quotation',lostBefore.length,''],
                    ...(lostUnknown.length?[['Unknown',lostUnknown.length,'imported, quotation not recorded']]:[])])
          :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'))}
    </div>
  `;
}
