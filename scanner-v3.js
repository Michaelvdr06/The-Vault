// The Vault — Scanner v3.1: fast mobile OCR, code-first, bounded fallbacks
(() => {
  const $ = id => document.getElementById(id);
  const btn = $('scanBtn');
  if(!btn || typeof Tesseract === 'undefined') return;

  const DESKEW=[-18,-9,0,9,18];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const timeout=(p,ms,fallback='')=>Promise.race([p,new Promise(r=>setTimeout(()=>r(fallback),ms))]);

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const u=URL.createObjectURL(file),img=new Image();
      img.onload=()=>{URL.revokeObjectURL(u);resolve(img)};
      img.onerror=e=>{URL.revokeObjectURL(u);reject(e)};
      img.src=u;
    });
  }

  function rotateImage(img,deg,maxSide=1150){
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
    const sx=Math.max(0,Math.round(src.width*x)),sy=Math.max(0,Math.round(src.height*y));
    const sw=Math.max(1,Math.min(src.width-sx,Math.round(src.width*w)));
    const sh=Math.max(1,Math.min(src.height-sy,Math.round(src.height*h)));
    const c=document.createElement('canvas');c.width=sw;c.height=sh;
    c.getContext('2d').drawImage(src,sx,sy,sw,sh,0,0,sw,sh);return c;
  }

  function prep(src,mode='contrast',maxWidth=820){
    let scale=Math.min(1,maxWidth/src.width),w=Math.max(1,Math.round(src.width*scale)),h=Math.max(1,Math.round(src.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(src,0,0,w,h);
    const im=x.getImageData(0,0,w,h),d=im.data;
    for(let i=0;i<d.length;i+=4){
      const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      let v=mode==='threshold'?(g>150?255:0):mode==='soft'?((g-128)*1.28+128):((g-128)*1.72+128);
      v=clamp(v,0,255);d[i]=d[i+1]=d[i+2]=v;
    }
    x.putImageData(im,0,0);return c;
  }

  function sheet(items,width=850,gap=8){
    const arr=items.filter(Boolean).map(c=>({c,s:Math.min(1,width/c.width)}));
    if(!arr.length){const c=document.createElement('canvas');c.width=8;c.height=8;return c}
    const ws=arr.map(o=>Math.max(1,Math.round(o.c.width*o.s))),hs=arr.map(o=>Math.max(1,Math.round(o.c.height*o.s)));
    const out=document.createElement('canvas');out.width=Math.max(...ws);out.height=hs.reduce((a,b)=>a+b,0)+gap*(arr.length-1);
    const x=out.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);
    let y=0;arr.forEach((o,i)=>{x.drawImage(o.c,0,y,ws[i],hs[i]);y+=hs[i]+gap});return out;
  }

  function fixDigits(s){return String(s||'').toUpperCase().replace(/[OQD]/g,'0').replace(/[IL|!]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/Z/g,'2')}
  function normalizeCode(raw){
    const up=String(raw||'').toUpperCase().replace(/[‐‑‒–—_]/g,'-').replace(/\s+/g,'');
    const m=up.match(/(OP|0P|ST|5T|EB|E8|PRB|PR|P)([0-9OQDIL|!SBZ]{1,2})[-:]?([0-9OQDIL|!SBZ]{3})/);
    if(!m)return'';
    const pre=m[1].replace(/^0P$/,'OP').replace(/^5T$/,'ST').replace(/^E8$/,'EB');
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
    if(typeof opCode==='function')for(const t of src.split(/\s+/)){const c=opCode(t);if(c)out.add(c)}
    return [...out];
  }

  function candidateLines(text){
    return [...new Set(String(text||'').split(/\n+/).map(s=>s.replace(/[^A-Za-z0-9À-ÿ'’().,:&+\- ]/g,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&s.length<=48&&/[A-Za-z]/.test(s)))];
  }

  async function ocr(canvas,label,status,psm=11,maxMs=10500){
    status.textContent=label;
    const task=Tesseract.recognize(canvas,'eng',{
      logger:m=>{if(m.status==='recognizing text'&&m.progress!=null)status.textContent=`${label} ${Math.round(m.progress*100)}%`},
      tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1'
    }).then(r=>r?.data?.text||'').catch(()=> '');
    return timeout(task,maxMs,'');
  }

  async function lookupCode(codes){
    for(const code of codes.slice(0,4)){
      try{
        const card=await timeout(typeof one==='function'?one(code):Promise.resolve(null),3500,null);
        if(card)return card;
      }catch{}
    }
    return null;
  }

  async function magicByName(name){
    if(!name)return null;
    try{
      const ctrl=new AbortController();const kill=setTimeout(()=>ctrl.abort(),3500);
      const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,{signal:ctrl.signal});
      clearTimeout(kill);const d=await r.json();if(!r.ok||d.object==='error')return null;
      const image=d.image_uris?.normal||d.card_faces?.find(x=>x.image_uris)?.image_uris?.normal||'';
      return {game:'Magic: The Gathering',name:d.name,setName:d.set_name||'',cardNumber:d.collector_number||'',rarity:(d.rarity||'rare').replace(/\b\w/g,x=>x.toUpperCase()),condition:'Near Mint',quantity:1,price:+(d.prices?.eur||d.prices?.usd||0),foil:false,image};
    }catch{return null}
  }

  async function scanFast(){
    const status=$('scanStatus'),out=$('ocrText'),results=$('scanResults');
    if(typeof scanFile==='undefined'||!scanFile){status.textContent='Upload eerst een foto.';return}
    btn.disabled=true;results.innerHTML='';out.textContent='Snelle scanner voorbereiden…';
    const started=Date.now();
    try{
      const img=await loadImage(scanFile);
      if(typeof foilEstimate==='function')scanFoil=foilEstimate(img);

      // Pass 1: only the most useful lower/right code zones over five deskew angles.
      const codeZones=[];
      for(const a of DESKEW){
        const c=rotateImage(img,a,1100);
        codeZones.push(prep(crop(c,.02,.62,.96,.36),'contrast',760));
        codeZones.push(prep(crop(c,.52,.67,.46,.31),'threshold',620));
      }
      let codeText=await ocr(sheet(codeZones,800,6),'Kaartcode zoeken…',status,11,9500);
      let codes=extractCodes(codeText),found=await lookupCode(codes);

      // Pass 2: compact top + bottom name strips, only if no code match.
      let nameText='';
      if(!found){
        const nameZones=[];
        for(const a of [-12,0,12]){
          const c=rotateImage(img,a,1050);
          nameZones.push(prep(crop(c,.03,.00,.94,.25),'soft',760));
          nameZones.push(prep(crop(c,.03,.72,.94,.26),'contrast',760));
        }
        nameText=await ocr(sheet(nameZones,800,7),'Naam controleren…',status,7,9500);
        codes=[...new Set([...codes,...extractCodes(nameText)])];
        found=await lookupCode(codes);
      }

      // Pass 3: small orientation fallback, not a full expensive card OCR.
      let fallbackText='';
      if(!found && Date.now()-started<21000){
        const orient=[];
        for(const a of [90,-90,180]){
          const c=rotateImage(img,a,900);
          orient.push(prep(crop(c,.02,.70,.96,.28),'contrast',700));
        }
        fallbackText=await ocr(sheet(orient,760,6),'Snelle laatste controle…',status,11,7000);
        codes=[...new Set([...codes,...extractCodes(fallbackText)])];
        found=await lookupCode(codes);
      }

      let matches=found?[found]:[];
      if(!matches.length){
        const names=candidateLines(`${nameText}\n${fallbackText}`).filter(x=>!/(activate|character|counter|opponent|draw|cost|phase)/i.test(x));
        for(const name of names.slice(0,4)){
          const m=await magicByName(name);if(m){matches=[m];break}
        }
      }

      matches=(matches||[]).slice(0,4).map(c=>({...c,foil:!!(scanFoil||c.foil)}));
      out.textContent=[
        'Scanner v3.1 FAST',
        `Tijd: ${((Date.now()-started)/1000).toFixed(1)}s`,
        `Codes: ${codes.length?codes.join(', '):'geen zekere code'}`,
        `Foil: ${scanFoil?'mogelijk':'niet duidelijk'}`,
        '',
        'Code OCR:',codeText.trim()||'—',
        nameText?`\nNaam OCR:\n${nameText.trim()}`:'',
        fallbackText?`\nFallback OCR:\n${fallbackText.trim()}`:''
      ].filter(Boolean).join('\n');

      if(matches.length){
        if(typeof scanRender==='function')scanRender(matches);
        status.textContent=`${matches.length} kaart${matches.length===1?'':'en'} gevonden in ${((Date.now()-started)/1000).toFixed(1)}s${codes.length?' · code herkend':''}.`;
      }else status.textContent=`Geen zekere match na ${((Date.now()-started)/1000).toFixed(1)}s. Probeer kaartcode/naam iets scherper in beeld.`;
    }catch(e){
      console.error('Scanner v3.1',e);status.textContent='Scan afgebroken. Probeer dezelfde foto opnieuw.';out.textContent=`Scanner v3.1 fout: ${e?.message||e}`;
    }finally{btn.disabled=false}
  }

  btn.onclick=scanFast;
  window.enhancedVaultScan=scanFast;
})();
