// One clean final layer; preserves layout rules but removes legacy decorative stacks.
(() => {
  const add=(href,key,onload)=>{if(document.querySelector(`link[${key}]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.setAttribute(key,'1');link.onload=onload;document.head.appendChild(link)};
  add('ux-layout.css?v=2','data-vault-ux',()=>add('clean-vault.css?v=1','data-clean-vault'));
})();
