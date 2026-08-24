/* ---------------- MARKETING REPORT ----------------
   The client's Daily Marketing Report, in their sections and their order.
   Cost per lead needs a spend figure and the target needs a number, both set
   by admin on the Targets screen. Where one is missing this says so rather
   than dividing by nothing and printing a confident zero. */
const MKT_CH=['Digital_Marketing','Offline_Marketing','Third_Party','Direct_Sales','Existing_Customer'];

async function renderMktReport(){
  const rows=await fetchLeads(q=>q);
  const range=repRange(REPPERIOD);
  const per=repPeriodWord();
  const mStart=monthStart();
  const [tg,reached]=await Promise.all([loadTargets(mStart),loadStageHistory(rows.map(l=>l.id))]);

  const inWin=l=>REPPERIOD==='all'||inRange(l.created_at,range);
  const got=rows.filter(inWin);
  const byCh=c=>got.filter(l=>chOf(l)===c).length;

  const qualified=got.filter(l=>qualText(l)==='Qualified');
  const disqualified=got.filter(l=>qualText(l)==='Disqualified');
  const qualRate=got.length?Math.round(qualified.length/got.length*100):null;

  /* month to date is the frame the target is set in, whatever window is shown */
  const mtd=rows.filter(l=>inRange(l.created_at,[mStart,localDay(new Date())]));
  const todayRows=rows.filter(l=>inRange(l.created_at,repRange('today')));
  const leadTarget=tg.company.leads??null;
  const spend=tg.company.spend??null;
  const cpl=spend!=null&&mtd.length?spend/mtd.length:null;
  const mtdQual=mtd.filter(l=>qualText(l)==='Qualified');
  const cpql=spend!=null&&mtdQual.length?spend/mtdQual.length:null;

  /* conversion is measured on the window's own leads, so it answers "of what
     came in, how much moved" rather than mixing cohorts */
  const toQuot=got.filter(l=>everReached(reached,l,'quotation_sent'));
  const toWon=got.filter(l=>everReached(reached,l,WON));
  const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';
  const cash=v=>v==null?'—':fmtMoney(Math.round(v*100)/100);

  const months=[...new Set(rows.map(l=>localDay(l.created_at).slice(0,7)))].filter(Boolean).sort().slice(-12);
  const counts={};
  months.forEach(m=>{counts[m]={};CH_ORDER.forEach(c=>counts[m][c]=0);});
  rows.forEach(l=>{const m=localDay(l.created_at).slice(0,7);if(counts[m])counts[m][chOf(l)]++;});
  const used=CH_ORDER.filter(c=>months.some(m=>counts[m][c]>0));

  const bar=(label,n,total,cls)=>`<div class="row${cls||''}">
      <span class="nm">${esc(label)}</span>
      <span class="track"><span class="fill" style="width:${total?Math.round(n/total*100):0}%"></span></span>
      <span class="ct">${n}</span></div>`;
  const missing=[leadTarget==null?'Lead target':'',spend==null?'marketing spend':''].filter(Boolean);
  /* Marketing owns customer identity, not where the deal has got to, so their
     own copy of this report drops qualification and the funnel. Admin, who
     reaches the same report through the scope switch, keeps all of it. */
  const noStage=ME.role==='marketing';

  $('main').innerHTML=repBar('Marketing report')+`
    <div class="stats">
      <div class="stat hero"><div class="n">${got.length}</div><div class="l">Leads received ${per}</div></div>
      ${noStage?'':`<div class="stat"><div class="n">${qualified.length}</div><div class="l">Qualified</div></div>
      <div class="stat"><div class="n">${qualRate===null?'—':qualRate+'%'}</div><div class="l">Qualification rate</div></div>`}
      <div class="stat"><div class="n">${cash(cpl)}</div><div class="l">Cost per lead</div></div>
    </div>
    ${missing.length?`<div class="hint">
      <b>${esc(missing.join(' and '))} not set for ${esc(monthName(mStart.slice(0,7)))}.</b>
      Cost per lead and target progress stay blank until an admin fills ${missing.length>1?'them':'it'} in under Users, Targets.
    </div>`:''}

    <div class="homegrid">
      ${repPanel('Lead generation',`<div class="pipe">
        ${MKT_CH.map(c=>bar(c.replace(/_/g,' '),byCh(c),got.length)).join('')}
        ${byCh('Other')?bar('Other',byCh('Other'),got.length):''}
      </div>`)}

      ${noStage?'':repPanel('Lead quality',repFigs([
        ['Qualified',qualified.length],
        ['Disqualified',disqualified.length],
        ['Qualification rate',qualRate===null?'—':qualRate+'%'],
        ['Not decided yet',got.length-qualified.length-disqualified.length]
      ]))}

      ${repPanel('This month against target',repFigs([
        ['Lead target',leadTarget==null?'—':leadTarget],
        ['Leads month to date',mtd.length],
        ['Today',todayRows.length],
        ['Marketing spend',spend==null?'—':fmtMoney(spend)],
        ['Cost per lead',cash(cpl)],
        ...(noStage?[]:[['Cost per qualified lead',cash(cpql)]])
      ])+(leadTarget?`<div class="pipe" style="margin-top:14px">
        ${bar('Target vs actual',mtd.length,leadTarget)}
      </div>`:''),true)}

      ${noStage?'':repPanel('Conversion',`<div class="pipe">
        ${bar('Leads received',got.length,got.length)}
        ${bar('Qualified',qualified.length,got.length)}
        ${bar('Quotation sent',toQuot.length,got.length)}
        ${bar('Closed-Won',toWon.length,got.length,' won')}
      </div>`+repFigs([
        ['Lead to qualified',pct(qualified.length,got.length)],
        ['Qualified to quotation',pct(toQuot.length,qualified.length)],
        ['Lead to won',pct(toWon.length,got.length)]
      ]),true)}
    </div>

    <h3 style="font-size:15px;margin:22px 0 8px">Leads by channel, last twelve months</h3>
    ${months.length?barChart(months,counts,used)
      :blank('Nothing to chart yet','The breakdown by channel appears once leads have been created.')}

    <h3 style="font-size:15px;margin:22px 0 8px">Channel detail ${esc(per==='ever'?'':per)}</h3>
    ${got.length?`<div class="tablewrap"><table class="table-compact"><thead><tr>
      <th>Channel</th><th>Leads</th>${noStage?'':`<th>Qualified</th><th>Qualification rate</th>
      <th>Quotation sent</th><th>Closed-Won</th><th>Lead to won</th>`}
    </tr></thead><tbody>`+[...MKT_CH,'Other'].map(c=>{
      const set=got.filter(l=>chOf(l)===c);
      if(!set.length)return '';
      const q=set.filter(l=>qualText(l)==='Qualified');
      const qt=set.filter(l=>everReached(reached,l,'quotation_sent'));
      const w=set.filter(l=>everReached(reached,l,WON));
      return `<tr><td><b>${esc(c.replace(/_/g,' '))}</b></td><td>${set.length}</td>
        ${noStage?'':`<td>${q.length}</td><td>${pct(q.length,set.length)}</td>
        <td>${qt.length}</td><td>${w.length}</td><td>${pct(w.length,set.length)}</td>`}</tr>`;
    }).join('')+`</tbody></table></div>`
    :blank('No leads in this window','Widen the period to see the channel breakdown.')}`;
}
