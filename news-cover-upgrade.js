(() => {
  const ASSET={
    hero:'https://m.media-amazon.com/images/S/pv-target-images/5c05de636f596cb157698cde7923ce19e8473211228abb1cea24a12baaaa8074.jpg',
    wanted:'https://wallpapercave.com/wp/wp10885749.jpg',
    morgans:'https://i.postimg.cc/fRGtzjnP/picsart-23-02-20-21-37-52-331.jpg',
    jolly:'https://clipart-library.com/2023/437-4372322_anime-clipart-one-piece-one-piece-logo-transparent.png'
  };
  const VARIANTS={
    official:[{src:ASSET.hero,pos:'center 28%'},{src:ASSET.morgans,pos:'center top'}],
    product:[{src:ASSET.hero,pos:'left center'},{src:ASSET.hero,pos:'76% center'},{src:ASSET.wanted,pos:'center top'}],
    market:[{src:ASSET.wanted,pos:'center top'},{src:ASSET.jolly,pos:'center 38%'},{src:ASSET.hero,pos:'58% center'}],
    event:[{src:ASSET.jolly,pos:'center 22%'},{src:ASSET.hero,pos:'center center'},{src:ASSET.morgans,pos:'center top'}],
    guide:[{src:ASSET.hero,pos:'right center'},{src:ASSET.jolly,pos:'center center'},{src:ASSET.wanted,pos:'center 18%'}],
    general:[{src:ASSET.hero,pos:'center center'},{src:ASSET.morgans,pos:'center top'},{src:ASSET.jolly,pos:'center center'}]
  };
  const hash=(s='')=>[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7);
  function classify(title='',source=''){
    const t=(title+' '+source).toLowerCase();
    if(/official|bandai|service|website|app/.test(t))return'official';
    if(/op[- ]?\d+|pack|booster|starter|deck|campaign|treasure pack|dash pack|collection|release|premium/.test(t))return'product';
    if(/price|pricing|seller|selling|market|collector|value/.test(t))return'market';
    if(/championship|event|regional|tournament|cup|treasure cup|fest/.test(t))return'event';
    if(/guide|meta|build|gameplay|dominant|leader/.test(t))return'guide';
    return'general';
  }
  function pickVariant(title,source=''){const pool=VARIANTS[classify(title,source)]||VARIANTS.general;return pool[hash(title)%pool.length]}
  function setCover(item,title,source){
    const v=pickVariant(title,source);
    let cover=item.querySelector('.news-cover');
    if(!cover){cover=document.createElement('div');cover.className='news-cover';item.prepend(cover)}
    cover.style.backgroundImage="url('"+v.src+"')";
    cover.style.backgroundPosition=v.pos;
    let img=cover.querySelector('img');
    if(!img){img=document.createElement('img');img.alt=title||'Nieuws afbeelding';img.loading='lazy';cover.innerHTML='';cover.appendChild(img)}
    img.src=v.src;img.style.objectPosition=v.pos;
    img.onerror=()=>{img.style.display='none';cover.style.backgroundImage="url('"+ASSET.hero+"')";cover.style.backgroundPosition='center center'};
    item.dataset.coverSrc=v.src;item.dataset.coverPos=v.pos;
  }
  function enhanceNews(root=document){
    root.querySelectorAll('.news-item').forEach(item=>{
      const title=item.querySelector('h3')?.textContent?.trim()||item.dataset.title||'One Piece TCG news';
      const spans=item.querySelectorAll('.news-meta span');
      const source=spans[spans.length-1]?.textContent?.trim()||item.dataset.source||'';
      setCover(item,title,source);
    });
  }
  function proxyCardImage(url){if(!url)return'';const clean=url.split('?')[0];return 'https://wsrv.nl/?url='+encodeURIComponent(clean)+'&w=560&output=webp&q=88'}
  function fixCardImages(){
    document.querySelectorAll('.tcg-card img,.mini-card img,#modalImage').forEach(img=>{
      if(img.dataset.glvBound)return;
      img.dataset.glvBound='1';img.loading='lazy';img.decoding='async';img.style.display='block';img.style.opacity='1';
      const original=img.currentSrc||img.getAttribute('src')||'';
      img.onerror=()=>{if(img.dataset.proxyTried)return;img.dataset.proxyTried='1';const proxied=proxyCardImage(original);if(proxied)img.src=proxied};
    });
  }
  function syncReader(card){
    const r=document.getElementById('newsReaderImage');if(!r||!card)return;
    const src=card.dataset.coverSrc||ASSET.hero,pos=card.dataset.coverPos||'center center';
    r.style.backgroundImage="url('"+src+"')";r.style.backgroundPosition=pos;
    r.innerHTML='<img src="'+src+'" alt="Nieuws cover" style="width:100%;height:100%;object-fit:cover;object-position:'+pos+';display:block">';
  }
  function boot(){
    enhanceNews();fixCardImages();
    document.addEventListener('click',e=>{const c=e.target.closest('.news-item');if(c)setTimeout(()=>syncReader(c),50);setTimeout(fixCardImages,80)});
    new MutationObserver(()=>{enhanceNews();fixCardImages()}).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();