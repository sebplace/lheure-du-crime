'use strict';
let DATA=null, BYNUM={};
const NEUTRAL=["main","bague","cheveux","silhouette","signe"];

// ---- phrasing des Indices ----
const PHRASE={
  main:{Gaucher:"est gaucher",Droitier:"est droitier"},
  bague:{Chevalière:"porte une chevalière",Alliance:"porte une alliance",Aucune:"ne porte aucune bague"},
  cheveux:{Bruns:"a les cheveux bruns",Noirs:"a les cheveux noirs",Blonds:"est blond",
    "Poivre-et-sel":"a les cheveux poivre-et-sel",Roux:"est roux",Chauve:"est chauve"},
  silhouette:{Grand:"est de grande taille",Petit:"est de petite taille",Mince:"est mince",Corpulent:"est de forte carrure"},
  signe:{Canne:"porte une canne",Lorgnon:"porte un lorgnon",Cicatrice:"a une cicatrice",
    "Grain de beauté":"a un grain de beauté visible",Aucun:"n'a aucun signe distinctif"}
};
const phrase=(d,v)=> "Le meurtrier "+((PHRASE[d]&&PHRASE[d][v])||(d+" = "+v))+".";
const nom=n=>BYNUM[n]?BYNUM[n].nom:("#"+n);
const role=n=>BYNUM[n]?BYNUM[n].role:"";

// ---- combinatoire ----
function* combos(arr,k,start=0,acc=[]){
  if(acc.length===k){yield acc.slice();return;}
  for(let i=start;i<arr.length;i++){acc.push(arr[i]); yield* combos(arr,k,i+1,acc); acc.pop();}
}
// le trio (nums) est-il isolé (>=2 traits) parmi les présents ?
function isole(trio, present){
  const pub=present.map(n=>BYNUM[n].pub);
  const pos=Object.fromEntries(present.map((n,i)=>[n,i]));
  const t=trio.map(n=>pos[n]);
  const shared=NEUTRAL.filter(d=>pub[t[0]][d]===pub[t[1]][d] && pub[t[1]][d]===pub[t[2]][d]);
  for(let k=2;k<=shared.length;k++){
    for(const combo of combos(shared,k)){
      const vals={}; combo.forEach(d=>vals[d]=pub[t[0]][d]);
      const match=present.map((n,i)=>i).filter(i=>combo.every(d=>pub[i][d]===vals[d]));
      if(match.length===3 && t.every(x=>match.includes(x))) return {combo,vals};
    }
  }
  return null;
}
// trouve tous les Cercles isolants parmi les présents
function cerclesValides(present){
  const out=[];
  for(const trio of combos(present,3)){
    const r=isole(trio,present);
    if(r) out.push({trio:trio.slice(),iso:r});
  }
  return out;
}

// ---- rendu Cercle (scénario ou généré) ----
function renderCercle(coupable, leurres, iso, extra){
  const trioNames=[coupable,...leurres];
  const indices=Object.entries(iso.vals).map(([d,v])=>phrase(d,v));
  let h='<div class="card">';
  h+='<h3 class="sub">Les 3 suspects (le Cercle)</h3>';
  h+=`<div class="suspect coup"><b>${nom(coupable)}</b> <span class="muted">— ${role(coupable)}</span> · <b class="ox">COUPABLE</b></div>`;
  leurres.forEach(l=>{ h+=`<div class="suspect"><b>${nom(l)}</b> <span class="muted">— ${role(l)}</span> · leurre innocent</div>`; });
  h+='</div>';

  h+='<div class="card"><h3 class="sub">Indices-vérité à révéler (du plus flou au plus décisif)</h3><ul>';
  indices.forEach(i=>h+=`<li>🟢 « ${i} »</li>`); h+='</ul>';
  h+='<div class="tip">Ces '+indices.length+' traits, croisés, isolent <b>exactement</b> ces trois suspects. Ne révélez jamais un trait qui trancherait seul.</div></div>';

  h+='<div class="card"><h3 class="sub">Aligner Secrets &amp; Rumeurs</h3><table>';
  h+='<tr><th>Suspect</th><th>Carte Secret à donner</th></tr>';
  h+=`<tr><td><b>${nom(coupable)}</b> (Coupable)</td><td>une carte Secret <b>accablante</b> (2 faits à charge, <b>aucune décharge</b>) → aucune exonération, il ne peut que bluffer.</td></tr>`;
  leurres.forEach(l=>{
    const dech=BYNUM[l].rumeur_decharge;
    h+=`<tr><td>${nom(l)} (leurre)</td><td>une carte Secret contenant <b>« ${dech} »</b> <span class="muted">(sa Rumeur-décharge)</span> → il se blanchit.</td></tr>`;
  });
  h+='</table>';
  h+='<p class="muted" style="font-size:13px">Mettez en jeu les cartes Rumeur des 3 suspects (charge + décharge) + du bruit. Les deux leurres ont une décharge <b>vraie</b> ; le Coupable, aucune.</p>';
  h+='</div>';

  if(extra) h+=extra;
  return h;
}

// ---- TABLE : composition ----
function renderCompo(n){
  const r=DATA.table.find(x=>x.n===n);
  if(!r) return;
  const malf = r.comp>0 ? `1 Coupable + ${r.comp} Complice${r.comp>1?'s':''}` : '1 Coupable';
  let h=`<div class="card"><div class="rowflex" style="justify-content:space-between">
    <div><h3 class="sub">Répartition des camps</h3>
      <p><span class="pill">🕵️ ${r.enq} Enquêteurs</span> <span class="pill">🩸 ${malf}</span> <span class="pill">🎭 ${r.intr} Intrigant${r.intr>1?'s':''}</span></p>
      <p><span class="pill">⏳ ${r.tours} tours</span> <span class="pill">⚖️ ${r.actes} Actes d'accusation</span></p>
    </div></div>`;
  if(r.carte!=='—'){
    const sens = r.carte==='Complaisance' ? "donnée à un <b>Complice</b> (rend la condamnation plus dure)"
                                          : "donnée à un <b>Enquêteur</b> (rend la condamnation plus facile)";
    h+=`<div class="tip"><b>Carte d'équilibrage : ${r.carte}</b> — ${sens}, via un signe secret convenu avec vous.</div>`;
  }
  if(n<=12) h+=`<div class="tip">🐦 <b>Table conseillée pour débuter :</b> activez <b>Le Corbeau</b> — un joueur tournant doit colporter une rumeur chaque tour. Il garantit la circulation de l'information (les débutants la font mal) et relève leurs chances.</div>`;
  h+=`</div>`;
  document.getElementById('compo').innerHTML=h;
}

// ---- CERCLE : cast grid + génération ----
function buildCastGrid(){
  const g=document.getElementById('castGrid'); g.innerHTML='';
  DATA.cast.forEach(c=>{
    const id='c'+c.num;
    const el=document.createElement('label'); el.className='chk';
    el.innerHTML=`<input type="checkbox" value="${c.num}" id="${id}"> <span>#${c.num} ${c.nom.split(' ').slice(-1)[0]} <span class="muted">(${c.genre})</span></span>`;
    g.appendChild(el);
  });
  g.addEventListener('change',updateSelCount);
}
function selected(){return [...document.querySelectorAll('#castGrid input:checked')].map(i=>+i.value);}
function updateSelCount(){document.getElementById('selCount').textContent=selected().length;}
function setSelection(nums){
  document.querySelectorAll('#castGrid input').forEach(i=>i.checked=nums.includes(+i.value));
  updateSelCount();
}
function generate(){
  const present=selected();
  const out=document.getElementById('cercleOut');
  if(present.length<8){out.innerHTML='<div class="warn">Cochez au moins 8 personnages présents.</div>';return;}
  const valides=cerclesValides(present);
  if(!valides.length){out.innerHTML='<div class="warn">Aucun Cercle-3 isolant avec cette sélection. Ajoutez ou changez quelques personnages (les groupes plus grands ou plus variés en trouvent presque toujours un).</div>';return;}
  const pick=valides[Math.floor(Math.random()*valides.length)];
  const trio=pick.trio;
  const coupable=trio[Math.floor(Math.random()*3)];
  const leurres=trio.filter(x=>x!==coupable);
  const extra=`<div class="rowflex"><button class="ghost" id="regen">↻ Autre Cercle</button>
    <span class="muted">${valides.length} Cercle(s) isolant(s) possible(s) dans cette sélection</span></div>`;
  out.innerHTML=renderCercle(coupable,leurres,pick.iso,extra);
  document.getElementById('regen').onclick=generate;
}

// ---- scénarios ----
function loadScenario(sc){
  const leurres=sc.cercle.filter(x=>x!==sc.coupable);
  const iso={combo:sc.traits.map(t=>t[0]),vals:Object.fromEntries(sc.traits.map(t=>[t[0],t[1]]))};
  const roster=`<div class="card"><h3 class="sub">Distribution des rôles</h3>
    <p><b class="ox">Coupable</b> : ${nom(sc.coupable)}</p>
    <p><b>Complices</b> : ${sc.complices.map(nom).join(' · ')}</p>
    <p><b>Intrigants</b> : ${sc.intrigants.map(nom).join(' · ')}</p>
    <p><b>Enquêteurs</b> (compléter selon la taille) : ${sc.enq.map(n=>'#'+n).join(' · ')}</p>
    <p class="muted" style="font-size:13px">Victime (PNJ) : ${sc.victime}.</p></div>`;
  document.getElementById('cercleOut').innerHTML=
    `<h2 class="sec">Scénario ${sc.id} — « ${sc.titre} » <span class="muted" style="font-size:14px">(${sc.joueurs} j.)</span></h2>`+
    renderCercle(sc.coupable,leurres,iso,roster);
  document.getElementById('cercle').scrollIntoView({behavior:'smooth'});
}

// ---- conduite : compteurs + checklist ----
function counter(valId, minId, plusId, min, max, start){
  let v=start; const el=document.getElementById(valId);
  const set=x=>{v=Math.max(min,Math.min(max,x));el.textContent=v;};
  document.getElementById(minId).onclick=()=>set(v-1);
  document.getElementById(plusId).onclick=()=>set(v+1);
}

// ---- init ----
function init(){
  // tabs
  document.querySelectorAll('nav.tabs button').forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll('nav.tabs button').forEach(x=>x.classList.remove('active'));
      document.querySelectorAll('section.panel').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById(b.dataset.tab).classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
    };
  });
  // table select
  const sel=document.getElementById('npl');
  for(let n=8;n<=20;n++){const o=document.createElement('option');o.value=n;o.textContent=n;if(n===12)o.selected=true;sel.appendChild(o);}
  sel.onchange=()=>renderCompo(+sel.value);
  renderCompo(12);
  // cercle
  buildCastGrid();
  document.getElementById('genCercle').onclick=generate;
  document.getElementById('selClear').onclick=()=>setSelection([]);
  document.getElementById('selDefault').onclick=()=>setSelection([1,2,3,4,6,10,12,13,15,24,26,28,29,31]);
  // scenario buttons
  const sb=document.getElementById('scenBtns');
  DATA.scenarios.forEach(s=>{
    const btn=document.createElement('button'); btn.className='act';
    btn.innerHTML=`Scénario ${s.id} <span style="font-weight:400">· ${s.joueurs} j.</span>`;
    btn.onclick=()=>loadScenario(s); sb.appendChild(btn);
  });
  // conduite
  counter('actVal','actMinus','actPlus',0,2,2);
  counter('tourVal','tourMinus','tourPlus',1,6,1);
  document.querySelectorAll('#ouverture li').forEach(li=>li.onclick=()=>li.classList.toggle('done'));
}

fetch('data.json').then(r=>r.json()).then(d=>{
  DATA=d; BYNUM=Object.fromEntries(d.cast.map(c=>[c.num,c])); init();
}).catch(e=>{document.querySelector('main').innerHTML='<div class="warn">Erreur de chargement des données ('+e+').</div>';});
