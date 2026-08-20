/* ============================================================
   SOLAR CRM — frontend v2 (Phase 1)
   ============================================================ */
const sb = supabase.createClient(CRM_CONFIG.SUPABASE_URL, CRM_CONFIG.SUPABASE_ANON_KEY);

let ME=null, STAGES=[], STAFF=[], LEADS=[], QUOTS=[], COMMS=[], VIEW='leads', LEADLOCK=true, LEADSAVE=null, LEADQUOTS=[], FINSCOPE='owing', EDCSCOPE='work';
/* the Leads tab shows only live work; won and lost have their own tabs */
let LEADSCOPE='active';
let FINROWS=[];
let FILTER={stage:'',q:'',qual:''};
let QFILTER={q:'',month:'',date:''};
/* local YYYY-MM-DD, so a late-evening lead in Cambodia isn't filed under tomorrow */
const localDay=d=>d?new Date(d).toLocaleDateString('sv'):'';
const monthName=m=>{const[y,mo]=m.split('-');return new Date(y,mo-1,1).toLocaleDateString('en-GB',{month:'short',year:'numeric'});};

/* Vocabularies from the client's Excel (Drop Down List sheet) */
const CHANNELS = {
  'Digital_Marketing': ['Facebook','Telegram','Tik Tok','Call','Walk-In'],
  'Third_Party':       ['Staff','Non-Staff'],
  'Direct_Sales':      [],   /* filled from the active sales staff at render time */
  'Offline_Marketing': ['Ground Activation']
};
const ROOF_TYPES = ['RC Roof/Awning','Zinc Roof','Tile Roof','Ground Mount','Other'];
const SYSTEM_TYPES = ['On-Grid','Hybrid','Off-Grid'];
const PHASE_TYPES = ['10A x 1P','20A x 1P','32A x 1P','63A x 1P','32A x 3P','40A x 3P','63A x 3P','100A x 3P'];
const CUSTOMER_TYPES = ['Residential','C & I'];
const PANEL_BRANDS = ['Jinko','LONGi','Trina','JA Solar','Canadian Solar','Other'];
const INVERTER_BRANDS = ['Deye','Growatt','Huawei','Sungrow','Solis','Other'];
const BATTERY_BRANDS = ['Deye','ANTI-DARK','BYD','Pylontech','Growatt','Other'];

/* Cambodia geography comes from geo.js (NCDD official gazetteer):
   25 provinces, every district, every commune. */
const GEO = CRM_GEO;
const PROVINCES = Object.keys(GEO);

const $=id=>document.getElementById(id);
/* a failed write should say what the database actually objected to, not
   leave someone guessing at a friendly sentence */
function why(e){
  if(!e)return '';
  const m=e.message||'';
  if(e.code==='42703')return 'A column is missing from the database.';
  if(e.code==='23505')return 'That already exists.';
  if(e.code==='42501'||/row-level security/i.test(m))return 'Your role is not allowed to do that.';
  return m.slice(0,90);
}
const esc=s=>(s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtMoney=v=>v==null||v===''?'—':'$'+Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const fmtDate=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const fmtDT=d=>d?new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const daysIn=d=>Math.floor((Date.now()-new Date(d).getTime())/86400000);
const staffName=id=>(STAFF.find(s=>s.id===id)||{}).full_name||'—';
const opt=(v,cur)=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(v)}</option>`;
const optList=(arr,cur,blank=true)=>(blank?`<option value="">—</option>`:'')+arr.map(v=>opt(v,cur)).join('');
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2600);}
/* a shape where the content will be, rather than the word "Loading" */
const SKEL=`<div class="skel"><i></i><i></i><i></i><i></i><i></i></div>`;
/* an empty list should say what would put something in it */
const blank=(title,why)=>`<div class="empty"><b>${title}</b><span>${why}</span></div>`;

/* warm pills; follow_up is deliberately coral and quotation_sent gold so
   the two neighbouring stages don't blur together in a long list */
const STAGE_COLORS={info_gathering:'#eae7dd|#5c574c',telling_price:'#dce6e9|#3d6376',
pending_quotation:'#e8dfea|#6c4f7b',quotation_sent:'#f5e7c4|#7d6015',follow_up:'#f9d5c7|#b04a2e',
agreement_signoff:'#dde4da|#4a6b4f',closed_won:'#d9e8dc|#2f6b41',closed_lost:'#f0ddd9|#a8412f'};
const TERMINAL=['closed_won','closed_lost'];
const WON='closed_won';
const LOST='closed_lost';
/* Qualification follows the stage: a lead is qualified from Quotation sent
   onwards, and moving it back makes it unqualified again. The one exception
   is a lost lead, where the current stage tells you nothing — there we fall
   back to the database column, which records whether it ever got that far. */
const QUALIFIED_STAGES=['telling_price','pending_quotation','quotation_sent','follow_up','agreement_signoff','closed_won'];
const INSTALL_TEAMS=['Team A','Team B','Team C','Team D'];
const CONTRACT_STATUS=['Not signed','Pending','Signed'];
const BOQ_STATUS=['Pending','Done'];
/* a follow-up lands on the same day of the month; February keeps the last day */
function addMonths(d,n){
  if(!d)return '';
  const [y,m,day]=d.split('-').map(Number);
  const t=new Date(y,m-1+n,1);
  const last=new Date(t.getFullYear(),t.getMonth()+1,0).getDate();
  t.setDate(Math.min(day,last));
  return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
}
/* sale values live in lead_financials, which only these roles can read —
   this just keeps the interface honest about it */
const canSeeMoney=()=>['admin','manager','sales'].includes(ME.role);
const canFinance=()=>['admin','finance'].includes(ME.role);

/* EDC paperwork. Which form applies is decided by the inverter's AC output,
   not by anyone choosing: 10 kWac or under takes the short form, above it
   takes the long one. Small systems may be installed before submitting;
   large ones must be submitted first. */
/* short header, then the official wording for the tooltip — nobody reads a
   nine-word column head twice, they learn the position */
const EDC_SMALL=[['edc_doc_date','Submitted','Document submission date'],
                 ['edc_inspection_date','Inspection','Inspection date']];
const EDC_LARGE=[['edc_portal_date','Submitted','Document submission date via web portal'],
                 ['edc_approval_date','Approval','EDC approval letter received date'],
                 ['edc_meter_date','Smart meter','Smart meter installation & grid connection date'],
                 ['edc_provincial_date','Provincial','EDC provincial inspection date'],
                 ['edc_pp_date','Phnom Penh','EDC Phnom Penh inspection date']];
const kwac=l=>(Number(l.inverter_kw||0)*Number(l.inverter_pcs||0))||Number(l.inverter_kw_total||0);
/* the EDC office the paperwork actually goes to. Admin picks it per deal. */
const EDC_BRANCHES=['អគ្គិសនីកម្ពុជា សាខាវត្តភ្នំ','អគ្គិសនីកម្ពុជា សាខាអូបែកក្អម',
  'អគ្គិសនីកម្ពុជា សាខាចាក់អង្រែក្រោម','អគ្គិសនីកម្ពុជា សាខាទួលពង្រ','អគ្គិសនីកម្ពុជា សាខាអូដឹម'];
/* three states, not two: EDC applies to on-grid and hybrid, off-grid is
   genuinely exempt, and a blank system type means nobody has said yet —
   which must not be silently treated as exempt */
const edcApplies=l=>l.system_type==='On-Grid'||l.system_type==='Hybrid';
const edcExempt=l=>l.system_type==='Off-Grid';
/* null means we cannot tell yet, because the inverter spec is missing */
const edcFields=l=>!edcApplies(l)||kwac(l)<=0?null:(kwac(l)<=10?EDC_SMALL:EDC_LARGE);
const edcDone=l=>{const f=edcFields(l);return f?f.filter(([k])=>l[k]).length:0;};
/* marketing keeps ownership of these stages even after a salesperson is
   assigned — must match the leads_select / leads_update policies */
const EARLY_STAGES=['info_gathering','telling_price','pending_quotation'];
function qualText(l){
  if(QUALIFIED_STAGES.includes(l.stage_code))return 'Qualified';
  if(l.stage_code===LOST)return l.qualification==='qualified'?'Qualified':'Disqualified';
  return 'Not qualified yet';
}
function qualPill(l){
  const t=qualText(l);
  if(t==='Qualified')return '<span class="badge b-on">qualified</span>';
  if(t==='Disqualified')return '<span class="badge b-off">disqualified</span>';
  return '<span class="days" style="display:inline">not yet</span>';
}
function stagePill(code){
  const st=STAGES.find(s=>s.stage_code===code)||{stage_name:code};
  const [bg,fg]=(STAGE_COLORS[code]||'#eee|#555').split('|');
  return `<span class="stagepill" style="background:${bg};color:${fg}">${esc(st.stage_name)}</span>`;
}

/* ---------------- auth ---------------- */
async function doLogin(){
  const btn=$('li-btn');btn.disabled=true;$('li-err').textContent='';
  const {error}=await sb.auth.signInWithPassword({email:$('li-email').value.trim(),password:$('li-pass').value});
  btn.disabled=false;
  if(error){$('li-err').textContent='Sign in failed. Check your email and password.';return;}
  boot();
}
async function doLogout(){await sb.auth.signOut();location.reload();}

async function boot(){
  const {data:{session}}=await sb.auth.getSession();
  if(!session){$('login-view').style.display='flex';$('app-view').style.display='none';return;}
  const {data:prof,error}=await sb.from('profiles').select('*').eq('id',session.user.id).single();
  if(error||!prof||!prof.is_active){
    $('li-err').textContent='Your account has no active CRM profile. Contact your admin.';
    await sb.auth.signOut();return;
  }
  /* sales and engineer are one role now. An account still marked engineer in
     the database behaves as a salesperson until the profile is converted. */
  if(prof.role==='engineer')prof.role='sales';
  ME=prof;
  loadBells();watchBells();
  setInterval(loadBells,120000);
  const [stg,stf]=await Promise.all([
    sb.from('lead_stages').select('*').eq('is_active',true).order('sort_order'),
    sb.from('profiles').select('id,full_name,staff_id,role,is_active').order('full_name')
  ]);
  STAGES=stg.data||[];STAFF=stf.data||[];
  $('login-view').style.display='none';$('app-view').style.display='flex';
  $('who').innerHTML=`<b>${esc(ME.full_name)}</b>${esc(ME.role)} · ${esc(ME.staff_id)}`;
  if(ME.role==='site_engineer')LEADSCOPE='won';
  buildNav();go('home');followUpToday();
}

/* What is waiting on you, shown once at login: leads due for follow-up today,
   and won deals whose BOQ has never been released. A won deal with no BOQ
   blocks the install, and nothing else in the app shouts about it. */
async function followUpToday(){
  if(!['sales','manager','admin'].includes(ME.role))return;
  const today=new Date().toISOString().slice(0,10);
  const mine=q=>ME.role==='sales'?q.eq('assigned_to',ME.id):q;
  const [{data:due},{data:boq}]=await Promise.all([
    mine(sb.from('leads').select('id,ref_id,customer_name,phone,stage_code')
      .eq('is_deleted',false).eq('next_follow_up',today)),
    mine(sb.from('leads').select('id,ref_id,customer_name,phone,stage_code,boq_status,stage_entered_at')
      .eq('is_deleted',false).eq('stage_code',WON).or('boq_status.is.null,boq_status.neq.Done'))
  ]);
  const nDue=(due||[]).length, nBoq=(boq||[]).length;
  if(!nDue&&!nBoq)return;
  const item=(l,meta)=>`<div class="tl-item rowlink" style="cursor:pointer" onclick="openLead('${l.id}')">
      <div class="t-head"><span class="refid">${esc(l.ref_id||'')}</span> ${esc(l.customer_name)}</div>
      <div class="t-meta">${meta}</div></div>`;
  $('lead-modal').innerHTML=`
    <h2>${nBoq?'Waiting on you':'Follow up today'}</h2>
    <div class="sub">${[nDue?`${nDue} follow-up${nDue>1?'s':''} due today`:'',
       nBoq?`${nBoq} won deal${nBoq>1?'s':''} with no BOQ released`:''].filter(Boolean).join(' · ')}.</div>
    ${nBoq?`<div class="section sec-eng"><h4>BOQ not released</h4>
      <div class="timeline">${boq.map(l=>item(l,
        `won ${fmtDate(l.stage_entered_at)} · BOQ ${esc(l.boq_status||'not set')}`)).join('')}</div>
    </div>`:''}
    ${nDue?`<div class="section sec-sales"><h4>Follow up today</h4>
      <div class="timeline">${due.map(l=>item(l,
        `${esc(l.phone||'no phone')} · ${stagePill(l.stage_code)}`)).join('')}</div>
    </div>`:''}
    <div class="modal-actions"><button class="btn-sun" onclick="closeLead()">Got it</button></div>`;
  $('lead-overlay').classList.add('open');
  /* the second reminder: the card is read once and dismissed, so an
     outstanding BOQ comes back as a pop a moment later */
  if(nBoq)setTimeout(()=>popNotice({kind:'boq',lead_id:boq[0].id,
    message:nBoq===1?`${boq[0].customer_name} is won with no BOQ released.`
      :`${nBoq} won deals have no BOQ released. ${boq[0].customer_name} is the oldest.`}),4000);
}

/* 16px stroke glyphs, inline so the app keeps its one-request, no-dependency
   shape. Drawn at 24 and scaled by the stylesheet. */
const ICON={
  home:'M3 11l9-7 9 7v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  leads:'M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M11 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7M17 13a4 4 0 0 1 4 4v1',
  pool:'M4 6h16v12H4zM4 10h16M9 6v12',
  new:'M12 5v14M5 12h14',
  quots:'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h4',
  reports:'M4 20V11M10 20V4M16 20v-6M21 20H3',
  edc:'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4',
  fin:'M3 6h18v12H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  comm:'M12 3l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.5 8z',
  users:'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  targets:'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 12h.01'
};
const navBtn=([k,l])=>`<button id="nav-${k}" onclick="go('${k}')">`
  +`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]||ICON.home}"/></svg>${l}</button>`;
/* Grouped rather than folded away. Nesting would cost the four-item roles a
   click to save the nine-item one some room, which is the wrong trade. */
function buildNav(){
  /* the site engineer only ever works won deals, so that is all they get */
  if(ME.role==='site_engineer'){
    $('nav').innerHTML=[['home','Today'],['leads','My jobs'],['reports','Reports']].map(navBtn).join('');
    return;
  }
  /* finance only ever works won deals and their money */
  if(ME.role==='finance'){
    $('nav').innerHTML=[['home','Today'],['fin','Finance']].map(navBtn).join('');
    return;
  }
  const work=[['home','Today'],['leads','Leads']];
  if(['manager','admin'].includes(ME.role)) work.push(['pool','Unassigned']);
  if(['marketing','sales','admin'].includes(ME.role)) work.push(['new','New lead']);
  const money=[];
  /* the quotation log carries prices, so it follows quotations_select rather
     than being a wider list that happens to look harmless */
  if(['sales','admin'].includes(ME.role)) money.push(['quots','Quotations']);
  if(canFinance()) money.push(['fin','Finance']);
  money.push(['comm','Commissions']);
  const admin=[];
  if(ME.role==='admin') admin.push(['edc','EDC']);
  /* every team with a dashboard of its own reaches it here; the scope switch
     inside decides which one they actually see */
  if(['marketing','sales','manager','admin'].includes(ME.role)) admin.push(['reports','Reports']);
  if(ME.role==='admin') admin.push(['users','Users']);
  if(ME.role==='admin') admin.push(['targets','Targets']);
  const group=(label,items)=>items.length
    ?`<span class="navlabel">${label}</span>`+items.map(navBtn).join('') :'';
  $('nav').innerHTML=group('Work',work)+group('Money',money)+group('Company',admin);
}
function go(v){
  VIEW=v;
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  const nb=$('nav-'+v);if(nb)nb.classList.add('active');
  const crumb=$('crumb');if(crumb)crumb.textContent=nb?nb.textContent.trim():'';
  /* Leads keeps whichever slice you were last looking at, so closing a won
     deal drops you back on Won rather than bouncing you to Active */
  ({home:renderHome,leads:()=>renderLeads(LEADSCOPE),
    pool:renderPool,new:renderNew,quots:renderQuots,reports:renderReports,
    edc:renderEdc,fin:renderFinance,comm:renderComm,users:renderUsers,
    targets:renderTargets}[v])();
}

/* ---------------- data ---------------- */
async function fetchLeads(extra){
  let q=sb.from('leads').select('*').eq('is_deleted',false).order('created_at',{ascending:false});
  if(extra)q=extra(q);
  const {data,error}=await q;
  if(error){toast('Could not load leads');console.error(error);return[];}
  return data||[];
}
