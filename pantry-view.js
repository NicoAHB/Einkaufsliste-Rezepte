/* Einkaufsdialog für lange gedrückte Vorratsbilder. Keine eigene Vorratsseite
   und kein eigener Speicherweg: die App sichert Einkäufe in ihrer Warteschlange. */
import { shoppingAmount } from './buying.js';
import { mountQuantityControls } from './quantity-controls.js';
import { itemCategory } from './categories.js';
import { groupImageFor, imageForProduct, paintProductImage } from './product-images.js';

export function mountPantryBuy({getScope,getStores,getPreferredStore,getHistory,onBuy}) {
  const $=id=>document.getElementById(id),dialog=$('pantry-buy-dialog'),form=$('pantry-buy-form');
  let product=null,scope='',lastStore='',sending=false;
  const controls=mountQuantityControls(form,{getHistory,getName:()=>product?.name||''});
  function error(message){$('pantry-buy-error').textContent=message;$('pantry-buy-error').hidden=false;}
  function stores(){
    const previous=form.elements.storeId.value,select=form.elements.storeId;
    select.replaceChildren(new Option('Kein Geschäft',''));
    for(const store of getStores())select.add(new Option(store.name,store.id));
    if(previous&&!getStores().some(store=>store.id===previous)){const missing=new Option('Geschäft gelöscht – bitte wählen',previous);missing.disabled=true;select.add(missing);}
    select.value=previous;
  }
  function refresh(){
    if(!dialog.open)return;
    if(scope!==getScope()){dialog.close();product=null;lastStore='';return;}
    stores();const missing=form.elements.storeId.value&&!getStores().some(store=>store.id===form.elements.storeId.value);
    $('pantry-buy-add').disabled=Boolean(missing||sending);
    if(missing)error('Dieses Geschäft wurde gelöscht. Bitte ein anderes wählen.');
  }
  form.elements.storeId.addEventListener('change',()=>{$('pantry-buy-error').hidden=true;refresh();});
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!dialog.open||!product||sending)return;
    try{
      $('pantry-buy-error').hidden=true;
      if(scope!==getScope())throw new Error('Die Datenverbindung hat sich geändert. Bitte erneut öffnen.');
      const storeId=form.elements.storeId.value,amount=controls.read();
      if(amount.quantity>1000000||!amount.unit||amount.unit.length>30)throw new Error('Bitte Menge und Einheit prüfen.');
      if(storeId&&!getStores().some(store=>store.id===storeId))throw new Error('Bitte ein verfügbares Geschäft wählen.');
      sending=true;refresh();
      onBuy([{name:product.name,...amount,category:itemCategory(product),imageKey:product.imageKey||null}],storeId);
      lastStore=storeId;
      $('product-picker-feedback').textContent=`${product.name}: ${shoppingAmount({name:product.name,...amount})} auf die Einkaufsliste gesetzt.`;
      $('product-picker-feedback').hidden=false;dialog.close();
    }catch(failure){error(failure.message);}finally{sending=false;refresh();}
  });
  dialog.addEventListener('close',()=>{if(!dialog.open)product=null;});
  return {
    refresh,
    buyProduct(value){
      if(scope&&scope!==getScope())lastStore='';scope=getScope();product={...value};
      $('pantry-buy-title').textContent='Auf die Einkaufsliste';
      $('pantry-buy-hint').textContent='Wähle Menge und Geschäft. Ein passendes Produkt auf der Liste wird um diese Menge ergänzt. Dein Vorrat bleibt unverändert.';
      $('pantry-buy-error').hidden=true;
      const photo=document.createElement('span');photo.className='pantry-photo';photo.setAttribute('aria-hidden','true');
      paintProductImage(photo,imageForProduct(product),groupImageFor(product.name,itemCategory(product)));
      const name=document.createElement('strong');name.textContent=product.name;$('pantry-buy-name').replaceChildren(photo,name);
      controls.reset();controls.suggest(product.name,true);stores();
      const preferred=lastStore||getPreferredStore();form.elements.storeId.value=getStores().some(store=>store.id===preferred)?preferred:'';
      dialog.showModal();dialog.scrollTop=0;refresh();dialog.querySelector('[data-close]').focus({preventScroll:true});
    }
  };
}
