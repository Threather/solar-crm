/* ============================================================
   SOLAR CRM — frontend v2 (Phase 1)
   ============================================================ */
/* Every request the app makes goes through netFetch, handed to the Supabase
   client, so no screen can bypass it. Two jobs:
   - the bar across the top, which moves as requests actually complete;
   - DATAVER, which moves on whenever anything is written, before and after
     the write lands, so the read cache in fetchAll can never hand back data
     that predates a save - including a read that was already in flight. */
let DATAVER=0, NET_STARTED=0, NET_DONE=0, NET_W=0, NET_HIDE=null, NET_TRICKLE=null;
function netBar(){
  let bar=document.getElementById('netbar');
  if(!bar){
    if(!document.body)return;
    bar=document.createElement('div');bar.id='netbar';document.body.prepend(bar);
  }
  clearTimeout(NET_HIDE);
  if(NET_STARTED>NET_DONE){
    /* never backwards and never full while anything is still out; a slow
       single request creeps on its own so the bar does not look stuck */
    NET_W=Math.max(NET_W,12+NET_DONE/NET_STARTED*78);
    bar.style.width=NET_W+'%';bar.classList.add('on');
    if(!NET_TRICKLE)NET_TRICKLE=setInterval(()=>{
      NET_W+=(92-NET_W)*0.04;bar.style.width=NET_W+'%';},300);
  }else{
    clearInterval(NET_TRICKLE);NET_TRICKLE=null;
    bar.style.width='100%';
    NET_HIDE=setTimeout(()=>{bar.classList.remove('on');
      setTimeout(()=>{if(NET_STARTED===NET_DONE){bar.style.width='0';NET_W=0;NET_STARTED=NET_DONE=0;}},300);},200);
  }
}
async function netFetch(input,init){
  const method=String(init&&init.method||'GET').toUpperCase();
  const write=String(input&&input.url||input).includes('/rest/v1/')&&method!=='GET'&&method!=='HEAD';
  if(write)DATAVER++;
  NET_STARTED++;netBar();
  try{return await fetch(input,init);}
  finally{if(write)DATAVER++;NET_DONE++;netBar();}
}
const sb = supabase.createClient(CRM_CONFIG.SUPABASE_URL, CRM_CONFIG.SUPABASE_ANON_KEY,
  {global:{fetch:netFetch}});

let ME=null, STAGES=[], STAFF=[], LEADS=[], QUOTS=[], VIEW='leads', LEADLOCK=true, LEADSAVE=null, LEADQUOTS=[], FINSCOPE='owing', EDCSCOPE='work';
/* the Leads tab shows only live work; won and lost have their own tabs */
let LEADSCOPE='active';
let FINROWS=[];
let FILTER={stage:'',q:'',qual:''};
/* the leads table shows one page of the filtered rows; search and filters
   still run over all of them */
let LEADPAGE=0;
const PAGE_SIZE=50;
/* finance has its own working filters, kept apart from the leads ones */
let FINFILTER={status:'',acct:'',eng:'',due:'',from:'',to:''};
let QFILTER={q:'',month:'',date:''};
/* local YYYY-MM-DD, so a late-evening lead in Cambodia isn't filed under tomorrow */
const localDay=d=>d?new Date(d).toLocaleDateString('sv'):'';
const monthName=m=>{const[y,mo]=m.split('-');return new Date(y,mo-1,1).toLocaleDateString('en-GB',{month:'short',year:'numeric'});};

/* Vocabularies from the client's Excel (Drop Down List sheet) */
const CHANNELS = {
  'Digital_Marketing': ['Facebook','Instagram','Telegram','Tik Tok','Call','Walk-In'],
  'Third_Party':       ['Staff','Non-Staff'],
  'Direct_Sales':      [],   /* filled from the active sales staff at render time */
  'Offline_Marketing': ['Ground Activation'],
  /* a customer coming back for more is not a lead Facebook bought; giving it
     its own channel keeps cost per lead honest */
  'Existing_Customer':  ['Expansion','Repeat purchase']
};
/* These eleven lists are edited by admin on the Lists screen and loaded from
   `vocabularies` at login. What is written here is the fallback: if that
   fetch fails, dropdowns must still have their values rather than emptying
   the app. SYSTEM_TYPES stays a constant with the other locked lists below,
   because `Off-Grid` is what makes a lead EDC-exempt. */
const SYSTEM_TYPES = ['On-Grid','Hybrid','Off-Grid'];
let ROOF_TYPES = ['RC Roof/Awning','Zinc Roof','Tile Roof','Ground Mount','Other'];
let PHASE_TYPES = ['10A x 1P','20A x 1P','32A x 1P','63A x 1P','32A x 3P','40A x 3P','63A x 3P','100A x 3P'];
let CUSTOMER_TYPES = ['Residential','C & I'];
let PANEL_BRANDS = ['Jinko','LONGi','Trina','JA Solar','Canadian Solar','Other'];
let INVERTER_BRANDS = ['Deye','Yinergy','Urayzero','Growatt','Huawei','Sungrow','Solis','Other'];
let BATTERY_BRANDS = ['Deye','ANTI-DARK','Yinergy','BYD','Pylontech','Growatt','Other'];

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
  if(e.code==='42501'||/row-level security/i.test(m)){
    /* the same code covers "you may not" and "nobody is signed in any more" */
    checkSession();
    return 'Your role is not allowed to do that.';
  }
  if(e.code==='PGRST301'||/JWT|token is expired/i.test(m)){sessionLost();return 'Your session expired. Sign in again.';}
  return m.slice(0,90);
}
const esc=s=>(s==null?'':String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* A NUMBER BOX THAT ACCEPTS KHMER DIGITS.
   `type="number"` silently throws away anything it does not recognise: the
   client typed ៦៥០ on a Khmer keyboard and the box stayed empty, which reads
   as a field that will not take a value. It does the same to "650 W", to a
   comma decimal, and - with step="1" - it refuses 450.5. And it happily takes
   -5, which is not a panel.

   So these are text boxes that behave like number boxes. Khmer and
   Arabic-Indic digits are folded to ASCII, a comma is read as a decimal point,
   and anything else is dropped as it is typed. inputmode="decimal" still gives
   a phone its number pad. */
const KH_DIGITS='០១២៣៤៥៦៧៨៩', AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
function normNum(v,opt){
  let out='';
  for(const ch of String(v==null?'':v)){
    const k=KH_DIGITS.indexOf(ch), a=AR_DIGITS.indexOf(ch);
    if(k>=0){out+=k;continue;}
    if(a>=0){out+=a;continue;}
    if(ch>='0'&&ch<='9'){out+=ch;continue;}
    if(ch===','){
      /* a comma groups thousands here - 5,500 is 5500. As a decimal comma it
         is handled below, where a whole-number field has no decimals anyway. */
      if(opt&&opt.int)continue;
      if(!out.includes('.')){out+='.';}
      continue;
    }
    if(ch==='.'){
      /* on a whole-number field everything after the point is dropped, so
         450.5 reads 450 rather than silently becoming 4505 */
      if(opt&&opt.int)break;
      if(!out.includes('.'))out+='.';
      continue;
    }
  }
  /* a lone dot is not a number yet, but someone is mid-way through typing one */
  return out;
}
/* bound to oninput: fold what was typed and keep the caret at the end */
function numIn(el,int){
  const clean=normNum(el.value,{int:int});
  if(clean!==el.value)el.value=clean;
  return clean;
}
/* the markup for one of them. `int` refuses a decimal point outright. */
const numBox=(id,value,extra,int)=>
  `<input id="${id}" type="text" inputmode="${int?'numeric':'decimal'}" `
  +`value="${value==null||value===''?'':esc(String(value))}" `
  +`oninput="numIn(this,${int?'true':'false'})${extra&&extra.then?';'+extra.then:''}" `
  +`${extra&&extra.attrs?extra.attrs:''}>`;
const fmtMoney=v=>v==null||v===''?'—':'$'+Number(v).toLocaleString(undefined,{maximumFractionDigits:2});
const fmtDate=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'—';
const fmtDT=d=>d?new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const daysIn=d=>Math.floor((Date.now()-new Date(d).getTime())/86400000);
const staffName=id=>(STAFF.find(s=>s.id===id)||{}).full_name||'—';
/* The app writes its own lines into the contact log - a quotation released, a
   lead created, an EDC date typed - and they are the audit trail, so they stay
   in the database and in the lead's history tab. But the Remarks column is
   where sales read what was actually said to the customer, and the app's own
   lines were burying it (15 Sep 2026). They are matched on the text they are
   written with; every one of these is generated, never typed by a person. */
const AUTO_NOTES=[
  /^Lead created$/i,
  /^Quotation (released|deleted):/i,
  /^Lead specification and sale value set from the .* quotation$/i,
  /^Expansion of .* for the same customer$/i,
  /^A new deal was opened for this customer$/i,
  /^Assigned to /i,
  /^EDC (price|branch|doc|inspection|portal|approval|meter|provincial|pp|fee)/i,
  /^Delivery confirmed as arrived$/i,
  /^Installation confirmed as finished$/i,
  /^Customer details reopened for sales$/i
];
const isAutoNote=n=>AUTO_NOTES.some(re=>re.test(String(n||'').trim()));
const humanNotes=list=>(list||[]).filter(a=>a&&a.note&&!isAutoNote(a.note));
/* Who a lead can be handed to. The round-robin is untouched and still only
   reaches sales - this is the manual list, and the manager belongs on it
   (11 Sep 2026): they cover for their own team and could not take a lead
   themselves. Whoever already holds the lead stays on the list even if they
   have since been deactivated, so the select says what the record says. */
const assignable=holderId=>STAFF.filter(s=>
  ((s.role==='sales'||s.role==='manager')&&s.is_active)||(holderId&&s.id===holderId));
const assignLabel=s=>s.full_name+(s.role==='manager'?' (manager)':'');
const opt=(v,cur)=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(v)}</option>`;
/* a value admin has since hidden is still on older leads, so it is put back
   at the top for that lead rather than the select silently showing something
   the record does not say */
const optList=(arr,cur,blank=true)=>(blank?`<option value="">—</option>`:'')
  +(cur&&!arr.includes(cur)?opt(cur,cur):'')+arr.map(v=>opt(v,cur)).join('');
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2600);}
/* A toast on its own gets missed: it sits in the corner for under three
   seconds while the eye is on the button just pressed, so a refused save
   reads as a button that does nothing. Marketing reported exactly that on
   10 Sep 2026 and the cause was a blank sub-channel. The field that stopped
   the save now says so itself - scrolled to, focused and outlined until it is
   filled in. Amber, not red: a field waiting to be filled is not a danger. */
function needField(id,msg){
  toast(msg);
  const e=$(id); if(!e)return;
  e.classList.add('needs');
  e.scrollIntoView({block:'center',behavior:'smooth'});
  try{e.focus({preventScroll:true});}catch(_){e.focus();}
  const clear=()=>{e.classList.remove('needs');
    e.removeEventListener('input',clear);e.removeEventListener('change',clear);};
  e.addEventListener('input',clear);e.addEventListener('change',clear);
}
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
let INSTALL_TEAMS=['Team A','Team B','Team C','Team D'];
const CONTRACT_STATUS=['Not signed','Pending','Signed'];
let ACCOUNT_TYPES=['SWN','SWT'];
const BOQ_STATUS=['Pending','Done'];
/* Why a deal was lost. A dropdown rather than free text, because "Top
   Closed-Lost Reasons" has to be countable — a column of sentences cannot be
   charted. The note beside it carries the detail. */
let LOST_REASONS=['Price','Competitor','No budget','Postponed','No response','Not qualified','Other'];
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
let EDC_BRANCHES=['អគ្គិសនីកម្ពុជា សាខាវត្តភ្នំ','អគ្គិសនីកម្ពុជា សាខាអូបែកក្អម',
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

/* AN EXPIRED SESSION LOOKS EXACTLY LIKE A REFUSED ROLE, AND IT IS NOT ONE.
   ME is read once at boot, so the interface carries on looking signed in long
   after the token behind it has gone: the nav is there, the leads are on
   screen, and then the first write comes back 42501 because auth.uid() is
   null and every policy tests against it. The app then said "Your role is not
   allowed to do that", which sent marketing to us believing they had lost a
   permission. Reproduced on the live site: sign in, drop the session, keep ME,
   and the insert fails with exactly that message.

   So a write that is refused checks whether anybody is still signed in, and if
   nobody is, says so and returns to the login screen. */
let AUTH_LOST=false;
function sessionLost(){
  if(AUTH_LOST)return;
  AUTH_LOST=true;
  /* ME is deliberately left alone. Every render function reads ME.role, so
     clearing it turns one dead token into a crash on the next route. The
     login screen is in front now and go() refuses to run; the stale copy
     behind it is never read again. */
  const lv=$('login-view'), av=$('app-view'), err=$('li-err');
  if(lv)lv.style.display='flex';
  if(av)av.style.display='none';
  if(err)err.textContent='Your session expired. Please sign in again \u2014 nothing you typed was saved.';
}
/* called on a refused write; the check is a round trip, so it runs after the
   toast rather than holding it up */
async function checkSession(){
  const {data}=await sb.auth.getSession();
  if(!data||!data.session){sessionLost();return false;}
  return true;
}
/* supabase-js gives up on a refresh token it cannot renew by signing out, so
   this catches the same thing a moment earlier - before the next write */
sb.auth.onAuthStateChange((event)=>{
  if(event==='SIGNED_OUT'&&ME)sessionLost();
});

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
    /* joined_date rides along because the sales summary prints it. Without it
       that column could only ever show a dash, whatever was set on Users. */
    sb.from('profiles').select('id,full_name,staff_id,role,is_active,joined_date').order('full_name')
  ]);
  STAGES=stg.data||[];STAFF=stf.data||[];
  await loadVocab();
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
  /* Got it sits beside the heading: since the import the list runs to 26 won
     deals, and a button at the foot meant scrolling the whole card to close it */
  $('lead-modal').innerHTML=`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
      <h2>${nBoq?'Waiting on you':'Follow up today'}</h2>
      <button class="btn-sun" onclick="closeLead()" style="flex-shrink:0">Got it</button>
    </div>
    <div class="sub">${[nDue?`${nDue} follow-up${nDue>1?'s':''} due today`:'',
       nBoq?`${nBoq} won deal${nBoq>1?'s':''} with no BOQ released`:''].filter(Boolean).join(' · ')}.</div>
    ${nBoq?`<div class="section sec-eng"><h4>BOQ not released</h4>
      <div class="timeline">${boq.map(l=>item(l,
        `won ${fmtDate(l.stage_entered_at)} · BOQ ${esc(l.boq_status||'not set')}`)).join('')}</div>
    </div>`:''}
    ${nDue?`<div class="section sec-sales"><h4>Follow up today</h4>
      <div class="timeline">${due.map(l=>item(l,
        `${esc(l.phone||'no phone')} · ${stagePill(l.stage_code)}`)).join('')}</div>
    </div>`:''}`;
  $('lead-overlay').classList.add('open');
  /* the second reminder: the card is read once and dismissed, so an
     outstanding BOQ comes back as a pop a moment later */
  /* it waits for the card to be closed: on a bare four-second timer it landed
     in the top-right corner over the card's own Got it button */
  const pop=()=>popNotice({kind:'boq',lead_id:boq[0].id,
    message:nBoq===1?`${boq[0].customer_name} is won with no BOQ released.`
      :`${nBoq} won deals have no BOQ released. ${boq[0].customer_name} is the oldest.`});
  const whenClosed=()=>$('lead-overlay').classList.contains('open')?setTimeout(whenClosed,1000):setTimeout(pop,1500);
  if(nBoq)setTimeout(whenClosed,4000);
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
  /* a spanner: the case is opened after the job is finished */
  aftersale:'M14.7 6.3a4 4 0 0 0-5.4 5.4l-5 5a1.5 1.5 0 0 0 2.1 2.1l5-5a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.1-2.1z',
  users:'M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1',
  targets:'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 12h.01',
  inc:'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'
};
const navBtn=([k,l])=>`<button id="nav-${k}" onclick="go('${k}')">`
  +`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]||ICON.home}"/></svg>${l}</button>`;
/* Grouped rather than folded away. Nesting would cost the four-item roles a
   click to save the nine-item one some room, which is the wrong trade. */
function buildNav(){
  /* the site engineer only ever works won deals, so that is all they get */
  if(ME.role==='site_engineer'){
    $('nav').innerHTML=[['home','Today'],['leads','My jobs'],['aftersale','After-sale'],['reports','Reports']].map(navBtn).join('');
    return;
  }
  /* finance only ever works won deals and their money */
  if(ME.role==='finance'){
    $('nav').innerHTML=[['home','Today'],['fin','Finance']].map(navBtn).join('');
    return;
  }
  const work=[['home','Today'],['leads','Leads']];
  if(['manager','admin'].includes(ME.role)) work.push(['pool','Unassigned']);
  if(['marketing','sales','manager','admin'].includes(ME.role)) work.push(['new','New lead']);
  const money=[];
  /* the quotation log carries prices, so it follows quotations_select rather
     than being a wider list that happens to look harmless */
  if(['sales','manager','admin'].includes(ME.role)) money.push(['quots','Quotations']);
  if(canFinance()) money.push(['fin','Finance']);
  /* Commissions came out on 27 Aug 2026. Sales are not paid on the value of a
     deal, they are paid by the incentive scheme, so a screen of per-deal
     commissions described a way of paying people that does not happen. The
     table and its win trigger are still there; nothing reads them. */
  if(['admin','manager'].includes(ME.role)) money.push(['inc','Incentive']);
  const admin=[];
  if(ME.role==='admin') admin.push(['edc','EDC']);
  /* every team with a dashboard of its own reaches it here; the scope switch
     inside decides which one they actually see */
  /* the manager runs sales and marketing; after-sale is the installation
     team's record and is not theirs (27 Aug 2026) */
  if(['admin','sales','site_engineer','manager'].includes(ME.role)) admin.push(['aftersale','After-sale']);
  if(['marketing','sales','manager','admin'].includes(ME.role)) admin.push(['reports','Reports']);
  if(ME.role==='admin') admin.push(['users','Users']);
  /* the manager sets the targets their two teams are measured against
     (10 Sep 2026, Kevin's call) */
  if(['admin','manager'].includes(ME.role)) admin.push(['targets','Targets']);
  if(ME.role==='admin') admin.push(['lists','Lists']);
  const group=(label,items)=>items.length
    ?`<span class="navlabel">${label}</span>`+items.map(navBtn).join('') :'';
  $('nav').innerHTML=group('Work',work)+group('Money',money)+group('Company',admin);
}
function go(v){
  /* nothing renders once the session has gone - the login screen is up and a
     render would only read a profile that no longer has a token behind it */
  if(AUTH_LOST)return;
  NAVGEN++;
  VIEW=v;
  document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
  const nb=$('nav-'+v);if(nb)nb.classList.add('active');
  const crumb=$('crumb');if(crumb)crumb.textContent=nb?nb.textContent.trim():'';
  /* Leads keeps whichever slice you were last looking at, so closing a won
     deal drops you back on Won rather than bouncing you to Active */
  ({home:renderHome,leads:()=>renderLeads(LEADSCOPE),
    pool:renderPool,new:renderNew,quots:renderQuots,reports:renderReports,
    edc:renderEdc,fin:renderFinance,aftersale:renderAfterSale,users:renderUsers,
    targets:renderTargets,inc:renderIncentive,lists:renderLists}[v])();
}

/* ---------------- editable lists ---------------- */
/* Which dropdowns admin may edit, and the global each one fills. Only lists
   nothing branches on are here: system type, BOQ status, contract status,
   after-sale status and channel read their exact values somewhere in the app
   and would break quietly if renamed, so they stay in code. */
const VOCAB_LISTS=[
  ['panel_brand','Panel brand',()=>PANEL_BRANDS,v=>PANEL_BRANDS=v,'Shown when the sale engineer keys the system in.'],
  ['inverter_brand','Inverter brand',()=>INVERTER_BRANDS,v=>INVERTER_BRANDS=v,'A brand with no part number in the code still saves; it prints without one.'],
  ['battery_brand','Battery brand',()=>BATTERY_BRANDS,v=>BATTERY_BRANDS=v,'A brand with no part number in the code still saves; it prints without one.'],
  ['roof_type','Roof type',()=>ROOF_TYPES,v=>ROOF_TYPES=v,''],
  ['phase_type','Ampere & phase',()=>PHASE_TYPES,v=>PHASE_TYPES=v,'Each value must contain 1P or 3P. The inverter part number is worked out from it.'],
  ['customer_type','Customer type',()=>CUSTOMER_TYPES,v=>CUSTOMER_TYPES=v,'The first value is what a new lead starts on.'],
  ['install_team','Installation team',()=>INSTALL_TEAMS,v=>INSTALL_TEAMS=v,'The operations report groups by whatever this holds.'],
  ['lost_reason','Closed-lost reason',()=>LOST_REASONS,v=>LOST_REASONS=v,'Offered as a numbered list when a lead is moved to Closed-Lost.'],
  ['as_cause','After-sale cause',()=>AS_CAUSES,v=>AS_CAUSES=v,''],
  ['account_type','Type of account',()=>ACCOUNT_TYPES,v=>ACCOUNT_TYPES=v,''],
  ['edc_branch','EDC branch',()=>EDC_BRANCHES,v=>EDC_BRANCHES=v,'']
];
/* Loaded once at login. A value hidden on the Lists screen leaves the
   dropdowns, but a lead already carrying it still shows it - see optList. */
async function loadVocab(){
  const {data,error}=await sb.from('vocabularies')
    .select('list_key,value,sort_order,is_active').eq('is_active',true).order('sort_order');
  /* 42P01 is the table not existing yet. Either way the fallbacks above stand,
     because an empty dropdown is worse than a slightly stale one. */
  if(error){console.error('lists',error);return;}
  if(!data||!data.length)return;
  for(const [key,,,set] of VOCAB_LISTS){
    const vals=data.filter(r=>r.list_key===key).map(r=>r.value);
    if(vals.length)set(vals);
  }
}

/* ---------------- data ---------------- */
/* PostgREST returns at most 1,000 rows and says nothing about the rest, so an
   unlimited select handed back a third of the 2,832 leads imported on 23 Sep
   2026 - every list and report short, no error anywhere. Anything that can
   grow past that goes through here a page at a time. `build` returns a fresh
   query each call, because a Supabase query cannot be awaited twice. */
/* Which screen asked. go() and renderReports move it on. A screen takes
   seconds to load since the import, and two loads in flight both write to
   #main when they land - so leaving a report half-loaded, or clicking
   Management then Marketing, could leave you looking at the one you left. */
let NAVGEN=0;
const abandoned=()=>new Promise(()=>{});
/* What has been read, kept for a minute. Moving between screens used to
   download all 2,832 leads again each time. A cached read is used only while
   DATAVER is where it was when the read began - any save, by anyone on this
   screen, throws it away - and only for the same person and the same query.
   Others' changes arrive within the minute, or at once on a notification. */
const CACHE=new Map(), PENDING=new Map(), CACHE_MS=60000;
/* the download itself, shared: two screens asking for the same query at once
   wait on one request. It always settles, whoever has moved on. */
function loadAll(build,key,ver){
  const pk=key+'|'+ver;
  if(PENDING.has(pk))return PENDING.get(pk);
  const p=(async()=>{
    const out=[];
    /* four pages at once rather than one after another: 2,832 leads took
       3.6s in three trips and one round covers them */
    for(let from=0;;from+=4000){
      const pages=await Promise.all([0,1,2,3].map(k=>
        build().range(from+k*1000,from+k*1000+999)));
      for(const {data,error} of pages){
        if(error)throw error;
        out.push(...(data||[]));
        if(!data||data.length<1000){
          CACHE.set(key,{ver,at:Date.now(),rows:out});
          for(const [k,v] of CACHE)if(Date.now()-v.at>CACHE_MS)CACHE.delete(k);
          return out;
        }
      }
    }
  })().finally(()=>PENDING.delete(pk));
  PENDING.set(pk,p);
  return p;
}
/* Data that arrives after the person has moved on is dropped: the promise
   never settles, so the stale render stops at its await instead of painting
   over the screen they went to. Each caller gets its own copy of the list. */
async function fetchAll(build){
  const gen=NAVGEN, ver=DATAVER;
  const key=(ME&&ME.id||'')+' '+build().url;
  const hit=CACHE.get(key);
  if(hit&&hit.ver===ver&&Date.now()-hit.at<CACHE_MS)return hit.rows.slice();
  const rows=await loadAll(build,key,ver);
  if(gen!==NAVGEN)return abandoned();
  return rows.slice();
}
/* An id list travels in the URL, and 2,800 ids is a 100KB address nothing
   will carry. A short list goes 200 at a time, all batches at once. A long
   one - admin and the manager see every lead - reads the table whole and
   keeps the rows asked for: fifteen trips per table had made opening Leads
   take 17 seconds. Row Level Security still decides what comes back.
   The build must order on something unique, or paging can repeat rows. */
async function byLeadIds(build,ids){
  if(ids.length>400){
    const want=new Set(ids);
    return (await fetchAll(build)).filter(r=>want.has(r.lead_id));
  }
  const chunks=[];
  for(let i=0;i<ids.length;i+=200)chunks.push(ids.slice(i,i+200));
  const parts=await Promise.all(chunks.map(c=>fetchAll(()=>build().in('lead_id',c))));
  return parts.flat();
}
/* fetchAll in the {data,error} shape a plain await returns, so a caller that
   destructures {data:x} changes nothing but the one line. The build must be
   ordered on something unique, or rows past the first thousand can repeat. */
const rowsOf=build=>fetchAll(build).then(data=>({data}),error=>({data:null,error}));
/* Whether a lost lead had a quotation out: 'after' or 'before'. Read off the
   quotations, never the stage - sales quote without moving it. Quotations are
   always made in the CRM (Kevin, 23 Sep 2026), and the client's Quotation
   Information sheet, imported the same day, is every quotation they sent
   before that - confirmed complete. So a lead with no quotation was never
   priced. There was an 'unknown' for the imported leads until that sheet
   arrived; it is gone because the question it stood for was answered. */
function quoteStage(l,hasQuote){
  return hasQuote?'after':'before';
}
const QUOTE_STAGE_TEXT={after:'After quotation',before:'Before quotation',unknown:'Unknown'};
/* the dashboards' form: no leads is an empty list, and a failed read is logged
   and treated as empty, as the .then(r=>r.data||[]) it replaced did */
function repByIds(build,ids){
  if(!ids.length)return Promise.resolve([]);
  return byLeadIds(build,ids).catch(e=>{console.error(e);return[];});
}
async function fetchLeads(extra){
  /* id breaks ties: imported leads carry created_at at 03:00 on their lead
     date, so hundreds share one timestamp, and paging on it alone would shuffle
     them between pages - dropping some and repeating others */
  try{
    return await fetchAll(()=>{
      const q=sb.from('leads').select('*').eq('is_deleted',false)
        .order('created_at',{ascending:false}).order('id');
      return extra?extra(q):q;
    });
  }catch(error){toast('Could not load leads');console.error(error);return[];}
}
