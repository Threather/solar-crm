/* ---------------- MANY LEADS AT ONCE (13 Oct 2026) ----------------
   Marketing keyed leads one form at a time. This is the same form as rows:
   every field New lead has, one row per customer, and one button saves them
   all. Each row behaves like the form - its sub-channel list follows its own
   channel, Agent opens the agent list, Third Party the referrer, Offline
   Marketing the event, Province the districts and communes - and cells that do
   not apply to a row are shut. The DOM is the state: a row is read back from
   its inputs before it is redrawn, and again when saving. */
let BULKN=0, BULKFLAG=null;
const BULKCOLS=['Date *','Customer name *','Phone','Customer type','Monthly bill (USD)','Channel *','Sub-channel *',
  'Agent','Referrer name','Referrer phone','Event name','Event date','Address','Province','District','Commune','Type of site','Note'];
const bulkWho=()=>['manager','admin'].includes(ME.role);
function bulkDefaults(){
  let d={};try{d=JSON.parse(localStorage.getItem('bulkdef')||'{}');}catch(e){}
  return {date:localDay(new Date()),ctype:'Residential',chan:d.chan||'Digital_Marketing',sub:d.sub||''};
}
function renderBulk(){
  if(!['marketing','manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('New lead is not open to your role','Marketing creates new leads.');return;}
  const d=bulkDefaults();BULKFLAG=null;
  $('main').innerHTML=`
    <h2 style="margin-bottom:12px">New lead</h2>
    <div class="scope" style="margin-bottom:14px"><button onclick="renderNew()">One lead</button><button class="on">Many leads</button></div>
    <div class="bulkbar">
      <b>Same for all rows</b>
      <label>Date<input id="ba-date" type="date" value="${d.date}"></label>
      <label>Customer type<select id="ba-ctype">${optList(CUSTOMER_TYPES,d.ctype,false)}</select></label>
      <label>Channel<select id="ba-chan" onchange="bulkAllSub()">${optList(Object.keys(CHANNELS),d.chan,false)}</select></label>
      <label>Sub-channel<select id="ba-sub">${optList(subChanOf(d.chan),d.sub)}</select></label>
      <button class="btn-line" onclick="bulkApply()">Apply to all rows</button>
    </div>
    <div class="tablewrap bulkwrap"><table class="table-compact bulktable"><thead><tr><th>#</th>${BULKCOLS.map(h=>`<th>${h}</th>`).join('')}${bulkWho()?'<th>Sale engineer</th>':''}<th></th></tr></thead>
      <tbody id="bulkbody"></tbody></table></div>
    <div class="bulkfoot">
      <button class="btn-line" onclick="bulkAdd(1)">+ Add row</button>
      <button class="btn-line" onclick="bulkAdd(10)">+ 10 rows</button>
      <span id="bulkmsg"></span>
      <button class="btn-sun" id="bulkgo" onclick="bulkCreate()">Create leads</button>
    </div>`;
  BULKN=0;bulkAdd(5);
}
function bulkAllSub(){$('ba-sub').innerHTML=optList(subChanOf($('ba-chan').value),'');}
function bulkTop(){return {date:$('ba-date').value,ctype:$('ba-ctype').value,chan:$('ba-chan').value,sub:$('ba-sub').value};}
function bulkAdd(n){
  const t=bulkTop(),body=$('bulkbody');
  for(let k=0;k<n;k++){const i=BULKN++;
    const tr=document.createElement('tr');tr.id='br-'+i;body.appendChild(tr);
    bulkDraw(i,{date:t.date,ctype:t.ctype,chan:t.chan,sub:t.sub});}
  bulkNumber();
}
function bulkNumber(){[...$('bulkbody').children].forEach((tr,k)=>{const c=tr.querySelector('.bno');if(c)c.textContent=k+1;});}
/* one row's values, read off its inputs */
function bulkRead(i){
  const v=f=>{const e=$(`b${f}-${i}`);return e?e.value:'';};
  return {date:v('date'),name:v('name'),phone:v('phone'),ctype:v('ctype'),bill:v('bill'),chan:v('chan'),sub:v('sub'),
    agent:v('agent'),refname:v('refname'),refphone:v('refphone'),eventname:v('eventname'),eventdate:v('eventdate'),
    addr:v('addr'),prov:v('prov'),dist:v('dist'),comm:v('comm'),site:v('site'),note:v('note'),who:v('who')};
}
function bulkDraw(i,r){
  const tr=$('br-'+i);if(!tr)return;
  const third=r.chan==='Third_Party', agent=r.sub==='Agent', event=r.chan==='Offline_Marketing';
  const inp=(f,val,on,ph,type)=>on?`<input id="b${f}-${i}" ${type?`type="${type}"`:''} value="${esc(val||'')}" ${ph?`placeholder="${ph}"`:''}>`:'<span class="quiet">—</span>';
  const sel=(f,list,val,ch,blank=true)=>`<select id="b${f}-${i}" ${ch?`onchange="bulkRedraw(${i})"`:''}>${optList(list,val||'',blank)}</select>`;
  const dists=Object.keys(GEO[r.prov]||{}), comms=(GEO[r.prov]||{})[r.dist]||[];
  tr.innerHTML=`<td class="bno"></td>
    <td><input id="bdate-${i}" type="date" value="${esc(r.date||'')}"></td>
    <td><input id="bname-${i}" value="${esc(r.name||'')}" onpaste="bulkPaste(event,${i})" onkeydown="bulkKey(event,${i})"></td>
    <td><input id="bphone-${i}" value="${esc(r.phone||'')}" onkeydown="bulkKey(event,${i})"></td>
    <td>${sel('ctype',CUSTOMER_TYPES,r.ctype,false,false)}</td>
    <td>${numBox('bbill-'+i,r.bill)}</td>
    <td>${sel('chan',Object.keys(CHANNELS),r.chan,true,false)}</td>
    <td>${sel('sub',subChanOf(r.chan),r.sub,true)}</td>
    <td>${agent?sel('agent',AGENTS,r.agent):'<span class="quiet">—</span>'}</td>
    <td>${inp('refname',r.refname,third)}</td>
    <td>${inp('refphone',r.refphone,third)}</td>
    <td>${inp('eventname',r.eventname,event)}</td>
    <td>${inp('eventdate',r.eventdate,event,'','date')}</td>
    <td>${inp('addr',r.addr,true)}</td>
    <td>${sel('prov',PROVINCES,r.prov,true)}</td>
    <td>${r.prov?sel('dist',dists,r.dist,true):'<span class="quiet">—</span>'}</td>
    <td>${r.dist?sel('comm',comms,r.comm):'<span class="quiet">—</span>'}</td>
    <td>${inp('site',r.site,true)}</td>
    <td>${inp('note',r.note,true)}</td>
    ${bulkWho()?`<td><select id="bwho-${i}"><option value="">Automatic</option>${assignable().map(s=>`<option value="${s.id}" ${r.who===s.id?'selected':''}>${esc(assignLabel(s))}</option>`).join('')}</select></td>`:''}
    <td><button class="btn-line" title="Remove row" onclick="bulkDrop(${i})">✕</button></td>`;
  bulkNumber();
}
function bulkRedraw(i){
  const r=bulkRead(i);
  if(!subChanOf(r.chan).includes(r.sub))r.sub='';
  if(r.sub!=='Agent')r.agent='';
  if(r.chan!=='Third_Party'){r.refname='';r.refphone='';}
  if(r.chan!=='Offline_Marketing'){r.eventname='';r.eventdate='';}
  if(!Object.keys(GEO[r.prov]||{}).includes(r.dist))r.dist='';
  if(!((GEO[r.prov]||{})[r.dist]||[]).includes(r.comm))r.comm='';
  bulkDraw(i,r);bulkClearFlags();
}
function bulkDrop(i){const tr=$('br-'+i);if(tr)tr.remove();bulkNumber();bulkClearFlags();}
function bulkApply(){
  const t=bulkTop();
  [...$('bulkbody').children].forEach(tr=>{const i=+tr.id.slice(3),r=bulkRead(i);
    Object.assign(r,{date:t.date,ctype:t.ctype});
    if(r.chan!==t.chan){r.chan=t.chan;r.agent='';r.refname='';r.refphone='';r.eventname='';r.eventdate='';}
    r.sub=t.sub;bulkDraw(i,r);});
  try{localStorage.setItem('bulkdef',JSON.stringify({chan:t.chan,sub:t.sub}));}catch(e){}
  bulkClearFlags();toast('Applied to every row');
}
/* Enter in a name or phone box goes to the next row's name, adding one if needed */
function bulkKey(e,i){
  if(e.key!=='Enter')return;e.preventDefault();
  const rows=[...$('bulkbody').children],k=rows.findIndex(tr=>tr.id==='br-'+i);
  if(k===rows.length-1)bulkAdd(1);
  const next=$('bulkbody').children[k+1];if(next)next.querySelector('[id^="bname-"]').focus();
}
/* a pasted list fills one row per line: "Sok Dara 012345678", or name and
   phone in two columns copied from Excel */
function bulkPaste(e,i){
  const text=(e.clipboardData||window.clipboardData).getData('text');
  const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length<2&&!/\t/.test(text))return;
  e.preventDefault();
  let rows=[...$('bulkbody').children],k=rows.findIndex(tr=>tr.id==='br-'+i);
  const need=k+lines.length-rows.length;if(need>0)bulkAdd(need);
  rows=[...$('bulkbody').children];
  lines.forEach((line,n)=>{
    const id=+rows[k+n].id.slice(3);let name=line,phone='';
    if(/\t/.test(line)){const p=line.split('\t');name=p[0].trim();phone=(p[1]||'').trim();}
    else{const m=line.match(/^(.*?)[\s,:-]*((?:\+?855|0)?[\d០-៩][\d០-៩\s.-]{6,})$/);if(m){name=m[1].trim();phone=m[2].trim();}}
    $('bname-'+id).value=name;$('bphone-'+id).value=phone;
  });
  bulkClearFlags();toast(lines.length+' rows filled');
}
function bulkClearFlags(){
  BULKFLAG=null;document.querySelectorAll('#bulkbody tr').forEach(tr=>{tr.classList.remove('bulkwarn','bulkbad');const m=tr.querySelector('.bulknote');if(m)m.remove();});
  const b=$('bulkgo');if(b)b.textContent='Create leads';const s=$('bulkmsg');if(s)s.textContent='';
}
function bulkMark(tr,cls,msg){tr.classList.add(cls);const c=tr.children[2];
  c.insertAdjacentHTML('beforeend',`<span class="bulknote">${esc(msg)}</span>`);}
const bulkDigits=p=>normNum(p||'',{int:true}).replace(/^855/,'').replace(/^0/,'');
async function bulkCreate(){
  const trs=[...$('bulkbody').children];
  const rows=trs.map(tr=>({tr,i:+tr.id.slice(3),r:bulkRead(+tr.id.slice(3))}))
    .filter(x=>x.r.name.trim()||x.r.phone.trim());
  if(!rows.length){toast('Type at least one customer');return;}
  document.querySelectorAll('#bulkbody .bulknote').forEach(n=>n.remove());
  trs.forEach(tr=>tr.classList.remove('bulkbad'));
  /* the same checks as the one-lead form, row by row */
  let bad=0;
  rows.forEach(({tr,r})=>{
    const why=!r.name.trim()?'Customer name is required':!r.sub?'Pick a sub-channel':r.sub==='Agent'&&!r.agent?'Pick the agent'
      :r.who&&!r.phone.trim()?'Add a phone before picking a salesperson':'';
    if(why){bad++;bulkMark(tr,'bulkbad',why);}
  });
  if(bad){$('bulkmsg').textContent=bad+' row'+(bad>1?'s':'')+' to fix';return;}
  /* duplicates: same name and phone already a lead, or twice in this list */
  if(!BULKFLAG){
    /* a number is stored as typed - 012..., 12..., 85512... - so ask for each form */
    const phones=[...new Set(rows.flatMap(x=>{const p=x.r.phone.trim(),d=bulkDigits(p);
      return p?[p,d,'0'+d,'855'+d,'+855'+d]:[];}))];
    const known=phones.length?((await sb.from('leads').select('ref_id,customer_name,phone').eq('is_deleted',false).in('phone',phones)).data||[]):[];
    const seen={};let n=0;
    rows.forEach(({tr,r})=>{
      const key=r.name.trim().toLowerCase()+'|'+bulkDigits(r.phone);
      const hit=r.phone.trim()&&known.find(k=>bulkDigits(k.phone)===bulkDigits(r.phone));
      if(hit){n++;bulkMark(tr,'bulkwarn','Already a lead: '+(hit.ref_id||'no ref')+' '+hit.customer_name);}
      else if(r.phone.trim()&&seen[key]){n++;bulkMark(tr,'bulkwarn','Twice in this list');}
      seen[key]=1;
    });
    if(n){BULKFLAG=true;$('bulkmsg').textContent=n+' possible duplicate'+(n>1?'s':'');$('bulkgo').textContent='Create anyway';return;}
  }
  /* save one by one; a row that fails stays on screen with the reason */
  $('bulkgo').disabled=true;let ok=0,fail=0;
  for(const {tr,r} of rows){
    const row={customer_name:r.name.trim(),phone:r.phone.trim()||null,lead_date:r.date||localDay(new Date()),
      customer_type:r.ctype,monthly_bill_usd:r.bill||null,lead_channel:r.chan,lead_sub_channel:r.sub||null,
      agent_name:r.sub==='Agent'?r.agent:null,
      referrer_name:r.chan==='Third_Party'?(r.refname.trim()||null):null,
      referrer_phone:r.chan==='Third_Party'?(r.refphone.trim()||null):null,
      site_address:r.addr.trim()||null,commune:r.comm||null,district:r.dist||null,province:r.prov||null,city_province:r.prov||null,
      site_type:r.site.trim()||null,created_by:ME.id};
    if(r.chan==='Offline_Marketing'){row.event_name=r.eventname.trim()||null;row.event_date=r.eventdate||null;}
    if(r.who){row.assigned_to=r.who;row.assigned_at=new Date().toISOString();}
    const {data,error}=await sb.from('leads').insert(row).select().single();
    if(error){fail++;bulkMark(tr,'bulkbad','Not saved. '+why(error));continue;}
    await logActivity(data.id,'created',null,'info_gathering',r.note.trim()||'Lead created');
    ok++;tr.remove();
  }
  $('bulkgo').disabled=false;BULKFLAG=null;$('bulkgo').textContent='Create leads';bulkNumber();
  try{const t=bulkTop();localStorage.setItem('bulkdef',JSON.stringify({chan:t.chan,sub:t.sub}));}catch(e){}
  $('bulkmsg').textContent=fail?`${ok} created · ${fail} not saved`:`${ok} created`;
  toast(`${ok} lead${ok===1?'':'s'} created`+(fail?`, ${fail} not saved`:''));
  if(!$('bulkbody').children.length)bulkAdd(5);
}
