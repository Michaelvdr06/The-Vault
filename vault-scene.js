// The single vault animation controller. It deliberately loads no stylesheets.
(() => {
  const collection=document.querySelector('#collection');
  if(!collection||document.querySelector('.vault-cinematic')) return;
  let enabled=localStorage.getItem('vaultSound')!=='off',audio,timer;
  const button=document.createElement('button');button.className='vault-sound-toggle ghost-btn';button.type='button';
  const label=()=>button.textContent=enabled?'◉ Vault sound':'○ Vault sound';label();
  document.querySelector('.topbar-actions')?.prepend(button);
  const tone=(type,frequency,at,duration,volume,end=frequency)=>{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,at);oscillator.frequency.exponentialRampToValueAtTime(end,at+duration);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);oscillator.connect(gain).connect(audio.destination);oscillator.start(at);oscillator.stop(at+duration+.02)};
  const sound=(confirm=false)=>{if(!enabled)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const at=audio.currentTime;if(confirm){tone('sine',520,at,.18,.025,760);return}tone('square',78,at,.11,.035,48);tone('sine',42,at+.34,1.15,.042,31);tone('triangle',110,at+.46,.62,.022,62);tone('sine',440,at+1.02,.28,.018,660)}catch{}};
  button.onclick=()=>{enabled=!enabled;localStorage.setItem('vaultSound',enabled?'on':'off');label();if(enabled)sound(true)};
  const scene=document.createElement('div');scene.className='vault-cinematic';scene.setAttribute('aria-hidden','true');scene.innerHTML='<div class="vault-light"></div><div class="vault-frame"><div class="vault-door vault-door-left"><i></i></div><div class="vault-door vault-door-right"><i></i></div><div class="vault-lock"><span>V</span><b></b></div><div class="vault-seam"></div></div><div class="vault-status">ACCESS GRANTED</div>';document.body.append(scene);
  const play=()=>{clearTimeout(timer);scene.classList.remove('is-opening');void scene.offsetWidth;sound();scene.classList.add('is-opening');timer=setTimeout(()=>scene.classList.remove('is-opening'),2150)};
  new MutationObserver(()=>{if(collection.classList.contains('active')&&!collection.dataset.vaultOpened){collection.dataset.vaultOpened='1';play()}else if(!collection.classList.contains('active'))delete collection.dataset.vaultOpened}).observe(collection,{attributes:true,attributeFilter:['class']});
})();
