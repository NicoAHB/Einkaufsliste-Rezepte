import { RECIPE_GROUPS, chooseRecipeGroup, normalizeRecipeGroups, recipeGroupConflicts, recipeGroupKey } from './recipe-tags.js';

const element=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
export function mountRecipeTagPicker({field,input,trigger,selection,menu,options,feedback,warning,custom,add,done,dialog,knownTags}) {
  let opened=false;
  const values=()=>normalizeRecipeGroups(input.value.split(','));
  function close(focus=false) {
    opened=false;menu.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus({preventScroll:true});
  }
  function revealMenu(){
    menu.scrollIntoView({block:'nearest'});
    const footer=dialog.querySelector('.sheet-actions'),bottom=Math.min(dialog.getBoundingClientRect().bottom,footer?.getBoundingClientRect().top??innerHeight)-12;
    if(menu.getBoundingClientRect().bottom>bottom)dialog.scrollTop+=menu.getBoundingClientRect().bottom-bottom;
  }
  function refresh() {
    const tags=values(),optionsScroll=options.scrollTop;selection.replaceChildren();
    if(!tags.length)selection.append(element('span','Gruppen auswählen','recipe-group-placeholder'));
    for(const tag of tags)selection.append(element('span',tag,'recipe-group-chip'));
    trigger.setAttribute('aria-label',`Rezeptgruppen auswählen${tags.length?`: ${tags.join(', ')}`:''}`);
    const conflicts=recipeGroupConflicts(tags);warning.hidden=!conflicts.length;
    warning.textContent=conflicts.length?`Diese Gruppen passen nicht zusammen: ${conflicts.map(pair=>pair.join(' + ')).join('; ')}. Wähle bitte die passende Einordnung.`:'';
    options.replaceChildren();
    const groups=RECIPE_GROUPS.map(group=>({...group,tags:[...group.tags]}));
    const preset=new Set(groups.flatMap(group=>group.tags).map(recipeGroupKey));
    const own=normalizeRecipeGroups([...tags,...knownTags()]).filter(tag=>!preset.has(recipeGroupKey(tag))).sort((a,b)=>a.localeCompare(b,'de'));
    if(own.length)groups.push({title:'Eigene Gruppen',tags:own});
    for(const group of groups){
      const section=element('div',undefined,'recipe-group-section'),heading=element('h4',group.title),choices=element('div',undefined,'recipe-group-choices');
      section.setAttribute('role','group');section.setAttribute('aria-label',group.title);section.append(heading,choices);
      for(const tag of group.tags){
        const key=recipeGroupKey(tag),button=element('button',tag,'recipe-group-option');button.type='button';button.dataset.group=key;
        const selected=tags.some(value=>recipeGroupKey(value)===key);button.setAttribute('aria-pressed',String(selected));
        button.addEventListener('click',()=>choose(tag,key));choices.append(button);
      }
      options.append(section);
    }
    options.scrollTop=optionsScroll;
  }
  function choose(tag,focusKey) {
    const result=chooseRecipeGroup(values(),tag);input.value=result.tags.join(', ');refresh();
    feedback.textContent=result.removed.length?`${result.removed.map(value=>`„${value}“`).join(', ')} ${result.removed.length===1?'wurde':'wurden'} abgewählt, weil du „${tag}“ gewählt hast.`:'';
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    if(focusKey)Array.from(options.querySelectorAll('button')).find(button=>button.dataset.group===focusKey)?.focus({preventScroll:true});
    if(opened)revealMenu();
  }
  function open(){refresh();opened=true;menu.hidden=false;trigger.setAttribute('aria-expanded','true');feedback.textContent='';revealMenu();}
  trigger.addEventListener('click',()=>opened?close():open());
  function addCustom(){
    const tag=custom.value.normalize('NFKC').trim().replace(/\s+/g,' ');
    if(!tag){feedback.textContent='Bitte einen Namen für die eigene Gruppe eingeben.';custom.focus();return;}
    if(tag.includes(',')){feedback.textContent='Bitte nur eine Gruppe auf einmal hinzufügen.';return;}
    if(tag.length>30){feedback.textContent='Bitte einen kürzeren Gruppennamen wählen (höchstens 30 Zeichen).';return;}
    if(values().some(value=>recipeGroupKey(value)===recipeGroupKey(tag))){feedback.textContent='Diese Gruppe ist bereits ausgewählt.';custom.value='';return;}
    const preset=RECIPE_GROUPS.flatMap(group=>group.tags).find(value=>recipeGroupKey(value)===recipeGroupKey(tag));
    choose(preset||tag);custom.value='';custom.focus({preventScroll:true});
  }
  add.addEventListener('click',addCustom);custom.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();addCustom();}});
  done.addEventListener('click',()=>close(true));
  document.addEventListener('click',event=>{if(opened&&!field.contains(event.target))close();},true);
  dialog.addEventListener('keydown',event=>{if(opened&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}},true);
  dialog.addEventListener('cancel',event=>{if(opened){event.preventDefault();close(true);}});
  dialog.addEventListener('close',()=>close());
  input.addEventListener('change',refresh);
  return {refresh,close,reset(){close();custom.value='';feedback.textContent='';refresh();},open};
}
