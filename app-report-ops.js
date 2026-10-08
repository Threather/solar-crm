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

  const done=f.filter(l=>instDoneOn(l));
  const active=f.filter(l=>!instDoneOn(l));
  const boqDone=f.filter(l=>l.boq_status==='Done');
  const today=localDay(new Date());
  const scheduled=active.filter(l=>l.installation_start&&localDay(l.installation_start)>today);
  const running=active.filter(l=>l.installation_start&&localDay(l.installation_start)<=today);
  const noDate=active.filter(l=>!l.installation_start);
  /* EDC applies to on-grid and hybrid only; off-grid is exempt and a blank
     system type is unknown rather than exempt */
  const edcable=f.filter(l=>edcApplies(l)&&edcFields(l));
  const edcWaiting=edcable.filter(l=>edcSentOn(l)&&!edcSeenOn(l));
  const edcSeen=edcable.filter(l=>edcSeenOn(l));
  const edcPending=edcable.filter(l=>edcDone(l)<edcFields(l).length);

  /* The five figures the client puts at the top. "All time" asks about state,
     not about a window, so it must not also demand that a date was filled in —
     a BOQ marked Done with no date is still a BOQ that was released. */
  const windowed=REPPERIOD!=='all';
  const inPeriod=v=>!windowed||inRange(v,range);
  /* All time asks about state, so inPeriod lets everything through - which
     counted an installation booked for next week as one that has started.
     A start is a date that has arrived. */
  const startedInPeriod=f.filter(l=>l.installation_start&&inPeriod(l.installation_start)
    &&localDay(l.installation_start)<=today);
  const doneInPeriod=f.filter(l=>instDoneOn(l)&&inPeriod(instDoneOn(l)));
  const boqInPeriod=f.filter(l=>l.boq_status==='Done'&&inPeriod(l.boq_date));

  /* the four turnaround targets the manager sets each month, in days. Read for
     the month being shown, like every other target in the app. */
  const tg=await loadTargets(monthStart());
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
  const inW=v=>!windowed||(v&&inRange(localDay(v),range));
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
  const teamRows=teams.map(t=>[t,active.filter(l=>l.installation_team===t).length])
    .concat(active.some(l=>!l.installation_team)
      ?[['No team yet',active.filter(l=>!l.installation_team).length]]:[])
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
    <div class="kpis six">
      ${kpi({label:'Active Projects',value:active.length,lead:true,
        note:noDate.length?noDate.length+' with no date':'total in pipeline'})}
      ${kpi({label:'BOQ Released',value:boqInPeriod.length,
        note:'ready for scheduling'})}
      ${kpi({label:'Installation Start',value:startedInPeriod.length,
        note:'new starts '+per})}
      ${kpi({label:'Installation Done',value:doneInPeriod.length,
        delta:momPct(doneIn(thisM),doneIn(prevM)),deltaOf:prevWord,
        note:'completed '+per})}
      ${kpi({label:'EDC Pending',value:edcPending.length,
        note:'awaiting inspection'})}
    </div>

    <div class="homegrid level mgrid">
      ${repPanel('I. Project status pipeline',`<div class="cap" style="margin:-4px 0 10px">All won deals, as of today</div><div class="pipe">
        ${bar('BOQ released',boqDone.length,f.length)}
        ${bar('Installation scheduled',scheduled.length,f.length)}
        ${bar('Installation in progress',running.length,f.length)}
        ${bar('Installation completed',done.length,f.length,' won')}
        ${bar('Waiting EDC inspection',edcWaiting.length,f.length)}
        ${bar('EDC inspected',edcSeen.length,f.length)}
      </div>`)}

      ${repPanel('Active installation teams',
        teamRows.length
          /* pie beside its ledger rather than above it, so the card is no
             taller than the pipeline next to it (Kevin, 27 Sep 2026) */
          ?`<div class="cap" style="margin:-4px 0 10px">As of today</div><div class="pieled">`+gPie(teamRows.map((r,i)=>[r[0],r[1],TEAM_HUE[i%TEAM_HUE.length]]),
              teamTotal+' project'+(teamTotal===1?'':'s')+' · '+teamRows.filter(r=>r[0]!=='No team yet').length+' teams')
           +ledger(teamRows.map((r,i)=>[r[0],r[1],
              Math.round(r[1]/teamTotal*100)+'%',TEAM_HUE[i%TEAM_HUE.length]]))+`</div>`
          :blank('No team picked yet','A team is set on a won deal by the site engineer.'))}
    </div>

    <div class="homegrid level mgrid">
      ${repPanel('II. Turnaround vs target',gPair([
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
        const done=f.filter(l=>instDoneOn(l));
        const ms=lastMonths(done,l=>instDoneOn(l),12);
        if(!ms.length)return emptyChart('Installations finished per month','Nothing finished yet','A month fills in as installations are confirmed.');
        const cnt=ms.map(m=>done.filter(l=>localDay(instDoneOn(l)).slice(0,7)===m).length);
        return colChart(ms.map(monthName),cnt,{title:'Installations finished per month',
          cap:'By the date the installation was confirmed, or its end date once that has passed.',
          color:'var(--viz-1)',table:false,compact:true});
      })()}
    </div>

    <div class="homegrid mgrid opwide">
    ${repPanel('Execution health',ledger([
      ['Total in flight',active.length,'project'+(active.length===1?'':'s')],
      ['Avg end-to-end',endToEnd.avg==='\u2014'?'\u2014':endToEnd.avg+' days',
        endToEnd.n+' measured'],
      ['Slowest against target',behind?'+'+behind.over+' days':'\u2014',
        behind?behind.step
          :!Object.values(sla).some(Boolean)?'no targets set'
          :endToEnd.n?'nothing is behind':'nothing measured yet']]))}
    </div>

    ${f.length?`<div class="homegrid mgrid opwide">${repPanel('Projects',`<div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Ref ID</th><th>Customer</th><th>Team</th><th>BOQ</th><th>Install start</th>
      <th>Finished</th><th>EDC sent</th><th>EDC inspected</th>
    </tr></thead><tbody>`+f.map(l=>`
      <tr class="rowlink" onclick="openLead('${l.id}')">
        <td class="refid">${esc(l.ref_id||'—')}</td>
        <td><b>${esc(l.customer_name)}</b></td>
        <td>${l.installation_team?esc(l.installation_team):'<span class="pooltag">NONE</span>'}</td>
        <td>${l.boq_status==='Done'?`<span class="mark mark-done">${fmtDate(l.boq_date)}</span>`:'<span class="mark mark-wait">pending</span>'}</td>
        <td class="nowrap">${fmtDate(l.installation_start)}</td>
        <td class="nowrap">${instDoneOn(l)?`<span class="mark mark-done">${fmtDate(instDoneOn(l))}</span>`:'<span class="mark mark-open">not yet</span>'}</td>
        <td class="nowrap">${edcApplies(l)?fmtDate(edcSentOn(l)):'<span class="quiet">exempt</span>'}</td>
        <td class="nowrap">${edcApplies(l)?fmtDate(edcSeenOn(l)):'<span class="quiet">—</span>'}</td>
      </tr>`).join('')+`</tbody></table></div>`)}</div>`
    :blank('No won deals yet','A project appears here once a deal is marked Closed-Won.')}`;
}
