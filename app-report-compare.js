/* ---------------- COMPARE (23 Oct 2026) ----------------
   Two whole months of the Management dashboard side by side - every box and
   every chart (client: "include everything"). Management itself is unchanged.
   Both months are counted by mgmtCompute, the same function Management draws
   from, so the two screens cannot disagree (council, 23 Oct 2026). Pies are
   drawn as paired bars: two pies side by side cannot be read.
   A few figures are "as of" the month's last day rebuilt from today's data
   (who holds a lead, its stage, its remark), as the Management board does when
   a past month is picked. */
let CMPA='', CMPB='';
const CMP_COL=['var(--viz-mute)','var(--viz-1)'];

function cmpMonths(){
  const out=[], d=new Date();
  for(let i=0;i<18;i++){const x=new Date(d.getFullYear(),d.getMonth()-i,1);
    out.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0'));}
  return out;
}
const cmpLast=m=>{const [y,mo]=m.split('-').map(Number);return localDay(new Date(y,mo,0));};
function setCmp(k,v){if(k==='a')CMPA=v;else CMPB=v;renderReports();}

async function renderCompareReport(){
  if(!['manager','admin'].includes(ME.role)){
    $('main').innerHTML=blank('Not your report','Compare is for the manager and admin.');return;}
  const ms=cmpMonths();
  if(!CMPB)CMPB=ms[0];
  if(!CMPA)CMPA=ms[1];
  const gen=NAVGEN;ZOOMS=[];
  const [A,B]=await Promise.all([
    mgmtCompute('custom',[CMPA+'-01',cmpLast(CMPA)],monthName(CMPA)),
    mgmtCompute('custom',[CMPB+'-01',cmpLast(CMPB)],monthName(CMPB))]);
  if(gen!==NAVGEN)return;
  const nA=monthName(CMPA), nB=monthName(CMPB);
  const cash=repCash;
  const pct2=v=>v==null?'—':v.toFixed(2)+'%';
  const two=(title,labels,va,vb,o)=>groupChart(labels,
    [{name:nA,color:CMP_COL[0],values:va},{name:nB,color:CMP_COL[1],values:vb}],
    {title,compact:true,...(o||{})});

  /* the change column: money and counts as a difference with its percentage,
     a percentage as points */
  const chg=(a,b,kind)=>{
    if(a==null||b==null)return '—';
    const d=b-a;if(Math.abs(d)<0.005)return '0';
    const sgn=d>0?'+':'−';
    if(kind==='pct')return sgn+Math.abs(d).toFixed(2)+' pts';
    const p=a?' ('+sgn+Math.abs(Math.round(d/a*100))+'%)':'';
    return sgn+(kind==='cash'?cash(Math.abs(d)):Math.abs(Math.round(d*100)/100))+p;
  };
  const fmtv=(v,kind)=>v==null?'—':kind==='cash'?cash(v):kind==='pct'?pct2(v):String(Math.round(v*100)/100);
  const tbl=(title,rowsDef)=>`<div class="section cmptable"><h4>${esc(title)}</h4><table><thead><tr>
      <th></th><th class="num">${esc(nA)}</th><th class="num">${esc(nB)}</th><th class="num">Change</th></tr></thead><tbody>${
      rowsDef.map(([label,a,b,kind])=>`<tr><td>${esc(label)}</td><td class="num">${fmtv(a,kind)}</td><td class="num"><b>${fmtv(b,kind)}</b></td>
        <td class="num ${b!=null&&a!=null&&b<a?'down':''}">${chg(a,b,kind)}</td></tr>`).join('')}</tbody></table></div>`;

  /* ---- the seven boxes ---- */
  const kpis=F=>({target:F.target||null,coll:F.mtdCollected,out:F.expThisSum,exp:F.expected,
    ach:F.target?F.mtdCollected/F.target*100:null,rem:F.remaining,
    run:(F.target&&F.runRate!=null)?F.runRate/F.target*100:null});
  const kA=kpis(A), kB=kpis(B);
  /* conversion %: the client's own figure before September 2026, ours after */
  const conv=(F,m)=>{if(CONV_HISTORY[m]){const [r,q]=CONV_HISTORY[m];return q/r*100;}
    const r=F.madeIn(m).length;return r?F.qualIn(m).length/r*100:0;};
  const cA=conv(A,CMPA), cB=conv(B,CMPB);
  const notYet=F=>F.notYet.length;
  const quotSent=F=>F.quotRows.reduce((a,r)=>a+r[1],0);

  /* ---- people: everyone either month lists, by id ---- */
  const pmap=new Map();[...A.people,...B.people].forEach(p=>pmap.set(p.id,p));
  const people=[...pmap.values()].sort((a,b)=>(a.is_active?0:1)-(b.is_active?0:1));
  const pn=people.map(p=>p.full_name.split(' ')[0]);
  const byId=(F,fn)=>people.map(p=>fn(F,p));
  const collOf=(F,p)=>{const c=F.collCols.find(c=>c.name===p.full_name.split(' ')[0]);return c?c.v:0;};
  const unA=(A.collCols.find(c=>c.name==='Unassigned')||{}).v||0, unB=(B.collCols.find(c=>c.name==='Unassigned')||{}).v||0;
  const collLabels=pn.concat(unA||unB?['Unassigned']:[]);
  const collVals=F=>byId(F,collOf).concat(unA||unB?[(F.collCols.find(c=>c.name==='Unassigned')||{}).v||0]:[]);
  const activeOf=(F,p)=>F.progSet.filter(l=>l.assigned_to===p.id).length;
  const wonOf=(F,p)=>F.wonSet.filter(l=>l.assigned_to===p.id).length;
  const tcvOf=(F,p)=>F.tcvBy[p.id]||0;
  const avgOf=(F,p)=>{const r=F.contactAvg.find(r=>r[4]===p.id);return r?r[1]:0;};
  const heldOf=(F,p)=>{const r=F.handled.find(r=>r.id===p.id);return r?r.handled:0;};
  const contOf=(F,p)=>F.contactedOf(p).length;
  const typeOf=w=>(F,p)=>F.typeOf(p,w);
  const quotOf=(F,p)=>{const r=F.quotRows.find(r=>r[0]===p.id);return r?r[1]:0;};

  /* ---- stages, reasons ---- */
  const stageName=c=>(STAGES.find(s=>s.stage_code===c)||{}).stage_name||c;
  const pipeOf=(F,code)=>F.progSet.filter(l=>(MG_ACTIVE.includes(F.stageAt(l))?F.stageAt(l):'telling_price')===code).length;
  const rset={};[A,B].forEach(F=>Object.entries(F.reasons).forEach(([k,v])=>rset[k]=(rset[k]||0)+v));
  const topR=Object.entries(rset).sort((a,b)=>b[1]-a[1]).slice(0,6).map(r=>r[0]);

  /* ---- the daily trend, day 1 to 31 ---- */
  const dd=Array.from({length:31},(_,i)=>String(i+1).padStart(2,'0'));
  const dayVals=(F,m,map)=>dd.map(d=>{const k=m+'-'+d;if(k>cmpLast(m)||k>F.today)return null;return map[k]||0;});

  $('main').innerHTML=`
    <h2 style="margin-bottom:4px">Compare</h2>
    <div class="sub" style="color:var(--ink-soft);font-size:13px;margin-bottom:14px">${esc(nA)} against ${esc(nB)}.</div>
    <div class="toolbar">
      <div class="scope" role="group" aria-label="Which report">${repScopes().map(([k,l])=>
        `<button class="${REPSCOPE===k?'on':''}" onclick="setRepScope('${k}')">${l}</button>`).join('')}</div>
      <div class="cmppick">
        <select onchange="setCmp('a',this.value)">${ms.map(m=>`<option value="${m}" ${m===CMPA?'selected':''}>${esc(monthName(m))}</option>`).join('')}</select>
        <span>vs</span>
        <select onchange="setCmp('b',this.value)">${ms.map(m=>`<option value="${m}" ${m===CMPB?'selected':''}>${esc(monthName(m))}</option>`).join('')}</select>
      </div>
      <button class="btn-line" onclick="repExportPdf()" style="margin-left:auto">Export PDF</button>
    </div>
    <div class="cmplegend"><span><i style="background:${CMP_COL[0]}"></i>${esc(nA)}</span><span><i style="background:${CMP_COL[1]}"></i>${esc(nB)}</span></div>

    <div class="homegrid mgrid cmpgrid2">
      ${tbl('Sales & pipeline',[
        ['Monthly Target',kA.target,kB.target,'cash'],
        ['Payment Collected',kA.coll,kB.coll,'cash'],
        ['Outstanding Payment',kA.out,kB.out,'cash'],
        ['Total Payment Expected',kA.exp,kB.exp,'cash'],
        ['Achievement %',kA.ach,kB.ach,'pct'],
        ['Target Remaining',kA.rem,kB.rem,'cash'],
        ['Run Rate %',kA.run,kB.run,'pct']])}
      ${tbl('Leads',[
        ['Raw lead target',A.leadTarget||null,B.leadTarget||null,'n'],
        ['Raw lead (marketing)',A.mktLeads,B.mktLeads,'n'],
        ['Raw lead (all channels)',A.got.length,B.got.length,'n'],
        ['Qualified',A.qN,B.qN,'n'],
        ['Disqualified',A.dN,B.dN,'n'],
        ['Not yet qualify',notYet(A),notYet(B),'n'],
        ['Closed-Won',A.wN+A.wE,B.wN+B.wE,'n'],
        ['Closed-Lost',A.lN,B.lN,'n'],
        ['In progress',A.pN+A.pE,B.pN+B.pE,'n'],
        ['Conversion %',cA,cB,'pct'],
        ['Quotations sent',quotSent(A),quotSent(B),'n'],
        ['Lost after a quotation',A.lostAfter.length,B.lostAfter.length,'n'],
        ['Lost before any quotation',A.lostBefore.length,B.lostBefore.length,'n']])}
    </div>

    <div class="homegrid three mgrid">
      ${two('Raw lead target vs actual',['Raw Lead Target','Raw Lead'],[A.leadTarget,A.mktLeads],[B.leadTarget,B.mktLeads])}
      ${two('Lead stage distribution',['Raw Lead','Qualified','Disqualified','Not yet qualify'],
        [A.got.length,A.qN,A.dN,notYet(A)],[B.got.length,B.qN,B.dN,notYet(B)])}
      ${two('Qualified leads',['Qualified','Closed-Won','Closed-Lost','In progress'],
        [A.qN,A.wN+A.wE,A.lN,A.pN+A.pE],[B.qN,B.wN+B.wE,B.lN,B.pN+B.pE])}
    </div>

    <div class="homegrid three mgrid">
      ${lineChart(dd.map(d=>String(+d)),
        [{name:'Raw '+nA,color:CMP_COL[0],values:dayVals(A,CMPA,A.mktDay)},
         {name:'Raw '+nB,color:CMP_COL[1],values:dayVals(B,CMPB,B.mktDay)}],
        {title:'Lead trend from marketing - raw',compact:true})}
      ${lineChart(dd.map(d=>String(+d)),
        [{name:'Qualified '+nA,color:CMP_COL[0],values:dayVals(A,CMPA,A.qualDay)},
         {name:'Qualified '+nB,color:CMP_COL[1],values:dayVals(B,CMPB,B.qualDay)}],
        {title:'Lead trend from marketing - qualified',compact:true})}
      ${two('Conversion % from raw lead to qualified lead',['Conversion'],[+cA.toFixed(2)],[+cB.toFixed(2)],{fmt:v=>v.toFixed(2)+'%'})}
    </div>

    <div class="homegrid three mgrid">
      ${two('Payment collection by each sales',collLabels,collVals(A),collVals(B),{fmt:v=>cash(v)})}
      ${two('Total contract value (USD) by each sales',pn,byId(A,tcvOf),byId(B,tcvOf),{fmt:v=>cash(v)})}
      ${two('# of quotation sent',pn,byId(A,quotOf),byId(B,quotOf))}
    </div>

    <div class="homegrid three mgrid">
      ${two('Sales and lead summary - # of Active Lead',pn,byId(A,activeOf),byId(B,activeOf))}
      ${two('Sales and lead summary - # Closed Won',pn,byId(A,wonOf),byId(B,wonOf))}
      ${two('Active pipeline stage',MG_ACTIVE.map(stageName),MG_ACTIVE.map(c=>pipeOf(A,c)),MG_ACTIVE.map(c=>pipeOf(B,c)))}
    </div>

    <div class="homegrid three mgrid">
      ${topR.length?two('Closed-lost status',topR,topR.map(r=>A.reasons[r]||0),topR.map(r=>B.reasons[r]||0))
        :emptyChart('Closed-lost status','Nothing lost in either month','')}
      ${two('Closed-lost, before or after a quotation',['After a quotation','Before any quotation'],
        [A.lostAfter.length,A.lostBefore.length],[B.lostAfter.length,B.lostBefore.length])}
      ${two('Avg. daily contact to customer',pn,byId(A,avgOf),byId(B,avgOf),{fmt:v=>v.toFixed(2)})}
    </div>

    <div class="homegrid three mgrid">
      ${two('# of leads held (received)',pn,byId(A,heldOf),byId(B,heldOf))}
      ${two('# of Customer Contacted',pn,byId(A,contOf),byId(B,contOf))}
      ${two('Residential',pn,byId(A,typeOf('Residential')),byId(B,typeOf('Residential')))}
    </div>

    <div class="homegrid three mgrid">
      ${two('C & I',pn,byId(A,typeOf('C & I')),byId(B,typeOf('C & I')))}
    </div>`;
}
