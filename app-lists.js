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
  ['Products',['__products','panel_brand','inverter_brand','battery_brand','roof_type','phase_type']],
  ['Customers',['customer_type','lost_reason']],
  ['After-sale',['as_cause','as_pic']],
  ['Team and office',['install_team','agent','edc_branch','account_type']]];

async function renderLists(){
  if(ME.role!=='admin'){
    $('main').innerHTML=blank('Lists are admin only','Ask an admin to change a dropdown.');return;}
  /* Models & photos is its own table, drawn by app-products.js */
  if(LISTKEY==='__products'){
    $('main').innerHTML=`<h2 style="margin-bottom:14px">Lists</h2><div class="lslayout">${lsNav()}<div class="lscard wide" id="prodcard"></div></div>`;
    return renderProducts();
  }
  const {data,error}=await sb.from('vocabularies')
    .select('*').eq('list_key',LISTKEY).order('sort_order');
  if(error){
    $('main').innerHTML=blank('Could not load the lists',why(error));return;}
  LISTROWS=data||[];
  /* an agent's phone, bank account and contract date: agent_details, admin only */
  let AD={};
  if(LISTKEY==='agent'){const r=await sb.from('agent_details').select('*');(r.data||[]).forEach(x=>AD[x.name]=x);}
  const meta=VOCAB_LISTS.find(l=>l[0]===LISTKEY)||[];
  const live=LISTROWS.filter(r=>r.is_active).length, off=LISTROWS.length-live;
  const extra=LISTKEY==='install_team'?'<th>Team members</th>':LISTKEY==='agent'?'<th>Phone · Contract signed</th><th>Bank</th>':'';
  const span=3+(LISTKEY==='install_team'?1:LISTKEY==='agent'?2:0);
  $('main').innerHTML=`
    <h2 style="margin-bottom:14px">Lists</h2>
    <div class="lslayout">
      ${lsNav()}
      <div class="lscard ${LISTKEY==='agent'?'wide':''}">
        <div class="lshead"><h3>${esc(meta[1]||LISTKEY)}</h3><span>${live} in use${off?` · ${off} hidden`:''}</span></div>
        <div class="tablewrap"><table class="lstable ${LISTKEY==='agent'?'agtable':''}"><thead><tr>
          <th class="lsdrag"></th><th>Value</th>${extra}<th class="lsst">In use</th><th class="lsdel"></th>
        </tr></thead><tbody id="lsbody">`+LISTROWS.map(r=>`
          <tr data-id="${r.id}" draggable="true" ondragstart="lsDragStart(event)" ondragover="lsDragOver(event)" ondrop="lsDrop(event)" ondragend="lsDragEnd()" class="${r.is_active?'':'lsoff'}">
            <td class="lsdrag" title="Drag to reorder">⋮⋮</td>
            <td>${LISTKEY==='agent'?`<div class="agname" id="agn-${r.id}"><b>${esc(r.value)}</b><button class="btn-mini" onclick="agentEdit('${r.id}',true)">Rename</button></div>
              <div class="agname" id="age-${r.id}" style="display:none"><input class="lsname" value="${esc(r.value)}" onkeydown="if(event.key==='Enter')agentRename('${r.id}');if(event.key==='Escape')agentEdit('${r.id}',false)">
                <button class="btn-sun btn-mini" onclick="agentRename('${r.id}')">Save</button><button class="btn-mini" onclick="agentEdit('${r.id}',false)">Cancel</button></div>`:`<b>${esc(r.value)}</b>`}${LISTFLASH===r.id?'<span class="lssaved">Saved</span>':''}</td>
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
function lsNav(){
  const label=k=>k==='__products'?'Models & photos':(VOCAB_LISTS.find(l=>l[0]===k)||[])[1]||k;
  const grouped=new Set(LIST_GROUPS.flatMap(g=>g[1]));
  const groups=LIST_GROUPS.concat([['Other',VOCAB_LISTS.map(l=>l[0]).filter(k=>!grouped.has(k))]]).filter(g=>g[1].length);
  return `<nav class="lsnav">${groups.map(([g,keys])=>`<div class="lsgroup">${esc(g)}</div>`+keys.map(k=>
    `<button class="${k===LISTKEY?'on':''}" onclick="listGo('${k}')">${esc(label(k))}</button>`).join('')).join('')}</nav>`;
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

/* an agent's name is fixed in three places: the list, their phone and bank
   details, and every lead that names them - all three move together, or an
   old lead keeps the misspelt name (client, 23 Oct 2026) */
/* Rename shows the box with Save and Cancel; nothing is written until Save */
function agentEdit(id,on){
  const n=$('agn-'+id),e=$('age-'+id);if(!n||!e)return;
  n.style.display=on?'none':'';e.style.display=on?'':'none';
  const i=e.querySelector('input');
  if(on){i.focus();i.select();}else{const r=LISTROWS.find(x=>x.id===id);if(r)i.value=r.value;}
}
async function agentRename(id){
  const input=document.querySelector('#age-'+id+' input');
  const row=LISTROWS.find(r=>r.id===id);if(!row||!input)return;
  const old=row.value, nu=input.value.trim();
  if(!nu||nu===old){agentEdit(id,false);return;}
  if(LISTROWS.some(r=>r.id!==id&&r.value.toLowerCase()===nu.toLowerCase())){toast('"'+nu+'" is already in the list');input.value=old;return;}
  const {count}=await sb.from('leads').select('id',{count:'exact',head:true}).eq('agent_name',old);
  if(!confirm('Rename "'+old+'" to "'+nu+'"?'+(count?'\n\n'+count+' lead'+(count===1?'':'s')+' with this agent will show the new name.':'')))
    {input.value=old;return;}
  const v=await sb.from('vocabularies').update({value:nu}).eq('id',id).select('id');
  if(v.error||!v.data||!v.data.length){toast('Could not rename. '+(v.error?why(v.error):''));input.value=old;return;}
  const d=await sb.from('agent_details').update({name:nu}).eq('name',old);
  if(d.error)console.error('agent details',d.error);
  const l=await sb.from('leads').update({agent_name:nu}).eq('agent_name',old).select('id');
  if(l.error){toast('Renamed in the list, but the leads did not follow. '+why(l.error));}
  else toast('Renamed'+(l.data&&l.data.length?' · '+l.data.length+' lead'+(l.data.length===1?'':'s')+' updated':''));
  LISTFLASH=id;await loadVocab();renderLists();
}
