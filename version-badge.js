(() => {
  const fallback={version:'0.4.0',channel:'beta',build:'2026.09.25-a'};
  async function loadVersion(){
    let info=fallback;
    try{
      const res=await fetch('version.json?ts='+Date.now(),{cache:'no-store'});
      if(res.ok) info={...fallback,...await res.json()};
    }catch{}
    const badge=document.getElementById('appVersion');
    if(badge){
      badge.textContent='v'+info.version+' '+info.channel;
      badge.title='Grand Line Vault v'+info.version+' '+info.channel+' · build '+info.build;
      badge.dataset.build=info.build;
    }
    document.documentElement.dataset.appVersion=info.version;
    window.GRAND_LINE_VAULT_VERSION=info;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadVersion);
  else loadVersion();
})();