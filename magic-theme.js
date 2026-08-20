// Loads after the legacy cinematic styles so the app has one final art direction.
(() => {
  if(document.querySelector('link[data-magic-theme]')) return;
  const css=document.createElement('link');
  css.rel='stylesheet';css.href='magic-theme.css?v=1';css.dataset.magicTheme='1';
  css.onload=()=>{
    if(document.querySelector('link[data-cardback-ui]')) return;
    const ui=document.createElement('link');
    ui.rel='stylesheet';ui.href='cardback-ui.css?v=1';ui.dataset.cardbackUi='1';
    ui.onload=()=>{
      if(document.querySelector('link[data-vault-ux]')) return;
      const ux=document.createElement('link');
      ux.rel='stylesheet';ux.href='ux-layout.css?v=2';ux.dataset.vaultUx='1';
      ux.onload=()=>{
        if(document.querySelector('link[data-cardback-reborn]')) return;
        const reborn=document.createElement('link');
        reborn.rel='stylesheet';reborn.href='cardback-reborn.css?v=1';reborn.dataset.cardbackReborn='1';
        reborn.onload=()=>{
          if(document.querySelector('link[data-cardback-refined]')) return;
          const refined=document.createElement('link');
          refined.rel='stylesheet';refined.href='cardback-refined.css?v=1';refined.dataset.cardbackRefined='1';
          refined.onload=()=>{
            if(document.querySelector('link[data-form-polish]')) return;
            const forms=document.createElement('link');
            forms.rel='stylesheet';forms.href='form-polish.css?v=1';forms.dataset.formPolish='1';
            document.head.appendChild(forms);
          };
          document.head.appendChild(refined);
        };
        document.head.appendChild(reborn);
      };
      document.head.appendChild(ux);
    };
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
