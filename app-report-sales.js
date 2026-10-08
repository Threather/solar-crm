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
/* the stage tables add Disqualified after Closed-Lost (Kevin, 8 Oct 2026), so
   every customer who moved in the window lands in exactly one column */
const STAGE_COLS=[...SALE_STAGES,['disq','Disqualified']];

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

/* Daily, Weekly, MTD and MoM each on their own tab, so a salesperson opens
   straight onto the view they want instead of scrolling past the others */
let SALEVIEW='daily';
function setSaleView(v){SALEVIEW=v;renderReports();}

let CHSHEETS=null, CHMET='raw';
function setChMet(v){CHMET=v;renderReports();}
async function exportChannels(){
  const D=CHSHEETS;if(!D)return;
  if(!window.XLSX)await new Promise((ok,no)=>{const x=document.createElement('script');
    x.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';x.onload=ok;x.onerror=no;document.head.appendChild(x);})
    .catch(()=>toast('Could not load the Excel writer'));
  if(!window.XLSX)return;
  const lead=l=>({'Channel':D.name(D.chOf(l)),'Ref ID':l.ref_id||'','Customer':l.customer_name||'','Lead date':localDay(l.lead_date||l.created_at),
    'Stage':(STAGES.find(x=>x.stage_code===l.stage_code)||{}).stage_name||l.stage_code,'Salesperson':l.assigned_to?staffName(l.assigned_to):''});
  const wb=XLSX.utils.book_new();
  const add=(n,rows)=>XLSX.utils.book_append_sheet(wb,rows.length?XLSX.utils.json_to_sheet(rows):XLSX.utils.aoa_to_sheet([['None']]),n);
  add('Raw Lead',D.raw.map(lead));add('Qualified',D.qual.map(lead));
  add('Closed-Won',D.won.map(l=>({...lead(l),'Won on':localDay(l.stage_entered_at),'Contract value':D.contractOf(l)})));
  add('Payments',D.pays.map(p=>{const l=D.byId[p.lead_id];return {'Channel':D.name(D.chOf(l)),'Ref ID':l.ref_id||'','Customer':l.customer_name||'',
    'Paid on':localDay(p.paid_on),'Counted in':localDay(p.count_month||p.paid_on),'Amount':Number(p.amount_usd||0)};}));
  XLSX.writeFile(wb,'Performance by Channel.xlsx');
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
    repByIds(()=>sb.from('lead_activities').select('lead_id,activity_type,created_at,note_date,to_stage').order('id'),ids),
    repByIds(()=>sb.from('quotations').select('lead_id,price_usd,created_at').order('created_at').order('id'),ids),
    repByIds(()=>sb.from('lead_financials').select('lead_id,final_sale_usd').order('lead_id'),ids),
    repByIds(()=>sb.from('lead_payments').select('lead_id,amount_usd,other_fee_usd,paid_on,count_month').order('id'),ids),
    repByIds(()=>sb.from('lead_finance').select('lead_id,contract_total_usd,follow_up_date').order('lead_id'),ids)
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
  const people=STAFF.filter(s=>(s.is_active&&['sales','manager'].includes(s.role))||holders.has(s.id))
    /* whoever has left (Han) sits at the right of every chart (Kevin, 29 Sep 2026) */
    .sort((a,b)=>(a.is_active?0:1)-(b.is_active?0:1));
  const shown=ME.role==='sales'?people.filter(p=>p.id===ME.id)
            :REPFILTER.person?people.filter(p=>p.id===REPFILTER.person):people;

  const within=(v,a,b)=>{const d=localDay(v);return !!d&&d>=a&&d<=b;};
  /* ten call sites meant ten full scans of every lead for every person.
     Indexed once. */
  const byPerson={};
  rows.forEach(l=>{if(l.assigned_to)(byPerson[l.assigned_to]=byPerson[l.assigned_to]||[]).push(l);});
  const mine=id=>byPerson[id]||[];

  /* A lead entered a stage inside a window if the log says so, or - where the
     log has nothing for that stage - if the lead sits there now and got there
     inside it. See the note at the top: the log is thin. */
  const enteredIn=(l,code,a,b)=>{
    /* the Closed-Lost column counts Closed-Lost only - qualified, then lost,
       and still lost - never a Disqualified lead or one reopened since, the
       same test Management counts its 39 by, and on the lost date
       (stage_entered_at) rather than the log, which still carries the
       import's moves for leads re-dated from the client's C-lost sheet
       (29 Sep 2026) */
    if(code===LOST)return isClosedLost(l)&&within(l.stage_entered_at,a,b);
    /* lost without qualifying: on its lost date, or a logged move to lost */
    if(code==='disq')return isDisqualified(l)&&(within(l.stage_entered_at,a,b)
      ||moves.some(m=>m.lead===l.id&&m.to===LOST&&m.day>=a&&m.day<=b));
    /* Won the same way: on the win date the lead carries, as Management counts
       it. The client's Activity Log (loaded 30 Sep 2026) logs a second
       Closed-Won for a customer's later purchase, which would count twice. */
    if(code===WON)return l.stage_code===WON&&within(l.stage_entered_at,a,b);
    const logged=moves.some(m=>m.lead===l.id&&m.to===code&&m.day>=a&&m.day<=b);
    if(logged)return true;
    if((loggedFor[l.id]||new Set()).has(code))return false;
    return l.stage_code===code&&within(l.stage_entered_at||l.created_at,a,b);
  };
  /* ONE CUSTOMER, ONE COLUMN (Kevin, 8 Oct 2026): a lead that moved twice in
     the window counts once, in the last stage it reached there - Information
     Gathering then Telling Price is 1 under Telling Price, not 1 under each. */
  const dayIn=(l,code,a,b)=>{
    if(code===WON||code===LOST)return localDay(l.stage_entered_at);
    if(code==='disq'){const ds=moves.filter(m=>m.lead===l.id&&m.to===LOST&&m.day>=a&&m.day<=b).map(m=>m.day)
      .concat(within(l.stage_entered_at,a,b)?[localDay(l.stage_entered_at)]:[]).sort();return ds[ds.length-1];}
    const ds=moves.filter(m=>m.lead===l.id&&m.to===code&&m.day>=a&&m.day<=b).map(m=>m.day).sort();
    return ds.length?ds[ds.length-1]:localDay(l.stage_entered_at||l.created_at);
  };
  const lastIn=(l,a,b)=>{let best=null,bd='';
    STAGE_COLS.forEach(([code],i)=>{if(!enteredIn(l,code,a,b))return;
      const d=dayIn(l,code,a,b)||'';if(best==null||d>=bd){best=i;bd=d;}});
    return best;};
  const stageRow=(set,a,b)=>{const r=STAGE_COLS.map(()=>0);
    set.forEach(l=>{const i=lastIn(l,a,b);if(i!=null)r[i]++;});return r;};
  /* #Lead Contact: customers with a call or note in the window, OR who moved
     stage in it - a move means she dealt with them (Kevin, 8 Oct 2026). One
     customer once. */
  const contactedIn=(id,a,b)=>{
    const s=new Set(contacts.filter(c=>byId[c.lead]&&byId[c.lead].assigned_to===id
      &&c.day>=a&&c.day<=b).map(c=>c.lead));
    /* landing on Information Gathering is not a contact (Kevin, 8 Oct) */
    mine(id).forEach(l=>{const i=lastIn(l,a,b);if(i!=null&&i>0)s.add(l.id);});
    return s.size;};

  const pct=repPct, cash=repCash;
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
  /* Closed-Lost is qualified-then-lost; Disqualified is counted beside it */
  const lostMtd=rows.filter(l=>isClosedLost(l)&&within(l.stage_entered_at,mtd[0],mtd[1]));
  const disqMtd=rows.filter(l=>isDisqualified(l)&&within(l.stage_entered_at,mtd[0],mtd[1]));
  const qualMtd=gotMtd.filter(l=>isQualLead(l));

  /* ---- block 5 and 7 figures, per person and for the company ---- */
  const targetOf=id=>Number(tg.person[id]?.collection||0);
  const collectedOf=(id,a,b)=>pays.filter(p=>byId[p.lead_id]&&byId[p.lead_id].assigned_to===id
    &&within(countDay(p),a,b)).reduce((x,p)=>x+Number(p.amount_usd||0),0);
  const outstandingOf=id=>mine(id).filter(l=>l.stage_code===WON).reduce((x,l)=>x+owedOf(l),0);
  const pipeOf=id=>pipelineValue(mine(id).filter(l=>!TERMINAL.includes(l.stage_code)),quotBy).value;
  /* the contract, NOT dueOf: dueOf adds the payment fees on top because it
     answers "how much is owed". Total Contract Value is what was signed. */
  const contractOf=(id,a,b)=>mine(id).filter(l=>l.stage_code===WON&&within(l.stage_entered_at,a,b))
    .reduce((x,l)=>x+Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0),0);

  /* ---- by channel (council, 8 Oct 2026): one row per channel, five columns
     each on its own scale, for the dates picked. Raw = leads that came in;
     Qualified = those of them qualified by the last day (the share in
     brackets is the only honest rate - the other columns are dated
     differently, so Won / Raw would compare different customers); Won,
     Contract $ = deals won in the dates; Collected $ = payments received in
     the dates, under the channel of the lead they belong to. Everyone, or
     only the person picked, as the rest of the tab. */
  const chWin=win, chEnd=win[1]<today?win[1]:today;
  const qualOnS={};moves.forEach(m=>{if(QUALIFIED_STAGES.includes(m.to)&&(!qualOnS[m.lead]||m.day<qualOnS[m.lead]))qualOnS[m.lead]=m.day;});
  const chScope=l=>ME.role==='sales'?l.assigned_to===ME.id:!REPFILTER.person||l.assigned_to===REPFILTER.person;
  const CH_ORDER=['Digital_Marketing','Offline_Marketing','Direct_Sales','Third_Party','Existing_Customer'];
  const chOf=l=>l.lead_channel||'none';
  const chName=c=>c==='none'?'No channel':c.replace(/_/g,' ');
  const chRaw=rows.filter(l=>chScope(l)&&within(dayOf(l),chWin[0],chWin[1]));
  const chQual=chRaw.filter(l=>qualText(l)==='Qualified'&&localDay(qualOnS[l.id]||dayOf(l))<=chEnd);
  const chWon=rows.filter(l=>chScope(l)&&l.stage_code===WON&&within(l.stage_entered_at,chWin[0],chWin[1]));
  const chPays=pays.filter(p=>byId[p.lead_id]&&chScope(byId[p.lead_id])&&within(countDay(p),chWin[0],chWin[1]));
  const chContractOf=l=>Number(finBy[l.id]?.contract_total_usd??saleBy[l.id]??0);
  const chKeys=[...new Set([...CH_ORDER,...[...chRaw,...chWon,...chPays.map(p=>byId[p.lead_id])].map(chOf)])]
    .sort((a,b)=>(a==='none')-(b==='none')||((CH_ORDER.indexOf(a)+1||99)-(CH_ORDER.indexOf(b)+1||99))||a.localeCompare(b));
  const chRows=chKeys.map(c=>({c,raw:chRaw.filter(l=>chOf(l)===c).length,qual:chQual.filter(l=>chOf(l)===c).length,
    won:chWon.filter(l=>chOf(l)===c).length,contract:chWon.filter(l=>chOf(l)===c).reduce((a,l)=>a+chContractOf(l),0),
    coll:chPays.filter(p=>chOf(byId[p.lead_id])===c).reduce((a,p)=>a+Number(p.amount_usd||0),0)}))
    .filter(r=>r.raw||r.won||r.coll||CH_ORDER.includes(r.c));
  CHSHEETS={raw:chRaw,qual:chQual,won:chWon,pays:chPays,byId,contractOf:chContractOf,name:chName,chOf};

  /* BY SUB-CHANNEL (Kevin, 8 Oct 2026): of the leads that came in during the
     dates, how many gave a phone, qualified and were disqualified - by the
     last day picked, as the Management board counts them. Grouped under the
     channel, with a blank sub-channel kept as its own row so the rows add up
     to the channel. */
  const subOf=l=>(l.lead_sub_channel||'').trim()||'(no sub-channel)';
  const sbStat=set=>({raw:set.length,phone:set.filter(l=>(l.phone||'').trim()).length,
    qual:set.filter(l=>chQual.includes(l)).length,
    disq:set.filter(l=>isDisqualified(l)&&localDay(l.stage_entered_at||dayOf(l))<=chEnd).length});
  const sbGroups=chKeys.map(c=>{const inC=chRaw.filter(l=>chOf(l)===c);
    const subs=[...new Set(inC.map(subOf))].map(sb=>({sb,...sbStat(inC.filter(l=>subOf(l)===sb))}))
      .sort((a,b)=>(a.sb==='(no sub-channel)')-(b.sb==='(no sub-channel)')||b.raw-a.raw);
    return {c,tot:sbStat(inC),subs};}).filter(g=>g.tot.raw);
  const sbTot=sbStat(chRaw);
  const sbMax=k=>Math.max(1,...sbGroups.flatMap(g=>g.subs.map(x=>x[k])));
  const sbPct=(n,d)=>d?` <span class="quiet">(${Math.round(n/d*100)}%)</span>`:'';
  const sbCell=(x,k,col)=>`<td class="chcell"><div class="chbar"><i style="width:${x[k]?Math.max(2,x[k]/sbMax(k)*100):0}%;background:${col}"></i></div><span>${x[k]}${k==='raw'?'':sbPct(x[k],x.raw)}</span></td>`;
  const sbRow=(x,label,cls)=>`<tr class="${cls}"><td>${label}</td>${sbCell(x,'raw','var(--c-raw)')}${sbCell(x,'phone','var(--viz-4)')}${sbCell(x,'qual','var(--c-qual)')}${sbCell(x,'disq','var(--c-disq)')}</tr>`;
  const sbTable=sbGroups.length?`<div class="tablewrap"><table class="table-compact chtable sbtable"><thead><tr>
      <th>Channel / Sub-channel</th><th>Raw Lead</th><th>Phone received</th><th>Qualified</th><th>Disqualified</th></tr></thead><tbody>`
    +sbGroups.map(g=>`<tr class="sbch"><td><b>${esc(chName(g.c))}</b></td><td><b>${g.tot.raw}</b></td>
        <td><b>${g.tot.phone}</b>${sbPct(g.tot.phone,g.tot.raw)}</td><td><b>${g.tot.qual}</b>${sbPct(g.tot.qual,g.tot.raw)}</td><td><b>${g.tot.disq}</b>${sbPct(g.tot.disq,g.tot.raw)}</td></tr>`
      +g.subs.map(x=>sbRow(x,`<span class="nm">${esc(x.sb)}</span>`,'chsub')).join('')).join('')
    +`</tbody><tfoot><tr><td><b>Total</b></td><td><b>${sbTot.raw}</b></td><td><b>${sbTot.phone}</b>${sbPct(sbTot.phone,sbTot.raw)}</td>
      <td><b>${sbTot.qual}</b>${sbPct(sbTot.qual,sbTot.raw)}</td><td><b>${sbTot.disq}</b>${sbPct(sbTot.disq,sbTot.raw)}</td></tr></tfoot></table></div>`
    :blank('No leads in these dates','Pick other dates.');
  const chTot=chRows.reduce((a,r)=>({raw:a.raw+r.raw,qual:a.qual+r.qual,won:a.won+r.won,contract:a.contract+r.contract,coll:a.coll+r.coll}),{raw:0,qual:0,won:0,contract:0,coll:0});
  const chMax=k=>Math.max(1,...chRows.map(r=>r[k]));
  const chCell=(r,k,fmt,col,extra)=>`<td class="chcell"><div class="chbar"><i style="width:${r[k]?Math.max(2,r[k]/chMax(k)*100):0}%;background:${col}"></i></div><span>${fmt(r[k])}${extra||''}</span></td>`;
  const chTable=`<div class="tablewrap"><table class="table-compact chtable"><thead><tr>
      <th>Channel</th><th>Raw Lead</th><th>Qualified</th><th>Closed-Won</th><th>Contract Value</th><th>Payment Collected</th></tr></thead><tbody>`
    +chRows.map(r=>`<tr><td><b class="nm">${esc(chName(r.c))}</b></td>
      ${chCell(r,'raw',String,'var(--c-raw)')}
      ${chCell(r,'qual',String,'var(--c-qual)',r.raw?` <span class="quiet">(${Math.round(r.qual/r.raw*100)}%)</span>`:'')}
      ${chCell(r,'won',String,'var(--c-won)')}
      ${chCell(r,'contract',cash,'var(--viz-2)')}
      ${chCell(r,'coll',cash,'var(--viz-4)')}</tr>`).join('')
    +`</tbody><tfoot><tr><td><b>Total</b></td><td><b>${chTot.raw}</b></td>
      <td><b>${chTot.qual}</b>${chTot.raw?` <span class="quiet">(${Math.round(chTot.qual/chTot.raw*100)}%)</span>`:''}</td>
      <td><b>${chTot.won}</b></td><td><b>${esc(cash(chTot.contract))}</b></td><td><b>${esc(cash(chTot.coll))}</b></td></tr></tfoot></table></div>`;

  /* MoM by channel (Kevin, 8 Oct 2026): one number at a time, months down,
     channels across. Each month is its own window, counted the same way as
     the MTD table; Qualified is "of that month's leads, qualified by its
     last day". */
  const CH_MET=[['raw','Raw Lead'],['qual','Qualified'],['won','Closed-Won'],['contract','Contract Value'],['coll','Payment Collected']];
  const chMonth=(k,a,b,c)=>{
    const inC=l=>chOf(l)===c&&chScope(l);
    if(k==='raw')return rows.filter(l=>inC(l)&&within(dayOf(l),a,b)).length;
    if(k==='qual')return rows.filter(l=>inC(l)&&within(dayOf(l),a,b)&&qualText(l)==='Qualified'&&localDay(qualOnS[l.id]||dayOf(l))<=b).length;
    const w=rows.filter(l=>inC(l)&&l.stage_code===WON&&within(l.stage_entered_at,a,b));
    if(k==='won')return w.length;
    if(k==='contract')return w.reduce((x,l)=>x+chContractOf(l),0);
    return pays.filter(p=>byId[p.lead_id]&&inC(byId[p.lead_id])&&within(countDay(p),a,b)).reduce((x,p)=>x+Number(p.amount_usd||0),0);
  };

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

  const head=`<tr><th>Sale engineer</th><th>#Lead Contact</th>${STAGE_COLS.map(([code,n])=>`<th class="st-${code}">${esc(n)}</th>`).join('')}</tr>`;
  const stageTable=(a,b)=>{
    const body=shown.map(p=>{
      const r=stageRow(mine(p.id),a,b);
      return `<tr><td><b>${esc(p.full_name)}</b></td><td>${contactedIn(p.id,a,b)}</td>`
        +r.map((v,i)=>`<td class="st-${STAGE_COLS[i][0]}${v?' nz':''}">${v}</td>`).join('')+`</tr>`;}).join('');
    const totals=STAGE_COLS.map((_,i)=>shown.reduce((x,p)=>x+stageRow(mine(p.id),a,b)[i],0));
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

  const VIEWS=[['daily','Daily'],['weekly','Weekly'],['mtd','MTD'],['mom','MoM']];
  const tabs=`<div class="scope saleview" role="group" aria-label="View">${VIEWS.map(([k,l])=>
    `<button class="${SALEVIEW===k?'on':''}" aria-pressed="${SALEVIEW===k}" onclick="setSaleView('${k}')">${l}</button>`).join('')}</div>`;
  const show=v=>SALEVIEW===v;
  /* one stage table body shared by the daily, weekly and monthly breakdowns */
  const brkHead=first=>`<tr><th>${first}</th><th>#Lead Contact</th>${STAGE_COLS.map(([code,n])=>`<th class="st-${code}">${esc(n)}</th>`).join('')}</tr>`;
  const brkRow=(p,label,a,b)=>{const r=stageRow(mine(p.id),a,b), c=contactedIn(p.id,a,b);
    const empty=!c&&!r.some(Boolean);
    return `<tr class="${empty?'quietrow':''}"><td><b>${label}</b></td><td>${c}</td>${r.map((v,i)=>`<td class="st-${STAGE_COLS[i][0]}${v?' nz':''}">${v}</td>`).join('')}</tr>`;};

  /* the Total row under a breakdown adds up the rows above it, so the total and
     the rows can never disagree. extra is the blank cells a weekly table has
     for From and To. */
  const brkTotal=(p,wins,extra)=>{
    const c=wins.reduce((x,[a,b])=>x+contactedIn(p.id,a,b),0);
    const r=STAGE_COLS.map((_,i)=>wins.reduce((x,[a,b])=>x+stageRow(mine(p.id),a,b)[i],0));
    return `<tfoot><tr><td><b>Total</b></td>${'<td></td>'.repeat(extra||0)}<td><b>${c}</b></td>${r.map(v=>`<td><b>${v}</b></td>`).join('')}</tr></tfoot>`;};

  $('main').innerHTML=repBar('Sales report',personFilter)+tabs+`
   <div class="salerep">
   ${show('daily')?`
    <h3 class="sechead">1. Daily Sales Performance</h3>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:10px">${esc(repWindowSentence())}</p>
    ${stageTable(win[0],win[1])}`:''}

   ${show('weekly')?`
    <h3 class="sechead">2. Weekly Sale Stage — ${esc(monthName(thisM))}</h3>
    ${shown.map(p=>`
      <div style="margin-bottom:14px">
        <div class="person">${esc(p.full_name)}</div>
        <div class="tablewrap"><table class="table-compact"><thead>
          <tr><th>Week</th><th>From</th><th>To</th><th>#Lead Contact</th>
            ${STAGE_COLS.map(([code,n])=>`<th class="st-${code}">${esc(n)}</th>`).join('')}</tr></thead>
          <tbody>${saleWeeks(thisM).map(([n,a,b])=>`<tr>
            <td><b>${n}</b></td><td>${esc(fmtDate(a))}</td><td>${esc(fmtDate(b))}</td>
            <td>${contactedIn(p.id,a,b)}</td>
            ${stageRow(mine(p.id),a,b).map((v,i)=>`<td class="st-${STAGE_COLS[i][0]}${v?' nz':''}">${v}</td>`).join('')}
          </tr>`).join('')}</tbody>${brkTotal(p,saleWeeks(thisM).map(([,a,b])=>[a,b]),2)}</table></div>
      </div>`).join('')}`:''}

   ${show('mtd')?`
    <h3 class="sechead">3. MTD Sales Stage</h3>
    ${stageTable(mStart,today)}

    <h3 class="sechead">4. MTD Sales and Lead Summary</h3>
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
      const lo=mine(p.id).filter(l=>isClosedLost(l)&&within(l.stage_entered_at,mStart,today)).length;
      return `<tr><td><b>${esc(p.full_name)}</b></td>
        <td>${p.joined_date?esc(fmtDate(p.joined_date)):'<span class="quiet">—</span>'}</td>
        <td>${contactedIn(p.id,mStart,today)}</td>
        <td>${daysWorked?(leadsTouched/daysWorked).toFixed(1):'—'}</td>
        <td>${esc(cycle.avg)}${cycle.n?`<span class="days">${cycle.n} won</span>`:''}</td>
        <td>${leadsTouched?(cs.length/leadsTouched).toFixed(1):'—'}</td>
        <td>${w}</td><td>${lo}</td>
        <td>${esc(cash(contractOf(p.id,mStart,today)))}</td>
        <td>${esc(cash(collectedOf(p.id,mStart,today)))}</td></tr>`;}).join('')}
    </tbody></table></div>

    <h3 class="sechead">5. MTD Sales Performance</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Sale engineer</th><th>Target</th><th>Payment Collection</th><th>Outstanding Payment</th>
      <th>Shortfall</th><th>Achievement %</th><th>Current Active Pipeline</th>
      <th>Shortfall vs Current Active Pipeline</th><th>Run Rate Achievement</th>
    </tr></thead><tbody>${perf.map(r=>`<tr>
      <td><b>${esc(r.p.full_name)}</b></td>
      <td>${esc(r.t?cash(r.t):'—')}</td><td>${esc(cash(r.c))}</td><td>${esc(cash(r.out))}</td>
      <td>${esc(r.t?cash(r.short):'—')}</td><td>${r.ach==null?'—':r.ach+'%'}</td>
      <td>${esc(cash(r.pipe))}</td>
      <td>${!r.t?'—':!r.short?'target met':esc(pct(r.pipe,r.short))}</td>
      <td>${r.runAch==null?'—':r.runAch+'%'}</td></tr>`).join('')}
    </tbody>
    <tfoot><tr><td><b>Total</b></td><td><b>${esc(tot.t?cash(tot.t):'—')}</b></td>
      <td><b>${esc(cash(tot.c))}</b></td><td><b>${esc(cash(tot.out))}</b></td>
      <td><b>${esc(tot.t?cash(tot.short):'—')}</b></td><td><b>${totAch==null?'—':totAch+'%'}</b></td>
      <td><b>${esc(cash(tot.pipe))}</b></td>
      <td><b>${!tot.t?'—':!tot.short?'target met':esc(pct(tot.pipe,tot.short))}</b></td>
      <td><b>${totRun==null?'—':totRun+'%'}</b></td></tr></tfoot></table></div>
    ${!tot.t?`<div class="hint">No collection target set for ${esc(monthName(thisM))}.</div>`:''}

    <div class="homegrid">
      ${repPanel('6. MTD Sales Conversion Rate %',
        gFunnel([['Total Raw Lead',gotMtd.length,'var(--viz-s2)'],
                 ['Qualified Lead',qualMtd.length,'var(--viz-s4)'],
                 ['Closed-Won',wonMtd.length,'var(--viz-good)'],
                 ['Closed-Lost',lostMtd.length,'var(--bad)'],
                 ['Disqualified',disqMtd.length,'var(--viz-mute)']])
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
        const reasons={};lostMtd.forEach(l=>{const r=lostReasonOf(l);reasons[r]=(reasons[r]||0)+1;});
        return lostMtd.length
          ?gRank(Object.entries(reasons),{color:'var(--bad)',limit:12,wrap:true})
          :blank('Nothing lost this month','No lead was moved to Closed-Lost in '+monthName(thisM)+'.');
      })())}
    </div>

    <div class="chhead"><h3 class="sechead">Performance by Channel</h3>
      <button class="btn-line" onclick="exportChannels()">Export Excel</button></div>
    ${chTable}

    <h3 class="sechead">Leads by Sub-channel</h3>
    ${sbTable}`:''}

   ${show('mom')?`
    <h3 class="sechead">MoM — Sale stage by month</h3>
    ${months.length?shown.map(p=>`
      <div style="margin-bottom:14px">
        <div class="person">${esc(p.full_name)}</div>
        <div class="tablewrap"><table class="table-compact"><thead>
          <tr><th>Month</th><th>#Lead Contact</th>${STAGE_COLS.map(([code,n])=>`<th class="st-${code}">${esc(n)}</th>`).join('')}</tr>
        </thead><tbody>${months.map(m=>{const [a,b]=monthWin(m);
          return `<tr><td><b>${esc(monthName(m))}</b></td><td>${contactedIn(p.id,a,b)}</td>
            ${stageRow(mine(p.id),a,b).map((v,i)=>`<td class="st-${STAGE_COLS[i][0]}${v?' nz':''}">${v}</td>`).join('')}</tr>`;}).join('')}
        </tbody>${brkTotal(p,months.map(monthWin))}</table></div>
      </div>`).join('')
      :blank('No months to show yet','This fills in as leads accumulate.')}

    <h3 class="sechead">MoM — Monthly Sales Performance</h3>
    ${months.length?`<div class="homegrid three">${shown.map(p=>`
      ${repPanel(p.full_name,`<div class="tablewrap"><table class="table-compact"><thead>
        <tr><th>Month</th><th>Lead Received</th><th>#Closed-Won</th><th>Contract Value</th><th>Collection</th></tr>
      </thead><tbody>${months.map(m=>{const [a,b]=monthWin(m);
        const w=mine(p.id).filter(l=>l.stage_code===WON&&within(l.stage_entered_at,a,b)).length;
        /* leads this person holds that came in that month, by lead date
           (Kevin, 8 Oct 2026) */
        const rcv=mine(p.id).filter(l=>within(dayOf(l),a,b)).length;
        return `<tr><td>${esc(monthName(m))}</td><td>${rcv}</td><td>${w}</td>
          <td>${esc(cash(contractOf(p.id,a,b)))}</td>
          <td>${esc(cash(collectedOf(p.id,a,b)))}</td></tr>`;}).join('')}
      </tbody><tfoot><tr><td><b>Total</b></td>
        <td><b>${months.reduce((x,m)=>{const [a,b]=monthWin(m);return x+mine(p.id).filter(l=>within(dayOf(l),a,b)).length;},0)}</b></td>
        <td><b>${months.reduce((x,m)=>{const [a,b]=monthWin(m);return x+mine(p.id).filter(l=>l.stage_code===WON&&within(l.stage_entered_at,a,b)).length;},0)}</b></td>
        <td><b>${esc(cash(months.reduce((x,m)=>x+contractOf(p.id,...monthWin(m)),0)))}</b></td>
        <td><b>${esc(cash(months.reduce((x,m)=>x+collectedOf(p.id,...monthWin(m)),0)))}</b></td></tr></tfoot></table></div>`)}`).join('')}</div>`
      :''}

    <h3 class="sechead">MoM — Performance by Channel</h3>
    <div class="scope" role="group" aria-label="Which figure" style="margin-bottom:10px">${CH_MET.map(([k,l])=>
      `<button class="${CHMET===k?'on':''}" aria-pressed="${CHMET===k}" onclick="setChMet('${k}')">${l}</button>`).join('')}</div>
    ${months.length?(()=>{
      const money=['contract','coll'].includes(CHMET), f=v=>money?cash(v):String(v);
      const cols=chKeys.filter(c=>CH_ORDER.includes(c)||months.some(m=>chMonth(CHMET,...monthWin(m),c)));
      const grid=months.map(m=>cols.map(c=>chMonth(CHMET,...monthWin(m),c)));
      const max=Math.max(1,...grid.flat());
      return `<div class="tablewrap"><table class="table-compact chtable"><thead><tr><th>Month</th>${cols.map(c=>`<th>${esc(chName(c))}</th>`).join('')}<th>Total</th></tr></thead><tbody>`
        +months.map((m,i)=>`<tr><td><b>${esc(monthName(m))}</b></td>${grid[i].map(v=>`<td class="chcell"><div class="chbar"><i style="width:${v?Math.max(2,v/max*100):0}%;background:var(--c-${CHMET==='coll'?'active':CHMET==='contract'?'raw':CHMET})"></i></div><span>${esc(f(v))}</span></td>`).join('')}
          <td><b>${esc(f(grid[i].reduce((a,b)=>a+b,0)))}</b></td></tr>`).join('')
        +`</tbody><tfoot><tr><td><b>Total</b></td>${cols.map((c,j)=>`<td><b>${esc(f(grid.reduce((a,r)=>a+r[j],0)))}</b></td>`).join('')}
          <td><b>${esc(f(grid.flat().reduce((a,b)=>a+b,0)))}</b></td></tr></tfoot></table></div>`;})()
      :blank('No months to show yet','This fills in as leads accumulate.')}`:''}
   </div>
  `;
}
