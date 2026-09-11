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
  /* the project reference is the lead's own ref ID, so a customer and the
     office are talking about the same deal. It falls back to N/A only for a
     lead that has not qualified yet and so has no ref. The team reference is
     still N/A - nothing in the app issues one. */
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
  sysprice:'តម្លៃប្រព័ន្ធ', total:'តម្លៃសរុប (ដុល្លា):',
  discount:'បញ្ចុះតម្លៃ', netTotal:'សរុប/Total :',
  vat10:'អាករលើបន្ថែម/VAT 10% :', grand:'សរុបរួមទាំងអាករ/Grand Total :',
  eff:'ប្រសិទ្ធភាពប្រព័ន្ធសូឡា៖',
  bill:'ថ្លៃវិក័យប័ត្រអគ្គិសនី', perMonth:'ដុល្លា/ខែ',
  tariff:'តម្លៃឯកតា (វិក័យប័ត្រអគ្គិសនី)', perKwh:'ដុល្លា/kWh',
  yearly:'បរិមាណថាមពលសូឡាផលិតបានប្រចាំឆ្នាំ', perYear:'kWh/ឆ្នាំ',
  produced:'តម្លៃថាមពលដែលបានផលិត', usdYear:'USD/ឆ្នាំ',
  exported:'ថ្លៃប៉ះប៉ូវទៅកាន់អគ្គិសនីកម្ពុជា',
  saved:'ប្រាក់សន្សំបាន', savedMonth:'ប្រាក់សន្សំបានប្រចាំខែ', usdMonth:'USD/ខែ',
  payback:'រយៈពេលស្រង់ដើមត្រលប់មកវិញ', months:'ខែ', years:'ឆ្នាំ',
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
/* Yinergy's HI-LV hybrids are single-phase only and stocked at 6 and 8 kW.
   A 3P job on this brand is not a part number we can print. */
const YINERGY_HI_LV=[6,8];
/* Urayzero stock one model and its part number does not carry the phase, so
   this is a plain lookup on size and says nothing about 1P or 3P. */
const URAYZERO={10:'LABCT10KW-WIFI'};
/* Admin edits the brand lists, so a brand is matched on what it says rather
   than on one exact string. ANTI-DARK was shortened to AD on the Lists screen
   on 9 Sep 2026 and every SCAE-A part number and photo went with it. The
   answer is to read the name loosely, not to stop her editing: add whatever
   spelling turns up here and the part numbers follow it. */
const BRAND_PATTERNS={
  panel:{LONGi:/longi/i},
  inverter:{Deye:/^deye$/i, Yinergy:/^yinergy$/i, Urayzero:/^uray.?zero$/i},
  battery:{'ANTI-DARK':/anti.?dark|^ad$/i, Yinergy:/^yinergy$/i, Deye:/^deye$/i}
};
const isBrand=(kind,name,brand)=>BRAND_PATTERNS[kind][name].test((brand||'').trim());
function inverterModel(brand,kw,phaseType){
  const p=/3P/.test(phaseType||'')?'3':/1P/.test(phaseType||'')?'1':'';
  const n=Number(kw||0);
  if(isBrand('inverter','Urayzero',brand))return URAYZERO[n]||'';
  if(isBrand('inverter','Yinergy',brand))
    return (p==='1'&&YINERGY_HI_LV.includes(n))?'HI-1P'+n+'K-LV':'';
  if(!isBrand('inverter','Deye',brand))return '';
  if(!p||!n||!DEYE_SG05LP[p].includes(n))return '';
  return 'SUN-'+n+'K-SG05LP'+p+'-EU-SM2';
}
/* ANTI-DARK's SCAE-A rack is 51.2V throughout, so the part number is the
   amp-hour rating and the capacity follows from it: 100Ah is 5.12 kWh, 200Ah
   is 10.24, 300Ah is 15.36. Listed rather than derived for the same reason as
   the inverters — only these three are stocked. */
const SCAE_A=[[5.12,100],[10.24,200],[15.36,300]];
/* Yinergy's BLW wall battery is named by its capacity, so the part number is
   the kWh itself. Two sizes are stocked. */
const YINERGY_BLW=[4.8,9.6];
/* Deye's F-series battery is named by its capacity, the same shape as the
   Yinergy BLW. One size stocked. */
const DEYE_BATT={16:'SE-F16'};
function batteryModel(brand,kwhEach){
  const k=Number(kwhEach||0);
  if(isBrand('battery','Deye',brand))return DEYE_BATT[k]||'';
  if(isBrand('battery','Yinergy',brand)){
    const y=YINERGY_BLW.find(kwh=>Math.abs(kwh-k)<0.01);
    return y?'BLW '+y:'';
  }
  if(!isBrand('battery','ANTI-DARK',brand))return '';
  const hit=SCAE_A.find(([kwh])=>Math.abs(kwh-k)<0.01);
  return hit?'SCAE-A-51.2-'+hit[1]:'';
}
/* LONGi's part numbers are not a formula — HGD at 625W, HYD at 645W — so this
   stays a plain lookup on the wattage the app already stores. */
const LONGI_LR8={625:'LR8-66HGD-625M',645:'LR8-66HYD-645M'};
function panelModel(brand,watt){
  if(!isBrand('panel','LONGi',brand))return '';
  return LONGI_LR8[Number(watt||0)]||'';
}
/* One photo per product family. The Deye SG05LP units share a casing and the
   Yinergy models do too, so those are one file each; the ANTI-DARK racks
   differ by size and get one apiece. Files live in img/. A file that is not
   there hides its own cell rather than printing a broken image on a
   customer's quotation. */
const PRODUCT_IMG={
  'LABCT10KW-WIFI':'img/urayzero-labct.png',
  'SE-F16':'img/deye-se-f16.png',
  'HI-1P6K-LV':'img/yinergy-hi-lv.png',
  'HI-1P8K-LV':'img/yinergy-hi-lv.png',
  'BLW 4.8':'img/yinergy-blw.png',
  'BLW 9.6':'img/yinergy-blw.png',
  'SCAE-A-51.2-100':'img/scae-a-51-2-100.png',
  'SCAE-A-51.2-200':'img/scae-a-51-2-200.png',
  'SCAE-A-51.2-300':'img/scae-a-51-2-300.png'
};
/* A panel is a panel: every brand is the same blue rectangle, so they share
   one photo and it shows even where no part number derives. An inverter and a
   battery are not interchangeable to look at, so those stay keyed off the
   part number and an unmatched brand shows nothing rather than the wrong box. */
function imgFor(model,kind,brand,size){
  if(model){
    if(/^SUN-\d+K-SG05LP[13]-EU-SM2$/.test(model))return 'img/deye-sg05lp.png';
    if(PRODUCT_IMG[model])return PRODUCT_IMG[model];
  }
  if(kind==='Panel')return 'img/panel.png';
  /* An inverter with no ampere-and-phase keyed in derives no part number,
     because SG05LP1 and SG05LP3 are different things to order. The casing is
     the same either way, so the picture can still be shown - but only at a
     size they actually stock, so an unstockable size stays blank the way its
     part number does. A photo of the wrong hardware is the same mistake as an
     invented part number. */
  if(kind==='Inverter'&&size){
    const n=Number(size)||0;
    if(isBrand('inverter','Deye',brand)
       &&(DEYE_SG05LP['1'].includes(n)||DEYE_SG05LP['3'].includes(n)))return 'img/deye-sg05lp.png';
    if(isBrand('inverter','Yinergy',brand)&&YINERGY_HI_LV.includes(n))return 'img/yinergy-hi-lv.png';
    if(isBrand('inverter','Urayzero',brand)&&URAYZERO[n])return 'img/urayzero-labct.png';
  }
  return '';
}
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
  /* their column order: number, description, quantity, picture */
  const cell=(base,img)=>img?`<img src="${esc((base||'')+img)}" alt="" onerror="this.remove()">`:'';
  const row=(no,desc,qty,img)=>`<tr><td class="n">${no||''}</td><td>${desc}</td>`
    +`<td class="q">${qty||''}</td><td class="im">${cell(c.base,img)}</td></tr>`;
  /* one product inside the components row: description, quantity with its
     warranty under it, photo. No rules - the outer row draws the only ones. */
  const grpRow=(desc,qty,wty,img,base)=>`<tr><td>${desc}</td>`
    +`<td class="q">${qty||''}${wty||''}</td><td class="im">${cell(base,img)}</td></tr>`;
  /* the part number, worked out from what the salesperson already keyed in */
  const mPanel=panelModel(q.panel_brand,q.panel_watt);
  const mInv=inverterModel(q.inverter_brand,q.inverter_kw,q.ampere_phase);
  const mBatt=batteryModel(q.battery_brand,q.battery_kwh_each||q.battery_kwh);
  const recalc=`<scr`+`ipt>
    function recalc(){
      /* a row can be absent from the sheet entirely - EDC compensation is not
         printed below 10 kWac - so a missing box reads as nothing, not a crash */
      const g=id=>{const e=document.getElementById(id);
        return e?(parseFloat((e.innerText||'').replace(/[^0-9.]/g,''))||0):0;};
      const put=(id,v)=>{const e=document.getElementById(id);if(e)e.innerText=v;};
      const f=n=>n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
      const price=${c.price||0};
      const vat=price*0.10;
      document.getElementById('o-vat').innerText='$'+f(vat);
      document.getElementById('o-grand').innerText='$'+f(price+vat);
      /* off VAT the price is negotiated: whatever is typed on the two lines
         comes off, and the total is worked out rather than typed, so nobody
         does the sum by hand on a customer's sheet */
      const net=price-g('f-d1')-g('f-d2');
      document.getElementById('o-net').innerText='$'+f(net);
      const val=g('f-annual')*g('f-tariff');
      /* EDC compensation is the band rate on everything produced in the year,
         so it follows the annual figure instead of being typed again */
      const exp=g('f-annual')*g('f-edcrate');
      put('o-export',f(exp));
      const year=val-exp, mon=year/12;
      document.getElementById('o-prod').innerText=f(val);
      document.getElementById('o-year').innerText=f(year);
      document.getElementById('o-mon').innerText=f(mon);
      /* Their own sheet works payback in MONTHS: the total over the monthly
         saving, and the unit cell reads ខែ. It follows the VAT tick, because a
         customer quoted without VAT never pays the grand total and should not
         be shown earning it back. */
      const total=document.getElementById('vat-on').checked?price+vat:net;
      document.getElementById('o-pay').innerText=mon>0?f(total/mon):'';
    }
    /* some customers are quoted with VAT and some without, so the two lines
       come off the sheet rather than being crossed out by hand */
    function vatToggle(){
      const on=document.getElementById('vat-on').checked;
      document.getElementById('r-vat').style.display=on?'':'none';
      document.getElementById('r-grand').style.display=on?'':'none';
      /* the discount lines are the other half of the same switch: with VAT
         the customer pays the grand total, without it they pay a negotiated
         price, and only one of those can be on the sheet at a time */
      ['r-d1','r-d2','r-net'].forEach(function(id){
        document.getElementById(id).style.display=on?'none':'';
      });
      recalc();
    }
    document.addEventListener('input',recalc);
    document.getElementById('vat-on').addEventListener('change',vatToggle);
    window.addEventListener('load',function(){recalc();vatToggle();});
  </scr`+`ipt>`;
  const kwpTxt=c.kwp?c.kwp.toFixed(2):'';
  return `<!doctype html><html lang="km"><head><meta charset="utf-8">
<title>${QT.title} ${esc(l.customer_name||'')}</title>
<style>
  /* Zero page margin, and the sheet carries its own instead. Chrome prints
     its URL, date and "1/2" into the page margin, so with no margin there is
     nowhere for them to go and they stop appearing - no ticking of "Headers
     and footers" in the print dialog, which nobody remembers to do. The
     printable area is unchanged: 210mm less 10mm each side is the same 190mm
     of content, and 297mm less 12mm top and bottom the same 273mm. */
  @page{size:A4;margin:0}
  body{font-family:'Khmer OS Siemreap','Khmer OS','Noto Sans Khmer','Century Gothic',Arial,sans-serif;
       font-size:10px;color:#111;margin:0;line-height:1.2}
  .sheet{width:210mm;margin:0 auto;padding:12mm 10mm 12mm;box-sizing:border-box}
  .bar{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #ccc;margin-bottom:10px}
  .bar button{font:inherit;padding:6px 14px;cursor:pointer}
  .bar label{display:flex;align-items:center;gap:5px;font-size:12px;color:#333;cursor:pointer;white-space:nowrap}
  h1{font-size:17px;text-align:center;margin:1px 0}
  /* the wordmark is far wider than it is tall, so it is sized on height and
     capped on width; print-color-adjust keeps the orange from being dropped
     by a printer economising on ink */
  /* the logo sits at the left margin and the company block stays centred on
     the page, so taking the logo out does not shift the address */
  /* their sheet rules off under the header block */
  .hdr{position:relative;min-height:11mm;margin-bottom:1.5mm;
       border-bottom:1px solid #333;padding-bottom:1mm}
  .logo{position:absolute;left:0;top:0;height:10mm;max-width:52mm;object-fit:contain;
        print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .co{text-align:center;font-size:9px;line-height:1.25;color:#333}
  .co b{font-size:11px}
  table{width:100%;border-collapse:collapse}
  /* labels run up to the colon and the values start on one line, the way
     theirs reads - so the label column is right-aligned, not left */
  .meta td{padding:0 4px;font-size:10px;vertical-align:top}
  .meta .lab{color:#111;white-space:nowrap;text-align:right;width:1%}
  .meta .val{font-weight:bold}
  .meta .num{display:inline-block;min-width:38px;text-align:right;font-weight:bold}
  .meta .unit{font-weight:normal}
  .items{margin-top:2px;border:1px solid #999}
  .items th{background:#eee;border:1px solid #999;padding:3px;font-size:10px}
  .items td{border:1px solid #999;padding:1px 5px;vertical-align:top}
  .items td.n{text-align:center}
  /* their column order: number, description, quantity, picture - and the
     picture column is wide enough for the photo to be read as a photo */
  .items col.c-n{width:7%} .items col.c-d{width:51%}
  .items col.c-q{width:19%} .items col.c-i{width:23%}
  .items td.im{text-align:center;vertical-align:middle}
  .items td.im img{max-width:92%;max-height:16mm;display:inline-block}
  .items td.q{text-align:center}
  /* the quantity, then the warranty under it, both in the quantity column -
     theirs carries the warranty here rather than inline in the description */
  .wty{display:block;margin-top:1px;font-size:9px;white-space:nowrap}
  /* one row of the sheet holding several products: an inner table on the same
     column widths, so each photo and quantity sits beside its own block with
     no rule drawn between them */
  .items .kvt td{border:none;padding:0 4px 0 0}
  td.grp{padding:0}
  .grp table{width:100%}
  /* no rule between one product and the next, but the column rules still run
     the full height of the row - without them the grid stops dead at this row */
  .grp td{border:none;padding:1px 5px}
  .grp td+td{border-left:1px solid #999}
  /* a rule under each product. Their own sheet runs these blocks together
     with no rule at all; Kevin asked for them separated, 11 Sep 2026. The
     heading and the first block stay joined, so it starts at the third row. */
  .grp tr:nth-child(n+3) td{border-top:1px solid #999}
  .sec{font-weight:bold}
  .sec2{font-weight:bold;font-size:11px}
  .it{font-style:italic}
  .ind{padding-left:14px}
  .ind2{padding-left:26px}
  /* the model and its value on one line with the colons in a column, the way
     theirs lines them up down the block */
  .kv{display:inline-block;min-width:120px}
  .kv2{display:inline-block;min-width:150px}
  .fill{display:inline-block;border-bottom:1px dotted #666;min-height:12px;padding:0 3px;
        background:#fffbe8;outline:none}
  /* the VAT tick lives beside the totals it changes, not up in the toolbar.
     Unticked, the VAT and grand total lines come off and the sale engineer is
     left with the price to edit - a discount or a promotion goes in by hand.
     It is a control, not part of the sheet, so it never prints. */
  .vatbox{width:auto;margin:2px 0 0 auto;text-align:right;font-size:10px;color:#555}
  .vatbox label{cursor:pointer}
  /* -1px, not 0: the items table and this one each draw their own 1px edge,
     so butting them together would leave a double rule. Overlapping by a pixel
     makes the two read as one continuous grid, the way theirs does. */
  .money{margin-top:-1px;width:100%;border:1px solid #999;border-collapse:collapse}
  .money td{border:1px solid #999}
  /* the heading is its own row, ruled off like theirs - dropping the bottom
     border made it read as one tall merged cell with the terms below it */
  .money td.hd,.money td.lbl2{padding:3px 6px}
  .money td.tot{text-align:right;font-weight:bold}
  /* the same column grid as the items table above it: the terms span the
     first three columns and the price sits under the picture column, which is
     where their own sheet puts it */
  /* the price column must be the width of the picture column above it, or
     the rule under the items table steps sideways where the two join */
  .money col.c-l{width:77%} .money col.c-v{width:23%}
  .money td{padding:1px 6px;font-size:11px}
  /* the figure the customer actually pays, highlighted the way their own sheet
     highlights it - grand total with VAT, the negotiated total without. The
     colour has to survive a printer economising on ink, so it is forced. */
  /* the price column carries a heading above it. The payment terms are black:
     their sheet has them red, Kevin wants them black. */
  .pay{color:#111;font-weight:bold}
  .money td.hd{text-align:center;font-weight:bold;border-bottom:1px solid #999;font-size:11px}
  .money td.paid{background:#ffe94d;font-size:13px;
                 print-color-adjust:exact;-webkit-print-color-adjust:exact}
  /* centred in its column, as theirs is, not pushed to the right edge */
  .money td.v{text-align:center;font-variant-numeric:tabular-nums;font-weight:bold;vertical-align:middle}
  /* a typed figure that changes the total is boxed, and stays boxed in print -
     the dotted .fill underline is for blanks nobody adds up */
  .box{display:inline-block;border:1px solid #999;border-radius:2px;padding:0 4px;
       min-height:13px;background:#fffbe8;outline:none}
  .box.num{min-width:80px;text-align:right;font-variant-numeric:tabular-nums}
  .box.lbl{min-width:120px;text-align:left;font-weight:normal}
  .sav td{padding:0 4px;font-size:10px}
  /* figure right-aligned and bold, its unit left-aligned beside it - theirs
     reads as a column of numbers with a column of units, not a sentence */
  .sav .v{text-align:right;font-variant-numeric:tabular-nums;min-width:80px;font-weight:bold}
  .sav .u{text-align:left;white-space:nowrap;padding-left:6px}
  .rate{font-size:9px;color:#555}
  /* the savings figures and the notes sit side by side at the foot of page
     one, the notes boxed on the right - the client's own sheet reads that way,
     and stacking them cost 25mm of a page that has none to spare */
  /* the notes box and the savings table finish level: the box stretches to
     the taller of the two rather than stopping short of it */
  .lower{display:flex;gap:5mm;align-items:stretch;margin-top:3px}
  .lower-l{flex:0 0 auto}
  /* their own sheet's colours: the two headings in red, the body of both
     blocks in navy. Forced to print - a quotation that loses its colour on
     paper is not the document they recognise. */
  .lower-h{font-weight:bold;color:#c00000;
           print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .sav td{color:#111}
  .fn{flex:1;font-size:8.5px;color:#111;line-height:1.3;
      border:1px solid #333;border-radius:2px;padding:3px 6px;
      print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .fn b{color:#c00000}
  /* both signature blocks are bordered boxes on their sheet, and the sentence
     the customer is agreeing to sits inside the customer's own box */
  .sign{display:flex;gap:10mm;margin-top:8mm;font-size:10px;align-items:stretch}
  .sign > div{flex:1;border:1px solid #333;padding:4px 6px;min-height:42mm}
  .sign .dots{margin-top:18mm}
  /* the red italic note that stands under the terms table on their page two */
  .rednote{color:#c00000;font-style:italic;font-weight:bold;margin-top:6px;font-size:10px;
           print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .pg{text-align:right;font-size:8.5px;color:#555;margin-top:6px}
  /* an empty cell prints as nothing. It used to print a dotted rule, which
     read as a row of full stops on a customer's sheet rather than as a blank
     waiting to be filled in. */
  @media print{.bar,.vatbox{display:none}.fill{background:none;border-bottom:none}
    .box{background:none;border:1px solid #666}
    .sheet{page-break-after:always}.sheet:last-child{page-break-after:auto}}
</style></head><body>
<div class="bar">
  <button onclick="window.print()">Print / Save as PDF</button>
  <span style="font-size:11px;color:#555;align-self:center">Every line can be edited. Yellow marks what changes on each quotation.</span>
</div>

<div class="sheet" contenteditable="true">
  <div class="hdr">
    <img class="logo" src="${c.base}img/logo.png" alt="" onerror="this.remove()">
    <div class="co"><b>${QT.company}</b><br>${QT.addr1}<br>${QT.addr2}<br>${QT.tel}</div>
  </div>
  <h1>${QT.title}</h1>

  <!-- Their meta block: the labels run right up to the colon in a column of
       their own, the values start on one line, and only the date and the
       validity sit on the right. The project and its two references are not
       here on their sheet - they are the first row inside the items table. -->
  <table class="meta">
    <colgroup><col style="width:15%"><col style="width:45%"><col style="width:15%"><col style="width:25%"></colgroup>
    <tr><td class="lab">${QT.cust}</td><td class="val">${esc(l.customer_name||'')}</td>
        <td></td><td></td></tr>
    <tr><td class="lab">${QT.addr}</td><td>${esc(c.addr)}</td>
        <td></td><td></td></tr>
    <tr><td class="lab">${QT.phone}</td><td>${esc(l.phone||'')}</td>
        <td class="lab">${QT.date}</td><td class="val">${fmtDate(q.released_date||q.created_at)}</td></tr>
    <tr><td class="lab">${QT.systype}</td><td>${esc(q.system_type||'')}</td>
        <td class="lab">${QT.valid}</td><td>${qb(40,QT.validDays)}</td></tr>
    <tr><td class="lab">${QT.size}</td><td><span class="num">${qb(40,kwpTxt)}</span> <span class="unit">kWp</span></td>
        <td></td><td></td></tr>
    <tr><td class="lab">${QT.battsize}</td><td><span class="num">${esc(q.battery_kwh||'')}</span> <span class="unit">kWh</span></td>
        <td></td><td></td></tr>
  </table>

  <table class="items">
    <colgroup><col class="c-n"><col class="c-d"><col class="c-q"><col class="c-i"></colgroup>
    <thead><tr><th>${QT.no}</th><th>${QT.desc}</th><th>${QT.qty}</th><th>${QT.img}</th></tr></thead>
    <tbody>
      <!-- the project, its two references and what is being supplied open the
           table on their sheet, colons lined up in a column of their own -->
      ${row('','<table class="kvt" style="width:auto"><tr><td>'+QT.project+'</td><td class="val">'+qb(150,QT.projectVal)+'</td></tr>'
             +'<tr><td>'+QT.projectref+'</td><td class="val">'+qb(90,l.ref_id?': '+l.ref_id:QT.na)+'</td></tr>'
             +'<tr><td>'+QT.teamref+'</td><td class="val">'+qb(90,QT.na)+'</td></tr></table>'
             +QT.supply+'<br><span class="sec">'+QT.mgmtFor(q.system_type,kwpTxt)+'</span>','')}
      ${row('១','<span class="sec">'+QT.s1+'</span>'
             +'<div class="ind">ក. '+QT.s1a+'</div>'
             +'<div class="ind it"><b>'+QT.s1b+'</b></div>'
             +'<div class="ind2">'+QT.s1c+'</div><div class="ind2">'+QT.s1d+'</div>'
             +'<div class="ind2">'+QT.s1e+'</div><div class="ind2">'+QT.s1f+'</div>','')}
      <!-- The four main components are one row on their sheet, with no rule
           drawn between the panel, the inverter, the battery and the mounting.
           An inner table on the same widths keeps each quantity and photo
           beside its own block. -->
      <tr><td class="n">២</td><td class="grp" colspan="3">
        <table>
          <!-- the same proportions as the outer columns, so the rules in this row
               line up with the rules above and below it -->
          <colgroup><col style="width:54.8%"><col style="width:20.4%"><col style="width:24.8%"></colgroup>
          <tr><td class="sec2">${QT.s2}</td><td class="q"></td><td class="im"></td></tr>
          ${grpRow(QT.s2a
             +'<div class="ind">* <span class="kv">'+QT.model+'</span>: <span class="it">'+(mPanel||q.panel_brand||'')+'</span></div>'
             +'<div class="ind">* <span class="kv">'+QT.panelsize+'</span>: '+(q.panel_watt||'')+'Wp</div>',
             (q.panel_pcs||'')+' '+QT.unitPanel,
             '<span class="wty">'+QT.warranty+': '+qb(16)+' ឆ្នាំ</span>'
             +'<span class="wty">ធានាលើប្រសិទ្ធភាព: '+qb(16)+' ឆ្នាំ</span>',
             imgFor(mPanel,'Panel',q.panel_brand,q.panel_watt),c.base)}
          ${grpRow(QT.s2b
             +'<div class="ind">* <span class="kv">'+QT.model+'</span>: <span class="it">'+(mInv||q.inverter_brand||'')+'</span></div>'
             +'<div class="ind">* <span class="kv">'+QT.invsize+'</span>: '+(c.kwac?c.kwac.toFixed(2):'')+' kWac</div>',
             (q.inverter_pcs||'')+' '+QT.unitPiece,
             '<span class="wty">'+QT.warranty+': '+qb(16)+' ឆ្នាំ</span>',
             imgFor(mInv,'Inverter',q.inverter_brand,q.inverter_kw),c.base)}
          ${grpRow(QT.s2c
             +'<div class="ind">* <span class="kv">'+QT.model+'</span>: <span class="it">'+(mBatt||q.battery_brand||'')+'</span></div>'
             +'<div class="ind">* <span class="kv">'+QT.battcap+'</span>: '+esc(q.battery_kwh_each||q.battery_kwh||'')+' kWh</div>',
             (q.battery_pcs||'')+' '+QT.unitPiece,
             '<span class="wty">'+QT.warranty+': '+qb(16)+' ឆ្នាំ</span>',
             imgFor(mBatt,'Battery',q.battery_brand,q.battery_kwh_each||q.battery_kwh),c.base)}
          ${grpRow(QT.s2d
             +'<div class="ind it">* '+QT.mount1+'</div><div class="ind it">* '+QT.mount2+'</div>'
             +'<div class="ind it">* '+QT.mount3+'</div><div class="ind it">* '+QT.mount4+'</div>'
             +'<div class="ind it">* '+QT.mount5+'</div>',
             qb(50,'1 '+QT.unitSet),'','',c.base)}
        </table>
      </td></tr>
      ${row('៣','<span class="sec">'+QT.s3+'</span>'
             +'<div class="ind">* '+QT.e1+'</div><div class="ind">* '+QT.e2+'</div>'
             +'<div class="ind">* '+QT.e3+'</div><div class="ind">* '+QT.e4+'</div>'
             +'<div class="ind">* '+QT.e5+'</div><div class="ind">* '+QT.e6+'</div>',
             qb(50,'1 '+QT.unitSet)+'<span class="wty">'+QT.warranty+': '+qb(16)+' ឆ្នាំ</span>',
             /* cables, breakers and the AC/DC boxes - one picture for the
                whole electrical set, the way their own sheet carries it. No
                part number is derived for it: it is a bundle, not a product.
                A missing file drops its own cell. */
             'img/electrical.jpg')}
    </tbody>
  </table>

  <!-- The payment terms and the price sit in one full-width band under the
       items table, the way their own sheet has it: terms on the left, the
       price in a column of its own on the right under its heading, and the
       payable total last. It used to be a row inside the items table with a
       small money box floated to the right of it. -->
  <table class="money">
    <colgroup><col class="c-l"><col class="c-v"></colgroup>
    <tr><td class="lbl2"></td><td class="v hd">${QT.sysprice}</td></tr>
    <tr><td class="pay" style="padding:2px 6px">${QT.pay1}<br>${QT.pay2}<br>${QT.pay3}</td>
        <td class="v">$${qnum(c.price)}</td></tr>
    <tr><td class="tot">${QT.total}</td><td class="v">$${qnum(c.price)}</td></tr>
    <tr id="r-vat"><td class="tot">${QT.vat10}</td><td class="v" id="o-vat"></td></tr>
    <tr id="r-grand"><td class="tot">${QT.grand}</td><td class="v paid" id="o-grand"></td></tr>
    <!-- Off VAT, the price is negotiated instead: two lines to name a
         discount and take it off. Both the label and the amount are typed,
         because "etc." is the point - it is not always a discount. They are
         boxed rather than underlined, since a figure that changes what the
         customer pays should not look like the dotted blanks around it. -->
    <tr id="r-d1"><td><span class="box lbl" contenteditable="true">${QT.discount}</span></td>
        <td class="v"><span class="box num" id="f-d1" contenteditable="true"></span></td></tr>
    <tr id="r-d2"><td><span class="box lbl" contenteditable="true"></span></td>
        <td class="v"><span class="box num" id="f-d2" contenteditable="true"></span></td></tr>
    <tr id="r-net"><td class="tot">${QT.netTotal}</td><td class="v paid" id="o-net"></td></tr>
  </table>
  <div class="vatbox" contenteditable="false">
    <label><input type="checkbox" id="vat-on" checked> Include VAT (10%)</label>
  </div>

  <div class="lower">
   <div class="lower-l">
    <div class="lower-h">${QT.eff}</div>
    <table class="sav" style="width:auto">
    <tr><td>${QT.bill}</td><td class="v">${qb(60,l.monthly_bill_usd||'')}</td><td class="u">${QT.perMonth}</td></tr>
    <tr><td>${QT.tariff}</td><td class="v"><span class="fill" id="f-tariff" contenteditable="true">0.183</span></td><td class="u">${QT.perKwh}</td></tr>
    <tr><td>${QT.yearly}</td><td class="v"><span class="fill" id="f-annual" contenteditable="true">${c.annual||''}</span></td><td class="u">${QT.perYear}</td></tr>
    <tr><td>${QT.produced}</td><td class="v" id="o-prod"></td><td class="u">${QT.usdYear}</td></tr>
    ${(Number(c.kwac)||0)>=10?`<tr><td>${QT.exported} <span class="rate">(<span class="fill" id="f-edcrate" contenteditable="true">${c.edcRate==null?'':c.edcRate}</span> ${QT.perKwh})</span></td>
        <td class="v" id="o-export"></td><td class="u">${QT.usdYear}</td></tr>`:''}
    <tr><td>${QT.saved}</td><td class="v" id="o-year"></td><td class="u">${QT.usdYear}</td></tr>
    <tr><td>${QT.savedMonth}</td><td class="v" id="o-mon"></td><td class="u">${QT.usdMonth}</td></tr>
    <!-- their sheet works payback in months, so the unit cell reads ខែ -->
    <tr><td>${QT.payback}</td><td class="v" id="o-pay"></td><td class="u">${QT.months}</td></tr>
    </table>
   </div>
   <div class="fn"><b>${QT.note}</b><br>${QT.f1}<br>${QT.f2}<br>${QT.f3}<br>${QT.f4}</div>
  </div>
  <div class="pg">${QT.page} 1/2</div>
</div>

<div class="sheet" contenteditable="true">
  <div class="hdr">
    <img class="logo" src="${c.base}img/logo.png" alt="" onerror="this.remove()">
    <div class="co"><b>${QT.company}</b><br>${QT.addr1}<br>${QT.addr2}<br>${QT.tel}</div>
  </div>
  <h1 style="font-size:14px">${QT.terms}</h1>
  <!-- page two has no picture column on their sheet: number, description,
       warranty -->
  <table class="items">
    <colgroup><col style="width:14%"><col style="width:62%"><col style="width:24%"></colgroup>
    <thead><tr><th>${QT.no}</th><th>${QT.desc}</th><th>${QT.warranty}</th></tr></thead>
    <tbody>
      <tr><td class="n">១</td><td><span class="sec">${QT.t1}</span>
        <div class="ind">* ${QT.t1a}</div>
        <div class="ind2 it">${QT.t1b}</div><div class="ind2 it">${QT.t1c}</div><div class="ind2 it">${QT.t1d}</div>
        <div class="ind">* ${QT.t1e}</div>
        <div class="ind2 it">${QT.t1f}</div></td>
        <td class="q" style="vertical-align:middle">${QT.t1w}</td></tr>
      <tr><td class="n">២</td><td><span class="sec">${QT.t2}</span>
        <div class="ind it">${QT.t2a}</div><div class="ind it">${QT.t2b}</div>
        <div class="ind it"><span class="lower-h">${QT.t2c.slice(0,QT.t2c.indexOf(':')+1)}</span>${QT.t2c.slice(QT.t2c.indexOf(':')+1)}</div></td>
        <td class="q"></td></tr>
    </tbody>
  </table>

  <!-- the red note stands under the table, and the sentence the customer is
       agreeing to sits inside the customer's own signature box -->
  <div class="rednote">${QT.t2d}</div>
  <div class="sign">
    <div>
      <div>${QT.approved}</div>
      <div class="dots">${QT.dots}</div>
      <div><b>${QT.approverName}</b></div>
      <div>${QT.approverRole}</div>
      <div><b>${QT.company}</b></div>
    </div>
    <div>
      <div>${QT.agree1} ${QT.agree2}<br>${QT.agree3}</div>
      <div class="dots">${QT.dots2}</div>
      <div>${QT.custSign}</div>
      <div>${QT.signName} ${qb(120)}</div>
      <div>${QT.signDate} ${qb(120)}</div>
    </div>
  </div>
  <div class="pg">${QT.page} 2/2</div>
</div>
${recalc}
</body></html>`;
}
