// Loads after the legacy cinematic styles so the app has one final art direction.
(() => {
  if(document.querySelector('link[data-magic-theme]')) return;
  const css=document.createElement('link');
  css.rel='stylesheet';css.href='magic-theme.css?v=1';css.dataset.magicTheme='1';
  css.onload=()=>{
    if(document.querySelector('link[data-cardback-ui]')) return;
    const ui=document.createElement('link');
    ui.rel='stylesheet';ui.href='cardback-ui.css?v=1';ui.dataset.cardbackUi='1';
    document.head.appendChild(ui);
  };
  document.head.appendChild(css);
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button');
    if(!button||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const ripple=document.createElement('i');ripple.className='magic-ripple';
    const box=button.getBoundingClientRect();
    ripple.style.left=`${event.clientX-box.left}px`;ripple.style.top=`${event.clientY-box.top}px`;
    button.appendChild(ripple);ripple.addEventListener('animationend',()=>ripple.remove());
  },{passive:true});
})();
