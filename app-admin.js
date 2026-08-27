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
