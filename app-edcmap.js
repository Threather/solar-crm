/* ---------------- EDC branches: contacts and map (Lists > EDC branch) ----------------
   Moved here from EDC > Map on 10 Nov 2026 so admin keys a branch in one
   place: its contact people and phone numbers in the table, its pin on the
   map under it. One row per branch in edc_branch_pins, keyed by the branch
   name; renaming a branch on Lists leaves its old row behind. Leaflet and the
   OpenStreetMap tiles load only when this list is opened. */
let EDCMAP=null, EDCPINS={}, EDCMARK={}, EDCPICK='', EDCCOUNT={};
const edcPeople=p=>Array.isArray(p&&p.contacts)?p.contacts:[];
const edcRowName=id=>(LISTROWS.find(r=>r.id===id)||{}).value||'';
function edcLoadLeaflet(){
  if(window.L)return Promise.resolve();
  return new Promise((ok,no)=>{
    const c=document.createElement('link');c.rel='stylesheet';
    c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload=ok;s.onerror=no;document.head.appendChild(s);});
}
/* the two extra cells of a branch row on Lists */
function edcCells(id){
  const b=edcRowName(id), p=EDCPINS[b], people=edcPeople(p), placed=p&&p.lat!=null;
  return `<td id="edcp-${id}"><div class="edcpeople">${people.map((x,i)=>`<div class="offrow"><span>${esc(x.name)}</span><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a><button class="lsx" title="Remove" onclick="edcPerson('${id}',${i})">×</button></div>`).join('')}
      <div class="edcadd"><input id="edcpn-${id}" placeholder="Contact person"><input id="edcpp-${id}" placeholder="Phone number"><button class="btn-line" onclick="edcPerson('${id}')">Save</button></div></div></td>
    <td id="edcm-${id}" class="nowrap">${placed?`<button class="btn-line lgq" onclick="edcFly('${id}')">On the map</button> <button class="lsx" title="Remove pin" onclick="edcRemove('${id}')">×</button>`
      :`<button class="btn-line lgq${EDCPICK===b?' on':''}" onclick="edcPickFor('${id}')">${EDCPICK===b?'Click the map…':'Set on map'}</button>`}</td>`;
}
function edcRefresh(id){
  const p=$('edcp-'+id), m=$('edcm-'+id);if(!p||!m)return;
  const tmp=document.createElement('tbody');tmp.innerHTML='<tr>'+edcCells(id)+'</tr>';
  p.replaceWith(tmp.querySelector('#edcp-'+id));m.replaceWith(tmp.querySelector('#edcm-'+id));
}
const edcRefreshAll=()=>LISTROWS.forEach(r=>edcRefresh(r.id));
async function edcLoadPins(){
  const {data,error}=await sb.from('edc_branch_pins').select('*');
  if(error){console.error(error);toast('Could not load the branch contacts. '+why(error));return false;}
  EDCPINS=Object.fromEntries((data||[]).map(p=>[p.branch,p]));
  return true;
}
/* pending and submitted per branch, worked as the EDC worklist works them */
async function edcCounts(){
  EDCCOUNT={};
  const won=await fetchLeads(q=>q.eq('stage_code',WON));
  const rows=won.filter(l=>hasPart(l,'EDC/EAC')&&edcApplies(l)&&!edcCovered(l));
  rows.forEach(l=>{const b=l.edc_branch;if(!b)return;const f=edcFields(l),d=edcDone(l);
    const c=EDCCOUNT[b]=EDCCOUNT[b]||{p:0,s:0};if(f&&d<f.length)c.p++;if(d>0)c.s++;});
}
async function edcListsMap(){
  const box=$('edc-canvas');if(!box)return;
  await edcCounts();
  try{await edcLoadLeaflet();}catch(e){toast('Could not load the map');return;}
  if(!$('edc-canvas'))return;
  if(EDCMAP)EDCMAP.remove();
  EDCMARK={};EDCPICK='';
  EDCMAP=L.map('edc-canvas').setView([12.6,104.9],7);
  EDCMAP.attributionControl.setPrefix(false);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(EDCMAP);
  EDCMAP.on('click',e=>{if(EDCPICK)edcPlace(EDCPICK,e.latlng.lat,e.latlng.lng);});
  const placed=Object.values(EDCPINS).filter(p=>p.lat!=null);
  placed.forEach(edcMark);
  const pts=placed.map(p=>[p.lat,p.lng]);
  if(pts.length>1)EDCMAP.fitBounds(pts,{padding:[40,40],maxZoom:12});
  else if(pts.length)EDCMAP.setView(pts[0],12);
}
const edcWord=b=>{const c=EDCCOUNT[b]||{p:0,s:0};return `Pending ${c.p} · Submitted ${c.s}`;};
function edcMark(p){
  if(EDCMARK[p.branch])EDCMARK[p.branch].remove();
  const m=L.marker([p.lat,p.lng],{draggable:true,icon:L.divIcon({className:'edcpin',html:'<i></i>',iconSize:[22,22],iconAnchor:[11,22],popupAnchor:[0,-20]})}).addTo(EDCMAP);
  m.bindTooltip(esc(p.branch),{direction:'top',offset:[0,-20]});
  m.bindPopup(`<b>${esc(p.branch)}</b><br>${edcWord(p.branch)}${edcPeople(p).map(x=>`<br>${esc(x.name)} · <a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>`).join('')}`);
  m.on('dragend',()=>{const q=m.getLatLng();edcPlace(p.branch,q.lat,q.lng);});
  EDCMARK[p.branch]=m;
}
function edcPickFor(id){
  const b=edcRowName(id);EDCPICK=EDCPICK===b?'':b;
  $('edc-canvas')?.classList.toggle('picking',!!EDCPICK);
  if(EDCPICK)$('edc-canvas')?.scrollIntoView({block:'center',behavior:'smooth'});
  edcRefreshAll();
}
function edcFly(id){
  const b=edcRowName(id),p=EDCPINS[b];if(!p||p.lat==null||!EDCMAP)return;
  $('edc-canvas').scrollIntoView({block:'center',behavior:'smooth'});
  EDCMAP.flyTo([p.lat,p.lng],13);EDCMARK[b]?.openPopup();
}
async function edcPlace(branch,lat,lng){
  const row={branch,lat,lng,contacts:edcPeople(EDCPINS[branch]),updated_by:ME.id,updated_at:new Date().toISOString()};
  const {error}=await sb.from('edc_branch_pins').upsert(row,{onConflict:'branch'});
  if(error){toast('Could not save. '+why(error));return;}
  EDCPINS[branch]=row;edcMark(row);EDCPICK='';$('edc-canvas')?.classList.remove('picking');toast('Saved');edcRefreshAll();
}
/* with an index it removes that person; without one it adds from the boxes.
   A branch with no pin yet keeps its people on a row with no place */
async function edcPerson(id,i){
  const b=edcRowName(id), list=[...edcPeople(EDCPINS[b])];
  if(i==null){
    const name=$('edcpn-'+id).value.trim(), phone=$('edcpp-'+id).value.trim();
    if(!name){needField('edcpn-'+id,'Type the name');return;}
    if(!phone){needField('edcpp-'+id,'Type the phone number');return;}
    list.push({name,phone});
  }else list.splice(i,1);
  const {error}=EDCPINS[b]
    ?await sb.from('edc_branch_pins').update({contacts:list,updated_by:ME.id,updated_at:new Date().toISOString()}).eq('branch',b)
    :await sb.from('edc_branch_pins').insert({branch:b,lat:null,lng:null,contacts:list,updated_by:ME.id});
  if(error){toast('Could not save. '+why(error));return;}
  EDCPINS[b]={...(EDCPINS[b]||{branch:b,lat:null,lng:null}),contacts:list};
  if(EDCPINS[b].lat!=null&&EDCMAP)edcMark(EDCPINS[b]);
  toast('Saved');edcRefresh(id);
}
async function edcRemove(id){
  const b=edcRowName(id), p=EDCPINS[b];if(!p||p.lat==null)return;
  /* the people stay; only the place is cleared */
  const {error}=edcPeople(p).length
    ?await sb.from('edc_branch_pins').update({lat:null,lng:null}).eq('branch',b)
    :await sb.from('edc_branch_pins').delete().eq('branch',b);
  if(error){toast('Could not remove. '+why(error));return;}
  if(edcPeople(p).length)EDCPINS[b]={...p,lat:null,lng:null};else delete EDCPINS[b];
  if(EDCMARK[b]){EDCMARK[b].remove();delete EDCMARK[b];}edcRefresh(id);
}
