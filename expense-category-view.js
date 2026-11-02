import { addExpenseCategoryChanges, defaultExpenseCategory, deleteExpenseCategoryChanges, expenseCategories, expenseCategoryUsage, orderExpenseCategoryChanges, purchaseCategory, resolveExpenseCategory } from './expense-categories.js';
import { mountStoreOrder } from './store-order.js';

export function mountExpenseCategoryPicker({getData,getScope,onCommit,beforeDelete=async()=>{},makeIcon,onOrder}) {
  const $=id=>document.getElementById(id),form=$('purchase-form'),trigger=$('purchase-note-toggle'),panel=$('purchase-note-picks'),list=$('purchase-category-list');
  const addDialog=$('expense-category-add-dialog'),deleteDialog=$('expense-category-delete-dialog');
  let scope=getScope(),selectedId=null,editingId='',dirty=false,editing=false,version='',removingId='',preview='',working=false;
  const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
  const fail=(id,message)=>{const el=$(id);el.textContent=message;el.hidden=!message;};
  const categories=()=>expenseCategories(getData());
  const signature=()=>JSON.stringify([getScope(),categories().map(row=>[row.id,row.name,row.sortOrder])]);
  const usageSignature=()=>JSON.stringify([getScope(),removingId,expenseCategoryUsage(getData(),removingId).map(row=>[row.id,Boolean(row.deletedAt)]).sort()]);
  function setSelected(id,user=false) {
    const row=id?resolveExpenseCategory(getData(),id):null;selectedId=row?.id||null;if(user)dirty=true;
    form.elements.categoryId.value=selectedId||'';form.elements.note.value=row?.name||'';
    $('purchase-category-value').textContent=row?.name||'Ohne Kategorie';
  }
  function show(open) {
    panel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
    if(!open){sort.cancel();editing=false;$('purchase-category-edit').textContent='Bearbeiten';}
  }
  function announce(text){$('purchase-category-feedback').textContent=text;}
  const sort=mountStoreOrder(list,{itemSelector:'.expense-category-row',handleSelector:'.expense-category-drag',scrollContainer:list,immediate:true,
    enabled:()=>editing&&!panel.hidden,getVersion:signature,
    onChange:ids=>{onCommit(orderExpenseCategoryChanges(getData(),ids));renderMenu();},announce,onError:error=>fail('purchase-category-error',error.message)});
  function renderMenu() {
    sort.cancel();list.replaceChildren();version=signature();
    for(const row of categories()) {
      const item=node('div',undefined,'expense-category-row');item.dataset.storeId=row.id;
      const choice=node(editing?'span':'button',row.name,'expense-category-choice');
      if(!editing){choice.type='button';choice.setAttribute('aria-pressed',String(row.id===selectedId));choice.addEventListener('click',()=>{setSelected(row.id,true);show(false);trigger.focus({preventScroll:true});});}
      item.append(choice);
      if(editing){
        const remove=node('button',undefined,'icon-button expense-category-remove');remove.type='button';remove.setAttribute('aria-label',`${row.name}: Kategorie löschen`);remove.append(makeIcon('x'));remove.addEventListener('click',()=>openDelete(row.id));
        const drag=node('button','☰','icon-button expense-category-drag');drag.type='button';drag.setAttribute('aria-label',`${row.name}: Reihenfolge ändern`);drag.setAttribute('aria-keyshortcuts','Alt+ArrowUp Alt+ArrowDown');
        drag.addEventListener('click',()=>onOrder?.(()=>categories(),ids=>{onCommit(orderExpenseCategoryChanges(getData(),ids));renderMenu();}));
        item.append(remove,drag);
      }
      list.append(item);
    }
    if(!list.children.length)list.append(node('p','Noch keine Kategorien. Füge unten eine hinzu.','hint'));
    $('purchase-category-edit').textContent=editing?'Fertig':'Bearbeiten';$('purchase-category-edit').setAttribute('aria-pressed',String(editing));
    $('purchase-category-none').hidden=editing;
  }
  trigger.addEventListener('pointerdown',()=>{if(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement)document.activeElement.blur();});
  trigger.addEventListener('click',()=>{if(!panel.hidden){show(false);return;}if(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement)document.activeElement.blur();trigger.focus({preventScroll:true});fail('purchase-category-error','');show(true);renderMenu();});
  $('purchase-category-edit').addEventListener('click',()=>{editing=!editing;renderMenu();});
  $('purchase-category-none').addEventListener('click',()=>{setSelected(null,true);show(false);trigger.focus({preventScroll:true});});
  $('purchase-category-add').addEventListener('click',()=>{
    $('expense-category-add-form').reset();fail('expense-category-add-error','');addDialog.showModal();$('expense-category-name').focus();
  });
  $('expense-category-add-form').addEventListener('submit',event=>{
    event.preventDefault();try{
      if(scope!==getScope())throw new Error('Die Datenverbindung hat sich geändert. Bitte die Kategorie erneut anlegen.');
      const result=addExpenseCategoryChanges(getData(),$('expense-category-name').value);onCommit(result.changes);setSelected(result.id,true);addDialog.close();
      if(editing)renderMenu();else show(false);announce('Kategorie hinzugefügt.');trigger.focus({preventScroll:true});
    }catch(error){fail('expense-category-add-error',error.message);}
  });
  function renderDelete() {
    const source=categories().find(row=>row.id===removingId),usage=expenseCategoryUsage(getData(),removingId),target=$('expense-category-replacement'),selected=target.value;
    $('expense-category-delete-copy').textContent=source?`Kategorie „${source.name}“ löschen?`:'Diese Kategorie wurde inzwischen entfernt.';
    const hidden=usage.filter(row=>row.deletedAt).length;
    $('expense-category-delete-usage').textContent=usage.length?`${usage.length} gespeicherte ${usage.length===1?'Buchung ist':'Buchungen sind'} zugeordnet${hidden?` (davon ${hidden} bereits entfernt)`:''}. Wähle eine andere Kategorie. Alle Beträge und Buchungsdaten bleiben erhalten.`:'Es sind keine Buchungen zugeordnet.';
    target.replaceChildren(new Option('Andere Kategorie wählen',''));
    for(const row of categories())if(row.id!==removingId)target.add(new Option(row.name,row.id));
    target.value=[...target.options].some(option=>option.value===selected)?selected:'';
    $('expense-category-replacement-field').hidden=!usage.length;
    $('expense-category-no-target').hidden=!usage.length||target.options.length>1;
    preview=usageSignature();updateDelete();
  }
  function updateDelete(){deleteDialog.querySelectorAll('[data-close]').forEach(node=>node.disabled=working);$('expense-category-replacement').disabled=working;$('expense-category-delete-form').setAttribute('aria-busy',String(working));$('expense-category-delete-apply').textContent=working?'Buchungen werden geprüft …':'Kategorie löschen';const hasUsage=expenseCategoryUsage(getData(),removingId).length>0;$('expense-category-delete-apply').disabled=working||!categories().some(row=>row.id===removingId)||(hasUsage&&!$('expense-category-replacement').value);}
  function openDelete(id){removingId=id;$('expense-category-replacement').value='';fail('expense-category-delete-error','');renderDelete();deleteDialog.showModal();deleteDialog.querySelector('[data-close]').focus({preventScroll:true});}
  $('expense-category-replacement').addEventListener('change',updateDelete);
  $('expense-category-delete-form').addEventListener('submit',async event=>{
    event.preventDefault();if(working||$('expense-category-delete-apply').disabled)return;
    const confirmed=preview,confirmedScope=scope,target=$('expense-category-replacement').value;working=true;updateDelete();fail('expense-category-delete-error','');
    try{
      await beforeDelete();
      if(confirmedScope!==getScope())throw new Error('Die Datenverbindung hat sich geändert. Bitte erneut öffnen.');
      if(confirmed!==usageSignature()){renderDelete();throw new Error('Die Zuordnung hat sich inzwischen geändert. Bitte prüfen und erneut bestätigen.');}
      onCommit(deleteExpenseCategoryChanges(getData(),removingId,target));working=false;deleteDialog.close();setSelected(selectedId);if(!panel.hidden)renderMenu();announce('Kategorie entfernt. Die Buchungen bleiben erhalten.');
    }catch(error){renderDelete();fail('expense-category-delete-error',error.message);}
    finally{working=false;updateDelete();}
  });
  deleteDialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});
  deleteDialog.addEventListener('close',()=>{if(working){deleteDialog.showModal();return;}removingId='';});
  $('purchase-dialog').addEventListener('close',()=>{show(false);editingId='';dirty=false;});
  function refresh() {
    if(scope!==getScope()){sort.cancel();scope=getScope();selectedId=null;editingId='';dirty=false;show(false);addDialog.close();if(!working)deleteDialog.close();return;}
    if($('purchase-dialog').open){const current=editingId&&!dirty?(getData().purchases||[]).find(row=>row.id===editingId):null;setSelected(current?purchaseCategory(getData(),current)?.id:selectedId);}
    if(!panel.hidden&&signature()!==version)renderMenu();
    if(deleteDialog.open&&!working&&usageSignature()!==preview)renderDelete();
  }
  return {refresh,busy:()=>working,changed:()=>dirty,
    open(row=null){scope=getScope();editingId=row?.id||'';dirty=false;editing=false;show(false);fail('purchase-category-error','');setSelected(row?purchaseCategory(getData(),row)?.id:defaultExpenseCategory(getData())?.id);},
    fields(){const row=selectedId?resolveExpenseCategory(getData(),selectedId):null;return {categoryId:row?.id||null,note:row?.name||''};}
  };
}
