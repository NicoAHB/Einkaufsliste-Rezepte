import { RECIPE_GROUPS, chooseRecipeGroup, normalizeRecipeGroups, recipeGroupConflicts, recipeGroupKey, recipeGroupSuggestions } from './recipe-tags.js';

const element=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
export function mountRecipeTagPicker({input,trigger,selection,menu,options,feedback,warning,custom,add,done,dialog,knownTags,recipe}) {
  const selected=menu.querySelector('[data-group-selection]'),sheetWarning=menu.querySelector('[data-group-warning]'),proposals=menu.querySelector('[data-group-proposals]'),inlineProposals=dialog.querySelector('[data-group-proposals]'),ownSection=menu.querySelector('#recipe-group-own');
  const values=()=>normalizeRecipeGroups(input.value.split(','));
  let openSections=new Set();
  function close(focus=false){
    if(menu.open)menu.close();trigger.setAttribute('aria-expanded','false');if(focus&&dialog.open)trigger.focus({preventScroll:true});
  }
  function updateSuggestions(){
    if(!dialog.open)return;
    const suggestions=recipeGroupSuggestions({...recipe(),tags:values()});
    for(const container of [inlineProposals,proposals]){
      container.replaceChildren();container.hidden=!suggestions.length;if(!suggestions.length)continue;
      container.append(element('p','Vorschläge für dein Rezept','recipe-group-caption'));
      const choices=element('div',undefined,'recipe-group-choices');
      for(const {tag,reason} of suggestions){
        const button=element('button',`+ ${tag}`,'recipe-group-suggestion');button.type='button';button.title=reason;button.setAttribute('aria-label',`Vorschlag ${tag} übernehmen`);
        button.addEventListener('click',()=>choose(tag));choices.append(button);
      }
      container.append(choices);
      if(container===proposals)container.append(element('p','Aus Name und Zutaten – bitte prüfen.','recipe-group-help'));
    }
  }
  function refresh(){
    const tags=values();selection.replaceChildren();selected.replaceChildren();
    if(!tags.length){selection.append(element('span','Gruppen auswählen','recipe-group-placeholder'));selected.append(element('p','Noch keine Gruppe ausgewählt.','hint'));}
    for(const tag of tags){
      selection.append(element('span',tag,'recipe-group-chip'));
      const remove=element('button',undefined,'recipe-group-remove');remove.type='button';remove.setAttribute('aria-label',`${tag} abwählen`);remove.append(element('span',tag),element('span','×','recipe-group-cross'));
      remove.addEventListener('click',()=>{choose(tag);done.focus({preventScroll:true});});selected.append(remove);
    }
    trigger.setAttribute('aria-label',`Rezeptgruppen auswählen${tags.length?`: ${tags.join(', ')}`:''}`);
    const conflicts=recipeGroupConflicts(tags),message=conflicts.length?`Diese Gruppen passen nicht zusammen: ${conflicts.map(pair=>pair.join(' + ')).join('; ')}. Wähle bitte die passende Einordnung.`:'';
    for(const node of [warning,sheetWarning]){node.hidden=!conflicts.length;node.textContent=message;}
    if(options.children.length)openSections=new Set([...options.querySelectorAll('details[open]')].map(section=>section.dataset.section));
    options.replaceChildren();
    const groups=RECIPE_GROUPS.map(group=>({...group,tags:[...group.tags]})),preset=new Set(groups.flatMap(group=>group.tags).map(recipeGroupKey));
    const own=normalizeRecipeGroups([...tags,...knownTags()]).filter(tag=>!preset.has(recipeGroupKey(tag))).sort((a,b)=>a.localeCompare(b,'de'));
    if(own.length)groups.push({title:'Eigene Gruppen',tags:own});
    for(const group of groups){
      const section=element('details',undefined,'recipe-group-section'),heading=element('summary',group.title),choices=element('div',undefined,'recipe-group-choices');
      section.dataset.section=group.title;section.open=openSections.has(group.title);section.append(heading,choices);
      choices.setAttribute('role','group');choices.setAttribute('aria-label',group.title);
      for(const tag of group.tags){
        const key=recipeGroupKey(tag),button=element('button',tag,'recipe-group-option');button.type='button';button.dataset.group=key;
        button.setAttribute('aria-pressed',String(tags.some(value=>recipeGroupKey(value)===key)));button.addEventListener('click',()=>choose(tag,key));choices.append(button);
      }
      options.append(section);
    }
    updateSuggestions();
  }
  function choose(tag,focusKey){
    const result=chooseRecipeGroup(values(),tag);input.value=result.tags.join(', ');refresh();
    feedback.textContent=result.removed.length?`${result.removed.map(value=>`„${value}“`).join(', ')} ${result.removed.length===1?'wurde':'wurden'} abgewählt, weil du „${tag}“ gewählt hast.`:'';
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    if(focusKey)[...options.querySelectorAll('button')].find(button=>button.dataset.group===focusKey)?.focus({preventScroll:true});
  }
  function open(){refresh();feedback.textContent='';menu.showModal();menu.scrollTop=0;trigger.setAttribute('aria-expanded','true');}
  trigger.addEventListener('click',open);
  function addCustom(){
    const tag=custom.value.normalize('NFKC').trim().replace(/\s+/g,' ');
    if(!tag){feedback.textContent='Bitte einen Namen für die eigene Gruppe eingeben.';custom.focus();return;}
    if(tag.includes(',')){feedback.textContent='Bitte nur eine Gruppe auf einmal hinzufügen.';return;}
    if(tag.length>30){feedback.textContent='Bitte einen kürzeren Gruppennamen wählen (höchstens 30 Zeichen).';return;}
    if(values().some(value=>recipeGroupKey(value)===recipeGroupKey(tag))){feedback.textContent='Diese Gruppe ist bereits ausgewählt.';custom.value='';return;}
    const preset=RECIPE_GROUPS.flatMap(group=>group.tags).find(value=>recipeGroupKey(value)===recipeGroupKey(tag));choose(preset||tag);custom.value='';custom.focus({preventScroll:true});
  }
  add.addEventListener('click',addCustom);custom.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.stopPropagation();addCustom();}});
  done.addEventListener('click',()=>close(true));
  menu.querySelector('[data-group-close]').addEventListener('click',()=>close(true));
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}},true);
  menu.addEventListener('cancel',event=>{event.preventDefault();close(true);});menu.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));
  dialog.addEventListener('close',()=>close());input.addEventListener('change',refresh);
  const form=input.form;form.addEventListener('input',event=>{if(event.target!==input)updateSuggestions();});
  new MutationObserver(updateSuggestions).observe(form.querySelector('#ingredient-editor'),{childList:true,subtree:true});
  return {refresh,close,reset(){close();custom.value='';feedback.textContent='';ownSection.open=false;options.replaceChildren();openSections=new Set();refresh();},open};
}
