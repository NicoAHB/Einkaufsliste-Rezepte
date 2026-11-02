import {availability,required} from './cookable.js';

let opened = null, openKey = '';
export function closeRecipeStock() { opened?.close(); opened=null; openKey=''; }
export function refreshRecipeStock() { if(opened&&!opened.element.isConnected)closeRecipeStock(); }

const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};

// Pro Ansicht bleibt nur ein Vorratsabgleich offen. Ein normales Neuzeichnen
// nach dem Datenabgleich erhält den geöffneten Abgleich desselben Rezepts.
export function recipeStockView({key,recipe,ingredients,index,makeIcon,ingredientLabel}) {
  const tracked=ingredients.filter(required),have=tracked.filter(row=>availability(row.name,index)==='have'),missing=tracked.filter(row=>availability(row.name,index)!=='have');
  const badge=node('div',undefined,`recipe-stock ${missing.length===0?'complete':have.length?'partial':'empty'}`);
  const trigger=node('button',undefined,'recipe-stock-toggle');trigger.type='button';
  const heading=node('span',undefined,'recipe-stock-heading');heading.append(node('span',`${have.length} von ${tracked.length} Zutaten da · ${missing.length} fehlen`),makeIcon('info'));
  const progress=node('span',undefined,'recipe-stock-track'),fill=node('span');fill.style.width=`${have.length/tracked.length*100}%`;progress.append(fill);
  progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Zutaten im Vorrat');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(tracked.length));progress.setAttribute('aria-valuenow',String(have.length));
  trigger.append(heading,progress);trigger.setAttribute('aria-label',`${recipe.name}: ${have.length} von ${tracked.length} Zutaten im Vorrat, ${missing.length} fehlen. Zutatendetails`);
  const expansion=node('div',undefined,'recipe-stock-expansion'),content=node('div',undefined,'recipe-stock-content'),inner=node('div',undefined,'recipe-stock-inner');
  expansion.id=`recipe-stock-${crypto.randomUUID()}`;trigger.setAttribute('aria-controls',expansion.id);
  const labels=[];
  for(const [rows,title,kind] of [[missing,'Fehlt im Vorrat','missing'],[have,'Im Vorrat vorhanden','have']]) {
    const group=node('div',undefined,`recipe-stock-group ${kind}`);group.append(node('h4',title));
    if(rows.length){const list=node('ul');for(const row of rows){const li=node('li');list.append(li);labels.push([li,row]);}group.append(list);}
    else group.append(node('p',kind==='missing'?'Es fehlt keine Zutat.':'Noch keine der mitgezählten Zutaten vorhanden.','hint'));
    inner.append(group);
  }
  const hint=node('p','Abgleich mit dem Vorrat; Mengen werden nicht geprüft.','hint');
  if(tracked.length<ingredients.length)hint.append(' Wasser, Salz, Pfeffer und Zutaten nach Bedarf zählen nicht mit.');
  const collapse=node('button','Einklappen','recipe-stock-collapse');collapse.type='button';collapse.append(makeIcon('chevron'));
  const apply=open=>{badge.classList.toggle('expanded',open);trigger.setAttribute('aria-expanded',String(open));expansion.setAttribute('aria-hidden',String(!open));expansion.inert=!open;};
  const show=()=>{closeRecipeStock();openKey=key;opened={element:badge,close:()=>apply(false)};apply(true);};
  trigger.addEventListener('click',()=>{if(trigger.getAttribute('aria-expanded')==='true')closeRecipeStock();else show();});
  collapse.addEventListener('click',()=>{closeRecipeStock();trigger.focus({preventScroll:true});});
  inner.append(hint,collapse);content.append(inner);expansion.append(content);badge.append(trigger,expansion);
  apply(openKey===key);if(openKey===key)opened={element:badge,close:()=>apply(false)};
  return {element:badge,updateAmounts:count=>{for(const [label,row]of labels)label.textContent=ingredientLabel(row,count/recipe.servings);}};
}

document.addEventListener('click',event=>{
  if(!opened)return;
  const card=event.target.closest('.recipe-card');
  if((card&&card!==opened.element.closest('.recipe-card'))||event.target.closest('.recipe-actions,.recipe-manage-button,#daily-open,#cookable-open,#add-recipe,#import-recipe'))closeRecipeStock();
},true);
