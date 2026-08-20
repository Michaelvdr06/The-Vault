// The Vault — dynamic Set Checklist for Magic + One Piece
(() => {
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={game:'Magic: The Gathering',sets:[],cards:[],set:null,filter:'all',search:'',loading:false};
  const escLocal=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const normText=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const normNum=s=>String(s||'').toUpperCase().replace(/^0+(?=\d)/,'').replace(/[^A-Z0-9-]/g,'');
  const rarityLabel=r=>({common:'Common',uncommon:'Uncommon',rare:'Rare',mythic:'Mythic',c:'Common',uc:'Uncommon',r:'Rare',sr:'Super Rare',sec:'Secret Rare',l:'Rare'})[String(r||'').toLowerCase()]||String(r||'Rare');
  const imageOf=d=>d?.image_uris?.normal||d?.image_uris?.large||d?.card_faces?.find(x=>x.image_uris)?.image_uris?.normal||d?.card_image||d?.cardImage||d?.image_url||d?.image||d?.img_url||d?.img||'';

  function ensureUI(){
    if(q('#sets')) return;
    const navList=q('.nav-list');
    const btn=document.createElement('button');
    btn.className='nav-item'; btn.dataset.page='sets'; btn.innerHTML='<span class="nav-icon">▤</span><span class="nav-label">Sets</span>';
    navList?.appendChild(btn);

    const section=document.createElement('section');
    section.className='page'; section.id='sets';
    section.innerHTML=`
      <div class="sets-hero">
        <article class="sets-intro">
          <p class="small-label">SET COMPLETION</p>
          <h2>Maak je sets <span>compleet</span>.</h2>
          <p>Bekijk elke kaart uit een set in één overzicht. Kaarten die je bezit blijven helder; ontbrekende kaarten worden donker gemaakt zodat je direct ziet wat er nog mist.</p>
        </article>
        <article class="sets-progress-card">
          <div class="sets-progress-top"><span id="setProgressLabel">Kies een set</span><strong id="setProgressPercent">0%</strong></div>
          <div class="sets-progress-track"><div class="sets-progress-fill" id="setProgressFill"></div></div>
          <div class="sets-progress-meta"><span id="setOwnedCount">0 in bezit</span><span id="setTotalCount">0 kaarten</span></div>
        </article>
      </div>
      <section class="panel sets-toolbar">
        <div class="sets-toolbar-grid">
          <label><span>GAME</span><select id="setGame"><option>Magic: The Gathering</option></select></label>
          <label><span>SET</span><select id="setSelect"><option value="">Sets laden…</option></select></label>
          <label><span>ZOEK IN SET</span><input id="setSearch" type="search" placeholder="Naam of kaartnummer…"></label>
        </div>
        <div class="sets-filter-row" id="setFilters">
          <button class="set-filter-btn active" data-set-filter="all">Alle</button>
          <button class="set-filter-btn" data-set-filter="owned">In bezit</button>
          <button class="set-filter-btn" data-set-filter="missing">Ontbreekt</button>
          <button class="set-filter-btn" data-set-filter="foil">Foil</button>
        </div>
      </section>
      <div class="set-status" id="setStatus">Sets laden…</div>
      <div class="set-checklist-grid" id="setChecklistGrid"></div>`;
    q('main.content')?.appendChild(section);

    btn.onclick=()=>openSetsPage();
    q('#setGame').onchange=async e=>{state.game=e.target.value;state.filter='all';syncFilterButtons();await loadSets(true)};
    q('#setSelect').onchange=()=>loadSelectedSet();
    q('#setSearch').oninput=e=>{state.search=e.target.value||'';render()};
    q('#setFilters').onclick=e=>{const b=e.target.closest('[data-set-filter]');if(!b)return;state.filter=b.dataset.setFilter;syncFilterButtons();render()};
    q('#setChecklistGrid').addEventListener('click',e=>{
      const addBtn=e.target.closest('[data-set-add]');
      const cardEl=e.target.closest('[data-set-index]');
      if(!cardEl)return;
      const item=state.cards[+cardEl.dataset.setIndex];
      if(!item)return;
      const owned=ownedMatch(item);
      if(addBtn || !owned){
        const c={game:state.game,name:item.name,setName:item.setName,cardNumber:item.cardNumber,rarity:item.rarity,condition:'Near Mint',quantity:1,price:item.price||0,foil:false,image:item.image||''};
        if(typeof fill==='function') fill(c);
        return;
      }
      if(typeof openCard==='function') openCard(owned.id);
    });
  }

  function openSetsPage(){
    if(typeof nav==='function') nav('sets');
    const title=q('#pageTitle'); if(title) title.textContent='Sets';
    if(!state.sets.length&&!state.loading) loadSets(false); else render();
  }

  function syncFilterButtons(){ qa('[data-set-filter]').forEach(b=>b.classList.toggle('active',b.dataset.setFilter===state.filter)); }

  async function fetchJson(url){const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`${r.status}`);return r.json()}

  async function loadSets(force){
    state.loading=true; setStatus('Sets laden…'); state.cards=[]; state.set=null; render();
    const sel=q('#setSelect'); if(sel) sel.innerHTML='<option value="">Sets laden…</option>';
    try{
      if(state.game==='Magic: The Gathering'){
        const d=await fetchJson('https://api.scryfall.com/sets');
        state.sets=(d.data||[]).filter(s=>s.digital!==true&&Number(s.card_count||0)>0&&!['token','memorabilia','minigame'].includes(s.set_type)).map(s=>({id:s.code,name:s.name,code:s.code,released:s.released_at||'',count:s.card_count||0}));
      }else{
        const d=await fetchJson('https://optcgapi.com/api/allSets/');
        const raw=Array.isArray(d)?d:(d.data||d.sets||d.results||[]);
        state.sets=raw.map((s,i)=>({id:String(s.set_id||s.setId||s.id||s.code||s.set_code||i),code:String(s.set_id||s.setId||s.code||s.set_code||''),name:String(s.set_name||s.setName||s.name||s.title||s.set_id||s.id||`Set ${i+1}`),released:s.release_date||s.releaseDate||''}));
      }
      state.sets.sort((a,b)=>String(b.released||'').localeCompare(String(a.released||''))||a.name.localeCompare(b.name));
      fillSetSelect(force);
    }catch(err){console.error(err);setStatus('Sets konden niet geladen worden. Probeer de pagina opnieuw.','error')}
    state.loading=false;
  }

  function fillSetSelect(force){
    const sel=q('#setSelect'); if(!sel)return;
    sel.innerHTML=state.sets.map(s=>`<option value="${escLocal(s.id)}">${escLocal(s.name)}${s.code&&normText(s.code)!==normText(s.name)?` · ${escLocal(String(s.code).toUpperCase())}`:''}</option>`).join('');
    if(!state.sets.length){sel.innerHTML='<option value="">Geen sets gevonden</option>';setStatus('Geen sets gevonden.');return}
    let preferred=null;
    try{
      const ownedForGame=(typeof cards!=='undefined'?cards:[]).filter(c=>c.game===state.game);
      for(const c of ownedForGame){
        preferred=state.sets.find(s=>normText(s.name)===normText(c.setName)||normText(s.code)===normText(c.setName));
        if(!preferred&&state.game==='One Piece TCG') preferred=state.sets.find(s=>String(c.cardNumber||'').toUpperCase().startsWith(String(s.code||'').toUpperCase()));
        if(preferred)break;
      }
    }catch{}
    sel.value=(preferred||state.sets[0]).id;
    loadSelectedSet();
  }

  async function loadSelectedSet(){
    const id=q('#setSelect')?.value; const set=state.sets.find(s=>String(s.id)===String(id)); if(!set)return;
    state.set=set;state.cards=[];setStatus(`${set.name} laden…`);render();
    try{
      state.cards=state.game==='Magic: The Gathering'?await loadMagicCards(set):await loadOnePieceCards(set);
      state.cards.sort(cardSort);
      setStatus(`${state.cards.length} kaarten in ${set.name}.`);
      render();
    }catch(err){console.error(err);setStatus('Kaarten van deze set konden niet geladen worden.','error')}
  }

  async function loadMagicCards(set){
    let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(`e:${set.code} game:paper`)}&unique=prints&order=set`,all=[];
    while(url){const d=await fetchJson(url);all.push(...(d.data||[]));url=d.has_more?d.next_page:null}
    const seen=new Set();
    return all.map(d=>({name:d.name,setName:d.set_name||set.name,cardNumber:d.collector_number||'',rarity:rarityLabel(d.rarity),price:Number(d.prices?.eur||0)||0,image:imageOf(d),foilAvailable:Array.isArray(d.finishes)?d.finishes.includes('foil'):!!d.foil})).filter(c=>{const k=normNum(c.cardNumber);if(seen.has(k))return false;seen.add(k);return true});
  }

  function flattenCards(value,out=[]){
    if(Array.isArray(value)){value.forEach(v=>flattenCards(v,out));return out}
    if(!value||typeof value!=='object')return out;
    const id=value.card_id||value.cardId||value.card_number||value.cardNumber||value.code;
    if(id&&/(OP|ST|EB|PRB|PR|P)\d{1,2}-\d{3}/i.test(String(id))) out.push(value);
    else Object.values(value).forEach(v=>{if(v&&typeof v==='object')flattenCards(v,out)});
    return out;
  }

  async function loadOnePieceCards(set){
    const d=await fetchJson(`https://optcgapi.com/api/sets/${encodeURIComponent(set.id)}/`);
    const raw=flattenCards(d,[]),seen=new Set();
    return raw.map(x=>{const n=String(x.card_id||x.cardId||x.card_number||x.cardNumber||x.code||'');return{name:String(x.card_name||x.cardName||x.name||x.title||n),setName:String(x.set_name||x.setName||set.name),cardNumber:n,rarity:rarityLabel(x.rarity||x.card_rarity),price:Number(x.market_price||x.price||x.inventory_price||0)||0,image:imageOf(x),foilAvailable:false}}).filter(c=>{const k=normNum(c.cardNumber);if(!k||seen.has(k))return false;seen.add(k);return true});
  }

  function cardSort(a,b){
    const aa=String(a.cardNumber||''),bb=String(b.cardNumber||'');
    return aa.localeCompare(bb,undefined,{numeric:true,sensitivity:'base'});
  }

  function ownedMatch(item){
    try{
      const sameSet=c=>{
        const ownedSet=normText(c.setName);
        return !!ownedSet&&(
          ownedSet===normText(item.setName)||
          ownedSet===normText(state.set?.name)||
          ownedSet===normText(state.set?.code)
        );
      };
      const pool=(typeof cards!=='undefined'?cards:[]).filter(c=>c.game===state.game&&sameSet(c));
      const number=normNum(item.cardNumber);
      if(number){
        // A named card can have multiple regular, showcase and full-art printings.
        // Never unlock sibling variants: a numbered checklist item requires the
        // exact collector number from the same set.
        return pool.find(c=>normNum(c.cardNumber)===number)||null;
      }
      // Legacy records without a collector number can only match checklist
      // entries that also have no number.
      return pool.find(c=>!normNum(c.cardNumber)&&normText(c.name)===normText(item.name))||null;
    }catch{return null}
  }

  function progress(){
    const total=state.cards.length;let owned=0,foil=0;
    for(const item of state.cards){const c=ownedMatch(item);if(c){owned++;if(c.foil)foil++}}
    return{total,owned,foil,pct:total?Math.round(owned/total*100):0};
  }

  function render(){
    const grid=q('#setChecklistGrid');if(!grid)return;
    const p=progress();
    q('#setProgressLabel').textContent=state.set?.name||'Kies een set';
    q('#setProgressPercent').textContent=`${p.pct}%`;
    q('#setProgressFill').style.width=`${p.pct}%`;
    q('#setOwnedCount').textContent=`${p.owned} in bezit${p.foil?` · ${p.foil} foil`:''}`;
    q('#setTotalCount').textContent=`${p.total} kaarten`;
    if(!state.cards.length){grid.innerHTML=state.loading||state.set?'<div class="set-empty" style="grid-column:1/-1"><strong>Even laden…</strong>De volledige checklist wordt opgehaald.</div>':'<div class="set-empty" style="grid-column:1/-1"><strong>Kies een set</strong>Daarna zie je hier alle kaarten.</div>';return}
    const s=normText(state.search); const list=[];
    state.cards.forEach((item,index)=>{const owned=ownedMatch(item);const isFoil=!!owned?.foil;if(state.filter==='owned'&&!owned)return;if(state.filter==='missing'&&owned)return;if(state.filter==='foil'&&!isFoil)return;if(s&&!normText(`${item.name} ${item.cardNumber}`).includes(s))return;list.push({item,index,owned,isFoil})});
    if(!list.length){grid.innerHTML='<div class="set-empty" style="grid-column:1/-1"><strong>Geen kaarten gevonden</strong>Pas je zoekopdracht of filter aan.</div>';return}
    grid.innerHTML=list.map(({item,index,owned,isFoil})=>`<article class="set-card ${owned?'owned':'missing'}" data-set-index="${index}"><div class="set-card-frame">${item.image?`<img loading="lazy" src="${escLocal(item.image)}" alt="${escLocal(item.name)}">`:`<div class="set-card-placeholder">${escLocal(String(item.name||'TCG').slice(0,2).toUpperCase())}</div>`}<span class="set-number-badge">${escLocal(item.cardNumber||'—')}</span>${owned?`<span class="set-owned-badge">✓ IN COLLECTIE · ×${Number(owned.quantity||1)}</span>`:`<span class="set-missing-badge">ONTBREEKT</span><button class="set-quick-add" data-set-add="1" aria-label="Kaart toevoegen"><span>＋</span><em>Toevoegen</em></button>`}${isFoil?'<span class="set-foil-badge">FOIL</span>':''}</div><div class="set-card-info"><h4>${escLocal(item.name)}</h4><p>${escLocal(item.rarity||'')} ${owned?'· In collectie':'· Ontbreekt'}</p></div></article>`).join('');
  }

  function setStatus(text,type=''){const el=q('#setStatus');if(!el)return;el.textContent=text;el.className=`set-status ${type}`.trim()}

  // Keep checklist live after collection changes.
  const oldSave=typeof save==='function'?save:null;
  if(oldSave){
    // save is const in app.js, so we cannot replace it; render on user-visible collection events instead.
    document.addEventListener('click',()=>{if(q('#sets')?.classList.contains('active'))requestAnimationFrame(render)},true);
  }

  ensureUI();
})();

