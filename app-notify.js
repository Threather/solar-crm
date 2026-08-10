/* ---------------- NOTIFICATIONS ----------------
   Everyone in the company sees the same feed. What each person has already
   read is kept in their own browser, because letting a user write to their own
   profile row to store it would also let them change their own role. */
let BELLS=[];
const bellSeen=()=>localStorage.getItem('crm-bell-seen')||'1970-01-01';
async function loadBells(){
  const {data}=await sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(40);
  BELLS=data||[];
  paintBell();
}
function paintBell(){
  const n=BELLS.filter(b=>b.created_at>bellSeen()).length;
  const dot=$('bell-n');
  if(dot){dot.textContent=n>9?'9+':n;dot.classList.toggle('on',n>0);}
}

/* two short notes, built in the browser so there is no sound file to ship */
function bellSound(){
  try{
    const A=window.AudioContext||window.webkitAudioContext; if(!A)return;
    const ctx=new A(), now=ctx.currentTime;
    [[880,0],[1320,.14]].forEach(([hz,at])=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.value=hz;
      g.gain.setValueAtTime(0,now+at);
      g.gain.linearRampToValueAtTime(.16,now+at+.02);
      g.gain.exponentialRampToValueAtTime(.001,now+at+.22);
      o.connect(g);g.connect(ctx.destination);o.start(now+at);o.stop(now+at+.24);
    });
    setTimeout(()=>ctx.close(),900);
  }catch(e){}
}
let POPTIMER=null;
function popNotice(b){
  const el=$('pop'); if(!el)return;
  el.innerHTML=`<h5>${b.kind==='won'?'Deal won':b.kind==='delivered'?'Delivered':'Notification'}</h5>
    <p>${esc(b.message)}</p>
    <div class="row">
      ${b.lead_id?`<button class="btn-sun" onclick="hidePop();openLead('${b.lead_id}')">Open the lead</button>`:''}
      <button class="btn-line" onclick="hidePop()">Dismiss</button>
    </div>`;
  el.classList.add('on');
  bellSound();
  if(window.Notification&&Notification.permission==='granted')
    try{new Notification('Solar CRM',{body:b.message});}catch(e){}
  clearTimeout(POPTIMER);
  POPTIMER=setTimeout(hidePop,9000);
}
function hidePop(){clearTimeout(POPTIMER);const el=$('pop');if(el)el.classList.remove('on');}

/* the moment it lands, not up to two minutes later */
function watchBells(){
  sb.channel('crm-notifications')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},payload=>{
      const b=payload.new;
      BELLS=[b,...BELLS].slice(0,40);
      paintBell();
      /* your own win should not startle you */
      if(b.created_by!==ME.id)popNotice(b);
    })
    .subscribe();
  if(window.Notification&&Notification.permission==='default')
    setTimeout(()=>{try{Notification.requestPermission();}catch(e){}},4000);
}
async function notify(kind,leadId,message){
  await sb.from('notifications').insert({kind,lead_id:leadId,message,created_by:ME.id});
}
function openBells(){
  localStorage.setItem('crm-bell-seen',new Date().toISOString());
  const dot=$('bell-n'); if(dot)dot.classList.remove('on');
  $('lead-modal').innerHTML=`
    <h2>Notifications</h2>
    <div class="sub">${BELLS.length} most recent, newest first.</div>
    ${BELLS.length?BELLS.map(b=>`<div class="bell-item">
      <b>${esc(b.message)}</b>
      <span>${fmtDT(b.created_at)} · ${esc(staffName(b.created_by))}</span>
      ${b.lead_id?`<button class="btn-mini" style="margin-top:6px" onclick="closeLead();openLead('${b.lead_id}')">Open the lead</button>`:''}
    </div>`).join(''):blank('Nothing yet','Wins and deliveries appear here for everyone.')}
    <div class="modal-actions"><button class="btn-line" onclick="closeLead()">Close</button></div>`;
  $('lead-overlay').classList.add('open');
}
