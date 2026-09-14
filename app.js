(() => {
  const CARD_DB_URL = 'https://raw.githubusercontent.com/nemesis312/OnePieceTCGEngCardList/main/CardDb.json';
  const GOOGLE_FEEDS = [
    'https://news.google.com/rss/search?q=%22One%20Piece%20Card%20Game%22%20OR%20OPTCG&hl=en&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=site%3Aen.onepiece-cardgame.com%2Fnews%20%22ONE%20PIECE%20CARD%20GAME%22&hl=en&gl=US&ceid=US:en'
  ];
  const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const STORE_KEY = 'grand-line-vault.collection.v2';
  const CARD_CACHE_KEY = 'grand-line-vault.card-cache.v1';
  const CARD_CACHE_TIME = 'grand-line-vault.card-cache-time.v1';
  const CACHE_MAX_AGE = 6 * 60 * 60 * 1000;

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const state = { cards: [], collection: [], news: [], selected: null, selectedOwnedKey: null, cardsFetchedAt: 0 };

  function esc(v=''){ return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function money(v){ return new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(Number(v)||0); }
  function normalizeCode(v=''){ return String(v).replace(/^#/,'').trim().toUpperCase(); }
  function setCode(card){ const m=normalizeCode(card.CardNum).match(/^([A-Z]+\d{2})-/); return m?m[1]:''; }
  function variantId(card){ return `${normalizeCode(card.CardNum)}|${card.Img || ''}`; }
  function isAlt(card){ return !!card.Alt || /alt|parallel|manga/i.test(String(card.Rarity||'')); }
  function rarity(card){ return String(card.Rarity||'').replace('-Alt','') || '—'; }
  function typeLine(card){ return [card['Card Type'], card['Primary color'], card['Secondary color']].filter(Boolean).join(' · '); }
  function types(card){ return Object.keys(card).filter(k=>/^Type \d+$/i.test(k)).map(k=>card[k]).filter(Boolean).join(' / '); }
  function notify(text){ const el=$('#toast'); el.textContent=text; el.classList.add('show'); clearTimeout(notify.t); notify.t=setTimeout(()=>el.classList.remove('show'),2200); }
  function saveCollection(){ localStorage.setItem(STORE_KEY, JSON.stringify(state.collection)); renderStats(); renderCollection(); renderRecent(); }

  function loadCollection(){
    try { state.collection = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); if(!Array.isArray(state.collection)) state.collection=[]; } catch { state.collection=[]; }
  }

  function nav(page){
    $$('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===page));
    $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===page));
    window.scrollTo({top:0,behavior:'smooth'});
    if(page==='collection') renderCollection();
    if(page==='news' && !state.news.length) loadNews(false);
  }

  function mapCard(raw){
    return {
      ...raw,
      _code: normalizeCode(raw.CardNum),
      _set: setCode(raw),
      _alt: isAlt(raw),
      _variant: variantId(raw)
    };
  }

  async function loadCards(force=false){
    const status=$('#cardDbStatus');
    status.textContent='Live kaartdatabase laden…';
    try {
      if(!force){
        const t=Number(localStorage.getItem(CARD_CACHE_TIME)||0);
        const cached=localStorage.getItem(CARD_CACHE_KEY);
        if(cached && Date.now()-t < CACHE_MAX_AGE){
          const parsed=JSON.parse(cached);
          if(Array.isArray(parsed)&&parsed.length){ state.cards=parsed; state.cardsFetchedAt=t; afterCardsLoaded('cache'); refreshCardsBackground(); return; }
        }
      }
      const res=await fetch(`${CARD_DB_URL}?t=${Date.now()}`,{cache:'no-store'});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json=await res.json();
      const rows=Array.isArray(json)?json:(json.Cards||[]);
      state.cards=rows.map(mapCard).filter(c=>c._code && c.Name && c.Img);
      state.cardsFetchedAt=Date.now();
      try { localStorage.setItem(CARD_CACHE_KEY, JSON.stringify(state.cards)); localStorage.setItem(CARD_CACHE_TIME,String(state.cardsFetchedAt)); } catch {}
      afterCardsLoaded('live');
    } catch(err){
      status.textContent=`Live database niet bereikbaar (${err.message}).`;
      $('#liveStatus').textContent='kaartbron offline';
      const cached=localStorage.getItem(CARD_CACHE_KEY);
      if(cached){ try{state.cards=JSON.parse(cached);afterCardsLoaded('oude cache');}catch{} }
    }
  }

  async function refreshCardsBackground(){
    try{
      const res=await fetch(`${CARD_DB_URL}?t=${Date.now()}`,{cache:'no-store'});
      if(!res.ok) return;
      const json=await res.json(); const rows=Array.isArray(json)?json:(json.Cards||[]);
      const fresh=rows.map(mapCard).filter(c=>c._code&&c.Name&&c.Img);
      if(fresh.length){ state.cards=fresh; state.cardsFetchedAt=Date.now(); try{localStorage.setItem(CARD_CACHE_KEY,JSON.stringify(fresh));localStorage.setItem(CARD_CACHE_TIME,String(state.cardsFetchedAt));}catch{} afterCardsLoaded('live'); }
    }catch{}
  }

  function afterCardsLoaded(source){
    const sets=[...new Set(state.cards.map(c=>c._set).filter(Boolean))].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
    const current=$('#setFilter').value;
    $('#setFilter').innerHTML='<option value="">Alle sets</option>'+sets.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
    if(sets.includes(current)) $('#setFilter').value=current;
    const time=state.cardsFetchedAt?new Date(state.cardsFetchedAt).toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}):'';
    $('#cardDbStatus').textContent=`${state.cards.length.toLocaleString('nl-NL')} printings · ${source}${time?' · '+time:''}`;
    $('#liveStatus').textContent=`${state.cards.length.toLocaleString('nl-NL')} kaarten beschikbaar`;
    renderSearch();
  }

  function cardButton(card, mini=false, owned=null){
    const alt=card._alt ?? isAlt(card);
    const code=card._code ?? normalizeCode(card.CardNum);
    return `<button class="${mini?'mini-card':'tcg-card'}" data-card="${esc(card._variant || variantId(card))}"${owned?` data-owned="${esc(owned.key)}"`:''}>
      <div style="position:relative"><img loading="lazy" src="${esc(card.Img)}" alt="${esc(card.Name)}" onerror="this.style.opacity=.25">
      ${mini?'':`<div class="badges"><span class="badge">${esc(rarity(card))}</span>${alt?'<span class="badge alt">ALT</span>':''}</div>`}</div>
      <strong>${esc(card.Name)}</strong><small>${esc(code)}${owned?` · ×${owned.quantity}`:''}</small>
    </button>`;
  }

  function renderSearch(){
    if(!state.cards.length) return;
    const q=$('#cardQuery').value.trim().toLowerCase();
    const set=$('#setFilter').value;
    const variant=$('#variantFilter').value;
    let rows=state.cards.filter(c=>{
      if(set&&c._set!==set) return false;
      if(variant==='base'&&c._alt) return false;
      if(variant==='alt'&&!c._alt) return false;
      if(!q) return true;
      return [c.Name,c._code,c._set,c.Rarity,c['Card Type'],types(c)].join(' ').toLowerCase().includes(q);
    });
    rows=rows.slice(0,q||set||variant?120:40);
    $('#searchResults').innerHTML=rows.map(c=>cardButton(c)).join('');
    $('#searchEmpty').classList.toggle('hidden',!!rows.length);
    bindCardButtons($('#searchResults'));
  }

  function renderStats(){
    const total=state.collection.reduce((s,c)=>s+(Number(c.quantity)||1),0);
    const value=state.collection.reduce((s,c)=>s+(Number(c.customValue)||0)*(Number(c.quantity)||1),0);
    $('#statTotal').textContent=total; $('#statUnique').textContent=state.collection.length; $('#statValue').textContent=money(value);
    $('#statSets').textContent=new Set(state.collection.map(c=>c.card._set || setCode(c.card)).filter(Boolean)).size;
    $('#statFavs').textContent=state.collection.filter(c=>c.favorite).length;
  }

  function sortedCollection(){
    const q=$('#collectionQuery').value.trim().toLowerCase(); const sort=$('#collectionSort').value;
    let rows=state.collection.filter(o=>!q||[o.card.Name,o.card._code,o.card._set,o.card.Rarity].join(' ').toLowerCase().includes(q));
    rows=[...rows];
    if(sort==='name') rows.sort((a,b)=>a.card.Name.localeCompare(b.card.Name));
    else if(sort==='value') rows.sort((a,b)=>(b.customValue||0)-(a.customValue||0));
    else if(sort==='set') rows.sort((a,b)=>(a.card._set||'').localeCompare(b.card._set||'',undefined,{numeric:true}));
    else rows.sort((a,b)=>new Date(b.addedAt)-new Date(a.addedAt));
    return rows;
  }

  function renderCollection(){
    const rows=sortedCollection();
    $('#collectionGrid').innerHTML=rows.map(o=>cardButton(o.card,false,o)).join('');
    $('#collectionEmpty').classList.toggle('hidden',!!rows.length);
    bindCardButtons($('#collectionGrid'));
  }

  function renderRecent(){
    const rows=[...state.collection].sort((a,b)=>new Date(b.addedAt)-new Date(a.addedAt)).slice(0,5);
    $('#recentCards').innerHTML=rows.map(o=>cardButton(o.card,true,o)).join('');
    $('#recentEmpty').style.display=rows.length?'none':'block';
    bindCardButtons($('#recentCards'));
  }

  function bindCardButtons(root){
    root.querySelectorAll('[data-card]').forEach(btn=>btn.addEventListener('click',()=>{
      const ownedKey=btn.dataset.owned||null;
      let card=null;
      if(ownedKey){ const owned=state.collection.find(o=>o.key===ownedKey); card=owned?.card||null; }
      if(!card) card=state.cards.find(c=>(c._variant||variantId(c))===btn.dataset.card);
      if(card) openCard(card,ownedKey);
    }));
  }

  function openCard(card,ownedKey=null){
    state.selected=card; state.selectedOwnedKey=ownedKey;
    $('#modalImage').src=card.Img||''; $('#modalImage').alt=card.Name||'One Piece kaart';
    $('#modalCode').textContent=card._code||normalizeCode(card.CardNum); $('#modalRarity').textContent=rarity(card); $('#modalName').textContent=card.Name||'Kaart';
    $('#modalVariant').classList.toggle('hidden',!isAlt(card)); $('#tiltCard').classList.toggle('is-alt',isAlt(card));
    $('#modalMeta').textContent=[typeLine(card), types(card)].filter(Boolean).join(' · ');
    $('#modalEffect').textContent=card.Effect||card.Trigger||'Geen effecttekst beschikbaar.';
    $('#tcgPlayerLink').href=card.TcgPlayer||`https://www.google.com/search?q=${encodeURIComponent((card.Name||'')+' '+normalizeCode(card.CardNum)+' One Piece card price')}`;
    const owned=ownedKey?state.collection.find(o=>o.key===ownedKey):null;
    $('#ownedEditor').classList.toggle('hidden',!owned); $('#favoriteBtn').classList.toggle('hidden',!owned); $('#deleteBtn').classList.toggle('hidden',!owned);
    $('#modalPrimary').textContent=owned?'Opslaan':'+ Voeg toe';
    if(owned){ $('#ownedQty').value=owned.quantity; $('#ownedValue').value=owned.customValue||''; $('#ownedCondition').value=owned.condition||'Near Mint'; $('#ownedLanguage').value=owned.language||'English'; $('#ownedNote').value=owned.note||''; $('#favoriteBtn').textContent=owned.favorite?'♥ Favoriet':'♡ Favoriet'; }
    $('#cardModal').classList.remove('hidden'); $('#cardModal').setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  }

  function closeModal(){ $('#cardModal').classList.add('hidden'); $('#cardModal').setAttribute('aria-hidden','true'); document.body.style.overflow=''; state.selected=null; state.selectedOwnedKey=null; }

  function addSelected(){
    const card=state.selected; if(!card) return;
    const existing=state.collection.find(o=>o.card._variant===card._variant);
    if(existing){ existing.quantity=(Number(existing.quantity)||1)+1; notify('Aantal verhoogd'); }
    else state.collection.unshift({key:`${card._variant}-${Date.now()}`,card,quantity:1,customValue:0,condition:'Near Mint',language:'English',note:'',favorite:false,addedAt:new Date().toISOString()});
    saveCollection(); closeModal();
  }

  function saveOwned(){
    const o=state.collection.find(x=>x.key===state.selectedOwnedKey); if(!o) return;
    o.quantity=Math.max(1,Math.min(999,Number($('#ownedQty').value)||1)); o.customValue=Math.max(0,Number($('#ownedValue').value)||0); o.condition=$('#ownedCondition').value; o.language=$('#ownedLanguage').value; o.note=$('#ownedNote').value.trim();
    saveCollection(); notify('Kaart bijgewerkt'); closeModal();
  }

  function deleteOwned(){ const key=state.selectedOwnedKey; if(!key) return; if(!confirm('Deze kaart uit je binder verwijderen?')) return; state.collection=state.collection.filter(o=>o.key!==key); saveCollection(); closeModal(); notify('Kaart verwijderd'); }
  function toggleFavorite(){ const o=state.collection.find(x=>x.key===state.selectedOwnedKey); if(!o)return; o.favorite=!o.favorite; saveCollection(); $('#favoriteBtn').textContent=o.favorite?'♥ Favoriet':'♡ Favoriet'; }

  async function loadNews(force=false){
    $('#newsStatus').textContent='Live nieuws ophalen…';
    const feeds=GOOGLE_FEEDS.map(feed=>`${RSS2JSON}${encodeURIComponent(feed)}${force?`&_=${Date.now()}`:''}`);
    try{
      const settled=await Promise.allSettled(feeds.map(u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json();})));
      let items=[];
      for(const result of settled){ if(result.status==='fulfilled'&&result.value.status==='ok') items.push(...(result.value.items||[])); }
      const seen=new Set();
      state.news=items.map(i=>({title:i.title||'',link:i.link||'',date:i.pubDate||'',source:(i.author||'').trim()||extractPublisher(i.title),description:i.description||''}))
        .filter(i=>i.title&&i.link).filter(i=>{const k=i.title.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(seen.has(k))return false;seen.add(k);return true;})
        .sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,30);
      renderNews(); const now=new Date().toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'}); $('#newsStatus').textContent=`${state.news.length} live headlines · bijgewerkt ${now}`; $('#liveStatus').textContent=state.cards.length?`${state.cards.length.toLocaleString('nl-NL')} kaarten · nieuws live`:'nieuws live';
    }catch(err){ $('#newsStatus').textContent='Nieuwsbron tijdelijk niet bereikbaar.'; }
  }

  function extractPublisher(title=''){ const parts=title.split(' - '); return parts.length>1?parts.at(-1):'Google News'; }
  function cleanTitle(title=''){ const parts=title.split(' - '); return parts.length>1?parts.slice(0,-1).join(' - '):title; }
  function fmtDate(v){ const d=new Date(v); return Number.isNaN(d.getTime())?v:d.toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'}); }
  function newsHtml(i){ const title=cleanTitle(i.title); const op18=/\bOP[- ]?18\b/i.test(title+' '+i.description); return `<a class="news-item ${op18?'op18':''}" href="${esc(i.link)}" target="_blank" rel="noopener"><div class="news-meta"><span>${op18?'OP-18 · ':''}${esc(fmtDate(i.date))}</span><span>•</span><span>${esc(i.source)}</span></div><h3>${esc(title)}</h3></a>`; }
  function renderNews(){ const q=$('#newsQuery').value.trim().toLowerCase(); const rows=state.news.filter(i=>!q||(i.title+' '+i.source+' '+i.description).toLowerCase().includes(q)); $('#newsList').innerHTML=rows.map(newsHtml).join('')||'<div class="empty-state">Geen nieuws gevonden.</div>'; $('#homeNews').innerHTML=state.news.slice(0,4).map(newsHtml).join(''); }

  function exportCollection(){ const blob=new Blob([JSON.stringify({app:'Grand Line Vault',version:2,exportedAt:new Date().toISOString(),collection:state.collection},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`grand-line-vault-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500); }
  async function importCollection(file){ try{const data=JSON.parse(await file.text());const rows=Array.isArray(data)?data:data.collection;if(!Array.isArray(rows))throw new Error();state.collection=rows;saveCollection();notify('Backup geïmporteerd');}catch{notify('Ongeldige backup');} }

  function setupTilt(){
    const wrap=$('#tiltWrap'), card=$('#tiltCard');
    function move(e){ const r=wrap.getBoundingClientRect(); const p=e.touches?e.touches[0]:e; const x=Math.max(0,Math.min(1,(p.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(p.clientY-r.top)/r.height)); card.style.setProperty('--mx',`${x*100}%`);card.style.setProperty('--my',`${y*100}%`);card.style.transform=`rotateY(${(x-.5)*12}deg) rotateX(${(.5-y)*12}deg)`; }
    function reset(){card.style.transform='';}
    wrap.addEventListener('pointermove',move);wrap.addEventListener('pointerleave',reset);wrap.addEventListener('touchmove',move,{passive:true});wrap.addEventListener('touchend',reset);
  }

  function bind(){
    $$('[data-nav]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.nav)));
    $('#searchForm').addEventListener('submit',e=>{e.preventDefault();renderSearch();});
    $('#cardQuery').addEventListener('input',()=>{ if($('#cardQuery').value.length>=2||!$('#cardQuery').value) renderSearch(); });
    $('#setFilter').addEventListener('change',renderSearch); $('#variantFilter').addEventListener('change',renderSearch);
    $('#reloadCardsBtn').addEventListener('click',()=>loadCards(true));
    $('#collectionQuery').addEventListener('input',renderCollection); $('#collectionSort').addEventListener('change',renderCollection);
    $('#exportBtn').addEventListener('click',exportCollection); $('#importBtn').addEventListener('click',()=>$('#importFile').click()); $('#importFile').addEventListener('change',e=>{if(e.target.files[0])importCollection(e.target.files[0]);e.target.value='';});
    $('#reloadNewsBtn').addEventListener('click',()=>loadNews(true)); $('#newsQuery').addEventListener('input',renderNews);
    $('#refreshAllBtn').addEventListener('click',()=>{loadCards(true);loadNews(true);notify('Live data wordt vernieuwd');});
    $('#modalBackdrop').addEventListener('click',closeModal); $('#modalClose').addEventListener('click',closeModal);
    $('#modalPrimary').addEventListener('click',()=>state.selectedOwnedKey?saveOwned():addSelected()); $('#deleteBtn').addEventListener('click',deleteOwned); $('#favoriteBtn').addEventListener('click',toggleFavorite);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cardModal').classList.contains('hidden'))closeModal();});
  }

  loadCollection(); bind(); renderStats(); renderCollection(); renderRecent(); setupTilt(); loadCards(false); loadNews(false);
  if('serviceWorker' in navigator){ window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{})); }
})();
