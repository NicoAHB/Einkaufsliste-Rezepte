/* Große Mengenpfeile und ein Einheitenmenü für Einkauf, Bearbeiten und Nachkaufen.
   Die Tastatur erscheint nur beim bewussten Antippen der Zahl oder eigener Angaben. */
import { preferredPurchase, purchaseView, purchaseSizeText, rawPurchase, validPurchaseUnit, unitChoice } from './buying.js';
import { unitSpec } from './prices.js';
const clone = value => value ? { ...value } : null;
const plain = value => String(value).replace('.',',');
const parse = value => Number(String(value).trim().replace(',','.'));
const node = (tag,text,cls) => { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(cls)el.className=cls; return el; };
let picker = null, choose = null, owner = null;
function unitPicker() {
  if (picker) return picker;
  const dialog=node('dialog'); dialog.id='purchase-unit-dialog'; dialog.setAttribute('aria-labelledby','purchase-unit-title');
  const head=node('div',undefined,'sheet-head'), title=node('h2','Einheit wählen'); title.id='purchase-unit-title';
  const close=node('button','×','icon-button round'); close.type='button'; close.setAttribute('aria-label','Einheitenmenü schließen'); close.onclick=()=>dialog.close(); head.append(title,close);
  const choices=node('div',undefined,'unit-choices');
  const custom=node('details',undefined,'purchase-custom'); custom.append(node('summary','Eigene Einheit oder Packungsgröße'));
  const form=node('form',undefined,'stack');
  const makeField=(text,name,value)=>{const label=node('label',text),input=node('input');input.name=name;input.value=value;input.maxLength=30;label.append(input);form.append(label);return input;};
  const label=makeField('Einheit, z. B. Packung oder Flasche','label','Packung'); label.required=true;
  const size=makeField('Inhalt pro Einheit (freiwillig)','size','1');size.inputMode='decimal';size.maxLength=16;
  const baseLabel=node('label','Inhaltseinheit'),base=node('select');base.name='base';for(const unit of ['l','ml','kg','g','Stück'])base.add(new Option(unit,unit));baseLabel.append(base);form.append(baseLabel);
  const hint=node('p','Ohne Inhalt bleibt es eine einfache Einheit. Mit Inhalt kann die App Rezeptmengen in ganze Packungen umrechnen.','hint');
  const error=node('p',undefined,'dialog-error');error.hidden=true;error.setAttribute('role','alert');const save=node('button','Einheit übernehmen');save.type='submit';form.append(hint,error,save);custom.append(form);dialog.append(head,choices,custom);document.body.append(dialog);
  form.onsubmit=event=>{event.preventDefault();try { const unit=label.value.trim();if(!unit||unit.length>30)throw new Error('Bitte eine Einheit mit höchstens 30 Zeichen eingeben.');
    const profile=size.value.trim()?{label:unit,quantity:parse(size.value),unit:base.value}:null;
    if(profile&&!validPurchaseUnit(profile))throw new Error('Bitte einen gültigen Packungsinhalt größer als 0 eingeben.');
    if(!owner?.isConnected||!owner.getClientRects().length){dialog.close();return;}choose?.(profile,unit);dialog.close();
  }catch(e){error.textContent=e.message;error.hidden=false;}};
  dialog.addEventListener('close',()=>{owner?.setAttribute('aria-expanded','false');const parent=owner?.closest('form');if(parent)delete parent.dataset.choosingUnit;choose=null;owner=null;});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientY<r.top||event.clientY>r.bottom||event.clientX<r.left||event.clientX>r.right)dialog.close();}});
  const watch=new MutationObserver(()=>{if(dialog.open&&owner&&(!owner.isConnected||!owner.getClientRects().length))dialog.close();});watch.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','hidden']});
  picker={dialog,choices,custom,form,label,size,base,error,close};return picker;
}
export function mountQuantityControls(form,{getHistory=()=>[],getName=()=>form.elements.name?.value||''}={}) {
  const quantity=form.elements.quantity,unit=form.elements.unit;
  const box=node('div',undefined,'quantity-stepper'), arrows=node('div',undefined,'quantity-arrows');quantity.before(box);box.append(quantity,arrows);
  const up=node('button','⌃','quantity-up'),down=node('button','⌄','quantity-down');
  for(const [button,text] of [[up,'Menge erhöhen'],[down,'Menge verringern']]){button.type='button';button.setAttribute('aria-label',text);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS(svg.namespaceURI,'use');svg.classList.add('icon');svg.setAttribute('aria-hidden','true');use.setAttribute('href','#i-chevron');svg.append(use);button.replaceChildren(svg);arrows.append(button);}
  quantity.setAttribute('aria-label',quantity.getAttribute('aria-label')||'Menge');quantity.inputMode='decimal';
  unit.readOnly=true;unit.inputMode='none';unit.removeAttribute('list');unit.setAttribute('role','button');unit.setAttribute('aria-haspopup','dialog');unit.setAttribute('aria-controls','purchase-unit-dialog');unit.setAttribute('aria-expanded','false');unit.setAttribute('aria-label',unit.getAttribute('aria-label')||'Einheit wählen');unit.classList.add('purchase-unit');
  const hint=node('p',undefined,'purchase-hint hint wide');unit.closest('label').after(hint);
  let profile=null,original=null,quantityTouched=false,lastName='',unitChosen=false,inherited={};
  function sync(){up.setAttribute('aria-label',`${lastName?lastName+': ':''}Menge erhöhen`);down.setAttribute('aria-label',`${lastName?lastName+': ':''}Menge verringern`);const n=parse(quantity.value);down.disabled=!Number.isFinite(n)||n<=1;up.disabled=n>=1e6;hint.textContent=profile?`1 ${profile.label} = ${purchaseSizeText(profile)}${original&&!quantityTouched?` · Bedarf: ${plain(original.quantity)} ${original.unit}`:''}`:'';hint.hidden=!profile;}
  function read(){
    const count=parse(quantity.value);let result=rawPurchase(count,profile,unit.value.trim());
    // Das unveränderte Bearbeiten einer 1,4-l-Anforderung darf daraus keine 2 l machen.
    if(original&&!quantityTouched&&unitSpec(original.unit).group===unitSpec(profile?.unit||unit.value).group)result={...result,quantity:original.quantity,unit:original.unit};
    if(original&&!unitChosen&&original.purchaseUnit===undefined)delete result.purchaseUnit;
    if(unitChosen)Object.assign(result,{purchaseMeasure:profile?.unit||unit.value.trim(),purchaseAt:new Date().toISOString()});
    else if(!original)Object.assign(result,inherited);
    return result;
  }
  function select(next,label){
    const count=parse(quantity.value), before=original&&!quantityTouched?{...original}:{quantity:Number.isFinite(count)&&count>0?count*(profile?.quantity||1):1,unit:profile?.unit||unit.value};profile=clone(next);unit.value=next?.label||label;unitChosen=true;
    if(original && unitSpec(before.unit).group===unitSpec(next?.unit||label).group){
      const view=purchaseView({...before,purchaseUnit:next,unit:before.unit});
      quantity.value=plain(next?view.quantity:before.quantity*unitSpec(before.unit).factor/unitSpec(label).factor);
    }
    quantity.dispatchEvent(new Event('change',{bubbles:true}));unit.dispatchEvent(new Event('change',{bubbles:true}));sync();
  }
  unit.addEventListener('pointerdown',event=>{event.preventDefault();if(form.dataset)form.dataset.choosingUnit='yes';document.activeElement?.blur?.();});
  unit.addEventListener('selectstart',event=>event.preventDefault());
  unit.addEventListener('click',()=>{
    if(form.dataset)form.dataset.choosingUnit='yes';const p=unitPicker();const apply=(next,label)=>{try{if(!unit.isConnected||!unit.getClientRects().length){p.dialog.close();return false;}select(next,label);return true;}catch(error){p.error.textContent=error.message;p.error.hidden=false;return false;}};owner=unit;choose=select;p.choices.replaceChildren();p.custom.open=false;p.error.hidden=true;
    const profiles=[profile,preferredPurchase(getName(),getHistory()).purchaseUnit].filter(Boolean),seen=new Set();
    for(const value of [...profiles])if(unitSpec(value.unit).group==='volume'&&value.label!=='Flasche')profiles.push({...value,label:'Flasche'});
    for(const value of profiles){const text=`${value.label} · ${purchaseSizeText(value)}`;if(seen.has(text))continue;seen.add(text);const button=node('button',text,'secondary');button.type='button';button.setAttribute('aria-pressed',String(JSON.stringify(value)===JSON.stringify(profile)));button.onclick=()=>{if(apply(value,value.label))p.dialog.close();};p.choices.append(button);}
    p.choices.append(p.custom);
    if(profiles.length){const label=node('p','Maße und weitere Einheiten','unit-types-label hint');p.choices.append(label);}
    for(const value of [...new Set([unit.value,'Stück','Packung','Flasche','Dose','Glas','Becher','Beutel','Bund','Rolle','Tube','Sack','Tafel','kg','g','l','ml','EL','TL'].filter(Boolean))].filter(value=>!profiles.some(p=>p.label===value))){
      const button=node('button',value,'secondary');button.type='button';button.setAttribute('aria-pressed',String(!profile&&unit.value===value));button.onclick=()=>{if(apply(null,value))p.dialog.close();};p.choices.append(button);
    }
    p.label.value=profile?.label||unit.value||'Packung';p.size.value=profile?plain(profile.quantity):'';p.base.value=profile?.unit||'l';unit.setAttribute('aria-expanded','true');p.dialog.showModal();p.dialog.scrollTop=0;p.close.focus({preventScroll:true});
  });
  unit.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();unit.click();}});
  quantity.addEventListener('input',()=>{quantityTouched=true;sync();});
  const step=delta=>{document.activeElement?.blur?.();const n=parse(quantity.value),base=Number.isFinite(n)?n:0,next=profile?(delta>0?Math.floor(base)+1:Math.ceil(base)-1):base+delta;quantity.value=plain(Math.min(1e6,Math.max(1,Math.round(next*1000)/1000)));quantityTouched=true;quantity.dispatchEvent(new Event('input',{bubbles:true}));};
  up.onclick=()=>step(1);down.onclick=()=>step(-1);
  function suggest(name,force=false){if(!force&&(lastName===name||unitChosen))return;lastName=name;original=null;const pref=preferredPurchase(name,getHistory());inherited=unitChoice(pref);profile=clone(pref.purchaseUnit);unit.value=profile?.label||pref.unit;if(!quantityTouched)quantity.value='1';sync();}
  sync();
  return {read,suggest,sync,load(row){lastName=row.name;original={...row};inherited={};unitChosen=false;quantityTouched=false;const view=purchaseView(row,getHistory());profile=clone(view.profile);quantity.value=plain(view.quantity);unit.value=view.unit;sync();},
    reset(){original=null;inherited={};unitChosen=false;quantityTouched=false;lastName='';profile=null;unit.value='Stück';quantity.value='1';sync();},
    preferenceChanged(){return unitChosen;},currentProfile(){return clone(profile);}};
}
