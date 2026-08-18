// The Vault — Deck Lab (local-first Magic deck builder and coach)
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const STORE='vault-deck-lab-v1';
  const basic=/^(Plains|Island|Swamp|Mountain|Forest|Wastes|Snow-Covered Plains|Snow-Covered Island|Snow-Covered Swamp|Snow-Covered Mountain|Snow-Covered Forest)$/i;
  let state={decks:[],activeId:null,query:''};

  const load=()=>{try{state=JSON.parse(localStorage.getItem(STORE))||state}catch{};state.decks=Array.isArray(state.decks)?state.decks:[]};
  const save=()=>localStorage.setItem(STORE,JSON.stringify(state));
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  const active=()=>state.decks.find(d=>d.id===state.activeId)||state.decks[0]||null;
  const magicCards=()=>typeof cards==='undefined'?[]:cards.filter(c=>c.game==='Magic: The Gathering');
  const target=d=>d?.format==='Commander'?100:60;
  const total=d=>(d?.items||[]).reduce((n,i)=>n+(+i.quantity||0),0);
  const newDeck=(name='Nieuw deck',format='Commander')=>({id:`deck-${Date.now()}`,name,format,items:[],createdAt:Date.now()});

  function ensure(){
    if($('#decks')) return;
    const navList=$('.nav-list');
    const nav=document.createElement('button');
    nav.className='nav-item';nav.dataset.page='decks';nav.innerHTML='<span class="nav-icon">♜</span><span class="nav-label">Decks</span>';
    navList?.appendChild(nav);
    const page=document.createElement('section');
    page.id='decks';page.className='page';
    page.innerHTML=`
      <section class="deck-hero"><div><p class="small-label">DECK LAB</p><h2>Bouw. Test. <span>Verbeter.</span></h2><p>Maak Magic-decks vanuit je eigen Vault en ontvang concreet advies over de basis, consistentie en het spelplan.</p></div><div class="deck-hero-badge"><span>LOCAL COACH</span><strong>100%</strong><small>jouw collectie</small></div></section>
      <div class="deck-layout">
        <aside class="panel deck-sidebar"><div class="deck-sidebar-head"><div><p class="small-label">MIJN DECKS</p><h3>Decks</h3></div><button id="deckNew" class="deck-icon-btn" aria-label="Nieuw deck">＋</button></div><div id="deckList" class="deck-list"></div></aside>
        <section class="deck-workspace"><div id="deckEmpty" class="panel deck-empty"><span>♜</span><h3>Begin een nieuw deck</h3><p>Kies een format en voeg kaarten uit je collectie toe.</p><button class="primary-btn" data-deck-new>Nieuw Magic-deck</button></div><div id="deckEditor" class="hidden"></div></section>
      </div>`;
    $('main.content')?.appendChild(page);
    nav.onclick=()=>open();
    $('#deckNew').onclick=promptNew;
    page.addEventListener('click',onClick);
    page.addEventListener('input',onInput);
  }

  function promptNew(){
    const name=window.prompt('Naam van je deck:', 'Nieuw Commander-deck');
    if(name===null) return;
    const d=newDeck(name.trim()||'Nieuw deck');state.decks.push(d);state.activeId=d.id;save();render();
  }
  function open(){if(typeof nav==='function')nav('decks');const title=$('#pageTitle');if(title)title.textContent='Deck Lab';render()}
  function onInput(e){if(e.target.matches('#deckSearch')){state.query=e.target.value;renderLibrary();}}
  function onClick(e){
    const choose=e.target.closest('[data-deck-id]');if(choose){state.activeId=choose.dataset.deckId;save();render();return}
    if(e.target.closest('[data-deck-new]')){promptNew();return}
    const add=e.target.closest('[data-deck-add]');if(add){addCard(add.dataset.deckAdd);return}
    const remove=e.target.closest('[data-deck-remove]');if(remove){removeCard(remove.dataset.deckRemove);return}
    if(e.target.closest('[data-deck-delete]')){const d=active();if(d&&confirm(`Verwijder ${d.name}?`)){state.decks=state.decks.filter(x=>x.id!==d.id);state.activeId=state.decks[0]?.id||null;save();render()}return}
    if(e.target.closest('[data-deck-coach]')){renderCoach();return}
  }
  function addCard(id){const c=magicCards().find(x=>String(x.id)===String(id));const d=active();if(!c||!d)return;const item=d.items.find(x=>x.cardId===c.id);if(item)item.quantity++;else d.items.push({cardId:c.id,name:c.name,quantity:1});save();render()}
  function removeCard(id){const d=active(),item=d?.items.find(x=>String(x.cardId)===String(id));if(!item)return;if(item.quantity>1)item.quantity--;else d.items=d.items.filter(x=>x!==item);save();render()}
  function render(){
    const list=$('#deckList');if(!list)return;
    list.innerHTML=state.decks.map(d=>`<button class="deck-list-item ${d.id===active()?.id?'active':''}" data-deck-id="${esc(d.id)}"><span>♜</span><strong>${esc(d.name)}</strong><small>${esc(d.format)} · ${total(d)}/${target(d)}</small></button>`).join('')||'<p class="muted deck-none">Nog geen decks.</p>';
    const d=active(),empty=$('#deckEmpty'),editor=$('#deckEditor');empty.classList.toggle('hidden',!!d);editor.classList.toggle('hidden',!d);if(!d)return;
    editor.innerHTML=`<section class="panel deck-editor-head"><div><p class="small-label">${esc(d.format)} DECK</p><h2>${esc(d.name)}</h2><p>${total(d)} van ${target(d)} kaarten · bewaar je voortgang lokaal in The Vault.</p></div><button class="text-btn danger-btn" data-deck-delete>Deck verwijderen</button></section><div class="deck-stats"><article><span>KAARTEN</span><strong>${total(d)}/${target(d)}</strong></article><article><span>UNIEK</span><strong>${d.items.length}</strong></article><article><span>COLLECTIE</span><strong>${magicCards().length}</strong></article></div><div class="deck-columns"><section class="panel deck-roster"><div class="panel-header"><div><p class="small-label">DECKLIST</p><h3>Jouw kaarten</h3></div><button class="ghost-btn" data-deck-coach>Analyseer deck</button></div><div id="deckCoach" class="deck-coach"><p>Klik op <b>Analyseer deck</b> voor advies over de basis en tactiek.</p></div><div id="deckCards" class="deck-cards"></div></section><section class="panel deck-library"><div class="panel-header"><div><p class="small-label">VAULT LIBRARY</p><h3>Voeg uit collectie toe</h3></div></div><input id="deckSearch" type="search" placeholder="Zoek in jouw Magic-kaarten…" /><div id="deckLibraryCards" class="deck-library-cards"></div></section></div>`;
    renderCards();renderLibrary();
  }
  function renderCards(){const d=active(),el=$('#deckCards');if(!d||!el)return;el.innerHTML=d.items.map(i=>`<div class="deck-card-row"><span class="deck-qty">${i.quantity}×</span><strong>${esc(i.name)}</strong><button class="deck-remove" data-deck-remove="${esc(i.cardId)}" aria-label="Verwijder één ${esc(i.name)}">−</button></div>`).join('')||'<p class="muted">Voeg kaarten uit je collectie toe om je deck te bouwen.</p>'}
  function renderLibrary(){const el=$('#deckLibraryCards');if(!el)return;const q=(state.query||'').toLowerCase();const d=active();el.innerHTML=magicCards().filter(c=>!q||`${c.name} ${c.setName}`.toLowerCase().includes(q)).slice(0,60).map(c=>{const inDeck=d?.items.find(i=>i.cardId===c.id)?.quantity||0;return `<button class="deck-library-item" data-deck-add="${esc(c.id)}"><span>${inDeck?`${inDeck}×`:'＋'}</span><div><strong>${esc(c.name)}</strong><small>${esc(c.setName||'Onbekende set')} · bezit ${c.quantity||1}</small></div></button>`}).join('')||'<p class="muted">Geen Magic-kaarten gevonden.</p>'}
  function renderCoach(){const d=active(),el=$('#deckCoach');if(!d||!el)return;const count=total(d),goal=target(d),basics=d.items.filter(i=>basic.test(i.name)).reduce((n,i)=>n+i.quantity,0),duplicates=d.items.filter(i=>i.quantity>1&&!basic.test(i.name)).reduce((n,i)=>n+i.quantity-1,0),minimumBasics=d.format==='Commander'?34:20;const notes=[];if(count<goal)notes.push(`Je mist nog <b>${goal-count} kaarten</b>. Voeg eerst ramp, card draw en interactie toe voordat je nichekaarten kiest.`);else if(count>goal)notes.push(`Je zit <b>${count-goal} kaarten</b> boven het formatdoel. Snijd kaarten die geen mana, kaarten of directe druk opleveren.`);else notes.push(`Je deck heeft precies <b>${goal} kaarten</b>: een goede basis voor consistente draws.`);if(d.format==='Commander'&&duplicates)notes.push(`Er zitten <b>${duplicates} niet-basic duplicaten</b> in je Commander-deck. Commander is singleton; houd alleen basislanden vaker dan één keer.`);if(basics<minimumBasics)notes.push(`Je hebt slechts <b>${basics} herkenbare basislanden</b>. Streef in Commander grofweg naar 36–38 lands in totaal, afhankelijk van je mana-ramp.`);notes.push('Tactiek: bepaal één duidelijke win condition, gebruik de eerste beurten voor mana en card advantage, en bewaar removal voor kaarten die jouw plan echt stoppen.');el.innerHTML=`<p class="small-label">DECK COACH</p>${notes.map(n=>`<p>${n}</p>`).join('')}`}
  load();ensure();
})();
