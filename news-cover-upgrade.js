(() => {
  const IMG={
    franky:'https://en.onepiece-cardgame.com/images/cardlist/card/OP03-122.png',
    luffy:'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png',
    zoro:'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png',
    nami:'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016.png',
    sanji:'https://en.onepiece-cardgame.com/images/cardlist/card/OP06-119.png',
    robin:'https://en.onepiece-cardgame.com/images/cardlist/card/OP05-010.png',
    ace:'https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png',
    shanks:'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png',
    kaido:'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-094.png',
    teach:'https://en.onepiece-cardgame.com/images/cardlist/card/OP09-093.png',
    law:'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-047.png',
    mihawk:'https://en.onepiece-cardgame.com/images/cardlist/card/OP01-070.png',
    loki:'https://en.onepiece-cardgame.com/images/cardlist/card/OP17-119.png',
    event:'https://i.imgur.com/uwwct7V.jpeg',
    market:'https://i.imgur.com/VRPqHzj.jpeg',
    product:'https://i.imgur.com/94pI3w7.jpeg',
    default:'https://m.media-amazon.com/images/S/pv-target-images/5c05de636f596cb157698cde7923ce19e8473211228abb1cea24a12baaaa8074.jpg'
  };
  const MAP=[[/franky/i,'franky'],[/luffy/i,'luffy'],[/zoro/i,'zoro'],[/nami/i,'nami'],[/sanji/i,'sanji'],[/robin/i,'robin'],[/ace/i,'ace'],[/shanks/i,'shanks'],[/kaido/i,'kaido'],[/teach|blackbeard/i,'teach'],[/trafalgar|\blaw\b/i,'law'],[/mihawk/i,'mihawk'],[/loki/i,'loki'],[/event|tournament|regional|championship|cup/i,'event'],[/price|market|sell|collector|value/i,'market'],[/starter|booster|pack|release|reveal|campaign|deck/i,'product']];
  let scheduled=false;

  function choose(item){
    const direct=item.dataset.image||'';
    if(/^https?:/i.test(direct)&&!/googleusercontent|logo|icon|blank/i.test(direct))return direct;
    const text=[item.dataset.title,item.dataset.description,item.querySelector('h3')?.textContent,item.textContent].filter(Boolean).join(' ');
    for(const [re,key] of MAP)if(re.test(text))return IMG[key];
    return IMG.default;
  }
  function category(item){
    const t=[item.dataset.title,item.querySelector('h3')?.textContent,item.textContent].join(' ').toLowerCase();
    if(/op[- ]?18|op[- ]?17|release|reveal|booster|pack/.test(t))return'SET WATCH';
    if(/event|regional|championship|tournament|cup/.test(t))return'EVENT';
    if(/price|market|seller|collector|value/.test(t))return'MARKET';
    return'WORLD ECONOMY JOURNAL';
  }
  function cleanDesc(item){
    const raw=(item.dataset.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    return raw&&raw.length>35?(raw.length>135?raw.slice(0,132)+'…':raw):'De belangrijkste One Piece TCG-update, kort samengevat in je Grand Line Journal.';
  }
  function enhanceItem(item,index){
    const title=item.dataset.title||item.querySelector('h3')?.textContent?.trim()||'One Piece TCG update';
    const src=choose(item);
    const signature=title+'|'+src;
    if(item.dataset.qaSignature===signature)return;
    item.dataset.qaSignature=signature;
    item.classList.add('glv-news-card');
    item.classList.toggle('featured',index===0);

    let cover=item.querySelector('.news-cover');
    if(!cover){cover=document.createElement('div');cover.className='news-cover';item.prepend(cover)}
    let img=cover.querySelector('img');
    if(!img){img=document.createElement('img');cover.replaceChildren(img)}
    if(img.getAttribute('src')!==src)img.src=src;
    img.alt=title;img.loading='lazy';img.referrerPolicy='no-referrer';
    img.onerror=()=>{img.onerror=null;img.src=IMG.default};

    const body=item.querySelector('.news-body')||item;
    let kicker=body.querySelector('.news-kicker');
    if(!kicker){kicker=document.createElement('div');kicker.className='news-kicker';body.prepend(kicker)}
    kicker.textContent=category(item);
    let blurb=body.querySelector('.news-blurb');
    if(!blurb){blurb=document.createElement('p');blurb.className='news-blurb';const h=body.querySelector('h3');h?.insertAdjacentElement('afterend',blurb)}
    if(blurb)blurb.textContent=cleanDesc(item);
  }
  function enhance(){
    document.querySelectorAll('#newsList .news-item,#homeNews .news-item,#setIntelNews .news-item').forEach((item,i)=>enhanceItem(item,i));
  }
  function schedule(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;enhance()});
  }
  document.addEventListener('click',e=>{
    const item=e.target.closest('.news-item');if(!item)return;
    const src=item.querySelector('.news-cover img')?.src;
    const reader=document.getElementById('newsReaderImage');
    if(src&&reader)setTimeout(()=>{reader.innerHTML='<img src="'+src+'" alt="Nieuws cover">';},30);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
  ['newsList','homeNews','setIntelNews'].forEach(id=>{
    const el=document.getElementById(id);if(el)new MutationObserver(schedule).observe(el,{childList:true});
  });
  window.__glvEnhanceNews=enhance;
})();