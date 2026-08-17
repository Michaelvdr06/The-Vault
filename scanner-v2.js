// The Vault — stronger OCR scanner: One Piece code-first, deskew sweeps, multi-zone recognition
(() => {
  const byId = id => document.getElementById(id);
  const scanButton = byId('scanBtn');
  if(!scanButton || typeof Tesseract === 'undefined') return;

  const ANGLES = [-18,-12,-6,0,6,12,18];

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file), img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=e=>{URL.revokeObjectURL(url);reject(e)};
      img.src=url;
    });
  }

  function drawRotated(img,deg,maxSide=1500){
    const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
    const sw=Math.max(1,Math.round(img.naturalWidth*scale));
    const sh=Math.max(1,Math.round(img.naturalHeight*scale));
    const rad=deg*Math.PI/180, cs=Math.abs(Math.cos(rad)), sn=Math.abs(Math.sin(rad));
    const w=Math.ceil(sw*cs+sh*sn), h=Math.ceil(sw*sn+sh*cs);
    const c=document.createElement('canvas'); c.width=w; c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.fillStyle='#fff';x.fillRect(0,0,w,h);x.translate(w/2,h/2);x.rotate(rad);x.drawImage(img,-sw/2,-sh/2,sw,sh);
    return c;
  }

  function enhanceCanvas(src,strong=false){
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;
    const contrast=strong?2.15:1.52;
    for(let i=0;i<d.length;i+=4){
      let g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      let v=(g-128)*contrast+128;
      if(strong){
        if(v>205)v=255; else if(v<58)v=0;
      }
      v=Math.max(0,Math.min(255,v));d[i]=d[i+1]=d[i+2]=v;
    }
    x.putImageData(im,0,0);return c;
  }

  function crop(src,x0,y0,wf,hf){
    const x=Math.max(0,Math.round(src.width*x0)), y=Math.max(0,Math.round(src.height*y0));
    const w=Math.max(1,Math.min(src.width-x,Math.round(src.width*wf)));
    const h=Math.max(1,Math.min(src.height-y,Math.round(src.height*hf)));
    const c=document.createElement('canvas');c.width=w;c.height=h;
    c.getContext('2d').drawImage(src,x,y,w,h,0,0,w,h);return c;
  }

  function contactSheet(canvases,targetWidth=1000){
    const scaled=canvases.map(c=>({c,s:Math.min(1,targetWidth/c.width)}));
    const widths=scaled.map(o=>Math.max(1,Math.round(o.c.width*o.s)));
    const heights=scaled.map(o=>Math.max(1,Math.round(o.c.height*o.s)));
    const out=document.createElement('canvas');out.width=Math.max(...widths);out.height=heights.reduce((a,b)=>a+b,0);
    const x=out.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);
    let y=0;scaled.forEach((o,i)=>{x.drawImage(o.c,0,y,widths[i],heights[i]);y+=heights[i]});return out;
  }

  function digitFix(s){return String(s||'').toUpperCase().replace(/[OQD]/g,'0').replace(/[IL|]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2')}

  function extractOpCodes(text){
    const up=String(text||'').toUpperCase().replace(/[‐‑‒–—]/g,'-');
    const out=new Set();
    const re=/(OP|0P|ST|EB|PRB|PR|P)\s*([0-9OQDIL|SBZ]{1,2})\s*[-:]?\s*([0-9OQDIL|SBZ]{3})/g;
    let m;
    while((m=re.exec(up))){
      let pre=m[1]==='0P'?'OP':m[1], set=digitFix(m[2]), num=digitFix(m[3]);
      if(/^\d{1,2}$/.test(set)&&/^\d{3}$/.test(num)){
        if(pre==='OP'||pre==='ST'||pre==='EB') set=set.padStart(2,'0');
        out.add(`${pre}${set}-${num}`);
      }
    }
    // Also run the app's own parser over likely token fragments.
    if(typeof opCode==='function'){
      for(const token of up.split(/\s+/)){
        const c=opCode(token);if(c)out.add(c);
      }
    }
    return [...out];
  }

  async function recognize(canvas,label,status,opts={}){
    status.textContent=label;
    const res=await Tesseract.recognize(canvas,'eng',{
      logger:m=>{if(m.status==='recognizing text'&&m.progress!=null)status.textContent=`${label} ${Math.round(m.progress*100)}%`},
      ...opts
    });
    return res?.data?.text||'';
  }

  function bestNameLines(text){
    return [...new Set(String(text||'').split(/\n+/).map(s=>String(s).replace(/[^A-Za-z0-9À-ÿ'’().,:&+\- ]/g,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&s.length<=55&&/[A-Za-z]/.test(s)))];
  }

  async function enhancedScan(){
    const status=byId('scanStatus'), output=byId('ocrText'), results=byId('scanResults');
    if(typeof scanFile==='undefined'||!scanFile){status.textContent='Upload eerst een foto.';return}
    results.innerHTML='';output.textContent='Scanner v2 draait…';
    scanButton.disabled=true;
    try{
      const img=await loadImage(scanFile);
      if(typeof foilEstimate==='function') scanFoil=foilEstimate(img);

      // 1) One Piece: rotate/deskew several ways and OCR the lower half where card number + name usually live.
      const rotations=ANGLES.map(a=>drawRotated(img,a));
      const lowerZones=rotations.map(c=>enhanceCanvas(crop(c,.02,.58,.96,.40),true));
      const codeSheet=contactSheet(lowerZones,1050);
      const codeText=await recognize(codeSheet,'Kaartcode zoeken…',status);
      let codes=extractOpCodes(codeText);

      // 2) If a code is found, trust it before fuzzy name OCR.
      let found=[];
      for(const code of codes.slice(0,6)){
        try{
          const card=typeof one==='function'?await one(code):null;
          if(card){found.push(card);break}
        }catch{}
      }

      // 3) Fallback: OCR a readable full image plus top/bottom title zones after light deskew.
      let fullText='', zoneText='';
      if(!found.length){
        const base=enhanceCanvas(rotations[3],false);
        fullText=await recognize(base,'Volledige kaart lezen…',status);
        codes=[...new Set([...codes,...extractOpCodes(fullText)])];
        for(const code of codes.slice(0,6)){
          try{const card=typeof one==='function'?await one(code):null;if(card){found.push(card);break}}catch{}
        }
      }

      if(!found.length){
        const titleZones=[];
        rotations.forEach(c=>{
          titleZones.push(enhanceCanvas(crop(c,.04,.00,.92,.30),true));
          titleZones.push(enhanceCanvas(crop(c,.04,.67,.92,.30),true));
        });
        zoneText=await recognize(contactSheet(titleZones,1050),'Naamzones vergelijken…',status);

        // Magic + final generic fallback via existing detector.
        const lines=bestNameLines(`${zoneText}\n${fullText}`);
        if(typeof detect==='function'){
          try{found=await detect(`${codeText}\n${zoneText}\n${fullText}`,lines[0]||'')}catch{}
        }
        if(!found.length&&typeof magic==='function'){
          for(const line of lines.slice(0,10)){
            try{const m=(await magic(line))[0];if(m&&(!sim||sim(line,m.name)>=.62)){found=[m];break}}catch{}
          }
        }
      }

      found=(found||[]).map(c=>({...c,foil:!!(scanFoil||c.foil)}));
      output.textContent=[
        `Scanner v2`,
        `One Piece codes: ${codes.length?codes.join(', '):'geen'}`,
        `Foil-indicatie: ${scanFoil?'mogelijk foil':'geen duidelijke foil'}`,
        '',
        'Code-zone OCR:',codeText.trim()||'—',
        zoneText?`\nNaamzones OCR:\n${zoneText.trim()}`:'',
        fullText?`\nVolledige OCR:\n${fullText.trim()}`:''
      ].filter(Boolean).join('\n');

      if(found.length){
        if(typeof scanRender==='function')scanRender(found);
        status.textContent=`${found.length} kaart${found.length===1?'':'en'} gevonden${codes.length?' · kaartcode herkend':''}${scanFoil?' · foil-effect vermoed':''}.`;
      }else status.textContent='Nog geen zekere match. Probeer de kaart iets rechter en zorg dat kaartnummer en naam scherp zijn.';
    }catch(err){
      console.error('Scanner v2 failed',err);status.textContent='Scannen mislukt. Probeer een scherpere foto.';output.textContent=`Scanner v2 fout: ${err?.message||err}`;
    }finally{scanButton.disabled=false}
  }

  // Replace the old handler after app.js init attached it.
  scanButton.onclick=enhancedScan;
  window.enhancedVaultScan=enhancedScan;
})();
