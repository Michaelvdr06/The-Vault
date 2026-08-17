// The Vault — Bulk scanner hotfix: title-first Magic recognition via Scryfall
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');

  function distance(a,b){
    a=norm(a); b=norm(b);
    const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let prev=row[0]; row[0]=i;
      for(let j=1;j<=b.length;j++){
        const old=row[j];
        row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
        prev=old;
      }
    }
    return row[b.length];
  }
  function similarity(a,b){
    const x=norm(a),y=norm(b); if(!x||!y)return 0;
    if(x===y)return 1;
    return 1-distance(x,y)/Math.max(x.length,y.length);
  }
  function status(text){const el=$('#bulkCameraStatus');if(el)el.textContent=text}

  function cardBox(source){
    const ratio=.716,margin=.94;
    let w=Math.min(source.width*margin,source.height*margin*ratio),h=w/ratio;
    if(h>source.height*margin){h=source.height*margin;w=h*ratio}
    return {x:(source.width-w)/2,y:(source.height-h)/2,w,h};
  }
  function titleCrop(source,from=.015,to=.205,contrast=1.55){
    const box=cardBox(source), scale=Math.min(3.2,1900/Math.max(1,box.w));
    const out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(box.w*scale));
    out.height=Math.max(1,Math.round(box.h*(to-from)*scale));
    const ctx=out.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,box.x,box.y+box.h*from,box.w,box.h*(to-from),0,0,out.width,out.height);
    const img=ctx.getImageData(0,0,out.width,out.height),d=img.data;
    for(let i=0;i<d.length;i+=4){
      const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      const v=Math.max(0,Math.min(255,(g-128)*contrast+128));
      d[i]=d[i+1]=d[i+2]=v;
    }
    ctx.putImageData(img,0,0); return out;
  }
  function candidateTitles(text){
    const banned=/^(instant|sorcery|creature|artifact|enchantment|land|planeswalker|battle|legendary|basic|token|mana|flash|flying|trample|haste|vigilance|lifelink|deathtouch|reach|ward|counter|draw|target|whenever|when|until|you|your|the|this)$/i;
    return [...new Set(String(text||'').split(/\n+/)
      .map(s=>s.replace(/[^A-Za-z0-9À-ÿ'’,.\-: ]/g,' ').replace(/\s+/g,' ').trim())
      .filter(s=>s.length>=3&&s.length<=55&&/[A-Za-z]{2}/.test(s)&&!banned.test(s)))]
      .sort((a,b)=>b.length-a.length);
  }
  async function getJson(url){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5000);
    try{const r=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});const d=await r.json();return r.ok?d:null}
    catch{return null}finally{clearTimeout(timer)}
  }
  async function findByTitle(lines,setCode){
    let best=null,bestScore=0,bestLine='';
    for(const line of lines.slice(0,8)){
      const named=await getJson(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(line)}`);
      if(!named?.name)continue;
      const score=similarity(line,named.name);
      if(score>bestScore){best=named;bestScore=score;bestLine=line}
      if(score>=.90)break;
      await sleep(70);
    }
    if(!best||bestScore<.74)return null;

    // The bulk screen is set-oriented: once the name is known, resolve the exact printing in the selected set.
    if(setCode){
      const q=`!\"${best.name.replace(/\"/g,'')}\" e:${setCode} game:paper`;
      const exact=await getJson(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=prints`);
      if(exact?.data?.length)best=exact.data[0];
      else return {mismatch:true,card:best,score:bestScore,line:bestLine};
    }
    return {card:best,score:bestScore,line:bestLine};
  }
  async function recognize(source){
    if(!window.Tesseract)return status('OCR is nog niet geladen. Herlaad de pagina en probeer opnieuw.');
    const capture=$('#bulkCapture'); if(capture)capture.disabled=true;
    status('Kaartnaam lezen…');
    try{
      const crops=[titleCrop(source,.01,.19,1.35),titleCrop(source,.01,.23,1.75),titleCrop(source,.00,.28,1.2)];
      const texts=[];
      for(let i=0;i<crops.length;i++){
        status(i===0?'Kaartnaam lezen…':'Naam extra controleren…');
        const r=await Tesseract.recognize(crops[i],'eng',{tessedit_pageseg_mode:i===0?'7':'6',preserve_interword_spaces:'1'});
        texts.push(r?.data?.text||'');
        const early=candidateTitles(texts.join('\n'));
        if(early.length&&i===0){
          const quick=await findByTitle(early,$('#bulkSet')?.value||'');
          if(quick&&!quick.mismatch&&quick.score>=.88){await accept(quick.card,quick.score);return}
        }
      }
      const lines=candidateTitles(texts.join('\n'));
      status('Scryfall match controleren…');
      const hit=await findByTitle(lines,$('#bulkSet')?.value||'');
      if(hit?.mismatch){
        status(`Ik lees “${hit.card.name}”, maar die kaart zit niet in de gekozen set. Kies de juiste set en scan opnieuw.`);
        return;
      }
      if(!hit?.card){
        status('Geen zekere kaartnaam gevonden. Zorg dat de bovenkant van de kaart scherp en volledig binnen het paarse kader staat.');
        return;
      }
      await accept(hit.card,hit.score);
    }catch(err){
      console.warn('Title-first bulk scan failed',err);
      status('Scannen mislukte. Houd de kaart stil, vermijd schittering op de naam en probeer opnieuw.');
    }finally{
      if(capture)capture.disabled=!$('#bulkVideo')?.srcObject;
    }
  }
  async function accept(card,score){
    const input=$('#bulkNumbers'),resolve=$('#bulkResolve');
    if(!input||!resolve)return;
    input.value=card.collector_number;
    resolve.click();
    status(`✓ ${card.name} (#${card.collector_number}) herkend (${Math.round(score*100)}% naam-match). Volgende kaart!`);
    try{if(navigator.vibrate)navigator.vibrate(35)}catch{}
  }
  function captureVideo(){
    const v=$('#bulkVideo'),c=$('#bulkCanvas');
    if(!v?.videoWidth||!c)return;
    c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
    recognize(c);
  }
  function scanFile(file){
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{const c=$('#bulkCanvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);URL.revokeObjectURL(url);recognize(c)};
    img.onerror=()=>{URL.revokeObjectURL(url);status('Foto kon niet worden geopend.')};
    img.src=url;
  }
  function install(){
    const capture=$('#bulkCapture'),photo=$('#bulkPhoto');
    if(!capture||!photo)return false;
    if(capture.dataset.titleFirst==='1')return true;
    capture.dataset.titleFirst='1';
    capture.onclick=e=>{e.preventDefault();captureVideo()};
    photo.onchange=e=>{const f=e.target.files?.[0];if(f)scanFile(f);e.target.value=''};
    const hint=$('#bulkCameraStatus');
    if(hint&&/Selecteer eerst|Houd één kaart/i.test(hint.textContent||'')) hint.textContent='Kies de set en houd de kaartnaam scherp in beeld. De scanner controleert de naam via Scryfall.';
    return true;
  }
  if(!install()){
    const observer=new MutationObserver(()=>{if(install())observer.disconnect()});
    observer.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),15000);
  }
})();