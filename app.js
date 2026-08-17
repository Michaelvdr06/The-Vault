const STORAGE_KEY="the-vault-cards-v2",LEGACY_KEY="the-vault-cards-v1";
const $=id=>document.getElementById(id), $$=q=>[...document.querySelectorAll(q)];
const euro=new Intl.NumberFormat("nl-NL",{style:"currency",currency:"EUR"});
const seed=[
{id:crypto.randomUUID(),game:"One Piece TCG",name:"Monkey.D.Luffy",setName:"OP05",cardNumber:"OP05-060",rarity:"Super Rare",condition:"Near Mint",quantity:1,price:24.95,foil:true,image:"",addedAt:Date.now()-3000},
{id:crypto.randomUUID(),game:"Magic: The Gathering",name:"Sol Ring",setName:"Commander Masters",cardNumber:"392",rarity:"Uncommon",condition:"Near Mint",quantity:2,price:1.75,foil:false,image:"",addedAt:Date.now()-2000},
{id:crypto.randomUUID(),game:"One Piece TCG",name:"Roronoa Zoro",setName:"OP01",cardNumber:"OP01-025",rarity:"Super Rare",condition:"Near Mint",quantity:1,price:8.5,foil:true,image:"",addedAt:Date.now()-1000}
];
let cards=JSON.parse(localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_KEY)||"null")||seed;
cards=cards.map(c=>({...c,quantity:Number(c.quantity||1),price:Number(c.price||0),image:c.image||"",addedAt:Number(c.addedAt||Date.now())}));
save();

function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(cards))}
function esc(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function initials(n="TCG"){return n.split(/[.\s-]+/).filter(Boolean).slice(0,3).map(x=>x[0]).join("").toUpperCase()}
function toast(m){const e=$("toast");e.textContent=m;e.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove("show"),1800)}
function gameClass(g){return g==="One Piece TCG"?"op":"mtg"}

function navigate(page){
  $$(".page").forEach(x=>x.classList.remove("active")); $$(".nav-item").forEach(x=>x.classList.remove("active"));
  $(page).classList.add("active"); document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add("active");
  $("pageTitle").textContent={dashboard:"Dashboard",collection:"Mijn binder",add:"Kaart toevoegen",scanner:"Foto scannen"}[page]||"The Vault";
  if(page==="dashboard")renderDashboard(); if(page==="collection")renderCollection();
}
function renderDashboard(){
  const total=cards.reduce((s,c)=>s+c.quantity,0),op=cards.filter(c=>c.game==="One Piece TCG").reduce((s,c)=>s+c.quantity,0),mtg=cards.filter(c=>c.game==="Magic: The Gathering").reduce((s,c)=>s+c.quantity,0);
  const val=cards.reduce((s,c)=>s+c.price*c.quantity,0),foils=cards.filter(c=>c.foil).reduce((s,c)=>s+c.quantity,0);
  $("totalCards").textContent=total;$("uniqueCards").textContent=cards.length;$("opCount").textContent=op;$("mtgCount").textContent=mtg;$("foilCount").textContent=foils;
  $("totalValue").textContent=euro.format(val);$("avgValue").textContent=euro.format(cards.length?val/cards.length:0);
  const opP=total?Math.round(op/total*100):0,mtgP=total?Math.round(mtg/total*100):0;
  $("opPercent").textContent=opP+"%";$("mtgPercent").textContent=mtgP+"%";$("opBar").style.width=opP+"%";$("mtgBar").style.width=mtgP+"%";
  $("recentCards").innerHTML=[...cards].sort((a,b)=>b.addedAt-a.addedAt).slice(0,4).map(c=>`<article class="recent-card"><div class="recent-card-image">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:`<div class="preview-placeholder">${esc(initials(c.name))}</div>`}</div><div class="recent-card-body"><h4>${esc(c.name)}</h4><p>${esc(c.game)} · ${esc(c.setName)} · x${c.quantity}</p><strong>${euro.format(c.quantity*c.price)}</strong></div></article>`).join("")||'<p class="muted">Nog geen kaarten.</p>';
}
function renderCollection(){
  const q=$("searchInput").value.trim().toLowerCase(),game=$("gameFilter").value,sort=$("sortFilter").value;
  let list=cards.filter(c=>([c.name,c.setName,c.cardNumber,c.rarity].join(" ").toLowerCase().includes(q))&&(game==="all"||c.game===game));
  list.sort((a,b)=>sort==="value"?(b.price*b.quantity-a.price*a.quantity):sort==="name"?a.name.localeCompare(b.name):b.addedAt-a.addedAt);
  $("resultCount").textContent=`${list.length} unieke kaarten`; $("emptyState").classList.toggle("hidden",!!list.length);
  $("cardGrid").innerHTML=list.map(c=>`<article class="binder-card"><div class="card-frame">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:`<div class="preview-placeholder">${esc(initials(c.name))}</div>`}<div class="badge-row"><span class="game-chip ${gameClass(c.game)}">${c.game==="One Piece TCG"?"ONE PIECE":"MAGIC"}</span><span class="badge">x${c.quantity}</span></div>${c.foil?'<span class="foil-chip" style="position:absolute;left:10px;bottom:10px;">FOIL</span>':""}<div class="card-overlay"></div></div><div class="card-info"><h4>${esc(c.name)}</h4><p>${esc(c.setName)} · ${esc(c.cardNumber||"—")} · ${esc(c.rarity)}</p><div class="card-info-footer"><strong>${euro.format(c.price)}</strong><button class="delete-btn" data-delete="${c.id}">Verwijder</button></div></div></article>`).join("");
  $$("[data-delete]").forEach(b=>b.onclick=()=>{cards=cards.filter(c=>c.id!==b.dataset.delete);save();renderCollection();renderDashboard();toast("Kaart verwijderd.")});
}
function updatePreview(){
  const name=$("name").value||"Nieuwe kaart",img=$("image").value.trim();
  $("previewGame").textContent=$("game").value;$("previewName").textContent=name;$("previewSet").textContent=$("setName").value||"Set";$("previewNumber").textContent=$("cardNumber").value||"000";
  $("previewImageWrap").innerHTML=img?`<img src="${esc(img)}" alt="${esc(name)}">`:`<div class="preview-placeholder">${esc(initials(name))}</div>`;
}
function addCard(data){cards.unshift({...data,id:crypto.randomUUID(),addedAt:Date.now(),quantity:Number(data.quantity||1),price:Number(data.price||0)});save();renderDashboard();renderCollection()}
function fillForm(c){
  $("game").value=c.game;$("name").value=c.name;$("setName").value=c.setName;$("cardNumber").value=c.cardNumber||"";$("rarity").value=c.rarity||"Rare";$("condition").value="Near Mint";$("quantity").value=1;$("price").value=Number(c.price||0);$("image").value=c.image||"";$("foil").checked=!!c.foil;updatePreview();navigate("add");toast("Kaartdata ingevuld.");
}
async function magicSearch(q){
  const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(q)}`),d=await r.json(); if(!r.ok||d.object==="error")return null;
  const image=d.image_uris?.normal||d.card_faces?.find(f=>f.image_uris)?.image_uris?.normal||"";
  return {game:"Magic: The Gathering",name:d.name,setName:d.set_name||d.set?.toUpperCase(),cardNumber:d.collector_number||"",rarity:(d.rarity||"rare").replace(/\b\w/g,x=>x.toUpperCase()),price:Number(d.prices?.eur||d.prices?.usd||0),foil:false,image};
}
function opCode(q){return (q.toUpperCase().replace(/\s+/g,"").match(/(?:OP|ST|P|EB|PRB|PR)0?\d{1,2}-\d{3}/)||[])[0]||""}
async function opSearch(q){
  const code=opCode(q); if(!code)return null;
  for(const url of [`https://optcgapi.com/api/sets/card/${code}/`,`https://optcgapi.com/api/decks/card/${code}/`,`https://optcgapi.com/api/promos/card/${code}/`]){
    try{const r=await fetch(url);if(!r.ok)continue;let d=await r.json();d=Array.isArray(d)?d[0]:(d.card||d.data||d);if(!d)continue;
      const image=d.image||d.image_url||d.img||d.img_url||d.card_image||d.cardImage||"";
      return {game:"One Piece TCG",name:d.name||d.card_name||d.cardName||code,setName:d.set_name||d.setName||d.set||code.split("-")[0],cardNumber:d.card_id||d.cardId||d.id||code,rarity:String(d.rarity||d.card_rarity||"Rare"),price:Number(d.market_price||d.price||d.low_price||0),foil:false,image};
    }catch{}
  } return null;
}
async function lookupCard(){
  const game=$("lookupGame").value,q=$("lookupQuery").value.trim();if(!q)return $("lookupStatus").textContent="Voer eerst een zoekterm in.";
  $("lookupStatus").textContent="Zoeken...";$("lookupResults").innerHTML="";
  try{const c=game==="Magic: The Gathering"?await magicSearch(q):await opSearch(q);if(!c)return $("lookupStatus").textContent="Geen kaart gevonden.";
    $("lookupStatus").textContent="Kaart gevonden.";
    $("lookupResults").innerHTML=`<article class="lookup-result"><div class="lookup-result-thumb">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:`<div class="preview-placeholder">${esc(initials(c.name))}</div>`}</div><div><h4>${esc(c.name)}</h4><p>${esc(c.setName)} · ${esc(c.cardNumber||"—")} · ${esc(c.rarity)}</p></div><button class="primary-btn" id="useLookup">Gebruik</button></article>`;
    $("useLookup").onclick=()=>fillForm(c);
  }catch(e){console.error(e);$("lookupStatus").textContent="Zoeken mislukt."}
}
async function hydrateImages(){
  $("hydrateImagesBtn").disabled=true;$("hydrateImagesBtn").textContent="Afbeeldingen ophalen...";
  for(const c of cards.filter(c=>!c.image).slice(0,12)){try{const f=c.game==="Magic: The Gathering"?await magicSearch(c.name):await opSearch(c.cardNumber);if(f?.image)c.image=f.image;if(!c.price&&f?.price)c.price=f.price}catch{}}
  save();renderCollection();renderDashboard();$("hydrateImagesBtn").disabled=false;$("hydrateImagesBtn").textContent="Ontbrekende afbeeldingen ophalen";toast("Afbeeldingen bijgewerkt.");
}
function readFile(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
let scanFile=null;
async function scan(){
  if(!scanFile)return $("scanStatus").textContent="Upload eerst een foto.";
  $("scanStatus").textContent="Bezig met OCR scannen...";$("ocrText").textContent="OCR draait...";$("scanResults").innerHTML="";
  try{
    const out=await Tesseract.recognize(scanFile,"eng"),text=out.data.text||"";$("ocrText").textContent=text.trim()||"Geen leesbare tekst gevonden.";
    const results=[],seen=new Set();
    for(const raw of (text.toUpperCase().match(/(?:OP|ST|P|EB|PRB|PR)\s?0?\d{1,2}\s?[-–]\s?\d{3}/g)||[])){const c=await opSearch(raw.replace(/\s/g,"").replace("–","-"));if(c&&!seen.has(c.cardNumber)){seen.add(c.cardNumber);results.push(c)}}
    if(!results.length){
      for(const line of text.split(/\n+/).map(x=>x.trim()).filter(x=>x.length>=4&&x.length<=35).slice(0,8)){try{const c=await magicSearch(line);if(c&&!seen.has(c.name)){seen.add(c.name);results.push(c)}}catch{} if(results.length>=6)break}
    }
    $("scanStatus").textContent=results.length?`${results.length} suggesties gevonden.`:"Geen duidelijke kaarten herkend.";
    $("scanResults").innerHTML=results.map((c,i)=>`<article class="scan-result-card"><div class="scan-result-thumb">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:`<div class="preview-placeholder">${esc(initials(c.name))}</div>`}</div><h4>${esc(c.name)}</h4><p>${esc(c.game)} · ${esc(c.setName)} · ${esc(c.cardNumber||"—")}</p><div class="action-row"><button class="primary-btn" data-sfill="${i}">In formulier</button><button class="ghost-btn" data-sadd="${i}">Direct toevoegen</button></div></article>`).join("");
    $$("[data-sfill]").forEach(b=>b.onclick=()=>fillForm(results[+b.dataset.sfill]));$$("[data-sadd]").forEach(b=>b.onclick=()=>{addCard(results[+b.dataset.sadd]);toast("Kaart toegevoegd.")});
  }catch(e){console.error(e);$("scanStatus").textContent="Scannen mislukt."}
}
$$(".nav-item").forEach(b=>b.onclick=()=>navigate(b.dataset.page));$$("[data-goto]").forEach(b=>b.onclick=()=>navigate(b.dataset.goto));
$("quickAddBtn").onclick=()=>navigate("add");$("openScannerBtn").onclick=()=>navigate("scanner");$("lookupBtn").onclick=lookupCard;$("hydrateImagesBtn").onclick=hydrateImages;
["searchInput","gameFilter","sortFilter"].forEach(id=>$(id).oninput=renderCollection);["game","name","setName","cardNumber","image"].forEach(id=>$(id).oninput=updatePreview);
$("imageUpload").onchange=async e=>{const f=e.target.files?.[0];if(f){$("image").value=await readFile(f);updatePreview()}};
$("resetFormBtn").onclick=()=>{$("cardForm").reset();$("quantity").value=1;$("price").value=0;updatePreview()};
$("cardForm").onsubmit=e=>{e.preventDefault();addCard({game:$("game").value,name:$("name").value.trim(),setName:$("setName").value.trim(),cardNumber:$("cardNumber").value.trim(),rarity:$("rarity").value,condition:$("condition").value,quantity:$("quantity").value,price:$("price").value,foil:$("foil").checked,image:$("image").value.trim()});e.target.reset();$("quantity").value=1;$("price").value=0;updatePreview();toast("Kaart toegevoegd aan je binder.");navigate("collection")};
$("scanImageInput").onchange=async e=>{scanFile=e.target.files?.[0]||null;if(scanFile){$("scanPreview").classList.remove("hidden");$("scanPreview").innerHTML=`<img src="${esc(await readFile(scanFile))}" alt="Scan preview">`;$("scanStatus").textContent="Foto geladen. Klaar om te scannen."}};
$("scanBtn").onclick=scan;$("clearScanBtn").onclick=()=>{scanFile=null;$("scanImageInput").value="";$("scanPreview").classList.add("hidden");$("scanPreview").innerHTML="";$("scanResults").innerHTML="";$("ocrText").textContent="Nog geen tekst gedetecteerd.";$("scanStatus").textContent="Nog geen scan gestart."};
updatePreview();renderDashboard();renderCollection();
