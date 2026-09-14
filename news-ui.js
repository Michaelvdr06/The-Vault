(()=>{
  const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
  const reader=$('#newsReader'); if(!reader) return;
  const imageMap=[
    [/OP[- ]?18/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-119.png'],
    [/OP[- ]?17|STRONGEST WARRIORS/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-001.png'],
    [/LUFFY/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png'],
    [/ZORO/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png'],
    [/ROBIN/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-010.png'],
    [/KAIDO/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-094.png'],
    [/SHANKS/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png'],
    [/ACE/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png'],
    [/BLACKBEARD|TEACH/i,'https://en.onepiece-cardgame.com/images/cardlist/card/OP09-093.png'],
    [/./,'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png']
  ];
  let currentFilter='all';
  const pickImage=(title)=>imageMap.find(([re])=>re.test(title))?.[1]||imageMap.at(-1)[1];
  const sourceFrom=(item)=>{ const spans=item.querySelectorAll('.news-meta span'); return spans.length?spans[spans.length-1].textContent.trim():'One Piece TCG News'; };
  function enhanceItem(item){
    if(item.dataset.enhanced) return;
    item.dataset.enhanced='1';
    const href=item.getAttribute('href')||'#'; const title=item.querySelector('h3')?.textContent.trim()||'One Piece TCG update';
    const meta=item.querySelector('.news-meta')?.outerHTML||''; const source=sourceFrom(item);
    item.dataset.source=source; item.dataset.title=title; item.dataset.href=href;
    item.innerHTML=`<div class="news-cover"><img src="${pickImage(title)}" alt="" loading="lazy" onerror="this.src='https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png'"></div><div class="news-body">${meta}<h3>${title}</h3><div class="news-source-inline"><span>${source}</span><strong>Lees in app →</strong></div></div>`;
    item.removeAttribute('target');
    item.addEventListener('click',e=>{e.preventDefault();openReader(item);});
  }
  function enhanceAll(){ $$('.news-item').forEach(enhanceItem); applyFilter(); }
  function openReader(item){
    const title=item.dataset.title||'Nieuws'; const source=item.dataset.source||'One Piece TCG News'; const href=item.dataset.href||'#';
    $('#newsReaderTitle').textContent=title; $('#newsReaderSource').textContent=source; $('#newsReaderLink').href=href;
    $('#newsReaderKicker').textContent=/OP[- ]?18/i.test(title)?'OP-18 WATCH · WORLD ECONOMY JOURNAL':'WORLD ECONOMY JOURNAL';
    $('#newsReaderSummary').textContent=`${title}. Deze update komt uit ${source}. Grand Line Vault toont het nieuws eerst hier in de app; via de bronknop hieronder kun je het originele artikel openen voor alle details.`;
    $('#newsReaderImage').innerHTML=`<img src="${pickImage(title)}" alt="One Piece TCG illustratie" onerror="this.src='https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png'">`;
    reader.classList.remove('hidden');reader.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  }
  function closeReader(){reader.classList.add('hidden');reader.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  $$('[data-news-close]').forEach(b=>b.addEventListener('click',closeReader)); document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!reader.classList.contains('hidden'))closeReader();});
  function matches(item,filter){ const t=(item.dataset.title||item.textContent||'').toLowerCase(),s=(item.dataset.source||'').toLowerCase(); if(filter==='all')return true;if(filter==='op18')return /op[- ]?18/i.test(t);if(filter==='official')return s.includes('one piece')||s.includes('bandai');if(filter==='events')return /event|fest|regional|championship|tournament|store/i.test(t);return true; }
  function applyFilter(){ $$('#newsList .news-item').forEach(i=>i.style.display=matches(i,currentFilter)?'flex':'none'); }
  $$('[data-news-ui-filter]').forEach(btn=>btn.addEventListener('click',()=>{currentFilter=btn.dataset.newsUiFilter;$$('[data-news-ui-filter]').forEach(b=>b.classList.toggle('active',b===btn));applyFilter();}));
  const observer=new MutationObserver(enhanceAll); ['#newsList','#homeNews'].forEach(sel=>{const el=$(sel);if(el)observer.observe(el,{childList:true,subtree:false});}); enhanceAll();
})();