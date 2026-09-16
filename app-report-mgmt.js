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
const MG_LABEL={Digital_Marketing:'Digital',Third_Party:'Third party',Direct_Sales:'Direct',
  Offline_Marketing:'Offline',Existing_Customer:'Existing customer',Other:'Not recorded'};
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
    ids.length?sb.from('lead_activities').select('lead_id,activity_type,created_at').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('quotations').select('lead_id,price_usd,provided_by,released_date,created_at').in('lead_id',ids).order('created_at').then(r=>r.data||[]):[],
    ids.length?sb.from('lead_financials').select('lead_id,final_sale_usd').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('lead_payments').select('lead_id,amount_usd,other_fee_usd,paid_on').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('lead_finance').select('lead_id,contract_total_usd,follow_up_date').in('lead_id',ids).then(r=>r.data||[]):[]
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
  const achievement=target?Math.round(collected/target*100):null;
  const remaining=target?Math.max(0,target-collected):null;
  /* Run rate is a statement about THIS MONTH and must not follow the window
     switch: projecting a year of collection across thirty-one days is not a
     forecast. */
  const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const dayNow=new Date().getDate();
  const mtdCollected=pays.filter(p=>localDay(p.paid_on)>=mStart&&localDay(p.paid_on)<=today)
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const runRate=dayNow?mtdCollected/dayNow*dim:null;
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
  const people=STAFF.filter(s=>['sales','manager'].includes(s.role)||holders.has(s.id));
  const nameOf=id=>staffName(id);

  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const cash=v=>v==null?'—':fmtMoney(Math.round(v));

  /* collection per salesperson: money received in the window, against the
     person the lead is assigned to rather than whoever banked it */
  const collByPerson={};
  pays.filter(p=>inWin(p.paid_on)).forEach(p=>{
    const l=rows.find(x=>x.id===p.lead_id); if(!l||!l.assigned_to)return;
    collByPerson[l.assigned_to]=(collByPerson[l.assigned_to]||0)+Number(p.amount_usd||0);
  });

  /* quotations sent, counted per person on who released them */
  const quotByPerson={};
  quots.filter(q=>inWin(q.released_date||q.created_at)).forEach(q=>{
    const k=q.provided_by||'none'; quotByPerson[k]=(quotByPerson[k]||0)+1;});

  /* Average customer contacts a day. A contact is a line in the contact log;
     the divisor is the days that person actually logged something on, not the
     days in the window - somebody who logged four calls on one day averaged
     four a day, not four over thirty. */
  const contactAvg=people.map(p=>{
    const mine=rows.filter(l=>l.assigned_to===p.id);
    const notes=[];
    mine.forEach(l=>(actsBy[l.id]||[]).forEach(a=>{
      if(['call','note'].includes(a.activity_type)&&inWin(a.created_at))notes.push(localDay(a.created_at));}));
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
  const lostAfter=lostInWin.filter(wasQuoted);
  const lostBefore=lostInWin.filter(l=>!wasQuoted(l));
  const lostAfterValue=lostAfter.reduce((a,l)=>a+Number(quotBy[l.id]?.price_usd||0),0);

  /* ---- month by month ---- */
  const months=lastMonths(rows,dayOf,12);
  const madeIn=m=>rows.filter(l=>localDay(dayOf(l)).slice(0,7)===m);
  const qualIn=m=>madeIn(m).filter(l=>qualText(l)==='Qualified');

  const thisM=mStart.slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const paidIn=m=>pays.filter(p=>p.paid_on&&localDay(p.paid_on).slice(0,7)===m)
    .reduce((a,p)=>a+Number(p.amount_usd||0),0);
  const wonValIn=m=>rows.filter(l=>l.stage_code===WON&&l.stage_entered_at
    &&localDay(l.stage_entered_at).slice(0,7)===m).reduce((a,l)=>a+(saleBy[l.id]||0),0);
  const prevWord=monthName(prevM);

  /* stage distribution, his four bars */
  const stageDist=[
    ['Raw lead',got.length,'#c2b8a4'],
    ['Qualified',qualified.length,'#a89c86'],
    ['Closed-Won',wonInWin.length,'var(--ok)'],
    ['Closed-Lost',lostInWin.length,'var(--bad)']
  ];

  /* Residential against C&I. The vocabulary holds exactly those two, so
     anything else is a lead nobody filled the field in on. */
  const typeCount={};
  got.forEach(l=>{const t=l.customer_type||'Not recorded';typeCount[t]=(typeCount[t]||0)+1;});
  /* his sheet splits this per salesperson, two columns each, rather than
     giving the two totals for the whole company */
  const typePeople=people.filter(p=>got.some(l=>l.assigned_to===p.id));
  const typeOf=(p,want)=>got.filter(l=>l.assigned_to===p.id&&l.customer_type===want).length;

  const mktLeads=got.filter(l=>MG_MARKETING.includes(l.lead_channel)).length;
  const chCount={};
  got.forEach(l=>{const c=MG_CHANNELS.includes(l.lead_channel)?l.lead_channel:'Other';
    chCount[c]=(chCount[c]||0)+1;});

  $('main').innerHTML=repBar('Management dashboard')+`
    <div class="kpis six">
      <!-- his six boxes, in his order and his wording. They are the headings
           he reads the sheet by, so they are not tidied. -->
      ${kpi({label:'Monthly Target',value:cash(target||null)})}
      ${kpi({label:'Payment Collected',value:cash(collected),lead:true,
        alert:!!(target&&collected<target),
        delta:momPct(paidIn(thisM),paidIn(prevM)),deltaOf:prevWord,
        note:target?pct(collected,target)+' of target':''})}
      ${kpi({label:'Outstanding Payment',value:cash(outstanding),
        note:owingNoDate?owingNoDate+' with no date set':''})}
      ${kpi({label:'Achievement %',value:achievement==null?'—':achievement+'%'})}
      ${kpi({label:'Target Remaining',value:remaining==null?'—':cash(remaining)})}
      ${kpi({label:'Run Rate %',value:runPct==null?cash(runRate):runPct+'%',
        note:runRate==null?'':cash(runRate)+' by month end'})}
    </div>
    ${!target?`<div class="hint">No collection target set for ${esc(monthName(thisM))}.</div>`:''}

    <div class="homegrid">
      ${colChart(['Target','Actual'],[leadTarget,mktLeads],
        {title:'Raw lead target vs actual',color:'var(--sun)',table:false,compact:true,
         cap:'Digital and offline marketing'})}
      ${colChart(stageDist.map(r=>r[0]),stageDist.map(r=>r[1]),
        {title:'Lead stage distribution',colors:stageDist.map(r=>r[2]),
         table:false,compact:true,cap:'All five channels'})}
    </div>

    <div class="homegrid">
      ${repPanel('Leads by channel',
        ledger(MG_CHANNELS.filter(c=>chCount[c]).map(c=>[MG_LABEL[c],chCount[c]])))}
      ${repPanel('Active pipeline',
        open.length
          ?gRank(MG_ACTIVE.map(code=>[(STAGES.find(s=>s.stage_code===code)||{}).stage_name||code,
              open.filter(l=>l.stage_code===code).length]),
             {color:'var(--sun)',limit:MG_ACTIVE.length,
              emptyWhy:'This fills in as leads move through the pipeline.'})
          :blank('Nothing open','Every lead is won or lost.'))}
    </div>

    <div class="homegrid">
      ${typePeople.length
        ?groupChart(typePeople.map(p=>p.full_name.split(' ')[0]),
          [{name:'Residential',color:'var(--own-sales)',values:typePeople.map(p=>typeOf(p,'Residential'))},
           {name:'C & I',color:'var(--sky)',values:typePeople.map(p=>typeOf(p,'C & I'))}],
          {title:'Residential vs C&I',compact:true,cap:'By sale engineer'})
        :repPanel('Residential vs C&I',
          blank('No customer type recorded','No lead in the window has the field filled in.'))}
      ${repPanel('Closed-lost status',
        lostInWin.length
          ?gRank(Object.entries(reasons),{color:'var(--bad)',limit:12,
             emptyWhy:'This fills in as leads are lost.'})
          :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'))}
    </div>

    <div class="homegrid">
      ${repPanel('Collection per person',
        gRank(people.map(p=>[p.full_name,collByPerson[p.id]||0]),
          {color:'var(--ok)',fmt:cash,emptyWhy:'This fills in as payments are recorded '+per+'.'}))}
      ${repPanel('Quotations per person',
        gRank(Object.entries(quotByPerson).map(([id,n])=>[id==='none'?'Not recorded':nameOf(id),n]),
          {color:'var(--own-sales)',emptyWhy:'This fills in as quotations are released '+per+'.'}))}
    </div>

    ${repPanel('Closed-lost, before or after a quotation',
      lostInWin.length
        ?gSplit([['After a quotation',lostAfter.length,'var(--bad)'],
                 ['Before any quotation',lostBefore.length,'#c2b8a4']],
            'after '+pct(lostAfter.length,lostInWin.length),'before')
         +ledger([['After a quotation',lostAfter.length,cash(lostAfterValue)+' quoted'],
                  ['Before any quotation',lostBefore.length,'']])
        :blank('Nothing lost '+per,'No lead was moved to Closed-Lost in this window.'),true)}

    ${repPanel('Contacts a day',
      contactAvg.length
        ?gRank(contactAvg.map(r=>[r[0],r[1]]),{color:'var(--sun)',fmt:v=>v+' a day'})
        :blank('No contacts logged','Nothing in the contact log '+per+'.'),true)}

    ${repPanel('Leads per person',
      handled.length
        ?`<div class="tablewrap"><table><thead><tr>
            <th>Person</th><th>Handled ${esc(per)}</th><th>Still active</th>
          </tr></thead><tbody>${handled.map(r=>`<tr>
            <td>${esc(r.name)}</td>
            ${numCell(r.handled,colMax(handled,x=>x.handled))}
            ${numCell(r.active,colMax(handled,x=>x.active))}
          </tr>`).join('')}</tbody></table></div>`
        :blank('Nobody holds a lead yet','This fills in as leads are assigned.'),true)}

    ${colChart(months.map(m=>monthName(m)),months.map(m=>madeIn(m).length),
      {title:'Lead trend',color:'var(--sun)',xhead:'Month',yhead:'Raw leads'})}

    ${repPanel('Raw to qualified, by month',
      months.length
        ?`<div class="tablewrap"><table><thead><tr>
            <th>Month</th><th>Raw leads</th><th>Qualified</th><th>Conversion</th>
          </tr></thead><tbody>${months.map(m=>{
            const r=madeIn(m).length,q=qualIn(m).length;
            return `<tr><td>${esc(monthName(m))}</td>
              ${numCell(r,Math.max(1,...months.map(x=>madeIn(x).length)))}
              ${numCell(q,Math.max(1,...months.map(x=>qualIn(x).length)))}
              <td>${esc(pct(q,r))}</td></tr>`;}).join('')}</tbody></table></div>`
        :blank('No months to show yet','This fills in as leads accumulate.'),true)}

    ${repPanel('Won value by month',
      months.length
        ?ledger(months.slice(-6).map(m=>[monthName(m),cash(wonValIn(m)),
            rows.filter(l=>l.stage_code===WON&&l.stage_entered_at
              &&localDay(l.stage_entered_at).slice(0,7)===m).length+' won']))
        :blank('Nothing won yet','This fills in as deals close.'),true)}
  `;
}
