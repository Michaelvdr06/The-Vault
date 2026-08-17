// Arcane 2.9 — Vault Edition, page flips, final spread, zoom into page one.
(() => {
  const collection=document.querySelector('#collection');if(!collection)return;
  const cinematic=document.createElement('div');cinematic.className='binder-cinematic';cinematic.setAttribute('aria-hidden','true');
  const turningPages=Array.from({length:9},(_,i)=>`<div class="bc-flip bc-flip-${9-i}" style="--page:${9-i}"><div class="bc-ghost-grid"></div></div>`).join('');
  cinematic.innerHTML=`<div class="bc-shadow"></div><div class="bc-book"><div class="bc-final-spread"><section class="bc-page bc-left"><div class="bc-grid" data-bc-grid="0"></div><small>PAGE 1</small></section><i class="bc-spine"></i><section class="bc-page bc-right"><div class="bc-grid" data-bc-grid="1"></div><small>PAGE 2</small></section></div>${turningPages}<div class="bc-cover"><span class="bc-emblem">V</span><strong>THE VAULT</strong><small>MAGIC ARCHIVE</small></div></div></div>`;
  document.body.append(cinematic);

  const pocket=(source,ghost=false)=>{const el=document.createElement('div');el.className='bc-pocket';const img=source?.querySelector('img');if(img&&!ghost)el.append(img.cloneNode());else el.innerHTML='<span>V</span>';return el};
  function populate(){
    const cards=[...document.querySelectorAll('#cardGrid .card-frame')].slice(0,18);
    [...cinematic.querySelectorAll('.bc-grid')].forEach((grid,page)=>{grid.innerHTML='';for(let i=0;i<9;i++)grid.append(pocket(cards[page*9+i]))});
    [...cinematic.querySelectorAll('.bc-ghost-grid')].forEach((grid,page)=>{grid.innerHTML='';for(let i=0;i<9;i++)grid.append(pocket(cards[(page*3+i)%Math.max(cards.length,1)],true))});
  }

  let timer;
  function play(){
    clearTimeout(timer);populate();cinematic.classList.remove('is-playing');collection.classList.remove('binder-cinematic-content');void cinematic.offsetWidth;
    cinematic.classList.add('is-playing');collection.classList.add('binder-cinematic-content');
    timer=setTimeout(()=>{cinematic.classList.remove('is-playing');collection.classList.remove('binder-cinematic-content')},4000);
  }
  const observer=new MutationObserver(()=>{if(collection.classList.contains('active')&&!collection.dataset.cinematicOpen){collection.dataset.cinematicOpen='1';requestAnimationFrame(play)}else if(!collection.classList.contains('active'))delete collection.dataset.cinematicOpen});
  observer.observe(collection,{attributes:true,attributeFilter:['class']});if(collection.classList.contains('active'))play();
})();

