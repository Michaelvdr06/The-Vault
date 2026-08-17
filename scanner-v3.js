// The Vault — Scanner v3.3: fast OCR + reliable One Piece name/code matching
(() => {
  const $ = id => document.getElementById(id);
  const btn = $('scanBtn');
  if(!btn || typeof Tesseract === 'undefined') return;

  const DESKEW=[-18,-9,0,9,18];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const timeout=(p,ms,fallback='')=>Promise.race([p,new Promise(r=>setTimeout(()=>r(fallback),ms))]);
  let opSetCardCache=null, opStarterCache=null, opPromoCache=null;

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
    const scale=Math.min(1,maxWidth/src.width),w=Math.max(1,Math.round(src.width*scale)),h=Math.max(1,Math.round(src.height*scale));
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
    return [...new Set(String(text||'').split(/\n+/).map(s=>s.replace(/[^A-Za-z0-9À-ÿ'’().,:&+\- ]/g,' ').replace(/\s+/g,' ').trim()).filter(s=>s.length>=3&&s.length<=52&&/[A-Za-z]/.test(s)))];
  }

  function normName(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/\((?:alternate art|parallel|manga|sp|gold|silver|winner|promo|\d{3}|\d+)\)/gi,' ')
      .replace(/[^a-z0-9]/g,'');
  }

  function similarity(a,b){
    a=normName(a);b=normName(b);if(!a||!b)return 0;if(a===b)return 1;if(a.includes(b)||b.includes(a))return .93;
    const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>{const r=Array(n+1).fill(0);r[0]=i;return r});
    for(let j=0;j<=n;j++)d[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return 1-d[m][n]/Math.max(m,n);
  }

  function flattenCards(value,out=[]){
    if(Array.isArray(value)){value.forEach(v=>flattenCards(v,out));return out}
    if(!value||typeof value!=='object')return out;
    const id=value.card_id||value.cardId||value.card_number||value.cardNumber||value.code;
    if(id&&/(OP|ST|EB|PRB|PR|P)\d{1,2}-\d{3}/i.test(String(id)))out.push(value);
    else Object.values(value).forEach(v=>{if(v&&typeof v==='object')flattenCards(v,out)});
    return out;
  }

  function imageOf(d){return d?.card_image||d?.cardImage||d?.image_url||d?.image||d?.img_url||d?.img||''}
  function opToCard(x){
    const number=String(x.card_id||x.cardId||x.card_number||x.cardNumber||x.code||'');
    return {game:'One Piece TCG',name:String(x.card_name||x.cardName||x.name||x.title||number),setName:String(x.set_name||x.setName||x.set||number.split('-')[0]||''),cardNumber:number,rarity:String(x.rarity||x.card_rarity||'Rare').replace(/\b\w/g,c=>c.toUpperCase()),condition:'Near Mint',quantity:1,price:Number(x.market_price||x.price||x.inventory_price||0)||0,foil:false,image:imageOf(x)};
  }

  async function fetchOpPool(url,cacheKey){
    if(cacheKey==='set'&&opSetCardCache)return opSetCardCache;
    if(cacheKey==='starter'&&opStarterCache)return opStarterCache;
    if(cacheKey==='promo'&&opPromoCache)return opPromoCache;
    try{
      const ctrl=new AbortController(),kill=setTimeout(()=>ctrl.abort(),5500);
      const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});clearTimeout(kill);
      if(!r.ok)return[];const d=await r.json(),pool=flattenCards(d,[]);
      if(cacheKey==='set')opSetCardCache=pool;if(cacheKey==='starter')opStarterCache=pool;if(cacheKey==='promo')opPromoCache=pool;
      return pool;
    }catch{return[]}
  }

  async function onePieceByName(names){
    const usable=[...new Set(names.map(x=>x.trim()).filter(x=>x.length>=3&&!/(activate|character|counter|opponent|draw|cost|phase|power|don!!|main)/i.test(x)))].slice(0,8);
    if(!usable.length)return[];

    let pool=await fetchOpPool('https://optcgapi.com/api/allSetCards/','set');
    let ranked=[];
    const rankPool=p=>{
      for(const raw of p){
        const card=opToCard(raw);if(!card.cardNumber)continue;
        let score=0,best='';
        for(const name of usable){const s=similarity(name,card.name);if(s>score){score=s;best=name}}
        if(score>=.72)ranked.push({card,score,best});
      }
    };
    rankPool(pool);

    if(!ranked.length){pool=await fetchOpPool('https://optcgapi.com/api/allSTCards/','starter');rankPool(pool)}
    if(!ranked.length){pool=await fetchOpPool('https://optcgapi.com/api/allPromoCards/','promo');rankPool(pool)}

    ranked.sort((a,b)=>b.score-a.score);
    const seen=new Set(),out=[];
    for(const r of ranked){
      const key=r.card.cardNumber.toUpperCase();if(seen.has(key))continue;seen.add(key);out.push(r.card);if(out.length>=4)break;
    }
    return out;
  }

  async function ocr(canvas,label,status,psm=11,maxMs=10500,whitelist=''){
    status.textContent=label;
    const opts={logger:m=>{if(m.status==='recognizing text'&&m.progress!=null)status.textContent=`${label} ${Math.round(m.progress*100)}%`},tessedit_pageseg_mode:String(psm),preserve_interword_spaces:'1'};
    if(whitelist)opts.tessedit_char_whitelist=whitelist;
    const task=Tesseract.recognize(canvas,'eng',opts).then(r=>r?.data?.text||'').catch(()=> '');
    return timeout(task,maxMs,'');
  }

  async function directOne(code){
    try{const c=await timeout(typeof one==='function'?one(code):Promise.resolve(null),3000,null);if(c)return c}catch{}
    const setId=String(code||'').split('-')[0];if(!setId)return null;
    try{
      const ctrl=new AbortController(),kill=setTimeout(()=>ctrl.abort(),3500);
      const r=await fetch(`https://optcgapi.com/api/sets/${encodeURIComponent(setId)}/`,{signal:ctrl.signal});clearTimeout(kill);
      if(!r.ok)return null;const raw=flattenCards(await r.json(),[]);
      const hit=raw.find(x=>String(x.card_id||x.cardId||x.card_number||x.cardNumber||x.code||'').toUpperCase()===String(code).toUpperCase());
      return hit?opToCard(hit):null;
    }catch{return null}
  }

  async function lookupCode(codes){for(const code of codes.slice(0,4)){const c=await directOne(code);if(c)return c}return null}

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
    btn.disabled=true;results.innerHTML='';out.textContent='Scanner v3.3 voorbereiden…';
    const started=Date.now();
    try{
      const img=await loadImage(scanFile);
      if(typeof foilEstimate==='function')scanFoil=foilEstimate(img);

      const codeZones=[];
      for(const a of DESKEW){
        const c=rotateImage(img,a,1150);
        codeZones.push(prep(crop(c,.02,.60,.96,.38),'contrast',800));
        codeZones.push(prep(crop(c,.50,.64,.49,.34),'threshold',700));
      }
      let codeText=await ocr(sheet(codeZones,830,6),'Kaartcode zoeken…',status,11,9000,'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ');
      let codes=extractCodes(codeText),found=await lookupCode(codes);

      let nameText='';
      if(!found){
        const nameZones=[];
        for(const a of [-12,0,12]){
          const c=rotateImage(img,a,1100);
          nameZones.push(prep(crop(c,.03,.00,.94,.28),'soft',780));
          nameZones.push(prep(crop(c,.03,.68,.94,.31),'contrast',800));
        }
        nameText=await ocr(sheet(nameZones,820,7),'Naam controleren…',status,7,9000);
        codes=[...new Set([...codes,...extractCodes(nameText)])];
        found=await lookupCode(codes);
      }

      let fallbackText='';
      if(!found && Date.now()-started<19000){
        const orient=[];
        for(const a of [90,-90,180]){
          const c=rotateImage(img,a,900);
          orient.push(prep(crop(c,.02,.68,.96,.31),'contrast',720));
        }
        fallbackText=await ocr(sheet(orient,780,6),'Snelle laatste controle…',status,11,6500);
        codes=[...new Set([...codes,...extractCodes(fallbackText)])];
        found=await lookupCode(codes);
      }

      let matches=found?[found]:[];
      const names=candidateLines(`${nameText}\n${fallbackText}`).filter(x=>!/(activate|character|counter|opponent|draw|cost|phase|power|don!!|main)/i.test(x));

      // Crucial v3.3 fix: a correctly OCR'd One Piece name now becomes real suggestions,
      // even when the tiny card code was unreadable.
      if(!matches.length&&names.length){
        status.textContent='One Piece naam matchen…';
        matches=await timeout(onePieceByName(names),7000,[]);
      }

      // Magic only runs after One Piece name matching failed.
      if(!matches.length){
        for(const name of names.slice(0,4)){
          const m=await magicByName(name);if(m){matches=[m];break}
        }
      }

      matches=(matches||[]).slice(0,4).map(c=>({...c,foil:!!(scanFoil||c.foil)}));
      out.textContent=[
        'Scanner v3.3',
        `Tijd: ${((Date.now()-started)/1000).toFixed(1)}s`,
        `Codes: ${codes.length?codes.join(', '):'geen zekere code'}`,
        `Naam kandidaten: ${names.length?names.slice(0,5).join(' | '):'geen'}`,
        `Foil: ${scanFoil?'mogelijk':'niet duidelijk'}`,
        '',
        'Code OCR:',codeText.trim()||'—',
        nameText?`\nNaam OCR:\n${nameText.trim()}`:'',
        fallbackText?`\nFallback OCR:\n${fallbackText.trim()}`:''
      ].filter(Boolean).join('\n');

      if(matches.length){
        if(typeof scanRender==='function')scanRender(matches);
        status.textContent=`${matches.length} kaart${matches.length===1?'':'en'} voorgesteld in ${((Date.now()-started)/1000).toFixed(1)}s${codes.length?' · code-match':' · naam-match'}.`;
      }else status.textContent=`Naam gelezen, maar geen zekere kaartmatch gevonden na ${((Date.now()-started)/1000).toFixed(1)}s.`;
    }catch(e){
      console.error('Scanner v3.3',e);status.textContent='Scan afgebroken. Probeer dezelfde foto opnieuw.';out.textContent=`Scanner v3.3 fout: ${e?.message||e}`;
    }finally{btn.disabled=false}
  }

  btn.onclick=scanFast;
  window.enhancedVaultScan=scanFast;
})();
