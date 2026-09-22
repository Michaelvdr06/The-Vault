(() => {
  const pageNames=new Set(['home','search','collection','news']);

  function activatePage(name){
    if(!pageNames.has(name)) return;
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.dataset.page===name));
    document.querySelectorAll('.bottom-nav [data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
    try{history.replaceState(null,'','#'+name)}catch{}
    window.scrollTo({top:0,behavior:'auto'});
  }

  /* Delegated navigation is intentionally independent of app.js.
     It makes nav taps survive partial script failures and dynamic layout changes. */
  document.addEventListener('click',e=>{
    const nav=e.target.closest('[data-nav]');
    if(!nav) return;
    const name=nav.dataset.nav;
    if(!pageNames.has(name)) return;
    e.preventDefault();
    e.stopPropagation();
    activatePage(name);
  },true);

  document.addEventListener('touchend',e=>{
    const nav=e.target.closest('[data-nav]');
    if(!nav) return;
    const name=nav.dataset.nav;
    if(!pageNames.has(name)) return;
    activatePage(name);
  },{passive:true,capture:true});

  function normalizeImages(){
    document.querySelectorAll('.news-cover').forEach(cover=>{
      const img=cover.querySelector('img');
      if(!img) return;
      const src=img.currentSrc||img.src||'';
      const cardArt=/onepiece-cardgame\.com\/images\/cardlist\/card\//i.test(src);
      cover.dataset.cardArt=cardArt?'1':'0';
    });
    document.querySelectorAll('.tcg-card img,.mini-card img,#modalImage').forEach(img=>{
      img.style.opacity='1';
      img.style.display='block';
    });
  }

  function closeInvisibleOverlays(){
    document.querySelectorAll('.modal.hidden,.news-reader.hidden').forEach(el=>{
      el.style.pointerEvents='none';
    });
    document.querySelectorAll('.modal:not(.hidden),.news-reader:not(.hidden)').forEach(el=>{
      el.style.pointerEvents='auto';
    });
  }

  function run(){normalizeImages();closeInvisibleOverlays()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','src']});
})();