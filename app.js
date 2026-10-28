const T={fr:{home:'Accueil',meals:'Mes repas',hist:'Historique',prof:'Mon profil',set:'Paramètres',snap:'📷 Photographier mon repas'}};
const t=k=>T.fr[k]||k;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=n=>Math.round(n);
const iso=d=>{d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const TYPES={petitdej:'Petit-déjeuner',dejeuner:'Déjeuner',diner:'Dîner',collation:'Collation'};
const ACT={sed:['Sédentaire',1.2],leg:['Légèrement actif',1.375],mod:['Modérément actif',1.55],tres:['Très actif',1.725]};
let S={profile:null,meals:[],weights:{}},tab='home',day=iso(),range=7,draft=null,mem=null;
try{const j=localStorage.getItem('nutriphoto');if(j)S=JSON.parse(j)}catch(e){}
function save(){try{localStorage.setItem('nutriphoto',JSON.stringify(S))}catch(e){toast('Enregistrement local indisponible : les données seront perdues à la fermeture.')}}
function toast(m){alert(m)}
function calc(p){
  const bmr=10*p.w+6.25*p.h-5*p.age+(p.sex==='H'?5:-161),tdee=bmr*ACT[p.act][1];
  let target=tdee+(p.goal==='perdre'?-500:p.goal==='prendre'?300:0),min=p.sex==='H'?1500:1200,adj=false;
  if(target<min){target=min;adj=true}
  const pr=1.6*p.w,fat=0.27*target/9,carb=Math.max(0,(target-pr*4-fat*9)/4);
  return{bmr:R(bmr),tdee:R(tdee),target:R(target),p:R(pr),c:R(carb),f:R(fat),adj,min}}
function dayMeals(d){return S.meals.filter(m=>m.date===d)}
function tot(ms){const r={k:0,p:0,c:0,f:0};ms.forEach(m=>m.items.forEach(i=>{r.k+=+i.kcal||0;r.p+=+i.p||0;r.c+=+i.c||0;r.f+=+i.f||0}));return r}
const mk=m=>R(tot([m]).k);
/* ---------- rendu ---------- */
function render(){
  $('#ui').innerHTML='';
  if(!S.profile){$('#app').innerHTML=profileView(true);return}
  const v={home:homeView,meals:mealsView,hist:histView,prof:()=>profileView(false),set:setView}[tab]();
  $('#app').innerHTML=v;
  $('#ui').innerHTML=`<button class="fab" onclick="openDraft()">${t('snap')}</button><nav>${[['home','🏠'],['meals','🍽️'],['hist','📈'],['prof','👤'],['set','⚙️']].map(([k,e])=>`<button class="${tab===k?'on':''}" onclick="tab='${k}';render()"><b>${e}</b>${t(k)}</button>`).join('')}</nav>`;
  if(draft)drawDraft()}
function profileView(first){
  const p=S.profile||{age:'',sex:'H',h:'',w:'',act:'leg',goal:'maintenir',gw:''};const c=S.profile&&calc(S.profile);
  return`<div class="hero hB"><h1>${first?'Bienvenue 👋 Commençons par votre profil':'Mon profil'}</h1></div>
  ${first?'<p class="mut">Étape obligatoire : vos besoins caloriques sont calculés une seule fois, puis enregistrés sur cet appareil.</p>':''}
  <form class="card" onsubmit="saveProfile(event)"><div class="row"><div><label>Âge</label><input name="age" type="number" min="15" max="100" required value="${p.age}"></div>
  <div><label>Sexe</label><select name="sex"><option value="H" ${p.sex==='H'?'selected':''}>Homme</option><option value="F" ${p.sex==='F'?'selected':''}>Femme</option></select></div></div>
  <div class="row"><div><label>Taille (cm)</label><input name="h" type="number" min="120" max="230" required value="${p.h}"></div><div><label>Poids actuel (kg)</label><input name="w" type="number" step="0.1" min="35" max="300" required value="${p.w}"></div></div>
  <label>Niveau d’activité</label><select name="act">${Object.entries(ACT).map(([k,v])=>`<option value="${k}" ${p.act===k?'selected':''}>${v[0]}</option>`).join('')}</select>
  <label>Objectif</label><select name="goal"><option value="perdre" ${p.goal==='perdre'?'selected':''}>Perdre du poids</option><option value="maintenir" ${p.goal==='maintenir'?'selected':''}>Maintenir mon poids</option><option value="prendre" ${p.goal==='prendre'?'selected':''}>Prendre du poids</option></select>
  <label>Poids objectif (kg, facultatif)</label><input name="gw" type="number" step="0.1" value="${p.gw||''}">
  <p><button>${first?'Calculer mes besoins':'Enregistrer'}</button></p></form>
  ${c?`<div class="card"><h2>Mes résultats</h2><div class="grid"><div><div class="big">${c.bmr}</div><span class="mut">BMR (kcal/jour au repos)</span></div><div><div class="big">${c.tdee}</div><span class="mut">TDEE (dépense totale)</span></div><div><div class="big" style="color:var(--pri)">${c.target}</div><span class="mut">Objectif quotidien</span></div></div>
  <p class="mut">Calcul par la formule de Mifflin-St Jeor, multipliée par votre niveau d’activité. Objectif : −500 kcal pour perdre (≈0,5 kg/semaine), +300 pour prendre. Repères : protéines ${c.p} g, glucides ${c.c} g, lipides ${c.f} g.${c.adj?` L’objectif a été relevé à ${c.min} kcal : il ne faut pas descendre plus bas sans suivi médical.`:''} Ce sont des estimations, pas des prescriptions.</p></div>`:''}`}
function saveProfile(e){e.preventDefault();const f=new FormData(e.target);
  S.profile={age:+f.get('age'),sex:f.get('sex'),h:+f.get('h'),w:+f.get('w'),act:f.get('act'),goal:f.get('goal'),gw:+f.get('gw')||null};
  S.weights[iso()]=S.profile.w;save();tab='home';render()}
function ring(v,max){const r=52,c=2*Math.PI*r,pc=Math.min(1,v/max);const over=v>max;
  return`<svg viewBox="0 0 130 130" width="150"><circle cx="65" cy="65" r="${r}" fill="none" stroke="var(--line)" stroke-width="12"/><circle cx="65" cy="65" r="${r}" fill="none" stroke="${over?'var(--warn)':'var(--pri)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c*pc} ${c}" transform="rotate(-90 65 65)"/><text x="65" y="63" text-anchor="middle" style="font-size:22px;font-weight:700;fill:var(--tx)">${R(v)}</text><text x="65" y="80" text-anchor="middle">/ ${max} kcal</text></svg>`}
function macroBar(n,v,g){return`<div style="margin:8px 0"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span>${n}</span><span class="mut" style="text-align:right">${R(v)} / ${g} g</span></div><div class="bar"><i style="width:${Math.min(100,v/g*100)}%"></i></div></div>`}
function mealRow(m,del){return`<div class="meal">${m.thumb?`<img src="${m.thumb}" alt="">`:'<img alt="">'}<div><b>${TYPES[m.type]}</b> ${m.demo?'<span class="pill w">démo</span>':''}<div class="mut">${esc(m.items.map(i=>i.name).join(', ')||'—').slice(0,70)}</div></div><b>${mk(m)} kcal</b>${del?`<button class="del" onclick="delMeal('${m.id}')">✕</button>`:''}</div>`}
function homeView(){const c=calc(S.profile),ms=dayMeals(iso()),x=tot(ms),left=c.target-x.k;
  return`<div class="hero hA"><h1>Aujourd’hui 💪</h1></div><div class="card row" style="flex-wrap:nowrap"><div style="flex:0 0 150px">${ring(x.k,c.target)}</div><div><div class="big" style="color:${left<0?'var(--warn)':'var(--pri)'}">${left>=0?R(left)+' kcal restantes':R(-left)+' kcal au-dessus'}</div><p class="mut">Objectif : ${c.target} kcal. Les valeurs sont des estimations.</p></div></div>
  <div class="card"><h2>Macronutriments</h2>${macroBar('Protéines',x.p,c.p)}${macroBar('Glucides',x.c,c.c)}${macroBar('Lipides',x.f,c.f)}</div>
  <div class="card"><h2>Repas du jour</h2>${ms.map(m=>mealRow(m,false)).join('')||'<p class="mut">Aucun repas enregistré. Touchez le bouton vert pour commencer.</p>'}</div>${sugg(left)}`}
const DISHES=[['Harira (1 bol)',200],['Œufs durs ×2 + ¼ pain marocain + salade',330],['Omelette 2 œufs + pain marocain',380],['Salade marocaine (1 c. à s. d’huile)',120],['Lentilles (adass), 1 assiette',320],['Sardines grillées + salade + pain',450],['Tajine poulet-légumes (1 portion)',520],['Tajine kefta aux œufs (1 portion)',550],['Couscous légumes + poulet (1 assiette)',650],['Msemen nature ×1',250]];
function sugg(left){const l=left<=150?'':DISHES.filter(d=>d[1]<=left+60).slice(0,5);
  return`<div class="card"><h2>💡 Idées de repas</h2>${!l?'<p class="mut">Vous avez presque atteint votre objectif du jour. Inutile de manger moins ensuite : ne sautez pas vos repas, ajustez simplement demain.</p>':
  l.map(d=>`<div class="meal"><div>${esc(d[0])}<div class="mut">≈ ${d[1]} kcal (portion moyenne)</div></div><button class="sec" onclick="addDish(${DISHES.indexOf(d)})">Ajouter</button></div>`).join('')+'<p class="mut">Estimations pour une portion standard : à l’ajout, précisez la portion et la quantité d’huile pour affiner.</p>'}</div>`}
function addDish(i){const d=DISHES[i];openDraft();draft.items=[{name:d[0],g:'',kcal:d[1],p:'',c:'',f:''}];draft.note='Estimation moyenne : ajustez portion et huile.';drawDraft()}
function mealsView(){const ms=dayMeals(iso());return`<h1>Mes repas</h1><div class="card">${ms.map(m=>mealRow(m,true)).join('')||'<p class="mut">Aucun repas aujourd’hui.</p>'}<p><button class="sec" onclick="openDraft(true)">+ Saisie manuelle</button></p></div>`}
function delMeal(id){if(confirm('Supprimer ce repas ?')){S.meals=S.meals.filter(m=>m.id!==id);save();render()}}
function bars(days,goal){const w=Math.max(300,days.length*(days.length>10?14:38)),H=140,mx=Math.max(goal*1.3,...days.map(d=>d.k));
  const bw=w/days.length;return`<div style="overflow-x:auto"><svg viewBox="0 0 ${w} ${H+18}" width="100%" style="min-width:${w}px">${days.map((d,i)=>`<rect x="${i*bw+2}" y="${H-d.k/mx*H}" width="${bw-4}" height="${d.k/mx*H}" rx="3" fill="${d.k>goal?'var(--warn)':'var(--pri)'}"/><text x="${i*bw+bw/2}" y="${H+12}" text-anchor="middle">${d.l}</text>`).join('')}<line x1="0" x2="${w}" y1="${H-goal/mx*H}" y2="${H-goal/mx*H}" stroke="var(--bad)" stroke-dasharray="4"/></svg></div>`}
function wchart(){const e=Object.entries(S.weights).sort().slice(-60);if(e.length<2)return'<p class="mut">Ajoutez au moins deux pesées pour voir la courbe.</p>';
  const v=e.map(x=>x[1]),mn=Math.min(...v)-1,mx=Math.max(...v)+1,w=320,H=110;const pts=e.map((x,i)=>`${i/(e.length-1)*w},${H-(x[1]-mn)/(mx-mn)*H}`).join(' ');
  return`<svg viewBox="0 0 ${w} ${H+14}" width="100%"><polyline points="${pts}" fill="none" stroke="var(--pri)" stroke-width="2.5"/><text x="0" y="${H+12}">${e[0][0]} · ${e[0][1]} kg</text><text x="${w}" y="${H+12}" text-anchor="end">${e.at(-1)[0]} · ${e.at(-1)[1]} kg</text></svg>`}
function histView(){const c=calc(S.profile),days=[];for(let i=range-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=iso(d);days.push({k:tot(dayMeals(k)).k,l:range>10?String(d.getDate()):['D','L','M','M','J','V','S'][d.getDay()]})}
  const logged=days.filter(d=>d.k>0),avg=logged.length?R(logged.reduce((a,b)=>a+b.k,0)/logged.length):0,sum=R(days.reduce((a,b)=>a+b.k,0));const ms=dayMeals(day);
  return`<div class="hero hB" style="height:130px"><h1>Historique</h1></div><div class="card"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h2>Consommé vs objectif (${c.target})</h2><select style="width:auto" onchange="range=+this.value;render()"><option value="7" ${range===7?'selected':''}>7 jours</option><option value="30" ${range===30?'selected':''}>30 jours</option></select></div>${bars(days,c.target)}<p class="mut">Total : ${sum} kcal · Moyenne des jours renseignés : ${avg} kcal (objectif ${c.target}). Ligne rouge = objectif.</p></div>
  <div class="card"><h2>Calendrier</h2><input type="date" value="${day}" max="${iso()}" onchange="day=this.value||iso();render()"><p class="mut">Total du jour : ${R(tot(ms).k)} kcal</p>${ms.map(m=>mealRow(m,true)).join('')||'<p class="mut">Aucun repas ce jour-là.</p>'}</div>
  <div class="card"><h2>Poids</h2>${wchart()}<div class="row"><input id="wi" type="number" step="0.1" placeholder="Poids du jour (kg)"><button class="sec" onclick="addW()">Enregistrer la pesée</button></div></div>`}
function addW(){const v=+$('#wi').value;if(!(v>30&&v<300))return toast('Poids invalide.');S.weights[iso()]=v;S.profile.w=v;save();render()}
function setView(){return`<h1>Paramètres</h1><div class="card"><h2>Langue</h2><select disabled><option>Français</option><option>العربية (bientôt)</option></select><p class="mut">Les textes sont centralisés pour permettre l’ajout de l’arabe.</p></div>
  <div class="card"><h2>Thème</h2><div class="row"><button class="sec" onclick="document.documentElement.dataset.theme='light'">Clair</button><button class="sec" onclick="document.documentElement.dataset.theme='dark'">Sombre</button></div></div>
  <div class="card"><h2>Données</h2><p class="mut">Stockées uniquement dans ce navigateur, sur cet appareil.</p><div class="row"><button class="sec" onclick="exp()">Exporter (JSON)</button><button class="del" onclick="if(confirm('Tout effacer ?')){S={profile:null,meals:[],weights:{}};save();render()}">Tout effacer</button></div></div>`}
async function exp(){const d=JSON.stringify(S);try{const dl=await claude.use('downloads');if(dl)return dl.save({filename:'nutriphoto.json',data:d})}catch(e){}toast('Export indisponible ici.')}
/* ---------- repas ---------- */
function openDraft(manual){const h=new Date().getHours();draft={type:h<10?'petitdej':h<15?'dejeuner':h<18?'collation':'diner',thumb:'',items:[],conf:'',note:'',demo:false,busy:false,blob:null};if(manual)draft.items=[newItem()];drawDraft()}
const newItem=()=>({name:'',g:'',kcal:'',p:'',c:'',f:''});
function drawDraft(){if(!draft)return;const d=draft;
  $('#ui').insertAdjacentHTML('beforeend','');let m=$('#modal');if(!m){m=document.createElement('div');m.id='modal';m.className='modal';document.body.appendChild(m)}
  m.innerHTML=`<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><h2>Nouveau repas</h2><button class="del" onclick="closeDraft()">Fermer</button></div>
  <label>Type de repas</label><select onchange="draft.type=this.value">${Object.entries(TYPES).map(([k,v])=>`<option value="${k}" ${d.type===k?'selected':''}>${v}</option>`).join('')}</select>
  <div class="row" style="margin-top:10px"><label class="sec" style="background:var(--pri2);color:var(--pri);padding:11px;border-radius:12px;text-align:center;margin:0;cursor:pointer;font-weight:600">📷 Prendre une photo<input type="file" accept="image/*" capture="environment" hidden onchange="onPhoto(this)"></label><label style="background:var(--pri2);color:var(--pri);padding:11px;border-radius:12px;text-align:center;margin:0;cursor:pointer;font-weight:600">🖼️ Galerie / ordinateur<input type="file" accept="image/*" hidden onchange="onPhoto(this)"></label></div>
  ${d.thumb?`<img src="${d.thumb}" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin-top:10px" alt="">`:''}
  ${d.busy?'<p class="mut">⏳ Analyse en cours…</p>':''}
  ${d.conf?`<p><span class="pill">Confiance : ${esc(d.conf)}</span> <span class="mut">Estimation par IA, non exacte.</span></p>`:''}
  ${d.demo?'<p><span class="pill w">MODE DÉMO</span> <span class="mut">Valeurs d’exemple, sans analyse réelle de votre photo.</span></p>':''}
  ${d.note?`<p class="mut">❓ ${esc(d.note)}</p>`:''}
  ${d.thumb&&!d.busy?'<p class="mut"><button class="sec" onclick="demo()">Utiliser le mode démo</button></p>':''}
  <h2 style="margin-top:12px">Aliments</h2>${d.items.map((i,n)=>`<div class="it"><input placeholder="Aliment" value="${esc(i.name)}" onchange="draft.items[${n}].name=this.value"><input type="number" placeholder="g" value="${i.g}" onchange="setG(${n},this.value)"><input type="number" placeholder="kcal" value="${i.kcal}" onchange="draft.items[${n}].kcal=+this.value;drawDraft()">
  <div class="mac"><input type="number" placeholder="P g" value="${i.p}" onchange="draft.items[${n}].p=+this.value"><input type="number" placeholder="G g" value="${i.c}" onchange="draft.items[${n}].c=+this.value"><input type="number" placeholder="L g" value="${i.f}" onchange="draft.items[${n}].f=+this.value"><span class="mut" style="align-self:center">P/G/L</span><button class="del" onclick="draft.items.splice(${n},1);drawDraft()">✕</button></div></div>`).join('')||'<p class="mut">Aucun aliment.</p>'}
  <div class="row"><button class="sec" onclick="draft.items.push(newItem());drawDraft()">+ Ajouter un aliment</button><button class="sec" onclick="draft.items.push({name:'Huile / sauce',g:10,kcal:90,p:0,c:0,f:10});drawDraft()">+ Huile (1 c. à s.)</button></div>
  <p class="mut">Pensez à l’huile, aux sauces, au sucre et aux boissons : rarement visibles sur une photo.</p>
  <h2>Total : ${R(d.items.reduce((a,i)=>a+(+i.kcal||0),0))} kcal</h2><button onclick="saveDraft()" ${d.busy?'disabled':''}>Enregistrer le repas</button></div>`}
function setG(n,v){const i=draft.items[n],old=+i.g,nv=+v;if(old>0&&nv>0){const f=nv/old;['kcal','p','c','f'].forEach(k=>{if(i[k]!=='')i[k]=Math.round(i[k]*f*10)/10})}i.g=nv;drawDraft()}
function closeDraft(){draft=null;const m=$('#modal');if(m)m.remove()}
function saveDraft(){const d=draft,items=d.items.filter(i=>i.name||i.kcal);if(!items.length)return toast('Ajoutez au moins un aliment.');
  S.meals.push({id:Date.now().toString(36),date:iso(),type:d.type,thumb:d.thumb,items,conf:d.conf,demo:d.demo});save();closeDraft();render()}
function img(file,max,q){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const s=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*s;c.height=im.height*s;c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>res({blob:b,url:c.toDataURL('image/jpeg',q)}),'image/jpeg',q)};im.onerror=rej;im.src=u})}
async function onPhoto(inp){const f=inp.files[0];if(!f)return;if(!f.type.startsWith('image/'))return toast('Fichier image requis.');
  try{const big=await img(f,1024,.8),sm=await img(f,240,.7);draft.thumb=sm.url;draft.blob=big.blob;draft.demo=false;analyze()}catch(e){toast('Image illisible.')}}
async function analyze(){const d=draft;d.busy=true;d.conf='';d.note='';drawDraft();
  try{const s=await claude.use('sample');if(!s)throw{code:'na'};const lim=s.limits?await s.limits():{images:true};if(!lim.images)throw{code:'na'};
    const r=await s.json('Tu es nutritionniste. Identifie chaque aliment visible sur cette photo de repas et estime sa masse en grammes et ses calories et macros (p=protéines, c=glucides, f=lipides, en g). Inclus la cuisine marocaine si pertinent. Sois prudent, ne prétends pas à une précision exacte. Réponds UNIQUEMENT par un JSON : {"items":[{"name":"","grams":0,"kcal":0,"p":0,"c":0,"f":0}],"confidence":"faible|moyenne|élevée","question":"une précision à demander (huile, sauce, portion…)"}. Si ce n’est pas un repas : items vide.',{images:[d.blob],cache:false});
    d.items=(r.items||[]).map(i=>({name:String(i.name||''),g:+i.grams||'',kcal:R(+i.kcal||0),p:+i.p||0,c:+i.c||0,f:+i.f||0}));d.conf=r.confidence||'faible';d.note=r.question||'';if(!d.items.length)d.note='Aucun aliment reconnu : ajoutez-les manuellement.'}
  catch(e){d.note=e&&e.code==='na'?'Analyse IA indisponible ici : saisissez les aliments à la main ou utilisez le mode démo.':'Analyse impossible ('+(e&&e.code||'erreur')+'). Saisissez les aliments à la main.'}
  d.busy=false;drawDraft()}
function demo(){const d=draft;d.demo=true;d.conf='démo';d.note='Exemple fictif : corrigez selon votre assiette.';d.items=[{name:'Poulet grillé',g:120,kcal:198,p:37,c:0,f:4},{name:'Riz cuit',g:150,kcal:195,p:4,c:42,f:0.5},{name:'Légumes cuits',g:100,kcal:40,p:2,c:7,f:0.5}];drawDraft()}
render();
