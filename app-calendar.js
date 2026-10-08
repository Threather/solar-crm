/* ---------------- CALENDAR (8 Oct 2026) ----------------
   The client's sketch: an installation calendar (a bar across the days each
   job is installing) and installation details (the same month smaller, the
   team letters with their members, and the jobs listed). One job list and one
   grid renderer feed both tabs, so they cannot disagree (council, 8 Oct).
   Bars take one colour per customer, not red: red means danger here, and one
   red would make three overlapping jobs read as one. No end date = the start
   day only. Lanes are packed once per month, so a customer keeps its lane
   from one week row to the next. */
let CALMONTH=null, CALTAB='cal', CALTEAM='';
const CALCOLORS=['var(--viz-2)','var(--viz-1)','var(--viz-good)','var(--viz-3)','var(--viz-4)','#4a6fa5','#b0467a','#2f8f8a'];

const calIso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const calDay=s=>{const [y,m,d]=s.slice(0,10).split('-').map(Number);return new Date(y,m-1,d);};

/* A, B, C... follow the order on the Lists screen; a team no longer listed
   still gets a letter, after the listed ones */
function calLetters(jobs){
  const map={};let i=0;
  INSTALL_TEAMS.forEach(t=>{map[t]=String.fromCharCode(65+i++);});
  jobs.forEach(j=>{if(j.team&&!map[j.team])map[j.team]=String.fromCharCode(65+i++);});
  return map;
}

async function renderCalendar(){
  if(!['site_engineer','sales','manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('No calendar for your role','');return;}
  if(!CALMONTH){const t=new Date();CALMONTH=new Date(t.getFullYear(),t.getMonth(),1);}
  $('main').innerHTML='<div class="sub">Loading…</div>';
  const rows=(await fetchLeads(q=>q.eq('stage_code','closed_won')))||[];
  const all=rows.filter(l=>l.installation_start).map(l=>({
    id:l.id, ref:l.ref_id||'', name:l.customer_name||'(no name)', team:l.installation_team||'',
    start:l.installation_start.slice(0,10),
    end:(l.installation_end&&l.installation_end>=l.installation_start?l.installation_end:l.installation_start).slice(0,10),
    endKnown:!!l.installation_end}));
  const unsched=rows.filter(l=>!l.installation_start).length;
  const letters=calLetters(all);
  const y=CALMONTH.getFullYear(), m=CALMONTH.getMonth();
  const first=calIso(new Date(y,m,1)), last=calIso(new Date(y,m+1,0));
  const jobs=all.filter(j=>j.start<=last&&j.end>=first)
    .filter(j=>!CALTEAM||(CALTEAM==='-'?!j.team:j.team===CALTEAM))
    .sort((a,b)=>a.start.localeCompare(b.start)||b.end.localeCompare(a.end)||a.name.localeCompare(b.name));
  /* greedy lanes: each job takes the lowest lane free over its whole span */
  const laneEnd=[];
  jobs.forEach((j,i)=>{
    let k=laneEnd.findIndex(e=>e<j.start);if(k<0)k=laneEnd.length;
    laneEnd[k]=j.end;j.lane=k;j.color=CALCOLORS[i%CALCOLORS.length];j.letter=j.team?letters[j.team]:'?';
  });
  const teams=[...new Set([...INSTALL_TEAMS,...all.map(j=>j.team).filter(Boolean)])];
  const monthWord=CALMONTH.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const bar=`
    <div class="calbar">
      <div class="scope">
        <button class="${CALTAB==='cal'?'on':''}" onclick="calTab('cal')">Installation calendar</button>
        <button class="${CALTAB==='det'?'on':''}" onclick="calTab('det')">Installation details</button>
      </div>
      <div class="calnav">
        <button class="btn-line" onclick="calMove(-1)">‹</button>
        <b>${esc(monthWord)}</b>
        <button class="btn-line" onclick="calMove(1)">›</button>
        <button class="btn-line" onclick="calMove(0)">This month</button>
      </div>
      <select onchange="calTeam(this.value)">
        <option value="">All teams</option>
        ${teams.map(t=>`<option value="${esc(t)}" ${CALTEAM===t?'selected':''}>${esc((letters[t]||'')+' · '+t)}</option>`).join('')}
        <option value="-" ${CALTEAM==='-'?'selected':''}>No team yet</option>
      </select>
      ${unsched?`<span class="pooltag">${unsched} won not scheduled</span>`:''}
    </div>`;
  let body;
  if(CALTAB==='cal'){
    body=`<div class="section">${calGrid(jobs,y,m,false)}</div>`;
  }else{
    const used=teams.filter(t=>jobs.some(j=>j.team===t));
    const legend=(used.length?used:teams).map(t=>`<div class="calteam"><b>${esc(letters[t])}</b><div><b>${esc(t)}</b><span>${esc(INSTALL_TEAM_DETAIL[t]||'')}</span></div></div>`).join('');
    const list=jobs.length?`<div class="tablewrap"><table><thead><tr><th></th><th>Customer</th><th>Team</th><th>Start</th><th>End</th></tr></thead><tbody>${
      jobs.map(j=>`<tr class="calrow" onclick="openLead('${j.id}')"><td><i class="calsw" style="background:${j.color}"></i></td>
        <td><span class="nm">${esc(j.name)}</span><span class="days">${esc(j.ref)}</span></td>
        <td>${esc(j.letter)}${j.team?' · '+esc(j.team):''}</td><td class="nowrap">${fmtDate(j.start)}</td>
        <td class="nowrap">${j.endKnown?fmtDate(j.end):'—'}</td></tr>`).join('')}</tbody></table></div>`
      :`<div class="sub">No installation in ${esc(monthWord)}.</div>`;
    body=`<div class="caldet">
      <div class="section"><h4>Installation schedule</h4>${calGrid(jobs,y,m,true)}<div class="calteams">${legend}</div></div>
      <div class="section"><h4>${esc(monthWord)}</h4>${list}</div></div>`;
  }
  $('main').innerHTML=`<h2 style="margin-bottom:12px">Calendar</h2>${bar}${body}`;
}

/* one 7-column CSS grid per week; a job crossing Sunday is cut into one
   segment per week, rounded only at its real start and end */
function calGrid(jobs,y,m,compact){
  const first=new Date(y,m,1), last=new Date(y,m+1,0), today=calIso(new Date());
  const s=new Date(first);s.setDate(1-((first.getDay()+6)%7));
  let out=`<div class="calgrid${compact?' compact':''}"><div class="calhead">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=>`<span>${d}</span>`).join('')}</div>`;
  while(s<=last){
    const days=[...Array(7)].map((_,i)=>{const d=new Date(s);d.setDate(s.getDate()+i);return d;});
    const ws=calIso(days[0]), we=calIso(days[6]);
    const segs=jobs.filter(j=>j.start<=we&&j.end>=ws);
    const lanes=segs.length?Math.max(...segs.map(j=>j.lane))+1:0;
    out+=`<div class="calweek" style="grid-template-rows:${compact?18:24}px repeat(${lanes},${compact?14:22}px) 6px">`+
      days.map((d,i)=>`<div class="calcell${d.getMonth()!==m?' out':''}${calIso(d)===today?' today':''}" style="grid-column:${i+1};grid-row:1/-1"><span>${d.getDate()}</span></div>`).join('')+
      segs.map(j=>{
        const a=j.start<ws?0:days.findIndex(d=>calIso(d)===j.start);
        const b=j.end>we?6:days.findIndex(d=>calIso(d)===j.end);
        const cls=(j.start>=ws?' s':'')+(j.end<=we?' e':'')+(j.endKnown?'':' open');
        const label=compact?j.letter:j.name+' · '+j.letter;
        return `<button class="calseg${cls}" style="grid-column:${a+1}/${b+2};grid-row:${j.lane+2};background:${j.color}" title="${esc(j.name+' · '+(j.team||'No team yet')+' · '+fmtDate(j.start)+(j.endKnown?' to '+fmtDate(j.end):''))}" onclick="openLead('${j.id}')">${esc(label)}</button>`;
      }).join('')+`</div>`;
    s.setDate(s.getDate()+7);
  }
  return out+'</div>';
}
function calTab(t){CALTAB=t;renderCalendar();}
function calTeam(t){CALTEAM=t;renderCalendar();}
function calMove(n){
  if(!n){const t=new Date();CALMONTH=new Date(t.getFullYear(),t.getMonth(),1);}
  else CALMONTH=new Date(CALMONTH.getFullYear(),CALMONTH.getMonth()+n,1);
  renderCalendar();
}
