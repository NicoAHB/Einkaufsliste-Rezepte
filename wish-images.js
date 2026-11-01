/* Kostenlose, lokale Gruppenmotive. Keine Suche, Fremdbilder oder Bilddienste. */
import { groupImage } from './product-images.js';
const normal = value => String(value || '').toLocaleLowerCase('de').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ß/g,'ss').replace(/ae/g,'a').replace(/oe/g,'o').replace(/ue/g,'u');
const drawing = (id,label) => ({kind:'illustration',key:`wish-${id}`,label,url:`assets/wishes/${id}.svg`});
const GROUPS = [
  ['Technik & Multimedia', /playstation|xbox|nintendo|switch|konsole|computer|laptop|notebook|tablet|ipad|iphone|smartphone|handy|fernseher|smart.?tv|\btv\b|monitor|kamera|kopfhor|airpod|lautsprecher|soundbar|drucker|ladekabel|smartwatch|beamer|elektronik|technik|multimedia/, 'electronics'],
  ['Kleidung & Schuhe', /kleidung|schuh|sneaker|stiefel|sandale|jacke|mantel|pullover|hoodie|t.?shirt|bluse|hemd|hose|jeans|kleid|socke|mutze|schal|handschuh/, 'clothing'],
  ['Spielzeug & Spiele', /spielzeug|lego|duplo|puzzle|puppe|playmobil|kuscheltier|teddy|brettspiel|kartenspiel|gesellschaftsspiel|spiel\b|spiele\b|ferngesteuert/, 'toys'],
  ['Bücher & Medien', /buch|bucher|roman|krimi|lese|horbuch|e.?book|kindle|tolino|\bdvd\b|blu.?ray|schallplatte|vinyl|\bcd\b|comic|manga|zeitschrift/, 'books'],
  ['Garten & Heimwerken', /garten|pflanz|blume|rasen|grill|werkzeug|bohr|schraub|hammer|sage|hecke|giess|gieß|heimwerk|hochbeet|kompost/, 'garden'],
  ['Sport & Freizeit', /sport|fitness|hantel|yoga|fahrrad|radhelm|camping|zelt|wander|angel|fussball|basketball|tennis|schwimm|kletter|laufband|springseil|trampolin/, 'sports'],
  ['Schönheit & Pflege', /parfum|duft|schmink|kosmetik|pflege|creme|shampoo|dusch|rasier|beauty|mascara|lippen|nagel|make.?up|haar|fohn|glatteisen|wellness/, 'care'],
  ['Schmuck & Accessoires', /schmuck|halskette|armband|ohrring|ring\b|juwel|uhr\b|handtasche|tasche|rucksack|geldborse|portemonnaie|sonnenbrille|accessoire/, 'jewelry'],
  ['Erlebnisse & Reisen', /reise|urlaub|flug|hotel|ubernachtung|konzert|ticket|eintritt|erlebnis|ausflug|gutschein|theater|musical|kino|freizeitpark|massage|essen gehen/, 'travel'],
  ['Haushalt & Wohnen', /haushalt|wohnen|sofa|sessel|mobel|stuhl|tisch|regal|schrank|lampe|leuchte|kerze|kissen|decke|bett|vase|deko|tasse|geschirr|topf|pfanne|mixer|kaffeemaschine|wasserkocher|staubsauger|airfryer|heissluftfritteuse|kuche/, 'kitchenware']
];
const drawings = new Set(['toys','books','jewelry','travel']);
export function wishGroup(name) {
  const found=GROUPS.find(([,pattern])=>pattern.test(normal(name)));
  return found ? {name:found[0],image:drawings.has(found[2]) ? drawing(found[2],found[0]) : groupImage(found[2])} : {name:'Sonstiges',image:groupImage('miscellaneous')};
}
export const wishImage = row => row.wishImageHidden===true ? null : wishGroup(row.name).image;
