// The Vault — Scanner v3.2: fast phone OCR + robust One Piece lookup
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

  function rotateImage(img,deg,maxSide=1200){
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

  // Crucial for tiny printed card IDs: this can UPSCALE small crops instead of only shrinking them.
  function prep(src,mode='contrast',targetWidth=900,maxScale=3){
    const scale=Math.min(maxScale,targetWidth/src.width);
    const w=Math.max(1,Math.round(src.width*scale)),h=Math.max(1,Math.round(src.height*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(src,0,0,w,h);
    const im=x.getImageData(0,0,w,h),d=im.data;
    for(let i=0;i<d.length;i+=4){
      const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      let v=mode==='threshold'?(g>148?255:0):mode==='soft'?((g-128)*1.25+128):((g-128)*1.82+128);
      v=clamp(v,0,255);d[i]=d[i+1]=d[i+2]=v;
    }
    x.putImageData(im,0,0);return c;
  }

  function sheet(items,width=920,gap=8){
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
    // OCR often separates prefix/set/number. Recombine nearby fragments too.
    const compact=src.replace(/[^A-Z0-9]/g,' ');
    const parts=compact.split(/\s+/).filter(Boolean);
    for(let i=0;i<parts.length;i++){
      for(let n=1;n<=3;n++){
        const c=normalizeCode(parts.slice(i,i+n).join(''));if(c)out.add(c);
      }
    }
    if(typeof opCode==='function')for(const t of src.split(/\s+/)){const c=opCode(t);if(c)out.add(c)}
    return [...out];
  }

  function candidateLines(text){
    return [...new Set(String(text||'').split(/\n+/).map(s=>s.replace(/[^A-Za-z0-9À-ÿ'’().,:&+\- ]/g,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&s.length<=50&&/[A-Za-z]/.test(s)))];
  }

  async function ocr(canvas,label,status,psm=11,maxMs=9000,codeOnly=false){
    status.textContent=label;
    const opts={
      logger:m=>{if(m.status==='recognizing text'&&m.progress!=null)status.textContent=`${label} ${Math.round(m.progress*100)}%`},
      tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1',user_defined_dpi:'300'
    };
    if(codeOnly)opts.tessedit_char_whitelist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-:';
    const task=Tesseract.recognize(canvas,'eng',opts).then(r=>r?.data?.text||'').catch(()=> '');
    return timeout(task,maxMs,'');
  }

  function flattenPayload(v,out=[]){
    if(Array.isArray(v)){v.forEach(x=>flattenPayload(x,out));return out}
    if(v&&typeof v==='object'){
      const id=String(v.card_id||v.cardId||v.code||v.number||v.id||'').toUpperCase();
      if(/^(OP|ST|EB|PRB|PR|P)\d{1,2}-\d{3}$/.test(id))out.push(v);
      for(const [k,x] of Object.entries(v))if(x&&typeof x==='object'&&!['prices','price'].includes(k))flattenPayload(x,out);
    }
    return out;
  }

  function normalizeOnePiece(raw,code){
    if(typeof oneNorm==='function'){
      try{const c=oneNorm(raw,code);if(c)return c}catch{}
    }
    const d=raw||{};
    const pick=(...ks)=>{for(const k of ks)if(d[k]!=null&&d[k]!=='')return d[k];return''};
    return {
      game:'One Piece TCG',name:pick('card_name','name','cardName','english_name','title')||code,
      setName:pick('set_name','setName','set')||code.split('-')[0],cardNumber:pick('card_id','cardId','code','number')||code,
      rarity:String(pick('rarity','card_rarity')||'Rare'),condition:'Near Mint',quantity:1,
      price:+(pick('market_price','price','inventory_price','low_price')||0),foil:false,
      image:pick('card_image','image','image_url','img_url','img')||''
    };
  }

  async function fetchJSON(url,ms=3500){
    try{
      const ctrl=new AbortController(),kill=setTimeout(()=>ctrl.abort(),ms);
      const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});clearTimeout(kill);
      if(!r.ok)return null;return await r.json();
    }catch{return null}
  }

  // Robust lookup: exact endpoint first, then fetch only that set/deck and find the card locally.
  async function lookupOnePiece(code){
    const directUrls=[];
    if(/^ST/.test(code))directUrls.push(`https://optcgapi.com/api/decks/card/${encodeURIComponent(code)}/`);
    else directUrls.push(`https://optcgapi.com/api/sets/card/${encodeURIComponent(code)}/`);
    directUrls.push(`https://optcgapi.com/api/sets/card/${encodeURIComponent(code)}/`,`https://optcgapi.com/api/decks/card/${encodeURIComponent(code)}/`);
    for(const u of [...new Set(directUrls)]){
      const d=await fetchJSON(u,3000);if(d){const items=flattenPayload(d);const hit=items.find(x=>String(x.card_id||x.cardId||x.code||x.number||x.id||'').toUpperCase()===code)||items[0]||d;const c=normalizeOnePiece(hit,code);if(c&&String(c.cardNumber||'').toUpperCase().includes(code))return c}
    }
    const setId=code.split('-')[0];
    const bulkUrl=/^ST/.test(code)?`https://optcgapi.com/api/decks/${encodeURIComponent(setId)}/`:`https://optcgapi.com/api/sets/${encodeURIComponent(setId)}/`;
    const bulk=await fetchJSON(bulkUrl,4500);
    if(bulk){
      const hit=flattenPayload(bulk).find(x=>String(x.card_id||x.cardId||x.code||x.number||x.id||'').toUpperCase()===code);
      if(hit)return normalizeOnePiece(hit,code);
    }
    // Final compatibility fallback to the app's old lookup.
    try{return await timeout(typeof one==='function'?one(code):Promise.resolve(null),3000,null)}catch{return null}
  }

  async function lookupCode(codes){
    for(const code of codes.slice(0,4)){
      const card=await lookupOnePiece(code);if(card)return card;
    }
    return null;
  }

  async function magicByName(name){
    if(!name)return null;
    try{
      const ctrl=new AbortController();const kill=setTimeout(()=>ctrl.abort(),3200);
      const r=await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`,{signal:ctrl.signal});clearTimeout(kill);
      const d=await r.json();if(!r.ok||d.object==='error')return null;
      const image=d.image_uris?.normal||d.card_faces?.find(x=>x.image_uris)?.image_uris?.normal||'';
      return {game:'Magic: The Gathering',name:d.name,setName:d.set_name||'',cardNumber:d.collector_number||'',rarity:(d.rarity||'rare').replace(/\b\w/g,x=>x.toUpperCase()),condition:'Near Mint',quantity:1,price:+(d.prices?.eur||d.prices?.usd||0),foil:false,image};
    }catch{return null}
  }

  async function scanFast(){
    const status=$('scanStatus'),out=$('ocrText'),results=$('scanResults');
    if(typeof scanFile==='undefined'||!scanFile){status.textContent='Upload eerst een foto.';return}
    btn.disabled=true;results.innerHTML='';out.textContent='Scanner v3.2 voorbereiden…';
    const started=Date.now();
    try{
      const img=await loadImage(scanFile);
      if(typeof foilEstimate==='function')scanFoil=foilEstimate(img);

      // Pass 1: tiny printed card IDs get dedicated enlarged crops.
      const codeZones=[];
      for(const a of DESKEW){
        const c=rotateImage(img,a,1250);
        codeZones.push(prep(crop(c,.45,.77,.54,.22),'contrast',1050,3));
        codeZones.push(prep(crop(c,.58,.82,.41,.17),'threshold',1050,3));
        codeZones.push(prep(crop(c,.02,.70,.96,.29),'contrast',900,2));
      }
      let codeText=await ocr(sheet(codeZones,920,5),'One Piece kaartcode zoeken…',status,11,9000,true);
      let codes=extractCodes(codeText),found=await lookupCode(codes);

      // Pass 2: name bands. One Piece names are often near the bottom; Magic usually near the top.
      let nameText='';
      if(!found){
        const nameZones=[];
        for(const a of [-12,0,12]){
          const c=rotateImage(img,a,1100);
          nameZones.push(prep(crop(c,.03,.00,.94,.25),'soft',820,1.8));
          nameZones.push(prep(crop(c,.03,.68,.94,.30),'contrast',820,1.8));
        }
        nameText=await ocr(sheet(nameZones,850,7),'Naam en nummer controleren…',status,7,8500,false);
        codes=[...new Set([...codes,...extractCodes(nameText)])];
        found=await lookupCode(codes);
      }

      // Pass 3: short orientation fallback only. No huge full-card OCR.
      let fallbackText='';
      if(!found && Date.now()-started<19000){
        const orient=[];
        for(const a of [90,-90,180]){
          const c=rotateImage(img,a,900);
          orient.push(prep(crop(c,.42,.70,.57,.29),'contrast',900,2.2));
        }
        fallbackText=await ocr(sheet(orient,820,5),'Oriëntatiecheck…',status,11,6500,true);
        codes=[...new Set([...codes,...extractCodes(fallbackText)])];
        found=await lookupCode(codes);
      }

      let matches=found?[found]:[];
      if(!matches.length){
        const names=candidateLines(nameText).filter(x=>!/(activate|character|counter|opponent|draw|cost|phase|power|don)/i.test(x));
        // Existing detector can still catch Magic without another OCR pass.
        if(typeof detect==='function'){
          for(const name of names.slice(0,3)){
            try{const a=await timeout(detect(`${codeText}\n${nameText}\n${fallbackText}`,name),3500,[]);if(a?.length){matches=a;break}}catch{}
          }
        }
        if(!matches.length){for(const name of names.slice(0,3)){const m=await magicByName(name);if(m){matches=[m];break}}}
      }

      matches=(matches||[]).slice(0,4).map(c=>({...c,foil:!!(scanFoil||c.foil)}));
      out.textContent=[
        'Scanner v3.2',
        `Tijd: ${((Date.now()-started)/1000).toFixed(1)}s`,
        `One Piece codes: ${codes.length?codes.join(', '):'geen zekere code'}`,
        `Foil: ${scanFoil?'mogelijk':'niet duidelijk'}`,
        '',
        'Code OCR:',codeText.trim()||'—',
        nameText?`\nNaam OCR:\n${nameText.trim()}`:'',
        fallbackText?`\nOriëntatie OCR:\n${fallbackText.trim()}`:''
      ].filter(Boolean).join('\n');

      if(matches.length){
        if(typeof scanRender==='function')scanRender(matches);
        status.textContent=`${matches.length} kaart${matches.length===1?'':'en'} gevonden in ${((Date.now()-started)/1000).toFixed(1)}s${codes.length?' · One Piece code herkend':''}.`;
      }else status.textContent=`Geen zekere match na ${((Date.now()-started)/1000).toFixed(1)}s. Zorg vooral dat het kleine kaartnummer onderaan scherp is.`;
    }catch(e){
      console.error('Scanner v3.2',e);status.textContent='Scan afgebroken. Probeer dezelfde foto opnieuw.';out.textContent=`Scanner v3.2 fout: ${e?.message||e}`;
    }finally{btn.disabled=false}
  }

  btn.onclick=scanFast;
  window.enhancedVaultScan=scanFast;
})();