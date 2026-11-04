/* ---------------- CALENDAR (8 Oct 2026) ----------------
   The client's sketch: an installation calendar (a bar across the days each
   job is installing) and installation details (the same month smaller, the
   team letters with their members, and the jobs listed). One job list and one
   grid renderer feed both tabs, so they cannot disagree (council, 8 Oct).
   Bars take one colour per installer team (client, 23 Oct 2026), never red:
   red means danger here. A job with no team yet is grey. No end date = the start
   day only. Lanes are packed once per month, so a customer keeps its lane
   from one week row to the next. */
let CALMONTH=null, CALTAB='cal', CALTEAM='';
/* deep team colours, each well past 4.5:1 against the white name on the bar,
   so a name reads at a glance (client, 23 Oct 2026) */
const CALCOLORS=['#1f5fa8','#2b7a3d','#b3471d','#7b3fa0','#8a6400','#a3305c','#1d6f75','#4b5563'];

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

/* Days not worked (client, 4 Nov 2026): a job's dates stay as they are and the
   days lost inside them - holiday, sick leave, rain - are listed against it.
   Admin adds them at any time; a turnaround counts only the days worked. */
async function offRows(){
  try{return await fetchAll(()=>sb.from('install_days_off').select('*').order('off_on').order('id'));}
  catch(e){console.error(e);return [];}
}
const offByLead=rows=>{const m={};rows.forEach(r=>{(m[r.lead_id]=m[r.lead_id]||[]).push(r);});return m;};
/* only days inside the job count, so shortening a job drops them by itself */
const offInside=(list,a,b)=>(list||[]).filter(r=>r.off_on>=a&&r.off_on<=b);
/* every team rests Saturday afternoon and Sunday (client, 4 Nov 2026). A row's
   portion is the days it takes off: 1 or 0.5, negative for OT on a rest day. */
const restOf=iso=>{const w=calDay(iso).getDay();return w===0?1:w===6?.5:0;};
const offPart=r=>Number(r.portion??1);
function offPortion(iso,reason,half){
  const rest=restOf(iso);
  if(reason==='OT')return rest?-(half?Math.min(.5,rest):rest):null;
  const open=1-rest;
  return open?(half?Math.min(.5,open):open):null;
}
function workedDays(list,a,b){
  let n=0;
  for(let d=calDay(a);calIso(d)<=b;d.setDate(d.getDate()+1))n+=1-restOf(calIso(d));
  return Math.max(0,n-offInside(list,a,b).reduce((t,r)=>t+offPart(r),0));
}
function offKick(id){setTimeout(()=>offFill(id),0);return '';}
async function offFill(id){
  const box=$('d-off');if(!box||box.dataset.lead!==id)return;
  const {data,error}=await sb.from('install_days_off').select('*').eq('lead_id',id).order('off_on');
  if(error){console.error(error);return;}
  const admin=ME.role==='admin';
  if(!admin&&!data.length){box.innerHTML='';return;}
  box.innerHTML=`<label>Days not worked</label>
    ${data.map(r=>`<div class="offrow"><span class="nowrap">${fmtDate(r.off_on)}</span><span>${esc(r.reason)}${Math.abs(offPart(r))===.5?' · half day':''}</span>${admin?`<button class="lsx" title="Remove" onclick="offDel('${r.id}','${id}')">×</button>`:''}</div>`).join('')}
    ${admin?`<div class="offadd"><div><label>From</label><input id="off-from" type="date"></div><div><label>To (optional)</label><input id="off-to" type="date"></div>
      <div><label>Reason</label><select id="off-why">${optList(OFF_REASONS,'')}<option value="OT">OT (worked on a rest day)</option></select></div>
      <div><label>Length</label><select id="off-part"><option value="1">Whole day</option><option value="0.5">Half day</option></select></div>
      <button class="btn-line" onclick="offAdd('${id}')">Save</button></div>`:''}`;
}
/* one date, or a from-to range; a range skips the days it cannot apply to */
async function offAdd(id){
  const a=$('off-from').value, b=$('off-to').value||a, rs=$('off-why').value, st=$('d-cstart').value, en=$('d-cend').value;
  if(!a){needField('off-from','Pick the date');return;}
  if(b<a){needField('off-to','The To date is before the From date');return;}
  if(!rs){needField('off-why','Pick the reason');return;}
  if(!st){needField('d-cstart','Set the installation start first');return;}
  if(a<st||(en&&b>en)){needField('off-from','That date is outside the installation dates');return;}
  const half=$('off-part').value==='0.5', rows=[];
  for(let d=calDay(a);calIso(d)<=b;d.setDate(d.getDate()+1)){
    const iso=calIso(d), portion=offPortion(iso,rs,half);
    if(portion!=null)rows.push({lead_id:id,off_on:iso,reason:rs,portion,created_by:ME.id});
  }
  if(!rows.length){toast(rs==='OT'?'OT is only for a Saturday or Sunday':'Sunday is already off');return;}
  const {error}=await sb.from('install_days_off').insert(rows);
  if(error){toast(error.code==='23505'?'One of those days is already listed':'Could not save. '+why(error));return;}
  toast('Saved');offFill(id);
}
async function offDel(rowId,id){
  const {error}=await sb.from('install_days_off').delete().eq('id',rowId);
  if(error){toast('Could not remove. '+why(error));return;}
  offFill(id);
}

/* admin changes a job from the Calendar itself: dates and days not worked in
   one small window, each saved on the spot (client, 4 Nov 2026). Everyone else
   opens the lead as before. */
let CALJOBS={};
function calOpen(id){
  const j=CALJOBS[id];
  if(ME.role!=='admin'||!j){openLead(id);return;}
  const w=document.createElement('div');
  w.id='calpop';w.className='calpopbg';
  w.onclick=e=>{if(e.target===w)calClose();};
  w.innerHTML=`<div class="calpop">
    <div class="calpophead"><div><b>${esc(j.name)}</b><span>${esc(j.ref||'—')} · ${esc(j.team||'No team yet')}</span></div>
      <button class="lsx" title="Close" onclick="calClose()">×</button></div>
    <div class="grid2">
      <div><label>Installation start</label><input id="d-cstart" type="date" value="${j.start}" onchange="calSaveDates('${id}')"></div>
      <div><label>Installation end</label><input id="d-cend" type="date" value="${j.endKnown?j.end:''}" onchange="calSaveDates('${id}')"></div>
    </div>
    <div id="d-off" data-lead="${id}" style="margin-top:14px"></div>
    <div class="calpopfoot"><button class="btn-line" onclick="calClose();openLead('${id}')">Open lead</button></div>
  </div>`;
  document.body.appendChild(w);
  offFill(id);
}
function calClose(){const w=$('calpop');if(w){w.remove();renderCalendar();}}
async function calSaveDates(id){
  const a=$('d-cstart').value,b=$('d-cend').value;
  if(!a){needField('d-cstart','Installation start is needed');return;}
  if(b&&b<a){needField('d-cend','The end date is before the start');return;}
  const {error}=await sb.from('leads').update({installation_start:a,installation_end:b||null}).eq('id',id);
  if(error){toast('Could not save. '+why(error));return;}
  toast('Saved');offFill(id);
}

async function renderCalendar(){
  if(!['site_engineer','sales','manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('No calendar for your role','');return;}
  if(!CALMONTH){const t=new Date();CALMONTH=new Date(t.getFullYear(),t.getMonth(),1);}
  /* the whole width of the screen (client, 23 Oct 2026) */
  $('main').style.maxWidth='none';
  $('main').innerHTML='<div class="sub">Loading…</div>';
  const rows=(await fetchLeads(q=>q.eq('stage_code','closed_won')))||[];
  const offs=offByLead(await offRows());
  const all=rows.filter(l=>l.installation_start&&hasPart(l,'Installation')).map(l=>({
    id:l.id, ref:l.ref_id||'', name:l.customer_name||'(no name)', team:l.installation_team||'',
    start:l.installation_start.slice(0,10),
    end:(l.installation_end&&l.installation_end>=l.installation_start?l.installation_end:l.installation_start).slice(0,10),
    endKnown:!!l.installation_end,off:offs[l.id]||[]}));
  CALJOBS=Object.fromEntries(all.map(j=>[j.id,j]));
  const unsched=rows.filter(l=>!l.installation_start&&hasPart(l,'Installation')).length;
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
    laneEnd[k]=j.end;j.lane=k;j.letter=j.team?letters[j.team]:'?';
  });
  const teams=[...new Set([...INSTALL_TEAMS,...all.map(j=>j.team).filter(Boolean)])];
  const teamColor=t=>t&&teams.indexOf(t)>=0?CALCOLORS[teams.indexOf(t)%CALCOLORS.length]:'#6f6a62';
  jobs.forEach(j=>{j.color=teamColor(j.team);});
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
    body=`<div class="section calsec"><div class="calwrap"><div class="caltitle">${esc(monthWord)}</div>${calGrid(jobs,y,m,false)}</div></div>`;
  }else{
    const used=teams.filter(t=>jobs.some(j=>j.team===t));
    const legend=(used.length?used:teams).map(t=>`<div class="calteam"><b style="background:${teamColor(t)};color:#fff">${esc(letters[t])}</b><div><b>${esc(t)}</b><span>${esc(INSTALL_TEAM_DETAIL[t]||'')}</span></div></div>`).join('');
    const list=jobs.length?`<table class="caltable"><thead><tr><th></th><th>Customer</th><th>Ref ID</th><th>Team</th><th>Members</th><th>Start</th><th>End</th><th>Days</th></tr></thead><tbody>${
      jobs.map(j=>`<tr class="calrow" onclick="calOpen('${j.id}')"><td><i class="calsw" style="background:${j.color}"></i></td>
        <td><b>${esc(j.name)}</b></td><td class="refid">${esc(j.ref||'—')}</td>
        <td>${esc(j.letter)}${j.team?' · '+esc(j.team):' · no team yet'}</td><td>${esc(INSTALL_TEAM_DETAIL[j.team]||'—')}</td>
        <td class="nowrap">${fmtDate(j.start)}</td>
        <td class="nowrap">${j.endKnown?fmtDate(j.end):'—'}</td>
        <td>${j.endKnown?workedDays(j.off,j.start,j.end):'—'}</td></tr>`).join('')}</tbody></table>`
      :`<div class="sub">No installation in ${esc(monthWord)}.</div>`;
    body=`<div class="caldet">
      <div class="section calsec"><div class="calwrap"><div class="caltitle">${esc(monthWord)}</div>${calGrid(jobs,y,m,false)}<div class="calteams">${legend}</div></div></div>
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
    out+=`<div class="calweek" style="grid-template-rows:${compact?18:24}px repeat(${lanes},${compact?14:22}px) minmax(6px,1fr)">`+
      days.map((d,i)=>`<div class="calcell${d.getMonth()!==m?' out':''}${calIso(d)===today?' today':''}" style="grid-column:${i+1};grid-row:1/-1"><span>${d.getDate()}</span></div>`).join('')+
      segs.map(j=>{
        const a=j.start<ws?0:days.findIndex(d=>calIso(d)===j.start);
        const b=j.end>we?6:days.findIndex(d=>calIso(d)===j.end);
        const cls=(j.start>=ws?' s':'')+(j.end<=we?' e':'')+(j.endKnown?'':' open');
        const label=compact?j.letter:j.name+' · '+j.letter;
        return `<button class="calseg${cls}" style="grid-column:${a+1}/${b+2};grid-row:${j.lane+2};background:${j.color}" title="${esc(j.name+' · '+(j.team||'No team yet')+' · '+fmtDate(j.start)+(j.endKnown?' to '+fmtDate(j.end):''))}" onclick="calOpen('${j.id}')">${esc(label)}</button>`
          +days.map((d,i)=>{const iso=calIso(d);
            if(iso<j.start||iso>j.end||!j.endKnown)return '';
            const rows=offInside(j.off,iso,iso), off=restOf(iso)+rows.reduce((t,r)=>t+offPart(r),0);
            if(off<=0)return '';
            const why=rows.map(r=>r.reason).join(', ')||(off<1?'Saturday afternoon off':'Sunday off');
            return `<i class="caloff${off<1?' half':''}" style="grid-column:${i+1};grid-row:${j.lane+2}" title="${esc(fmtDate(iso)+' · '+why)}"></i>`;}).join('');
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
