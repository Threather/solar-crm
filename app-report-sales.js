/* ---------------- SALES REPORT ----------------
   Rebuilt 16 Sep 2026 against the client's own workbook, "Reporting Template
   for Sales Team.xlsx" — its blocks, in its order, under its headings. Do not
   tidy the wording: they recognise their own report by it.

   Definitions Kevin settled before it was written:
     - "#Lead Contact" counts LEADS CONTACTED, one lead once however many times
       it was rung. Avg #Times Contacted beside it is the other half.
     - the closed-lost block counts the app's own seven reasons, not the five
       written on their sheet.
     - Avg. Sales Cycle Length runs from the day the lead came in to the day it
       was won, and Expected Revenue is computed here rather than typed.

   Their stage names match our pipeline one for one, Quotation Sign Off being
   `agreement_signoff`.

   THE STAGE LOG IS THIN, AND THESE BLOCKS DEPEND ON IT. A stage column counts
   leads that ENTERED that stage inside the window, which `lead_activities`
   only knows for moves somebody made in the app — and sales quote without
   moving the stage, so on 16 Sep the whole log held one row. Every count below
   therefore falls back to the lead's own `stage_entered_at` where the log has
   nothing, which catches the move that put it where it now sits. It cannot
   catch a stage passed through and left. */

const SALE_STAGES=[
  ['info_gathering','Information Gathering'],
  ['telling_price','Telling Price'],
  ['pending_quotation','Pending Quotation'],
  ['quotation_sent','Quotation Sent'],
  ['follow_up','Follow Up'],
  ['agreement_signoff','Quotation Sign Off'],
  ['closed_won','Closed-Won'],
  ['closed_lost','Closed-Lost']
];

/* the value of an open lead is the last thing quoted for it. A lead with no
   quotation contributes nothing, so the pipeline understates rather than
   inventing a number — the count it covers is printed beside it. */
function pipelineValue(rows,quotBy){
  let value=0,covered=0;
  rows.forEach(l=>{const q=quotBy[l.id];if(q){value+=Number(q.price_usd||0);covered++;}});
  return {value,covered};
}

/* Their week IV runs the 21st to month end, so these are not seven-day weeks
   and must not be worked out by dividing. From and To are printed on their
   sheet, so they are printed here. */
function saleWeeks(monthISO){
  const [y,m]=monthISO.split('-').map(Number);
  const last=new Date(y,m,0).getDate();
  const d=n=>monthISO+'-'+String(n).padStart(2,'0');
  return [['I',d(1),d(7)],['II',d(8),d(14)],['III',d(15),d(20)],['IV',d(21),d(last)]];
}

async function renderSalesReport(){
  const rows=await fetchLeads(q=>q);
  const ids=rows.map(l=>l.id);
  const range=repRange(REPPERIOD);
  const per=repPeriodWord();
  const mStart=monthStart(), today=localDay(new Date());
  const thisM=mStart.slice(0,7);

  const [tg,acts,quots,fins,pays,finrows]=await Promise.all([
    loadTargets(mStart),
    ids.length?sb.from('lead_activities').select('lead_id,activity_type,created_at,note_date,to_stage').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('quotations').select('lead_id,price_usd,created_at').in('lead_id',ids).order('created_at').then(r=>r.data||[]):[],
    ids.length?sb.from('lead_financials').select('lead_id,final_sale_usd').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('lead_payments').select('lead_id,amount_usd,other_fee_usd,paid_on').in('lead_id',ids).then(r=>r.data||[]):[],
    ids.length?sb.from('lead_finance').select('lead_id,contract_total_usd,follow_up_date').in('lead_id',ids).then(r=>r.data||[]):[]
  ]);

  const byId={}; rows.forEach(l=>byId[l.id]=l);
  const quotBy={},saleBy={},finBy={},paidBy={},feeBy={};
  quots.forEach(q=>quotBy[q.lead_id]=q);
  fins.forEach(f=>saleBy[f.lead_id]=Number(f.final_sale_usd||0));
  finrows.forEach(f=>finBy[f.lead_id]=f);
  pays.forEach(p=>{paidBy[p.lead_id]=(paidBy[p.lead_id]||0)+Number(p.amount_usd||0);
                   feeBy[p.lead_id]=(feeBy[p.lead_id]||0)+Number(p.other_fee_usd||0);});

  /* the contact log, per lead. note_date is the day the contact happened and
     is the writer's own; created_at is the audit trail. */
  const contacts=acts.filter(a=>['call','note'].includes(a.activity_type))
    .map(a=>({lead:a.lead_id,day:localDay(a.note_date||a.created_at)}));
  /* every logged stage move, with the day it happened */
  const moves=acts.filter(a=>a.activity_type==='stage_change'&&a.to_stage)
    .map(a=>({lead:a.lead_id,to:a.to_stage,day:localDay(a.created_at)}));
  const loggedFor={}; moves.forEach(m=>{(loggedFor[m.lead]=loggedFor[m.lead]||new Set()).add(m.to);});

  /* whoever holds the rows, not whoever holds the role. A lead sitting on an
     admin account once vanished from this report for exactly that reason. */
  const holders=new Set(rows.filter(l=>l.assigned_to).map(l=>l.assigned_to));
  /* Active sales and managers, plus anyone who still holds a lead even if they
     have been deactivated - the same rule as assignable(). Without the active
     test the four dead test accounts each got their own weekly and monthly
     table, four sheets of zeros. */
  const people=STAFF.filter(s=>(s.is_active&&['sales','manager'].includes(s.role))||holders.has(s.id));
  const shown=ME.role==='sales'?people.filter(p=>p.id===ME.id)
            :REPFILTER.person?people.filter(p=>p.id===REPFILTER.person):people;

  const inWin=v=>REPPERIOD==='all'||inRange(v,range);
  const within=(v,a,b)=>{const d=localDay(v);return !!d&&d>=a&&d<=b;};
  const mine=id=>rows.filter(l=>l.assigned_to===id);

  /* A lead entered a stage inside a window if the log says so, or - where the
     log has nothing for that stage - if the lead sits there now and got there
     inside it. See the note at the top: the log is thin. */
  const enteredIn=(l,code,a,b)=>{
    const logged=moves.some(m=>m.lead===l.id&&m.to===code&&m.day>=a&&m.day<=b);
    if(logged)return true;
    if((loggedFor[l.id]||new Set()).has(code))return false;
    return l.stage_code===code&&within(l.stage_entered_at||l.created_at,a,b);
  };
  const stageRow=(set,a,b)=>SALE_STAGES.map(([code])=>set.filter(l=>enteredIn(l,code,a,b)).length);
  const contactedIn=(id,a,b)=>new Set(contacts.filter(c=>byId[c.lead]&&byId[c.lead].assigned_to===id
    &&c.day>=a&&c.day<=b).map(c=>c.lead)).size;

  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const cash=v=>v==null?'—':fmtMoney(Math.round(v));
  const dueOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0)+(feeBy[l.id]||0);
  const owedOf=l=>Math.max(0,dueOf(l)-(paidBy[l.id]||0));

  /* ---- the windows the sheet works in ---- */
  const mtd=[mStart,today];
  const win=REPPERIOD==='all'?['1970-01-01',today]:range;
  const dayOf=l=>l.lead_date||l.created_at;

  const open=rows.filter(l=>!TERMINAL.includes(l.stage_code));
  const wonAll=rows.filter(l=>l.stage_code===WON);
  const gotMtd=rows.filter(l=>within(dayOf(l),mtd[0],mtd[1]));
  const wonMtd=wonAll.filter(l=>within(l.stage_entered_at,mtd[0],mtd[1]));
  const lostMtd=rows.filter(l=>l.stage_code===LOST&&within(l.stage_entered_at,mtd[0],mtd[1]));
  const qualMtd=gotMtd.filter(l=>qualText(l)==='Qualified');

  /* ---- block 5 and 7 figures, per person and for the company ---- */
  const targetOf=id=>Number(tg.person[id]?.collection||0);
  const collectedOf=(id,a,b)=>pays.filter(p=>byId[p.lead_id]&&byId[p.lead_id].assigned_to===id
    &&within(p.paid_on,a,b)).reduce((x,p)=>x+Number(p.amount_usd||0),0);
  const outstandingOf=id=>mine(id).filter(l=>l.stage_code===WON).reduce((x,l)=>x+owedOf(l),0);
  const pipeOf=id=>pipelineValue(mine(id).filter(l=>!TERMINAL.includes(l.stage_code)),quotBy).value;
  const contractOf=(id,a,b)=>mine(id).filter(l=>l.stage_code===WON&&within(l.stage_entered_at,a,b))
    .reduce((x,l)=>x+dueOf(l),0);

  const dim=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  const dayNow=new Date().getDate();

  const perf=shown.map(p=>{
    const t=targetOf(p.id), c=collectedOf(p.id,mStart,today);
    const run=dayNow?c/dayNow*dim:0;
    return {p,t,c,out:outstandingOf(p.id),short:Math.max(0,t-c),
      ach:t?Math.round(c/t*100):null, pipe:pipeOf(p.id),
      runAch:t?Math.round(run/t*100):null};
  });
  const tot=perf.reduce((a,r)=>({t:a.t+r.t,c:a.c+r.c,out:a.out+r.out,
    short:a.short+r.short,pipe:a.pipe+r.pipe}),{t:0,c:0,out:0,short:0,pipe:0});
  const totAch=tot.t?Math.round(tot.c/tot.t*100):null;
  const totRun=tot.t&&dayNow?Math.round((tot.c/dayNow*dim)/tot.t*100):null;

  /* Expected Revenue is computed, not typed: the open pipeline weighted by how
     often this team actually wins, plus what is already owed on won deals. */
  const decided=rows.filter(l=>TERMINAL.includes(l.stage_code)).length;
  const winRate=decided?wonAll.length/decided:null;
  const pipeAll=pipelineValue(open,quotBy);
  const forecast=winRate==null?null:pipeAll.value*winRate+tot.out;

  const personFilter=ME.role==='sales'?'':`<select onchange="setRepFilter('person',this.value)">
      <option value="">Everyone</option>
      ${people.map(p=>`<option value="${p.id}" ${REPFILTER.person===p.id?'selected':''}>${esc(p.full_name)}</option>`).join('')}
    </select>`;

  const head=`<tr><th>Sale engineer</th><th>#Lead Contact</th>${SALE_STAGES.map(([,n])=>`<th>${esc(n)}</th>`).join('')}</tr>`;
  const stageTable=(a,b)=>{
    const body=shown.map(p=>{
      const r=stageRow(mine(p.id),a,b);
      return `<tr><td><b>${esc(p.full_name)}</b></td><td>${contactedIn(p.id,a,b)}</td>`
        +r.map(v=>`<td>${v}</td>`).join('')+`</tr>`;}).join('');
    const totals=SALE_STAGES.map(([code])=>
      shown.reduce((x,p)=>x+mine(p.id).filter(l=>enteredIn(l,code,a,b)).length,0));
    const totContact=shown.reduce((x,p)=>x+contactedIn(p.id,a,b),0);
    return `<div class="tablewrap"><table class="table-compact"><thead>${head}</thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td><b>Total</b></td><td><b>${totContact}</b></td>
        ${totals.map(v=>`<td><b>${v}</b></td>`).join('')}</tr></tfoot></table></div>`;
  };

  /* ---- MoM: the same stage table by month, per person ---- */
  const months=[...new Set(rows.map(l=>localDay(dayOf(l)).slice(0,7)))].filter(Boolean).sort().slice(-9);
  const monthWin=m=>{const [y,mm]=m.split('-').map(Number);
    return [m+'-01',m+'-'+String(new Date(y,mm,0).getDate()).padStart(2,'0')];};

  $('main').innerHTML=repBar('Sales report',personFilter)+`
    <h3 style="font-size:15px;margin:4px 0 8px">1. Daily Sales Performance</h3>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:10px">${esc(repWindowSentence())}</p>
    ${stageTable(win[0],win[1])}

    <h3 style="font-size:15px;margin:22px 0 8px">2. Weekly Sale Stage — ${esc(monthName(thisM))}</h3>
    ${shown.map(p=>`
      <div style="margin-bottom:14px">
        <div style="font-weight:600;font-size:13px;margin-bottom:5px">${esc(p.full_name)}</div>
        <div class="tablewrap"><table class="table-compact"><thead>
          <tr><th>Week</th><th>From</th><th>To</th><th>#Lead Contact</th>
            ${SALE_STAGES.map(([,n])=>`<th>${esc(n)}</th>`).join('')}</tr></thead>
          <tbody>${saleWeeks(thisM).map(([n,a,b])=>`<tr>
            <td><b>${n}</b></td><td>${esc(fmtDate(a))}</td><td>${esc(fmtDate(b))}</td>
            <td>${contactedIn(p.id,a,b)}</td>
            ${stageRow(mine(p.id),a,b).map(v=>`<td>${v}</td>`).join('')}
          </tr>`).join('')}</tbody></table></div>
      </div>`).join('')}

    <h3 style="font-size:15px;margin:22px 0 8px">3. MTD Sales Stage</h3>
    ${stageTable(mStart,today)}

    <h3 style="font-size:15px;margin:22px 0 8px">4. MTD Sales and Lead Summary</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Sale engineer</th><th>Joined Date</th><th>#Lead Contact</th>
      <th>Avg. Customer Contacted (A Day)</th><th>Avg. Sales Cycle Length (Days)</th>
      <th>Avg. #Times Contacted</th><th>Closed-Won</th><th>Closed-Lost</th>
      <th>Total Contract Value</th><th>Total Payment Collection</th>
    </tr></thead><tbody>${shown.map(p=>{
      const mineIds=new Set(mine(p.id).map(l=>l.id));
      const cs=contacts.filter(c=>mineIds.has(c.lead)&&c.day>=mStart&&c.day<=today);
      const leadsTouched=new Set(cs.map(c=>c.lead)).size;
      const daysWorked=new Set(cs.map(c=>c.day)).size;
      const cycle=avgDays(mine(p.id).filter(l=>l.stage_code===WON)
        .map(l=>daysBetween(dayOf(l),l.stage_entered_at)));
      const w=mine(p.id).filter(l=>l.stage_code===WON&&within(l.stage_entered_at,mStart,today)).length;
      const lo=mine(p.id).filter(l=>l.stage_code===LOST&&within(l.stage_entered_at,mStart,today)).length;
      return `<tr><td><b>${esc(p.full_name)}</b></td>
        <td>${p.joined_date?esc(fmtDate(p.joined_date)):'<span class="quiet">—</span>'}</td>
        <td>${leadsTouched}</td>
        <td>${daysWorked?(leadsTouched/daysWorked).toFixed(1):'—'}</td>
        <td>${esc(cycle.avg)}</td>
        <td>${leadsTouched?(cs.length/leadsTouched).toFixed(1):'—'}</td>
        <td>${w}</td><td>${lo}</td>
        <td>${esc(cash(contractOf(p.id,mStart,today)))}</td>
        <td>${esc(cash(collectedOf(p.id,mStart,today)))}</td></tr>`;}).join('')}
    </tbody></table></div>

    <h3 style="font-size:15px;margin:22px 0 8px">5. MTD Sales Performance</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Sale engineer</th><th>Target</th><th>Payment Collection</th><th>Outstanding Payment</th>
      <th>Shortfall</th><th>Achievement %</th><th>Current Active Pipeline</th>
      <th>Shortfall vs Current Active Pipeline</th><th>Run Rate Achievement</th>
    </tr></thead><tbody>${perf.map(r=>`<tr>
      <td><b>${esc(r.p.full_name)}</b></td>
      <td>${esc(r.t?cash(r.t):'—')}</td><td>${esc(cash(r.c))}</td><td>${esc(cash(r.out))}</td>
      <td>${esc(r.t?cash(r.short):'—')}</td><td>${r.ach==null?'—':r.ach+'%'}</td>
      <td>${esc(cash(r.pipe))}</td>
      <td>${r.t?esc(pct(r.pipe,r.short||1)):'—'}</td>
      <td>${r.runAch==null?'—':r.runAch+'%'}</td></tr>`).join('')}
    </tbody>
    <tfoot><tr><td><b>Total</b></td><td><b>${esc(tot.t?cash(tot.t):'—')}</b></td>
      <td><b>${esc(cash(tot.c))}</b></td><td><b>${esc(cash(tot.out))}</b></td>
      <td><b>${esc(tot.t?cash(tot.short):'—')}</b></td><td><b>${totAch==null?'—':totAch+'%'}</b></td>
      <td><b>${esc(cash(tot.pipe))}</b></td>
      <td><b>${tot.t?esc(pct(tot.pipe,tot.short||1)):'—'}</b></td>
      <td><b>${totRun==null?'—':totRun+'%'}</b></td></tr></tfoot></table></div>
    ${!tot.t?`<div class="hint">No collection target set for ${esc(monthName(thisM))}. Target, shortfall, achievement and run rate stay blank until one is set under Targets.</div>`:''}

    <div class="homegrid">
      ${repPanel('6. MTD Sales Conversion Rate %',
        gFunnel([['Total Raw Lead',gotMtd.length,'var(--viz-s2)'],
                 ['Qualified Lead',qualMtd.length,'var(--viz-s4)'],
                 ['Closed-Won',wonMtd.length,'var(--viz-good)'],
                 ['Closed-Lost',lostMtd.length,'var(--bad)']])
        +ledger([['Raw lead to qualified',pct(qualMtd.length,gotMtd.length)],
                 ['Qualified to won',pct(wonMtd.length,qualMtd.length)],
                 ['Raw lead to won',pct(wonMtd.length,gotMtd.length)]]))}

      ${repPanel('7. MTD Gap Analysis',ledger([
        ['Current Active Pipeline',cash(tot.pipe),pipeAll.covered+' of '+open.length+' quoted'],
        ['Outstanding Payment',cash(tot.out),''],
        ['Expected Revenue (Forecast)',cash(forecast),
          winRate==null?'no won or lost deal yet':Math.round(winRate*100)+'% win rate on pipeline, plus what is owed'],
        ['Shortfall',tot.t?cash(tot.short):'—',tot.t?'against target':'no target set']]))}
    </div>

    <div class="homegrid">
      ${repPanel('8. MTD Active Pipeline by Stage',
        gRank(SALE_STAGES.filter(([c])=>!TERMINAL.includes(c))
          .map(([code,name])=>[name,open.filter(l=>l.stage_code===code
            &&(!REPFILTER.person||l.assigned_to===REPFILTER.person)).length]),
          {color:'var(--viz-1)',order:true,keepZero:true,limit:6,
           emptyWhy:'This fills in as leads move through the pipeline.'}))}

      ${repPanel('MTD Closed-Lost Status',(()=>{
        const reasons={};lostMtd.forEach(l=>{const r=l.lost_reason||'Not recorded';reasons[r]=(reasons[r]||0)+1;});
        return lostMtd.length
          ?gRank(Object.entries(reasons),{color:'var(--bad)',limit:12})
          :blank('Nothing lost this month','No lead was moved to Closed-Lost in '+monthName(thisM)+'.');
      })())}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">MoM — Sale stage by month</h3>
    ${months.length?shown.map(p=>`
      <div style="margin-bottom:14px">
        <div style="font-weight:600;font-size:13px;margin-bottom:5px">${esc(p.full_name)}</div>
        <div class="tablewrap"><table class="table-compact"><thead>
          <tr><th>Month</th><th>#Lead Contact</th>${SALE_STAGES.map(([,n])=>`<th>${esc(n)}</th>`).join('')}</tr>
        </thead><tbody>${months.map(m=>{const [a,b]=monthWin(m);
          return `<tr><td><b>${esc(monthName(m))}</b></td><td>${contactedIn(p.id,a,b)}</td>
            ${stageRow(mine(p.id),a,b).map(v=>`<td>${v}</td>`).join('')}</tr>`;}).join('')}
        </tbody></table></div>
      </div>`).join('')
      :blank('No months to show yet','This fills in as leads accumulate.')}

    <h3 style="font-size:15px;margin:22px 0 8px">MoM — Monthly Sales Performance</h3>
    ${months.length?`<div class="homegrid three">${shown.map(p=>`
      ${repPanel(p.full_name,`<div class="tablewrap"><table class="table-compact"><thead>
        <tr><th>Month</th><th>#Closed-Won</th><th>Contract Value</th><th>Collection</th></tr>
      </thead><tbody>${months.map(m=>{const [a,b]=monthWin(m);
        const w=mine(p.id).filter(l=>l.stage_code===WON&&within(l.stage_entered_at,a,b)).length;
        return `<tr><td>${esc(monthName(m))}</td><td>${w}</td>
          <td>${esc(cash(contractOf(p.id,a,b)))}</td>
          <td>${esc(cash(collectedOf(p.id,a,b)))}</td></tr>`;}).join('')}
      </tbody></table></div>`)}`).join('')}</div>`
      :''}
  `;
}
