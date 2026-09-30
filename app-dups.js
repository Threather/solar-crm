/* ---------------- duplicates ---------------- */
/* Two leads are the same customer when they carry the same name AND the same
   phone number (Kevin, 30 Sep 2026). The manager sees each group and decides:
   delete a copy (a soft delete, like the pool's) or keep the group, which
   records leads.dup_kept so it does not come back. A copy added later is not
   kept, so its group returns with the new row in it. */

/* a name compared without case or extra spaces */
const dupName=s=>(s||'').toLowerCase().replace(/\s+/g,' ').trim();
/* the phone box often holds two numbers; each is read as its digits, without
   the country code or the leading 0, so 012 880 255 and 12880255 are one */
const dupPhones=s=>(s||'').split(/[\/,;|]|\s{2,}|\bor\b/i)
  .map(x=>x.replace(/\D/g,'').replace(/^855/,'').replace(/^0/,''))
  .filter(x=>x.length>=8);

/* groups of two or more leads sharing a name and a number. A repeat purchase
   (parent_lead_id) is meant to be a second deal, so a group made only of a
   deal and its own repeats is not a duplicate. */
function dupGroups(rows){
  const byKey={};
  rows.forEach(l=>{const n=dupName(l.customer_name);if(!n)return;
    dupPhones(l.phone).forEach(p=>{(byKey[n+'|'+p]=byKey[n+'|'+p]||new Set()).add(l.id);});});
  const byId=Object.fromEntries(rows.map(l=>[l.id,l]));
  const seen=new Set(), out=[];
  Object.values(byKey).forEach(set=>{
    if(set.size<2)return;
    const key=[...set].sort().join();
    if(seen.has(key))return;seen.add(key);
    const g=[...set].map(id=>byId[id]);
    const root=l=>l.parent_lead_id||l.id;
    if(new Set(g.map(root)).size<2)return;
    /* kept by the manager, and nothing new has joined it since */
    if(g.every(l=>l.dup_kept))return;
    out.push(g.sort((a,b)=>(a.lead_date||a.created_at).localeCompare(b.lead_date||b.created_at)));
  });
  /* the newest copy first, so today's double entry is at the top */
  return out.sort((a,b)=>{const t=g=>g.reduce((m,l)=>(l.created_at>m?l.created_at:m),'');return t(b).localeCompare(t(a));});
}

let DUPS=[];
async function renderDups(){
  if(!['manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('Duplicates are manager and admin only','Leads that share a name and a phone number are listed here.');return;}
  $('main').innerHTML=SKEL;
  DUPS=dupGroups(await fetchLeads());
  drawDups();
}
function drawDups(){
  const n=DUPS.reduce((a,g)=>a+g.length,0);
  const head=`<tr><th>Ref ID</th><th>Customer</th><th>Phone</th><th>Stage</th><th>Sale engineer</th>
    <th>Lead date</th><th>Created by</th><th>Latest remark</th><th></th></tr>`;
  $('main').innerHTML=`<h2>Duplicates</h2>
    <p style="color:var(--ink-soft);margin:-4px 0 14px">Same name and same phone number.</p>
    <div class="stats"><div class="stat"><div class="n">${DUPS.length}</div><div class="l">Groups</div></div>
      <div class="stat"><div class="n">${n}</div><div class="l">Leads</div></div></div>
    ${DUPS.length?DUPS.map((g,i)=>`<div class="card" style="margin-top:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <b>${esc(g[0].customer_name)}</b><span class="quiet">${g.length} leads</span>
        <span class="spacer" style="flex:1"></span>
        <button class="btn-line" onclick="keepDup(${i})">Keep all</button></div>
      <div class="tablewrap"><table class="table-compact"><thead>${head}</thead><tbody>${g.map(l=>`
        <tr onclick="openLead('${l.id}')" style="cursor:pointer">
          <td class="mono">${esc(l.ref_id||'—')}</td>
          <td class="nm"><b>${esc(l.customer_name)}</b></td>
          <td>${phoneCell(l.phone)}</td>
          <td>${stagePill(l.stage_code)}</td>
          <td>${esc(l.assigned_to?staffName(l.assigned_to):'Not assigned')}</td>
          <td>${fmtDate(l.lead_date||l.created_at)}</td>
          <td>${esc(l.created_by?staffName(l.created_by):'—')}</td>
          <td>${l.last_remark?`<span class="clamp">${esc(l.last_remark.note||'')}</span>`:'<span class="quiet">—</span>'}</td>
          <td><button class="btn-line danger" onclick="event.stopPropagation();deleteDup('${l.id}')">Delete</button></td>
        </tr>`).join('')}</tbody></table></div></div>`).join('')
    :blank('No duplicates','No two leads share a name and a phone number.')}`;
}
/* one copy, a soft delete - it keeps its history and can be brought back */
async function deleteDup(id){
  if(!['manager','admin'].includes(ME.role))return;
  const l=DUPS.flat().find(x=>x.id===id);if(!l)return;
  if(!confirm(`Delete ${l.customer_name}${l.ref_id?' ('+l.ref_id+')':''}? It leaves every list and report.`))return;
  const {error}=await sb.from('leads').update({is_deleted:true,deleted_at:new Date().toISOString(),deleted_by:ME.id}).eq('id',id);
  if(error){toast('Delete failed. '+why(error));console.error(error);return;}
  if(typeof LEADS!=='undefined')LEADS=LEADS.filter(x=>x.id!==id);
  DUPS=DUPS.map(g=>g.filter(x=>x.id!==id)).filter(g=>g.length>1);
  toast('Deleted');drawDups();
}
/* not a duplicate - two sites of one company, a household on one number */
async function keepDup(i){
  if(!['manager','admin'].includes(ME.role))return;
  const g=DUPS[i];if(!g)return;
  const {error}=await sb.from('leads').update({dup_kept:true}).in('id',g.map(l=>l.id));
  if(error){toast('Keep failed. '+why(error));console.error(error);return;}
  DUPS.splice(i,1);
  toast('Kept');drawDups();
}
