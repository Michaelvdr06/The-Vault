// The Vault — vivid 3D tilt + motion-only holo glitter
(() => {
  const cardEl = document.getElementById('tiltCard');
  const modal = document.getElementById('cardModal');
  if(!cardEl || !modal) return;

  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
  let targetMX = 50, targetMY = 50, currentMX = 50, currentMY = 50;
  let dragging = false;
  let raf = 0;
  let finishRequest = 0;
  let lastX = 0, lastY = 0, lastMX = 50, lastMY = 50;
  let motionEnergy = 0;

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

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }

  function animate(){
    const ease = dragging ? 0.24 : 0.13;
    currentX += (targetX-currentX)*ease;
    currentY += (targetY-currentY)*ease;
    currentMX += (targetMX-currentMX)*0.24;
    currentMY += (targetMY-currentMY)*0.24;

    if(Math.abs(targetX-currentX)<0.01) currentX=targetX;
    if(Math.abs(targetY-currentY)<0.01) currentY=targetY;
    if(Math.abs(targetMX-currentMX)<0.05) currentMX=targetMX;
    if(Math.abs(targetMY-currentMY)<0.05) currentMY=targetMY;

    cardEl.style.setProperty('--rx',`${currentY.toFixed(3)}deg`);
    cardEl.style.setProperty('--ry',`${currentX.toFixed(3)}deg`);
    cardEl.style.setProperty('--mx',`${currentMX.toFixed(2)}%`);
    cardEl.style.setProperty('--my',`${currentMY.toFixed(2)}%`);

    // Keep the vivid v10 hue behaviour, but reduce edge translation so the colour field never leaves the card.
    const foilAngle = 100 + currentX*7.2 - currentY*5.8;
    const edgeX = (currentMX - 50) * -0.20;
    const edgeY = (currentMY - 50) * -0.17;
    const hue = clamp(currentX*6.2 - currentY*4.7,-105,105);
    const prismX = clamp(50 + (currentMX-50)*0.72 - currentY*0.65,8,92);
    const prismY = clamp(50 + (currentMY-50)*0.72 + currentX*0.55,8,92);

    cardEl.style.setProperty('--foil-angle',`${foilAngle.toFixed(1)}deg`);
    cardEl.style.setProperty('--edge-x',`${edgeX.toFixed(2)}%`);
    cardEl.style.setProperty('--edge-y',`${edgeY.toFixed(2)}%`);
    cardEl.style.setProperty('--holo-hue',`${hue.toFixed(1)}deg`);
    cardEl.style.setProperty('--prism-x',`${prismX.toFixed(2)}%`);
    cardEl.style.setProperty('--prism-y',`${prismY.toFixed(2)}%`);

    // Glitter reacts to ACTUAL frame-to-frame movement only. No clock/time animation at rest.
    const frameMotion =
      Math.abs(currentX-lastX) + Math.abs(currentY-lastY) +
      (Math.abs(currentMX-lastMX) + Math.abs(currentMY-lastMY)) * 0.07;

    motionEnergy = Math.max(frameMotion * 1.8, motionEnergy * 0.72);
    if(frameMotion < 0.015 && !dragging) motionEnergy *= 0.55;
    if(frameMotion < 0.006) motionEnergy *= 0.35;

    const sparkleAlpha = clamp((motionEnergy - 0.02) * 1.15, 0, 0.92);
    cardEl.style.setProperty('--sparkle-alpha',sparkleAlpha.toFixed(3));

    // Glitter positions are derived only from card position/tilt, so they freeze when the card freezes.
    const px = currentMX - 50;
    const py = currentMY - 50;
    const tx = currentX;
    const ty = currentY;
    const pts = [
      [62 + px*.50 + ty*.34, 34 + py*.36 - tx*.22],
      [37 + px*.28 - ty*.42, 64 + py*.48 + tx*.20],
      [73 + px*.36 + tx*.25, 72 + py*.30 - ty*.28],
      [27 + px*.43 - tx*.18, 28 + py*.34 + ty*.30],
      [83 + px*.24 + ty*.25, 47 + py*.54 - tx*.16],
      [18 + px*.32 - ty*.22, 53 + py*.27 + tx*.24],
      [55 + px*.56 + tx*.18, 18 + py*.22 - ty*.20],
      [45 + px*.20 - tx*.28, 84 + py*.42 + ty*.18]
    ];

    pts.forEach((p,i)=>{
      cardEl.style.setProperty(`--s${i+1}x`,`${clamp(p[0],3,97).toFixed(2)}%`);
      cardEl.style.setProperty(`--s${i+1}y`,`${clamp(p[1],3,97).toFixed(2)}%`);
    });

    lastX=currentX; lastY=currentY; lastMX=currentMX; lastMY=currentMY;
    raf=requestAnimationFrame(animate);
  }

  function targetFromPointer(e){
    const r=cardEl.getBoundingClientRect();
    const x=clamp((e.clientX-r.left)/r.width,0,1);
    const y=clamp((e.clientY-r.top)/r.height,0,1);
    targetX=(x-.5)*31;
    targetY=(.5-y)*31;
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
      motionEnergy=0;
      cardEl.style.setProperty('--sparkle-alpha','0');
      release();
      syncMaterial();
    }
  });
  observer.observe(modal,{attributes:true,attributeFilter:['class']});

  const foilButton=document.getElementById('toggleFoilBtn');
  foilButton?.addEventListener('click',()=>setTimeout(syncMaterial,60));

  window.addEventListener('deviceorientation',e=>{
    if(dragging || modal.classList.contains('hidden') || e.beta==null || e.gamma==null) return;
    const gx=clamp(e.gamma,-20,20);
    const gy=clamp(e.beta-45,-20,20);
    targetX=gx*.62;
    targetY=-gy*.50;
    targetMX=50+gx*2.25;
    targetMY=50+gy*1.85;
  },{passive:true});

  cancelAnimationFrame(raf);
  animate();
})();
