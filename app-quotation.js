/* ---------------- QUOTATION DOCUMENT ----------------
   Khmer taken from the client's own workbook, so it is their wording, not a
   translation. Every string lives here: corrections are one edit, not thirty.
   Anything the app cannot work out is printed as a fill-in box. */
const QT={
  company:'SOLARWORKS SOLUTIONS CO., LTD.',
  addr1:'#Plot A, VTRUST Tower, F1 Office, 2nd Floor, Street 169',
  addr2:'Village 12, Sangkat Veal Vong, Khan 7 Makara, Phnom Penh',
  tel:'Tel : (855) 85 200 222',
  title:'សម្រង់តម្លៃ',
  cust:'ឈ្មោះអតិថិជន:', addr:'អាស័យដ្ឋាន:', phone:'លេខទូរស័ព្ទ:', date:'កាលបរិច្ចេទ:',
  vat:'លេខអត្ដសញ្ញាណកម្ម(VATTIN):', systype:'ប្រភេទប្រព័ន្ធសូឡា:',
  valid:'សុពលភាព:', validDays:'៧ ថ្ងៃ',
  size:'ទំហំប្រព័ន្ធសូឡា:', battsize:'ទំហំអាគុយសូឡា:',
  project:'គម្រោង', projectVal:': ការទិញដាច់ (1 ហ្វា)',
  projectref:'លេខសម្គាល់គម្រោង', teamref:'លេខសម្គាល់ក្រុម', na:': N/A',
  no:'ល.រ', desc:'បរិយាយ', img:'រូបភាព', qty:'ចំនួន', warranty:'ការធានា',
  supply:'ផ្គត់ផ្គង់, រចនា, និង តម្លើងបន្ទះសូឡា',
  mgmtFor:(sys,kwp)=>'ការគ្រប់គ្រងសម្រាប់ប្រភេទប្រព័ន្ធសូឡា '+(sys||'')+' ដែលបានស្នើរ ទំហំ '+kwp+' kWp',
  s1:'ការគ្រប់គ្រង',
  s1a:'ជូនដំណឹងដល់ អគ្គិសនីកម្ពុជា (EDC) ឬ អាជ្ញាធរអគ្គិសនីមូលដ្ឋាន',
  s1b:'រួមបញ្ចូលថ្លៃសេវាសម្រាប់៖',
  s1c:'ក. ប្លង់បច្ចេកទេសអគ្គិសនី AC/DC',
  s1d:'ខ. ការគ្រប់គ្រងគម្រោង ការរៀបចំឯកសារ និងការដាក់ពាក្យស្នើសុំទៅកាន់អាជ្ញាធរពាក់ព័ន្ធ',
  s1e:'គ. ការធ្វើតេស្តប្រព័ន្ធ និងការដាក់ឱ្យដំណើរការ',
  s1f:'ឃ. សេវាកម្មការតម្លើង កម្លាំងពលកម្ម ការដឹកជញ្ជូន ការស្នាក់នៅ និងអាហារ',
  s2:'គ្រឿងបង្គំសំខាន់ៗ',
  s2a:'ក. ផ្ទាំងសូឡា', s2b:'ខ. អាំងវែទ័រ', s2c:'គ. អាគុយ', s2d:'ឃ. គ្រឿងបង្គុំប្រព័ន្ធសូឡា',
  model:'ម៉ូដែល', panelsize:'ទំហំផ្ទាំងសូឡា', invsize:'ទំហំអាំងវែទ័រ', battcap:'ទំហំអាគុយ',
  warrantyN:n=>'ការធានា: '+n+' ឆ្នាំ', perfWarrantyN:n=>'ធានាលើប្រសិទ្ធភាព: '+n+' ឆ្នាំ',
  unitPanel:'ផ្ទាំង', unitPiece:'គ្រឿង', unitSet:'ឈុត',
  mount1:'គ្រោងអាលុយមីញ៉ូម', mount2:'ក្រចាប់សូឡាចំហៀង និង កណ្ដាល',
  mount3:'ជើងចាប់ក្បឿង និង ជើង L', mount4:'តំណចាប់គ្រោង', mount5:'បាឡុង…',
  s3:'គ្រឿងបង្គុំប្រព័ន្ធអគ្គិសនី',
  e1:'ថាសដាក់ខ្សែ និង ឧបករណ៍លើកខ្សែ',
  e2:'ខ្សែ AC ចម្ងាយ 3.5ម៉ែត្រ ពីទូរភ្លើងសូឡាទៅទូរភ្លើងឌឺសង់ទ័រផ្ទះ',
  e3:'ខ្សែដី ១០០ ម៉ែត្រ (សម្រាប់ផ្ទាំងសូឡា និង អាំងវែទ័រ)',
  e4:'ខ្សែ DC ២៤០ ម៉ែត្រ', e5:'ប្រអប់ភ្លើងAC/DC', e6:'ឧបករណ៍ការពារAC/DC',
  pay1:'ក. ទូទាត់ ៤០% នៅថ្ងៃដែលអតិថិជនចុះហត្ថលេខាទៅលើសម្រង់តម្លៃ',
  pay2:'ខ. ទូទាត់ ៥០% នៅថ្ងៃដែលសម្ភារៈសូឡាបានដឹកជញ្ជូនទៅដល់ទីតាំងរបស់អតិថិជន',
  pay3:'គ. ទូទាត់ ១០% នៅថ្ងៃដែលប្រព័ន្ធសូឡាបានតម្លើងរួចរាល់ ដោយបានបញ្ចប់ការតេស្ដ និង ដាក់អោយដំណើរការប្រព័ន្ធសូឡាបានជោគជ័យ',
  sysprice:'តម្លៃប្រព័ន្ធ', total:'តម្លៃសរុប (ដុល្លារ):',
  vat10:'អាករលើបន្ថែម/VAT 10% :', grand:'សរុបរួមទាំងអាករ/Grand Total :',
  eff:'ប្រសិទ្ធភាពប្រព័ន្ធសូឡា៖',
  bill:'ថ្លៃវិក័យប័ត្រអគ្គិសនី', perMonth:'ដុល្លា/ខែ',
  tariff:'តម្លៃឯកតា (វិក័យប័ត្រអគ្គិសនី)', perKwh:'ដុល្លា/kWh',
  yearly:'បរិមាណថាមពលសូឡាផលិតបានប្រចាំឆ្នាំ', perYear:'kWh/ឆ្នាំ',
  produced:'តម្លៃថាមពលដែលបានផលិត', usdYear:'USD/ឆ្នាំ',
  exported:'ថ្លៃប៉ះប៉ូវទៅកាន់អគ្គិសនីកម្ពុជា',
  saved:'ប្រាក់សន្សំបាន', savedMonth:'ប្រាក់សន្សំបានប្រចាំខែ', usdMonth:'USD/ខែ',
  payback:'រយៈពេលស្រង់ដើមត្រលប់មកវិញ', months:'ខែ',
  note:'*ចំណាំ៖',
  f1:'១. លទ្ធផលដែលបានបង្ហាញ គឺជាការប៉ាន់ស្មានពី PVsyst ដោយផ្អែកលើទិន្នន័យប្រវត្តិសាស្រ្ត។ ប្រសិទ្ធភាពពិតប្រាកដនៃប្រព័ន្ធអាចខុសគ្នា អាស្រ័យលើអាកាសធាតុ លក្ខខណ្ឌទីតាំង និងកត្តាផ្សេងៗ។',
  f2:'២. ប្រាក់សន្សំជាក់ស្តែងអាចខុសគ្នា អាស្រ័យលើឥរិយាបថប្រើប្រាស់អគ្គិសនីរបស់អតិថិជន។',
  f3:'៣. តម្លៃដែលបានបង្ហាញក្នុងសម្រង់តម្លៃនេះ គ្រាន់តែជាការប៉ាន់ស្មានប៉ុណ្ណោះ។ តម្លៃចុងក្រោយនឹងផ្តល់ជូនបន្ទាប់ពីការត្រួតពិនិត្យជាក់ស្ដែងនៅទីតាំងផ្ទាល់របស់អតិថិជន។',
  f4:'៤. វិក័យប័ត្រអគ្គិសនី ការប្រើប្រាស់អគ្គិសនីជាមធ្យមរបស់អតិថិជន គឺផ្អែកលើព័ត៌មានដែលអតិថិជនបានផ្តល់ជូន។',
  terms:'លក្ខខណ្ឌផ្សេងៗ',
  t1:'សេវាថែទាំ', t1w:'ធានា ១ ឆ្នាំ',
  t1a:'ការត្រួតពិនិត្យទូទៅ ១ ដងរួមមាន៖',
  t1b:'ក. ត្រួតពិនិត្យហ្វុយហ្ស៊ីប (DC) , តង់ស្យុង AC/DC',
  t1c:'ខ. ត្រួតពិនិត្យប្រអប់ភ្លើង, MCB, តភ្ជាប់ចរន្ដ និង ខ្សែរដី',
  t1d:'គ. ត្រួតពិនិត្យចរន្ដ និង តង់ស្យុង',
  t1e:'រួមបញ្ចូលការផ្លាស់ប្តូរនូវឧបករណ៍ដូចខាងក្រោមចំនួន ១ដង',
  t1f:'ក. ហ្វុយហ្ស៊ីប    ខ. គ្រាប់ (ដុំភ្ជាប់) MC4 Connector    គ. AC/DC, MCB',
  t2:'រយៈពេលដឹកជញ្ជូន',
  t2a:'ក. សម្រាប់លំនៅឋាន៖ រយៈពេល ៧ ទៅ ១០ ថ្ងៃ បន្ទាប់ពីទទួលបានប្រាក់កក់',
  t2b:'ខ. សម្រាប់ឧស្សាហកម្ម និង ពាណិជ្ជកម្ម៖ រយៈពេល ៦ ទៅ ៨ សប្ដាហ៍បន្ទាប់ពីទទួលបានប្រាក់កក់',
  t2c:'*ចំណាំ: រយៈពេលដឹកជញ្ជូនអាចនឹងពន្យារពេល ដោយសារកត្តាដែលមិនអាចរំពឹងទុកបាន ដូចជា ការយឺតយ៉ាវពីអ្នកផ្គត់ផ្គង់ បញ្ហាការដឹកជញ្ជូន ឬស្ថានភាពផ្សេងៗទៀត។',
  t2d:'ចំណាំ: ការផ្លាស់ប្តូរឧបករណ៍ផ្សេងៗ នឹងធ្វើឡើងតែក្នុងករណីមានការបរាជ័យក្នុងប្រតិបត្តិការប៉ុណ្ណោះ (មិនរាប់បញ្ចូលការខូចខាតដែលបង្កឡើងដោយកំហុសមនុស្ស ការប្រើប្រាស់ខុសបច្ចេកទេស ឬកត្តាខាងក្រៅឡើយ)។',
  agree1:'តាមរយៈសម្រង់តម្លៃនេះ',
  agree2:'ខ្ញុំសូមឯកភាពទទួលយកការដេញថ្លៃសម្រាប់គម្រោងថាមពលពន្លឺ',
  agree3:'ព្រះអាទិត្យ យោងតាមលក្ខខណ្ឌបច្ចេកទេសក្នុងសម្រង់តម្លៃនេះ',
  approved:'អនុម័តដោយ:', approverName:'ឈ្មោះ៖ ជួប ពិសី',
  approverRole:'តួនាទី៖ ប្រធានផ្នែកលក់ និង ទីផ្សារ',
  custSign:'ហត្ថលេខាអតិថិជន និង ត្រា', signName:'ឈ្មោះ :', signDate:'កាលបរិច្ឆេទ :',
  dots:'………………………………….', dots2:'....................................................................',
  page:'Page'
};
/* EDC's published compensation rate card, banded by inverter kWac. The band
   under 10 kWac is blank on their sheet, which means no fee — the same
   threshold EDC paperwork already turns on. Ceilings are inclusive: "over 10
   up to 50" means 10 itself pays nothing. */
const EDC_RATES=[[10,0],[50,0.037],[100,0.047],[200,0.052],[500,0.055],[1000,0.058],[Infinity,0.06]];
/* null, not zero, when the size is unknown: a blank box asks to be filled in,
   a zero looks like an answer */
function edcRate(kwac){
  const k=Number(kwac||0);
  if(!k)return null;
  for(const [ceiling,rate] of EDC_RATES) if(k<=ceiling) return rate;
  return 0.06;
}
/* Deye's SG05LP hybrid range is named by size and phase, so the part number is
   a formula. The sizes are listed rather than derived because inventing a
   SUN-9K would put a part number on a customer's quotation that cannot be
   ordered. Phase comes from the ampere/phase field, which already carries
   1P or 3P. */
const DEYE_SG05LP={'1':[7,8,10],'3':[5,6,8,10,12]};
function inverterModel(brand,kw,phaseType){
  if(brand!=='Deye')return '';
  const p=/3P/.test(phaseType||'')?'3':/1P/.test(phaseType||'')?'1':'';
  const n=Number(kw||0);
  if(!p||!n||!DEYE_SG05LP[p].includes(n))return '';
  return 'SUN-'+n+'K-SG05LP'+p+'-EU-SM2';
}
/* ANTI-DARK's SCAE-A rack is 51.2V throughout, so the part number is the
   amp-hour rating and the capacity follows from it: 100Ah is 5.12 kWh, 200Ah
   is 10.24, 300Ah is 15.36. Listed rather than derived for the same reason as
   the inverters — only these three are stocked. */
const SCAE_A=[[5.12,100],[10.24,200],[15.36,300]];
function batteryModel(brand,kwhEach){
  if(!/anti.?dark/i.test(brand||''))return '';
  const k=Number(kwhEach||0);
  const hit=SCAE_A.find(([kwh])=>Math.abs(kwh-k)<0.01);
  return hit?'SCAE-A-51.2-'+hit[1]:'';
}
/* LONGi's part numbers are not a formula — HGD at 625W, HYD at 645W — so this
   stays a plain lookup on the wattage the app already stores. */
const LONGI_LR8={625:'LR8-66HGD-625M',645:'LR8-66HYD-645M'};
function panelModel(brand,watt){
  if(!/longi/i.test(brand||''))return '';
  return LONGI_LR8[Number(watt||0)]||'';
}
/* One photo per product family. The Deye SG05LP units share a casing and the
   LONGi LR8 panels are shot as a set, so those are one file each; the
   ANTI-DARK racks differ by size and get one apiece. Files live in img/. A
   file that is not there hides its own cell rather than printing a broken
   image on a customer's quotation. */
const PRODUCT_IMG={
  'LR8-66HGD-625M':'img/longi-lr8.png',
  'LR8-66HYD-645M':'img/longi-lr8.png',
  'SCAE-A-51.2-100':'img/scae-a-51-2-100.png',
  'SCAE-A-51.2-200':'img/scae-a-51-2-200.png',
  'SCAE-A-51.2-300':'img/scae-a-51-2-300.png'
};
const imgFor=model=>!model?''
  :/^SUN-\d+K-SG05LP[13]-EU-SM2$/.test(model)?'img/deye-sg05lp.png'
  :(PRODUCT_IMG[model]||'');
/* a blank the salesperson fills in on screen before printing */
const qb=(w,val)=>`<span class="fill" contenteditable="true" style="min-width:${w}px">${val==null?'':esc(String(val))}</span>`;
const qnum=n=>n||n===0?Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'';

function printQuote(quotId,leadId){
  const q=(QUOTS||[]).find(x=>x.id===quotId)||(LEADQUOTS||[]).find(x=>x.id===quotId);
  if(!q){toast('Could not find that quotation');return;}
  const l=(LEADS||[]).find(x=>x.id===(leadId||q.lead_id))||q.leads||{};
  const kwp=Number(q.panel_kwp||0)||((Number(q.panel_watt||0)*Number(q.panel_pcs||0))/1000);
  const kwac=(Number(q.inverter_kw||0)*Number(q.inverter_pcs||0))||Number(q.inverter_kw_total||0);
  const addr=[l.site_address,l.commune,l.district,l.province||l.city_province].filter(Boolean).join(', ');
  const price=Number(q.price_usd||0);
  /* their own workbook: kWp x 4 peak sun hours x 365 days */
  const annual=Math.round(kwp*4*365);
  /* the band comes from the inverter, which is why kWac is worked out above */
  const edcRateUsd=edcRate(kwac);
  /* the document opens on about:blank, so a relative img src would resolve
     against nothing — every picture needs the app's own address in front */
  const base=location.origin+location.pathname.replace(/[^/]*$/,'');
  const w=window.open('','_blank');
  if(!w){toast('Allow pop-ups to print the quotation');return;}
  w.document.write(quoteHtml(q,l,{kwp,kwac,addr,price,annual,edcRate:edcRateUsd,base}));
  w.document.close();
}

function quoteHtml(q,l,c){
  /* onerror empties the cell, so a photo that has not been added yet leaves a
     blank box on the sheet instead of a broken-image icon */
  const row=(no,desc,qty,img)=>`<tr><td class="n">${no||''}</td><td>${desc}</td>`
    +`<td class="im">${img?`<img src="${esc((c.base||'')+img)}" alt="" onerror="this.remove()">`:''}</td>`
    +`<td class="q">${qty||''}</td></tr>`;
  /* the part number, worked out from what the salesperson already keyed in */
  const mPanel=panelModel(q.panel_brand,q.panel_watt);
  const mInv=inverterModel(q.inverter_brand,q.inverter_kw,q.ampere_phase);
  const mBatt=batteryModel(q.battery_brand,q.battery_kwh_each||q.battery_kwh);
  const recalc=`<scr`+`ipt>
    function recalc(){
      const g=id=>parseFloat((document.getElementById(id).innerText||'').replace(/[^0-9.]/g,''))||0;
      const f=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const price=${c.price||0};
      const vat=price*0.10;
      document.getElementById('o-vat').innerText='$'+f(vat);
      document.getElementById('o-grand').innerText='$'+f(price+vat);
      const val=g('f-annual')*g('f-tariff');
      /* EDC compensation is the band rate on everything produced in the year,
         so it follows the annual figure instead of being typed again */
      const exp=g('f-annual')*g('f-edcrate');
      document.getElementById('o-export').innerText=f(exp);
      const year=val-exp, mon=year/12;
      document.getElementById('o-prod').innerText=f(val);
      document.getElementById('o-year').innerText=f(year);
      document.getElementById('o-mon').innerText=f(mon);
      /* payback is worked from the price before VAT either way, which is what
         their own workbook does */
      document.getElementById('o-pay').innerText=mon>0?f(price/mon):'';
    }
    /* some customers are quoted with VAT and some without, so the two lines
       come off the sheet rather than being crossed out by hand */
    function vatToggle(){
      const on=document.getElementById('vat-on').checked;
      document.getElementById('r-vat').style.display=on?'':'none';
      document.getElementById('r-grand').style.display=on?'':'none';
    }
    document.addEventListener('input',recalc);
    document.getElementById('vat-on').addEventListener('change',vatToggle);
    window.addEventListener('load',function(){recalc();vatToggle();});
  </scr`+`ipt>`;
  const kwpTxt=c.kwp?c.kwp.toFixed(2):'';
  return `<!doctype html><html lang="km"><head><meta charset="utf-8">
<title>${QT.title} ${esc(l.customer_name||'')}</title>
<style>
  @page{size:A4;margin:12mm 10mm}
  body{font-family:'Khmer OS Siemreap','Khmer OS','Noto Sans Khmer','Century Gothic',Arial,sans-serif;
       font-size:10px;color:#111;margin:0;line-height:1.55}
  .sheet{width:190mm;margin:0 auto;padding:0 0 8mm}
  .bar{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #ccc;margin-bottom:10px}
  .bar button{font:inherit;padding:6px 14px;cursor:pointer}
  .bar label{display:flex;align-items:center;gap:5px;font-size:12px;color:#333;cursor:pointer;white-space:nowrap}
  h1{font-size:17px;text-align:center;margin:6px 0 2px}
  .co{text-align:center;font-size:9px;line-height:1.35;color:#333}
  .co b{font-size:11px}
  table{width:100%;border-collapse:collapse}
  .meta td{padding:2px 4px;font-size:10px;vertical-align:top}
  .meta .lab{color:#333;white-space:nowrap}
  .items{margin-top:8px;border:1px solid #999}
  .items th{background:#eee;border:1px solid #999;padding:4px;font-size:10px}
  .items td{border:1px solid #999;padding:3px 5px;vertical-align:top}
  .items td.n{width:24px;text-align:center}
  .items td.im{width:64px;text-align:center;vertical-align:middle}
  .items td.im img{max-width:56px;max-height:60px;display:inline-block}
  .items td.q{width:80px;text-align:center}
  .sec{font-weight:bold}
  .fill{display:inline-block;border-bottom:1px dotted #666;min-height:12px;padding:0 3px;
        background:#fffbe8;outline:none}
  .money{margin-top:6px;margin-left:auto;width:auto}
  .money td{padding:2px 6px;font-size:11px}
  .money td.v{text-align:right;font-variant-numeric:tabular-nums;min-width:110px;font-weight:bold}
  .sav td{padding:2px 4px;font-size:10px}
  .sav .v{text-align:right;font-variant-numeric:tabular-nums;min-width:80px}
  .rate{font-size:9px;color:#555}
  .fn{font-size:8.5px;color:#333;margin-top:8px;line-height:1.45}
  .sign{display:flex;gap:30px;margin-top:20px;font-size:10px}
  .sign > div{flex:1}
  .pg{text-align:center;font-size:8.5px;color:#555;margin-top:6px}
  @media print{.bar{display:none}.fill{background:none;border-bottom:1px dotted #666}
    .sheet{page-break-after:always}.sheet:last-child{page-break-after:auto}}
</style></head><body>
<div class="bar">
  <button onclick="window.print()">Print / Save as PDF</button>
  <label><input type="checkbox" id="vat-on" checked> Include VAT (10%)</label>
  <span style="font-size:11px;color:#555;align-self:center">Every line can be edited. Yellow marks what changes on each quotation.</span>
</div>

<div class="sheet" contenteditable="true">
  <div class="co"><b>${QT.company}</b><br>${QT.addr1}<br>${QT.addr2}<br>${QT.tel}</div>
  <h1>${QT.title}</h1>

  <table class="meta">
    <tr><td class="lab">${QT.cust}</td><td>${esc(l.customer_name||'')}</td>
        <td class="lab">${QT.date}</td><td>${fmtDate(q.released_date||q.created_at)}</td></tr>
    <tr><td class="lab">${QT.addr}</td><td>${esc(c.addr)}</td>
        <td class="lab">${QT.systype}</td><td>${esc(q.system_type||'')}</td></tr>
    <tr><td class="lab">${QT.phone}</td><td>${esc(l.phone||'')}</td>
        <td class="lab">${QT.valid}</td><td>${qb(50,QT.validDays)}</td></tr>
    <tr><td class="lab">${QT.vat}</td><td>${qb(110)}</td>
        <td class="lab">${QT.size}</td><td>${qb(46,kwpTxt)} kWp</td></tr>
    <tr><td class="lab">${QT.project}</td><td>${qb(150,QT.projectVal)}</td>
        <td class="lab">${QT.battsize}</td><td>${esc(q.battery_kwh||'')} kWh</td></tr>
    <tr><td class="lab">${QT.projectref}</td><td>${qb(90,QT.na)}</td>
        <td class="lab">${QT.teamref}</td><td>${qb(90,QT.na)}</td></tr>
  </table>

  <div style="font-weight:bold;margin-top:8px">${QT.supply}</div>
  <div>${QT.mgmtFor(q.system_type,kwpTxt)}</div>

  <table class="items">
    <thead><tr><th>${QT.no}</th><th>${QT.desc}</th><th>${QT.img}</th><th>${QT.qty}</th></tr></thead>
    <tbody>
      ${row('១','<span class="sec">'+QT.s1+'</span><br>ក. '+QT.s1a+'<br>'+QT.s1b+'<br>'+QT.s1c+'<br>'+QT.s1d+'<br>'+QT.s1e+'<br>'+QT.s1f,'')}
      ${row('២','<span class="sec">'+QT.s2+'</span>','')}
      ${row('',QT.s2a
             +'<br>* '+QT.model+' : '+qb(170,mPanel||q.panel_brand||'')+' &nbsp; '+QT.warranty+': '+qb(22)+' ឆ្នាំ'
             +'<br>* '+QT.panelsize+' : '+(q.panel_watt||'')+'Wp &nbsp; ធានាលើប្រសិទ្ធភាព: '+qb(22)+' ឆ្នាំ',
             (q.panel_pcs||'')+' '+QT.unitPanel, imgFor(mPanel))}
      ${row('',QT.s2b
             +'<br>* '+QT.model+' : '+qb(170,mInv||q.inverter_brand||'')+' &nbsp; '+QT.warranty+': '+qb(22)+' ឆ្នាំ'
             +'<br>* '+QT.invsize+' : '+(c.kwac?c.kwac.toFixed(2):'')+' kWac',
             (q.inverter_pcs||'')+' '+QT.unitPiece, imgFor(mInv))}
      ${row('',QT.s2c
             +'<br>* '+QT.model+' : '+qb(170,mBatt||q.battery_brand||'')+' &nbsp; '+QT.warranty+': '+qb(22)+' ឆ្នាំ'
             +'<br>* '+QT.battcap+' : '+esc(q.battery_kwh_each||q.battery_kwh||'')+' kWh',
             (q.battery_pcs||'')+' '+QT.unitPiece, imgFor(mBatt))}
      ${row('',QT.s2d+'<br>* '+QT.mount1+'<br>* '+QT.mount2+'<br>* '+QT.mount3+'<br>* '+QT.mount4+'<br>* '+QT.mount5,
             qb(60,'1 '+QT.unitSet))}
      ${row('៣','<span class="sec">'+QT.s3+'</span><br>* '+QT.e1+'<br>* '+QT.e2+'<br>* '+QT.e3+' &nbsp; '+QT.warrantyN(7)
             +'<br>* '+QT.e4+'<br>* '+QT.e5+'<br>* '+QT.e6,
             qb(60,'1 '+QT.unitSet))}
      ${row('',QT.pay1+'<br>'+QT.pay2+'<br>'+QT.pay3,'')}
    </tbody>
  </table>

  <table class="money">
    <tr><td>${QT.total}</td><td class="v">$${qnum(c.price)}</td></tr>
    <tr id="r-vat"><td>${QT.vat10}</td><td class="v" id="o-vat"></td></tr>
    <tr id="r-grand"><td>${QT.grand}</td><td class="v" id="o-grand"></td></tr>
  </table>

  <div style="margin-top:8px">${QT.eff} ${qb(60)}</div>
  <table class="sav" style="width:auto">
    <tr><td>${QT.bill}</td><td class="v">${qb(60,l.monthly_bill_usd||'')}</td><td>${QT.perMonth}</td></tr>
    <tr><td>${QT.tariff}</td><td class="v"><span class="fill" id="f-tariff" contenteditable="true">0.183</span></td><td>${QT.perKwh}</td></tr>
    <tr><td>${QT.yearly}</td><td class="v"><span class="fill" id="f-annual" contenteditable="true">${c.annual||''}</span></td><td>${QT.perYear}</td></tr>
    <tr><td>${QT.produced}</td><td class="v" id="o-prod"></td><td>${QT.usdYear}</td></tr>
    <tr><td>${QT.exported} <span class="rate">(<span class="fill" id="f-edcrate" contenteditable="true">${c.edcRate==null?'':c.edcRate}</span> ${QT.perKwh})</span></td>
        <td class="v" id="o-export"></td><td>${QT.usdYear}</td></tr>
    <tr><td>${QT.saved}</td><td class="v" id="o-year"></td><td>${QT.usdYear}</td></tr>
    <tr><td>${QT.savedMonth}</td><td class="v" id="o-mon"></td><td>${QT.usdMonth}</td></tr>
    <tr><td>${QT.payback}</td><td class="v" id="o-pay"></td><td>${QT.months}</td></tr>
  </table>

  <div class="fn">${QT.note}<br>${QT.f1}<br>${QT.f2}<br>${QT.f3}<br>${QT.f4}</div>
  <div class="pg">${QT.page} 1/2</div>
</div>

<div class="sheet" contenteditable="true">
  <div class="co"><b>${QT.company}</b><br>${QT.addr1}<br>${QT.addr2}<br>${QT.tel}</div>
  <h1 style="font-size:14px">${QT.terms}</h1>
  <table class="items">
    <thead><tr><th>${QT.no}</th><th>${QT.desc}</th><th>${QT.img}</th><th>${QT.warranty}</th></tr></thead>
    <tbody>
      ${row('១','<span class="sec">'+QT.t1+'</span><br>* '+QT.t1a+'<br>'+QT.t1b+'<br>'+QT.t1c+'<br>'+QT.t1d
             +'<br>* '+QT.t1e+'<br>'+QT.t1f,QT.t1w)}
      ${row('២','<span class="sec">'+QT.t2+'</span><br>'+QT.t2a+'<br>'+QT.t2b+'<br>'+QT.t2c+'<br>'+QT.t2d,'')}
    </tbody>
  </table>

  <p style="margin-top:16px;font-size:10px">${QT.agree1} ${QT.agree2}<br>${QT.agree3}</p>
  <div class="sign">
    <div>
      <div>${QT.approved}</div>
      <div>${QT.dots}</div>
      <div>${QT.approverName}</div>
      <div>${QT.approverRole}</div>
      <div>${QT.company}</div>
    </div>
    <div>
      <div>${QT.custSign}</div>
      <div>${QT.dots2}</div>
      <div>${QT.signName} ${qb(140)}</div>
      <div>${QT.signDate} ${qb(140)}</div>
    </div>
  </div>
  <div class="pg">${QT.page} 2/2</div>
</div>
${recalc}
</body></html>`;
}
