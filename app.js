/* L'Heure du Crime — Console du Meneur de Jeu — v3
   100% navigateur, hors-ligne, sans serveur. Génération déterministe par graine. */
'use strict';

/* ============ utilitaires ============ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(arr, rng){ const a = arr.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/* ============ état global ============ */
let DATA = null, BYNUM = {}, NEUTRAL = [], LABELS = {};
const LSK = 'hdc_mj_v3', LIBK = 'hdc_mj_lib_v3', CURK = 'hdc_mj_cur_v3';
const store = Object.assign({ theme: 'day', sound: true, ambVol: 0.5, fontScale: 1, acc: {}, seenWelcome: false, comfort: false }, load(LSK));
let LIB = load(LIBK) || [];
let CURGAME = load(CURK) || null;

function load(k){ try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }
function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
const persist = () => save(LSK, { theme: store.theme, sound: store.sound, ambVol: store.ambVol, fontScale: store.fontScale, acc: store.acc, seenWelcome: store.seenWelcome, comfort: store.comfort });
const persistCur = () => save(CURK, CURGAME);
const persistLib = () => save(LIBK, LIB);

/* ============ classification des Atouts ============ */
const INFO = ['Le Médium', 'Le Légiste', 'Le Détective', 'Le Notaire', 'Le Psychologue', 'Le Commissaire', 'Le Journaliste', 'Le Fouineur', 'Le Majordome', "L'Archiviste"];
const PROTECT = ['Le Confesseur'];
const ANTIPERT = ["L'Avocat", "L'Enquêteur de terrain"];
const PERT = ['Le Maquilleur', "L'Étouffeur", 'Le Faussaire', "L'Usurpateur", 'Le Corrupteur'];
const MALF_DEF = ['Le Complice', 'Le Bouc émissaire', "L'Ombre"];

/* ============ narratif ============ */
const VICTIMES = [
  ['Lord Ashcombe', 'empoisonné au porto'], ['Lady Ravenscroft', 'étranglée dans la bibliothèque'],
  ['Sir Edmund Vale', 'poignardé près de la serre'], ['la Comtesse de Merteuil', 'précipitée du belvédère'],
  ['le colonel Harding', 'abattu dans le fumoir'], ['le notaire Crane', 'noyé dans le bassin'],
  ['Mme de Vessac', 'foudroyée par un cordial'], ['le banquier Osborne', 'étouffé sous un oreiller'],
];
const MOBILES = [
  'un héritage qu\'on lui refusait', 'une dette de jeu impossible à honorer',
  'un secret que la victime menaçait d\'ébruiter', 'une vieille vengeance enfin mûre',
  'une passion éconduite tournée à la haine', 'une fraude sur le point d\'éclater',
  'une place au domaine qu\'on allait lui retirer', 'un chantage qui avait trop duré',
];
const REDH = [
  'on l\'a vu·e rôder près des lieux peu avant l\'heure du crime',
  'une vieille querelle publique l\'opposait à la victime',
  'son emploi du temps de la soirée comporte un trou inexpliqué',
  'un objet lui appartenant a été retrouvé tout près du corps',
  'il·elle avait tout à gagner à la disparition de la victime',
];
const COMP_WHY = [
  'lié·e au Coupable par une dette ancienne', 'uni·e au Coupable par un secret partagé',
  'a tout à perdre si le Coupable tombe', 'agit par loyauté aveugle envers le Coupable',
];

/* ============ boot ============ */
fetch('data.json').then(r => r.json()).then(d => {
  DATA = d; NEUTRAL = d.neutral_dims; LABELS = d.labels;
  d.cast.forEach(c => BYNUM[c.num] = c);
  initTheme(); initTabs(); initHeader(); initTable(); initPartie(); initClock(); initBoite(); initAmbiance(); initA11y(); initStatus(); initCastFilter(); registerSW();
  renderLibrary(); renderDashboard(); renderRoles();
  handleHash(); maybeWelcome();
}).catch(e => { document.querySelector('main').innerHTML = '<p class="warn">Impossible de charger les données du jeu.</p>'; console.error(e); });

/* ============ thème / son / onglets / header ============ */
function initTheme(){ document.documentElement.dataset.theme = store.theme; syncThemeBtn(); }
function syncThemeBtn(){ const b = $('#themeBtn'); if (b) b.textContent = store.theme === 'night' ? '☀' : '☾'; }
function syncSoundBtn(){ const b = $('#soundBtn'); if (b) b.textContent = store.sound ? '🔔' : '🔕'; }

function initTabs(){
  $$('.tabs button').forEach(b => b.onclick = () => {
    $$('.tabs button').forEach(x => x.classList.remove('active'));
    $$('main .panel').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); $('#' + b.dataset.tab).classList.add('active');
    if (b.dataset.tab === 'enjeu') renderDashboard();
    if (b.dataset.tab === 'roles') renderRoles();
    if (b.dataset.tab === 'boite') refreshBoiteGame();
    paintStatus();
    window.scrollTo(0, 0);
  });
}
function goTab(name){ const b = $(`.tabs button[data-tab="${name}"]`); if (b) b.click(); }

function initHeader(){
  syncSoundBtn();
  $('#hideBtn').onclick = () => { const p = $('#projection'); if (p.classList.contains('on')) { p.classList.remove('on'); } else { openProjection(); } };
  $('#themeBtn').onclick = () => { store.theme = store.theme === 'night' ? 'day' : 'night'; document.documentElement.dataset.theme = store.theme; syncThemeBtn(); persist(); };
  $('#soundBtn').onclick = () => { store.sound = !store.sound; syncSoundBtn(); persist(); if (store.sound) bell(880, 0, .3); };
  // installation PWA
  let deferred = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').style.display = ''; });
  $('#installBtn').onclick = async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').style.display = 'none'; };
}

/* ============ audio ============ */
let AC = null;
function ac(){ if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); return AC; }
function bell(freq, t0, dur, type){ if (!store.sound) return; const c = ac(); const o = c.createOscillator(), g = c.createGain(); o.type = type || 'triangle'; o.frequency.value = freq; const t = c.currentTime + t0; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05); }
function carillon(){ [[659, 0], [523, .28], [587, .56], [392, .9]].forEach(([f, t]) => bell(f, t, .9)); haptic([30, 40, 30]); }
function glas(){ [0, .9, 1.8].forEach(t => bell(147, t, 1.6, 'sine')); }   // 2e meurtre
function maillet(){ bell(196, 0, .12, 'square'); bell(160, .14, .18, 'square'); } // accusation
function haptic(pattern){ try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {} }

/* ============ TABLE (composition §12.1) ============ */
function initTable(){
  const sel = $('#npl'); DATA.table.forEach(t => sel.appendChild(new Option(t.n + ' joueurs', t.n)));
  sel.value = 14; sel.onchange = renderCompo; renderCompo();
}
function renderCompo(){
  const n = +$('#npl').value, t = DATA.table.find(x => x.n === n); if (!t) return;
  const cells = [['Enquêteurs', t.enq, 'enq'], ['Coupable', t.coup, 'coup'], ['Complice', t.comp, 'malf'], ['Intrigant', t.intr, 'intr']]
    .filter(c => c[1] > 0).map(([lab, v, k]) => `<div class="dash-mini"><div class="k">${lab}</div><div class="v">${v}</div><div class="tag ${k}" style="margin-top:4px">${k === 'enq' ? 'Enquête' : k === 'coup' ? 'Meurtre' : k === 'malf' ? 'Malfaiteur' : 'Intrigue'}</div></div>`).join('');
  $('#compo').innerHTML = `<div class="dash-top" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${cells}</div>
    <table><tr><th>Paramètre</th><th>Valeur</th></tr>
      <tr><td>Tours d'enquête</td><td>${t.tours}</td></tr>
      <tr><td>Actes d'accusation</td><td><b>${t.actes}</b></td></tr>
      <tr><td>Corbeau (dernier indice)</td><td>${n <= 12 ? 'Recommandé (débutants)' : 'Optionnel'}</td></tr>
      <tr><td>Carte d'équilibrage</td><td>${t.carte && t.carte !== 'â€”' ? t.carte : '—'}</td></tr>
    </table>
    <div class="tip">Répartition recommandée pour ${n} joueurs. Le Meneur ne compte pas dans ce total.</div>`;
}

/* ============ moteur de constructibilité (Cercle) ============ */
/* Règle du jeu : le Cercle est isolé par l'INTERSECTION d'au moins deux traits publics
   flous — pas par un trait unique. Il faut qu'existe une paire de traits partagés par les
   trois dont aucun autre présent ne réunit les deux valeurs. */
function sharedDims(trio){
  return NEUTRAL.filter(d => { const v = BYNUM[trio[0]].pub[d]; return BYNUM[trio[1]].pub[d] === v && BYNUM[trio[2]].pub[d] === v; });
}
function pairIsole(trio, present, d1, d2){
  const v1 = BYNUM[trio[0]].pub[d1], v2 = BYNUM[trio[0]].pub[d2];
  return !present.some(p => !trio.includes(p) && BYNUM[p].pub[d1] === v1 && BYNUM[p].pub[d2] === v2);
}
function isolatingPair(trio, present){
  const S = sharedDims(trio);
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++)
    if (pairIsole(trio, present, S[i], S[j])) return [S[i], S[j]];
  return null;
}
function isole(trio, present){ return !!isolatingPair(trio, present); }
function sharedTraits(trio, present){
  const pr = isolatingPair(trio, present);
  const dims = pr || sharedDims(trio);
  return dims.map(d => [d, BYNUM[trio[0]].pub[d]]);
}
function cerclesValides(present, rng){
  const res = []; const P = present;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) for (let k = j + 1; k < P.length; k++){
    const trio = [P[i], P[j], P[k]]; if (isole(trio, P)) res.push(trio);
  }
  return rng ? shuffle(res, rng) : res;
}

/* ============ PHRASE (indice depuis un trait) ============ */
const PHRASE = {
  main: { Gaucher: 'est gaucher·ère', Droitier: 'est droitier·ère' },
  bague: v => /^aucun/i.test(v) ? 'ne porte aucune bague' : `porte une ${v.toLowerCase()}`,
  cheveux: v => `a les cheveux ${v.toLowerCase()}`,
  silhouette: v => `est de silhouette ${v.toLowerCase()}`,
  signe: v => /^aucun/i.test(v) ? 'ne présente aucun signe particulier' : `se distingue par ${/^(canne|cicatrice)/i.test(v) ? 'une' : 'un'} ${v.toLowerCase()}`,
};
function indiceTxt(dim, val){
  let p; const f = PHRASE[dim];
  if (typeof f === 'function') p = f(val); else if (f && f[val]) p = f[val]; else p = `a « ${val} »`;
  return `Le meurtrier ${p}.`;
}

/* ============ PARTIE : génération complète ============ */
function initPartie(){
  const selN = $('#autoN'); DATA.table.forEach(t => selN.appendChild(new Option(t.n + ' joueurs', t.n)));
  $('#autoGen').onclick = () => { const seed = (Math.random() * 1e9) | 0; const n = +$('#autoN').value || 0; const diff = $('#diff').value; genererPartie(seed, n, diff); };
  // scénarios
  const sb = $('#scenBtns');
  DATA.scenarios.forEach(s => { const b = el('button', 'ghost', `${esc(s.titre)} <span class="muted">(${s.joueurs})</span>`); b.onclick = () => chargerScenario(s); sb.appendChild(b); });
  initCercleSurMesure();
}

function pickN(n, rng){ if (n) return n; const opts = DATA.table.map(t => t.n); return opts[Math.floor(rng() * opts.length)]; }

function genererPartie(seed, nWanted, diff){
  const rng = mulberry32(seed);
  const n = pickN(nWanted, rng);
  const t = DATA.table.find(x => x.n === n);
  // présents : on tire n personnages qui contiennent AU MOINS un Cercle isolé
  let present = null, cercle = null;
  for (let attempt = 0; attempt < 60 && !cercle; attempt++){
    present = shuffle(DATA.cast.map(c => c.num), rng).slice(0, n);
    const cs = cerclesValides(present, rng);
    if (cs.length) cercle = cs[0];
  }
  if (!cercle){ // repli : garantir un Cercle en forçant le premier scénario connu
    const s = DATA.scenarios[0]; cercle = s.cercle.slice();
    present = cercle.concat(shuffle(DATA.cast.map(c => c.num).filter(x => !cercle.includes(x)), rng).slice(0, n - 3));
  }
  const rngC = mulberry32(seed ^ 0x9e3779b9);
  const coupable = cercle[Math.floor(rngC() * 3)];
  const leurres = cercle.filter(x => x !== coupable);
  const iso = sharedTraits(cercle, present);
  // autres camps hors Cercle
  const rest = shuffle(present.filter(x => !cercle.includes(x)), rng);
  const complices = rest.slice(0, t.comp);
  const intrigants = rest.slice(t.comp, t.comp + t.intr);
  const enq = rest.slice(t.comp + t.intr).concat(leurres); // les 2 leurres sont des Enquêteurs (suspects innocents)
  // fausse piste : un trait neutre qui pointe un innocent hors Cercle (leurre public)
  let fp = null;
  for (const d of shuffle(NEUTRAL, rng)){
    const cand = enq.find(p => iso.every(([dd]) => dd !== d));
    if (cand){ fp = [d, BYNUM[cand].pub[d], cand]; break; }
  }
  const [vNom, vMort] = VICTIMES[Math.floor(rng() * VICTIMES.length)];
  const g = {
    id: seed + '-' + n, name: 'Partie ' + n + 'j', seed, n, diff,
    present, cercle, coupable, leurres, iso, fp,
    complices, intrigants, enq,
    victime: vNom, mort: vMort,
    mobile: MOBILES[Math.floor(rng() * MOBILES.length)],
    redh: leurres.map(() => REDH[Math.floor(rng() * REDH.length)]),
    corbeau: n <= 12,
    acts: t.actes, tour: 1, ouverture: [], clues: [], journal: [],
  };
  assignerRoles(g, mulberry32(seed ^ 0x1234abcd));
  batirIndices(g);
  CURGAME = g; persistCur();
  renderBrief(g); renderDashboard(); renderRoles(); syncGridToGame(g);
  return g;
}

function assignerRoles(g, rng){
  const players = [];
  players.push({ num: g.coupable, camp: 'malf', role: 'coupable', atout: 'Le Coupable' });
  // complices
  const compPool = g.diff === 'adv' ? shuffle(PERT.concat(['Le Bouc émissaire']), rng) : shuffle(MALF_DEF.concat(['Le Corrupteur']), rng);
  g.complices.forEach((num, i) => players.push({ num, camp: 'malf', role: 'complice', atout: i === 0 ? 'Le Complice' : (compPool[i % compPool.length]) }));
  // intrigants → objectifs
  const objs = shuffle(DATA.atouts.filter(a => a.camp === 'intr').map(a => a.nom), rng);
  g.intrigants.forEach((num, i) => players.push({ num, camp: 'intr', role: 'intrigant', atout: objs[i % objs.length] }));
  // enquêteurs : plancher d'info + Fouineur & Confesseur garantis
  const must = ['Le Fouineur', 'Le Confesseur'];
  let atts = must.filter((_, i) => i < g.enq.length).slice();
  const pool = shuffle(INFO.concat(ANTIPERT, g.diff === 'deb' ? PROTECT : []).filter(x => !must.includes(x)), rng);
  let pi = 0; while (atts.length < g.enq.length){ atts.push(pool[pi % pool.length]); pi++; }
  atts = shuffle(atts, rng);
  g.enq.forEach((num, i) => players.push({ num, camp: 'enq', role: 'enqueteur', atout: atts[i] }));
  // notes de Secret
  players.forEach(p => {
    if (p.role === 'coupable') p.secret = 'Secret ACCABLANT — deux faits à charge, aucune décharge.';
    else if (g.leurres.includes(p.num)) p.secret = 'Secret contenant « ' + (BYNUM[p.num].rumeur_decharge || '…') + " » (sa décharge, vraie — elle le blanchit).";
    else p.secret = 'Un Secret quelconque du vivier.';
    p.distribue = false;
  });
  // cible du Vengeur : un LEURRE (innocent DU Cercle) — seule cible réellement accusable via l'entonnoir public
  const veng = players.find(p => p.atout === 'Le Vengeur');
  if (veng && g.leurres.length) veng.cible = g.leurres[Math.floor(rng() * g.leurres.length)];
  // Notaire : connaît dès le départ le Secret d'un autre joueur (désigné par le MJ)
  const notaire = players.find(p => p.atout === 'Le Notaire');
  if (notaire){ const pool = players.filter(p => p.num !== notaire.num); if (pool.length) notaire.cible = pool[Math.floor(rng() * pool.length)].num; }
  players.sort((a, b) => g.present.indexOf(a.num) - g.present.indexOf(b.num));
  g.players = players;
}
/* Infos confidentielles propres à un rôle, à porter sur sa fiche (comme le MJ le ferait de vive voix). */
function hiddenIntel(g, p, full){
  const nm = num => full ? esc(BYNUM[num].nom) : esc(nomCourt(num));
  const L = [];
  if (p.role === 'coupable' && g.complices.length) L.push('🕵️ Vos complices : ' + g.complices.map(nm).join(', '));
  if (p.role === 'complice') L.push('🤝 Le Coupable est : ' + nm(g.coupable));
  if (p.atout === 'Le Vengeur' && p.cible) L.push('🎯 Cible (leurre) — à faire accuser OU tuer au 2ᵉ meurtre : ' + nm(p.cible));
  if (p.atout === 'Le Notaire' && p.cible) L.push('📜 Vous connaissez le Secret de : ' + nm(p.cible));
  return L;
}

function batirIndices(g){
  const T = [];
  const [d1, v1] = g.iso[0] || ['signe', '—'];
  const [d2, v2] = g.iso[1] || g.iso[0] || ['main', '—'];
  T.push({ tour: 1, items: [{ k: 'vrai', t: indiceTxt(d1, v1) }, g.fp ? { k: 'faux', t: 'Fausse piste : ' + indiceTxt(g.fp[0], g.fp[1]) + ' (mène à ' + nomCourt(g.fp[2]) + ', innocent).' } : null].filter(Boolean) });
  T.push({ tour: 2, items: [{ k: 'vrai', t: indiceTxt(d2, v2) }, { k: 'mobile', t: 'Le mobile affleure : ' + g.mobile + '.' }] });
  T.push({ tour: 3, items: [{ k: 'mobile', t: 'Un témoin recoupe le mobile : ' + g.mobile + ' — cela vise ' + nomCourt(g.coupable) + '.' }] });
  T.push({ tour: 4, items: [{ k: 'fantome', t: '👻 Dernier indice du Fantôme (après le 2ᵉ meurtre) : il désigne ' + nomCourt(g.coupable) + '.' }] });
  g.indices = T;
}
const nomCourt = num => { const c = BYNUM[num]; if (!c) return '#' + num; const p = c.nom.split(' '); return '#' + num + ' ' + p[p.length - 1]; };
const initiales = num => { const c = BYNUM[num]; if (!c) return '?'; const p = c.nom.replace(/^(Lord|Lady|Sir|Mme|M\.|Dr|Le|La|Miss|Colonel)\s+/i, '').split(' '); return (p[0][0] + (p[p.length - 1][0] || '')).toUpperCase(); };
function avatarHtml(num, cls, style){
  const c = BYNUM[num]; const extra = cls ? ' ' + cls : ''; const st = style ? ` style="${style}"` : '';
  if (c && c.portrait) return `<img class="avatar${extra}" src="${c.portrait}" alt="" loading="lazy"${st}>`;
  return `<div class="avatar${extra}"${st}>${initiales(num)}</div>`;
}
function atoutImg(nom, cls){
  const a = DATA.atouts.find(x => x.nom === nom);
  return a && a.img ? `<img class="atout-art${cls ? ' ' + cls : ''}" src="${a.img}" alt="" loading="lazy">` : '';
}

/* ---------- rendu Brief (onglet Partie) ---------- */
function renderBrief(g){
  const out = $('#autoOut'); if (!g){ out.innerHTML = ''; return; }
  const camps = c => c === 'enq' ? 'enq' : c === 'intr' ? 'intr' : 'malf';
  const suspLine = num => `<span class="tag ${num === g.coupable ? 'coup' : 'malf'}">${num === g.coupable ? 'Coupable' : 'Leurre'}</span> ${esc(BYNUM[num].nom)} <span class="muted">(${nomCourt(num)})</span>`;
  const indicesHtml = g.indices.map(tt => `<li><b>Tour ${tt.tour}${tt.tour === 4 ? ' (Fantôme)' : ''} :</b><ul>${tt.items.map(it => `<li class="ind-${it.k}">${esc(it.t)}</li>`).join('')}</ul></li>`).join('');
  const isoHtml = g.iso.map(([d, v]) => `${LABELS[d]} = <b>${esc(v)}</b>`).join(' · ');
  out.innerHTML = `
    <div class="brief">
      <div class="seedbar">
        <span class="muted">Graine <code>${g.seed}</code> · ${g.n} joueurs · ${diffLabel(g.diff)}</span>
        <span class="seedbar-btns">
          <button class="ghost" id="briefSave">💾 Enregistrer</button>
          <button class="ghost" id="briefCopy">⧉ Copier le brief</button>
          <button class="ghost no-print" id="briefPrint">🖨️ Imprimer</button>
          <button class="ghost" id="briefPlay">▶ Mener cette partie</button>
        </span>
      </div>
      <div class="card">
        <h3 class="fic">La scène</h3>
        <p><b>${esc(g.victime)}</b>, ${esc(g.mort)}. Trois suspects émergent — un seul a frappé.</p>
        <p class="muted">Cercle isolé par : ${isoHtml}</p>
      </div>
      <div class="card">
        <h3 class="fic">Le Cercle des trois</h3>
        <div>${g.cercle.map(num => `<div class="prow">${avatarHtml(num, num === g.coupable ? 'coup' : '')}<div class="who">${suspLine(num)}</div></div>`).join('')}</div>
        <p class="tip">Mobile du Coupable : <b>${esc(g.mobile)}</b>.</p>
      </div>
      <div class="card">
        <h3 class="fic">Distiller les indices</h3>
        <ul class="indices">${indicesHtml}</ul>
        <p class="tip">Les indices « vrai » resserrent le Cercle ; la « fausse piste » égare vers un innocent ; le « mobile » désigne le Coupable au fil des tours.</p>
      </div>
      <div class="card">
        <h3 class="fic">Les autres camps</h3>
        <p><b>Complices (${g.complices.length}) :</b> ${g.complices.map(nomCourt).map(esc).join(', ') || '—'} — ${esc(COMP_WHY[g.seed % COMP_WHY.length])}.</p>
        <p><b>Intrigants (${g.intrigants.length}) :</b> ${g.intrigants.map(nomCourt).map(esc).join(', ') || '—'} — chacun poursuit son Objectif secret.</p>
        <p><b>Enquêteurs :</b> ${g.enq.length} — voir l'onglet <b>Rôles</b> pour la distribution des Atouts et Secrets.</p>
      </div>
    </div>`;
  $('#briefSave').onclick = () => saveToLib(g);
  $('#briefCopy').onclick = () => copyBrief(g);
  $('#briefPrint').onclick = () => { goTab('partie'); window.print(); };
  $('#briefPlay').onclick = () => { CURGAME = g; persistCur(); renderDashboard(); goTab('enjeu'); };
}
const diffLabel = d => ({ deb: 'Débutant', int: 'Intermédiaire', adv: 'Avancé' }[d] || d);

function copyBrief(g){
  const L = [];
  L.push(`L'HEURE DU CRIME — brief MJ (graine ${g.seed}, ${g.n} joueurs, ${diffLabel(g.diff)})`);
  L.push(`Victime : ${g.victime}, ${g.mort}.`);
  L.push(`Cercle : ${g.cercle.map(nomCourt).join(', ')} — isolé par ${g.iso.map(([d, v]) => LABELS[d] + '=' + v).join(' + ')}.`);
  L.push(`COUPABLE : ${nomCourt(g.coupable)} — mobile : ${g.mobile}.`);
  L.push(`Leurres : ${g.leurres.map(nomCourt).join(', ')}.`);
  L.push('Indices :');
  g.indices.forEach(tt => tt.items.forEach(it => L.push(`  T${tt.tour} [${it.k}] ${it.t}`)));
  L.push(`Complices : ${g.complices.map(nomCourt).join(', ') || '—'}`);
  L.push(`Intrigants : ${g.intrigants.map(nomCourt).join(', ') || '—'}`);
  L.push('Rôles/Atouts :');
  g.players.forEach(p => { const intel = hiddenIntel(g, p).map(x => x.replace(/<[^>]+>/g, '')); L.push(`  ${nomCourt(p.num)} · ${p.camp} · ${p.atout} · ${p.secret}${intel.length ? '  [' + intel.join(' ; ') + ']' : ''}`); });
  navigator.clipboard.writeText(L.join('\n')).then(() => toast('Brief copié dans le presse-papiers.'));
}

/* ============ bibliothèque ============ */
function saveToLib(g){
  const name = prompt('Nom de la partie à enregistrer :', g.name + ' — ' + diffLabel(g.diff));
  if (name == null) return;
  g = JSON.parse(JSON.stringify(g)); g.name = name || g.name; g.savedAt = Date.now();
  LIB = LIB.filter(x => x.seed !== g.seed || x.n !== g.n); LIB.unshift(g);
  persistLib(); renderLibrary(); toast('Partie enregistrée.');
}
function renderLibrary(){
  const box = $('#library'); if (!box) return;
  if (!LIB.length){ box.innerHTML = '<p class="empty">Aucune partie enregistrée. Générez puis « Enregistrer ».</p>'; return; }
  box.innerHTML = '';
  LIB.forEach((g, i) => {
    const it = el('div', 'lib-item');
    it.innerHTML = `<div class="name">${esc(g.name)}<div class="muted" style="font-size:12px">${g.n} j · ${diffLabel(g.diff)} · graine ${g.seed}</div></div>
      <button class="ghost" data-a="load">Charger</button><button class="ghost" data-a="dup">Dupliquer</button><button class="ghost" data-a="del">✕</button>`;
    it.querySelector('[data-a="load"]').onclick = () => { CURGAME = JSON.parse(JSON.stringify(g)); persistCur(); renderBrief(CURGAME); renderDashboard(); renderRoles(); goTab('partie'); toast('Partie chargée.'); };
    it.querySelector('[data-a="dup"]').onclick = () => { genererPartie((Math.random() * 1e9) | 0, g.n, g.diff); toast('Nouvelle variante générée.'); };
    it.querySelector('[data-a="del"]').onclick = () => { if (confirm('Supprimer « ' + g.name + ' » ?')){ LIB.splice(i, 1); persistLib(); renderLibrary(); } };
    box.appendChild(it);
  });
}

/* ============ scénarios d'initiation ============ */
function chargerScenario(s){
  const present = s.cercle.concat(s.complices, s.intrigants, s.enq);
  const g = {
    id: 'scen-' + s.id, name: s.titre, seed: 'S' + s.id, n: present.length, diff: 'deb',
    present, cercle: s.cercle.slice(), coupable: s.coupable, leurres: s.cercle.filter(x => x !== s.coupable),
    iso: s.traits.slice(), fp: null, complices: s.complices.slice(), intrigants: s.intrigants.slice(),
    enq: s.enq.concat(s.cercle.filter(x => x !== s.coupable)), // + les 2 leurres du Cercle (Enquêteurs innocents)
    victime: s.victime.split('(')[0].trim(), mort: (s.victime.match(/\(([^)]+)\)/) || [, 'assassiné'])[1],
    mobile: MOBILES[s.id.charCodeAt(0) % MOBILES.length], redh: [], corbeau: true,
    acts: 2, tour: 1, ouverture: [], clues: [], journal: [], scenario: true,
  };
  assignerRoles(g, mulberry32(s.id.charCodeAt(0) * 7919));
  batirIndices(g);
  CURGAME = g; persistCur(); renderBrief(g); renderDashboard(); renderRoles(); syncGridToGame(g);
  $('#autoOut').scrollIntoView({ behavior: 'smooth' }); toast('Scénario « ' + s.titre + ' » chargé.');
  return g;
}

/* ============ Cercle sur mesure ============ */
function initCercleSurMesure(){
  const grid = $('#castGrid');
  DATA.cast.forEach(c => {
    const b = el('button', 'chip'); b.dataset.num = c.num;
    b.innerHTML = `<b>${nomCourt(c.num)}</b><span>${esc(c.role)}</span>`;
    b.onclick = () => { b.classList.toggle('on'); if (!b.classList.contains('on')) b.classList.remove('cercle'); updCount(); };
    grid.appendChild(b);
  });
  $('#selDefault').onclick = () => {
    let set, cercle, coup = null;
    if (CURGAME && CURGAME.present){ set = new Set(CURGAME.present); cercle = CURGAME.cercle; coup = CURGAME.coupable; }
    else { const def = DATA.scenarios[0]; set = new Set(def.cercle.concat(def.complices, def.intrigants, def.enq)); cercle = def.cercle; }
    $$('#castGrid .chip').forEach(b => b.classList.toggle('on', set.has(+b.dataset.num)));
    markCercleChips(cercle); updCount(); renderCercleFound(cercle, [...set], coup);
  };
  $('#selClear').onclick = () => { $$('#castGrid .chip').forEach(b => b.classList.remove('on', 'cercle')); updCount(); $('#cercleOut').innerHTML = ''; };
  $('#genCercle').onclick = trouverCercle;
  updCount(); updSelDefaultLabel();
}
const selNums = () => $$('#castGrid .chip.on').map(b => +b.dataset.num);
function updCount(){ $('#selCount').textContent = selNums().length; }
function markCercleChips(cercle){ const set = new Set(cercle || []); $$('#castGrid .chip').forEach(b => b.classList.toggle('cercle', set.has(+b.dataset.num))); }
function updSelDefaultLabel(){ const b = $('#selDefault'); if (b) b.textContent = (CURGAME && CURGAME.present) ? '↑ Reprendre la partie en cours' : 'Sélection type (14)'; }
function syncGridToGame(g){
  if (!g || !g.present || !$('#castGrid')) return;
  const set = new Set(g.present);
  $$('#castGrid .chip').forEach(b => b.classList.toggle('on', set.has(+b.dataset.num)));
  markCercleChips(g.cercle); updCount(); updSelDefaultLabel();
  renderCercleFound(g.cercle, g.present, g.coupable);
}
function renderCercleFound(trio, present, coupable){
  const out = $('#cercleOut'); if (!out) return;
  if (!trio || !trio.length){ out.innerHTML = ''; return; }
  const cs = cerclesValides(present); const iso = sharedTraits(trio, present);
  out.innerHTML = `<div class="card"><h3 class="fic">Cercle ${coupable ? 'de la partie en cours' : 'trouvé'}</h3>
    <div>${trio.map(num => `<div class="prow">${avatarHtml(num, coupable === num ? 'coup' : '')}<div class="who"><b>${esc(BYNUM[num].nom)}</b><div class="r">${esc(BYNUM[num].role)}${coupable === num ? ' · <span class="tag coup">Coupable</span>' : ''}</div></div></div>`).join('')}</div>
    <p>Isolé par : ${iso.map(([d, v]) => `${LABELS[d]} = <b>${esc(v)}</b>`).join(' · ')}</p>
    <p class="muted">${cs.length} Cercle(s) possible(s) avec ces présents.${coupable ? '' : ' Désignez librement le Coupable parmi les trois.'}</p></div>`;
}
function trouverCercle(){
  const present = selNums(); const out = $('#cercleOut');
  if (present.length < 6){ out.innerHTML = '<p class="warn">Cochez au moins 6 présents.</p>'; return; }
  // si une partie est en cours et son Cercle tient dans la sélection, le proposer en priorité
  if (CURGAME && CURGAME.cercle && CURGAME.cercle.every(x => present.includes(x)) && isole(CURGAME.cercle, present)){
    markCercleChips(CURGAME.cercle); renderCercleFound(CURGAME.cercle, present, CURGAME.coupable); return;
  }
  const cs = cerclesValides(present, mulberry32((Math.random() * 1e9) | 0));
  if (!cs.length){ out.innerHTML = '<p class="warn">Aucun Cercle isolable avec ces présents. Modifiez la sélection.</p>'; return; }
  markCercleChips(cs[0]); renderCercleFound(cs[0], present, null);
}

/* ============ EN JEU : tableau de bord ============ */
const OUVERTURE = [
  'Distribuer perso, Atout et 2 Rumeurs à chacun', 'Distribuer une carte Secret par joueur',
  'Placer la victime, annoncer le crime', 'Lire l\'ambiance et lancer le 1ᵉʳ tour',
];
const EVENTS = [
  { icon: '🕯️', nom: 'Coupure de gaz', camp: 'malf', effet: 'La prochaine Audience ne révèle aucun indice.' },
  { icon: '🌑', nom: 'Le noir complet', camp: 'malf', effet: 'Ce tour, un Atout d\'information (au choix) échoue.' },
  { icon: '🔪', nom: 'Un cri dans la nuit', camp: 'malf', effet: 'Retirez un Enquêteur : meurtre silencieux, sans indice de Fantôme (−1 votant, −1 canal d\'info).' },
  { icon: '✉️', nom: 'La lettre anonyme', camp: 'enq', effet: 'Une révélation gratuite (question type Médium : « ce joueur est-il impliqué ? »).' },
  { icon: '🛏️', nom: 'L\'aveu sur l\'oreiller', camp: 'enq', effet: 'Le MJ ajoute une carte Indice au mur.' },
  { icon: '⛈️', nom: 'L\'orage éclate', camp: 'neutre', effet: 'Ambiance (option : raccourcit la phase suivante).' },
];
function ensureLive(g){
  if (!g) return;
  if (!g.live) g.live = { accused: [], secondVictim: null, condemned: null, obj: {}, lastAccused: null };
  if (!Array.isArray(g.live.accused)) g.live.accused = [];
  if (!g.live.obj) g.live.obj = {};
  if (g.live.vivants == null) g.live.vivants = g.present.length;
  if (!Array.isArray(g.live.alibis)) g.live.alibis = [];
  if (g.live.notes == null) g.live.notes = '';
  if (g.vengeurCible === undefined) g.vengeurCible = (g.players.find(p => p.atout === 'Le Vengeur') || {}).cible ?? null;
}
const OBJ_BYNAME = nm => DATA.atouts.find(a => a.nom === nm);
function objAuto(g, p){
  const nm = p.atout;
  if (nm === 'Le Vengeur' && p.cible != null){
    if (g.live.accused.includes(p.cible) || g.live.secondVictim === p.cible) return 'ok';
    return '?';
  }
  if (nm === 'Le Caméléon') return g.live.accused.includes(p.num) ? 'ko' : '?';
  return '?';
}
function objResult(g, p){ const o = g.live.obj[p.num]; return o || objAuto(g, p); }
const objHint = p => {
  if (p.atout === 'Le Vengeur' && p.cible != null) return 'cible : ' + nomCourt(p.cible) + ' (accusée ou tuée)';
  const a = OBJ_BYNAME(p.atout); return a ? a.effet : '';
};

function renderDashboard(){
  const box = $('#dashboard'); if (!box) return;
  const g = CURGAME;
  if (!g || !g.players){ box.innerHTML = `<div class="empty">Aucune partie en cours.<br><button class="act" style="margin-top:10px" onclick="document.querySelector('.tabs [data-tab=partie]').click()">Générer ou charger une partie</button></div>`; return; }
  ensureLive(g);
  const vivants = g.present.length; // indicatif
  const presentOpts = g.present.map(num => `<option value="${num}">${esc(nomCourt(num))}</option>`).join('');
  const victimOpts = g.players.filter(p => p.camp !== 'malf').map(p => `<option value="${p.num}"${g.vengeurCible === p.num ? ' selected' : ''}>${esc(nomCourt(p.num))}</option>`).join('');
  box.innerHTML = `
    <h2 class="sec">${esc(g.name)} <span class="muted" style="font-weight:400">· ${g.n} j · ${diffLabel(g.diff)}</span></h2>
    <div class="dash-top">
      <div class="dash-mini"><div class="k">Actes restants</div><div class="v" id="dActs">${g.acts}</div><div class="mini-ctl"><button data-a="act-">−</button><button data-a="act+">+</button></div></div>
      <div class="dash-mini"><div class="k">Tour d'enquête</div><div class="v" id="dTour">${g.tour}</div><div class="mini-ctl"><button data-a="tour-">−</button><button data-a="tour+">+</button></div></div>
    </div>
    <div class="card" id="confidCard">
      <h3 class="fic">Rappel confidentiel</h3>
      <button class="ghost reveal-btn" id="revealSecret" type="button">👁 Révéler</button>
      <div class="secret-veil" id="secretVeil">
        <p>Coupable : <b>${nomCourt(g.coupable)}</b> · Leurres : ${g.leurres.map(nomCourt).join(', ')}.</p>
        <p class="muted">Mobile : ${esc(g.mobile)}.</p>
      </div>
    </div>
    <div class="card">
      <h3 class="fic">Fiche express &amp; comparateur</h3>
      <div class="rowflex"><label>N° : <input id="fxNum" type="number" min="1" max="40" list="presentList" style="width:78px"></label><label>comparer à : <input id="fxNum2" type="number" min="1" max="40" list="presentList" style="width:78px"></label><button class="ghost" id="fxGo">Voir</button></div>
      <datalist id="presentList">${g.present.map(num => `<option value="${num}">${esc(nomCourt(num))}</option>`).join('')}</datalist>
      <div id="fxOut" class="muted" style="margin-top:6px;font-size:14px"></div>
    </div>
    <div class="card">
      <h3 class="fic">Cérémonie d'ouverture</h3>
      <div id="ouvList"></div>
    </div>
    <div class="card">
      <h3 class="fic">Le mur d'enquête</h3>
      <div class="rowflex"><input id="clueIn" type="text" placeholder="Indice révélé / note publique" style="flex:1;min-width:160px"><button class="act" id="clueAdd">Épingler</button></div>
      <div id="wallList"></div>
      <div class="rowflex" style="margin-top:6px">
        <button class="ghost" id="nextClue">Indice du tour ${g.tour}</button>
        <button class="ghost" id="projFromDash">⛶ Projeter le mur</button>
      </div>
    </div>
    <div class="card">
      <h3 class="fic">Vivants & majorité</h3>
      <div class="rowflex"><span class="k">Votants vivants</span>
        <div class="mini-ctl"><button data-vv="-">−</button></div>
        <b id="vivN" style="font-size:20px;min-width:28px;text-align:center">${g.live.vivants}</b>
        <div class="mini-ctl"><button data-vv="+">+</button></div></div>
      <p class="tip" id="vivOut"></p>
    </div>
    <div class="card">
      <h3 class="fic">Accusation & verdict</h3>
      <div class="rowflex"><label>Accusé·e : <select id="accuseWho">${presentOpts}</select></label><button class="act" id="doAccuse">⚖️ Accuser</button></div>
      <div id="verdictBox"></div>
    </div>
    <div class="card">
      <h3 class="fic">Suivi des Alibis</h3>
      <p class="muted" style="font-size:13px">Marquez qui a dégainé son Alibi. Un Alibi joué place le suspect hors de cause, jusqu'à ce qu'un fait nouveau le relance.</p>
      <div id="alibiTrack"></div>
    </div>
    <div class="card">
      <h3 class="fic">Second meurtre <span class="muted" style="font-weight:400">(arbitrage)</span></h3>
      <div class="rowflex"><label>Victime : <select id="killWho">${victimOpts}</select></label><button class="ghost" id="doKill">🕯️ Frapper</button></div>
      <p class="tip" id="killHint">${g.vengeurCible != null ? 'Cible du Vengeur suggérée : <b>' + esc(nomCourt(g.vengeurCible)) + '</b>.' : 'Victime = un Enquêteur ou un Intrigant.'}</p>
    </div>
    <div class="card">
      <h3 class="fic">Objectifs des Intrigants (suivi)</h3>
      <div id="objTrack"></div>
    </div>
    <div class="card">
      <h3 class="fic">Cartes Événement du Meneur</h3>
      <p class="muted" style="font-size:13px">Soupapes de rééquilibrage, à jouer <b>une à la fois, avec parcimonie</b>, quand une table dérape.</p>
      <div id="evtBtns"></div>
    </div>
    <div class="card">
      <h3 class="fic">Événements & journal</h3>
      <div class="rowflex"><button class="ghost" id="evCarillon">🔔 Carillon</button></div>
      <div id="journalOut" style="margin-top:8px"></div>
    </div>
    <div class="card">
      <h3 class="fic">Notes du Meneur</h3>
      <textarea id="mjNotes" rows="3" placeholder="Vos notes libres pour cette partie…" style="width:100%;resize:vertical"></textarea>
    </div>
    <div class="rowflex">
      <button class="act big-act" id="denouementBtn">🎭 Dénouement</button>
      <button class="ghost" id="resetSession">↻ Réinitialiser la session</button>
    </div>`;
  // compteurs
  box.querySelectorAll('.dash-mini .mini-ctl button').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    pushUndo(g, 'compteur');
    if (a === 'act-') g.acts = Math.max(0, g.acts - 1); if (a === 'act+') g.acts++;
    if (a === 'tour-') g.tour = Math.max(1, g.tour - 1); if (a === 'tour+') g.tour++;
    persistCur(); $('#dActs').textContent = g.acts; $('#dTour').textContent = g.tour; $('#nextClue') && ($('#nextClue').textContent = 'Indice du tour ' + g.tour); paintStatus();
  });
  renderOuverture(g); renderWall(g); renderJournal(g); renderObjTrack(g); renderVerdict(g); renderEvents(g); renderVivants(g); renderAlibis(g);
  $('#mjNotes').value = g.live.notes || '';
  $('#mjNotes').oninput = e => { g.live.notes = e.target.value; persistCur(); };
  box.querySelectorAll('[data-vv]').forEach(b => b.onclick = () => { pushUndo(g, 'vivants'); const d = b.dataset.vv === '+' ? 1 : -1; g.live.vivants = Math.max(1, (g.live.vivants || g.present.length) + d); persistCur(); renderVivants(g); });
  const rv = $('#revealSecret'), veil = $('#secretVeil');
  if (rv && veil) rv.onclick = () => { const on = veil.classList.toggle('shown'); rv.textContent = on ? '🙈 Masquer' : '👁 Révéler'; };
  $('#fxGo').onclick = () => {
    const n1 = +$('#fxNum').value, n2 = +$('#fxNum2').value;
    const a = BYNUM[n1]; if (!a){ $('#fxOut').innerHTML = 'Inconnu.'; return; }
    const b = n2 && n2 !== n1 ? BYNUM[n2] : null;
    if (!b){ $('#fxOut').innerHTML = `<b>${esc(a.nom)}</b> — ${Object.keys(LABELS).map(d => LABELS[d] + ' : <b>' + esc(a.pub[d]) + '</b>').join(' · ')}`; return; }
    const rows = Object.keys(LABELS).map(d => { const eq = a.pub[d] === b.pub[d]; return `<tr class="${eq ? 'cmp-eq' : ''}"><td>${LABELS[d]}</td><td>${esc(a.pub[d])}</td><td>${esc(b.pub[d])}</td><td style="text-align:center">${eq ? '=' : ''}</td></tr>`; }).join('');
    const flous = Object.keys(LABELS).filter(d => a.pub[d] === b.pub[d] && NEUTRAL.includes(d)).length;
    $('#fxOut').innerHTML = `<table class="cmp"><tr><th>Trait</th><th>${esc(nomCourt(n1))}</th><th>${esc(nomCourt(n2))}</th><th></th></tr>${rows}</table>
      <p class="muted" style="margin-top:4px">${flous} trait(s) public(s) flou(s) en commun ${flous >= 2 ? '— un Cercle peut les réunir.' : '— insuffisant pour les isoler ensemble.'}</p>`;
  };
  $('#clueAdd').onclick = () => { const v = $('#clueIn').value.trim(); if (v){ g.clues.push(v); $('#clueIn').value = ''; persistCur(); renderWall(g); } };
  $('#nextClue').onclick = () => { const tt = g.indices.find(x => x.tour === g.tour); if (tt) tt.items.forEach(it => g.clues.push('[T' + g.tour + '] ' + it.t)); persistCur(); renderWall(g); };
  $('#projFromDash').onclick = () => openProjection();
  $('#doAccuse').onclick = () => {
    const num = +$('#accuseWho').value; pushUndo(g, 'accusation'); maillet(); haptic(30);
    if (!g.live.accused.includes(num)) g.live.accused.push(num);
    g.live.lastAccused = num; g.acts = Math.max(0, g.acts - 1); $('#dActs').textContent = g.acts;
    journal(g, '⚖️ ' + nomCourt(num) + ' est formellement accusé·e (un Acte consommé).');
    persistCur(); renderVerdict(g); renderObjTrack(g); paintStatus();
  };
  $('#doKill').onclick = () => {
    const num = +$('#killWho').value; pushUndo(g, 'second meurtre'); glas(); haptic([40, 60, 40]);
    g.live.secondVictim = num; g.live.vivants = Math.max(1, (g.live.vivants || g.present.length) - 1);
    journal(g, '🕯️ Second meurtre : ' + nomCourt(num) + ' est la victime (Fantôme).' + (num === g.vengeurCible ? ' — vendetta du Vengeur accomplie.' : ''));
    persistCur(); renderObjTrack(g); renderVivants(g);
  };
  $('#evCarillon').onclick = () => carillon();
  $('#denouementBtn').onclick = () => openDenouement(g);
  $('#resetSession').onclick = () => { if (confirm('Réinitialiser la session en cours ?')){ g.acts = (DATA.table.find(t => t.n === g.n) || { actes: 2 }).actes; g.tour = 1; g.clues = []; g.journal = []; g.ouverture = []; g.live = null; ensureLive(g); UNDO = []; persistCur(); renderDashboard(); } };
  makeAccordion(box); paintStatus();
}
function renderVivants(g){
  const b = $('#vivN'); if (!b) return; b.textContent = g.live.vivants;
  const n = g.live.vivants, maj = Math.floor((n - 1) / 2) + 1;
  const o = $('#vivOut'); if (o) o.innerHTML = `Majorité : <b>${maj}</b> voix sur ${n - 1} (l'accusé·e ne vote pas). Égalité → pas d'arrestation.`;
}
function renderAlibis(g){
  const box = $('#alibiTrack'); if (!box) return;
  const burned = g.live.alibis || (g.live.alibis = []);
  const nb = burned.length;
  box.innerHTML = `<div class="alibi-grid">${g.present.map(num => {
    const on = burned.includes(num);
    return `<button class="chip alibi-chip${on ? ' spent' : ''}" data-num="${num}" type="button"><b>${esc(nomCourt(num))}</b><span>${on ? '🛡️ Alibi dégainé' : 'Alibi intact'}</span></button>`;
  }).join('')}</div>
    <p class="tip" style="font-size:13px">${nb ? nb + ' Alibi(s) dégainé(s) : ' + burned.map(nomCourt).map(esc).join(', ') + '.' : 'Aucun Alibi dégainé pour l\'instant.'}</p>`;
  box.querySelectorAll('.alibi-chip').forEach(bt => bt.onclick = () => {
    const num = +bt.dataset.num, set = g.live.alibis, i = set.indexOf(num);
    if (i >= 0){ set.splice(i, 1); journal(g, '🛡️ ' + nomCourt(num) + ' : Alibi retiré, de nouveau contestable.'); }
    else { set.push(num); journal(g, '🛡️ ' + nomCourt(num) + ' a dégainé son Alibi (hors de cause).'); }
    persistCur(); renderAlibis(g);
  });
}
function renderVerdict(g){
  const box = $('#verdictBox'); if (!box) return;
  const num = g.live.lastAccused;
  if (num == null){ box.innerHTML = '<p class="muted" style="font-size:13px">Sélectionnez un·e accusé·e puis « Accuser ».</p>'; return; }
  box.innerHTML = `<p style="margin:6px 0">Verdict pour <b>${esc(nomCourt(num))}</b> :
    <button class="ghost" data-v="acq">Acquitté·e</button>
    <button class="act" data-v="cond">🔨 Condamné·e (arrêté·e)</button></p>
    <p class="muted" style="font-size:13px">${g.live.condemned != null ? 'Condamné·e cette partie : <b>' + esc(nomCourt(g.live.condemned)) + '</b> — ' + (g.live.condemned === g.coupable ? 'le vrai Coupable ! (Enquêteurs)' : 'une erreur judiciaire (Malfaiteurs)') : ''}</p>`;
  box.querySelector('[data-v="acq"]').onclick = () => { journal(g, '⚖️ ' + nomCourt(num) + ' est acquitté·e.'); persistCur(); };
  box.querySelector('[data-v="cond"]').onclick = () => { pushUndo(g, 'verdict'); g.live.condemned = num; maillet(); journal(g, '🔨 ' + nomCourt(num) + ' est condamné·e et arrêté·e.'); persistCur(); renderVerdict(g); };
}
function renderObjTrack(g){
  const box = $('#objTrack'); if (!box) return;
  const intr = g.players.filter(p => p.camp === 'intr');
  if (!intr.length){ box.innerHTML = '<p class="muted" style="font-size:13px">Aucun Intrigant dans cette partie.</p>'; return; }
  box.innerHTML = intr.map(p => {
    const res = objResult(g, p);
    const badge = res === 'ok' ? '<span class="tag" style="background:#2f7d4f;color:#eafaf0">Réussi</span>' : res === 'ko' ? '<span class="tag malf">Raté</span>' : '<span class="tag intr">En cours</span>';
    return `<div class="prow"><div class="who"><b>${esc(nomCourt(p.num))}</b> — ${esc(p.atout)} ${badge}<div class="r">${esc(objHint(p))}</div></div>
      <span class="obj-set" data-num="${p.num}"><button class="ghost" data-r="ok" title="Réussi">✓</button><button class="ghost" data-r="ko" title="Raté">✗</button><button class="ghost" data-r="auto" title="Auto">↺</button></span></div>`;
  }).join('');
  box.querySelectorAll('.obj-set').forEach(sp => { const num = +sp.dataset.num; sp.querySelectorAll('button').forEach(b => b.onclick = () => { const r = b.dataset.r; if (r === 'auto') delete g.live.obj[num]; else g.live.obj[num] = r; persistCur(); renderObjTrack(g); }); });
}
function renderEvents(g){
  const box = $('#evtBtns'); if (!box) return;
  const cls = c => c === 'malf' ? 'malf' : c === 'enq' ? 'enq' : 'intr';
  box.innerHTML = EVENTS.map((e, i) => `<button class="ghost evt-btn" data-i="${i}" title="${esc(e.effet)}">${e.icon} ${esc(e.nom)} <span class="tag ${cls(e.camp)}" style="margin-left:4px">${e.camp === 'malf' ? 'Malf' : e.camp === 'enq' ? 'Enq' : 'Amb.'}</span></button>`).join('');
  box.querySelectorAll('.evt-btn').forEach(b => b.onclick = () => {
    const e = EVENTS[+b.dataset.i];
    journal(g, '🎴 Événement : ' + e.icon + ' ' + e.nom + ' — ' + e.effet);
    toast(e.icon + ' ' + e.nom); haptic(20);
    if (e.nom === 'L\'orage éclate') ambPlay('orage');
  });
}
function openDenouement(g){
  ensureLive(g);
  let ov = $('#denouement'); if (!ov){ ov = el('div', 'projection deno'); ov.id = 'denouement'; document.body.appendChild(ov); }
  const camp = g.live.condemned == null ? null : (g.live.condemned === g.coupable ? 'enq' : 'malf');
  const intr = g.players.filter(p => p.camp === 'intr');
  const objRows = intr.map(p => { const r = objResult(g, p); return `<tr><td>${esc(nomCourt(p.num))}</td><td>${esc(p.atout)}</td><td>${r === 'ok' ? '✅ Réussi' : r === 'ko' ? '❌ Raté' : '⏳ Indéterminé'}</td></tr>`; }).join('');
  const steps = [
    `<h2>La victime</h2><p class="deno-big">${esc(g.victime)}</p><p>${esc(g.mort)}.</p>`,
    `<h2>Le Cercle des trois</h2><p>${g.cercle.map(num => esc(BYNUM[num].nom)).join(' · ')}</p><p class="muted">Isolé par ${g.iso.map(([d, v]) => LABELS[d] + ' = ' + esc(v)).join(' · ')}</p>`,
    `<h2>Le Coupable</h2><p class="deno-big">${esc(BYNUM[g.coupable].nom)}</p><p>Mobile : ${esc(g.mobile)}.</p><p class="muted">Complices : ${g.complices.map(n => esc(nomCourt(n))).join(', ') || '—'}${g.live.secondVictim != null ? ' · 2ᵉ victime : ' + esc(nomCourt(g.live.secondVictim)) : ''}</p>`,
    `<h2>Les Intrigants</h2><table class="deno-tab"><tr><th>Joueur</th><th>Objectif</th><th>Issue</th></tr>${objRows || '<tr><td colspan="3">Aucun Intrigant.</td></tr>'}</table>`,
    `<h2>Verdict</h2>${camp ? `<p class="deno-big">${camp === 'enq' ? 'Les Enquêteurs l\'emportent' : 'Les Malfaiteurs l\'emportent'}</p><p>${camp === 'enq' ? 'Le Coupable a été démasqué et arrêté.' : 'Le Coupable a échappé à la justice.'}</p>` : '<p class="warn">Aucune condamnation enregistrée — renseignez le verdict dans « En jeu » (Accusation & verdict).</p>'}`,
  ];
  let step = 0;
  const render = () => {
    ov.innerHTML = `<button class="proj-close" id="denoClose">✕</button><div class="deno-body">${steps.slice(0, step + 1).map(s => `<div class="deno-step">${s}</div>`).join('')}
      <div class="rowflex" style="justify-content:center;margin-top:18px;gap:10px">
        ${step < steps.length - 1 ? '<button class="act" id="denoNext">Révéler la suite ▸</button>' : '<button class="act" id="denoPrint">🖨️ Imprimer</button>'}
        <button class="ghost" id="denoCopy">⧉ Copier le récap</button>
        <button class="ghost" id="denoClose2">Fermer</button></div></div>`;
    $('#denoClose').onclick = $('#denoClose2').onclick = () => ov.classList.remove('on');
    if ($('#denoNext')) $('#denoNext').onclick = () => { step++; render(); };
    if ($('#denoPrint')) $('#denoPrint').onclick = () => window.print();
    $('#denoCopy').onclick = () => copyDenouement(g);
  };
  render(); ov.classList.add('on'); denoCue(); wakeOn();
}
function denoCue(){ [523, 415, 330].forEach((f, i) => bell(f, i * 0.55, 1.3, 'sine')); haptic([25, 70, 25]); }
function copyDenouement(g){
  ensureLive(g);
  const camp = g.live.condemned == null ? null : (g.live.condemned === g.coupable ? 'enq' : 'malf');
  const L = [];
  L.push(`L'HEURE DU CRIME, récap de partie (${g.n} joueurs, ${diffLabel(g.diff)})`);
  L.push(`Victime : ${g.victime}, ${g.mort}.`);
  L.push(`Cercle : ${g.cercle.map(nomCourt).join(', ')}.`);
  L.push(`Coupable : ${nomCourt(g.coupable)} (mobile : ${g.mobile}).`);
  L.push(`Complices : ${g.complices.map(nomCourt).join(', ') || 'aucun'}.`);
  if (g.live.secondVictim != null) L.push(`2ᵉ victime : ${nomCourt(g.live.secondVictim)}.`);
  if (g.live.alibis && g.live.alibis.length) L.push(`Alibis dégainés : ${g.live.alibis.map(nomCourt).join(', ')}.`);
  if (g.live.condemned != null) L.push(`Verdict : ${nomCourt(g.live.condemned)} condamné·e. ${camp === 'enq' ? "Les Enquêteurs l'emportent." : "Les Malfaiteurs l'emportent."}`);
  else L.push('Verdict : aucune condamnation enregistrée.');
  const intr = g.players.filter(p => p.camp === 'intr');
  if (intr.length){ L.push('Intrigants :'); intr.forEach(p => { const r = objResult(g, p); L.push(`  ${nomCourt(p.num)}, ${p.atout} : ${r === 'ok' ? 'réussi' : r === 'ko' ? 'raté' : 'indéterminé'}`); }); }
  if (g.journal && g.journal.length){ L.push('Déroulé :'); g.journal.slice().reverse().forEach(j => L.push('  ' + j.replace(/[—–]/g, ':'))); }
  navigator.clipboard.writeText(L.join('\n')).then(() => toast('Récap copié dans le presse-papiers.')).catch(() => toast('Copie impossible sur cet appareil.'));
}
function renderOuverture(g){
  const box = $('#ouvList'); if (!box) return; box.innerHTML = '';
  OUVERTURE.forEach((step, i) => {
    const lab = el('label', 'chk-row');
    const done = g.ouverture.includes(i);
    lab.innerHTML = `<input type="checkbox" ${done ? 'checked' : ''}> <span${done ? ' style="opacity:.5;text-decoration:line-through"' : ''}>${esc(step)}</span>`;
    lab.querySelector('input').onchange = e => { if (e.target.checked) g.ouverture.push(i); else g.ouverture = g.ouverture.filter(x => x !== i); persistCur(); renderOuverture(g); };
    box.appendChild(lab);
  });
}
function renderWall(g){
  const box = $('#wallList'); if (!box) return;
  box.innerHTML = g.clues.length ? g.clues.map((c, i) => `<div class="billet">🔍 ${esc(c)} <button class="link-x" data-i="${i}">✕</button></div>`).join('') : '<p class="empty">Rien d\'épinglé.</p>';
  box.querySelectorAll('.link-x').forEach(b => b.onclick = () => { g.clues.splice(+b.dataset.i, 1); persistCur(); renderWall(g); syncProjection(); });
  syncProjection();
}
function journal(g, txt){ g.journal.unshift(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' — ' + txt); persistCur(); renderJournal(g); }
function renderJournal(g){ const box = $('#journalOut'); if (!box) return; box.innerHTML = g.journal.length ? g.journal.map(j => `<div class="muted" style="font-size:13px">${esc(j)}</div>`).join('') : '<p class="empty">Journal vide.</p>'; }

/* ============ RÔLES : distribution ============ */
function renderRoles(){
  const box = $('#rolesOut'); if (!box) return; const g = CURGAME;
  if (!g || !g.players){ box.innerHTML = `<div class="empty">Aucune partie en cours.<br><button class="act" style="margin-top:10px" onclick="document.querySelector('.tabs [data-tab=partie]').click()">Générer ou charger une partie</button></div>`; return; }
  const n = g.players.filter(p => p.distribue).length;
  box.innerHTML = `<h2 class="sec">Distribution des rôles <span class="muted" style="font-weight:400">· ${n}/${g.players.length} remis</span></h2>
    <p class="muted">Cochez « remis » à mesure. Chaque joueur reçoit son personnage, son Atout et une note de Secret. Le <b>lien joueur</b> ouvre une fiche plein écran à tendre au joueur.</p>
    <div id="roleRows"></div>
    <div class="rowflex" style="margin-top:8px"><button class="ghost" id="rolesReset">Tout décocher</button><button class="ghost" id="distribSheet">🖨️ Feuille de distribution (QR)</button></div>`;
  const rows = $('#roleRows');
  g.players.forEach((p, i) => {
    const at = DATA.atouts.find(a => a.nom === p.atout);
    const intel = hiddenIntel(g, p);
    const r = el('div', 'card'); r.style.padding = '10px 12px'; r.style.margin = '7px 0';
    r.innerHTML = `<div class="prow" style="border:0;padding:0">
        ${avatarHtml(p.num, p.role === 'coupable' ? 'coup' : '')}
        <div class="who"><b>${esc(BYNUM[p.num].nom)}</b> <span class="tag ${p.camp === 'enq' ? 'enq' : p.camp === 'intr' ? 'intr' : p.role === 'coupable' ? 'coup' : 'malf'}">${p.role === 'coupable' ? 'Coupable' : p.role === 'complice' ? 'Complice' : p.role === 'intrigant' ? 'Intrigant' : 'Enquêteur'}</span>
          <div class="r">Atout : <b>${esc(p.atout)}</b>${at ? ' · <span class="muted">' + esc(at.timing) + '</span>' : ''}</div></div>
        <label class="dist-chk"><input type="checkbox" data-i="${i}" ${p.distribue ? 'checked' : ''}> remis</label></div>
      <div class="atout-line">${atoutImg(p.atout)}<div class="muted" style="font-size:13px">${at ? '⚙️ ' + esc(at.effet) + '<br>' : ''}${intel.map(x => '<b>' + x + '</b>').join('<br>')}${intel.length ? '<br>' : ''}🗝️ ${esc(p.secret)}</div></div>
      <div class="rowflex" style="margin-top:6px"><button class="ghost" data-link="${i}">🔗 Lien joueur</button></div>`;
    r.querySelector('input').onchange = e => { p.distribue = e.target.checked; persistCur(); renderRoles(); };
    r.querySelector('[data-link]').onclick = () => showPlayerCard(g, i);
    rows.appendChild(r);
  });
  $('#rolesReset').onclick = () => { g.players.forEach(p => p.distribue = false); persistCur(); renderRoles(); };
  $('#distribSheet').onclick = () => openDistribSheet(g);
}
function openDistribSheet(g){
  let ov = $('#distrib'); if (!ov){ ov = el('div', 'sheet'); ov.id = 'distrib'; document.body.appendChild(ov); }
  const cards = g.players.map((p, i) => {
    const c = BYNUM[p.num]; const url = playerURL(g, i);
    return `<div class="sheet-card"><div class="sheet-qr" data-url="${esc(url)}"></div>
      <div class="sheet-info"><b>${esc(c.nom)}</b><div class="muted">${esc(c.role)}</div>
      <div class="muted" style="font-size:12px">Atout : ${esc(p.atout)}</div></div></div>`;
  }).join('');
  ov.innerHTML = `<div class="sheet-head"><h2>Feuille de distribution — ${esc(g.name)}</h2>
    <div class="no-print"><button class="act" id="shPrint">🖨️ Imprimer</button><button class="ghost" id="shClose">Fermer</button></div>
    <p class="muted no-print">Chaque joueur scanne son QR pour ouvrir sa fiche (perso + Atout). La cible du Vengeur ne se révèle qu'à l'issue du 1ᵉʳ tour.</p></div>
    <div class="sheet-grid">${cards}</div>`;
  ov.classList.add('on');
  ov.querySelectorAll('.sheet-qr').forEach(q => renderQR(q, q.dataset.url));
  $('#shClose').onclick = () => ov.classList.remove('on');
  $('#shPrint').onclick = () => window.print();
}

/* ---------- fiche joueur plein écran ---------- */
function playerURL(g, idx){
  const base = location.origin + location.pathname;
  if (g.scenario) return base + '#s=' + String(g.seed).replace(/^S/, '') + '-' + idx;
  return base + '#j=' + g.seed + '-' + g.n + '-' + g.diff + '-' + idx;
}
function showPlayerCard(g, idx){
  const p = g.players[idx], c = BYNUM[p.num], at = DATA.atouts.find(a => a.nom === p.atout);
  let ov = $('#playerCard'); if (!ov){ ov = el('div', 'projection'); ov.id = 'playerCard'; document.body.appendChild(ov); }
  const pub = Object.keys(LABELS).map(d => `${LABELS[d]} : <b>${esc(c.pub[d])}</b>`).join(' · ');
  const url = playerURL(g, idx);
  const portrait = c.portrait ? `<img src="${c.portrait}" alt="" class="pc-portrait">` : `<div class="avatar" style="width:96px;height:96px;font-size:34px;margin:0 auto 10px">${initiales(p.num)}</div>`;
  ov.innerHTML = `<button class="proj-close" id="pcClose">✕</button>
    <div class="pc-body">
      ${portrait}
      <h2 style="font-family:'Playfair Display',serif;color:#e6c96a;margin:.2em 0">${esc(c.nom)}</h2>
      <p style="color:#c9a24a;font-style:italic">${esc(c.role)}</p>
      <p style="margin:12px 0;color:#ecdcc0">${pub}</p>
      <div style="border-top:1px solid rgba(201,162,74,.35);margin:14px 0;padding-top:12px">
        <div class="pc-atout">${atoutImg(p.atout)}<div><p style="color:#e6c96a;font-weight:700;margin:.2em 0">Votre Atout : ${esc(p.atout)}</p>
        ${at ? `<p style="color:#ecdcc0;font-size:15px;margin:.2em 0">${esc(at.effet)}<br><span style="color:#c9a24a">Moment : ${esc(at.timing)}</span></p>` : ''}
        ${hiddenIntel(g, p, true).map(x => `<p style="color:#e6c96a;font-size:15px;margin:.3em 0">${x}</p>`).join('')}</div></div>
      </div>
      <div class="pc-qr" id="pcQR" title="Ouvrir cette fiche sur un téléphone"></div>
      <p style="color:#9a8f80;font-size:13px">Scannez pour ouvrir cette fiche sur votre téléphone, puis rendez l'écran au Meneur.</p>
    </div>`;
  ov.classList.add('on'); $('#pcClose').onclick = () => ov.classList.remove('on');
  renderQR('#pcQR', url);
}
function renderQR(sel, url){
  const box = typeof sel === 'string' ? $(sel) : sel; if (!box) return;
  if (window.qrcode){ try { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); return; } catch (e) {} }
  box.innerHTML = `<a href="${url}" style="color:#c9a24a;font-size:12px;word-break:break-all">${esc(url)}</a>`;
}

/* ============ BOÎTE à requêtes ============ */
const ORDRE = { Protection: 0, Perturbation: 1, Information: 2, Meurtre: 3 };
function atoutTiming(nom){ const a = DATA.atouts.find(x => x.nom.toLowerCase() === (nom || '').toLowerCase().trim() || x.nom.toLowerCase().includes((nom || '').toLowerCase().trim())); return a; }
let BILLETS = [];
function boitePlayer(num){ const g = CURGAME; return g && g.players ? g.players.find(p => p.num === +num) : null; }
function refreshBoiteGame(){
  let dl = $('#bNumList'); if (!dl){ dl = el('datalist'); dl.id = 'bNumList'; document.body.appendChild(dl); $('#bNum') && $('#bNum').setAttribute('list', 'bNumList'); }
  const g = CURGAME; dl.innerHTML = (g && g.present) ? g.present.map(num => `<option value="${num}">${esc(BYNUM[num].nom)}</option>`).join('') : '';
}
function initBoite(){
  const dl = $('#atoutList'); DATA.atouts.forEach(a => dl.appendChild(new Option(a.nom)));
  refreshBoiteGame();
  $('#addBillet').onclick = () => {
    const num = $('#bNum').value.trim(), atxt = $('#bAtout').value.trim(), cible = $('#bCible').value.trim();
    if (!atxt){ toast('Indiquez au moins un Atout.'); return; }
    BILLETS.push({ num, atout: atxt, cible }); $('#bNum').value = $('#bAtout').value = $('#bCible').value = ''; renderBillets();
  };
  $('#resolve').onclick = renderBillets;
  $('#clearBillets').onclick = () => { BILLETS = []; renderBillets(); };
}
function categorie(a){ if (!a) return 'Information'; if (PROTECT.includes(a.nom) || ANTIPERT.includes(a.nom)) return 'Protection'; if (PERT.includes(a.nom)) return 'Perturbation'; if (a.nom === 'Le Coupable' || a.effet.toLowerCase().includes('meurtre') || a.effet.toLowerCase().includes('élimin')) return 'Meurtre'; return 'Information'; }
function renderBillets(){
  const out = $('#billetsOut'); if (!BILLETS.length){ out.innerHTML = '<p class="empty">Aucun billet.</p>'; return; }
  const enrich = BILLETS.map(b => { const a = atoutTiming(b.atout); const pl = boitePlayer(b.num); const mismatch = pl && a && pl.atout !== a.nom; return { ...b, a, cat: categorie(a), pl, mismatch }; });
  enrich.sort((x, y) => (ORDRE[x.cat] - ORDRE[y.cat]));
  const groups = {}; enrich.forEach(b => (groups[b.cat] = groups[b.cat] || []).push(b));
  out.innerHTML = Object.keys(ORDRE).filter(c => groups[c]).map(c => `<div class="billet-grp"><h4>${c}</h4>${groups[c].map(b => `<div class="billet"><b>${b.num ? esc(nomCourt(+b.num)) : '?'}</b> — ${esc(b.a ? b.a.nom : b.atout)}${b.cible ? ' → cible ' + esc(b.cible) : ''}${b.a ? '<br><span class="muted" style="font-size:13px">⚙️ ' + esc(b.a.effet) + '</span>' : '<br><span class="warn" style="font-size:13px">Atout inconnu</span>'}${b.mismatch ? '<br><span class="warn" style="font-size:13px">⚠ Ne correspond pas au rôle réel : ' + esc(b.pl.atout) + '</span>' : b.pl ? '<br><span class="muted" style="font-size:12px">✓ rôle vérifié</span>' : ''}</div>`).join('')}</div>`).join('');
}

/* ============ HORLOGE + projection + wake-lock ============ */
const PHASES = [{ n: 'Audience', m: 10 }, { n: 'Investigation', m: 15 }, { n: 'Délibéré', m: 5 }];
const clk = { sec: 600, run: false, phase: 0, id: null, wake: null };
function fmt(s){ const m = Math.floor(s / 60), r = s % 60; return m + ':' + String(r).padStart(2, '0'); }
function paintClock(){
  const low = clk.sec <= 30;
  $('#timer').textContent = fmt(clk.sec); $('#timer').classList.toggle('low', low);
  $('#phaseName').textContent = PHASES[clk.phase].n;
  if ($('#projTimer')){ $('#projTimer').textContent = fmt(clk.sec); $('#projTimer').classList.toggle('low', low); $('#projPhase').textContent = PHASES[clk.phase].n; }
  paintStatus();
}
function tick(){ if (!clk.run) return; clk.sec--; if (clk.sec <= 0){ clk.sec = 0; clk.run = false; clearInterval(clk.id); carillon(); } paintClock(); }
async function wakeOn(){ try { if ('wakeLock' in navigator) clk.wake = await navigator.wakeLock.request('screen'); } catch {} }
function wakeOff(){ try { clk.wake && clk.wake.release(); clk.wake = null; } catch {} }
function initClock(){
  $('#phaseBtns').querySelectorAll('button').forEach(b => b.onclick = () => setPhaseBtn(b));
  $('#startBtn').onclick = () => {
    if (clk.run){ clk.run = false; clearInterval(clk.id); wakeOff(); $('#startBtn').textContent = '▶ Reprendre'; }
    else { clk.run = true; wakeOn(); $('#startBtn').textContent = '⏸ Pause'; clk.id = setInterval(tick, 1000); }
  };
  $('#resetBtn').onclick = () => { clk.run = false; clearInterval(clk.id); wakeOff(); clk.sec = PHASES[clk.phase].m * 60; $('#startBtn').textContent = '▶ Démarrer'; paintClock(); };
  $('#minus1').onclick = () => { clk.sec = Math.max(0, clk.sec - 60); paintClock(); };
  $('#plus1').onclick = () => { clk.sec += 60; paintClock(); };
  $('#nextPhase').onclick = () => { clk.phase = (clk.phase + 1) % PHASES.length; clk.sec = PHASES[clk.phase].m * 60; clk.run = false; clearInterval(clk.id); $('#startBtn').textContent = '▶ Démarrer'; $('#phaseBtns').querySelectorAll('button').forEach((b, i) => b.classList.toggle('sel', i === clk.phase)); paintClock(); };
  $('#setCustom').onclick = () => { const m = Math.max(1, Math.min(60, +$('#customMin').value || 10)); clk.sec = m * 60; clk.run = false; clearInterval(clk.id); $('#startBtn').textContent = '▶ Démarrer'; paintClock(); };
  $('#projBtn').onclick = () => openProjection();
  $('#projClose').onclick = () => { $('#projection').classList.remove('on'); };
  paintClock();
}
function setPhaseBtn(b){ const i = [...b.parentNode.children].indexOf(b); clk.phase = i; clk.sec = +b.dataset.min * 60; clk.run = false; clearInterval(clk.id); $('#startBtn').textContent = '▶ Démarrer'; b.parentNode.querySelectorAll('button').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); paintClock(); }
function openProjection(){ $('#projection').classList.add('on'); syncProjection(); paintClock(); wakeOn(); }
function syncProjection(){ const w = $('#projWall'); if (!w) return; const g = CURGAME; w.innerHTML = (g && g.clues && g.clues.length) ? g.clues.map(c => `<li>${esc(c)}</li>`).join('') : '<li style="opacity:.5">Aucun indice révélé.</li>'; }

/* ============ liens partageables ============ */
function handleHash(){
  const h = location.hash.slice(1); if (!h) return;
  if (h.startsWith('j=')){ // fiche joueur générée : j=seed-n-diff-idx
    const parts = h.slice(2).split('-');
    const seed = +parts[0], n = +parts[1], diff = parts[2], idx = +parts[3];
    const g = genererPartie(seed, n, diff);
    if (g && g.players[idx]) showPlayerCard(g, idx);
  } else if (h.startsWith('s=')){ // fiche joueur scénario : s=<id>-idx
    const [sid, idx] = h.slice(2).split('-'); const sc = DATA.scenarios.find(x => x.id === sid);
    if (sc){ const g = chargerScenario(sc); if (g && g.players[+idx]) showPlayerCard(g, +idx); }
  } else if (h.startsWith('g=')){ // partie complète : g=seed-n[-diff]
    const parts = h.slice(2).split('-'); genererPartie(+parts[0], +parts[1], parts[2] || 'int'); goTab('partie');
  }
}

/* ============ ambiance sonore (boucles + feu synthétisé) ============ */
const AMB = { el: null, cur: null };
const FIRE = { on: false, nodes: [], gain: null, timer: null };
function fireVol(){ return store.ambVol != null ? store.ambVol : 0.5; }
function fireStart(){
  if (FIRE.on) return; const c = ac(), sr = c.sampleRate;
  const buf = c.createBuffer(1, sr * 3, sr), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++){ const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
  const g = c.createGain(); g.gain.value = fireVol() * 0.6;
  src.connect(lp).connect(g).connect(c.destination); src.start();
  FIRE.nodes = [src]; FIRE.gain = g; FIRE.on = true;
  const crack = () => {
    if (!FIRE.on) return; const t = c.currentTime, len = 0.05 + Math.random() * 0.06;
    const cb = c.createBuffer(1, Math.ceil(sr * len), sr), cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / cd.length, 2);
    const o = c.createBufferSource(); o.buffer = cb;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800 + Math.random() * 2200; bp.Q.value = 0.7;
    const cg = c.createGain(); cg.gain.value = fireVol() * (0.3 + Math.random() * 0.5);
    o.connect(bp).connect(cg).connect(c.destination); o.start(t); o.stop(t + len + 0.02);
    FIRE.timer = setTimeout(crack, 120 + Math.random() * 520);
  };
  crack();
}
function fireStop(){
  FIRE.on = false; if (FIRE.timer){ clearTimeout(FIRE.timer); FIRE.timer = null; }
  FIRE.nodes.forEach(n => { try { n.stop(); } catch {} try { n.disconnect(); } catch {} });
  FIRE.nodes = []; FIRE.gain = null;
}
function ambPlay(name){
  if (!name || AMB.cur === name){ ambStop(); return; }
  ambStop();
  if (name === 'feu'){ fireStart(); AMB.cur = 'feu'; updAmbUI(); return; }
  AMB.el = new Audio('audio/' + name + '.ogg'); AMB.el.loop = true; AMB.el.volume = (store.ambVol != null ? store.ambVol : 0.5);
  AMB.el.play().catch(() => {}); AMB.cur = name; updAmbUI();
}
function ambStop(){ if (AMB.el){ AMB.el.pause(); AMB.el = null; } fireStop(); AMB.cur = null; updAmbUI(); }
function updAmbUI(){ $$('.amb-btn').forEach(b => b.classList.toggle('on', (b.dataset.amb || '') === (AMB.cur || ''))); }
function initAmbiance(){
  const v = $('#ambVol'); if (v){ v.value = Math.round((store.ambVol != null ? store.ambVol : 0.5) * 100); v.oninput = () => { store.ambVol = v.value / 100; if (AMB.el) AMB.el.volume = store.ambVol; if (FIRE.on && FIRE.gain) FIRE.gain.gain.value = fireVol() * 0.6; persist(); }; }
  $$('.amb-btn').forEach(b => b.onclick = () => ambPlay(b.dataset.amb));
  updAmbUI();
}

/* ============ accessibilité ============ */
function applyFontScale(){ const s = Math.min(1.5, Math.max(0.85, store.fontScale || 1)); document.documentElement.style.zoom = s; const v = $('#fsVal'); if (v) v.textContent = Math.round(s * 100) + '%'; }
function applyComfort(){ document.body.classList.toggle('comfort', !!store.comfort); const b = $('#comfortBtn'); if (b){ b.classList.toggle('on', !!store.comfort); b.textContent = store.comfort ? '✓ Mode grand confort' : 'Mode grand confort'; } }
function initA11y(){
  applyFontScale(); applyComfort();
  const set = d => { store.fontScale = Math.min(1.5, Math.max(0.85, +(((store.fontScale || 1) + d).toFixed(2)))); persist(); applyFontScale(); };
  $('#fsMinus') && ($('#fsMinus').onclick = () => set(-0.1));
  $('#fsPlus') && ($('#fsPlus').onclick = () => set(0.1));
  $('#fsReset') && ($('#fsReset').onclick = () => { store.fontScale = 1; persist(); applyFontScale(); });
  $('#comfortBtn') && ($('#comfortBtn').onclick = () => { store.comfort = !store.comfort; persist(); applyComfort(); });
  document.addEventListener('keydown', e => {
    if (!$('#horloge') || !$('#horloge').classList.contains('active')) return;
    const t = e.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    if (e.code === 'Space'){ e.preventDefault(); $('#startBtn').click(); }
    else if (e.key === 'r' || e.key === 'R'){ $('#resetBtn').click(); }
    else if (e.key === 'n' || e.key === 'N'){ $('#nextPhase').click(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); $('#plus1').click(); }
    else if (e.key === 'ArrowDown'){ e.preventDefault(); $('#minus1').click(); }
  });
}

/* ============ barre d'état + undo + accordéon + guide ============ */
let UNDO = [];
function pushUndo(g, label){ if (!g) return; UNDO.push({ label, snap: JSON.stringify({ acts: g.acts, tour: g.tour, live: g.live }) }); if (UNDO.length > 25) UNDO.shift(); paintStatus(); }
function undo(){ const g = CURGAME; if (!g || !UNDO.length) return; const u = UNDO.pop(); try { const s = JSON.parse(u.snap); g.acts = s.acts; g.tour = s.tour; g.live = s.live; } catch {} persistCur(); renderDashboard(); paintStatus(); toast('Annulé : ' + u.label); }

function paintStatus(){
  const sb = $('#statusbar'); if (!sb) return;
  const g = CURGAME; const show = !!(g && g.players);
  sb.hidden = !show; if (!show) return;
  $('#sbActs').textContent = g.acts; $('#sbTour').textContent = g.tour;
  $('#sbTime').textContent = fmt(clk.sec); $('#sbTime').classList.toggle('low', clk.sec <= 30);
  $('#sbPhase').textContent = PHASES[clk.phase].n;
  $('#sbPlay').textContent = clk.run ? '⏸' : '▶';
  const u = $('#sbUndo'); if (u) u.hidden = !UNDO.length;
}
function initStatus(){
  $('#sbPlay').onclick = () => { $('#startBtn').click(); paintStatus(); };
  $('#sbClock').onclick = () => goTab('horloge');
  $('#sbUndo').onclick = () => undo();
  $$('#statusbar .sb-jump').forEach(b => b.onclick = () => goTab(b.dataset.jump));
  paintStatus();
}

function makeAccordion(container){
  container.querySelectorAll('.card').forEach(card => {
    const h = card.querySelector('h3.fic'); if (!h || card.classList.contains('acc')) return;
    card.classList.add('acc');
    const id = h.textContent.trim().slice(0, 24); card.dataset.acc = id;
    const body = el('div', 'acc-body'); let n = h.nextSibling; while (n){ const nx = n.nextSibling; body.appendChild(n); n = nx; }
    card.appendChild(body); h.classList.add('acc-h');
    const chev = el('span', 'acc-chev', '▾'); h.appendChild(chev);
    card.classList.toggle('collapsed', store.acc[id] === false);
    h.onclick = () => { card.classList.toggle('collapsed'); store.acc[id] = !card.classList.contains('collapsed'); persist(); };
  });
}

function initCastFilter(){
  const dim = $('#castDim'), val = $('#castVal'); if (!dim) return;
  const sInput = $('#castSearch');
  if (sInput) sInput.oninput = () => {
    const q = sInput.value.trim().toLowerCase(), out = $('#castSearchOut');
    if (!out) return;
    if (!q){ out.innerHTML = ''; return; }
    const list = DATA.cast.filter(c => c.nom.toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q) || String(c.num) === q || nomCourt(c.num).toLowerCase().includes(q)).slice(0, 12);
    out.innerHTML = list.length
      ? list.map(c => `<div class="prow" style="padding:5px 0"><div class="who"><b>${esc(c.nom)}</b> <span class="muted">(${esc(nomCourt(c.num))})</span><div class="r">${esc(c.role)} · ${Object.keys(LABELS).map(d => LABELS[d] + ' : ' + esc(c.pub[d])).join(' · ')}</div></div></div>`).join('')
      : '<p class="empty">Aucun personnage trouvé.</p>';
  };
  Object.keys(LABELS).forEach(d => dim.appendChild(new Option(LABELS[d], d)));
  const fillVals = () => { const d = dim.value; const vals = [...new Set(DATA.cast.map(c => c.pub[d]))].sort(); val.innerHTML = ''; vals.forEach(v => val.appendChild(new Option(v, v))); render(); };
  const render = () => {
    const d = dim.value, v = val.value; const list = DATA.cast.filter(c => c.pub[d] === v);
    $('#castCount').textContent = list.length + ' personnage(s)';
    $('#castOut').innerHTML = list.map(c => `<div class="prow" style="padding:4px 0"><div class="who"><b>${esc(nomCourt(c.num))}</b> — ${esc(c.role)}</div></div>`).join('') || '<p class="empty">Aucun.</p>';
  };
  dim.onchange = fillVals; val.onchange = render; fillVals();
}

function maybeWelcome(){ if (!store.seenWelcome) showWelcome(); }
function showWelcome(){
  let ov = $('#welcome'); if (!ov){ ov = el('div', 'modal'); ov.id = 'welcome'; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="modal-box">
    <h2>Bienvenue, Meneur de Jeu</h2>
    <p class="muted">Votre console pour <b>L'Heure du Crime</b>, en trois gestes :</p>
    <ol class="wsteps">
      <li><b>① Composez</b> — onglet <b>Partie</b> : 🎲 Générer (ou un scénario).</li>
      <li><b>② Distribuez</b> — onglet <b>Rôles</b> : tendez à chacun sa fiche (lien / QR).</li>
      <li><b>③ Menez</b> — onglet <b>En jeu</b> : compteurs, indices, accusation, Dénouement. La barre du haut suit toujours l'état.</li>
    </ol>
    <p class="tip">Installable et hors-ligne. Réglages & aide dans l'onglet <b>Aide</b>.</p>
    <div class="rowflex" style="justify-content:center;margin-top:10px;gap:10px">${(CURGAME && CURGAME.players) ? '<button class="act" id="wResume">▶ Reprendre la partie en cours</button>' : ''}<button class="${(CURGAME && CURGAME.players) ? 'ghost' : 'act big-act'}" id="wStart">Commencer</button></div>
  </div>`;
  ov.classList.add('on');
  $('#wStart').onclick = () => { store.seenWelcome = true; persist(); ov.classList.remove('on'); };
  if ($('#wResume')) $('#wResume').onclick = () => { store.seenWelcome = true; persist(); ov.classList.remove('on'); renderDashboard(); goTab('enjeu'); };
}

/* ============ service worker ============ */
function registerSW(){ if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); }

/* ============ toast ============ */
let toastT = null;
function toast(msg){ let t = $('#toast'); if (!t){ t = el('div'); t.id = 'toast'; document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
