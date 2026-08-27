'use strict';
/* ============================================================
   L'Heure du Crime — Console MJ (v2)
   ============================================================ */
let DATA=null, BYNUM={};
const NEUTRAL=["main","bague","cheveux","silhouette","signe"];
const $=id=>document.getElementById(id);
const LS='hdc_mj_v2';

/* ---------- persistance ---------- */
const store={theme:'day',sound:true,acts:2,tour:1,ouverture:[],clues:[]};
function save(){try{localStorage.setItem(LS,JSON.stringify(store))}catch(e){}}
function load(){try{Object.assign(store,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}}

/* ---------- RNG seedable ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(arr,rng){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---------- phrasing Indices ---------- */
const PHRASE={
  main:{Gaucher:"est gaucher",Droitier:"est droitier"},
  bague:{Chevalière:"porte une chevalière",Alliance:"porte une alliance",Aucune:"ne porte aucune bague"},
  cheveux:{Bruns:"a les cheveux bruns",Noirs:"a les cheveux noirs",Blonds:"est blond",
    "Poivre-et-sel":"a les cheveux poivre-et-sel",Roux:"est roux",Chauve:"est chauve"},
  silhouette:{Grand:"est de grande taille",Petit:"est de petite taille",Mince:"est mince",Corpulent:"est de forte carrure"},
  signe:{Canne:"porte une canne",Lorgnon:"porte un lorgnon",Cicatrice:"a une cicatrice",
    "Grain de beauté":"a un grain de beauté visible",Aucun:"n'a aucun signe distinctif"},
  pilosite:{Favoris:"porte des favoris",Barbe:"porte la barbe",Moustache:"porte la moustache",Glabre:"est glabre"}
};
const phrase=(d,v)=>"Le meurtrier "+((PHRASE[d]&&PHRASE[d][v])||(d+" = "+v))+".";
const nom=n=>BYNUM[n]?BYNUM[n].nom:("#"+n);
const surnom=n=>BYNUM[n]?BYNUM[n].nom.split(' ').slice(-1)[0]:("#"+n);
const role=n=>BYNUM[n]?BYNUM[n].role:"";

/* ---------- moteur de constructibilité ---------- */
function* combos(arr,k,start=0,acc=[]){
  if(acc.length===k){yield acc.slice();return;}
  for(let i=start;i<arr.length;i++){acc.push(arr[i]);yield* combos(arr,k,i+1,acc);acc.pop();}
}
function isole(trio,present){
  const pub=present.map(n=>BYNUM[n].pub), pos={};present.forEach((n,i)=>pos[n]=i);
  const t=trio.map(n=>pos[n]);
  const shared=NEUTRAL.filter(d=>pub[t[0]][d]===pub[t[1]][d]&&pub[t[1]][d]===pub[t[2]][d]);
  for(let k=2;k<=shared.length;k++)for(const c of combos(shared,k)){
    const vals={};c.forEach(d=>vals[d]=pub[t[0]][d]);
    const match=present.map((n,i)=>i).filter(i=>c.every(d=>pub[i][d]===vals[d]));
    if(match.length===3&&t.every(x=>match.includes(x)))return{combo:c,vals};
  }
  return null;
}
function cerclesValides(present){const out=[];for(const trio of combos(present,3)){const r=isole(trio,present);if(r)out.push({trio:trio.slice(),iso:r});}return out;}

/* fausse piste : trait partagé par >=3 présents, incluant <=1 membre du Cercle */
function fausse(present,cercle,isoDims){
  const cand=[];
  for(const d of NEUTRAL.concat(['pilosite'])){
    const groups={};present.forEach(n=>{(groups[BYNUM[n].pub[d]]=groups[BYNUM[n].pub[d]]||[]).push(n);});
    for(const v in groups){
      if(isoDims.includes(d)&&groups[v].some(n=>cercle.includes(n)&&BYNUM[n].pub[d]===v)&&groups[v].filter(n=>cercle.includes(n)).length===3)continue;
      const inC=groups[v].filter(n=>cercle.includes(n)).length;
      if(groups[v].length>=3&&inC<=1)cand.push({d,v,membres:groups[v],inC});
    }
  }
  cand.sort((a,b)=>b.inC-a.inC||b.membres.length-a.membres.length);
  return cand[0]||null;
}

/* ---------- rendu Cercle ---------- */
function cercleBlock(coupable,leurres,iso){
  const indices=Object.entries(iso.vals).map(([d,v])=>phrase(d,v));
  let h='<div class="card"><h3 class="sub">Les 3 suspects (le Cercle)</h3>';
  h+=`<div class="suspect coup"><b>${nom(coupable)}</b> <span class="muted">— ${role(coupable)}</span> · <b class="ox">COUPABLE</b></div>`;
  leurres.forEach(l=>h+=`<div class="suspect"><b>${nom(l)}</b> <span class="muted">— ${role(l)}</span> · leurre innocent</div>`);
  h+='</div>';
  h+='<div class="card"><h3 class="sub">Indices-vérité à révéler (flou → décisif)</h3><ul>';
  indices.forEach(i=>h+=`<li>🟢 « ${i} »</li>`);
  h+=`</ul><div class="tip">Ces ${indices.length} traits, croisés, isolent <b>exactement</b> ces trois suspects.</div></div>`;
  h+='<div class="card"><h3 class="sub">Aligner Secrets &amp; Rumeurs</h3><table><tr><th>Suspect</th><th>Carte Secret à donner</th></tr>';
  h+=`<tr><td><b>${surnom(coupable)}</b> (Coupable)</td><td>Secret <b>accablant</b> (2 faits à charge, <b>aucune décharge</b>) → aucune exonération.</td></tr>`;
  leurres.forEach(l=>h+=`<tr><td>${surnom(l)} (leurre)</td><td>Secret contenant <b>« ${BYNUM[l].rumeur_decharge} »</b> <span class="muted">(sa Rumeur-décharge)</span> → il se blanchit.</td></tr>`);
  h+='</table><p class="muted" style="font-size:13px">Mettez en jeu les Rumeurs des 3 suspects + du bruit. Les leurres ont une décharge vraie ; le Coupable, aucune.</p></div>';
  return h;
}

/* ---------- TABLE : composition ---------- */
function compoRow(n){return DATA.table.find(x=>x.n===n);}
function renderCompo(n){
  const r=compoRow(n);if(!r)return;
  const malf=r.comp>0?`1 Coupable + ${r.comp} Complice${r.comp>1?'s':''}`:'1 Coupable';
  let h=`<div class="card"><h3 class="sub">Répartition des camps</h3>
    <p><span class="pill">🕵️ ${r.enq} Enquêteurs</span> <span class="pill">🩸 ${malf}</span> <span class="pill">🎭 ${r.intr} Intrigant${r.intr>1?'s':''}</span></p>
    <p><span class="pill">⏳ ${r.tours} tours</span> <span class="pill">⚖️ ${r.actes} Actes d'accusation</span></p>`;
  if(r.carte!=='—'){
    const s=r.carte==='Complaisance'?"à un <b>Complice</b> (condamnation plus dure)":"à un <b>Enquêteur</b> (condamnation plus facile)";
    h+=`<div class="tip"><b>Carte d'équilibrage : ${r.carte}</b> — donnée ${s}, via un signe secret.</div>`;
  }
  if(n<=12)h+=`<div class="tip">🐦 <b>Table conseillée pour débuter :</b> activez <b>Le Corbeau</b> (un joueur tournant colporte une rumeur chaque tour) — il garantit la circulation de l'info et relève les chances des débutants.</div>`;
  h+='</div>';$('compo').innerHTML=h;
}

/* ---------- GÉNÉRATEUR DE PARTIE ---------- */
const VICTIMES=["Lord Ashcombe, le patriarche","Lady Ashcombe, la douairière","le vieux notaire Fairfax",
  "un invité de marque","le maître de maison","l'oncle fortuné venu de l'étranger","la riche veuve du domaine"];
const ARMES=["le poison dans le cognac","une chute dans le grand escalier","un coup porté dans l'ombre",
  "l'étouffement dans le cabinet","une lame dissimulée","une dose de trop"];
function genPartie(seed,forcedN){
  const rng=mulberry32(seed);
  const sizes=DATA.table.map(t=>t.n);
  const n=forcedN||sizes[Math.floor(rng()*sizes.length)];
  const r=compoRow(n);
  // roster + Cercle
  let present=null,valides=null;
  for(let att=0;att<40;att++){
    present=shuffle(DATA.cast.map(c=>c.num),rng).slice(0,n);
    valides=cerclesValides(present);
    if(valides.length)break;
  }
  if(!valides||!valides.length)return null;
  const pick=valides[Math.floor(rng()*valides.length)];
  const cercle=pick.trio;
  const coupable=cercle[Math.floor(rng()*3)];
  const leurres=cercle.filter(x=>x!==coupable);
  const rest=shuffle(present.filter(x=>!cercle.includes(x)),rng);
  const complices=rest.slice(0,r.comp);
  // intrigants : un leurre peut l'être + des présents restants
  const poolIntr=shuffle(present.filter(x=>x!==coupable&&!complices.includes(x)),rng);
  const intrigants=poolIntr.slice(0,r.intr);
  const enq=present.filter(x=>x!==coupable&&!complices.includes(x)&&!intrigants.includes(x));
  const fp=fausse(present,cercle,Object.keys(pick.iso.vals));
  return {seed,n,r,present,cercle,coupable,leurres,complices,intrigants,enq,iso:pick.iso,fp,
    victime:VICTIMES[Math.floor(rng()*VICTIMES.length)],arme:ARMES[Math.floor(rng()*ARMES.length)]};
}
function renderPartie(g){
  const malf=g.r.comp>0?`1 Coupable + ${g.r.comp} Complice(s)`:'1 Coupable';
  let h=`<div class="brief"><h2 class="sec" style="margin-top:0">Partie générée — ${g.n} joueurs</h2>`;
  h+=`<p><i>Un crime à Ravenswood : <b>${g.victime}</b> a péri — ${g.arme}. La tempête isole le manoir ; l'un des convives a frappé.</i></p>`;
  h+=`<p><span class="pill">🕵️ ${g.r.enq} Enq.</span> <span class="pill">🩸 ${malf}</span> <span class="pill">🎭 ${g.r.intr} Intr.</span> <span class="pill">⏳ ${g.r.tours} tours</span> <span class="pill">⚖️ ${g.r.actes} Actes</span>${g.r.carte!=='—'?' <span class="pill">⚖️ '+g.r.carte+'</span>':''}</p>`;
  h+=cercleBlock(g.coupable,g.leurres,g.iso);
  if(g.fp){h+=`<div class="card"><h3 class="sub">Fausse piste à glisser</h3><p>🔴 « ${phrase(g.fp.d,g.fp.v)} » — partagée par ${g.fp.membres.map(surnom).join(', ')} (dont un leurre), <b>jamais</b> le Coupable.</p></div>`;}
  h+=`<div class="card"><h3 class="sub">Distribution des rôles</h3>
    <p><b class="ox">Coupable</b> : ${nom(g.coupable)}</p>
    <p><b>Complices</b> : ${g.complices.length?g.complices.map(nom).join(' · '):'—'}</p>
    <p><b>Intrigants</b> : ${g.intrigants.length?g.intrigants.map(n=>surnom(n)).join(' · '):'—'}</p>
    <p><b>Enquêteurs</b> : ${g.enq.map(n=>'#'+n+' '+surnom(n)).join(' · ')}</p></div>`;
  h+=`<div class="seedbar"><span class="muted">Graine :</span> <code>${g.seed}-${g.n}</code>
     <button class="ghost" id="copyBrief">📋 Copier le brief</button>
     <button class="ghost" id="shareBrief">🔗 Lien partageable</button>
     <button class="ghost" id="printBrief">🖨 Imprimer</button></div></div>`;
  return h;
}
function briefText(g){
  const L=[];L.push(`L'HEURE DU CRIME — Partie générée (${g.n} joueurs, graine ${g.seed}-${g.n})`);
  L.push(`Victime (PNJ) : ${g.victime} — ${g.arme}.`);
  L.push(`Camps : ${g.r.enq} Enquêteurs · ${g.r.comp>0?'1 Coupable + '+g.r.comp+' Complice(s)':'1 Coupable'} · ${g.r.intr} Intrigant(s) · ${g.r.tours} tours · ${g.r.actes} Actes${g.r.carte!=='—'?' · carte '+g.r.carte:''}.`);
  L.push(`\nCERCLE : Coupable = ${nom(g.coupable)}. Leurres = ${g.leurres.map(nom).join(', ')}.`);
  L.push(`Indices-vérité : ${Object.entries(g.iso.vals).map(([d,v])=>phrase(d,v)).join(' ')}`);
  if(g.fp)L.push(`Fausse piste : ${phrase(g.fp.d,g.fp.v)} (dont un leurre, pas le Coupable).`);
  L.push(`Secrets : Coupable = accablant (aucune décharge). ${g.leurres.map(l=>surnom(l)+' = Secret « '+BYNUM[l].rumeur_decharge+' »').join(' ; ')}.`);
  L.push(`\nRôles : Complices = ${g.complices.map(nom).join(', ')||'—'} ; Intrigants = ${g.intrigants.map(surnom).join(', ')||'—'} ; Enquêteurs = ${g.enq.map(surnom).join(', ')}.`);
  return L.join('\n');
}
let CURGAME=null;
function doGen(seed,n){
  seed=seed||(Math.floor(Math.random()*1e9));
  const g=genPartie(seed>>>0,n||0);
  if(!g){$('autoOut').innerHTML='<div class="warn">Génération impossible, réessayez.</div>';return;}
  CURGAME=g;$('autoOut').innerHTML=renderPartie(g);
  try{history.replaceState(null,'','#g='+g.seed+'-'+g.n);}catch(e){}
  $('copyBrief').onclick=()=>{navigator.clipboard.writeText(briefText(g));$('copyBrief').textContent='✓ Copié';setTimeout(()=>$('copyBrief').textContent='📋 Copier le brief',1500);};
  $('shareBrief').onclick=()=>{const u=location.origin+location.pathname+'#g='+g.seed+'-'+g.n;navigator.clipboard.writeText(u);$('shareBrief').textContent='✓ Lien copié';setTimeout(()=>$('shareBrief').textContent='🔗 Lien partageable',1500);};
  $('printBrief').onclick=()=>window.print();
}

/* ---------- CERCLE sur mesure ---------- */
function selected(){return[...document.querySelectorAll('#castGrid input:checked')].map(i=>+i.value);}
function updateSel(){$('selCount').textContent=selected().length;}
function setSelection(nums){document.querySelectorAll('#castGrid input').forEach(i=>i.checked=nums.includes(+i.value));updateSel();}
function buildGrid(){
  const g=$('castGrid');g.innerHTML='';
  DATA.cast.forEach(c=>{const l=document.createElement('label');l.className='chk';
    l.innerHTML=`<input type="checkbox" value="${c.num}"> <span>#${c.num} ${surnom(c.num)} <span class="muted">(${c.genre})</span></span>`;g.appendChild(l);});
  g.addEventListener('change',updateSel);
}
function genCercle(){
  const present=selected(),out=$('cercleOut');
  if(present.length<8){out.innerHTML='<div class="warn">Cochez au moins 8 personnages présents.</div>';return;}
  const v=cerclesValides(present);
  if(!v.length){out.innerHTML='<div class="warn">Aucun Cercle-3 isolant. Ajoutez ou variez les personnages.</div>';return;}
  const p=v[Math.floor(Math.random()*v.length)],trio=p.trio,coup=trio[Math.floor(Math.random()*3)];
  out.innerHTML=cercleBlock(coup,trio.filter(x=>x!==coup),p.iso)+
    `<div class="rowflex"><button class="ghost" id="regen">↻ Autre Cercle</button><span class="muted">${v.length} Cercle(s) possible(s)</span></div>`;
  $('regen').onclick=genCercle;
}
function loadScenario(sc){
  const iso={combo:sc.traits.map(t=>t[0]),vals:Object.fromEntries(sc.traits.map(t=>[t[0],t[1]]))};
  const leurres=sc.cercle.filter(x=>x!==sc.coupable);
  $('cercleOut').innerHTML=`<h2 class="sec">Scénario ${sc.id} — « ${sc.titre} » <span class="muted" style="font-size:14px">(${sc.joueurs} j.)</span></h2>`+
    cercleBlock(sc.coupable,leurres,iso)+
    `<div class="card"><h3 class="sub">Rôles</h3><p><b>Complices</b> : ${sc.complices.map(nom).join(' · ')}</p>
     <p><b>Intrigants</b> : ${sc.intrigants.map(surnom).join(' · ')}</p>
     <p><b>Enquêteurs</b> : ${sc.enq.map(n=>'#'+n).join(' · ')}</p>
     <p class="muted" style="font-size:13px">Victime (PNJ) : ${sc.victime}.</p></div>`;
  $('cercleOut').scrollIntoView({behavior:'smooth'});
}

/* ---------- SON : carillon Web Audio ---------- */
let AC=null;
function bell(freq,t0,dur){
  const o=AC.createOscillator(),g=AC.createGain();
  o.type='triangle';o.frequency.value=freq;
  g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.35,t0+.01);
  g.gain.exponentialRampToValueAtTime(.0008,t0+dur);
  o.connect(g);g.connect(AC.destination);o.start(t0);o.stop(t0+dur);
}
function carillon(){
  if(!store.sound)return;
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    const t=AC.currentTime;[[880,0],[660,.28],[990,.56],[587,.9]].forEach(([f,d])=>bell(f,t+d,1.6));
  }catch(e){}
}

/* ---------- HORLOGE ---------- */
const clk={remain:600,dur:600,running:false,phase:0,phases:[{n:'Audience',m:10},{n:'Investigation',m:15},{n:'Délibéré',m:5}],iv:null};
function fmt(s){const m=Math.floor(s/60),ss=s%60;return m+':'+String(ss).padStart(2,'0');}
function drawClock(){
  const el=$('timer');el.textContent=fmt(Math.max(0,clk.remain));
  el.classList.toggle('low',clk.remain<=30&&clk.remain>0);
  el.classList.toggle('ring',clk.remain===0);
}
function setPhase(m,name,idx){clk.dur=m*60;clk.remain=m*60;if(name)$('phaseName').textContent=name;if(idx!=null)clk.phase=idx;stopClock();drawClock();
  document.querySelectorAll('#phaseBtns button').forEach(b=>b.classList.toggle('sel',+b.dataset.min===m&&b.dataset.name===name));}
function tick(){if(clk.remain>0){clk.remain--;drawClock();if(clk.remain===0)chime();}}
function startClock(){if(clk.running)return;if(clk.remain<=0)return;clk.running=true;$('startBtn').textContent='⏸ Pause';clk.iv=setInterval(tick,1000);}
function stopClock(){clk.running=false;if($('startBtn'))$('startBtn').textContent='▶ Démarrer';if(clk.iv)clearInterval(clk.iv);}
function chime(){stopClock();carillon();const c=$('chime');c.classList.remove('on');void c.offsetWidth;c.classList.add('on');drawClock();}

/* ---------- CONDUITE : compteurs + persistance ---------- */
function counter(valId,minId,plusId,min,max,key){
  const el=$(valId);el.textContent=store[key];
  const set=x=>{store[key]=Math.max(min,Math.min(max,x));el.textContent=store[key];save();};
  $(minId).onclick=()=>set(store[key]-1);$(plusId).onclick=()=>set(store[key]+1);
}
function renderClues(){
  const ul=$('clueList');ul.innerHTML='';
  store.clues.forEach((c,i)=>{const li=document.createElement('li');li.textContent=c;
    li.onclick=()=>{store.clues.splice(i,1);save();renderClues();};ul.appendChild(li);});
}

/* ---------- THÈME / SON ---------- */
function applyTheme(){document.documentElement.setAttribute('data-theme',store.theme);
  $('themeBtn').textContent=store.theme==='night'?'☀':'☾';
  document.querySelector('meta[name=theme-color]').setAttribute('content',store.theme==='night'?'#141019':'#6e222b');}
function applySound(){$('soundBtn').textContent=store.sound?'🔔':'🔕';}

/* ---------- INIT ---------- */
function init(){
  load();applyTheme();applySound();
  // tabs
  document.querySelectorAll('nav.tabs button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('section.panel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');$(b.dataset.tab).classList.add('active');window.scrollTo({top:0,behavior:'smooth'});
  });
  // toggles
  $('themeBtn').onclick=()=>{store.theme=store.theme==='night'?'day':'night';applyTheme();save();};
  $('soundBtn').onclick=()=>{store.sound=!store.sound;applySound();save();if(store.sound)carillon();};
  // table
  const sel=$('npl');for(let n=8;n<=20;n++){const o=document.createElement('option');o.value=n;o.textContent=n;if(n===12)o.selected=true;sel.appendChild(o);}
  const an=$('autoN');DATA.table.forEach(t=>{const o=document.createElement('option');o.value=t.n;o.textContent=t.n+' joueurs';an.appendChild(o);});
  sel.onchange=()=>renderCompo(+sel.value);renderCompo(12);
  // générateur
  $('autoGen').onclick=()=>doGen(null,+$('autoN').value);
  buildGrid();$('genCercle').onclick=genCercle;
  $('selClear').onclick=()=>setSelection([]);
  $('selDefault').onclick=()=>setSelection([1,2,3,4,6,10,12,13,15,24,26,28,29,31]);
  const sb=$('scenBtns');DATA.scenarios.forEach(s=>{const btn=document.createElement('button');btn.className='act';
    btn.innerHTML=`Scénario ${s.id} <span style="font-weight:400">· ${s.joueurs} j.</span>`;btn.onclick=()=>loadScenario(s);sb.appendChild(btn);});
  // horloge
  drawClock();$('phaseName').textContent=clk.phases[0].n;
  document.querySelectorAll('#phaseBtns button').forEach((b,i)=>b.onclick=()=>setPhase(+b.dataset.min,b.dataset.name,i));
  $('setCustom').onclick=()=>{const m=Math.max(1,Math.min(60,+$('customMin').value||10));setPhase(m,'Minuteur');};
  $('startBtn').onclick=()=>{if(!AC&&store.sound){try{AC=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}clk.running?stopClock():startClock();};
  $('resetBtn').onclick=()=>{clk.remain=clk.dur;stopClock();drawClock();};
  $('minus1').onclick=()=>{clk.remain=Math.max(0,clk.remain-60);drawClock();};
  $('plus1').onclick=()=>{clk.remain+=60;drawClock();};
  $('nextPhase').onclick=()=>{clk.phase=(clk.phase+1)%clk.phases.length;const p=clk.phases[clk.phase];setPhase(p.m,p.n,clk.phase);};
  // conduite
  counter('actVal','actMinus','actPlus',0,3,'acts');
  counter('tourVal','tourMinus','tourPlus',1,6,'tour');
  const ouv=document.querySelectorAll('#ouverture li');
  ouv.forEach((li,i)=>{if(store.ouverture[i])li.classList.add('done');
    li.onclick=()=>{li.classList.toggle('done');store.ouverture[i]=li.classList.contains('done');save();};});
  $('addClue').onclick=()=>{const v=$('clueInput').value.trim();if(v){store.clues.push(v);$('clueInput').value='';save();renderClues();}};
  $('clueInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('addClue').click();});
  renderClues();
  $('resetSession').onclick=()=>{if(confirm('Nouvelle partie : remettre à zéro les compteurs, l\'ouverture et le mur d\'enquête ?')){
    store.acts=2;store.tour=1;store.ouverture=[];store.clues=[];save();
    $('actVal').textContent=2;$('tourVal').textContent=1;ouv.forEach(li=>li.classList.remove('done'));renderClues();}};
  // deep link (#g=seed-n)
  const m=location.hash.match(/g=(\d+)-(\d+)/);
  if(m){$('autoN').value=m[2];doGen(+m[1],+m[2]);
    document.querySelector('nav.tabs button[data-tab="generateur"]').click();}
}

fetch('data.json').then(r=>r.json()).then(d=>{DATA=d;BYNUM=Object.fromEntries(d.cast.map(c=>[c.num,c]));init();})
  .catch(e=>{document.querySelector('main').innerHTML='<div class="warn">Erreur de chargement ('+e+').</div>';});
