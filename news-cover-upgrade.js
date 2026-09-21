(() => {
  const IMG = {
    franky: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP03-122.png',
    luffy: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png',
    zoro: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png',
    nami: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016.png',
    sanji: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP06-119.png',
    robin: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-010.png',
    usopp: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP03-041.png',
    chopper: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-006.png',
    brook: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP09-013.png',
    jinbe: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP07-045.png',
    ace: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png',
    sabo: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP04-083.png',
    boa: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP07-051.png',
    shanks: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png',
    kaido: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-094.png',
    teach: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP09-093.png',
    buggy: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP09-051.png',
    law: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-047.png',
    kid: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-074.png',
    croc: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP04-060.png',
    mihawk: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-070.png',
    loki: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-119.png',
    shamrock: 'https://en.onepiece-cardgame.com/images/cardlist/card/OP12-021.png',
    op18: 'https://i.imgur.com/hN9P3Eg.jpeg',
    op17: 'https://i.imgur.com/0q6sV8w.jpeg',
    product: 'https://i.imgur.com/94pI3w7.jpeg',
    event: 'https://i.imgur.com/uwwct7V.jpeg',
    market: 'https://i.imgur.com/VRPqHzj.jpeg',
    guide: 'https://i.imgur.com/q4wg50b.jpeg',
    default: 'https://i.imgur.com/BY6A3g9.jpeg'
  };

  function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  const keywordMap = [
    [/franky/i,'franky'],[/luffy/i,'luffy'],[/zoro/i,'zoro'],[/nami/i,'nami'],[/sanji/i,'sanji'],[/robin/i,'robin'],[/usopp/i,'usopp'],[/chopper/i,'chopper'],[/brook/i,'brook'],[/jinbe/i,'jinbe'],[/ace/i,'ace'],[/sabo/i,'sabo'],[/boa|hancock/i,'boa'],[/shanks/i,'shanks'],[/kaido/i,'kaido'],[/teach|blackbeard/i,'teach'],[/buggy/i,'buggy'],[/law|trafalgar/i,'law'],[/kid|eustass/i,'kid'],[/crocodile/i,'croc'],[/mihawk/i,'mihawk'],[/loki/i,'loki'],[/shamrock/i,'shamrock'],[/op[- ]?18|dominance of god/i,'op18'],[/op[- ]?17|world.?s strongest/i,'op17'],[/championship|regional|treasure cup|event|tournament|cup/i,'event'],[/price|sell|market|collector|value/i,'market'],[/guide|meta|deck build|gameplay|leader/i,'guide'],[/starter|booster|pack|dash pack|premium|collection|release|reveals?/i,'product']
  ];

  function textOf(item){
    return [item.dataset.title,item.dataset.description,item.querySelector('h3')?.textContent,item.textContent].filter(Boolean).join(' ');
  }
  function sourceOf(item){return item.dataset.source || item.querySelector('.news-meta span:last-child')?.textContent || '';}
  function categoryOf(item){
    const t=(textOf(item)+' '+sourceOf(item)).toLowerCase();
    if(/event|tournament|regional|championship|cup/.test(t)) return 'Event';
    if(/price|sell|market|collector|value/.test(t)) return 'Market';
    if(/guide|meta|build|gameplay|leader/.test(t)) return 'Guide';
    if(/op[- ]?18|op[- ]?17|reveal|release|pack|starter|booster|product/.test(t)) return 'Set Watch';
    return 'World Economy Journal';
  }
  function chooseImage(item){
    const direct=item.dataset.image||'';
    if(direct && !/googleusercontent|blank|logo|icon/i.test(direct)) return direct;
    const text=textOf(item);
    for(const [re,key] of keywordMap){ if(re.test(text)) return IMG[key]; }
    return IMG.default;
  }
  function summaryOf(item){
    const raw=(item.dataset.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if(!raw) return 'Snelle samenvatting uit de Grand Line Vault redactie. Open het artikel voor de volledige bron en extra context.';
    return raw.length>120 ? raw.slice(0,117)+'…' : raw;
  }
  function applyCard(item, idx){
    item.classList.add('glv-news-card');
    item.classList.toggle('featured', idx===0);
    const title=item.querySelector('h3')?.textContent?.trim() || item.dataset.title || 'One Piece TCG update';
    const image=chooseImage(item);
    const category=categoryOf(item);
    const summary=summaryOf(item);
    let cover=item.querySelector('.news-cover');
    if(!cover){ cover=document.createElement('div'); cover.className='news-cover'; item.prepend(cover); }
    cover.innerHTML=`<img src="${image}" alt="${esc(title)}" loading="lazy" referrerpolicy="no-referrer">`;
    cover.querySelector('img').onerror=()=>{cover.querySelector('img').src=IMG.default;};
    let kicker=item.querySelector('.news-kicker');
    if(!kicker){ kicker=document.createElement('div'); kicker.className='news-kicker'; item.querySelector('.news-body')?.prepend(kicker); }
    kicker.textContent=category;
    let blurb=item.querySelector('.news-blurb');
    if(!blurb){ blurb=document.createElement('p'); blurb.className='news-blurb'; const h=item.querySelector('h3'); if(h) h.insertAdjacentElement('afterend', blurb); }
    blurb.textContent=summary;
  }
  function enhance(root=document){
    root.querySelectorAll('.news-item').forEach((item,idx)=>applyCard(item,idx));
  }
  function syncReader(card){
    const reader=document.getElementById('newsReaderImage'); if(!reader) return;
    const src=card.querySelector('.news-cover img')?.currentSrc || chooseImage(card);
    reader.innerHTML=`<img src="${src}" alt="Nieuws cover" style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block">`;
  }
  function boot(){
    enhance();
    document.addEventListener('click',e=>{ const item=e.target.closest('.news-item'); if(item){ setTimeout(()=>syncReader(item), 40); } });
    const obs=new MutationObserver(()=>enhance());
    obs.observe(document.body,{childList:true,subtree:true});
    window.__glvEnhanceNews = enhance;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();