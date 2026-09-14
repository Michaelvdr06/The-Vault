(()=>{
  const $=(s)=>document.querySelector(s), $$=(s)=>[...document.querySelectorAll(s)];
  const reader=$('#newsReader'); if(!reader) return;
  const RSS2JSON='https://api.rss2json.com/v1/api.json?rss_url=';
  const feeds=[
    'https://news.google.com/rss/search?q=%22One%20Piece%20Card%20Game%22%20OR%20OPTCG&hl=en&gl=US&ceid=US:en',
    'https://news.google.com/rss/search?q=site%3Aen.onepiece-cardgame.com%20%22ONE%20PIECE%20CARD%20GAME%22&hl=en&gl=US&ceid=US:en'
  ];
  const cacheKey='grand-line-vault.custom-news.v1';
  let stories=[], currentFilter='all';

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const strip=(v='')=>String(v).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
  const prettyDate=(v='')=>{const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('nl-NL',{day:'2-digit',month:'short',year:'numeric'});};
  const cleanTitle=(v='')=>{const p=String(v).split(' - ');return p.length>1?p.slice(0,-1).join(' - '):v;};
  const publisher=(v='')=>{const p=String(v).split(' - ');return p.length>1?p.at(-1):'One Piece TCG';};
  const fromHtml=(html='')=>String(html).match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]||'';
  const category=(s)=>{const t=(s.title+' '+s.summary+' '+s.source).toLowerCase();if(/championship|regional|event|tournament|fest|treasure cup|store championship/.test(t))return'events';if(/booster|starter|playmat|sleeve|collection|pack|release|product/.test(t))return'products';if(/ban|banned|restricted|meta|tier|leader|deck/.test(t))return'meta';return'official';};
  const imageFor=(s)=>{
    if(s.image) return s.image;
    const t=s.title;
    if(/OP[- ]?18/i.test(t)) return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-119.png';
    if(/Robin/i.test(t)) return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-010.png';
    if(/Kaido/i.test(t)) return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-094.png';
    if(/Zoro/i.test(t)) return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png';
    if(/Shanks/i.test(t)) return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png';
    if(/Ace/i.test(t)) return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png';
    return 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-003.png';
  };
  function makeSummary(raw,title){
    const clean=strip(raw);
    if(clean && clean.toLowerCase()!==title.toLowerCase()) return clean.length>260?clean.slice(0,257)+'…':clean;
    const low=title.toLowerCase();
    if(/op[- ]?18/.test(low)) return 'Nieuwe informatie rond OP-18. Dit is vooral interessant voor collectors die reveals, alt arts en de belangrijkste chase cards willen volgen.';
    if(/booster|starter|pack|collection/.test(low)) return 'Nieuwe productupdate voor de One Piece Card Game. Hier zie je snel wat er nieuw of gewijzigd is zonder eerst het volledige bronartikel door te hoeven.';
    if(/championship|regional|event|tournament|fest/.test(low)) return 'Nieuwe event- of tournamentupdate. Relevant als je georganiseerde play, regionals of grote Bandai-evenementen volgt.';
    if(/ban|restricted|meta/.test(low)) return 'Deze update kan invloed hebben op competitieve decks of de huidige meta. Controleer vooral welke kaarten, leaders of regels geraakt worden.';
    return 'Nieuwe One Piece TCG-update. Grand Line Vault vat hier de kern samen; de originele bron blijft onderaan beschikbaar voor alle details.';
  }
  function takeaways(s){
    const t=(s.title+' '+s.summary).toLowerCase(), out=[];
    if(/op[- ]?18/.test(t)) out.push('OP-18 wordt genoemd — interessant voor nieuwe reveals en chase cards.');
    if(/manga|parallel|alt art|alternate/.test(t)) out.push('Collector-alert: bijzondere artwork/rarity lijkt onderdeel van de update.');
    if(/booster|starter|pack|collection|release/.test(t)) out.push('Productnieuws: relevant voor sealed, pre-orders en releaseplanning.');
    if(/championship|regional|event|tournament|fest/.test(t)) out.push('Eventnieuws: relevant voor spelers die officiële events of regionals volgen.');
    if(/ban|banned|restricted|meta|leader|deck/.test(t)) out.push('Meta-impact mogelijk: check deckbuilding, restrictions of competitieve wijzigingen.');
    if(/updated|update|announc|reveal/.test(t)) out.push('Er is nieuwe of gewijzigde informatie ten opzichte van een eerdere aankondiging.');
    if(!out.length) out.push('Kernupdate uit de One Piece TCG-scene, samengevat zonder onnodige details.');
    return out.slice(0,3);
  }
  function cardHtml(s){
    const op18=/OP[- ]?18/i.test(s.title+' '+s.summary);
    return `<button class="journal-card ${op18?'op18':''}" data-story="${esc(s.id)}"><div class="journal-image"><img src="${esc(imageFor(s))}" alt="" loading="lazy" onerror="this.style.display='none'"><span class="journal-tag">${op18?'OP-18':esc(s.label)}</span></div><div class="journal-copy"><div class="journal-meta"><span>${esc(s.date)}</span><span>${esc(s.source)}</span></div><h3>${esc(s.title)}</h3><p>${esc(s.summary)}</p><div class="journal-cta">Lees samenvatting <b>→</b></div></div></button>`;
  }
  function matches(s){const q=($('#newsQuery')?.value||'').trim().toLowerCase();if(q && !(s.title+' '+s.summary+' '+s.source).toLowerCase().includes(q))return false;if(currentFilter==='all')return true;if(currentFilter==='op18')return /op[- ]?18/i.test(s.title+' '+s.summary);if(currentFilter==='official')return /one piece|bandai/i.test(s.source);if(currentFilter==='events')return s.category==='events';return true;}
  function render(){
    const list=stories.filter(matches);
    const main=$('#newsList'), home=$('#homeNews');
    if(main) main.innerHTML=list.length?list.map(cardHtml).join(''):'<div class="empty-state">Geen nieuws gevonden.</div>';
    if(home) home.innerHTML=stories.slice(0,4).map(cardHtml).join('');
    $$('.journal-card').forEach(b=>b.addEventListener('click',()=>openReader(stories.find(s=>s.id===b.dataset.story))));
    if($('#newsStatus')) $('#newsStatus').textContent=`${stories.length} nieuwsitems · leesbaar in de app`;
  }
  function openReader(s){if(!s)return;const points=takeaways(s);$('#newsReaderKicker').textContent=/OP[- ]?18/i.test(s.title+' '+s.summary)?'OP-18 WATCH · GRAND LINE JOURNAL':'GRAND LINE JOURNAL';$('#newsReaderTitle').textContent=s.title;$('#newsReaderSource').textContent=s.source;$('#newsReaderLink').href=s.link;$('#newsReaderImage').innerHTML=`<img src="${esc(imageFor(s))}" alt="One Piece TCG visual" onerror="this.style.display='none'">`;$('#newsReaderSummary').innerHTML=`<span class="reader-label">Kort samengevat</span>${esc(s.summary)}<div class="reader-points"><span class="reader-label">Waarom dit boeit</span>${points.map(p=>`<div><b>✦</b><span>${esc(p)}</span></div>`).join('')}</div>`;reader.classList.remove('hidden');reader.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
  function closeReader(){reader.classList.add('hidden');reader.setAttribute('aria-hidden','true');document.body.style.overflow='';}
  async function load(force=false){
    if(!force){try{const c=JSON.parse(localStorage.getItem(cacheKey)||'[]');if(Array.isArray(c)&&c.length){stories=c;render();}}catch{}}
    try{
      const settled=await Promise.allSettled(feeds.map(f=>fetch(RSS2JSON+encodeURIComponent(f)+(force?'&_='+Date.now():''),{cache:'no-store'}).then(r=>r.json())));
      let rows=[];settled.forEach(r=>{if(r.status==='fulfilled'&&r.value.status==='ok')rows.push(...(r.value.items||[]));});
      const seen=new Set();stories=rows.map((i,idx)=>{const title=cleanTitle(i.title||'One Piece TCG update'),source=(i.author||'').trim()||publisher(i.title||''),summary=makeSummary(i.description||i.content||'',title);const s={id:'story-'+idx+'-'+Math.random().toString(36).slice(2,7),title,source,summary,link:i.link||'#',date:prettyDate(i.pubDate||''),image:i.thumbnail||i.enclosure?.link||fromHtml(i.description||'')};s.category=category(s);s.label=s.category==='events'?'EVENT':s.category==='products'?'PRODUCT':s.category==='meta'?'META':'NEWS';return s;}).filter(s=>{const k=(s.title+'|'+s.link).toLowerCase();if(seen.has(k))return false;seen.add(k);return true;}).slice(0,30);
      localStorage.setItem(cacheKey,JSON.stringify(stories));render();
    }catch{if(!stories.length&&$('#newsStatus'))$('#newsStatus').textContent='Nieuwsfeed tijdelijk niet beschikbaar.';}
  }
  $$('[data-news-close]').forEach(b=>b.addEventListener('click',closeReader));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!reader.classList.contains('hidden'))closeReader();});
  $$('[data-news-ui-filter]').forEach(btn=>btn.addEventListener('click',()=>{currentFilter=btn.dataset.newsUiFilter;$$('[data-news-ui-filter]').forEach(b=>b.classList.toggle('active',b===btn));render();}));
  $('#newsQuery')?.addEventListener('input',render);
  $('#reloadNewsBtn')?.addEventListener('click',e=>{e.stopImmediatePropagation();load(true);});
  load(false);
})();