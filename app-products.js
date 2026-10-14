/* ---------------- PRODUCTS (admin) ----------------
   Lists > Products > Models & photos (14 Oct 2026). One row per model the
   company stocks: type, brand, size, phase, model code and photo. The
   quotation and the kit strip read this table (app-quotation.js); a brand and
   size with no row prints the brand only and no photo.
   Rows with no brand are the shared pictures: every panel, the mounting set,
   the electrical set. Every cell saves on change, like the other lists. */
let PRODROWS=[];
const PROD_KINDS=[['inverter','Inverter','kW'],['battery','Battery','kWh'],['panel','Panel','W'],
  ['mounting','Mounting',''],['electrical','Electrical','']];

async function renderProducts(){
  if(ME.role!=='admin')return;
  const {data,error}=await sb.from('products').select('*').order('sort_order');
  const card=$('prodcard');if(!card)return;
  if(error){card.innerHTML=blank('Could not load the products',why(error));return;}
  PRODROWS=data||[];
  const models=PRODROWS.filter(r=>r.brand), shared=PRODROWS.filter(r=>!r.brand);
  const live=PRODROWS.filter(r=>r.is_active).length;
  const kindSel=r=>`<select onchange="prodSave('${r.id}','kind',this.value)">${PROD_KINDS.slice(0,3).map(([k,l])=>
    `<option value="${k}" ${r.kind===k?'selected':''}>${l}</option>`).join('')}</select>`;
  const unit=k=>(PROD_KINDS.find(x=>x[0]===k)||[])[2]||'';
  const photo=r=>`<div class="prphoto">${r.photo_url?`<img src="${esc(r.photo_url)}" alt="" onerror="this.style.visibility='hidden'">`:'<span class="quiet">No photo</span>'}
      <label class="btn-ghost prup">${r.photo_url?'Replace':'Upload'}<input type="file" accept="image/*" onchange="prodUpload('${r.id}',this)"></label></div>`;
  const sw=r=>`<label class="lsswitch"><input type="checkbox" ${r.is_active?'checked':''} onchange="prodSave('${r.id}','is_active',this.checked)"><i></i></label>`;
  card.innerHTML=`
    <div class="lshead"><h3>Models & photos</h3><span>${live} in use${PRODROWS.length-live?` · ${PRODROWS.length-live} switched off`:''}</span>
      <button class="btn-ghost" style="margin-left:auto" onclick="prodExport()">Export CSV</button></div>
    <div class="tablewrap"><table class="lstable prtable"><thead><tr>
      <th>Type</th><th>Brand</th><th>Size</th><th>Phase</th><th>Model code</th><th>Photo</th><th class="lsst">In use</th><th class="lsdel"></th>
    </tr></thead><tbody>`+models.map(r=>`
      <tr class="${r.is_active?'':'lsoff'}">
        <td>${kindSel(r)}</td>
        <td><input value="${esc(r.brand||'')}" onchange="prodSave('${r.id}','brand',this.value)"></td>
        <td><div class="prsize">${numBox('pz-'+r.id,r.size,{attrs:`onchange="prodSave('${r.id}','size',this.value)"`})}<span>${unit(r.kind)}</span></div></td>
        <td>${r.kind==='inverter'?`<select onchange="prodSave('${r.id}','phase',this.value)">
          <option value="" ${!r.phase?'selected':''}>Any</option><option value="1" ${r.phase==='1'?'selected':''}>1P</option><option value="3" ${r.phase==='3'?'selected':''}>3P</option></select>`:'<span class="quiet">—</span>'}</td>
        <td><input value="${esc(r.model_code||'')}" onchange="prodSave('${r.id}','model_code',this.value)"></td>
        <td>${photo(r)}</td>
        <td class="lsst">${sw(r)}</td>
        <td class="lsdel"><button class="lsx" title="Delete" onclick="prodDelete('${r.id}')">✕</button></td>
      </tr>`).join('')+`</tbody>
      <tfoot><tr class="lsadd"><td colspan="8"><div class="lsaddbox">
        <select id="pn-kind">${PROD_KINDS.slice(0,3).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select>
        <input id="pn-brand" placeholder="Brand">
        ${numBox('pn-size','',{attrs:'placeholder="Size" style="width:80px"'})}
        <input id="pn-code" placeholder="Model code" onkeydown="if(event.key==='Enter')prodAdd()">
        <button class="btn-sun" onclick="prodAdd()">Add</button></div></td></tr></tfoot></table></div>
    <h3 style="margin:22px 0 8px">Shared photos</h3>
    <div class="tablewrap"><table class="lstable prtable"><tbody>`+shared.map(r=>`
      <tr><td style="width:160px"><b>${esc((PROD_KINDS.find(k=>k[0]===r.kind)||[])[1]||r.kind)}</b></td><td>${photo(r)}</td></tr>`).join('')+`
    </tbody></table></div>`;
}

const prodNum=v=>{const n=normNum(v);return n===''?null:Number(n);};
async function prodSave(id,field,value){
  let v=value;
  if(field==='size')v=prodNum(value);
  else if(typeof v==='string')v=v.trim()||null;
  if(field==='brand'&&!v){toast('A model needs a brand');renderProducts();return;}
  const {error}=await sb.from('products').update({[field]:v,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Could not save. '+why(error));renderProducts();return;}
  toast('Saved');await loadProducts();
  if(field==='is_active'||field==='kind')renderProducts();
}
async function prodAdd(){
  const brand=$('pn-brand').value.trim(), size=prodNum($('pn-size').value), kind=$('pn-kind').value;
  if(!brand){needField('pn-brand','Type the brand');return;}
  if(size==null){needField('pn-size','Type the size');return;}
  const last=PRODROWS.length?Math.max(...PRODROWS.map(r=>r.sort_order||0)):0;
  const {error}=await sb.from('products').insert({kind,brand,size,model_code:$('pn-code').value.trim()||null,sort_order:last+1});
  if(error){toast('Could not add it. '+why(error));return;}
  toast('Added');await loadProducts();renderProducts();
}
async function prodDelete(id){
  const r=PRODROWS.find(x=>x.id===id);if(!r)return;
  if(!confirm('Delete '+r.brand+' '+(r.size??'')+(r.model_code?' ('+r.model_code+')':'')+'?\n\nSwitching it off hides it instead.'))return;
  const {error}=await sb.from('products').delete().eq('id',id);
  if(error){toast('Could not delete. '+why(error));return;}
  toast('Deleted');await loadProducts();renderProducts();
}
/* every upload is a new file name, so no browser keeps showing the old photo;
   old files stay, because saved quotations may still point at them */
async function prodUpload(id,input){
  const f=input.files&&input.files[0];if(!f)return;
  if(f.size>5*1024*1024){toast('That photo is over 5 MB');return;}
  const ext=(f.name.split('.').pop()||'png').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=id+'-'+Date.now()+'.'+ext;
  toast('Uploading…');
  const up=await sb.storage.from('product-photos').upload(path,f,{contentType:f.type});
  if(up.error){toast('Could not upload. '+why(up.error));return;}
  const url=sb.storage.from('product-photos').getPublicUrl(path).data.publicUrl;
  const {error}=await sb.from('products').update({photo_url:url,updated_at:new Date().toISOString()}).eq('id',id);
  if(error){toast('Could not save. '+why(error));return;}
  toast('Photo saved');await loadProducts();renderProducts();
}
function prodExport(){
  const k=r=>(PROD_KINDS.find(x=>x[0]===r.kind)||[])[1]||r.kind;
  downloadCSV('products',['Type','Brand','Size','Phase','Model code','Photo','In use'],
    PRODROWS.map(r=>[k(r),r.brand||'(shared)',r.size??'',r.phase?r.phase+'P':'',r.model_code||'',r.photo_url||'',r.is_active?'Yes':'No']));
}
