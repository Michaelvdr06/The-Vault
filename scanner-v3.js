// The Vault — Scanner v3: multi-angle, multi-zone, code-first OCR tuned for phones
(() => {
  const $ = id => document.getElementById(id);
  const btn = $('scanBtn');
  if(!btn || typeof Tesseract === 'undefined') return;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const DESKEW=[-24,-16,-8,0,8,16,24];
  const ORIENT=[0,90,-90,180];

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const u=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};
      img.onerror=e=>{URL.revokeObjectURL(u);reject(e)};
      img.src=u;
    });
  }

  function rotateImage(img,deg,maxSide=1700){
    const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight));
    const sw=Math.max(1,Math.round(img.naturalWidth*scale));
    const sh=Math.max(1,Math.round(img.naturalHeight*scale));
    const r=deg*Math.PI/180,cs=Math.abs(Math.cos(r)),sn=Math.abs(Math.sin(r));
    const w=Math.ceil(sw*cs+sh*sn),h=Math.ceil(sw*sn+sh*cs);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});
    x.fillStyle='#fff';x.fillRect(0,0,w,h);x.translate(w/2,h/2);x.rotate(r);x.drawImage(img,-sw/2,-sh/2,sw,sh);
    return c;
  }

  function crop(src,x,y,w,h){
    const sx=Math.round(src.width*x),sy=Math.round(src.height*y);
    const sw=Math.max(1,Math.min(src.width-sx,Math.round(src.width*w)));
    const sh=Math.max(1,Math.min(src.height-sy,Math.round(src.height*h)));
    const c=document.createElement('canvas');c.width=sw;c.height=sh;
    c.getContext('2d').drawImage(src,sx,sy,sw,sh,0,0,sw,sh);return c;
  }

  function prep(src,mode='contrast'){
    const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0);
    const im=x.getImageData(0,0,c.width,c.height),d=im.data;
    for(let i=0;i<d.length;i+=4){
      const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      let v;
      if(mode==='threshold') v=g>148?255:0;
      else if(mode==='soft') v=(g-128)*1.34+128;
      else v=(g-128)*1.82+128;
      v=clamp(v,0,255);d[i]=d[i+1]=d[i+2]=v;
    }
    x.putImageData(im,0,0);return c;
  }

  function sheet(items,width=1080,gap=12){
    const arr=items.filter(Boolean).map(c=>({c,s:Math.min(1,width/c.width)}));
    if(!arr.length){const c=document.createElement('canvas');c.width=10;c.height=10;return c}
    const ws=arr.map(o=>Math.round(o.c.width*o.s)),hs=arr.map(o=>Math.round(o.c.height*o.s));
    const out=document.createElement('canvas');out.width=Math.max(...ws);out.height=hs.reduce((a,b)=>a+b,0)+gap*(arr.length-1);
    const x=out.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);
    let y=0;arr.forEach((o,i)=>{x.drawImage(o.c,0,y,ws[i],hs[i]);y+=hs[i]+gap});return out;
  }

  function fixDigits(s){return String(s||'').toUpperCase().replace(/[OQD]/g,'0').replace(/[IL|!]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2')}
  function normalizeCode(raw){
    const up=String(raw||'').toUpperCase().replace(/[‐‑‒–—_]/g,'-').replace(/\s+/g,'');
    let m=up.match(/(OP|0P|ST|5T|EB|E8|PRB|PR|P)([0-9OQDIL|!SBZ]{1,2})[-:]?([0-9OQDIL|!SBZ]{3})/);
    if(!m)return'';
    let pre=m[1].replace(/^0P$/,'OP').replace(/^5T$/,'ST').replace(/^E8$/,'EB');
    let set=fixDigits(m[2]),num=fixDigits(m[3]);
    if(!/^\d{1,2}$/.test(set)||!/^\d{3}$/.test(num))return'';
    if(['OP','ST','EB'].includes(pre))set=set.padStart(2,'0');
    return `${pre}${set}-${num}`;
  }
  function extractCodes(text){
    const src=String(text||'').toUpperCase().replace(/[‐‑‒–—_]/g,'-');
    const out=new Set();
    const rough=src.match(/(?:OP|0P|ST|5T|EB|E8|PRB|PR|P)[\s\-_:]*[0-9OQDIL|!SBZ]{1,2}[\s\-_:]*[0-9OQDIL|!SBZ]{3}/g)||[];
    rough.forEach(x=>{const c=normalizeCode(x);if(c)out.add(c)});
    if(typeof opCode==='function') for(const t of src.split(/\s+/)){const c=opCode(t);if(c)out.add(c)}
    return [...out];
  }

  function lines(text){
    return [...new Set(String(text||'').split(/\n+/).map(s=>s.replace(/[^A-Za-z0-9À-ÿ'’().,:&+\- ]/g,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&s.length<=62&&/[A-Za-z]/.test(s)))];
  }

  async function ocr(canvas,label,status,psm=6){
    const res=await Tesseract.recognize(canvas,'eng',{
      logger:m=>{if(m.status==='recognizing text'&&m.progress!=null)status.textContent=`${label} ${Math.round(m.progress*100)}%`},
      tessedit_pageseg_mode:String(psm),
      preserve_interword_spaces:'1'
    });
    return res?.data?.text||'';
  }

  async function lookupCode(codes){
    for(const code of codes.slice(0,10)){
      try{const c=typeof one==='function'?await one(code):null;if(c)return c}catch{}
    }
    return null;
  }

  async function scanV3(){
    const status=$('scanStatus'),out=$('ocrText'),results=$('scanResults');
    if(typeof scanFile==='undefined'||!scanFile){status.textContent='Upload eerst een foto.';return}
    btn.disabled=true;results.innerHTML='';out.textContent='Scanner v3 voorbereiden…';
    try{
      const img=await loadImage(scanFile);
      if(typeof foilEstimate==='function')scanFoil=foilEstimate(img);

      // Stage 1: deskewed bottom/right-heavy regions where TCG codes commonly live.
      const desk=DESKEW.map(a=>rotateImage(img,a));
      const codeZones=[];
      desk.forEach(c=>{
        const zones=[crop(c,.00,.55,1,.45),crop(c,.42,.60,.58,.40),crop(c,.00,.68,1,.32),crop(c,.58,.70,.42,.30)];
        zones.forEach(z=>{codeZones.push(prep(z,'contrast'));codeZones.push(prep(z,'threshold'))});
      });
      let codeText=await ocr(sheet(codeZones,1120,8),'Kaartcode zoeken…',status,11);
      let codes=extractCodes(codeText);
      let found=await lookupCode(codes);

      // Stage 2: orientation fallback (portrait/landscape/upside-down) if code OCR failed.
      let orientText='';
      if(!found){
        const orientZones=[];
        ORIENT.forEach(a=>{
          const c=rotateImage(img,a,1550);
          [crop(c,0,.00,1,.28),crop(c,0,.68,1,.32),crop(c,.48,.55,.52,.45)].forEach(z=>orientZones.push(prep(z,'contrast')));
        });
        orientText=await ocr(sheet(orientZones,1100,10),'Oriëntatie controleren…',status,11);
        codes=[...new Set([...codes,...extractCodes(orientText)])];
        found=await lookupCode(codes);
      }

      // Stage 3: name OCR, using both soft and high-contrast title strips.
      let nameText='';
      if(!found){
        const nameZones=[];
        [...desk,rotateImage(img,90),rotateImage(img,-90)].forEach(c=>{
          [crop(c,.02,.00,.96,.25),crop(c,.02,.72,.96,.28)].forEach(z=>{nameZones.push(prep(z,'soft'));nameZones.push(prep(z,'contrast'))});
        });
        nameText=await ocr(sheet(nameZones,1120,10),'Kaartnaam zoeken…',status,7);
      }

      // Stage 4: one full-card OCR pass only, keeping phone performance reasonable.
      let fullText='';
      if(!found){
        fullText=await ocr(prep(rotateImage(img,0,1500),'soft'),'Laatste controle…',status,6);
        codes=[...new Set([...codes,...extractCodes(fullText)])];
        found=await lookupCode(codes);
      }

      let matches=found?[found]:[];
      if(!matches.length&&typeof detect==='function'){
        const all=`${codeText}\n${orientText}\n${nameText}\n${fullText}`;
        const candidateLines=lines(`${nameText}\n${fullText}`);
        for(const title of candidateLines.slice(0,5)){
          try{const a=await detect(all,title);if(a?.length){matches=a;break}}catch{}
        }
        if(!matches.length){try{matches=await detect(all,candidateLines[0]||'')}catch{}}
      }

      matches=(matches||[]).slice(0,8).map(c=>({...c,foil:!!(scanFoil||c.foil)}));
      out.textContent=[
        'Scanner v3',
        `One Piece codes: ${codes.length?codes.join(', '):'geen zekere code'}`,
        `Foil-indicatie: ${scanFoil?'mogelijk foil':'geen duidelijke foil'}`,
        '',
        'Code OCR:',codeText.trim()||'—',
        orientText?`\nOriëntatie OCR:\n${orientText.trim()}`:'',
        nameText?`\nNaam OCR:\n${nameText.trim()}`:'',
        fullText?`\nFull OCR:\n${fullText.trim()}`:''
      ].filter(Boolean).join('\n');

      if(matches.length){
        if(typeof scanRender==='function')scanRender(matches);
        status.textContent=`${matches.length} kaart${matches.length===1?'':'en'} gevonden${codes.length?' · code-match actief':''}${scanFoil?' · foil vermoed':''}.`;
      }else status.textContent='Geen zekere match. Probeer voldoende licht en zorg dat naam of kaartcode scherp in beeld staat.';
    }catch(e){
      console.error('Scanner v3',e);status.textContent='Scanner liep vast. Probeer dezelfde foto opnieuw of maak een scherpere foto.';out.textContent=`Scanner v3 fout: ${e?.message||e}`;
    }finally{btn.disabled=false}
  }

  btn.onclick=scanV3;
  window.enhancedVaultScan=scanV3;
})();
