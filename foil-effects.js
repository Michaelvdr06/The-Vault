// The Vault — smooth 3D tilt + finish-aware foil rendering
(() => {
  const cardEl = document.getElementById('tiltCard');
  const modal = document.getElementById('cardModal');
  if(!cardEl || !modal) return;

  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  let targetMX = 50, targetMY = 50, currentMX = 50, currentMY = 50;
  let dragging = false;
  let raf = 0;
  let finishRequest = 0;

  function setMaterial(mode){
    cardEl.classList.remove('foil-standard','foil-etched','foil-prismatic');
    if(mode) cardEl.classList.add(`foil-${mode}`);
  }

  async function exactPrintingForOpenCard(){
    try{
      if(typeof modalCardId === 'undefined' || !modalCardId || typeof cards === 'undefined') return null;
      const c = cards.find(x=>x.id===modalCardId);
      if(!c || c.game !== 'Magic: The Gathering') return null;
      const name = String(c.name||'').replace(/"/g,'').trim();
      const cn = String(c.cardNumber||'').trim();
      if(!name) return null;
      const terms = [`!\"${name}\"`];
      if(cn) terms.push(`cn:${cn}`);
      const r = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(terms.join(' '))}`);
      const d = await r.json();
      if(!r.ok || !Array.isArray(d.data) || !d.data.length) return null;
      return d.data.find(x=>String(x.set_name||'').toLowerCase()===String(c.setName||'').toLowerCase()) || d.data[0];
    } catch { return null; }
  }

  async function syncMaterial(){
    const seq = ++finishRequest;
    let c = null;
    try{
      if(typeof modalCardId !== 'undefined' && modalCardId && typeof cards !== 'undefined') c = cards.find(x=>x.id===modalCardId);
    }catch{}
    if(!c || !c.foil){ setMaterial(null); return; }
    if(c.game !== 'Magic: The Gathering') { setMaterial('prismatic'); return; }
    setMaterial('standard');
    const p = await exactPrintingForOpenCard();
    if(seq !== finishRequest || !p) return;
    const finishes = Array.isArray(p.finishes) ? p.finishes : [];
    if(finishes.includes('etched') && !finishes.includes('foil')) setMaterial('etched');
    else setMaterial('standard');
  }

  function animate(){
    const ease = dragging ? 0.18 : 0.11;
    currentX += (targetX-currentX)*ease;
    currentY += (targetY-currentY)*ease;
    currentMX += (targetMX-currentMX)*0.16;
    currentMY += (targetMY-currentMY)*0.16;

    if(Math.abs(targetX-currentX)<0.01) currentX=targetX;
    if(Math.abs(targetY-currentY)<0.01) currentY=targetY;
    if(Math.abs(targetMX-currentMX)<0.05) currentMX=targetMX;
    if(Math.abs(targetMY-currentMY)<0.05) currentMY=targetMY;

    cardEl.style.setProperty('--rx',`${currentY.toFixed(3)}deg`);
    cardEl.style.setProperty('--ry',`${currentX.toFixed(3)}deg`);
    cardEl.style.setProperty('--mx',`${currentMX.toFixed(2)}%`);
    cardEl.style.setProperty('--my',`${currentMY.toFixed(2)}%`);
    cardEl.style.setProperty('--foil-angle',`${(110 + currentX*2.2 - currentY*1.4).toFixed(1)}deg`);

    raf=requestAnimationFrame(animate);
  }

  function targetFromPointer(e){
    const r=cardEl.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
    targetX=(x-.5)*22;
    targetY=(.5-y)*22;
    targetMX=x*100;
    targetMY=y*100;
  }

  function onDown(e){
    dragging=true;
    try{ cardEl.setPointerCapture(e.pointerId); }catch{}
    targetFromPointer(e);
  }
  function onMove(e){
    if(!dragging && e.pointerType!=='mouse') return;
    if(e.pointerType==='mouse' || dragging) targetFromPointer(e);
  }
  function release(e){
    dragging=false;
    targetX=0; targetY=0; targetMX=50; targetMY=50;
    try{ if(e?.pointerId!=null) cardEl.releasePointerCapture(e.pointerId); }catch{}
  }

  // Capture + stopImmediatePropagation blocks the old direct tilt handler so only this smoother engine drives the card.
  ['pointerdown','pointermove','pointerup','pointercancel'].forEach(type=>{
    cardEl.addEventListener(type,e=>{
      if(type==='pointerdown') onDown(e);
      else if(type==='pointermove') onMove(e);
      else release(e);
      e.stopImmediatePropagation();
    },true);
  });
  cardEl.addEventListener('pointerleave',e=>{ if(!dragging) release(e); e.stopImmediatePropagation(); },true);

  const observer = new MutationObserver(()=>{
    if(!modal.classList.contains('hidden')){
      release();
      syncMaterial();
    }
  });
  observer.observe(modal,{attributes:true,attributeFilter:['class']});

  const foilButton=document.getElementById('toggleFoilBtn');
  foilButton?.addEventListener('click',()=>setTimeout(syncMaterial,60));

  // Use device orientation as an optional subtle motion source when inspector is open and user is not touching.
  window.addEventListener('deviceorientation',e=>{
    if(dragging || modal.classList.contains('hidden') || e.beta==null || e.gamma==null) return;
    const gx=Math.max(-12,Math.min(12,e.gamma));
    const gy=Math.max(-12,Math.min(12,e.beta-45));
    targetX=gx*.32;
    targetY=-gy*.24;
    targetMX=50+gx*1.2;
    targetMY=50+gy*.9;
  },{passive:true});

  cancelAnimationFrame(raf);
  animate();
})();
