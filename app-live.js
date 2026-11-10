/* ---------------- Live updates and the new-version bar (10 Nov 2026) ----------------
   Nobody should have to remember to refresh. Two things keep a screen current:
   1. Live data: a save by anyone on the tables below reaches every open
      browser through Supabase realtime (RLS decides who hears what), the read
      cache is dropped through DATAVER, and the screen redraws itself - but
      never while someone is typing, has a lead open or a pop-up up; it waits
      and redraws when they are done.
   2. New version: every few minutes the page reads index.html for its version
      stamp. When a newer one is live a bar offers Refresh, and a page nobody
      is using reloads by itself. */
const LIVE_TABLES=['leads','lead_payments','lead_finance','lead_expected_payments','quotations','after_sales','install_days_off'];
let LIVE_DUE=false, LIVE_T=null;
const LIVE_STAMP=(document.querySelector('script[src*="app-core.js"]')?.getAttribute('src').match(/v=([0-9a-z]+)/)||[])[1]||'';

function liveBusy(){
  if(typeof AUTH_LOST!=='undefined'&&AUTH_LOST)return true;
  if($('lead-overlay')?.classList.contains('open'))return true;
  if(document.querySelector('#hf-pop,#colpop,#calpop,#mkpop'))return true;
  if([...document.querySelectorAll('.zoombox')].some(z=>getComputedStyle(z).display!=='none'))return true;
  const a=document.activeElement;
  return !!(a&&a!==document.body&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
function liveRedraw(){
  if(!CURVIEW||document.hidden||liveBusy()){LIVE_DUE=true;return;}
  LIVE_DUE=false;
  const y=scrollY;
  go(CURVIEW);
  setTimeout(()=>scrollTo(0,y),600);
}
function liveChanged(){
  DATAVER++;
  clearTimeout(LIVE_T);
  LIVE_T=setTimeout(liveRedraw,1500);
}
/* marketing hear live only about leads they created, so a deal someone else
   wins never reaches them; their two screens re-read every two minutes */
setInterval(()=>{if(typeof ME!=='undefined'&&ME&&ME.role==='marketing'&&['reports','salesrep'].includes(CURVIEW)&&!document.hidden)liveChanged();},2*60*1000);
/* a redraw held back while someone was busy happens once they are free */
setInterval(()=>{if(LIVE_DUE&&!document.hidden&&!liveBusy())liveRedraw();},3000);

function liveStart(){
  const ch=sb.channel('crm-live');
  LIVE_TABLES.forEach(t=>ch.on('postgres_changes',{event:'*',schema:'public',table:t},liveChanged));
  ch.subscribe();
  setInterval(liveVersion,5*60*1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){liveVersion();if(LIVE_DUE)liveRedraw();}});
}

let LIVE_NEW=false;
async function liveVersion(){
  if(!LIVE_STAMP)return;
  try{
    const html=await (await fetch('index.html?t='+Date.now(),{cache:'no-store'})).text();
    const v=(html.match(/app-core\.js\?v=([0-9a-z]+)/)||[])[1];
    if(!v||v===LIVE_STAMP)return;
    LIVE_NEW=true;
    if(document.hidden&&!liveBusy()){location.reload();return;}
    if(!$('verbar'))document.body.insertAdjacentHTML('afterbegin',
      `<div id="verbar" role="status">A new version is ready. <button onclick="location.reload()">Refresh</button></div>`);
  }catch(e){}
}
