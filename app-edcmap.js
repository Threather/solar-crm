/* ---------------- EDC > Map (5 Nov 2026) ----------------
   Each EDC branch pinned on a real map. Admin picks a branch from the list,
   clicks the map to place it, drags a pin to correct it. Pins live in
   edc_branch_pins, one row per branch; the names come from Lists. Leaflet and
   the OpenStreetMap tiles load only when this tab is opened. */
let EDCMAP=null, EDCPINS={}, EDCMARK={}, EDCPICK='', EDCCOUNT={};
function edcLoadLeaflet(){
  if(window.L)return Promise.resolve();
  return new Promise((ok,no)=>{
    const c=document.createElement('link');c.rel='stylesheet';
    c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);
    const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload=ok;s.onerror=no;document.head.appendChild(s);});
}
async function edcMap(outstanding,started){
  EDCCOUNT={};
  const add=(l,k)=>{const b=l.edc_branch;if(!b)return;(EDCCOUNT[b]=EDCCOUNT[b]||{p:0,s:0})[k]++;};
  outstanding.forEach(l=>add(l,'p'));started.forEach(l=>add(l,'s'));
  const wrap=$('edcmapwrap');
  wrap.innerHTML=`<div class="edcmap"><div class="edcside"><input id="edc-find" placeholder="Search branch" oninput="edcList()"><div id="edc-list"></div></div><div id="edc-canvas"></div></div>`;
  const {data,error}=await sb.from('edc_branch_pins').select('*');
  if(error){toast('Could not load the map. '+why(error));return;}
  EDCPINS=Object.fromEntries((data||[]).map(p=>[p.branch,p]));
  try{await edcLoadLeaflet();}catch(e){toast('Could not load the map');return;}
  if(!$('edc-canvas'))return;
  if(EDCMAP){EDCMAP.remove();}
  EDCMARK={};EDCPICK='';
  EDCMAP=L.map('edc-canvas').setView([12.6,104.9],7);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(EDCMAP);
  EDCMAP.on('click',e=>{if(EDCPICK)edcPlace(EDCPICK,e.latlng.lat,e.latlng.lng);});
  Object.values(EDCPINS).forEach(edcMark);
  const pts=Object.values(EDCPINS).map(p=>[p.lat,p.lng]);
  if(pts.length>1)EDCMAP.fitBounds(pts,{padding:[40,40],maxZoom:12});
  edcList();
}
const edcWord=b=>{const c=EDCCOUNT[b]||{p:0,s:0};return `Pending ${c.p} · Submitted ${c.s}`;};
function edcMark(p){
  if(EDCMARK[p.branch])EDCMARK[p.branch].remove();
  const m=L.marker([p.lat,p.lng],{draggable:true,icon:L.divIcon({className:'edcpin',html:'<i></i>',iconSize:[22,22],iconAnchor:[11,22],popupAnchor:[0,-20]})}).addTo(EDCMAP);
  m.bindTooltip(esc(p.branch),{direction:'top',offset:[0,-20]});
  m.bindPopup(`<b>${esc(p.branch)}</b><br>${edcWord(p.branch)}`);
  m.on('dragend',()=>{const q=m.getLatLng();edcPlace(p.branch,q.lat,q.lng);});
  EDCMARK[p.branch]=m;
}
function edcList(){
  const q=($('edc-find')?.value||'').toLowerCase(), box=$('edc-list');if(!box)return;
  box.innerHTML=EDC_BRANCHES.filter(b=>b.toLowerCase().includes(q)).map((b,i)=>{const on=!!EDCPINS[b], k=EDC_BRANCHES.indexOf(b);
    return `<div class="edcrow${EDCPICK===b?' pick':''}" onclick="edcGo(${k})"><span class="edcdot${on?' on':''}"></span><div><b>${esc(b)}</b><span>${on?esc(edcWord(b)):EDCPICK===b?'Click the map':'Not on the map'}</span></div>${on?`<button class="lsx" title="Remove pin" onclick="event.stopPropagation();edcRemove(${k})">×</button>`:''}</div>`;}).join('')
    ||'<div class="sub">No branch found</div>';
}
function edcGo(k){
  const b=EDC_BRANCHES[k];EDCPICK=EDCPICK===b?'':b;
  const p=EDCPINS[b];
  if(p&&EDCPICK){EDCMAP.flyTo([p.lat,p.lng],13);EDCMARK[b].openPopup();}
  $('edc-canvas').classList.toggle('picking',!!EDCPICK);
  edcList();
}
async function edcPlace(branch,lat,lng){
  const row={branch,lat,lng,updated_by:ME.id,updated_at:new Date().toISOString()};
  const {error}=await sb.from('edc_branch_pins').upsert(row,{onConflict:'branch'});
  if(error){toast('Could not save. '+why(error));return;}
  EDCPINS[branch]=row;edcMark(row);EDCPICK='';$('edc-canvas').classList.remove('picking');toast('Saved');edcList();
}
async function edcRemove(k){
  const b=EDC_BRANCHES[k];
  const {error}=await sb.from('edc_branch_pins').delete().eq('branch',b);
  if(error){toast('Could not remove. '+why(error));return;}
  delete EDCPINS[b];if(EDCMARK[b]){EDCMARK[b].remove();delete EDCMARK[b];}edcList();
}
