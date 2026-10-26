/* ---------------- OPERATIONS REPORT ----------------
   The client's "Daily Report for Project Execution", in their order and their
   wording. A project is a won deal; it leaves the active count when somebody
   confirms the installation finished, not when a planned date passes.
   Every figure here comes off dates already on the lead — nothing new was
   needed for this report. */

/* which date says the file went to EDC, and which says they inspected it.
   Small systems take the short form, large ones the long one, so each has two
   possible columns and the first one filled is the answer. */
const edcSentOn=l=>l.edc_doc_date||l.edc_portal_date||null;
const edcSeenOn=l=>l.edc_inspection_date||l.edc_pp_date||l.edc_provincial_date||null;
/* Installation finished: the confirmation is the truth. The planned end date
   is a fallback for deals recorded before confirming existed, but only once
   it has actually passed — an end date next week is a booking, not a finish. */
const instDoneOn=l=>{
  if(l.installation_confirmed_at)return l.installation_confirmed_at;
  if(l.installation_end&&localDay(l.installation_end)<=localDay(new Date()))return l.installation_end;
  return null;
};

async function renderOpsReport(){
  const rows=await fetchLeads(q=>q.eq('stage_code',WON));
  const range=repRange(REPPERIOD);
  const teams=[...new Set(rows.map(l=>l.installation_team).filter(Boolean))].sort();
  /* the panel below names a "No team yet" bucket, so the filter can pick it */
  const f=!REPFILTER.team?rows
    :REPFILTER.team==='__none'?rows.filter(l=>!l.installation_team)
    :rows.filter(l=>l.installation_team===REPFILTER.team);

  /* a project is a Full package deal; a service deal never counts as one
     (client, 14 Oct 2026). EDC Pending Submit counts installed jobs only (client, 14 Oct 2026). */
  const job=l=>!isService(l);
  const jobs=f.filter(job);
  const done=jobs.filter(l=>instDoneOn(l));
  const active=jobs.filter(l=>!instDoneOn(l));
  /* not started yet: no start date, or one still ahead (client, 14 Oct 2026) */
  const pendingInst=active.filter(l=>!l.installation_start||localDay(l.installation_start)>localDay(new Date()));
  /* the two EDC boxes read the dates, not edcFields: most won deals carry no
     system type, and a submission date already proves EDC applies. Only an
     explicit Off-Grid is exempt. */
  const edcSubmit=f.filter(l=>hasPart(l,'EDC/EAC')&&l.system_type!=='Off-Grid'&&!edcSentOn(l)
    &&hasPart(l,'Installation')&&instDoneOn(l));
  const edcInspect=f.filter(l=>hasPart(l,'EDC/EAC')&&edcSentOn(l)&&!edcSeenOn(l));
  const today=localDay(new Date());

  /* The five figures the client puts at the top. "All time" asks about state,
     not about a window, so it must not also demand that a date was filled in —
     a BOQ marked Done with no date is still a BOQ that was released. */
  const windowed=REPPERIOD!=='all';
  const inW=v=>!windowed||(v&&inRange(localDay(v),range));
  const inPeriod=v=>!windowed||inRange(v,range);
  const doneInPeriod=jobs.filter(l=>instDoneOn(l)&&inPeriod(instDoneOn(l)));
  /* the pipeline and the teams follow the window (client, 14 Oct 2026): each
     bar by the date that finishes its own step; a job on site counts when its
     installation overlaps the window. All time is state, as before. */
  const wS=range[0], wE=range[1];
  const onSite=l=>{const s=l.installation_start&&localDay(l.installation_start);
    if(!s||s>today)return false; if(!windowed)return !instDoneOn(l);
    const e=instDoneOn(l)?localDay(instDoneOn(l)):today; return s<=wE&&e>=wS;};
  const pBoq=jobs.filter(l=>l.boq_status==='Done'&&inW(l.boq_date));
  const pSched=active.filter(l=>l.installation_start&&localDay(l.installation_start)>today&&(!windowed||localDay(l.installation_start)>=wS));
  const pRun=jobs.filter(l=>onSite(l)&&!instDoneOn(l));
  const pDone=jobs.filter(l=>instDoneOn(l)&&inW(instDoneOn(l)));
  const pWait=f.filter(l=>hasPart(l,'EDC/EAC')&&edcSentOn(l)&&!edcSeenOn(l)&&inW(edcSentOn(l)));
  const pSeen=f.filter(l=>hasPart(l,'EDC/EAC')&&edcSeenOn(l)&&inW(edcSeenOn(l)));
  const pMax=Math.max(1,pBoq.length,pSched.length,pRun.length,pDone.length,pWait.length,pSeen.length);
  const boqInPeriod=f.filter(l=>l.boq_status==='Done'&&!isService(l)&&inPeriod(l.boq_date));

  /* the four turnaround targets the manager sets each month, in days. Read for
     the month being shown, like every other target in the app. */
  const tg=await loadTargets(monthStart());
  /* after-sale cases raised in the window (site engineer and admin can read them) */
  const {data:asAll}=await rowsOf(()=>sb.from('after_sales').select('id,lead_id,issue_date,status,cause,level1_date,level2_date,level3_date,more_levels').order('issue_date').order('id'));
  const asIn=(asAll||[]).filter(r=>r.issue_date&&inW(r.issue_date));
  const asSolved=asIn.filter(r=>(r.status||'Pending')==='Solved');
  const asTat=avgDays(asSolved.map(r=>{const t=asTurn(r);return t?t.days:null;}));
  const asCnt={};asIn.forEach(r=>{const c=r.cause||'Not recorded';asCnt[c]=(asCnt[c]||0)+1;});
  const asCauses=Object.keys(asCnt).sort((a,b)=>asCnt[b]-asCnt[a]);
  const sla={boq:Number(tg.company.sla_boq||0),install:Number(tg.company.sla_install||0),
             inform:Number(tg.company.sla_edcinform||0),inspect:Number(tg.company.sla_edcinspect||0),
             deliv:Number(tg.company.sla_delivery||0)};

  /* A turnaround is what a step ACTUALLY took, so a start date still in the
     future is a booking and not an outcome - one job pencilled in for December
     dragged this average from 5 days to 42 and made the slowest-step line
     point at the wrong step entirely. Same rule as the Installation Start
     count above. */
  const started=l=>l.installation_start&&localDay(l.installation_start)<=today;
  /* each step belongs to the window its finishing date falls in, so Today and
     This month show how fast the steps finished then went (Kevin, 30 Sep 2026).
     All time lets every step through, as before. */
  /* BOQ released to the kit arriving on site (27 Sep 2026); a delivery date still
     ahead is a booking, as with installation */
  const tatDeliv =avgDays(f.map(l=>l.delivery_date&&localDay(l.delivery_date)<=today&&inW(l.delivery_date)?daysBetween(l.boq_date,l.delivery_date):null));
  const tatBoq   =avgDays(f.map(l=>started(l)&&inW(l.installation_start)?daysBetween(l.boq_date,l.installation_start):null));
  const tatInst  =avgDays(f.map(l=>started(l)&&inW(instDoneOn(l))?daysBetween(l.installation_start,instDoneOn(l)):null));
  const tatInform=avgDays(f.map(l=>inW(edcSentOn(l))?daysBetween(instDoneOn(l),edcSentOn(l)):null));
  const tatSeen  =avgDays(f.map(l=>inW(edcSeenOn(l))?daysBetween(edcSentOn(l),edcSeenOn(l)):null));

  /* BOQ released to the day EDC signed it off, which is the whole job. Falls
     back to the finish when EDC has not been round yet, so a project still in
     the paperwork counts as far as it has actually got. */
  const endToEnd=avgDays(f.map(l=>daysBetween(l.boq_date,edcSeenOn(l)||instDoneOn(l))));
  /* which step is furthest past its target. Steps with no target set, or no
     data yet, cannot be behind. */
  const steps=[['BOQ to delivery',tatDeliv,sla.deliv],['BOQ to installation',tatBoq,sla.boq],['Installation duration',tatInst,sla.install],
               ['Installation to EDC submission',tatInform,sla.inform],
               ['EDC submission to inspection',tatSeen,sla.inspect]];
  const behind=steps.filter(([,a,s])=>s&&a.avg!=='\u2014'&&Number(a.avg)>s)
    .map(([k,a,s])=>({step:k,over:+(Number(a.avg)-s).toFixed(1)}))
    .sort((x,y)=>y.over-x.over)[0];

  /* the top row mixes two clocks: active and pending are now, the other three
     happened inside the chosen window. Saying which stops the same words
     meaning two different numbers on one screen. */
  const per=repPeriodWord();
  const teamFilter=`<select onchange="setRepFilter('team',this.value)">
      <option value="">All teams</option>
      ${teams.map(t=>`<option value="${esc(t)}" ${REPFILTER.team===t?'selected':''}>${esc(t)}</option>`).join('')}
      ${rows.some(l=>!l.installation_team)?`<option value="__none" ${REPFILTER.team==='__none'?'selected':''}>No team yet</option>`:''}
    </select>`;

  const bar=(label,n,total,cls)=>`<div class="row${cls||''}">
      <span class="nm">${esc(label)}</span>
      <span class="track"><span class="fill" style="width:${total?Math.round(n/total*100):0}%"></span></span>
      <span class="ct">${n}</span></div>`;

  /* installations have a date, so this month against last is real. Everything
     else here is a count of what is open now and gets no chip. */
  const thisM=localDay(new Date()).slice(0,7);
  const prevM=(()=>{const [y,m]=thisM.split('-').map(Number);
    const d=new Date(y,m-2,1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');})();
  const doneIn=m=>f.filter(l=>instDoneOn(l)&&localDay(instDoneOn(l)).slice(0,7)===m).length;
  const prevWord=monthName(prevM);

  /* "ACTIVE installation teams" - so it counts what is still in flight, not
     every job a team has ever finished, and it reads the filtered set so the
     team filter above it actually filters it. It read `rows` and counted the
     lot, filter and finished jobs included. */
  const teamJobs=windowed?jobs.filter(onSite):active;
  const teamRows=teams.map(t=>[t,teamJobs.filter(l=>l.installation_team===t).length])
    .concat(teamJobs.some(l=>!l.installation_team)
      ?[['No team yet',teamJobs.filter(l=>!l.installation_team).length]]:[])
    .filter(r=>r[1]>0).sort((a,b)=>b[1]-a[1]);
  const teamTotal=teamRows.reduce((a,r)=>a+r[1],0);
  /* the categorical set, not steps of one ramp - the last three used to be
     s2, s5 and s3, which is one hue at three lightnesses and reads as one
     team in three moods. Six teams is one more than the set has, so the sixth
     takes the recessive tone and the ledger below carries every name. */
  const TEAM_HUE=['var(--viz-1)','var(--viz-2)','var(--viz-good)','var(--viz-3)','var(--viz-4)','var(--viz-mute)'];

  /* laid out like the Management dashboard (client, 8 Oct 2026): the same
     title form, logo and facts, dark band and big panel headings, so the two
     read as one set */
  const opEnd=range[1]<localDay(new Date())?range[1]:localDay(new Date());
  const opStart=REPPERIOD==='all'?(f.map(l=>localDay(l.stage_entered_at)).filter(Boolean).sort()[0]||opEnd):range[0];
  const opDays=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5)+1;
  const opFmt=d=>new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
  const opOneMonth=opStart.slice(8)==='01'&&opStart.slice(0,7)===opEnd.slice(0,7);
  const opBand=(opOneMonth?new Date(opStart+'T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'})
    :opFmt(opStart)+' - '+opFmt(opEnd)).toUpperCase();
  $('main').innerHTML=repBar('Operations dashboard',teamFilter)+`
    <div class="mg-head">
      <img src="img/logo.png" alt="Solarworks" onerror="this.remove()">
      <div class="mg-facts">
        <span>Start date</span><b>${esc(opFmt(opStart))}</b>
        <span>Today</span><b>${esc(opFmt(opEnd))}</b>
        <span>Days passed</span><b>${opDays(opStart,opEnd)}</b>
      </div>
    </div>
    <div class="mg-band">${esc(opBand)} PROJECT EXECUTION DASHBOARD</div>
    <!-- his five boxes, in his order and his wording -->
    <div class="kpis seven ops">
      ${kpi({label:'Active Projects',value:active.length,lead:true})}
      ${kpi({label:'BOQ Released',value:boqInPeriod.length})}
      ${kpi({label:'Pending Installation',value:pendingInst.length})}
      ${kpi({label:'Installation Done',value:doneInPeriod.length,
        delta:momPct(doneIn(thisM),doneIn(prevM)),deltaOf:prevWord})}
      ${kpi({label:'EDC Pending Submit',value:edcSubmit.length})}
      ${kpi({label:'EDC Pending Inspection',value:edcInspect.length})}
    </div>

    <div class="homegrid level mgrid">
      ${/* the boxes above already carry BOQ released, pending installation,
           installation done and EDC waiting (client, 26 Oct 2026) */''}
      ${repPanel('Project Status Pipeline',`<div class="pipe">
        ${bar('Installation in progress',pRun.length,Math.max(1,pRun.length,pSeen.length))}
        ${bar('EDC inspected',pSeen.length,Math.max(1,pRun.length,pSeen.length))}
      </div>`)}

      ${repPanel('Active installation teams',
        teamRows.length
          /* pie beside its ledger rather than above it, so the card is no
             taller than the pipeline next to it (Kevin, 27 Sep 2026) */
          ?`<div class="pieled">`+gPie(teamRows.map((r,i)=>[r[0],r[1],TEAM_HUE[i%TEAM_HUE.length]]),
              teamTotal+' project'+(teamTotal===1?'':'s')+' · '+teamRows.filter(r=>r[0]!=='No team yet').length+' teams')
           +ledger(teamRows.map((r,i)=>[r[0],r[1],
              Math.round(r[1]/teamTotal*100)+'%',TEAM_HUE[i%TEAM_HUE.length]]))+`</div>`
          :blank('No team picked yet','A team is set on a won deal by the site engineer.'))}
    </div>

    <div class="homegrid level mgrid">
      ${repPanel('Turn Around Time Vs Target',gPair([
        ['BOQ to delivery',tatDeliv.avg,sla.deliv||null,tatDeliv.n],
        ['BOQ to installation',tatBoq.avg,sla.boq||null,tatBoq.n],
        ['Installation duration',tatInst.avg,sla.install||null,tatInst.n],
        ['Installation to EDC submission',tatInform.avg,sla.inform||null,tatInform.n],
        ['EDC submission to inspection',tatSeen.avg,sla.inspect||null,tatSeen.n]
      ],{emptyWhy:windowed?'No step finished '+per+'.':'Turnaround needs a date at both ends of a step.'})
      +(Object.values(sla).some(Boolean)?'':`<div class="cap" style="margin-top:10px">No turnaround targets set for ${esc(monthName(monthStart().slice(0,7)))}.</div>`))}

      ${(()=>{
        /* how many systems actually went live each month. The figures above count
           the window; this is the run of work behind them. Beside the turnaround
           since 27 Sep 2026, so the page reads as four charts in two rows. */
        /* January to December of the year being shown (client, 14 Oct 2026) */
        const done=jobs.filter(l=>instDoneOn(l));
        const yr=wE.slice(0,4);
        const ms=Array.from({length:12},(_,i)=>yr+'-'+String(i+1).padStart(2,'0'));
        const cnt=ms.map(m=>done.filter(l=>localDay(instDoneOn(l)).slice(0,7)===m).length);
        return colChart(ms.map(monthName),cnt,{title:'Installations finished per month',
          color:'var(--viz-1)',table:false,compact:true});
      })()}
    </div>

    ${/* the report only: Execution health and the Projects table came out
         (client, 26 Oct 2026). After-sale came in: cases raised in the
         window by issue date, solved and pending, by cause, and the
         turnaround of the solved ones - the After-sale list's own rule. */''}
    <div class="homegrid level mgrid">
      ${repPanel('After-sale',`<div class="kpis seven ops asops">
          ${kpi({label:'Problems raised',value:asIn.length})}
          ${kpi({label:'Solved',value:asSolved.length})}
          ${kpi({label:'Pending',value:asIn.length-asSolved.length})}
          ${kpi({label:'Avg turnaround (solved)',value:asTat.avg==='\u2014'?'\u2014':asTat.avg+' d',note:'n='+asTat.n})}
        </div>`)}
      ${asCauses.length?groupChart(asCauses,
        [{name:'Solved',color:'var(--viz-good)',values:asCauses.map(c=>asSolved.filter(r=>(r.cause||'Not recorded')===c).length)},
         {name:'Pending',color:'var(--viz-4)',values:asCauses.map(c=>asIn.filter(r=>(r.cause||'Not recorded')===c&&(r.status||'Pending')!=='Solved').length)}],
        {title:'What kind of problem',stacked:true,compact:true})
        :emptyChart('What kind of problem','No after-sale case '+per,'')}
    </div>`;
}
