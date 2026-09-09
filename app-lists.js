/* ---------------- LISTS (admin) ----------------
   The dropdown vocabularies, edited here instead of in the code. Which lists
   are editable is decided in VOCAB_LISTS in app-core.js: only the ones
   nothing branches on. System type, BOQ status, contract status, after-sale
   status and channel are read by their exact values somewhere in the app and
   would break quietly if renamed, so they are not offered.

   Hide is the normal way to retire a value: it leaves the dropdowns but a
   lead already carrying it still reads correctly. Delete is there for a value
   typed by mistake and says what it costs before it goes. */
let LISTKEY='panel_brand', LISTROWS=[];

async function renderLists(){
  if(ME.role!=='admin'){
    $('main').innerHTML=blank('Lists are admin only','Ask an admin to change a dropdown.');return;}
  const {data,error}=await sb.from('vocabularies')
    .select('*').eq('list_key',LISTKEY).order('sort_order');
  if(error){
    $('main').innerHTML=blank('Could not load the lists',why(error));return;}
  LISTROWS=data||[];
  const meta=VOCAB_LISTS.find(l=>l[0]===LISTKEY)||[];
  const note=meta[4]||'';
  const live=LISTROWS.filter(r=>r.is_active).length;
  $('main').innerHTML=`
    <h2 style="margin-bottom:4px">Lists</h2>
    <div class="sub">The dropdown values people pick from. Changes show the next time somebody signs in.</div>
    <div class="scope" style="flex-wrap:wrap;max-width:900px;margin-bottom:14px">${VOCAB_LISTS.map(([k,label])=>
      `<button class="${k===LISTKEY?'on':''}" onclick="listGo('${k}')">${esc(label)}</button>`).join('')}</div>
    <div class="section sec-eng" style="max-width:900px">
      <h4>${esc(meta[1]||LISTKEY)} · ${live} in use</h4>
      ${note?`<div class="hint">${esc(note)}</div>`:''}
      <div class="grid2">
        <div><label>Add a value</label><input id="v-new" placeholder="type it exactly as it should appear"></div>
        <div style="align-self:end"><button class="btn-sun" onclick="listAdd()">Add</button></div>
      </div>
      <div class="tablewrap" style="margin-top:14px"><table><thead><tr>
        <th>Value</th><th>Order</th><th>Status</th><th></th>
      </tr></thead><tbody>`+(LISTROWS.length?LISTROWS.map((r,i)=>`
        <tr${r.is_active?'':' style="opacity:.55"'}>
          <td><b>${esc(r.value)}</b></td>
          <td class="nowrap">
            <button class="btn-line" ${i===0?'disabled':''} onclick="listMove('${r.id}',-1)">↑</button>
            <button class="btn-line" ${i===LISTROWS.length-1?'disabled':''} onclick="listMove('${r.id}',1)">↓</button>
          </td>
          <td>${r.is_active?'<span class="badge b-on">in use</span>':'<span class="badge b-off">hidden</span>'}</td>
          <td class="nowrap">
            <button class="btn-line" onclick="listHide('${r.id}',${!r.is_active})">${r.is_active?'Hide':'Show'}</button>
            <button class="btn-line" onclick="listDelete('${r.id}')">Delete</button>
          </td>
        </tr>`).join('')
      :`<tr><td colspan="4">Nothing in this list yet.</td></tr>`)+`</tbody></table></div>
    </div>`;
}
function listGo(k){LISTKEY=k;renderLists();}

/* new values go on the end, a step past the last one, so the numbering stays
   sparse enough for a move to swap two of them without renumbering the lot */
async function listAdd(){
  const v=$('v-new').value.trim();
  if(!v){toast('Type a value first');return;}
  if(LISTROWS.some(r=>r.value===v)){toast('That value is already in this list');return;}
  const last=LISTROWS.length?Math.max(...LISTROWS.map(r=>r.sort_order||0)):0;
  const {error}=await sb.from('vocabularies')
    .insert({list_key:LISTKEY,value:v,sort_order:last+10,is_active:true});
  if(error){toast('Could not add it. '+why(error));console.error(error);return;}
  toast('Added');await loadVocab();renderLists();
}
/* hiding is the safe retirement: the value leaves every dropdown but a lead
   already carrying it still shows it, because optList puts it back */
async function listHide(id,active){
  const {error}=await sb.from('vocabularies').update({is_active:active}).eq('id',id);
  if(error){toast('Could not save. '+why(error));return;}
  toast(active?'Back in the list':'Hidden');await loadVocab();renderLists();
}
async function listDelete(id){
  const row=LISTROWS.find(r=>r.id===id);if(!row)return;
  if(!confirm(`Delete "${row.value}" from this list?\n\nLeads already saved with it keep the value, but it cannot be picked again. Hide it instead if you only want it off the dropdown.`))return;
  const {error}=await sb.from('vocabularies').delete().eq('id',id);
  if(error){toast('Could not delete. '+why(error));return;}
  toast('Deleted');await loadVocab();renderLists();
}
/* a move is a swap of two sort_orders, so the rest of the list is untouched */
async function listMove(id,dir){
  const i=LISTROWS.findIndex(r=>r.id===id), j=i+dir;
  if(i<0||j<0||j>=LISTROWS.length)return;
  const a=LISTROWS[i],b=LISTROWS[j];
  const [oa,ob]=[a.sort_order,b.sort_order];
  const e1=await sb.from('vocabularies').update({sort_order:ob}).eq('id',a.id);
  const e2=await sb.from('vocabularies').update({sort_order:oa}).eq('id',b.id);
  if(e1.error||e2.error){toast('Could not reorder. '+why(e1.error||e2.error));return;}
  await loadVocab();renderLists();
}
