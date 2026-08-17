// Arcane 2.2 binder pages entry point.
// Kept separate so GitHub Pages always receives the new animation atomically.
(() => {
  const page=document.querySelector('#collection');if(!page)return;
  const stage=document.createElement('div');stage.className='binder-opening-stage';stage.setAttribute('aria-hidden','true');
  stage.innerHTML=`<div class="binder-book-shadow"></div><div class="binder-open-spread"><div class="binder-mini-page binder-mini-left"><div class="binder-mini-grid" data-mini-page="left"></div><span>PAGE 1</span></div><span class="binder-rings"></span><div class="binder-mini-page binder-mini-right"><div class="binder-mini-grid" data-mini-page="right"></div><span>PAGE 2</span></div></div><div class="binder-cover"><span class="binder-cover-edge"></span><span class="binder-cover-mark">V</span><strong>THE VAULT</strong><small>MAGIC ARCHIVE</small></div>`;
  page.prepend(stage);
  const syncCards=()=>{const frames=[...document.querySelectorAll('#cardGrid .card-frame')].slice(0,8);[...stage.querySelectorAll('.binder-mini-grid')].forEach((grid,p)=>{grid.innerHTML='';for(let i=0;i<4;i++){const pocket=document.createElement('div');pocket.className='binder-mini-pocket';const image=frames[p*4+i]?.querySelector('img');if(image)pocket.append(image.cloneNode());else pocket.innerHTML='<span>V</span>';grid.append(pocket)}})};
  let timer;const openBinder=()=>{clearTimeout(timer);syncCards();page.classList.remove('binder-is-opening');void page.offsetWidth;page.classList.add('binder-is-opening');timer=setTimeout(()=>page.classList.remove('binder-is-opening'),1850)};
  const observer=new MutationObserver(()=>{if(page.classList.contains('active')&&!page.dataset.binderWasActive){page.dataset.binderWasActive='1';openBinder()}else if(!page.classList.contains('active'))delete page.dataset.binderWasActive});
  observer.observe(page,{attributes:true,attributeFilter:['class']});if(page.classList.contains('active'))openBinder();
})();

