// The Vault — scanner presentation layer. Keeps OCR logic untouched.
(() => {
  const q=(s,r=document)=>r.querySelector(s), esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const euro=new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'});
  const raw=q('#ocrText');
  if(!raw) return;

  const rich=document.createElement('div');
  rich.id='scanOutputRich';rich.className='scan-output-rich';
  raw.parentNode.insertBefore(rich,raw);
  raw.classList.add('scanner-raw-hidden');

  function firstMatch(text,re,fallback='—'){const m=String(text||'').match(re);return m?.[1]?.trim()||fallback}
  function likelyName(text){
    const blocks=['Naam OCR:','Name OCR:'];
    for(const b of blocks){
      const i=text.indexOf(b);if(i>=0){
        const lines=text.slice(i+b.length).split(/\n+/).map(x=>x.trim()).filter(Boolean);
        const hit=lines.find(x=>x.length>=3&&x.length<=60&&!/^(code|fallback|scanner|tijd|foil|codes?)/i.test(x));if(hit)return hit;
      }
    }
    return '—';
  }

  function renderSummary(){
    const text=raw.textContent||'';
    if(!text.trim()){rich.innerHTML='';return}
    const version=firstMatch(text,/(Scanner[^\n]*)/i,'Scanner');
    const time=firstMatch(text,/Tijd:\s*([^\n]+)/i,'—');
    const codes=firstMatch(text,/(?:Codes|One Piece codes):\s*([^\n]+)/i,'Geen zekere code');
    const foil=firstMatch(text,/(?:Foil|Foil-indicatie):\s*([^\n]+)/i,'Niet duidelijk');
    const name=likelyName(text);
    const hasCode=!/geen/i.test(codes)&&codes!=='—';
    const statusText=hasCode?'Kaartcode herkend':(name!=='—'?'Naam herkend':'Analyse klaar');
    rich.innerHTML=`<section class="scan-summary-card">
      <div class="scan-summary-head"><h4>Scanoverzicht</h4><span class="scan-summary-state">${esc(statusText)}</span></div>
      <div class="scan-summary-grid">
        <div class="scan-kv"><span>SCANNER</span><strong>${esc(version)}</strong></div>
        <div class="scan-kv"><span>SCANTIJD</span><strong>${esc(time)}</strong></div>
        <div class="scan-kv"><span>KAARTCODE</span><strong class="${hasCode?'gold':''}">${esc(codes)}</strong></div>
        <div class="scan-kv"><span>HERKENDE NAAM</span><strong>${esc(name)}</strong></div>
        <div class="scan-kv"><span>FOIL</span><strong>${esc(foil)}</strong></div>
      </div>
      <details class="scan-ocr-details"><summary>Technische OCR-details</summary><pre class="scan-ocr-raw">${esc(text)}</pre></details>
    </section>`;
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(renderSummary));
  observer.observe(raw,{childList:true,characterData:true,subtree:true});
  renderSummary();

  // Replace the old suggestion renderer with a more useful card-first layout.
  window.scanRender=function(items){
    const root=q('#scanResults');if(!root)return;
    const a=Array.isArray(items)?items:[];
    root.innerHTML=a.map((c,i)=>{
      const game=c.game==='One Piece TCG'?'ONE PIECE':'MAGIC';
      const gameClass=c.game==='One Piece TCG'?'op':'mtg';
      const price=Number(c.price||0);
      return `<article class="scan-suggestion ${i===0?'best-match':''}">
        <div class="scan-suggestion-art">${c.image?`<img src="${esc(c.image)}" alt="${esc(c.name)}">`:`<div class="preview-placeholder">${esc(String(c.name||'TCG').slice(0,3).toUpperCase())}</div>`}<span class="scan-suggestion-rank">${i===0?'BESTE MATCH':`MATCH ${i+1}`}</span></div>
        <div class="scan-suggestion-body">
          <div class="scan-suggestion-top"><h4>${esc(c.name)}</h4>${i===0?'<span class="scan-match-chip">AANBEVOLEN</span>':''}</div>
          <div class="scan-game-row"><span class="scan-meta-chip ${gameClass}">${game}</span>${c.foil?'<span class="scan-meta-chip foil">✦ FOIL VERMOED</span>':''}</div>
          <div class="scan-suggestion-info">
            <div><span>SET</span><strong>${esc(c.setName||'—')}</strong></div>
            <div><span>NUMMER</span><strong>${esc(c.cardNumber||'—')}</strong></div>
            <div><span>RARITY</span><strong>${esc(c.rarity||'—')}</strong></div>
            <div><span>WAARDE</span><strong>${price?euro.format(price):'—'}</strong></div>
          </div>
          <div class="scan-suggestion-actions"><button class="primary-btn" data-sfill="${i}">Bekijk & bewerk</button><button class="ghost-btn" data-sadd="${i}">Direct toevoegen</button></div>
        </div>
      </article>`;
    }).join('');
    root.querySelectorAll('[data-sfill]').forEach(b=>b.onclick=()=>{if(typeof fill==='function')fill(a[+b.dataset.sfill])});
    root.querySelectorAll('[data-sadd]').forEach(b=>b.onclick=()=>{const c=a[+b.dataset.sadd];if(typeof add==='function')add(c);if(typeof toast==='function')toast(c.foil?'Foil-kaart toegevoegd.':'Kaart toegevoegd.')});
  };
})();
