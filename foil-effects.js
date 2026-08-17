// The Vault — smooth 3D tilt + highly reactive foil/glitter rendering
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

  function animate(now=0){
    const ease = dragging ? 0.22 : 0.12;
    currentX += (targetX-currentX)*ease;
    currentY += (targetY-currentY)*ease;
    currentMX += (targetMX-currentMX)*0.22;
    currentMY += (targetMY-currentMY)*0.22;

    if(Math.abs(targetX-currentX)<0.01) currentX=targetX;
    if(Math.abs(targetY-currentY)<0.01) currentY=targetY;
    if(Math.abs(targetMX-currentMX)<0.05) currentMX=targetMX;
    if(Math.abs(targetMY-currentMY)<0.05) currentMY=targetMY;

    cardEl.style.setProperty('--rx',`${currentY.toFixed(3)}deg`);
    cardEl.style.setProperty('--ry',`${currentX.toFixed(3)}deg`);
    cardEl.style.setProperty('--mx',`${currentMX.toFixed(2)}%`);
    cardEl.style.setProperty('--my',`${currentMY.toFixed(2)}%`);

    const foilAngle = 105 + currentX*5.2 - currentY*4.0;
    const edgeX = (currentMX - 50) * -0.32;
    const edgeY = (currentMY - 50) * -0.27;
    const hue = Math.max(-38, Math.min(38, currentX*2.5 - currentY*1.8));

    cardEl.style.setProperty('--foil-angle',`${foilAngle.toFixed(1)}deg`);
    cardEl.style.setProperty('--edge-x',`${edgeX.toFixed(2)}%`);
    cardEl.style.setProperty('--edge-y',`${edgeY.toFixed(2)}%`);
    cardEl.style.setProperty('--holo-hue',`${hue.toFixed(1)}deg`);

    const t = now * 0.0045;
    const motion = Math.min(1, (Math.abs(currentX)+Math.abs(currentY))/20);
    const sparklePulse = 0.42 + 0.42*Math.sin(t*1.7) + motion*0.30;
    cardEl.style.setProperty('--sparkle-alpha',`${Math.max(.20,Math.min(.95,sparklePulse)).toFixed(2)}`);

    const s1x = currentMX + 12 + Math.sin(t)*7;
    const s1y = currentMY - 14 + Math.cos(t*1.25)*6;
    const s2x = currentMX - 15 + Math.cos(t*.83)*8;
    const s2y = currentMY + 10 + Math.sin(t*1.31)*7;
    const s3x = currentMX + 7 + Math.sin(t*.71+1.4)*10;
    const s3y = currentMY + 17 + Math.cos(t*.92+0.7)*6;
    const s4x = currentMX - 8 + Math.cos(t*.62+2.2)*9;
    const s4y = currentMY - 18 + Math.sin(t*.88+1.1)*7;

    const clamp = v => Math.max(4,Math.min(96,v));
    cardEl.style.setProperty('--s1x',`${clamp(s1x).toFixed(2)}%`);
    cardEl.style.setProperty('--s1y',`${clamp(s1y).toFixed(2)}%`);
    cardEl.style.setProperty('--s2x',`${clamp(s2x).toFixed(2)}%`);
    cardEl.style.setProperty('--s2y',`${clamp(s2y).toFixed(2)}%`);
    cardEl.style.setProperty('--s3x',`${clamp(s3x).toFixed(2)}%`);
    cardEl.style.setProperty('--s3y',`${clamp(s3y).toFixed(2)}%`);
    cardEl.style.setProperty('--s4x',`${clamp(s4x).toFixed(2)}%`);
    cardEl.style.setProperty('--s4y',`${clamp(s4y).toFixed(2)}%`);

    raf=requestAnimationFrame(animate);
  }

  function targetFromPointer(e){
    const r=cardEl.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
    targetX=(x-.5)*27;
    targetY=(.5-y)*27;
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

  window.addEventListener('deviceorientation',e=>{
    if(dragging || modal.classList.contains('hidden') || e.beta==null || e.gamma==null) return;
    const gx=Math.max(-18,Math.min(18,e.gamma));
    const gy=Math.max(-18,Math.min(18,e.beta-45));
    targetX=gx*.52;
    targetY=-gy*.40;
    targetMX=50+gx*2.05;
    targetMY=50+gy*1.60;
  },{passive:true});

  cancelAnimationFrame(raf);
  animate();
})();
