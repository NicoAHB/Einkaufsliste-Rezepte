import {emptyPrivateList,privateListKey,readPrivateList,updatePrivateList,privateLists,privateItemListId,withPrivateLists,privateDeleted,privateTrash,prunePrivateTrash} from './private-list.js';

// Eigener Datenweg: keine gemeinsamen Daten oder Synchronisationsoperationen.
export function mountPrivateList({getScope,onChange,onError,onDeleted=()=>{},onEdit=()=>{},onSaved=()=>{},makeId,makeIcon,makeThumb,imagesOn,storage=localStorage}) {
  const $=id=>document.getElementById(id);
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  let scope=null,state=emptyPrivateList(),editing=null,selected='',fault=false;
  const dialog=$('private-item-dialog'),form=$('private-item-form');
  // Gelöschte Einträge (Löschmarke) stehen nur im Papierkorb, nicht mehr in der Liste.
  const lists=()=>privateLists(state),list=id=>lists().find(row=>row.id===id),items=id=>state.items.filter(row=>!privateDeleted(row)&&privateItemListId(row,state)===id);
  function fail(error){onError(error?.name==='QuotaExceededError'?'Die geheime Liste konnte auf diesem Gerät nicht gespeichert werden. Deine bisherigen Einträge bleiben erhalten.':error.message||'Die geheime Liste konnte auf diesem Gerät nicht gespeichert werden.');}
  function mutate(change){
    try{state=updatePrivateList(storage,scope,data=>prunePrivateTrash(change(withPrivateLists(data))));fault=false;onChange();return true;}
    catch(error){render();fail(error);return false;}
  }
  function edit(id){
    const item=items(selected).find(row=>row.id===id);if(!item)return;
    form.reset();form.elements.name.value=item.name;form.elements.note.value=item.note;
    editing={id,scope,listId:selected,baseline:{name:item.name,note:item.note}};dialog.showModal();onEdit(form,item);
  }
  function row(item){
    const li=node('li',undefined,`private-row${item.checked?' checked':''}`);li.dataset.privateId=item.id;li.dataset.id=item.id;   // data-id: lange halten und in den Mülleimer ziehen
    const check=node('button',undefined,'check');check.type='button';check.setAttribute('aria-label',`${item.name}: ${item.checked?'wieder öffnen':'abhaken'}`);check.setAttribute('aria-pressed',String(item.checked));if(item.checked)check.append(makeIcon('check'));
    check.addEventListener('click',()=>mutate(data=>{const current=data.items.find(row=>row.id===item.id&&row.listId===selected);if(current)current.checked=!current.checked;return data;}));
    const copy=node('button',undefined,'private-copy');copy.type='button';copy.append(node('strong',item.name));
    if(item.source?.quantity&&item.source?.unit)copy.append(node('small',`${item.source.quantity} ${item.source.unit}`));
    if(item.note)copy.append(node('small',item.note));copy.setAttribute('aria-label',`${item.name} privat bearbeiten`);copy.addEventListener('click',()=>edit(item.id));
    li.append(check,copy);if(imagesOn())li.append(makeThumb(item));return li;
  }
  function render(){
    const current=list(selected),rows=current?items(selected):[],open=rows.filter(item=>!item.checked),done=rows.filter(item=>item.checked);
    $('private-list-name').textContent=current?.name||'Geheime Liste';
    $('private-list-count').textContent=`${open.length} offen${done.length?` · ${done.length} erledigt`:''}`;
    $('private-items').replaceChildren(...open.map(row));$('private-done-items').replaceChildren(...done.map(row));
    $('private-list-empty').hidden=Boolean(open.length);$('private-list-empty').textContent=rows.length?'Alles erledigt. Du kannst weitere private Einträge hinzufügen.':'Hier stehen nur deine privaten Einträge.';
    $('private-done').hidden=!done.length;$('private-done-count').textContent=`Erledigt (${done.length})`;
    $('private-add').disabled=fault||!current;
  }
  function refresh(){
    const next=getScope();if(scope!==next){scope=next;selected='';editing=null;dialog.close();form.reset();$('private-add-form').reset();}
    try{state=readPrivateList(storage,scope);fault=false;}catch(error){state=emptyPrivateList();if(!fault)fail(error);fault=true;}
    if(!list(selected))selected=lists().find(row=>row.enabled)?.id||lists()[0]?.id||'';
    render();
  }
  function createList(name,rows=[]){
    const id=makeId(),now=new Date().toISOString();
    if(!mutate(data=>{
      if(data.lists.some(row=>row.name.toLocaleLowerCase('de')===name.toLocaleLowerCase('de')))throw new Error('Eine geheime Liste mit diesem Namen gibt es auf diesem Gerät bereits.');
      data.lists.push({id,name,symbol:'secret',enabled:true,updatedAt:now});data.enabled=true;
      data.items.push(...rows.map(row=>({...row,id:makeId(),listId:id,createdAt:now})));return data;
    }))return null;
    return id;
  }
  function renameList(id,name){return mutate(data=>{const current=data.lists.find(row=>row.id===id);if(!current)throw new Error('Diese geheime Liste wurde inzwischen entfernt.');current.name=name;current.updatedAt=new Date().toISOString();return data;});}
  function removeList(id){return mutate(data=>{data.lists=data.lists.filter(row=>row.id!==id);data.items=data.items.filter(row=>row.listId!==id);data.enabled=data.lists.some(row=>row.enabled);return data;});}
  function setEnabled(id,enabled){return mutate(data=>{const current=data.lists.find(row=>row.id===id);if(!current)throw new Error('Diese geheime Liste wurde inzwischen entfernt.');current.enabled=enabled;current.updatedAt=new Date().toISOString();data.enabled=data.lists.some(row=>row.enabled);return data;});}
  function prepareShare(id){
    if(!mutate(data=>{
      const current=data.lists.find(row=>row.id===id);if(!current)throw new Error('Diese geheime Liste wurde inzwischen entfernt.');
      current.sharedStoreId ||= makeId();for(const item of data.items.filter(row=>row.listId===id))item.sharedId ||= makeId();return data;
    }))return null;
    return {list:structuredClone(list(id)),items:structuredClone(items(id))};
  }
  $('private-add-form').addEventListener('submit',event=>{
    event.preventDefault();const field=event.currentTarget.elements.name,name=field.value.trim();if(!name||!list(selected)){field.focus();return;}
    // Nach dem Hinzufügen schließt sich die Tastatur (2.147): Der neue Eintrag ist sofort in der Liste zu sehen und nicht von ihr verdeckt.
    if(mutate(data=>{data.items.push({id:makeId(),listId:selected,name,note:'',checked:false,createdAt:new Date().toISOString()});return data;})){field.value='';field.blur();}
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();const pending=editing;if(!pending||pending.scope!==scope)return;
    const name=form.elements.name.value.trim(),note=form.elements.note.value.trim();if(!name){form.elements.name.focus();return;}
    const at=new Date().toISOString();
    if(mutate(data=>{const item=data.items.find(row=>row.id===pending.id&&row.listId===pending.listId&&!privateDeleted(row));if(!item)throw new Error('Dieser private Eintrag wurde inzwischen entfernt.');if(name!==pending.baseline.name)item.name=name;if(note!==pending.baseline.note)item.note=note;item.updatedAt=at;return data;})){dialog.close();onSaved(name);}
  });
  // Löschen legt den Eintrag in den Papierkorb (2.147): ohne Rückfrage, dafür mit „Rückgängig“ und 14 Tage unter „Kürzlich gelöscht“.
  function remove(id,{quiet=false}={}){
    const item=state.items.find(row=>row.id===id&&!privateDeleted(row));if(!item)return null;
    const at=new Date().toISOString();
    if(!mutate(data=>{const current=data.items.find(row=>row.id===id);if(!current||privateDeleted(current))throw new Error('Dieser private Eintrag wurde inzwischen entfernt.');current.deletedAt=at;return data;}))return null;
    const removed={id,name:item.name};if(!quiet)onDeleted(removed);return removed;
  }
  function restore(id){
    return mutate(data=>{
      const current=data.items.find(row=>row.id===id);if(!current||!privateDeleted(current))throw new Error('Dieser Eintrag ist nicht mehr im Papierkorb.');
      if(!privateLists(data).some(row=>row.id===privateItemListId(current,data)))throw new Error('Die geheime Liste dieses Eintrags gibt es auf diesem Gerät nicht mehr.');
      delete current.deletedAt;return data;
    });
  }
  // Einträge für „Kürzlich gelöscht“, im Format von trashEntries (trash.js).
  function trash(now=Date.now()){
    return privateTrash(state,now).map(row=>({kind:'private',collection:'private',id:row.id,title:row.name,detail:[list(privateItemListId(row,state))?.name||'Geheime Liste','nur auf diesem Gerät'].join(' · '),deletedAt:row.deletedAt}));
  }
  function purge(){
    const count=privateTrash(state).length;if(!count)return 0;
    return mutate(data=>{data.items=data.items.filter(row=>!privateDeleted(row));return data;})?count:0;
  }
  $('private-item-delete').addEventListener('click',()=>{
    const pending=editing;if(!pending||pending.scope!==scope)return;
    if(remove(pending.id))dialog.close();
  });
  dialog.addEventListener('close',()=>{editing=null;form.reset();});
  window.addEventListener('storage',event=>{if(event.key===privateListKey(getScope())||event.key===null){refresh();onChange();}});
  refresh();
  return {refresh,createList,renameList,removeList,prepareShare,remove,restore,trash,purge,edit:id=>{if(items(selected).some(row=>row.id===id))edit(id);},
    get lists(){return structuredClone(lists());},count:id=>items(id).filter(row=>!row.checked).length,size:id=>items(id).length,
    has:id=>Boolean(list(id)?.enabled),select:id=>{selected=id;render();},
    setEnabled,enable:id=>setEnabled(id,true)};
}
