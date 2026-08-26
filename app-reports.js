/* ---------------- CSV EXPORT ----------------
   Everyone exports, but only what RLS already lets them read, so a sales
   export contains that salesperson's leads and nothing else. */
function csvCell(v){
  let s=v==null?'':String(v);
  /* Excel executes a cell starting with these, so defuse it */
  if(/^[=+\-@\t\r]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function downloadCSV(name,headers,rows){
  if(!rows.length){toast('Nothing to export');return;}
  const csv=[headers,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
  /* the BOM is what stops Excel mangling Khmer text and accented names */
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}));
  const a=document.createElement('a');
  a.href=url; a.download=`${name}-${localDay(new Date())}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast(`Exported ${rows.length} row${rows.length>1?'s':''}`);
}
const stageName=c=>(STAGES.find(s=>s.stage_code===c)||{}).stage_name||c||'';

function exportLeads(){
  /* an export must not hand back what the screen withholds, so marketing gets
     the same six columns their table shows and nothing else */
  if(ME.role==='marketing'){
    downloadCSV('leads',['Customer','Customer type','Phone','Sale engineer','Channel','Sub-channel','Address','Marketing follow-up'],
      filteredLeads().map(l=>[l.customer_name,l.customer_type,l.phone,staffName(l.assigned_to),
        l.lead_channel||l.lead_source,l.lead_sub_channel,l.site_address,l.mkt_follow_up_date]));
    return;
  }
  /* the sale value only appears for roles the database serves it to, so an
     export can never leak what the screen hides */
  const money=canSeeMoney();
  const rows=filteredLeads().map(l=>[
    l.ref_id,l.customer_name,l.phone,l.customer_type,stageName(l.stage_code),
    l.lead_channel,l.lead_sub_channel,l.event_name,l.event_date,
    l.site_address,l.commune,l.district,l.province||l.city_province,l.site_type,
    l.monthly_bill_usd,staffName(l.assigned_to),
    l.next_follow_up,qualText(l),
    ...(money?[l.final_sale_usd]:[]),
    l.roof_type,l.system_type,l.phase_type,l.panel_brand,l.panel_watt,l.panel_pcs,l.panel_kwp,
    l.inverter_brand,l.inverter_kw,l.inverter_pcs,l.inverter_kw_total,
    l.battery_brand,l.battery_kwh,l.site_link,
    staffName(l.site_engineer_id),l.installation_team,
    l.delivery_date,l.installation_start,l.installation_end,
    l.inverter_kw_total,l.edc_doc_date,l.edc_inspection_date,
    l.edc_portal_date,l.edc_approval_date,l.edc_meter_date,
    l.edc_provincial_date,l.edc_pp_date,
    staffName(l.created_by),localDay(l.created_at),
    remarkDate(l.last_remark),l.last_remark?.note]);
  downloadCSV(LEADSCOPE==='won'?'won-deals':LEADSCOPE==='lost'?'lost-leads':'leads',
    ['Ref ID','Customer','Phone','Customer type','Stage',
    'Channel','Sub-channel','Event name','Event date',
    'Address','Commune','District','Province','Type of site',
    'Monthly bill (USD)','Sale engineer',
    'Next follow-up','Qualification',
    ...(money?['Final sale (USD)']:[]),
    'Roof type','System type','Ampere & phase','Panel brand','Panel watt','Panel pcs','Panel kWp',
    'Inverter brand','Inverter kW each','Inverter pcs','Inverter total kW',
    'Battery brand','Battery kWh','Location link',
    'Site engineer','Installation team',
    'Delivery date','Installation start','Installation end',
    'kWac','EDC doc submission','EDC inspection',
    'EDC portal submission','EDC approval letter','EDC smart meter & grid',
    'EDC provincial inspection','EDC Phnom Penh inspection',
    'Created by','Created','Latest remark date','Latest remark'],rows);
}
function exportQuots(){
  downloadCSV('quotations',['Ref ID','Customer','System type','Ampere & phase',
    'Roof type','Panel brand','Panel watt','Panel pcs','Panel kWp',
    'Inverter brand','Inverter kW each','Inverter pcs','Inverter total kW',
    'Battery brand','Battery kWh','Price (USD)','Released','By'],
    filteredQuots().map(q=>[q.leads?.ref_id,q.leads?.customer_name,q.system_type,q.ampere_phase,
      q.roof_type,q.panel_brand,q.panel_watt,q.panel_pcs,q.panel_kwp,
      q.inverter_brand,q.inverter_kw,q.inverter_pcs,q.inverter_kw_total,
      q.battery_brand,q.battery_kwh,
      q.price_usd,q.released_date?localDay(q.released_date):'',staffName(q.provided_by)]));
}
function exportComms(){
  downloadCSV('commissions',['Ref ID','Customer','Beneficiary','Type','Deal value (USD)',
    'Amount (USD)','Paid','Paid on'],
    (COMMS||[]).map(c=>[c.leads?.ref_id,c.leads?.customer_name,
      c.beneficiary_type==='referrer'?(c.referrer_name||'External referrer'):staffName(c.profile_id),
      c.beneficiary_type,c.leads?.lead_financials?.final_sale_usd,c.amount_usd,
      c.is_paid?'yes':'no',c.paid_at?localDay(c.paid_at):'']));
}

/* ---------------- REPORTS ----------------
   Categorical hues are the validated slots 1-4, assigned to a fixed channel
   (never by rank), so filtering never repaints a series. Legacy leads with no
   channel fold into a gray "Other" rather than earning a 5th hue.
   Aqua and gold sit under 3:1 on this surface, so the relief rule applies:
   segment values are labelled and the full table sits under the chart. */
/* ---------------- REPORTS ----------------
   Three dashboards, one per team, behind a scope switch that shows only what
   the role is entitled to. The client specified them as three separate
   documents, so they stay three separate screens rather than one long page. */
let REPSCOPE='', REPPERIOD='mtd', REPFILTER={person:'',team:'',channel:''};
/* Which report a role may see, and which one exists yet. The reports land one
   at a time, so a scope whose renderer has not shipped is left out rather than
   offered as a button that opens a blank page. */
const REP_RENDER={sales:'renderSalesReport',ops:'renderOpsReport',mkt:'renderMktReport'};
function repScopes(){
  const s=[];
  if(['sales','manager','admin'].includes(ME.role))s.push(['sales','Sales']);
  if(['site_engineer','admin'].includes(ME.role))s.push(['ops','Operations']);
  if(['marketing','admin'].includes(ME.role))s.push(['mkt','Marketing']);
  return s.filter(([k])=>typeof window[REP_RENDER[k]]==='function');
}
/* Two presets and a pair of dates. A week and a month were guesses at which
   window somebody wants; picking the dates answers it exactly, and the two
   that are worth a single click stay as buttons. */
const REP_PERIODS=[['today','Today'],['all','All time']];
let REPFROM='', REPTO='';
/* every report reads the same window, so the switch means one thing everywhere */
function repRange(p){
  const now=new Date(), d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(p==='today')return [localDay(d),localDay(d)];
  if(p==='custom')return [REPFROM||'1970-01-01', REPTO||localDay(d)];
  return ['1970-01-01',localDay(d)];
}
/* Two forms of the same thing. The short one goes on a tile, where a full
   date range would push the label over three lines; the sentence goes once at
   the top, where the exact dates belong. */
function repPeriodWord(){
  if(REPPERIOD==='today')return 'today';
  if(REPPERIOD==='all')return 'ever';
  return 'in range';
}
function repWindowSentence(){
  if(REPPERIOD==='all')return 'Everything on record.';
  if(REPPERIOD==='today')return 'For today.';
  if(REPFROM&&REPTO)return 'From '+fmtDate(REPFROM)+' to '+fmtDate(REPTO)+'.';
  if(REPFROM)return 'Since '+fmtDate(REPFROM)+'.';
  if(REPTO)return 'Up to '+fmtDate(REPTO)+'.';
  return 'Pick a date range.';
}
const inRange=(v,r)=>{const d=localDay(v);return !!d&&d>=r[0]&&d<=r[1];};
/* whole days between two dates, null when either end is missing — an average
   must never quietly count a blank as zero */
function daysBetween(a,b){
  if(!a||!b)return null;
  const x=new Date(localDay(a)),y=new Date(localDay(b));
  const n=Math.round((y-x)/86400000);
  return isNaN(n)?null:n;
}
const avgDays=arr=>{const v=arr.filter(n=>n!==null&&n>=0);
  return v.length?{avg:(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1),n:v.length}:{avg:'—',n:0};};

function setRepScope(v){REPSCOPE=v;REPFILTER={person:'',team:'',channel:''};renderReports();}
/* pressing a preset drops the dates, and picking a date drops the preset —
   otherwise the buttons and the boxes would disagree about what is showing */
function setRepPeriod(v){REPPERIOD=v;REPFROM='';REPTO='';renderReports();}
function setRepDates(which,v){
  if(which==='from')REPFROM=v; else REPTO=v;
  REPPERIOD=(REPFROM||REPTO)?'custom':'all';
  renderReports();
}
function setRepFilter(k,v){REPFILTER[k]=v;renderReports();}

async function renderReports(){
  const scopes=repScopes();
  if(!scopes.length){$('main').innerHTML=blank('No report for your team',
    'Reports are built per team and yours does not have one yet.');return;}
  if(!scopes.find(([k])=>k===REPSCOPE))REPSCOPE=scopes[0][0];
  $('main').innerHTML=SKEL;
  return window[REP_RENDER[REPSCOPE]]();
}
/* the switch bar every report sits under */
function repBar(title,extra){
  const scopes=repScopes();
  return `<h2 style="margin-bottom:4px">${esc(title)}</h2>
    <div class="sub" style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">${esc(repWindowSentence())}</div>
    <div class="toolbar">
      ${scopes.length>1?`<div class="scope">${scopes.map(([k,l])=>
        `<button class="${REPSCOPE===k?'on':''}" onclick="setRepScope('${k}')">${l}</button>`).join('')}</div>`:''}
      <div class="scope">${REP_PERIODS.map(([k,l])=>
        `<button class="${REPPERIOD===k?'on':''}" onclick="setRepPeriod('${k}')">${l}</button>`).join('')}</div>
      <div class="daterange">
        <input type="date" value="${REPFROM}" onchange="setRepDates('from',this.value)" title="From" aria-label="From">
        <span>to</span>
        <input type="date" value="${REPTO}" onchange="setRepDates('to',this.value)" title="To" aria-label="To">
      </div>
      ${extra||''}
    </div>`;
}
/* a labelled block of figures, the shape every section of the client's
   document takes */
function repPanel(title,body,wide){
  return `<div class="panel${wide?' wide':''}"><h4>${esc(title)}</h4>${body}</div>`;
}
function repFigs(pairs){
  return `<div class="figs">`+pairs.map(([label,value,note])=>
    `<div class="fig"><div class="fv">${value}</div><div class="fl">${esc(label)}</div>`+
    (note?`<div class="fn">${esc(note)}</div>`:'')+`</div>`).join('')+`</div>`;
}

/* Targets for a month, read once and shared by whichever report needs them.
   Company-wide rows carry a null profile_id; per-person rows carry theirs. */
async function loadTargets(monthISO){
  const {data,error}=await sb.from('targets').select('*').eq('month',monthISO);
  if(error){console.error(error);return {company:{},person:{}};}
  const company={},person={};
  (data||[]).forEach(t=>{
    if(t.profile_id){(person[t.profile_id]=person[t.profile_id]||{})[t.metric]=Number(t.value);}
    else company[t.metric]=Number(t.value);
  });
  return {company,person};
}
const monthStart=d=>{const x=d?new Date(d):new Date();return localDay(new Date(x.getFullYear(),x.getMonth(),1));};

/* How far a lead actually got. The current stage cannot tell you: a lost lead
   sitting on closed_lost may have had a quotation out. The stage_change log
   does know, so "ever reached" is read from there and the current stage is
   folded in for leads that have not moved since. */
async function loadStageHistory(ids){
  const reached={};
  ids.forEach(id=>reached[id]=new Set());
  for(let i=0;i<ids.length;i+=200){
    const {data}=await sb.from('lead_activities')
      .select('lead_id,to_stage,created_at')
      .in('lead_id',ids.slice(i,i+200)).eq('activity_type','stage_change');
    (data||[]).forEach(a=>{if(a.to_stage&&reached[a.lead_id])reached[a.lead_id].add(a.to_stage);});
  }
  return reached;
}
/* stage order, so "reached quotation sent or beyond" is one comparison.
   Closed-Lost sorts last in the list and so outranks Closed-Won, but it is an
   outcome rather than a rung: a lead marked lost from Info Gathering has
   reached nothing. It is excluded from both the current stage and the history,
   or every lost lead counts as quoted and won. */
const stageRank=code=>{const i=STAGES.findIndex(s=>s.stage_code===code);return i<0?-1:i;};
function everReached(reached,l,code){
  if(stageRank(l.stage_code)>=stageRank(code)&&l.stage_code!==LOST)return true;
  const set=reached[l.id];
  if(!set)return false;
  for(const c of set)if(c!==LOST&&stageRank(c)>=stageRank(code))return true;
  return false;
}

const CH_ORDER=['Digital_Marketing','Third_Party','Direct_Sales','Offline_Marketing','Existing_Customer','Other'];
const CH_COLOR={Digital_Marketing:'#2a78d6',Third_Party:'#eb6834',Direct_Sales:'#1baf7a',
                Offline_Marketing:'#eda100',Existing_Customer:'#6c4f7b',Other:'#898781'};
const chOf=l=>CH_ORDER.includes(l.lead_channel)?l.lead_channel:'Other';

/* Stacked column chart, hand-rolled SVG: no chart library, no build step. */
/* ---- report graphics ----------------------------------------------------
   Four forms for four questions. Drawing every one of them as the same bar is
   how a report stops being read, so: a funnel for what survives each step, a
   split for one ratio, a ranking for who holds what, a duration for how long
   something takes. Each keeps its figure written on it — no legends, and no
   number that exists only inside a picture. */

/* how many survive each step. Every bar is a share of the first, so the
   drop-off is the gap rather than something to work out. */
function gFunnel(steps,opts){
  const o=opts||{};
  const base=Math.max(1,steps[0]?steps[0][1]:1);
  return `<div class="gfunnel">`+steps.map(([k,v,color])=>{
    const pc=Math.round((v/base)*100);
    return `<div class="row"><span class="k">${esc(k)}</span>
      <span class="track"><span class="fill" style="width:${Math.max(v?4:0,pc)}%;background:${color||'var(--own-sales)'}">${v?`<b>${esc(o.fmt?o.fmt(v):v)}</b>`:''}</span></span>
      <span class="pc">${base?pc+'%':'—'}</span></div>`;
  }).join('')+`</div>`+(o.cap?`<div class="cap" style="margin-top:12px">${esc(o.cap)}</div>`:'');
}
/* two numbers whose proportion is the whole story */
function gSplit(parts,left,right){
  const total=parts.reduce((a,p)=>a+Number(p[1]||0),0)||1;
  return `<div class="gsplit">`+parts.map(([label,v,color])=>{
    const w=(Number(v||0)/total)*100;
    if(w<=0)return '';
    return `<span style="width:${w}%;background:${color}" title="${esc(label)}">${w>14?esc(label):''}</span>`;
  }).join('')+`</div>
  <div class="gsplit-l"><span>${esc(left||'')}</span><span>${esc(right||'')}</span></div>`;
}
/* who holds what, longest first */
function gRank(items,opts){
  const o=opts||{};
  const rows=[...items].filter(r=>Number(r[1]||0)>0).sort((a,b)=>b[1]-a[1]).slice(0,o.limit||8);
  if(!rows.length)return blank('Nothing to rank yet',o.emptyWhy||'This fills in as deals are recorded.');
  const max=Math.max(...rows.map(r=>Number(r[1])));
  return `<div class="grank">`+rows.map(([k,v])=>
    `<div class="row"><span class="k" title="${esc(k)}">${esc(k)}</span>
      <span class="track"><span class="fill" style="width:${Math.round((v/max)*100)}%;background:${o.color||'var(--own-sales)'}"></span></span>
      <span class="v">${esc(o.fmt?o.fmt(v):v)}</span></div>`).join('')+`</div>`;
}
/* how long each step takes. Laid on one timeline against the longest, so a
   slow step is long rather than merely a bigger number. */
function gDuration(rows,opts){
  const o=opts||{};
  const miss=v=>v==null||v==='—'||v==='';
  const known=rows.filter(r=>!miss(r[1]));
  if(!known.length)return blank('No turnaround yet',o.emptyWhy||'This needs dates at both ends of a step.');
  const max=Math.max(...known.map(r=>Number(r[1])))||1;
  return `<div class="gdur">`+rows.map(([k,v,n])=>
    `<div class="row"><span class="k">${esc(k)}</span>
      <span class="track">${miss(v)?'':`<span class="seg" style="left:0;width:${Math.max(3,Math.round((v/max)*100))}%"></span>`}</span>
      <span class="v">${miss(v)?'<span>no data yet</span>':`<b>${esc(v)}</b> days${n?` <span>· ${esc(n)}</span>`:''}`}</span></div>`).join('')+`</div>`;
}
/* One cell of a detail table: the figure, and a hairline bar under it sized
   against the largest value in that column. Scannable down the column without
   reading, and the number is still there for whoever wants it. */
function numCell(v,max,opts){
  const o=opts||{};
  const n=Number(v||0);
  const text=o.fmt?o.fmt(v):(v==null?'—':v);
  if(!n)return `<td class="numcell zero">${esc(o.zero!==undefined?o.zero:text)}</td>`;
  const w=max>0?Math.max(2,Math.round((n/max)*100)):0;
  return `<td class="numcell${o.good?' good':''}"><b>${esc(text)}</b>
    <span class="cb"><i style="width:${w}%"></i></span></td>`;
}
/* the largest value in a column, so every bar in it shares one scale */
const colMax=(rows,pick)=>Math.max(0,...rows.map(r=>Number(pick(r)||0)));
/* A headline figure with the movement and a sentence, the one thing worth
   taking from the dashboards Kevin keeps sending. The chip is only passed in
   where this month against last is genuinely derivable from dates on the rows.
   A snapshot — how many leads are open right now — has no history and gets no
   chip, because inventing one is how a report starts lying. */
function kpi(o){
  const d=o.delta;
  const chip=d==null?'' :
    `<span class="chip ${d>0?'up':d<0?'down':''}" title="this month against ${esc(o.deltaOf||'last month')} — the figure above follows the window, this does not">${d>0?'+':''}${d}% <span style="font-weight:500;opacity:.75">vs ${esc(o.deltaOf||'last')}</span></span>`;
  return `<div class="kpi${o.lead?' lead':''}${o.alert?' alert':''}">
    <div class="top"><span class="l">${esc(o.label)}</span>${chip}</div>
    <div class="n">${esc(o.value)}</div>
    ${o.note?`<div class="note">${esc(o.note)}</div>`:''}
    ${o.sub?`<div class="sub">${esc(o.sub)}</div>`:''}
  </div>`;
}
/* this calendar month against the one before it, from dates already on the
   rows. Returns null when last month has nothing to compare against, because
   a jump from zero is a percentage nobody can read. */
function momPct(thisMonth,lastMonth){
  if(!lastMonth)return null;
  return Math.round(((thisMonth-lastMonth)/lastMonth)*100);
}
/* Distribution. One dot per deal on a value scale, with the median marked.
   Twelve won deals would make a histogram of three lumpy bins; the dots show
   the real spread and the outlier, which is the part worth seeing. */
function gDots(values,opts){
  const o=opts||{};
  const v=values.filter(x=>Number(x)>0).map(Number).sort((a,b)=>a-b);
  if(!v.length)return blank('Nothing to spread yet',o.emptyWhy||'This fills in as deals are won.');
  const min=v[0], max=v[v.length-1], span=(max-min)||1;
  const mid=v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;
  const fmt=o.fmt||(x=>x);
  const at=x=>((x-min)/span)*100;
  return `<div class="gdots">
    <div class="strip">
      <div class="axis"></div>
      <div class="med" style="left:${at(mid)}%" title="median ${esc(fmt(mid))}"></div>
      ${v.map(x=>`<span class="dot${x>=mid*2?' big':''}" style="left:${at(x)}%;top:22px" title="${esc(fmt(x))}"></span>`).join('')}
    </div>
    <div class="ends"><span>${esc(fmt(min))}</span><span>median ${esc(fmt(mid))}</span><span>${esc(fmt(max))}</span></div>
  </div>`;
}
/* Deviation. Distance above or below target from a centre line, so over and
   under are opposite directions rather than two numbers to compare. */
function gDeviation(rows,opts){
  const o=opts||{};
  const known=rows.filter(r=>r[2]);
  if(!known.length)return blank('No targets set',o.emptyWhy||'Set targets under the Targets screen.');
  const pcts=known.map(([k,v,t])=>[k,Math.round((Number(v)/Number(t))*100)-100]);
  const reach=Math.max(60,...pcts.map(p=>Math.abs(p[1])));
  return `<div class="gdev">`+pcts.map(([k,d])=>{
    const half=Math.min(50,Math.abs(d)/reach*50);
    return `<div class="row"><span class="k" title="${esc(k)}">${esc(k)}</span>
      <span class="track"><span class="zero" style="left:50%"></span>
        <span class="fill" style="${d>=0?`left:50%;width:${half}%;background:var(--ok)`:`right:50%;width:${half}%;background:var(--bad)`}"></span>
      </span>
      <span class="v ${d>=0?'up':'down'}">${d>=0?'+':''}${d}%</span></div>`;
  }).join('')+`</div>`;
}
/* actual against a target. The notch is the target, so falling short is a gap
   rather than a subtraction the reader has to do. Over-target simply runs past
   the notch, which is the honest picture and something a gauge cannot draw. */
function gBullet(label,value,target,opts){
  const o=opts||{};
  const v=Number(value||0), t=Number(target||0);
  const fmt=o.fmt||(x=>x);
  if(!t) return `<div class="gbullet">
      <div class="top"><span class="k">${esc(label)}</span><span class="v">${esc(fmt(v))}</span></div>
      <div class="track"><span class="fill" style="width:100%;background:${o.color||'var(--own-sales)'};opacity:.25"></span></div>
      <div class="foot"><span>${esc(o.emptyWhy||'no target set')}</span><span></span></div>
    </div>`;
  const scale=Math.max(v,t)*1.08;
  const pc=Math.round(v/t*100);
  return `<div class="gbullet">
    <div class="top"><span class="k">${esc(label)}</span><span class="v">${esc(fmt(v))}</span></div>
    <div class="track">
      <span class="fill" style="width:${Math.min(100,(v/scale)*100)}%;background:${pc>=100?'var(--ok)':(o.color||'var(--own-sales)')}"></span>
      <span class="mark" style="left:${(t/scale)*100}%"></span>
    </div>
    <div class="foot"><span>${pc}% of target</span><span>target ${esc(fmt(t))}</span></div>
  </div>`;
}
/* the one figure a report leads with, and the sentence under it */
function leadFig(label,value,note,warn){
  return `<div class="lead-fig${warn?' warn':''}">
    <div class="fl">${esc(label)}</div>
    <div class="fv">${esc(value)}</div>
    ${note?`<div class="fn">${esc(note)}</div>`:''}
  </div>`;
}
/* everything that is not the headline, aligned so it reads down a column */
function ledger(rows){
  return `<div class="ledger">`+rows.map(([k,v,n])=>
    `<div class="row"><span class="k">${esc(k)}</span><span class="v">${v}</span>${n?`<span class="n">${esc(n)}</span>`:''}</div>`).join('')+`</div>`;
}
/* One series over time. Research and this data agree on the same answer: with
   a few dozen rows, columns against a zero baseline with the figure written on
   each one beat a donut, a gauge or a trend line — none of which can be read
   accurately at this size, and two of which we have no history to draw. The
   figure is labelled on the column rather than in a legend, and the same
   numbers are repeated as a table underneath so nothing is only in a picture. */
function colChart(labels,values,opts){
  const o=opts||{};
  const fmt=o.fmt||(v=>String(v));
  const W=760,PL=52,PR=12,PT=18,PH=200,AX=34,H=PT+PH+AX;
  const plotW=W-PL-PR;
  const max=Math.max(1,...values);
  const step=Math.max(1,Math.ceil(max/4));
  const top=step*4;
  const y=v=>PT+PH-(v/top)*PH;
  const band=plotW/Math.max(1,labels.length);
  const bw=Math.min(52,band*0.56);
  const R=4;
  const topPath=(x,yy,w,h,r)=>`M${x},${yy+h}V${yy+r}a${r},${r} 0 0 1 ${r},-${r}h${w-2*r}a${r},${r} 0 0 1 ${r},${r}V${yy+h}Z`;
  let grid='',bars='',xlab='';
  for(let i=0;i<=4;i++){
    const v=step*i, yy=y(v);
    grid+=`<line x1="${PL}" y1="${yy}" x2="${W-PR}" y2="${yy}" stroke="var(--line)" stroke-width="1"/>`
        + `<text class="tick" x="${PL-8}" y="${yy+3}" text-anchor="end">${esc(o.axisFmt?o.axisFmt(v):v)}</text>`;
  }
  labels.forEach((lab,i)=>{
    const v=values[i]||0;
    const cx=PL+band*i+band/2, x=cx-bw/2;
    const yy=y(v), h=PT+PH-yy;
    if(v>0) bars+=(h>R*2?`<path d="${topPath(x,yy,bw,h,R)}" fill="${o.color||'var(--own-sales)'}">`
                        :`<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(1,h)}" fill="${o.color||'var(--own-sales)'}">`)
        + `<title>${esc(lab)}: ${esc(fmt(v))}</title>`
        + (h>R*2?'</path>':'</rect>');
    if(v>0) bars+=`<text class="seglabel" x="${cx}" y="${yy-6}" text-anchor="middle" fill="var(--ink-2)">${esc(fmt(v))}</text>`;
    xlab+=`<text class="tick" x="${cx}" y="${PT+PH+18}" text-anchor="middle">${esc(lab)}</text>`;
  });
  return `
  <div class="chartcard">
    <h3>${esc(o.title||'')}</h3>
    ${o.cap?`<div class="cap">${esc(o.cap)}</div>`:''}
    <svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title||'chart')}">
      ${grid}${bars}${xlab}
      <line x1="${PL}" y1="${PT+PH}" x2="${W-PR}" y2="${PT+PH}" stroke="var(--line)" stroke-width="1"/>
    </svg>
  </div>
  <div class="tablewrap" style="margin-bottom:18px"><table style="min-width:420px"><thead><tr>
    <th>${esc(o.xhead||'Month')}</th><th>${esc(o.yhead||'Value')}</th>
  </tr></thead><tbody>${labels.map((lab,i)=>`<tr><td>${esc(lab)}</td><td>${esc(fmt(values[i]||0))}</td></tr>`).join('')}</tbody></table></div>`;
}
/* the last twelve months a report can talk about, oldest first */
function lastMonths(rows,dateOf,n){
  const keys=[...new Set((rows||[]).map(r=>localDay(dateOf(r)).slice(0,7)).filter(Boolean))].sort().slice(-(n||12));
  return keys;
}
function barChart(months,counts,used){
  const W=760,PL=42,PR=12,PT=12,PH=210,AX=34,H=PT+PH+AX;
  const plotW=W-PL-PR;
  const max=Math.max(1,...months.map(m=>used.reduce((a,c)=>a+counts[m][c],0)));
  const step=Math.max(1,Math.ceil(max/4));
  const top=step*4;
  const y=v=>PT+PH-(v/top)*PH;
  const band=plotW/months.length;
  const bw=Math.min(46,band*0.58);
  const GAP=2, R=4;
  const topPath=(x,yy,w,h,r)=>`M${x},${yy+h}V${yy+r}a${r},${r} 0 0 1 ${r},-${r}h${w-2*r}a${r},${r} 0 0 1 ${r},${r}V${yy+h}Z`;

  let grid='',bars='',xlab='';
  for(let i=0;i<=4;i++){
    const v=step*i, yy=y(v);
    grid+=`<line x1="${PL}" y1="${yy}" x2="${W-PR}" y2="${yy}" stroke="var(--line)" stroke-width="1"/>`
        + `<text class="tick" x="${PL-8}" y="${yy+3}" text-anchor="end">${v}</text>`;
  }
  months.forEach((m,mi)=>{
    const cx=PL+band*mi+band/2, x=cx-bw/2;
    let acc=0;
    const stack=used.filter(c=>counts[m][c]>0);
    stack.forEach((c,si)=>{
      const v=counts[m][c];
      const y0=y(acc), y1=y(acc+v);
      let h=y0-y1; const isTop=si===stack.length-1;
      if(si>0){h-=GAP;}
      const yy=y1;
      bars+= (isTop&&h>R*2 ? `<path d="${topPath(x,yy,bw,h,R)}" fill="${CH_COLOR[c]}">`
                           : `<rect x="${x}" y="${yy}" width="${bw}" height="${Math.max(1,h)}" fill="${CH_COLOR[c]}">`)
           + `<title>${esc(monthName(m))} · ${esc(c.replace(/_/g,' '))}: ${v}</title>`
           + (isTop&&h>R*2?'</path>':'</rect>');
      if(h>=14&&bw>=22) bars+=`<text class="seglabel" x="${cx}" y="${yy+h/2+3}" text-anchor="middle">${v}</text>`;
      acc+=v;
    });
    xlab+=`<text class="tick" x="${cx}" y="${PT+PH+18}" text-anchor="middle">${esc(monthName(m))}</text>`;
  });

  const legend=used.map(c=>`<span><i style="background:${CH_COLOR[c]}"></i>${esc(c.replace(/_/g,' '))}</span>`).join('');
  const rows=months.map(m=>`<tr><td>${esc(monthName(m))}</td>${used.map(c=>`<td>${counts[m][c]||0}</td>`).join('')}
      <td><b>${used.reduce((a,c)=>a+counts[m][c],0)}</b></td></tr>`).join('');

  return `
  <div class="chartcard">
    <h3>Leads per month by channel</h3>
    <div class="cap">Leads grouped by the month they were created and the channel they came from.</div>
    <div class="legend">${legend}</div>
    <svg class="chartsvg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Leads per month by channel">
      ${grid}${bars}${xlab}
      <line x1="${PL}" y1="${PT+PH}" x2="${W-PR}" y2="${PT+PH}" stroke="var(--line)" stroke-width="1"/>
    </svg>
  </div>
  <div class="tablewrap" style="margin-bottom:18px"><table style="min-width:520px"><thead><tr>
    <th>Month</th>${used.map(c=>`<th>${esc(c.replace(/_/g,' '))}</th>`).join('')}<th>Total</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

function stageTable(){
  const n=LEADS.length||1;
  const rows=STAGES.map(s=>{
    const c=LEADS.filter(l=>l.stage_code===s.stage_code).length;
    return `<tr><td>${stagePill(s.stage_code)}</td><td>${c}</td><td>${Math.round(c/n*100)}%</td></tr>`;
  }).join('');
  return `<h3 style="font-size:15px;margin-bottom:8px">Pipeline by stage</h3>
    <div class="tablewrap"><table style="min-width:380px"><thead><tr>
      <th>Stage</th><th>Leads</th><th>Share</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------------- QUOTATIONS TAB ---------------- */
async function renderQuots(){
  $('main').innerHTML=SKEL;
  /* name the foreign key: since leads.chosen_quotation_id was added there are
     two relationships between these tables, and an unqualified embed is
     ambiguous (PGRST201). This one is the quotation's own lead. */
  const {data:quots,error}=await sb.from('quotations')
    .select('*, leads!quotations_lead_id_fkey(ref_id, customer_name)').order('created_at',{ascending:false});
  if(error){$('main').innerHTML=blank('Could not load quotations','Check your connection and refresh. If it keeps happening, tell your admin.');return;}
  QUOTS=quots||[];
  /* only offer months that actually have quotations, newest first */
  const monthOpts=[...new Set(QUOTS.map(q=>localDay(q.released_date||q.created_at).slice(0,7)))].filter(Boolean)
    .sort().reverse().map(m=>`<option value="${m}" ${m===QFILTER.month?'selected':''}>${monthName(m)}</option>`).join('');
  $('main').innerHTML=`
    <h2 style="margin-bottom:6px">Quotation log</h2>
    <p style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">Every quotation released, newest first. Add quotations from inside a lead.</p>
    <div class="toolbar">
      <input placeholder="Search customer or ref ID…" value="${esc(QFILTER.q||'')}" oninput="QFILTER.q=this.value;drawQuots()">
      <select title="Released in month" onchange="QFILTER.month=this.value;QFILTER.date='';drawQuots()">
        <option value="">All months</option>${monthOpts}</select>
      <input type="date" title="Released on this exact date" value="${esc(QFILTER.date||'')}" onchange="QFILTER.date=this.value;QFILTER.month='';drawQuots()">
      <button class="btn-line" onclick="QFILTER={q:'',month:'',date:''};renderQuots()">Clear</button>
      <span class="spacer"></span>
      <button class="btn-line" onclick="exportQuots()" title="Exports the rows currently shown">Export CSV</button>
    </div>
    <div class="tablewrap" id="quotwrap"></div>`;
  drawQuots();
}
function filteredQuots(){
  let rows=QUOTS;
  const day=q=>localDay(q.released_date||q.created_at);
  if(QFILTER.month)rows=rows.filter(q=>day(q).slice(0,7)===QFILTER.month);
  if(QFILTER.date)rows=rows.filter(q=>day(q)===QFILTER.date);
  if(QFILTER.q){const s=QFILTER.q.toLowerCase();rows=rows.filter(q=>
    (q.leads?.customer_name||'').toLowerCase().includes(s)||(q.leads?.ref_id||'').toLowerCase().includes(s));}
  return rows;
}
function drawQuots(){
  const rows=filteredQuots();
  if(!rows.length){$('quotwrap').innerHTML=QUOTS.length
    ?blank('No matches','No quotation fits the current search or dates.')
    :blank('No quotations yet','An engineer releases a quotation from inside a lead, and it is logged here.');return;}
  $('quotwrap').innerHTML=`<table><thead><tr>
      <th>Ref ID</th><th>Customer</th><th>System</th><th>Panels</th><th>Inverter</th><th>Battery</th><th>Price</th><th>Released</th><th>By</th><th>Document</th>
    </tr></thead><tbody>`+rows.map(q=>`
      <tr><td class="refid">${esc(q.leads?.ref_id||'—')}</td>
      <td><b>${esc(q.leads?.customer_name||'?')}</b></td>
      <td>${esc(q.system_type||'—')}<span class="days">${esc(q.ampere_phase||'')}</span></td>
      <td>${q.panel_pcs??'—'} ${esc(q.panel_brand||'')}<span class="days">${q.panel_kwp?q.panel_kwp+' kWp':''}</span></td>
      <td>${q.inverter_pcs??'—'} × ${q.inverter_kw??'—'}kW ${esc(q.inverter_brand||'')}<span class="days">${q.inverter_kw_total?q.inverter_kw_total+' kW total':''}</span></td>
      <td>${esc(q.battery_kwh||'—')} ${esc(q.battery_brand||'')}</td>
      <td><b>${fmtMoney(q.price_usd)}</b></td>
      <td>${fmtDate(q.released_date)}</td>
      <td>${esc(staffName(q.provided_by))}</td>
      <td><button class="btn-line" onclick="printQuote('${q.id}')">Document</button></td></tr>`).join('')+`</tbody></table>`;
}
