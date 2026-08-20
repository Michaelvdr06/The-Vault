// The Vault hotfix: robust mobile inspector + finish-aware MTG pricing
(() => {
  const q = (s, root=document) => root.querySelector(s);
  const qa = (s, root=document) => [...root.querySelectorAll(s)];
  const money = new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'});
  let lastPointerOpenAt = 0;

  function openFromTarget(target){
    const cardEl = target?.closest?.('[data-open]');
    if(!cardEl || target.closest('[data-del]')) return false;
    const id = cardEl.dataset.open;
    if(!id) return false;
    try {
      if(typeof openCard === 'function') openCard(id);
      else return false;
      lastPointerOpenAt = Date.now();
      return true;
    } catch(err){
      console.error('Inspector open failed', err);
      return false;
    }
  }

  document.addEventListener('pointerup', e => {
    if(e.pointerType === 'mouse') return;
    openFromTarget(e.target);
  }, true);
  document.addEventListener('touchend', e => {
    if(Date.now() - lastPointerOpenAt < 450) return;
    openFromTarget(e.target);
  }, {capture:true, passive:true});
  document.addEventListener('click', e => {
    if(Date.now() - lastPointerOpenAt < 450) return;
    openFromTarget(e.target);
  }, true);

  async function getExactMagicPrinting(card){
    if(!card || card.game !== 'Magic: The Gathering') return null;
    const name = String(card.name||'').replace(/"/g,'').trim();
    const cn = String(card.cardNumber||'').trim();
    if(!name) return null;
    const bits = [`!\"${name}\"`];
    if(cn) bits.push(`cn:${cn}`);
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(bits.join(' '))}`;
    try{
      const r = await fetch(url,{headers:{Accept:'application/json'}});
      const d = await r.json();
      if(!r.ok || !Array.isArray(d.data) || !d.data.length) return null;
      const sameSet = d.data.find(x => String(x.set_name||'').toLowerCase() === String(card.setName||'').toLowerCase());
      return sameSet || d.data[0];
    }catch(err){
      console.warn('Price lookup failed',err);
      return null;
    }
  }

  function priceForFinish(printing, foil){
    const p = printing?.prices || {};
    if(foil) return Number(p.eur_foil || 0) || null;
    return Number(p.eur || 0) || null;
  }

  async function refreshMagicCardPrice(card, foil){
    const printing = await getExactMagicPrinting(card);
    const next = priceForFinish(printing, foil);
    if(next == null) return false;
    card.price = next;
    return true;
  }

  async function syncOpenCardPrice(){
    try{
      if(typeof modalCardId === 'undefined' || !modalCardId || typeof cards === 'undefined') return;
      const card = cards.find(x=>x.id===modalCardId);
      if(!card || card.game!=='Magic: The Gathering') return;
      const changed = await refreshMagicCardPrice(card, card.foil);
      if(changed){
        if(typeof save==='function') save();
        const p=q('#modalPrice'); if(p) p.textContent=money.format(card.price);
        if(typeof dash==='function') dash();
        if(typeof binder==='function') binder();
      }
    }catch(err){ console.warn(err); }
  }

  const toggle = q('#toggleFoilBtn');
  if(toggle){
    toggle.onclick = async () => {
      if(typeof modalCardId==='undefined' || !modalCardId || typeof cards==='undefined') return;
      const card = cards.find(x=>x.id===modalCardId);
      if(!card) return;
      const nextFoil = !card.foil;
      toggle.disabled = true;
      const oldText = toggle.textContent;
      toggle.textContent = 'Prijs ophalen…';
      card.foil = nextFoil;
      let priceUpdated = false;
      if(card.game==='Magic: The Gathering') priceUpdated = await refreshMagicCardPrice(card,nextFoil);
      if(typeof save==='function') save();
      if(typeof applyModalFoil==='function') applyModalFoil(card.foil);
      const p=q('#modalPrice'); if(p) p.textContent=money.format(card.price);
      if(typeof dash==='function') dash();
      if(typeof binder==='function') binder();
      toggle.disabled = false;
      if(typeof toast==='function') toast(priceUpdated ? `${card.foil?'Foil':'Non-foil'} prijs bijgewerkt.` : `${card.foil?'Foil':'Non-foil'} ingesteld · geen aparte EUR-prijs gevonden.`);
      if(toggle.textContent==='Prijs ophalen…') toggle.textContent=oldText;
    };
  }

  const foilBox=q('#foil');
  if(foilBox){
    foilBox.addEventListener('change', async () => {
      const game=q('#game')?.value;
      if(game!=='Magic: The Gathering') return;
      const temp={game,name:q('#name')?.value||'',setName:q('#setName')?.value||'',cardNumber:q('#cardNumber')?.value||''};
      const printing=await getExactMagicPrinting(temp);
      const next=priceForFinish(printing,foilBox.checked);
      if(next!=null && q('#price')) q('#price').value=next.toFixed(2);
    });
  }

  setTimeout(async()=>{
    try{
      if(typeof cards==='undefined') return;
      let changed=false;
      for(const card of cards.filter(c=>c.game==='Magic: The Gathering' && c.foil).slice(0,8)){
        if(await refreshMagicCardPrice(card,true)) changed=true;
      }
      if(changed){ if(typeof save==='function') save(); if(typeof dash==='function') dash(); if(typeof binder==='function') binder(); }
    }catch(err){ console.warn(err); }
  },900);
})();

(() => {
  if(!document.querySelector('script[data-vault-sets]')){
const js=document.createElement('script');js.src='sets.js?v=4';js.dataset.vaultSets='1';js.defer=true;document.body.appendChild(js);
  }
})();

// Scanner v3.3 owns the Scan button directly.
(() => {
  if(document.querySelector('script[data-vault-scanner-v3]')) return;
  const js=document.createElement('script');
  js.src='scanner-v3.js?v=5';
  js.dataset.vaultScannerV3='1';
  document.body.appendChild(js);
})();

// Scanner presentation layer loads last: it formats OCR output and upgrades suggestion cards only.
(() => {
  if(!document.querySelector('script[data-vault-scanner-ui]')){
    const js=document.createElement('script');js.src='scanner-ui.js?v=1';js.dataset.vaultScannerUi='1';
    js.onload=()=>{const render=window.scanRender;if(typeof render==='function')window.scanRender=items=>render((Array.isArray(items)?items:[]).filter(c=>c.game==='Magic: The Gathering'))};
    document.body.appendChild(js);
  }
})();
// Feature copy enhancement only; styles are declared once in index.html.
(() => {
  const scanner=document.querySelector('#scanner');
  if(scanner){
    const label=scanner.querySelector('.small-label');if(label)label.textContent='MAGIC PHOTO IMPORT';
    const title=scanner.querySelector('.panel h3');if(title)title.textContent='Magic-kaart herkennen';
    const intro=scanner.querySelector('.intro-copy');if(intro)intro.textContent='Upload een duidelijke foto van een Magic-kaart. De scanner zoekt de naam via Scryfall en controleert ook op een mogelijk foil-effect.';
  }
})();



// Rapid bulk intake loads after the core collection functions.
(() => {
  if(!document.querySelector('script[data-vault-bulk]')){
    const js=document.createElement('script');
    js.src='bulk-add.js?v=17'; js.dataset.vaultBulk='1';
    document.body.appendChild(js);
  }
})();

// Deck Lab is isolated from the collection and scanner flows.
(() => {
  if(document.querySelector('script[data-vault-deck-lab]')) return;
  const js=document.createElement('script');
  js.src='deck-lab.js?v=1'; js.dataset.vaultDeckLab='1';
  document.body.appendChild(js);
})();

// Arena Hub is local-first: users choose their own Arena log or JSON export.
(() => {
  if(document.querySelector('script[data-vault-arena]')) return;
  const js=document.createElement('script');
  js.src='arena-hub.js?v=8'; js.dataset.vaultArena='1';
  document.body.appendChild(js);
})();
