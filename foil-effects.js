// The Vault — vivid 3D tilt + strongly reactive holo/glitter rendering
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

    // Much larger movement range: the hue can travel through almost half the spectrum.
    const foilAngle = 100 + currentX*7.2 - currentY*5.8;
    const edgeX = (currentMX - 50) * -0.48;
    const edgeY = (currentMY - 50) * -0.40;
    const hue = Math.max(-105, Math.min(105, currentX*6.2 - currentY*4.7));
    const prismX = Math.max(8, Math.min(92, 50 + (currentMX-50)*0.72 - currentY*0.65));
    const prismY = Math.max(8, Math.min(92, 50 + (currentMY-50)*0.72 + currentX*0.55));

    cardEl.style.setProperty('--foil-angle',`${foilAngle.toFixed(1)}deg`);
    cardEl.style.setProperty('--edge-x',`${edgeX.toFixed(2)}%`);
    cardEl.style.setProperty('--edge-y',`${edgeY.toFixed(2)}%`);
    cardEl.style.setProperty('--holo-hue',`${hue.toFixed(1)}deg`);
    cardEl.style.setProperty('--prism-x',`${prismX.toFixed(2)}%`);
    cardEl.style.setProperty('--prism-y',`${prismY.toFixed(2)}%`);

    const t = now * 0.0062;
    const speed = Math.min(1, (Math.abs(currentX-targetX)+Math.abs(currentY-targetY))/8 + (Math.abs(currentX)+Math.abs(currentY))/25);
    const sparklePulse = 0.34 + 0.30*Math.sin(t*2.1) + 0.22*Math.sin(t*4.7+1.2) + speed*0.42;
    cardEl.style.setProperty('--sparkle-alpha',`${Math.max(.18,Math.min(1,sparklePulse)).toFixed(2)}`);

    // Eight glitter points all travel at different speeds/directions.
    const clamp = v => Math.max(3,Math.min(97,v));
    const pts = [
      [currentMX + 15 + Math.sin(t)*12, currentMY - 15 + Math.cos(t*1.37)*9],
      [currentMX - 18 + Math.cos(t*.91)*13, currentMY + 12 + Math.sin(t*1.53)*10],
      [currentMX + 9 + Math.sin(t*.73+1.4)*15, currentMY + 19 + Math.cos(t*1.08+.7)*9],
      [currentMX - 10 + Math.cos(t*.66+2.2)*14, currentMY - 20 + Math.sin(t*1.12+1.1)*10],
      [50 + Math.sin(t*1.42+2.6)*34 + currentX*.6, 50 + Math.cos(t*.92+.4)*27 - currentY*.5],
      [50 + Math.cos(t*1.17+.8)*31 - currentX*.55, 50 + Math.sin(t*1.64+1.9)*30 + currentY*.45],
      [50 + Math.sin(t*.82+4.1)*25 + currentY*.4, 50 + Math.sin(t*1.91+.3)*34 + currentX*.35],
      [50 + Math.cos(t*1.58+3.2)*29 - currentY*.35, 50 + Math.cos(t*.76+2.5)*32 - currentX*.4]
    ];
    pts.forEach((p,i)=>{
      cardEl.style.setProperty(`--s${i+1}x`,`${clamp(p[0]).toFixed(2)}%`);
      cardEl.style.setProperty(`--s${i+1}y`,`${clamp(p[1]).toFixed(2)}%`);
    });

    raf=requestAnimationFrame(animate);
  }

  function targetFromPointer(e){
    const r=cardEl.getBoundingClientRect();
    const x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    const y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
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
      release();
      syncMaterial();
    }
  });
  observer.observe(modal,{attributes:true,attributeFilter:['class']});

  const foilButton=document.getElementById('toggleFoilBtn');
  foilButton?.addEventListener('click',()=>setTimeout(syncMaterial,60));

  window.addEventListener('deviceorientation',e=>{
    if(dragging || modal.classList.contains('hidden') || e.beta==null || e.gamma==null) return;
    const gx=Math.max(-20,Math.min(20,e.gamma));
    const gy=Math.max(-20,Math.min(20,e.beta-45));
    targetX=gx*.62;
    targetY=-gy*.50;
    targetMX=50+gx*2.25;
    targetMY=50+gy*1.85;
  },{passive:true});

  cancelAnimationFrame(raf);
  animate();
})();
