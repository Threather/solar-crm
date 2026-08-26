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
  const f=REPFILTER.team?rows.filter(l=>l.installation_team===REPFILTER.team):rows;

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
  const startedInPeriod=f.filter(l=>l.installation_start&&inPeriod(l.installation_start));
  const doneInPeriod=f.filter(l=>instDoneOn(l)&&inPeriod(instDoneOn(l)));
  const boqInPeriod=f.filter(l=>l.boq_status==='Done'&&inPeriod(l.boq_date));

  const tatBoq   =avgDays(f.map(l=>daysBetween(l.boq_date,l.installation_start)));
  const tatInst  =avgDays(f.map(l=>daysBetween(l.installation_start,instDoneOn(l))));
  const tatInform=avgDays(f.map(l=>daysBetween(instDoneOn(l),edcSentOn(l))));
  const tatSeen  =avgDays(f.map(l=>daysBetween(edcSentOn(l),edcSeenOn(l))));

  /* the top row mixes two clocks: active and pending are now, the other three
     happened inside the chosen window. Saying which stops the same words
     meaning two different numbers on one screen. */
  const per=repPeriodWord();
  const teamFilter=`<select onchange="setRepFilter('team',this.value)">
      <option value="">All teams</option>
      ${teams.map(t=>`<option value="${esc(t)}" ${REPFILTER.team===t?'selected':''}>${esc(t)}</option>`).join('')}
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

  $('main').innerHTML=repBar('Operations report',teamFilter)+`
    <div class="kpis">
      ${kpi({label:'Active projects',value:active.length,lead:true,alert:!!noDate.length,
        note:noDate.length?noDate.length+' of them have no installation date':'every active project has a date',
        sub:'won deals whose installation is not finished, so there is nothing to compare it against'})}
      ${kpi({label:'Installations finished '+per,value:doneInPeriod.length,
        delta:momPct(doneIn(thisM),doneIn(prevM)),deltaOf:prevWord,
        note:done.length+' finished in total',
        sub:doneIn(thisM)+' in '+monthName(thisM)+' against '+doneIn(prevM)+' in '+prevWord})}
      ${kpi({label:'BOQ released '+per,value:boqInPeriod.length,
        note:boqDone.length+' released across all projects',
        sub:'the sale engineer marks this on the lead'})}
      ${kpi({label:'Installations started '+per,value:startedInPeriod.length,
        note:scheduled.length+' scheduled ahead',sub:running.length+' in progress now'})}
      ${kpi({label:'EDC pending',value:edcPending.length,
        note:edcSeen.length+' inspected',sub:'grid paperwork still with EDC'})}
    </div>
    ${noDate.length?`<div class="hint" style="border-left-color:var(--bad);color:var(--bad)">
      <b>${noDate.length} active project${noDate.length>1?'s have':' has'} no installation date.</b>
      ${noDate.slice(0,4).map(l=>`<span class="rowlink" style="cursor:pointer;text-decoration:underline" onclick="openLead('${l.id}')">${esc(l.customer_name)}</span>`).join(' · ')}
      ${noDate.length>4?` and ${noDate.length-4} more`:''}
    </div>`:''}

    <div class="homegrid">
      ${repPanel('Where projects stand now',`<div class="pipe">
        ${bar('BOQ released',boqDone.length,f.length)}
        ${bar('Installation scheduled',scheduled.length,f.length)}
        ${bar('Installation in progress',running.length,f.length)}
        ${bar('Installation completed',done.length,f.length,' won')}
        ${bar('Waiting EDC inspection',edcWaiting.length,f.length)}
        ${bar('EDC inspected',edcSeen.length,f.length)}
      </div>`)}

      ${repPanel('Installation team',gRank(
        teams.map(t=>[t,rows.filter(l=>l.installation_team===t).length])
          .concat(rows.some(l=>!l.installation_team)
            ?[['No team yet',rows.filter(l=>!l.installation_team).length]]:[]),
        {color:'var(--own-site)',emptyWhy:'A team is picked on a won deal by the site engineer.'}))}

      ${repPanel('How long each step takes',gDuration([
        ['BOQ to installation',tatBoq.avg,tatBoq.n+' project'+(tatBoq.n===1?'':'s')],
        ['Installation duration',tatInst.avg,tatInst.n+' project'+(tatInst.n===1?'':'s')],
        ['Installation to EDC inform',tatInform.avg,tatInform.n+' project'+(tatInform.n===1?'':'s')],
        ['EDC inform to inspection',tatSeen.avg,tatSeen.n+' project'+(tatSeen.n===1?'':'s')]
      ],{emptyWhy:'Turnaround needs a date at both ends of a step.'}),true)}
    </div>

    ${(()=>{
      /* how many systems actually went live each month. The figures above count
         the window; this is the run of work behind them. */
      const done=f.filter(l=>instDoneOn(l));
      const ms=lastMonths(done,l=>instDoneOn(l),12);
      if(!ms.length)return '';
      const cnt=ms.map(m=>done.filter(l=>localDay(instDoneOn(l)).slice(0,7)===m).length);
      return colChart(ms.map(monthName),cnt,{title:'Installations finished per month',
        cap:'By the date the installation was confirmed, or its end date once that has passed.',
        color:'var(--own-site)',xhead:'Month',yhead:'Installations'});
    })()}

    ${f.length?`<h3 style="font-size:15px;margin:22px 0 8px">Projects</h3>
    <div class="tablewrap"><table class="table-compact"><thead><tr>
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
      </tr>`).join('')+`</tbody></table></div>`
    :blank('No won deals yet','A project appears here once a deal is marked Closed-Won.')}`;
}
