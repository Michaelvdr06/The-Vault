(()=>{
  const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
  const reader=$('#newsReader');
  if(!reader) return;

  const imageMap=[
    [/OP[- ]?18|GOD|SHAMROCK|LOKI/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-119.png'],
    [/ROBIN/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-010.png'],
    [/LUFFY/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png'],
    [/ZORO/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png'],
    [/KAIDO/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-094.png'],
    [/ACE/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png'],
    [/BLACKBEARD|TEACH/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP09-093.png'],
    [/EVENT|REGIONAL|CHAMPIONSHIP|TOURNAMENT/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-025.png'],
    [/STARTER|DECK|BOOSTER|PACK|COLLECTION|PRODUCT/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png'],
    [/./,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png']
  ];

  let currentFilter='all';
  const pickImage=(title)=>imageMap.find(([re])=>re.test(title))?.[1]||imageMap.at(-1)[1];

  function sourceFrom(item){
    const spans=item.querySelectorAll('.news-meta span');
    return spans.length?spans[spans.length-1].textContent.trim():'One Piece TCG News';
  }

  function sectionFromTitle(title=''){
    const t=title.toLowerCase();
    if(/op[- ]?18/.test(t)) return 'OP-18 Watch';
    if(/event|regional|championship|tournament|cup|fest/.test(t)) return 'Event Report';
    if(/starter|deck|booster|pack|collection|sleeve|playmat|premium|product/.test(t)) return 'Product Watch';
    return 'Big News Morgans';
  }

  function reasonFromTitle(title=''){
    const t=title.toLowerCase();
    if(/op[- ]?18/.test(t)) return 'Relevant voor collectors en spelers die reveals, nieuwe leaders, manga rares of alt arts volgen.';
    if(/event|regional|championship|tournament|cup|fest/.test(t)) return 'Belangrijk als je toernooien volgt of wilt weten welke events eraan komen of net geweest zijn.';
    if(/starter|deck|booster|pack|collection|sleeve|playmat|premium|product/.test(t)) return 'Handig als je sealed, pre-orders of nieuwe productreleases in de gaten houdt.';
    if(/ban|restricted|meta|tier|leader/.test(t)) return 'Relevant voor deckbuilding en de competitieve meta.';
    return 'Handig als algemene One Piece TCG update zodat je snel weet wat er speelt zonder meteen extern door te klikken.';
  }

  function bulletsFromTitle(title=''){
    const t=title.toLowerCase();
    const bullets=[];
    if(/op[- ]?18/.test(t)) bullets.push('Deze update raakt waarschijnlijk direct de hype rond OP-18, reveals of chase kaarten.');
    if(/manga/.test(t)) bullets.push('Er wordt iets genoemd dat interessant kan zijn voor collectors en high-end hits.');
    if(/leader/.test(t)) bullets.push('Kan relevant zijn voor spelers die nieuwe leaders of deck cores willen checken.');
    if(/event|regional|championship|tournament|cup|fest/.test(t)) bullets.push('Waarschijnlijk belangrijk voor event-info, deelname of resultaten.');
    if(/starter|deck|booster|pack|collection|premium/.test(t)) bullets.push('Kan impact hebben op sealed aankopen, pre-orders of wat je wilt verzamelen.');
    if(/release|launch|update/.test(t)) bullets.push('Dit lijkt een verse update of nieuwe aankondiging te zijn.');
    if(!bullets.length) bullets.push('Snelle heads-up uit de One Piece TCG-scene met de kerninfo netjes samengevat.');
    return bullets.slice(0,3);
  }

  function buildSummary(title='', source=''){
    return `Big News Morgans brengt een nieuwe update: ${title}. Grand Line Vault vat hem hier kort voor je samen, zodat je meteen ziet wat er speelt en waarom het relevant is, zonder eerst uit de app te gaan. Bron: ${source}.`;
  }

  function buildReaderBody(title){
    const what = `De kern van dit bericht draait om: ${title}. Dit is de hoofdlijn van het artikel zoals die nu in de nieuwsfeed naar voren komt.`;
    const why = reasonFromTitle(title);
    const bullets = bulletsFromTitle(title).map(point=>`<li>${point}</li>`).join('');
    return `
      <div class="news-journal-blocks">
        <section class="news-journal-block">
          <h3>Kort samengevat</h3>
          <p>${what}</p>
        </section>
        <section class="news-journal-block">
          <h3>Waarom dit boeit</h3>
          <p>${why}</p>
        </section>
        <section class="news-journal-block">
          <h3>Belangrijkste punten</h3>
          <ul>${bullets}</ul>
        </section>
      </div>`;
  }

  function enhanceItem(item){
    if(item.dataset.enhanced) return;
    item.dataset.enhanced='1';
    const href=item.getAttribute('href')||'#';
    const title=item.querySelector('h3')?.textContent.trim()||'One Piece TCG update';
    const meta=item.querySelector('.news-meta')?.outerHTML||'';
    const source=sourceFrom(item);
    item.dataset.source=source;
    item.dataset.title=title;
    item.dataset.href=href;
    item.classList.toggle('op18',/OP[- ]?18/i.test(title));
    item.innerHTML=`<div class="news-cover"><img src="${pickImage(title)}" alt="" loading="lazy" onerror="this.src='https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png'"></div><div class="news-body">${meta}<h3>${title}</h3><div class="news-source-inline"><span>${source}</span><strong>Lees in krantstijl →</strong></div></div>`;
    item.removeAttribute('target');
    item.addEventListener('click',e=>{e.preventDefault();openReader(item);});
  }

  function enhanceAll(){
    $$('.news-item').forEach(enhanceItem);
    applyFilter();
  }

  function openReader(item){
    const title=item.dataset.title||'Nieuws';
    const source=item.dataset.source||'One Piece TCG News';
    const href=item.dataset.href||'#';
    $('#newsReaderTitle').textContent=title;
    $('#newsReaderSource').textContent=source;
    $('#newsReaderLink').href=href;
    $('#newsReaderKicker').textContent=`WORLD ECONOMY JOURNAL • ${sectionFromTitle(title).toUpperCase()}`;
    $('#newsReaderSummary').textContent=buildSummary(title, source);
    $('#newsReaderImage').innerHTML=`<img src="${pickImage(title)}" alt="One Piece TCG illustratie" onerror="this.src='https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png'">`;

    let blocks = document.getElementById('newsReaderBlocks');
    if(!blocks){
      blocks=document.createElement('div');
      blocks.id='newsReaderBlocks';
      $('#newsReaderSummary').insertAdjacentElement('afterend',blocks);
    }
    blocks.innerHTML = buildReaderBody(title);

    reader.classList.remove('hidden');
    reader.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }

  function closeReader(){
    reader.classList.add('hidden');
    reader.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }

  $$('[data-news-close]').forEach(b=>b.addEventListener('click',closeReader));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!reader.classList.contains('hidden'))closeReader();});

  function matches(item,filter){
    const t=(item.dataset.title||item.textContent||'').toLowerCase();
    const s=(item.dataset.source||'').toLowerCase();
    if(filter==='all') return true;
    if(filter==='op18') return /op[- ]?18/i.test(t);
    if(filter==='official') return s.includes('one piece') || s.includes('bandai');
    if(filter==='events') return /event|fest|regional|championship|tournament|store|cup/i.test(t);
    return true;
  }

  function applyFilter(){
    $$('#newsList .news-item').forEach(i=>i.style.display=matches(i,currentFilter)?'flex':'none');
  }

  $$('[data-news-ui-filter]').forEach(btn=>btn.addEventListener('click',()=>{
    currentFilter=btn.dataset.newsUiFilter;
    $$('[data-news-ui-filter]').forEach(b=>b.classList.toggle('active',b===btn));
    applyFilter();
  }));

  const observer=new MutationObserver(enhanceAll);
  ['#newsList','#homeNews'].forEach(sel=>{const el=$(sel); if(el) observer.observe(el,{childList:true,subtree:false});});
  enhanceAll();
})();
