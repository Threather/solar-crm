/* ---------------- LEAD DETAIL ---------------- */
async function openLead(id){
  const [{data:l,error},{data:acts},{data:quots},{data:fin}]=await Promise.all([
    sb.from('leads').select('*').eq('id',id).single(),
    sb.from('lead_activities').select('*').eq('lead_id',id).order('created_at',{ascending:false}),
    sb.from('quotations').select('*').eq('lead_id',id).order('created_at',{ascending:false}),
    /* returns nothing at all for marketing and the site engineer — the
       database refuses the row, the interface is not what hides it */
    sb.from('lead_financials').select('final_sale_usd').eq('lead_id',id).maybeSingle()
  ]);
  if(error||!l){toast('Could not open lead');return;}
  /* a customer's other deals, so neither end of an expansion looks like a
     duplicate lead somebody forgot to close */
  const [{data:parent},{data:children}]=await Promise.all([
    l.parent_lead_id
      ? sb.from('leads').select('id,ref_id,customer_name,stage_entered_at').eq('id',l.parent_lead_id).maybeSingle()
      : Promise.resolve({data:null}),
    sb.from('leads').select('id,ref_id,stage_code').eq('parent_lead_id',id).eq('is_deleted',false)
  ]);
  const isAdmin=ME.role==='admin';
  const isSales=ME.role==='sales'&&l.assigned_to===ME.id;
  /* marketing owns their own leads, plus anything still in an early stage */
  const isMkt=ME.role==='marketing'&&(l.created_by===ME.id||EARLY_STAGES.includes(l.stage_code));
  const isSiteEng=ME.role==='site_engineer'&&l.site_engineer_id===ME.id;
  const canAssign=isAdmin||ME.role==='manager';
  /* sales and engineering are one role now, so the owner does the key-in too */
  const canEng=isAdmin||isSales;
  /* Each role gets its own part of the lead and nothing else. The
     specification box belongs to whoever builds and prices a system, so
     marketing, finance and the site engineer do not see it — the site
     engineer reads BOQ and the map link from their own Installation box,
     which carries both already. */
  const seeEng=['sales','manager','admin'].includes(ME.role);
  /* installation belongs to the site engineer and the roles that hand work
     to them. Finance read the delivery confirmation on their own screen. */
  const seeInstall=['sales','manager','admin','site_engineer'].includes(ME.role);
  /* stage, follow-up and remarks are the day-to-day, open to whoever works the lead */
  const canSales=isAdmin||ME.role==='manager'||isSales||isMkt;
  /* customer identity is marketing's to keep. Sales get one pass at it, then it
     locks; admin can reopen it. */
  const canCustomer=isAdmin||isMkt||(isSales&&!l.customer_locked);
  /* Marketing capture a phone number once. After that only admin can change
     it: a number quietly corrected is a lead that silently becomes a
     different customer, and the round-robin has already assigned it. */
  const canPhone=isAdmin||(isMkt&&!l.phone)||(isSales&&!l.customer_locked);
  const phoneLocked=isMkt&&!!l.phone;
  const custLocked=isSales&&l.customer_locked;
  /* matches quotations_insert: the salesperson on the lead, or admin */
  const canQuote=isAdmin||isSales;
  const canSite=isAdmin||isSiteEng;
  const canMoney=isAdmin||ME.role==='manager'||isSales;
  const contacted=(acts||[]).filter(a=>['call','note','stage_change'].includes(a.activity_type)).length;
  /* what sales asks first: how old, how stale, what was quoted, what was said */
  LEADQUOTS=quots||[];
  const lastQuot=(quots||[])[0];
  /* newest first, by the day the contact happened rather than the day it was typed */
  const allRemarks=(acts||[]).filter(a=>a.note).sort((x,y)=>remarkDate(y).localeCompare(remarkDate(x)));
  const recentNotes=allRemarks.slice(0,3);
  const canEditAny=canSales||canEng||canSite||canAssign;

  /* someone who cannot see the sale value must not be able to close a deal
     either, or they hit the "enter the final sale value" guard with no field
     to fill it in */
  const stageList=canMoney?STAGES:STAGES.filter(s=>!TERMINAL.includes(s.stage_code)||s.stage_code===l.stage_code);
  const stgOpts=stageList.map(s=>opt(s.stage_code,l.stage_code).replace(`>${esc(s.stage_code)}<`,`>${esc(s.stage_name)}<`)).join('');
  /* assignment dropdowns: always include current assignee even if role changed (bug fix) */
  const salesPeople=STAFF.filter(s=>(s.role==='sales'&&s.is_active)||s.id===l.assigned_to);
  const salesOpts=`<option value="">Pool (unassigned)</option>`+salesPeople.map(s=>`<option value="${s.id}" ${s.id===l.assigned_to?'selected':''}>${esc(s.full_name)}</option>`).join('');
  const PV=l.province||l.city_province||'Phnom Penh';

  /* Marketing owns customer identity, not where the deal has got to. They get
     their own date and the remark box and nothing else: no stage, no sales
     follow-up, no BOQ, no close date, no lost reason. */
  const mktWorkHtml=`<div class="section sec-sales"><h4>Working</h4>
      <div class="grid2">
        <div><label>Marketing follow-up</label><input id="d-mktfollow" type="date" value="${l.mkt_follow_up_date||''}" title="Marketing's own date, separate from the sales follow-up"></div>
      </div>
      <label style="margin-top:10px;display:block">Add remark</label>
      <div class="noterow">
        <input id="d-notedate" type="date" value="${localDay(new Date())}" title="The day it happened">
        <textarea id="d-note" rows="2" placeholder="What happened?"></textarea>
      </div>
    </div>`;
  /* each role opens on the part of the lead that is theirs to fill in */
  const workHtml=isMkt?mktWorkHtml:canSales?`<div class="section sec-sales"><h4>Working</h4>
      <div class="grid2">
        <div><label>Stage</label><select id="d-stage">${stgOpts}</select></div>
        <div><label>Next follow-up</label><input id="d-follow" type="date" value="${l.next_follow_up||''}"></div>
        ${canMoney?`<div id="d-salewrap" style="display:${(l.stage_code===WON||fin?.final_sale_usd!=null)?'block':'none'}">
          <label>Final sale value (USD)</label><input id="d-sale" type="number" step="0.01" value="${fin?.final_sale_usd??''}"></div>`:''}
        ${seeEng?`<div><label>BOQ release</label><select id="d-boq" ${canEng?'':'disabled'}>${optList(BOQ_STATUS,l.boq_status)}</select></div>
        <div><label>BOQ date</label><input id="d-boqdate" type="date" value="${l.boq_date||''}" ${canEng?'':'disabled'}></div>
        <div><label>Estimated close date</label><input id="d-closedate" type="date" value="${l.expected_close_date||''}" ${canEng?'':'disabled'} title="Optional. When you expect this to be signed — usually set once the quotation has gone out."></div>`:''}
        ${l.stage_code===LOST?`<div><label>Why it was lost</label><select id="d-lostreason" ${canSales?'':'disabled'}>${optList(LOST_REASONS,l.lost_reason)}</select></div>
        <div style="grid-column:2/-1"><label>Detail</label><input id="d-lostnote" value="${esc(l.lost_note||'')}" placeholder="Anything worth remembering" ${canSales?'':'disabled'}></div>`:''}
        ${(isMkt||isAdmin||ME.role==='manager')?`<div><label>Marketing follow-up</label><input id="d-mktfollow" type="date" value="${l.mkt_follow_up_date||''}" ${(isMkt||isAdmin)?'':'disabled'} title="Marketing's own date, separate from the sales follow-up"></div>`:''}
      </div>
      <label style="margin-top:10px;display:block">Add remark</label>
      <div class="noterow">
        <input id="d-notedate" type="date" value="${localDay(new Date())}" title="The day it happened">
        <textarea id="d-note" rows="2" placeholder="What happened?"></textarea>
      </div>
    </div>`:'';
  /* the contact log stays, the money in it does not. The app writes the
     quotation price into a remark and anyone can type one into a note, so any
     figure is masked for the roles that see no money: marketing, and the site
     engineer, who reads the specification but never the price. */
  const hideMoney=['marketing','site_engineer'].includes(ME.role);
  const noteFor=n=>hideMoney?String(n||'').replace(/\$\s?[\d,]+(?:\.\d+)?/g,'$—'):n;
  const remarkHtml=recentNotes.length?`<div class="recent"><h4>Remarks (${allRemarks.length})</h4>${recentNotes.map(a=>`
      <div class="r-item"><div class="r-meta">${fmtDate(remarkDate(a))} · ${esc(staffName(a.actor_id))}</div>
      <div class="r-note">${esc(noteFor(a.note))}</div></div>`).join('')}
      ${(allRemarks.length>recentNotes.length&&!isMkt)?`<span class="days">${allRemarks.length-recentNotes.length} more in the history below</span>`:''}</div>`:'';
  const custHtml=`<div class="section sec-cust"><h4>Customer${custLocked?' · locked':''}</h4>
      ${custLocked?'<p class="lockmsg">Already corrected once. Ask an admin to reopen it.</p>':''}
      <div class="grid2">
        <div><label>Customer name</label><input id="d-name" value="${esc(l.customer_name||'')}" ${canCustomer?'':'disabled'}></div>
        <div><label>Customer type</label><select id="d-ctype" ${canCustomer?'':'disabled'}>${optList(CUSTOMER_TYPES,l.customer_type)}</select></div>
        <div><label>Phone${phoneLocked?' · captured':''}</label><input id="d-phone" value="${esc(l.phone||'')}" placeholder="Not captured yet" ${canPhone?'':'disabled'}${phoneLocked?' title="Already captured. Ask an admin to change it."':''}></div>
        ${isMkt?'':`<div><label>Qualification</label><input value="${qualText(l)}" disabled title="Follows the stage. Qualified from Telling Price onwards."></div>`}
        <div><label>Assigned sale engineer</label><select id="d-assign" ${canAssign?'':'disabled'}>${salesOpts}</select></div>
        <div><label>Channel</label><input value="${esc(l.lead_channel||l.lead_source||'—')}${l.lead_sub_channel?' / '+esc(l.lead_sub_channel):''}" disabled></div>
        ${(l.referrer_name&&!isMkt)?`<div><label>Referrer</label><input value="${esc(l.referrer_name)} ${esc(l.referrer_phone||'')}" disabled></div>`:''}
        ${isAdmin&&l.customer_locked?`<div><label>Customer lock</label><button class="btn-line" onclick="unlockCustomer('${l.id}')">Reopen for sales</button></div>`:''}
      </div>
    </div>

    <div class="section sec-addr"><h4>Site</h4>
      <div class="grid2">
        <div style="grid-column:1/-1"><label>Address</label><input id="d-addr" value="${esc(l.site_address||'')}" ${canCustomer?'':'disabled'}></div>
        <div><label>Province / City</label><select id="d-prov" onchange="dProv()" ${canCustomer?'':'disabled'}>${optList(PROVINCES,PV,false)}</select></div>
        <div><label>District</label><select id="d-district" onchange="dDist()" ${canCustomer?'':'disabled'}>${optList(Object.keys(GEO[PV]||{}),l.district)}</select></div>
        <div><label>Commune</label><select id="d-commune" ${canCustomer?'':'disabled'}>${optList(((GEO[PV]||{})[l.district])||[],l.commune)}</select></div>
        <div><label>Type of site</label><input id="d-sitetype" value="${esc(l.site_type||'')}" ${canCustomer?'':'disabled'}></div>
        <div><label>Monthly bill (USD)</label><input id="d-bill" type="number" step="0.01" value="${l.monthly_bill_usd??''}" ${canCustomer?'':'disabled'}></div>
      </div>
    </div>`;
  const custFirst=ME.role==='marketing';
  /* Working comes first for whoever can quote — stage, follow-up and the
     remark box are the daily touch — and the key-in box sits directly under
     it, above customer and site. For everyone else the key-in box is
     reference and stays at the bottom. */
  const engFirst=canQuote;
  const engHtml=seeEng?`<div class="section sec-eng"><h4>Sale Engineer key-in ${l.assigned_to?('· '+esc(staffName(l.assigned_to))):''}</h4>
      <div class="grid3">
        <div><label>Roof type</label><select id="d-roof" ${canEng?'':'disabled'}>${optList(ROOF_TYPES,l.roof_type)}</select></div>
        <div><label>System type</label><select id="d-sys" ${canEng?'':'disabled'}>${optList(SYSTEM_TYPES,l.system_type)}</select></div>
        <div><label>Ampere &amp; phase</label><select id="d-phase" ${canEng?'':'disabled'}>${optList(PHASE_TYPES,l.phase_type)}</select></div>
        <div><label>Panel brand</label><select id="d-pbrand" ${canEng?'':'disabled'}>${optList(PANEL_BRANDS,l.panel_brand)}</select></div>
        <div><label>Panel watt (W)</label><input id="d-pwatt" type="number" step="1" value="${l.panel_watt??''}" oninput="dKwp()" ${canEng?'':'disabled'}></div>
        <div><label>Panel (pcs)</label><input id="d-pcs" type="number" step="1" value="${l.panel_pcs??''}" oninput="dKwp()" ${canEng?'':'disabled'}></div>
        <div><label>Panel (kWp), auto</label><input id="d-kwp" type="number" step="0.01" value="${l.panel_kwp??''}" readonly title="watt × pcs ÷ 1000"></div>
        <div><label>Inverter brand</label><select id="d-ibrand" ${canEng?'':'disabled'}>${optList(INVERTER_BRANDS,l.inverter_brand)}</select></div>
        <div><label>Inverter (kW each)</label><input id="d-inv" type="number" step="0.01" value="${l.inverter_kw??''}" ${canEng?'':'disabled'}></div>
        <div><label>Inverter (pcs)</label><input id="d-ipcs" type="number" step="1" value="${l.inverter_pcs??''}" ${canEng?'':'disabled'}></div>
        <div><label>Battery brand</label><select id="d-bbrand" ${canEng?'':'disabled'}>${optList(BATTERY_BRANDS,l.battery_brand)}</select></div>
        <div><label>Battery (kWh each)</label><input id="d-beach" type="number" step="0.01" value="${l.battery_kwh_each??''}" oninput="dBatt()" ${canEng?'':'disabled'}></div>
        <div><label>Battery (pcs)</label><input id="d-bpcs" type="number" step="1" value="${l.battery_pcs??''}" oninput="dBatt()" ${canEng?'':'disabled'}></div>
        <div><label>Battery total (kWh), auto</label><input id="d-batt" value="${esc(l.battery_kwh||'')}" readonly title="kWh each x pcs"></div>
        <div style="grid-column:1/-1"><label>Location link to the house</label><input id="d-sitelink" type="url" placeholder="https://maps.app.goo.gl/…" value="${esc(l.site_link||'')}" ${canEng?'':'disabled'} title="The sale engineer pastes the map link here; the site engineer uses it to find the house"></div>
      </div>
      <div id="d-kit" class="kit"></div>

      ${canQuote?`<div class="quotbar">
        <div><label>Price (USD)</label><input id="q-price" type="number" step="0.01" placeholder="Price for this option"></div>
        <button class="btn-sun" onclick="addQuot('${l.id}')" title="Saves the specification above as a quotation, priced">Save as quotation</button>
      </div>`:''}

      <div class="quothead">Quotations (<span id="quot-n">${(quots||[]).length}</span>)</div>
      <div id="quot-list">${(quots||[]).map(q=>quotCard(q,l.id,canEng,quotInUse(q,l,fin))).join('')
        ||'<p class="quot-none">No quotations yet.</p>'}</div>
    </div>`:'';

  $('lead-modal').innerHTML=`
    <h2>${esc(l.customer_name)} <span class="refid">${esc(isMkt?'':(l.ref_id||''))}</span></h2>
    <div class="sub">${esc(l.phone||'no phone yet')} · ${esc(l.customer_type||'')} · created ${fmtDate(l.created_at)} by ${esc(staffName(l.created_by))} · contacted ${contacted}×</div>
    ${parent?`<div class="hint" style="border-left-color:var(--own-eng);color:var(--own-eng)">
      Expansion of <span class="rowlink" style="cursor:pointer;text-decoration:underline" onclick="openLead('${parent.id}')">${esc(parent.ref_id||'the earlier deal')}</span>, won ${fmtDate(parent.stage_entered_at)}. That deal keeps its own value and history.
    </div>`:''}
    ${(children||[]).length?`<div class="hint" style="border-left-color:var(--own-eng);color:var(--own-eng)">
      ${children.length} later deal${children.length>1?'s':''} for this customer:
      ${children.map(c=>`<span class="rowlink" style="cursor:pointer;text-decoration:underline" onclick="openLead('${c.id}')">${esc(c.ref_id||'no ref yet')}</span>`).join(' · ')}
    </div>`:''}

    <div class="leadbar">
      <div class="facts">${isSiteEng?`
        <span>delivery <b>${l.delivery_date?fmtDate(l.delivery_date):'not set'}</b></span>
        <span>install <b>${l.installation_start?fmtDate(l.installation_start):'not set'}</b></span>
        <span>BOQ <b>${esc(l.boq_status||'not set')}</b></span>`:isMkt?`
        <span><b>${daysIn(l.created_at)}d</b> old</span>`:`
        <span><b>${daysIn(l.created_at)}d</b> old</span>
        <span><b>${daysIn(l.stage_entered_at)}d</b> in stage</span>
        <span>follow-up <b>${l.next_follow_up?fmtDate(l.next_follow_up):'—'}</b></span>
        ${fin?.final_sale_usd!=null
          ?`<span>using <b>${fmtMoney(fin.final_sale_usd)}</b></span>`
          :`<span>latest quote <b>${lastQuot?fmtMoney(lastQuot.price_usd):'none'}</b></span>`}`}
      </div>
      <div class="barbtns">
        ${canEditAny?`<span class="switch" id="lockbtn" role="switch" aria-checked="false" onclick="toggleLock()" title="Slide to edit, slide back to save"><i></i></span>`:''}
        <button class="btn-line" onclick="closeLead()">Close</button>
      </div>
    </div>

    <div class="tabs">
      <button id="tab-b-detail" class="on" onclick="leadTab('detail')">Details</button>
      ${isMkt?'':`<button id="tab-b-hist" onclick="leadTab('hist')">History (${(acts||[]).length})</button>`}
    </div>

    <div id="tab-detail">
    ${isSiteEng?siteBox(l,canSite,true,isAdmin):''}

    ${custFirst?custHtml:''}

    ${workHtml}

    ${engFirst?engHtml:''}

    ${remarkHtml}

    ${custFirst?'':custHtml}

    ${engFirst?'':engHtml}

    ${(l.stage_code===WON&&!isSiteEng&&seeInstall)?siteBox(l,canSite,false,isAdmin):''}

    ${(l.stage_code===WON&&(canQuote||ME.role==='manager'))?`<div class="modal-actions">
      <button class="btn-line" onclick="newDealFrom('${l.id}')" title="Start a second deal for this customer — more panels, a battery — with their details and current system already filled in">New deal for this customer</button>
    </div>`:''}

    ${isAdmin?`<div class="modal-actions"><button class="btn-danger" onclick="softDelete('${l.id}')">Delete lead</button></div>`:''}

    </div>

    <div id="tab-hist" style="display:none">
    <div class="timeline">${isMkt?'':(acts||[]).map(a=>`
      <div class="tl-item">
        <div class="t-head">${esc(a.activity_type==='stage_change'?`Stage: ${a.from_stage||'—'} → ${a.to_stage}`:a.activity_type)}</div>
        <div class="t-meta">${a.note_date?fmtDate(a.note_date)+' · ':''}${esc(staffName(a.actor_id))} · ${fmtDT(a.created_at)}</div>
        ${a.note?`<div class="t-note">${esc(noteFor(a.note))}</div>`:''}
      </div>`).join('')||blank('No history yet','Calls, notes and stage changes are recorded here as the lead moves.')}
    </div>
    </div>`;
  $('lead-overlay').classList.add('open');
  const stSel=$('d-stage');
  if(stSel)stSel.onchange=()=>{const w=$('d-salewrap');if(w)w.style.display=stSel.value===WON?'block':'none';};
  /* a lead opens read-only: one stray click must not move a stage */
  LEADSAVE={id:l.id,stage:l.stage_code,assign:l.assigned_to||'',eng:l.current_engineer_id||''};
  /* the brand and phase pickers have no oninput of their own, so the kit strip
     listens to the whole box rather than each field restating it */
  const eng=$('lead-modal').querySelector('.sec-eng');
  if(eng){eng.addEventListener('change',dKit);dKit();}
  markLockable();setLock(true);
}
/* everything openLead left enabled is what Edit unlocks and Lock puts back */
function markLockable(){
  document.querySelectorAll('#lead-modal input,#lead-modal select,#lead-modal textarea')
    .forEach(e=>{if(!e.disabled&&!e.readOnly){e.dataset.lockable='1';e.dataset.orig=e.value;}});
}
function setLock(on){
  LEADLOCK=on;
  document.querySelectorAll('#lead-modal [data-lockable]').forEach(e=>{e.disabled=on;});
  const b=$('lockbtn');
  if(b){b.classList.toggle('on',!on);b.setAttribute('aria-checked',String(!on));}
}
/* the switch is the whole control: slide it on to edit, slide it back to save */
function toggleLock(){
  if(LEADLOCK){setLock(false);return;}
  if(LEADSAVE)saveLead(LEADSAVE.id,LEADSAVE.stage,LEADSAVE.assign,LEADSAVE.eng,true);
  else setLock(true);
}
/* the log is a place you go to, not a thing you scroll past */
function leadTab(which){
  $('tab-detail').style.display=which==='detail'?'':'none';
  $('tab-hist').style.display=which==='hist'?'':'none';
  $('tab-b-detail').classList.toggle('on',which==='detail');
  $('tab-b-hist').classList.toggle('on',which==='hist');
}
function closeLead(){$('lead-overlay').classList.remove('open');}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('lead-overlay').classList.contains('open'))closeLead();
});
/* panel kWp = watt × pcs ÷ 1000 */
function kwp(w,p){const n=(Number(w)||0)*(Number(p)||0)/1000;return n?n.toFixed(2):'';}
function dKwp(){$('d-kwp').value=kwp($('d-pwatt').value,$('d-pcs').value);dKit();}
/* battery total is each x pcs, the same shape as the inverter */
function dBatt(){const n=(Number($('d-beach').value)||0)*(Number($('d-bpcs').value)||0);$('d-batt').value=n?n.toFixed(2):'';dKit();}
/* What is actually being sold, shown as it is keyed in. The part number is
   the same one the quotation document prints, so a wrong brand or a size
   nobody stocks is visible here rather than on a customer's sheet. */
function dKit(){
  const box=$('d-kit'); if(!box)return;
  const g=id=>{const e=$(id);return e?e.value:'';};
  const parts=[
    ['Panel',  panelModel(g('d-pbrand'),g('d-pwatt')),   g('d-pbrand'), g('d-pcs')],
    ['Inverter',inverterModel(g('d-ibrand'),g('d-inv'),g('d-phase')), g('d-ibrand'), g('d-ipcs')],
    ['Battery', batteryModel(g('d-bbrand'),g('d-beach')), g('d-bbrand'), g('d-bpcs')]
  ].filter(([,,brand])=>brand);
  if(!parts.length){box.innerHTML='';return;}
  box.innerHTML=parts.map(([kind,model,brand,pcs])=>{
    const img=imgFor(model);
    return `<div class="kit-item">
      <div class="kit-pic">${img?`<img src="${esc(img)}" alt="" onerror="this.remove()">`:''}</div>
      <div class="kit-txt"><b>${esc(model||brand)}</b>
        <span>${esc(kind)}${pcs?' · '+esc(pcs)+' pcs':''}${model?'':' · no part number'}</span></div>
    </div>`;}).join('');
}
/* inverters are quoted in kW each, so the total is a plain multiply */
function dProv(){
  const d=GEO[$('d-prov').value]||{};
  $('d-district').innerHTML=optList(Object.keys(d),'');
  dDist();
}
function dDist(){
  const list=(GEO[$('d-prov').value]||{})[$('d-district').value]||[];
  $('d-commune').innerHTML=optList(list,'');
}

async function saveLead(id,oldStage,oldAssign,oldEng,keepOpen){
  const canAssign=ME.role==='admin'||ME.role==='manager';
  const upd={};
  /* only what actually changed, or opening and closing a lead would write a
     row and an "edit" line into the history every time */
  const val=id2=>{const e=$(id2);
    if(!e||e.disabled)return undefined;
    if(e.dataset.orig!==undefined&&e.dataset.orig===e.value)return undefined;
    return e.value;};

  /* Every field is gated by whether openLead rendered its input enabled, so
     the permission rules live in one place instead of being restated here. */
  const m={customer_name:'d-name',customer_type:'d-ctype',phone:'d-phone',
           stage_code:'d-stage',next_follow_up:'d-follow',
           site_address:'d-addr',commune:'d-commune',district:'d-district',site_type:'d-sitetype',
           monthly_bill_usd:'d-bill',
           roof_type:'d-roof',system_type:'d-sys',phase_type:'d-phase',panel_pcs:'d-pcs',
           panel_watt:'d-pwatt',panel_brand:'d-pbrand',inverter_kw:'d-inv',inverter_pcs:'d-ipcs',
           inverter_brand:'d-ibrand',
           battery_brand:'d-bbrand',battery_pcs:'d-bpcs',battery_kwh_each:'d-beach',
           site_link:'d-sitelink',
           delivery_date:'d-deliv',installation_start:'d-cstart',installation_end:'d-cend',
           installation_team:'d-team',site_notes:'d-sitenotes',
           service_checkup_date:'d-svchk',service_clean_date:'d-svclean',
           service_general_note:'d-svgen',service_technical_note:'d-svtech',
           service_other_note:'d-svother',
           boq_status:'d-boq',boq_date:'d-boqdate',
           expected_close_date:'d-closedate',mkt_follow_up_date:'d-mktfollow',
           lost_reason:'d-lostreason',lost_note:'d-lostnote'};
  for(const k in m){const v=val(m[k]);if(v!==undefined)upd[k]=v.trim()||null;}
  const pv=val('d-prov'); if(pv!==undefined){upd.province=pv||null;upd.city_province=pv||null;}
  /* panel kWp is derived, and its input is readonly so val() skips it */
  const kw=$('d-kwp'); if(kw&&$('d-pwatt')&&!$('d-pwatt').disabled)upd.panel_kwp=kw.value||null;
  const bt=$('d-batt'); if(bt&&$('d-beach')&&!$('d-beach').disabled)upd.battery_kwh=bt.value||null;
  /* the inverter total has no box any more, but EDC still needs the number */
  if(upd.inverter_kw!==undefined||upd.inverter_pcs!==undefined){
    const t=(Number(upd.inverter_kw??0)||0)*(Number(upd.inverter_pcs??0)||0);
    upd.inverter_kw_total=t||null;
  }
  /* sales get one pass at the customer box, and it only closes behind them if
     they actually changed something in it */
  const custKeys=['customer_name','customer_type','phone','site_address','province',
                  'commune','district','site_type','monthly_bill_usd'];
  if(ME.role==='sales'&&custKeys.some(k=>upd[k]!==undefined))upd.customer_locked=true;

  /* the sale value lives in its own table, which marketing and the site
     engineer have no read or write access to at all */
  const sale=val('d-sale');
  /* what is in the box now, not what changed. "Use this one" writes the sale
     value and re-renders, so val() reports no change and the Closed-Won guard
     below used to read that as no sale value at all. */
  const saleNow=$('d-sale')&&!$('d-sale').disabled?$('d-sale').value.trim():'';

  /* assignment: only write if actually changed (bug fix) */
  if(canAssign){
    const a=val('d-assign');
    if(a!==undefined&&a!==(oldAssign||'')){upd.assigned_to=a||null;upd.assigned_at=a?new Date().toISOString():null;}
  }
  /* the name is the one field that must never be blanked */
  if(upd.customer_name===null){toast('Customer name cannot be empty');return;}
  const newStage=upd.stage_code??oldStage;
  /* the reason is the whole point of the closed-lost analysis, so it is asked
     for at the moment the stage moves rather than left for someone to fill in
     later, which is to say never */
  if(newStage===LOST&&oldStage!==LOST&&!upd.lost_reason&&!$('d-lostreason')){
    const lines=['Why was this lost?','']
      .concat(LOST_REASONS.map((r,i)=>(i+1)+'. '+r))
      .concat(['','Type the number, or leave empty to record it later.']);
    const pick=prompt(lines.join('\n'));
    const n=Number(pick);
    if(n>=1&&n<=LOST_REASONS.length)upd.lost_reason=LOST_REASONS[n-1];
  }
  if(newStage===WON&&oldStage!==WON&&(!saleNow||Number(saleNow)<=0)){toast('Enter the final sale value before marking Closed-Won');return;}
  /* Done with no date is the state that breaks the operations report: BOQ
     turnaround is measured from this date, and the won list shows it. Read
     what is in the boxes now, not what changed, so a date already there
     counts and a status already Done still has to have one. */
  const boqNow=$('d-boq')&&!$('d-boq').disabled?$('d-boq').value:null;
  const boqDateNow=$('d-boqdate')&&!$('d-boqdate').disabled?$('d-boqdate').value.trim():null;
  if(boqNow==='Done'&&boqDateNow===''){toast('Set the BOQ date when BOQ release is Done');return;}
  if(!Object.keys(upd).length&&sale===undefined&&!($('d-note')&&$('d-note').value.trim())){setLock(true);return;}

  if(Object.keys(upd).length){
    const {error}=await sb.from('leads').update(upd).eq('id',id);
    if(error){toast('Save failed. '+why(error));console.error(error);return;}
  }
  if(sale!==undefined){
    const {error}=await sb.from('lead_financials')
      .upsert({lead_id:id,final_sale_usd:sale||null,updated_by:ME.id,updated_at:new Date().toISOString()},{onConflict:'lead_id'});
    if(error){toast('Saved, but the sale value did not');console.error(error);return;}
  }
  const note=$('d-note')?$('d-note').value.trim():'';
  const nd=$('d-notedate')?$('d-notedate').value:'';
  if(upd.stage_code&&upd.stage_code!==oldStage)await logActivity(id,'stage_change',oldStage,upd.stage_code,note||null,nd);
  else if(note)await logActivity(id,'note',null,null,note,nd);
  else await logActivity(id,'edit',null,null,null);

  if(newStage===WON&&oldStage!==WON){
    const who=$('d-name')?$('d-name').value:'a customer';
    await notify('won',id,`Deal won: ${who}, by ${staffName(ME.id)}`);
  }
  toast(newStage===WON&&oldStage!==WON?'Saved. Commissions created for this deal.'
       :upd.stage_code==='telling_price'&&oldStage!=='telling_price'?'Saved. This lead is now qualified.'
       :'Saved');
  /* saving is not leaving: the lead stays open, locked, showing what was saved */
  go(VIEW);
  if(keepOpen)openLead(id); else closeLead();
}
/* admin reopening the customer box after sales used their one pass */
async function unlockCustomer(id){
  const {error}=await sb.from('leads').update({customer_locked:false}).eq('id',id);
  if(error){toast('Could not reopen it');console.error(error);return;}
  await logActivity(id,'edit',null,null,'Customer details reopened for sales');
  toast('Customer details reopened');closeLead();go(VIEW);
}
async function softDelete(id){
  if(!confirm('Delete this lead? It disappears from the CRM but stays in the database.'))return;
  const {error}=await sb.from('leads').update({is_deleted:true,deleted_at:new Date().toISOString(),deleted_by:ME.id}).eq('id',id);
  if(error){toast('Delete failed');return;}
  await logActivity(id,'soft_delete',null,null,null);
  toast('Lead deleted');closeLead();go('leads');
}
async function logActivity(leadId,type,from,to,note,noteDate){
  await sb.from('lead_activities').insert({lead_id:leadId,actor_id:ME.id,activity_type:type,
    from_stage:from,to_stage:to,note,note_date:note?(noteDate||localDay(new Date())):null});
}

/* ---------------- QUOTATIONS ----------------
   The specification is keyed in once, in the box above. A quotation is that
   specification plus a price, so releasing one is a price and a button —
   there is no second copy of the fourteen fields to fill in. */
/* A customer who came back. A year on they want more panels or a battery, and
   the two bad options were reopening the won deal — which would overwrite its
   sale value, its EDC dates and its payment history — or retyping everything
   including the system already on their roof. This is the pattern every CRM
   settles on: a second deal on the same customer, never an edit of the first.

   The new lead carries the system as it stands today. The sale engineer edits
   it up to the total after expansion, because EDC bands are worked on total
   inverter kWac — a 10 kW customer adding 5 kW crosses onto the longer form. */
async function newDealFrom(leadId){
  const {data:l,error:le}=await sb.from('leads').select('*').eq('id',leadId).single();
  if(le||!l){toast('Could not read that lead. '+why(le));return;}
  const msg=['Start a new deal for '+(l.customer_name||'this customer')+'?','',
    'Their details, site and the system installed today are copied across.',
    'This deal stays exactly as it is - its sale value, EDC dates and payments are untouched.','',
    'Key in the system as it will be AFTER the expansion, not just what is being added:',
    'EDC decides which form applies on the total inverter size.'].join('\n');
  if(!confirm(msg))return;
  const copy={
    customer_name:l.customer_name,phone:l.phone,customer_type:l.customer_type,
    monthly_bill_usd:l.monthly_bill_usd,
    site_address:l.site_address,commune:l.commune,district:l.district,
    province:l.province,city_province:l.city_province,site_type:l.site_type,
    site_link:l.site_link,
    /* the system as it stands, to be edited up to the total after expansion */
    roof_type:l.roof_type,system_type:l.system_type,phase_type:l.phase_type,
    panel_brand:l.panel_brand,panel_watt:l.panel_watt,panel_pcs:l.panel_pcs,panel_kwp:l.panel_kwp,
    inverter_brand:l.inverter_brand,inverter_kw:l.inverter_kw,inverter_pcs:l.inverter_pcs,
    inverter_kw_total:l.inverter_kw_total,
    battery_brand:l.battery_brand,battery_kwh_each:l.battery_kwh_each,
    battery_pcs:l.battery_pcs,battery_kwh:l.battery_kwh,
    /* the person who sold the first system keeps the relationship */
    assigned_to:l.assigned_to,assigned_at:l.assigned_to?new Date().toISOString():null,
    site_engineer_id:l.site_engineer_id,
    lead_channel:'Existing_Customer',lead_sub_channel:'Expansion',
    parent_lead_id:l.id,created_by:ME.id
  };
  const {data:made,error}=await sb.from('leads').insert(copy).select().single();
  if(error){toast('Could not create it. '+why(error));console.error(error);return;}
  await logActivity(made.id,'note',null,null,
    'Expansion of '+(l.ref_id||'an earlier deal')+', which was won on '+fmtDate(l.stage_entered_at));
  await logActivity(l.id,'note',null,null,'A new deal was opened for this customer');
  toast('New deal created for '+(l.customer_name||'this customer'));
  openLead(made.id);
}
/* Which option the lead is actually following. `chosen_quotation_id` records
   it outright (added 21 Aug 2026), so two options at the same price with the
   same specification no longer both read as chosen. Leads picked before the
   column existed fall back to matching the price and the specification. */
function quotInUse(q,l,fin){
  if(l.chosen_quotation_id)return l.chosen_quotation_id===q.id;
  if(!fin||fin.final_sale_usd==null)return false;
  if(Number(fin.final_sale_usd)!==Number(q.price_usd))return false;
  return q.panel_pcs==null||Number(q.panel_pcs)===Number(l.panel_pcs);
}
function quotCard(q,leadId,canUse,inUse){
  return `<div class="qcard${inUse?' qcard-on':''}"><b>${fmtMoney(q.price_usd)}</b> · ${esc(q.system_type||'—')} · ${q.panel_pcs??'—'} pcs ${esc(q.panel_brand||'')} · inv ${q.inverter_pcs??'—'} × ${q.inverter_kw??'—'}kW ${esc(q.inverter_brand||'')} · batt ${esc(q.battery_kwh||'—')} ${esc(q.battery_brand||'')}
    <span class="days">${esc(q.ampere_phase||'')} · released ${fmtDate(q.released_date||q.created_at)} by ${esc(staffName(q.provided_by))}</span>
    ${inUse?'<span class="qtag">In use</span>':''}
    <div class="acts">
      <button class="btn-mini" onclick="printQuote('${q.id}','${leadId}')">Quotation document</button>
      ${(canUse&&!inUse)?`<button class="btn-mini" onclick="useQuot('${q.id}','${leadId}')" title="Copy this option's specification onto the lead, so EDC, installation and the export all follow it">Use this one</button>`:''}
    </div></div>`;
}
async function addQuot(leadId){
  const price=$('q-price').value;
  if(!price){toast('Price is required');return;}
  const g=id=>{const e=$(id);return e?e.value:'';};
  /* the quotation keeps its own copy of the numbers, so an option still says
     what it was quoted with even if the lead changes afterwards */
  const {data,error}=await sb.from('quotations').insert({
    lead_id:leadId,provided_by:ME.id,price_usd:price,
    roof_type:g('d-roof')||null,
    system_type:g('d-sys')||null,ampere_phase:g('d-phase')||null,
    panel_pcs:g('d-pcs')||null,panel_brand:g('d-pbrand')||null,
    panel_watt:g('d-pwatt')||null,panel_kwp:g('d-kwp')||null,
    inverter_kw:g('d-inv')||null,inverter_brand:g('d-ibrand')||null,
    inverter_pcs:g('d-ipcs')||null,
    inverter_kw_total:(Number(g('d-inv')||0)*Number(g('d-ipcs')||0))||null,
    battery_pcs:g('d-bpcs')||null,battery_kwh_each:g('d-beach')||null,
    battery_kwh:g('d-batt').trim()||null,battery_brand:g('d-bbrand')||null
  }).select().single();
  if(error){toast('Could not save quotation. '+why(error));console.error(error);return;}
  await logActivity(leadId,'note',null,null,'Quotation released: $'+price);
  /* the card goes in where it stands. Re-rendering the lead here would throw
     away specification edits not yet saved, which is the whole point of
     keying in and quoting in the one box. */
  LEADQUOTS=[data,...(LEADQUOTS||[])];
  const list=$('quot-list');
  if(list){
    const none=list.querySelector('.quot-none');if(none)none.remove();
    list.insertAdjacentHTML('afterbegin',quotCard(data,leadId,true,false));
  }
  const n=$('quot-n');if(n)n.textContent=LEADQUOTS.length;
  $('q-price').value='';
  toast('Quotation saved');
}
/* Which option is real. The lead carries the specification that EDC, the
   installation screen and the CSV all read, so with several options saved,
   this is what says which one the customer took. */
async function useQuot(quotId,leadId){
  const q=(LEADQUOTS||[]).find(x=>x.id===quotId);
  if(!q){toast('Could not find that quotation');return;}
  if(!confirm('Use the '+fmtMoney(q.price_usd)+' option as this lead\'s specification?\n\n'
    +'EDC, installation and the export all read the lead, so they will follow this one.\n'
    +'The final sale value is set to '+fmtMoney(q.price_usd)+' as well, and stays editable.'))return;
  const {error}=await sb.from('leads').update({
    chosen_quotation_id:q.id,
    roof_type:q.roof_type,system_type:q.system_type,phase_type:q.ampere_phase,
    panel_brand:q.panel_brand,panel_watt:q.panel_watt,panel_pcs:q.panel_pcs,panel_kwp:q.panel_kwp,
    inverter_brand:q.inverter_brand,inverter_kw:q.inverter_kw,inverter_pcs:q.inverter_pcs,
    inverter_kw_total:q.inverter_kw_total,
    battery_brand:q.battery_brand,battery_pcs:q.battery_pcs,
    battery_kwh_each:q.battery_kwh_each,battery_kwh:q.battery_kwh
  }).eq('id',leadId);
  if(error){toast('Could not apply it. '+why(error));console.error(error);return;}
  /* the option the customer took is also what the deal is worth, so the sale
     value follows it rather than being typed again from the same number */
  const {error:fe}=await sb.from('lead_financials').upsert(
    {lead_id:leadId,final_sale_usd:q.price_usd,updated_by:ME.id,updated_at:new Date().toISOString()},
    {onConflict:'lead_id'});
  if(fe)console.error(fe);
  await logActivity(leadId,'edit',null,null,
    'Lead specification and sale value set from the '+fmtMoney(q.price_usd)+' quotation');
  toast(fe?'Specification set, but the sale value did not save':'This lead now follows that option');

  /* Update in place rather than re-opening the lead. A re-render reads the
     database back, and the lock switch is the save — so anything typed and
     not yet saved (a stage moved to Closed-Won, a follow-up date, a remark
     half written) would be silently thrown away. Same reason addQuot inserts
     its card by hand instead of calling openLead. */
  const put=(id,v)=>{const e=$(id);if(!e)return;e.value=v??'';if(e.dataset.orig!==undefined)e.dataset.orig=e.value;};
  put('d-roof',q.roof_type);put('d-sys',q.system_type);put('d-phase',q.ampere_phase);
  put('d-pbrand',q.panel_brand);put('d-pwatt',q.panel_watt);put('d-pcs',q.panel_pcs);
  put('d-ibrand',q.inverter_brand);put('d-inv',q.inverter_kw);put('d-ipcs',q.inverter_pcs);
  put('d-bbrand',q.battery_brand);put('d-beach',q.battery_kwh_each);put('d-bpcs',q.battery_pcs);
  if($('d-pwatt'))dKwp();
  if($('d-beach'))dBatt();

  /* the sale value follows the option, and its box appears whether or not the
     stage has reached Closed-Won */
  if(!fe){
    put('d-sale',q.price_usd);
    const wrap=$('d-salewrap');if(wrap)wrap.style.display='block';
    const facts=document.querySelector('.leadbar .facts');
    if(facts){
      const spans=[...facts.querySelectorAll('span')];
      const cell=spans.find(x=>/latest quote|^using/i.test(x.textContent.trim()));
      if(cell)cell.innerHTML='using <b>'+esc(fmtMoney(q.price_usd))+'</b>';
    }
  }

  /* one card carries the marker, so the others get their button back */
  const list=$('quot-list');
  if(list)[...list.querySelectorAll('.qcard')].forEach((card,i)=>{
    const other=(LEADQUOTS||[])[i];
    if(!other)return;
    card.outerHTML=quotCard(other,leadId,true,other.id===q.id);
  });
}
