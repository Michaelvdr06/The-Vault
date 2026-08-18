// The Vault — Bulk Add
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const norm=s=>String(s??'').toUpperCase().trim().replace(/^0+(?=\d)/,'').replace(/[^A-Z0-9]/g,'');
  const state={sets:[],set:null,cards:[],byNumber:new Map(),queue:new Map(),history:[],stream:null,busy:false,autoTimer:null,reviewOpen:false,lastCandidate:'',candidateHits:0,candidateAt:0,workerPromise:null};

  function ensureUI(){
    if($('#bulk')) return;
    const navList=$('.nav-list'), scanner=$('.nav-item[data-page="scanner"]');
    const navBtn=document.createElement('button');
    navBtn.className='nav-item'; navBtn.dataset.page='bulk'; navBtn.innerHTML='<span>⊞</span> Bulk toevoegen';
    const isMobile=window.matchMedia('(max-width: 767px)').matches;
    const addNav=$('.nav-item[data-page="add"]'),scanNav=$('.nav-item[data-page="scanner"]');
    // The registration submenu is a desktop convenience. On phones it turned
    // the bottom dock into a multi-row panel, so mobile keeps only its five
    // primary destinations.
    if(navList&&!isMobile&&!$('.nav-register-group')){
      navList.insertBefore(navBtn,scanner||null);
      const group=document.createElement('div');
      group.className='nav-register-group';
      group.innerHTML='<button class="nav-register-toggle" type="button" aria-expanded="false"><span class="nav-register-rune">✦</span><span>Kaarten registreren</span><span class="nav-register-chevron">⌄</span></button><div class="nav-register-menu"></div>';
      navList.insertBefore(group,addNav||navBtn);
      const menu=group.querySelector('.nav-register-menu');
      [addNav,navBtn,scanNav].filter(Boolean).forEach(item=>menu.appendChild(item));
      const toggle=group.querySelector('.nav-register-toggle');
      const sync=force=>{const open=force??!group.classList.contains('open');group.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open))};
      toggle.onclick=()=>sync();
      menu.addEventListener('click',()=>sync(true));
      if(menu.querySelector('.nav-item.active'))sync(true);
    }
    const page=document.createElement('section');
    page.id='bulk'; page.className='page';
    page.innerHTML=`
      <section class="bulk-hero">
        <div><p class="small-label">RAPID INTAKE</p><h2>Een stapel kaarten. <span>Één keer opslaan.</span></h2><p>Kies eerst de set. Plak daarna collector numbers of scan kaarten achter elkaar; dubbelen worden automatisch opgeteld.</p></div>
        <div class="bulk-counter"><strong id="bulkTotal">0</strong><span>kaarten klaar</span></div>
      </section>
      <section class="panel bulk-setup">
        <label><span>MAGIC SET</span><select id="bulkSet"><option value="">Sets laden…</option></select></label>
        <div id="bulkSetStatus" class="status-text muted">Magic-sets ophalen…</div>
      </section>
      <div class="bulk-layout">
        <section class="panel bulk-input-panel">
          <div class="bulk-tabs" role="tablist">
            <button class="bulk-tab active" data-bulk-tab="list">Nummerlijst</button>
            <button class="bulk-tab" data-bulk-tab="camera">Camera scan</button>
          </div>
          <div class="bulk-mode active" data-bulk-mode="list">
            <p class="muted">Eén nummer per regel werkt het snelst. Ook <b>61 x2</b>, komma's en spaties worden begrepen.</p>
            <textarea id="bulkNumbers" rows="12" placeholder="61&#10;142&#10;203 x3"></textarea>
            <div class="action-row"><button class="primary-btn" id="bulkResolve">Kaarten herkennen</button><button class="ghost-btn" id="bulkClearInput">Invoer wissen</button></div>
            <div id="bulkListStatus" class="status-text muted">Nog geen nummers ingevoerd.</div>
          </div>
          <div class="bulk-mode" data-bulk-mode="camera">
            <div class="bulk-camera">
              <video id="bulkVideo" playsinline muted></video>
              <canvas id="bulkCanvas" hidden></canvas>
              <div class="bulk-camera-empty" id="bulkCameraEmpty"><span>✦</span><strong>De arcane scanner wacht</strong><small>Kies een set, open je camera en houd de tekst rustig in beeld.</small></div>
              <div class="bulk-scan-line"></div><div class="bulk-number-target"><span>HOB ★ EN</span></div>
            </div>
            <div class="bulk-live-text"><span>LIVE OCR</span><code id="bulkOcrReadout">Wacht op zichtbare tekst…</code></div>
            <div class="action-row bulk-scan-controls"><button class="ghost-btn bulk-camera-toggle" id="bulkCameraStart"><span>◉</span> Camera openen</button><button class="primary-btn bulk-scan-now" id="bulkCapture" disabled><span>✦</span><b>Start scan</b><small>Lees de kaarttekst nu</small></button></div>
            <label class="bulk-upload"><span>Of gebruik een foto</span><input id="bulkPhoto" type="file" accept="image/*" capture="environment"></label>
            <div id="bulkCameraStatus" class="status-text muted">Selecteer eerst een set en start daarna de camera.</div>
          </div>
        </section>
        <section class="panel bulk-review">
          <div class="panel-header"><div><p class="small-label">CONTROLELIJST</p><h3>Gevonden kaarten</h3></div><button class="text-btn" id="bulkUndo" disabled>↶ Laatste terug</button></div>
          <div id="bulkQueue" class="bulk-queue"><div class="bulk-empty">Nog niets gescand of ingevoerd.</div></div>
          <div class="bulk-review-footer"><div><span id="bulkUnique">0 unieke printings</span><small>Foil kun je per kaart aanpassen.</small></div><button class="primary-btn" id="bulkSave" disabled>Alles opslaan</button></div>
        </section>
      </div>`;
    $('main.content')?.appendChild(page);
    navBtn.onclick=()=>openPage();
    bind();
    loadSets();
  }

  function openPage(){
    if(typeof nav==='function') nav('bulk');
    const title=$('#pageTitle'); if(title) title.textContent='Bulk toevoegen';
  }

  function bind(){
    $('#bulkSet').onchange=loadSet;
    document.addEventListener('click',e=>{
      const tab=e.target.closest('[data-bulk-tab]');
      if(tab){document.querySelectorAll('.bulk-tab').forEach(x=>x.classList.toggle('active',x===tab));document.querySelectorAll('.bulk-mode').forEach(x=>x.classList.toggle('active',x.dataset.bulkMode===tab.dataset.bulkTab));}
      const foil=e.target.closest('[data-bulk-foil]');
      if(foil){const item=state.queue.get(foil.dataset.bulkFoil);if(item){item.foil=!item.foil;render();}}
      const remove=e.target.closest('[data-bulk-remove]');
      if(remove){removeQuantity(remove.dataset.bulkRemove,state.queue.get(remove.dataset.bulkRemove)?.quantity||1);render();}
    });
    $('#bulkResolve').onclick=resolveList;
    $('#bulkClearInput').onclick=()=>{$('#bulkNumbers').value='';$('#bulkListStatus').textContent='Invoer gewist.'};
    $('#bulkCameraStart').onclick=toggleCamera;
    $('#bulkCapture').onclick=()=>{setStatus('bulkCameraStatus','✦ Tekst wordt nu gelezen…');captureVideo(false)};
    $('#bulkPhoto').onchange=e=>{const f=e.target.files?.[0];if(f)scanImageFile(f);e.target.value=''};
    $('#bulkUndo').onclick=undo;
    $('#bulkSave').onclick=saveAll;
  }

  async function getJson(url){const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(String(r.status));return r.json()}
  async function loadSets(){
    try{
      const d=await getJson('https://api.scryfall.com/sets');
      state.sets=(d.data||[]).filter(s=>!s.digital&&s.card_count>0&&!['token','memorabilia','minigame'].includes(s.set_type)).sort((a,b)=>String(b.released_at||'').localeCompare(String(a.released_at||'')));
      $('#bulkSet').innerHTML='<option value="">Kies een set…</option>'+state.sets.map(s=>`<option value="${esc(s.code)}">${esc(s.name)} · ${esc(s.code.toUpperCase())}</option>`).join('');
      $('#bulkSetStatus').textContent='Kies de set van je stapel.';
    }catch{$('#bulkSetStatus').textContent='Sets konden niet geladen worden. Probeer opnieuw.'}
  }
  async function loadSet(){
    const code=$('#bulkSet').value;
    state.set=state.sets.find(s=>s.code===code)||null;state.cards=[];state.byNumber.clear();
    if(!state.set)return;
    $('#bulkSetStatus').textContent=`${state.set.name} laden…`;
    try{
      let url=`https://api.scryfall.com/cards/search?q=${encodeURIComponent(`e:${code} game:paper`)}&unique=prints&order=set`,all=[];
      while(url){const d=await getJson(url);all.push(...(d.data||[]));url=d.has_more?d.next_page:null}
      state.cards=all;
      all.forEach(c=>state.byNumber.set(norm(c.collector_number),c));
      $('#bulkSetStatus').textContent=`${all.length} printings klaar voor snelle invoer.`;
    }catch{$('#bulkSetStatus').textContent='Deze set kon niet geladen worden.'}
  }

  function parseInput(text){
    const out=[];
    String(text||'').split(/[\n,;]+/).forEach(line=>{
      const clean=line.trim();if(!clean)return;
      const explicit=clean.match(/^([^\s×x*]+)(?:\s*[×x*]\s*(\d+))?$/i);
      if(explicit){out.push({number:explicit[1],quantity:Math.max(1,Number(explicit[2]||1))});return}
      clean.split(/\s+/).filter(Boolean).forEach(number=>out.push({number,quantity:1}));
    });
    return out;
  }
  function addCard(card,quantity=1,source='list',foil=false){
    const base=norm(card.collector_number),key=foil?`${base}:FOIL`:base,existing=state.queue.get(key);
    state.history.push({key,quantity});
    if(existing)existing.quantity+=quantity;
    else state.queue.set(key,{key,game:'Magic: The Gathering',name:card.name,setName:card.set_name,cardNumber:card.collector_number,rarity:String(card.rarity||'rare').replace(/^./,x=>x.toUpperCase()),condition:'Near Mint',quantity,price:Number(foil?card.prices?.eur_foil:card.prices?.eur)||0,foil,image:card.image_uris?.normal||card.card_faces?.find(x=>x.image_uris)?.image_uris?.normal||'',source});
  }
  function removeQuantity(key,quantity){
    const item=state.queue.get(key);if(!item)return;
    item.quantity-=quantity;if(item.quantity<=0)state.queue.delete(key);
  }
  function resolveList(){
    if(!state.set)return setStatus('bulkListStatus','Kies eerst een Magic-set.');
    const entries=parseInput($('#bulkNumbers').value),missing=[];
    entries.forEach(x=>{const card=state.byNumber.get(norm(x.number));if(card)addCard(card,x.quantity);else missing.push(x.number)});
    setStatus('bulkListStatus',entries.length?(missing.length?`${entries.length-missing.length} herkend · niet gevonden: ${missing.join(', ')}`:`Alle ${entries.length} regels herkend.`):'Voer eerst collector numbers in.');
    if(entries.length)$('#bulkNumbers').value='';
    render();
  }
  function setStatus(id,text){$('#'+id).textContent=text}

  function render(){
    const items=[...state.queue.values()],total=items.reduce((n,x)=>n+x.quantity,0);
    $('#bulkTotal').textContent=total;$('#bulkUnique').textContent=`${items.length} unieke printing${items.length===1?'':'s'}`;
    $('#bulkUndo').disabled=!state.history.length;$('#bulkSave').disabled=!items.length;
    $('#bulkQueue').innerHTML=items.length?items.map(x=>`<article class="bulk-queue-item">
      <div class="bulk-thumb">${x.image?`<img src="${esc(x.image)}" alt="${esc(x.name)}">`:'<span>MTG</span>'}</div>
      <div class="bulk-item-copy"><strong>${esc(x.name)}</strong><span>#${esc(x.cardNumber)} · ${esc(x.rarity)}</span></div>
      <div class="bulk-qty">×${x.quantity}</div>
      <button class="bulk-foil ${x.foil?'active':''}" data-bulk-foil="${esc(x.key)}">FOIL</button>
      <button class="bulk-remove" data-bulk-remove="${esc(x.key)}" aria-label="Verwijderen">×</button>
    </article>`).join(''):'<div class="bulk-empty">Nog niets gescand of ingevoerd.</div>';
  }
  function undo(){const h=state.history.pop();if(h){removeQuantity(h.key,h.quantity);render()}}

  function scheduleAuto(delay=450){
    clearTimeout(state.autoTimer);
    if(!state.stream||state.busy||state.reviewOpen)return;
    state.autoTimer=setTimeout(()=>captureVideo(true),delay);
  }
  async function toggleCamera(){
    if(state.stream){stopCamera();return}
    if(!state.set)return setStatus('bulkCameraStatus','Kies eerst een Magic-set.');
    try{
      state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080},advanced:[{focusMode:'continuous'}]},audio:false});
      const v=$('#bulkVideo');v.srcObject=state.stream;await v.play();
      $('#bulkCameraEmpty').classList.add('hidden');$('#bulkCapture').disabled=false;$('#bulkCameraStart').innerHTML='<span>◉</span> Camera sluiten';
      setStatus('bulkCameraStatus','Live OCR actief · houd de tekst linksonder groot en scherp in beeld.');
      scheduleAuto(250);
    }catch{setStatus('bulkCameraStatus','Camera kon niet worden geopend. Gebruik eventueel “foto kiezen”.')}
  }
  function stopCamera(){
    clearTimeout(state.autoTimer);state.autoTimer=null;state.lastCandidate='';state.candidateHits=0;
    state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;$('#bulkVideo').srcObject=null;$('#bulkCameraEmpty').classList.remove('hidden');$('#bulkCapture').disabled=true;$('#bulkCameraStart').innerHTML='<span>◉</span> Camera openen';
  }
  async function captureVideo(automatic=false){
    const v=$('#bulkVideo'),c=$('#bulkCanvas');if(!v.videoWidth||state.busy||state.reviewOpen)return;
    c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
    await recognizeCanvas(c,automatic);
  }
  async function scanImageFile(file){
    if(!state.set)return setStatus('bulkCameraStatus','Kies eerst een Magic-set.');
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=async()=>{const c=$('#bulkCanvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);URL.revokeObjectURL(url);await recognizeCanvas(c)};img.src=url;
  }
  function cardBox(source){
    const ratio=.716,video=$('#bulkVideo');
    // Match the actual purple guide, including the part of a camera frame
    // cropped away by object-fit: cover.
    if(state.stream&&video?.clientWidth&&video?.clientHeight&&video.videoWidth===source.width){
      const scale=Math.max(video.clientWidth/source.width,video.clientHeight/source.height);
      const visibleW=video.clientWidth/scale,visibleH=video.clientHeight/scale;
      const offsetX=(source.width-visibleW)/2,offsetY=(source.height-visibleH)/2;
      let h=visibleH*.88,w=h*ratio;
      if(w>visibleW*.88){w=visibleW*.88;h=w/ratio}
      return{x:offsetX+(visibleW-w)/2,y:offsetY+(visibleH-h)/2,w,h};
    }
    let h=source.height*.88,w=h*ratio;
    if(w>source.width*.88){w=source.width*.88;h=w/ratio}
    return{x:(source.width-w)/2,y:(source.height-h)/2,w,h};
  }
  function preparedCrop(source,from,to,threshold=false){
    const box=cardBox(source),scale=Math.min(3,2200/Math.max(1,box.w));
    const out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(box.w*scale));
    out.height=Math.max(1,Math.round(box.h*(to-from)*scale));
    const ctx=out.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,box.x,box.y+box.h*from,box.w,box.h*(to-from),0,0,out.width,out.height);
    const image=ctx.getImageData(0,0,out.width,out.height),d=image.data;
    for(let i=0;i<d.length;i+=4){
      const gray=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      let value=(gray-128)*1.85+128;
      if(threshold)value=value>148?255:0;
      value=Math.max(0,Math.min(255,value));
      d[i]=d[i+1]=d[i+2]=value;
    }
    ctx.putImageData(image,0,0);return out;
  }
  function editDistance(a,b){
    a=String(a);b=String(b);const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old}}
    return row[b.length];
  }
  function numberCandidates(text){
    const raw=String(text||'').toUpperCase().replace(/[|]/g,'1');
    const parts=raw.match(/[A-Z0-9]{1,7}/g)||[],out=[];
    for(const part of parts){
      const corrected=part.replace(/O/g,'0').replace(/[IL]/g,'1').replace(/S/g,'5').replace(/B/g,'8').replace(/G/g,'6');
      for(const token of [part,corrected]){
        const match=token.match(/\d{1,4}[A-Z]?/);
        if(match)out.push(norm(match[0]));
      }
    }
    return [...new Set(out.filter(Boolean))];
  }
  function cardFromNumbers(candidates){
    for(const value of candidates){const exact=state.byNumber.get(value);if(exact)return exact}
    const valid=[...state.byNumber.keys()];
    for(const value of candidates){
      const near=valid.filter(n=>Math.abs(n.length-value.length)<=1&&editDistance(n,value)<=1);
      if(near.length===1)return state.byNumber.get(near[0]);
    }
    return null;
  }
  function nameScore(a,b){
    a=String(a||'').toLowerCase().replace(/[^a-z0-9]/g,'');b=String(b||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(!a||!b)return 0;if(a===b)return 1;
    const ratio=Math.min(a.length,b.length)/Math.max(a.length,b.length);
    if(ratio<.72)return 0;
    return 1-editDistance(a,b)/Math.max(a.length,b.length);
  }
  function frameEvidence(source){
    const box=cardBox(source),sample=document.createElement('canvas');
    sample.width=180;sample.height=252;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,box.x,box.y,box.w,box.h,0,0,sample.width,sample.height);
    const d=ctx.getImageData(0,0,sample.width,sample.height).data,gray=new Float32Array(sample.width*sample.height);
    let sum=0,min=255,max=0;
    for(let p=0,i=0;i<d.length;i+=4,p++){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];gray[p]=g;sum+=g;min=Math.min(min,g);max=Math.max(max,g)}
    const mean=sum/gray.length;let variance=0,edges=0,checks=0;
    for(let y=1;y<sample.height;y+=2)for(let x=1;x<sample.width;x+=2){
      const p=y*sample.width+x,g=gray[p];variance+=(g-mean)*(g-mean);
      if(Math.abs(g-gray[p-1])>24||Math.abs(g-gray[p-sample.width])>24)edges++;checks++;
    }
    variance/=checks;const edgeRatio=edges/checks;
    const outer=[],inner=[];
    for(let x=8;x<sample.width-8;x+=8){outer.push(gray[5*sample.width+x],gray[(sample.height-6)*sample.width+x]);inner.push(gray[17*sample.width+x],gray[(sample.height-18)*sample.width+x])}
    for(let y=8;y<sample.height-8;y+=8){outer.push(gray[y*sample.width+5],gray[y*sample.width+sample.width-6]);inner.push(gray[y*sample.width+17],gray[y*sample.width+sample.width-18])}
    const avg=a=>a.reduce((n,v)=>n+v,0)/Math.max(1,a.length);
    const border=Math.abs(avg(outer)-avg(inner));
    return{ok:variance>300&&edgeRatio>.035&&(max-min)>75&&border>3.5,variance,edgeRatio,border,range:max-min};
  }
  function cardsFromTitle(text,ocrConfidence=0){
    const lines=String(text||'').split(/\n+/).map(x=>x.trim()).filter(x=>x.length>3&&x.length<60&&/[A-Za-z]{3}/.test(x));
    let bestName='',score=0,bestLine='';
    for(const line of lines)for(const card of state.cards){
      const s=nameScore(line,card.name);
      if(s>score){score=s;bestName=card.name;bestLine=line}
    }
    if(score<.78||ocrConfidence<18||!bestName)return{cards:[],score,ocrConfidence,line:bestLine};
    return{cards:state.cards.filter(card=>norm(card.name)===norm(bestName)).slice(0,8),score,ocrConfidence,line:bestLine};
  }
  function scanReview(options,method,detectedFoil=false,finishCertain=false){
    document.querySelector('.bulk-scan-review')?.remove();
    state.reviewOpen=true;
    let selected=0,foil=!!detectedFoil;
    const overlay=document.createElement('div');
    overlay.className='bulk-scan-review';
    overlay.innerHTML=`<section class="bulk-scan-dialog" role="dialog" aria-modal="true" aria-label="Scan controleren">
      <p class="small-label">METADATA GEVONDEN</p>
      <h3>Is dit jouw kaart?</h3>
      <p class="bulk-scan-method">Nummer en setcode zijn gelezen. Controleer alleen nog de kaart en finish.</p>
      <div class="bulk-candidate-list">${options.map((card,i)=>`<button class="bulk-candidate ${i===0?'selected':''}" data-candidate="${i}">
        <span class="bulk-candidate-image">${imageOfCard(card)?`<img src="${esc(imageOfCard(card))}" alt="">`:'MTG'}</span>
        <span><strong>${esc(card.name)}</strong><small>${esc(card.set_name)} · #${esc(card.collector_number)}</small></span>
      </button>`).join('')}</div>
      <button class="bulk-finish-check ${foil?'foil':''}" data-scan-finish><span>FINISH ${finishCertain?'HERKEND':'CONTROLEREN'}</span><strong>${foil?'★ FOIL':'• NON-FOIL'}</strong><small>Tik om te wisselen</small></button>
      <div class="bulk-scan-actions"><button class="ghost-btn" data-scan-decline>Afwijzen</button><button class="primary-btn" data-scan-accept>Accepteren</button></div>
    </section>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-candidate]').forEach(btn=>btn.onclick=()=>{selected=Number(btn.dataset.candidate);overlay.querySelectorAll('.bulk-candidate').forEach(x=>x.classList.toggle('selected',x===btn))});
    const finishBtn=overlay.querySelector('[data-scan-finish]');
    finishBtn.onclick=()=>{foil=!foil;finishBtn.classList.toggle('foil',foil);finishBtn.querySelector('strong').textContent=foil?'★ FOIL':'• NON-FOIL'};
    const close=()=>{overlay.remove();state.busy=false;state.reviewOpen=false;$('#bulkCapture').disabled=!state.stream;scheduleAuto(650)};
    overlay.querySelector('[data-scan-decline]').onclick=()=>{close();setStatus('bulkCameraStatus','Scan afgewezen. Houd de volgende metadataregel in beeld.')};
    overlay.querySelector('[data-scan-accept]').onclick=()=>{
      const card=options[selected];addCard(card,1,'camera',foil);render();cue(true);close();
      setStatus('bulkCameraStatus',`✓ ${card.name} (#${card.collector_number}) · ${foil?'foil':'non-foil'} toegevoegd. Volgende!`);
    };
  }
  function imageOfCard(card){return card?.image_uris?.normal||card?.card_faces?.find(x=>x.image_uris)?.image_uris?.normal||''}
  function cameraVisibleBox(source){
    const video=$('#bulkVideo');
    if(state.stream&&video?.clientWidth&&video?.clientHeight&&video.videoWidth===source.width){
      const scale=Math.max(video.clientWidth/source.width,video.clientHeight/source.height);
      const w=video.clientWidth/scale,h=video.clientHeight/scale;
      return{x:(source.width-w)/2,y:(source.height-h)/2,w,h};
    }
    return{x:0,y:0,w:source.width,h:source.height};
  }
  function preparedMetadataCrop(source,threshold=false,wide=false){
    const view=cameraVisibleBox(source),x1=wide?.015:.05,x2=wide?.985:.95,y1=wide?.12:.22,y2=wide?.88:.78;
    const scale=Math.min(4,2200/Math.max(1,view.w*(x2-x1))),out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(view.w*(x2-x1)*scale));out.height=Math.max(1,Math.round(view.h*(y2-y1)*scale));
    const ctx=out.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,view.x+view.w*x1,view.y+view.h*y1,view.w*(x2-x1),view.h*(y2-y1),0,0,out.width,out.height);
    const img=ctx.getImageData(0,0,out.width,out.height),d=img.data;
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];let v=(g-128)*2.05+128;if(threshold)v=v>145?255:0;v=Math.max(0,Math.min(255,v));d[i]=d[i+1]=d[i+2]=v}
    ctx.putImageData(img,0,0);return out;
  }
  function preparedVisibleFrame(source,threshold=false){
    const view=cameraVisibleBox(source),scale=Math.min(2.4,1800/Math.max(1,view.w)),out=document.createElement('canvas');
    out.width=Math.max(1,Math.round(view.w*scale));out.height=Math.max(1,Math.round(view.h*scale));
    const ctx=out.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,view.x,view.y,view.w,view.h,0,0,out.width,out.height);
    const img=ctx.getImageData(0,0,out.width,out.height),d=img.data;
    for(let i=0;i<d.length;i+=4){const g=.299*d[i]+.587*d[i+1]+.114*d[i+2];let v=(g-128)*1.7+128;if(threshold)v=v>148?255:0;v=Math.max(0,Math.min(255,v));d[i]=d[i+1]=d[i+2]=v}
    ctx.putImageData(img,0,0);return out;
  }
  function parseMetadata(text){
    const raw=String(text||'').toUpperCase().replace(/\s+/g,' ').trim();
    const corrected=raw.replace(/O(?=\d)/g,'0').replace(/[IL|](?=\d)/g,'1');
    const numbers=[...new Set((corrected.match(/\d{1,5}[A-Z]?/g)||[]).map(norm).filter(n=>state.byNumber.has(n)))];
    const setCode=String(state.set?.code||'').toUpperCase();
    const letterView=raw.replace(/0/g,'O').replace(/1/g,'I').replace(/[^A-Z]/g,'');
    const setSeen=!!setCode&&letterView.includes(setCode);
    // A foil star is often read by OCR as X, M or K between the set code and EN.
    // Treat that exact metadata position as foil; never infer foil from a loose letter elsewhere.
    const starLookalike=!!setCode&&new RegExp(`(?:^|\\s)${setCode}\\s*[XMK]\\s*EN(?:\\s|$)`).test(raw);
    const foil=/[*★✶✦✧]/.test(raw)||starLookalike;
    const regular=/[•·'’]/.test(raw)&&!starLookalike;
    return{raw,numbers,setSeen,foil,regular};
  }
  async function runOcr(image,parameters={}){
    if(!state.workerPromise)state.workerPromise=Tesseract.createWorker('eng');
    const worker=await state.workerPromise;
    await worker.setParameters(parameters);
    return worker.recognize(image);
  }
  async function recognizeCanvas(source,automatic=false){
    if(state.busy||state.reviewOpen||!window.Tesseract)return;
    if(!state.set)return setStatus('bulkCameraStatus','Kies eerst een Magic-set.');
    state.busy=true;$('#bulkCapture').disabled=true;setStatus('bulkCameraStatus','Alle zichtbare tekst lezen…');
    try{
      const whitelist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ*★.'• ";
      const passes=[
        {crop:preparedVisibleFrame(source,false),psm:'11'},
        {crop:preparedVisibleFrame(source,true),psm:'11'},
        {crop:preparedMetadataCrop(source,false,true),psm:'6'}
      ];
      const reads=[],rawTexts=[];
      for(const pass of passes){
        const result=await runOcr(pass.crop,{tessedit_pageseg_mode:pass.psm,tessedit_char_whitelist:whitelist,preserve_interword_spaces:'1'});
        const text=String(result.data?.text||'').trim();rawTexts.push(text);reads.push(parseMetadata(text));
      }
      const visible=[...new Set(rawTexts.flatMap(t=>t.split(/\n+/)).map(x=>x.trim()).filter(Boolean))].slice(0,8);
      const readout=$('#bulkOcrReadout');if(readout)readout.textContent=visible.join(' · ')||'Nog geen bruikbare tekst…';
      const counts=new Map();
      reads.flatMap(r=>r.numbers).forEach(n=>counts.set(n,(counts.get(n)||0)+1));
      const setVotes=reads.filter(r=>r.setSeen).length;
      const ranked=[...counts.entries()].sort((a,b)=>b[1]-a[1]),best=ranked[0];
      const card=best?state.byNumber.get(best[0]):null;
      if(card){
        const foilVotes=reads.filter(r=>r.foil).length,regularVotes=reads.filter(r=>r.regular).length;
        const detectedFoil=foilVotes>regularVotes,finishCertain=Math.max(foilVotes,regularVotes)>=1;
        const strong=best[1]>=2||(best[1]>=1&&setVotes>=1),key=`${best[0]}:${detectedFoil?'F':'N'}`,now=Date.now();
        if(key===state.lastCandidate&&now-state.candidateAt<8000)state.candidateHits++;
        else{state.lastCandidate=key;state.candidateHits=1}
        state.candidateAt=now;
        if(strong||state.candidateHits>=2){
          state.lastCandidate='';state.candidateHits=0;scanReview([card],'full text',detectedFoil,finishCertain);return;
        }
        setStatus('bulkCameraStatus',`#${card.collector_number} gelezen · automatisch bevestigen…`);
      }else{
        state.lastCandidate='';state.candidateHits=0;
        setStatus('bulkCameraStatus',visible.length?'Tekst gezien, maar nog geen collector number uit deze set.':'Live OCR actief · houd de tekst scherp in beeld.');
      }
    }catch(err){console.warn('Bulk full-text scan failed',err);setStatus('bulkCameraStatus','Live OCR herstelt automatisch · houd de tekst stil.')}
    state.busy=false;$('#bulkCapture').disabled=!state.stream;
    if(automatic||state.stream)scheduleAuto(360);
  }
  function cue(ok){
    try{const A=window.AudioContext||window.webkitAudioContext,a=new A(),o=a.createOscillator(),g=a.createGain();o.frequency.value=ok?880:220;g.gain.setValueAtTime(.06,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+.13);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.14)}catch{}
    if(ok&&navigator.vibrate)navigator.vibrate(35);
  }
  function saveAll(){
    if(!state.queue.size)return;
    let total=0;
    for(const item of state.queue.values()){
      total+=item.quantity;
      const existing=(typeof cards!=='undefined'?cards:[]).find(c=>c.game===item.game&&norm(c.cardNumber)===norm(item.cardNumber)&&String(c.setName||'').toLowerCase()===String(item.setName||'').toLowerCase()&&!!c.foil===!!item.foil);
      if(existing)existing.quantity=Number(existing.quantity||1)+item.quantity;
      else cards.unshift({id:crypto.randomUUID(),addedAt:Date.now(),...item});
    }
    if(typeof save==='function')save();if(typeof dash==='function')dash();if(typeof binder==='function')binder();
    state.queue.clear();state.history=[];render();stopCamera();
    if(typeof toast==='function')toast(`${total} kaarten veilig toegevoegd aan je collectie.`);
    if(typeof nav==='function')nav('collection');
  }
  ensureUI();
})();
