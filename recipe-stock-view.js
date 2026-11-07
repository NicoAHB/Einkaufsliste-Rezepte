import {availability,required} from './cookable.js';

let opened = null, openKey = '';
export function closeRecipeStock() { opened?.close(); opened=null; openKey=''; }
export function refreshRecipeStock() { if(opened&&!opened.element.isConnected)closeRecipeStock(); }

const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};

// Pro Ansicht bleibt nur ein Vorratsabgleich offen. Ein normales Neuzeichnen
// nach dem Datenabgleich erhält den geöffneten Abgleich desselben Rezepts.
// `onHave(row)` (2.164): „✓ Hab ich“ an einer fehlenden Zutat übernimmt sie in den Vorrat (die App zeichnet danach neu; die Ansicht bleibt offen).
// `onUsedUp(row)` (2.175): „Aufgebraucht“ an einer vorhandenen Zutat, das Gegenstück: aus dem Vorrat nehmen und auf die Einkaufsliste setzen.
export function recipeStockView({key,recipe,ingredients,index,makeIcon,ingredientLabel,onHave=null,onUsedUp=null}) {
  const tracked=ingredients.filter(required),state=new Map(tracked.map(row=>[row,availability(row,index)])),have=tracked.filter(row=>state.get(row)==='have'),missing=tracked.filter(row=>state.get(row)!=='have');
  const badge=node('div',undefined,`recipe-stock ${missing.length===0?'complete':have.length?'partial':'empty'}`);
  const trigger=node('button',undefined,'recipe-stock-toggle');trigger.type='button';
  const heading=node('span',undefined,'recipe-stock-heading');heading.append(node('span',`${have.length} von ${tracked.length} Zutaten da · ${missing.length} fehlen`),makeIcon('info'));
  const progress=node('span',undefined,'recipe-stock-track'),fill=node('span');fill.style.width=`${have.length/tracked.length*100}%`;progress.append(fill);
  progress.setAttribute('role','progressbar');progress.setAttribute('aria-label','Zutaten im Vorrat');progress.setAttribute('aria-valuemin','0');progress.setAttribute('aria-valuemax',String(tracked.length));progress.setAttribute('aria-valuenow',String(have.length));
  trigger.append(heading,progress);trigger.setAttribute('aria-label',`${recipe.name}: ${have.length} von ${tracked.length} Zutaten im Vorrat, ${missing.length} fehlen. Zutatendetails`);
  const expansion=node('div',undefined,'recipe-stock-expansion'),content=node('div',undefined,'recipe-stock-content'),inner=node('div',undefined,'recipe-stock-inner');
  expansion.id=`recipe-stock-${crypto.randomUUID()}`;trigger.setAttribute('aria-controls',expansion.id);
  // 2.187: Die Listen mit den Knöpfen entstehen erst beim ersten Aufklappen. Bisher baute jede Karte sie versteckt vorab, was die
  // Rezeptliste bei vielen Rezepten spürbar verlangsamte; zu sehen ist davon nur, was gerade aufgeklappt ist.
  const labels=[];let built=false,factor=1;
  const buildGroups=()=>{
  if(built)return;built=true;const groups=[];
  for(const [rows,title,kind] of [[missing,'Fehlt im Vorrat','missing'],[have,'Im Vorrat vorhanden','have']]) {
    if(kind==='missing'&&!rows.length)continue;   // 2.164: Fehlt nichts mehr, entfällt der Abschnitt „Fehlt im Vorrat“
    const group=node('div',undefined,`recipe-stock-group ${kind}`);group.append(node('h4',title));
    if(rows.length){
      const list=node('ul');
      for(const row of rows){
        const li=node('li'),label=node('span',undefined,'recipe-stock-label');list.append(li);labels.push([label,row]);
        if(kind==='have'&&onUsedUp){
          // Dezent und klein (die Zutat bleibt die Hauptsache), mit Einkaufswagen; die Tippfläche ist trotzdem 44 px hoch
          const line=node('span',undefined,'recipe-stock-line'),used=node('button',undefined,'recipe-stock-used');used.type='button';
          used.append(makeIcon('cart'),node('span','Aufgebraucht'));
          used.setAttribute('aria-label',`${row.name}: aufgebraucht, aus dem Vorrat nehmen und auf die Einkaufsliste setzen`);
          used.addEventListener('click',event=>{event.stopPropagation();onUsedUp(row);});
          line.append(label,used);li.append(line);
        } else li.append(label);
        if(kind==='missing'&&onHave){
          // Eindeutig anders als „Einkaufen“: Text mit Haken, kein reines Plus. Seit 2.178 so klein und dezent wie „Aufgebraucht“ (Tippfläche 44 px)
          const mark=node('button',undefined,'recipe-stock-have');mark.type='button';mark.append(makeIcon('check'),node('span','Hab ich'));
          mark.setAttribute('aria-label',`${row.name}: hab ich, in den Vorrat übernehmen`);
          mark.addEventListener('click',event=>{event.stopPropagation();onHave(row);});
          li.append(mark);
        }
      }
      group.append(list);
    }
    else group.append(node('p','Noch keine der mitgezählten Zutaten vorhanden.','hint'));
    groups.push(group);
  }
  inner.prepend(...groups);
  for(const [label,row] of labels)label.textContent=ingredientLabel(row,factor);
  };
  const hint=node('p','Abgleich mit dem Vorrat; Mengen werden nicht geprüft.','hint');
  if(tracked.length<ingredients.length)hint.append(' Wasser, Salz, Pfeffer und Zutaten nach Bedarf zählen nicht mit.');
  const collapse=node('button','Einklappen','recipe-stock-collapse');collapse.type='button';collapse.append(makeIcon('chevron'));
  const apply=open=>{if(open)buildGroups();badge.classList.toggle('expanded',open);trigger.setAttribute('aria-expanded',String(open));expansion.setAttribute('aria-hidden',String(!open));expansion.inert=!open;};
  const show=()=>{closeRecipeStock();openKey=key;opened={element:badge,close:()=>apply(false)};apply(true);};
  trigger.addEventListener('click',()=>{if(trigger.getAttribute('aria-expanded')==='true')closeRecipeStock();else show();});
  collapse.addEventListener('click',()=>{closeRecipeStock();trigger.focus({preventScroll:true});});
  inner.append(hint,collapse);content.append(inner);expansion.append(content);badge.append(trigger,expansion);
  apply(openKey===key);if(openKey===key)opened={element:badge,close:()=>apply(false)};
  return {element:badge,updateAmounts:count=>{factor=count/recipe.servings;for(const [label,row]of labels)label.textContent=ingredientLabel(row,factor);}};
}

document.addEventListener('click',event=>{
  if(!opened)return;
  const card=event.target.closest('.recipe-card');
  if((card&&card!==opened.element.closest('.recipe-card'))||event.target.closest('.recipe-actions,.recipe-manage-button,#daily-open,#cookable-open,#add-recipe,#import-recipe'))closeRecipeStock();
},true);
