import {emptyPrivateList,privateListKey,readPrivateList,updatePrivateList} from './private-list.js';

// Ein eigener Datenweg: kein Zugriff auf den gemeinsamen Zustand oder commit().
export function mountPrivateList({getScope,onChange,onError,makeId,makeIcon,makeThumb,imagesOn,storage=localStorage}) {
  const $=id=>document.getElementById(id),toggles=['settings-private-list','stores-private-list'];
  const node=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
  let scope=null,state=emptyPrivateList(),editing=null,fault=false;
  const dialog=$('private-item-dialog'),form=$('private-item-form');
  function fail(error) {onError(error?.name==='QuotaExceededError'?'Die geheime Liste konnte auf diesem Gerät nicht gespeichert werden. Deine bisherigen Einträge bleiben erhalten.':error.message||'Die geheime Liste konnte auf diesem Gerät nicht gespeichert werden.');}
  function mutate(change) {
    try {state=updatePrivateList(storage,scope,change);fault=false;onChange();return true;}
    catch(error){render();fail(error);return false;}
  }
  function edit(id) {
    const item=state.items.find(row=>row.id===id);if(!item)return;
    form.reset();form.elements.name.value=item.name;form.elements.note.value=item.note;
    editing={id,scope,baseline:{name:item.name,note:item.note}};dialog.showModal();
  }
  function row(item) {
    const li=node('li',undefined,`private-row${item.checked?' checked':''}`);li.dataset.privateId=item.id;
    const check=node('button',undefined,'check');check.type='button';check.setAttribute('aria-label',`${item.name}: ${item.checked?'wieder öffnen':'abhaken'}`);check.setAttribute('aria-pressed',String(item.checked));if(item.checked)check.append(makeIcon('check'));
    check.addEventListener('click',()=>mutate(data=>{const current=data.items.find(row=>row.id===item.id);if(current)current.checked=!current.checked;return data;}));
    const copy=node('button',undefined,'private-copy');copy.type='button';copy.append(node('strong',item.name));if(item.note)copy.append(node('small',item.note));copy.setAttribute('aria-label',`${item.name} privat bearbeiten`);copy.addEventListener('click',()=>edit(item.id));
    li.append(check,copy);if(imagesOn())li.append(makeThumb(item));return li;
  }
  function render() {
    for(const id of toggles){$(id).checked=state.enabled;$(id).disabled=fault;}
    const open=state.items.filter(item=>!item.checked),done=state.items.filter(item=>item.checked);
    $('private-list-count').textContent=`${open.length} offen${done.length?` · ${done.length} erledigt`:''}`;
    $('private-items').replaceChildren(...open.map(row));
    $('private-list-empty').hidden=Boolean(open.length);$('private-list-empty').textContent=state.items.length?'Alles erledigt. Du kannst weitere private Einträge hinzufügen.':'Hier stehen nur deine privaten Einträge.';
    $('private-done').hidden=!done.length;$('private-done-count').textContent=`Erledigt (${done.length})`;$('private-done-items').replaceChildren(...done.map(row));
    $('private-add').disabled=fault;
  }
  function refresh() {
    const next=getScope();
    if(scope!==next){scope=next;editing=null;dialog.close();form.reset();$('private-add-form').reset();}
    try {state=readPrivateList(storage,scope);fault=false;}
    catch(error){state=emptyPrivateList();if(!fault)fail(error);fault=true;}
    render();
  }
  for(const id of toggles)$(id).addEventListener('change',event=>{const enabled=event.target.checked;mutate(data=>({...data,enabled}));});
  $('private-add-form').addEventListener('submit',event=>{
    event.preventDefault();const field=event.currentTarget.elements.name,name=field.value.trim();if(!name){field.focus();return;}
    if(mutate(data=>({...data,items:[...data.items,{id:makeId(),name,note:'',checked:false,createdAt:new Date().toISOString()}]}))){field.value='';field.focus();}
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();const pending=editing;if(!pending||pending.scope!==scope)return;
    const name=form.elements.name.value.trim(),note=form.elements.note.value.trim();if(!name){form.elements.name.focus();return;}
    if(mutate(data=>{
      const item=data.items.find(row=>row.id===pending.id);if(!item)throw new Error('Dieser private Eintrag wurde inzwischen entfernt.');
      if(name!==pending.baseline.name)item.name=name;if(note!==pending.baseline.note)item.note=note;return data;
    }))dialog.close();
  });
  $('private-item-delete').addEventListener('click',()=>{
    const pending=editing;if(!pending||pending.scope!==scope||!confirm('Diesen Eintrag aus deiner geheimen Liste löschen?'))return;
    if(mutate(data=>({...data,items:data.items.filter(row=>row.id!==pending.id)})))dialog.close();
  });
  dialog.addEventListener('close',()=>{editing=null;form.reset();});
  window.addEventListener('storage',event=>{if(event.key===privateListKey(getScope())||event.key===null){refresh();onChange();}});
  refresh();
  return {refresh,get enabled(){return state.enabled;},get count(){return state.items.filter(item=>!item.checked).length;}};
}
