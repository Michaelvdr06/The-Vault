// Arcane binder opening experience. Visual only; collection data stays untouched.
(() => {
  const page=document.querySelector('#collection');
  if(!page)return;

  const stage=document.createElement('div');
  stage.className='binder-opening-stage';
  stage.setAttribute('aria-hidden','true');
  stage.innerHTML=`
    <div class="binder-book-shadow"></div>
    <div class="binder-back-page"><span class="binder-rings"></span></div>
    <div class="binder-cover">
      <span class="binder-cover-edge"></span>
      <span class="binder-cover-mark">V</span>
      <strong>THE VAULT</strong>
      <small>MAGIC ARCHIVE</small>
    </div>`;
  page.prepend(stage);

  let timer;
  function openBinder(){
    clearTimeout(timer);
    page.classList.remove('binder-is-opening');
    void page.offsetWidth;
    page.classList.add('binder-is-opening');
    timer=setTimeout(()=>page.classList.remove('binder-is-opening'),1350);
  }

  const observer=new MutationObserver(()=>{
    if(page.classList.contains('active')&&!page.dataset.binderWasActive){
      page.dataset.binderWasActive='1';
      openBinder();
    }else if(!page.classList.contains('active')){
      delete page.dataset.binderWasActive;
    }
  });
  observer.observe(page,{attributes:true,attributeFilter:['class']});
  if(page.classList.contains('active'))openBinder();
})();

