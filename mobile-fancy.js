(() => {
  let lastTap=0;

  function addRevealTargets(){
    document.querySelectorAll('.section,.bounty-ledger,.paper-panel,.journal-frontpage,.news-item,.tcg-card,.mini-card').forEach(el=>{
      if(el.dataset.revealBound)return;
      el.dataset.revealBound='1';
      el.classList.add('reveal-on-scroll');
      revealObserver.observe(el);
    });
  }

  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },{threshold:.08,rootMargin:'0px 0px -20px 0px'});

  function haptic(){
    if(navigator.vibrate){
      const now=Date.now();
      if(now-lastTap>90){navigator.vibrate(8);lastTap=now;}
    }
  }

  document.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,[data-card],.news-item')) haptic();
  },{passive:true});

  function addTouchTilt(card){
    if(card.dataset.touchTilt==='1')return;
    card.dataset.touchTilt='1';
    card.addEventListener('pointermove',e=>{
      if(e.pointerType==='mouse')return;
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      card.style.transform=`perspective(650px) rotateY(${x*6}deg) rotateX(${-y*5}deg) scale(.985)`;
    },{passive:true});
    const reset=()=>{card.style.transform=''};
    card.addEventListener('pointerup',reset,{passive:true});
    card.addEventListener('pointercancel',reset,{passive:true});
    card.addEventListener('pointerleave',reset,{passive:true});
  }

  function boot(){
    addRevealTargets();
    document.querySelectorAll('.tcg-card,.mini-card').forEach(addTouchTilt);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  new MutationObserver(()=>requestAnimationFrame(boot)).observe(document.body,{childList:true,subtree:true});
})();