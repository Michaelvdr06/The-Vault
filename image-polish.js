(()=>{
  const STORE_KEY='grand-line-vault.collection.v2';
  const SEEDED_KEY='grand-line-vault.demo-seeded.v1';

  function seedDemoCollection(){
    let current=[];
    try{ current=JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); }catch{}
    if(Array.isArray(current)&&current.length) return false;
    if(localStorage.getItem(SEEDED_KEY)==='1') return false;

    const now=Date.now();
    const mk=(code,name,rarity,img,value,qty,favorite=false,offset=0,color='Red')=>({
      key:`demo-${code}-${offset}`,
      card:{
        CardNum:code,Name:name,Rarity:rarity,Img:img,
        Alt:/Alt|Manga/i.test(rarity),
        'Card Type':'Character','Primary color':color,
        Effect:'Demo filler card for testing your personal collection layout.',
        _code:code,_set:code.split('-')[0],_alt:/Alt|Manga/i.test(rarity),
        _variant:`${code}|${img}`
      },
      quantity:qty,customValue:value,condition:'Near Mint',language:'English',
      note:'Demo card — safe to remove.',favorite,
      addedAt:new Date(now-offset*86400000).toISOString()
    });

    const demo=[
      mk('OP05-119','Monkey.D.Luffy','SEC','https://en.onepiece-cardgame.com/images/cardlist/card/OP05-119.png',72.50,1,true,0,'Purple'),
      mk('OP01-001','Roronoa Zoro','L','https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png',18.00,1,true,1,'Red'),
      mk('OP01-016','Nami','R','https://en.onepiece-cardgame.com/images/cardlist/card/OP01-016.png',7.50,2,false,2,'Red'),
      mk('OP02-013','Portgas.D.Ace','SR','https://en.onepiece-cardgame.com/images/cardlist/card/OP02-013.png',14.95,1,true,3,'Red'),
      mk('OP05-010','Nico Robin','R','https://en.onepiece-cardgame.com/images/cardlist/card/OP05-010.png',5.25,1,false,4,'Yellow'),
      mk('OP01-094','Kaido','SR','https://en.onepiece-cardgame.com/images/cardlist/card/OP01-094.png',11.00,1,false,5,'Purple'),
      mk('OP01-120','Shanks','SEC','https://en.onepiece-cardgame.com/images/cardlist/card/OP01-120.png',29.50,1,true,6,'Red'),
      mk('OP09-093','Marshall.D.Teach','SR','https://en.onepiece-cardgame.com/images/cardlist/card/OP09-093.png',8.75,3,false,7,'Black')
    ];

    localStorage.setItem(STORE_KEY,JSON.stringify(demo));
    localStorage.setItem(SEEDED_KEY,'1');
    return true;
  }

  const fallback='assets/hero.jpg';
  function polishImages(){
    document.querySelectorAll('img').forEach(img=>{
      if(img.dataset.glvPolished) return;
      img.dataset.glvPolished='1';
      img.addEventListener('error',()=>{
        if(img.dataset.glvFallbackDone) return;
        img.dataset.glvFallbackDone='1';
        img.src=fallback;
      });
    });
  }

  if(seedDemoCollection()){
    location.reload();
    return;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',polishImages); else polishImages();
  new MutationObserver(polishImages).observe(document.documentElement,{childList:true,subtree:true});
})();