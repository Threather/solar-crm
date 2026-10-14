/* ---------------- LISTS (admin) ----------------
   The dropdown vocabularies, edited here instead of in the code. Which lists
   are editable is decided in VOCAB_LISTS in app-core.js: only the ones
   nothing branches on. System type, BOQ status, contract status, after-sale
   status and channel are read by their exact values somewhere in the app and
   would break quietly if renamed, so they are not offered.

   Hide is the normal way to retire a value: it leaves the dropdowns but a
   lead already carrying it still reads correctly. Delete is there for a value
   typed by mistake and says what it costs before it goes. */
let LISTKEY='panel_brand', LISTROWS=[], LISTFLASH=null;
/* the lists grouped by what they describe, so thirteen tabs read as four
   short groups (UI pass, 14 Oct 2026) */
const LIST_GROUPS=[
  ['Products',['panel_brand','inverter_brand','battery_brand','roof_type','phase_type']],
  ['Customers',['customer_type','lost_reason']],
  ['After-sale',['as_cause','as_pic']],
  ['Team and office',['install_team','agent','edc_branch','account_type']]];

async function renderLists(){
  if(ME.role!=='admin'){
    $('main').innerHTML=blank('Lists are admin only','Ask an admin to change a dropdown.');return;}
  const {data,error}=await sb.from('vocabularies')
    .select('*').eq('list_key',LISTKEY).order('sort_order');
  if(error){
    $('main').innerHTML=blank('Could not load the lists',why(error));return;}
  LISTROWS=data||[];
  /* an agent's phone, bank account and contract date: agent_details, admin only */
  let AD={};
  if(LISTKEY==='agent'){const r=await sb.from('agent_details').select('*');(r.data||[]).forEach(x=>AD[x.name]=x);}
  const meta=VOCAB_LISTS.find(l=>l[0]===LISTKEY)||[];
  const label=k=>(VOCAB_LISTS.find(l=>l[0]===k)||[])[1]||k;
  const grouped=new Set(LIST_GROUPS.flatMap(g=>g[1]));
  const groups=LIST_GROUPS.concat([['Other',VOCAB_LISTS.map(l=>l[0]).filter(k=>!grouped.has(k))]]).filter(g=>g[1].length);
  const live=LISTROWS.filter(r=>r.is_active).length, off=LISTROWS.length-live;
  const extra=LISTKEY==='install_team'?'<th>Team members</th>':LISTKEY==='agent'?'<th>Phone · Contract signed</th><th>Bank</th>':'';
  const span=3+(LISTKEY==='install_team'?1:LISTKEY==='agent'?2:0);
  $('main').innerHTML=`
    <h2 style="margin-bottom:14px">Lists</h2>
    <div class="lslayout">
      <nav class="lsnav">${groups.map(([g,keys])=>`<div class="lsgroup">${esc(g)}</div>`+keys.map(k=>
        `<button class="${k===LISTKEY?'on':''}" onclick="listGo('${k}')">${esc(label(k))}</button>`).join('')).join('')}</nav>
      <div class="lscard ${LISTKEY==='agent'?'wide':''}">
        <div class="lshead"><h3>${esc(meta[1]||LISTKEY)}</h3><span>${live} in use${off?` · ${off} hidden`:''}</span></div>
        <div class="tablewrap"><table class="lstable ${LISTKEY==='agent'?'agtable':''}"><thead><tr>
          <th class="lsdrag"></th><th>Value</th>${extra}<th class="lsst">In use</th><th class="lsdel"></th>
        </tr></thead><tbody id="lsbody">`+LISTROWS.map(r=>`
          <tr data-id="${r.id}" draggable="true" ondragstart="lsDragStart(event)" ondragover="lsDragOver(event)" ondrop="lsDrop(event)" ondragend="lsDragEnd()" class="${r.is_active?'':'lsoff'}">
            <td class="lsdrag" title="Drag to reorder">⋮⋮</td>
            <td><b>${esc(r.value)}</b>${LISTFLASH===r.id?'<span class="lssaved">Saved</span>':''}</td>
            ${LISTKEY==='install_team'?`<td><input value="${esc(r.detail||'')}" placeholder="e.g. Dina, Sok, Vanna" onchange="listDetail('${r.id}',this.value)"></td>`:''}
            ${LISTKEY==='agent'?(()=>{const a=AD[r.value]||{},box=(f,ph,t)=>`<input class="ag-${f}" ${t?`type="${t}"`:''} placeholder="${ph}" value="${esc(a[f]||'')}" onchange="agentSave('${r.id}','${f}',this.value)">`;
              return `<td><div class="agbank">${box('phone','0898123456')}${box('contract_date','','date')}</div></td>
              <td><div class="agbank">${box('bank_name','Bank name')}${box('bank_account','Bank account number')}${box('bank_account_name','Bank account name')}</div></td>`;})():''}
            <td class="lsst"><label class="lsswitch" title="${r.is_active?'In the dropdown':'Hidden from the dropdown'}"><input type="checkbox" ${r.is_active?'checked':''} onchange="listHide('${r.id}',this.checked)"><i></i></label></td>
            <td class="lsdel"><button class="lsx" title="Delete" onclick="listDelete('${r.id}')">✕</button></td>
          </tr>`).join('')+`</tbody>
          <tfoot><tr class="lsadd"><td class="lsdrag">+</td><td colspan="${span}"><div class="lsaddbox">
            <input id="v-new" placeholder="Add a new ${esc((meta[1]||'value').toLowerCase())}" oninput="listDupCheck()" onkeydown="if(event.key==='Enter')listAdd()">
            <button class="btn-sun" onclick="listAdd()">Add</button><span id="v-dup"></span></div></td></tr></tfoot></table></div>
      </div>
    </div>`;
  if(LISTFLASH){const f=LISTFLASH;setTimeout(()=>{if(LISTFLASH===f){LISTFLASH=null;document.querySelectorAll('.lssaved').forEach(e=>e.remove());}},1800);}
}
function listGo(k){LISTKEY=k;LISTFLASH=null;renderLists();}
/* the same name already in the list is said while typing, not after Add */
function listDupCheck(){
  const v=$('v-new').value.trim().toLowerCase(),hit=v&&LISTROWS.find(r=>r.value.toLowerCase()===v);
  $('v-dup').textContent=hit?('Already in the list'+(hit.is_active?'':' (switched off)')):'';
}

/* new values go on the end, a step past the last one */
async function listAdd(){
  const v=$('v-new').value.trim();
  if(!v){$('v-new').focus();return;}
  if(LISTROWS.some(r=>r.value.toLowerCase()===v.toLowerCase())){listDupCheck();return;}
  const last=LISTROWS.length?Math.max(...LISTROWS.map(r=>r.sort_order||0)):0;
  const {data,error}=await sb.from('vocabularies')
    .insert({list_key:LISTKEY,value:v,sort_order:last+10,is_active:true}).select().single();
  if(error){toast('Could not add it. '+why(error));console.error(error);return;}
  LISTFLASH=data&&data.id;await loadVocab();await renderLists();
  const n=$('v-new');if(n)n.focus();
}
/* switching off is the safe retirement: the value leaves every dropdown but a
   lead already carrying it still shows it, because optList puts it back */
async function listHide(id,active){
  const {error}=await sb.from('vocabularies').update({is_active:active}).eq('id',id);
  if(error){toast('Could not save. '+why(error));renderLists();return;}
  LISTFLASH=id;await loadVocab();renderLists();
}
async function listDelete(id){
  const row=LISTROWS.find(r=>r.id===id);if(!row)return;
  if(!confirm('Delete "'+row.value+'"?\n\nLeads already saved with it keep the value, but it can no longer be picked. Switching it off hides it instead.'))return;
  const {error}=await sb.from('vocabularies').delete().eq('id',id);
  if(error){toast('Could not delete. '+why(error));return;}
  toast('Deleted');await loadVocab();renderLists();
}
/* drag a row to reorder; the new order is written as 10, 20, 30... for the
   rows whose position changed */
let LSDRAG=null;
function lsDragStart(e){LSDRAG=e.currentTarget;e.dataTransfer.effectAllowed='move';e.currentTarget.classList.add('lsdragging');}
function lsDragOver(e){
  e.preventDefault();const tr=e.currentTarget;if(!LSDRAG||tr===LSDRAG)return;
  const box=tr.getBoundingClientRect(),after=e.clientY>box.top+box.height/2;
  tr.parentNode.insertBefore(LSDRAG,after?tr.nextSibling:tr);
}
function lsDrop(e){e.preventDefault();}
async function lsDragEnd(){
  if(!LSDRAG)return;const moved=LSDRAG;LSDRAG=null;moved.classList.remove('lsdragging');
  const ids=[...$('lsbody').children].map(tr=>tr.dataset.id);
  const jobs=ids.map((id,i)=>{const r=LISTROWS.find(x=>x.id===id);return r&&r.sort_order!==(i+1)*10
    ?sb.from('vocabularies').update({sort_order:(i+1)*10}).eq('id',id):null;}).filter(Boolean);
  if(!jobs.length)return;
  const res=await Promise.all(jobs);const bad=res.find(r=>r.error);
  if(bad)toast('Could not reorder. '+why(bad.error));
  LISTFLASH=moved.dataset.id;await loadVocab();renderLists();
}
/* team members, shown under the letters on the Calendar */
async function listDetail(id,v){
  const {error}=await sb.from('vocabularies').update({detail:v.trim()||null}).eq('id',id);
  if(error){toast('Could not save. '+why(error));return;}
  toast('Saved');await loadVocab();
}
/* one agent's private details, saved on change */
async function agentSave(id,f,v){
  const row=LISTROWS.find(r=>r.id===id);if(!row)return;
  const {error}=await sb.from('agent_details').upsert({name:row.value,[f]:v.trim()||null,updated_at:new Date().toISOString()},{onConflict:'name'});
  if(error){toast('Could not save. '+why(error));return;}
  toast('Saved');
}
