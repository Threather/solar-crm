/* ---------------- COMMISSIONS ---------------- */
async function renderComm(){
  /* not on marketing's nav, so not reachable by typing the route either */
  if(ME.role==='marketing'){go('home');return;}
  $('main').innerHTML=SKEL;
  const {data:comms,error}=await sb.from('commissions')
    .select('*, leads(ref_id, customer_name, lead_financials(final_sale_usd))')
    .order('created_at',{ascending:false});
  if(error){$('main').innerHTML=blank('Could not load commissions','Check your connection and refresh. If it keeps happening, tell your admin.');return;}
  COMMS=comms||[];
  const isAdmin=ME.role==='admin';
  const mine=c=>c.profile_id===ME.id;
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Commissions</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Created automatically when a deal is marked Won. ${isAdmin?'Fill in amounts and mark paid.':'You see only your own.'}</p>
    <div class="toolbar"><button class="btn-line" onclick="exportComms()">Export CSV</button></div>
    ${!comms||!comms.length?blank('No commissions yet','A commission is created automatically for the sale engineer, the marketer and any referrer when a deal is won.'):`
    <div class="tablewrap"><table><thead><tr>
      <th>Ref ID</th><th>Deal</th><th>Sale value</th><th>Who</th><th>Type</th><th>Amount</th><th>Status</th>${isAdmin?'<th></th>':''}
    </tr></thead><tbody>`+comms.map(c=>`
      <tr><td class="refid">${esc(c.leads?.ref_id||'—')}</td>
        <td><b>${esc(c.leads?.customer_name||'?')}</b></td>
        <td>${fmtMoney(c.leads?.lead_financials?.final_sale_usd)}</td>
        <td>${c.beneficiary_type==='referrer'?esc(c.referrer_name||'External referrer'):esc(staffName(c.profile_id))}${mine(c)?' <span class="badge b-on">you</span>':''}</td>
        <td>${esc(c.beneficiary_type)}</td>
        <td>${isAdmin?`<input style="width:110px" type="number" step="0.01" value="${c.amount_usd??''}" onchange="setCommAmount('${c.id}',this.value)">`:fmtMoney(c.amount_usd)}</td>
        <td>${c.is_paid?`<span class="badge b-on">paid ${fmtDate(c.paid_at)}</span>`:`<span class="badge b-off">unpaid</span>`}</td>
        ${isAdmin?`<td>${c.is_paid?'':`<button class="btn-line" onclick="markPaid('${c.id}')">Mark paid</button>`}</td>`:''}
      </tr>`).join('')+`</tbody></table></div>`}`;
}
async function setCommAmount(id,val){
  const {error}=await sb.from('commissions').update({amount_usd:val||null}).eq('id',id);
  toast(error?'Update failed':'Amount saved');
}
async function markPaid(id){
  const {error}=await sb.from('commissions').update({is_paid:true,paid_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Failed');return;}toast('Marked paid');renderComm();
}

/* ---------------- USERS (admin) ---------------- */
async function renderUsers(){
  const {data:users}=await sb.from('profiles').select('*').order('created_at');
  $('main').innerHTML=`
    <h2 style="margin-bottom:10px">Users</h2>
    <div class="hint"><b>Adding a new user is a two-step job:</b><br>
      1. Supabase dashboard: Authentication → Users → Add user → email + temporary password.<br>
      2. Here: fill this form to give them a CRM profile, then send them the temp password privately.</div>
    <div style="background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px;max-width:720px;margin-bottom:18px">
      <div class="grid2">
        <div><label>Email (must exactly match the auth user)</label><input id="u-email"></div>
        <div><label>Staff ID</label><input id="u-staff" placeholder="e.g. ENG001"></div>
        <div><label>Full name</label><input id="u-name"></div>
        <div><label>Role</label><select id="u-role">
          <option value="marketing">marketing</option><option value="sales">sale engineer</option>
          <option value="site_engineer">site_engineer (installation)</option>
          <option value="finance">finance</option>
          <option value="manager">manager</option><option value="admin">admin</option></select></div>
      </div>
      <div class="modal-actions"><button class="btn-sun" onclick="createProfile()">Create profile</button></div>
    </div>
    <div class="tablewrap"><table><thead><tr>
      <th>Name</th><th>Email</th><th>Staff ID</th><th>Role</th><th>Joined</th><th>Status</th><th></th>
    </tr></thead><tbody>`+(users||[]).map(u=>`
      <tr><td><b>${esc(u.full_name)}</b></td><td>${esc(u.email)}</td><td>${esc(u.staff_id)}</td><td>${esc(u.role)}</td>
      <td><input type="date" style="min-width:140px" value="${u.joined_date||''}" onchange="setJoined('${u.id}',this.value)" title="Drives the 90-day probation rate on the incentive"></td>
      <td>${u.is_active?'<span class="badge b-on">active</span>':'<span class="badge b-off">inactive</span>'}</td>
      <td>${u.id===ME.id?'':`<button class="btn-line" onclick="toggleUser('${u.id}',${!u.is_active})">${u.is_active?'Deactivate':'Reactivate'}</button>`}</td>
      </tr>`).join('')+`</tbody></table></div>`;
}
async function createProfile(){
  const email=$('u-email').value.trim().toLowerCase();
  const staff=$('u-staff').value.trim(),name=$('u-name').value.trim(),role=$('u-role').value;
  if(!email||!staff||!name){toast('All fields are required');return;}
  const {error}=await sb.rpc('admin_create_profile',{p_email:email,p_staff_id:staff,p_full_name:name,p_role:role});
  if(error){toast(error.message.includes('not found')?'No auth user with that email. Do step 1 first.':'Create failed');console.error(error);return;}
  toast('Profile created');renderUsers();
}
/* the joining date is what puts somebody on the probation rate, so it is
   editable here rather than only at creation */
async function setJoined(id,v){
  const {error}=await sb.from('profiles').update({joined_date:v||null}).eq('id',id);
  if(error){toast('Could not save the date. '+why(error));console.error(error);return;}
  toast('Joining date saved');
}
async function toggleUser(id,active){
  const {error}=await sb.from('profiles').update({is_active:active}).eq('id',id);
  if(error){toast('Failed');return;}toast(active?'User reactivated':'User deactivated');renderUsers();
}
