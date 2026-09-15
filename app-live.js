(async function(){
'use strict';

const PROFILE_DEFAULT={
  zone:'Strasbourg + première couronne',
  maxBudget:150000,
  targetGross:0.065,
  maxChargesMonthly:140,
  maxChargesM2Year:35,
  downPayment:25000,
  emergencyFund:6000,
  maxMonthlyEffort:0,
  dcaIslamic:500,
  vacancyRate:0.03,
  maintenanceRate:0.05,
  nonRecoverableShare:0.35,
  pnoYear:120,
  acquisitionCostRate:0.08,
  contributionRate:0.20,
  favorableRate:0.04,
  favorableYears:20,
  prudentRate:0.045,
  prudentYears:15
};

let profile=read('houserLiveProfile',PROFILE_DEFAULT);
let decisions=read('houserLiveDecisions',{});
let db={schemaVersion:1,updatedAt:null,listings:[]};
let view='matches';
let index=0;
let activeImage=0;

function read(k,f){try{const r=localStorage.getItem(k);return r?Object.assign({},f,JSON.parse(r)):Object.assign({},f)}catch{return Object.assign({},f)}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function euro(n){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0)}
function pct(n){return ((Number.isFinite(n)?n:0)*100).toFixed(1)+' %'}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function annuity(principal,annualRate,years){const r=annualRate/12,n=years*12;if(!principal||principal<=0)return 0;if(!r)return principal/n;return principal*r/(1-Math.pow(1+r,-n))}
function tip(t){return '<span class="tip" tabindex="0">i<span class="tipbox">'+esc(t)+'</span></span>'}

async function loadDb(){
  try{
    const res=await fetch('./data/listings.json?ts='+Date.now(),{cache:'no-store'});
    if(!res.ok)throw new Error('HTTP '+res.status);
    db=await res.json();
    if(!Array.isArray(db.listings))db.listings=[];
  }catch(e){
    document.getElementById('app').innerHTML='<main class="app"><section class="card empty"><h2>Base Houser indisponible</h2><p>'+esc(e.message)+'</p></section></main>';
    throw e;
  }
}

function calc(x){
  const surface=Number(x.surface||0),price=Number(x.price||0),rent=Number(x.rentEstimateHC||0),charges=Number(x.chargesAnnual||0),tax=Number(x.propertyTax||0),market=Number(x.marketPriceM2||0),works=Number(x.works||0);
  const ppm=surface?price/surface:0;
  const gross=price?rent*12/price:0;
  const chargesMonthly=charges/12;
  const chargesM2=surface?charges/surface:0;
  const nonRecoverable=charges*profile.nonRecoverableShare;
  const vacancy=rent*12*profile.vacancyRate;
  const maintenance=rent*12*profile.maintenanceRate;
  const netAnnual=rent*12-nonRecoverable-tax-vacancy-maintenance-profile.pnoYear;
  const netMonthly=netAnnual/12;
  const totalCost=price*(1+profile.acquisitionCostRate)+works;
  const requiredContribution=totalCost*profile.contributionRate;
  const contributionGap=Math.max(0,requiredContribution-profile.downPayment);
  const financed=Math.max(0,totalCost-requiredContribution);
  const paymentFav=annuity(financed,profile.favorableRate,profile.favorableYears);
  const paymentPrudent=annuity(financed,profile.prudentRate,profile.prudentYears);
  const effortFav=paymentFav-netMonthly;
  const effortPrudent=paymentPrudent-netMonthly;
  const yieldPrice=profile.targetGross?rent*12/profile.targetGross:0;
  const marketPrice=market*surface;
  let riskFactor=1;
  if(x.dpe==='E')riskFactor-=.06;
  if(x.coproStatus==='unknown')riskFactor-=.03;
  if(chargesMonthly>profile.maxChargesMonthly)riskFactor-=.04;
  if(chargesMonthly>220)riskFactor-=.08;
  const riskAdjustedMarket=Math.max(0,marketPrice*riskFactor-works);
  const houserPrice=Math.round(Math.min(yieldPrice||Infinity,riskAdjustedMarket||Infinity)/1000)*1000;
  const discount=price?1-houserPrice/price:0;
  let score=50;
  score+=clamp((gross-.055)*850,-15,15);
  score+=clamp(((market-ppm)/(market||1))*30,-12,12);
  if(chargesMonthly<=100&&chargesM2<=28)score+=10;else if(chargesMonthly<=profile.maxChargesMonthly&&chargesM2<=profile.maxChargesM2Year)score+=5;else if(chargesMonthly<=220&&chargesM2<=50)score-=8;else score-=20;
  if(['A','B','C'].includes(x.dpe))score+=6;else if(x.dpe==='D')score+=3;else if(x.dpe==='E')score-=8;else score-=30;
  if(x.coproStatus==='clean')score+=4;else if(x.coproStatus==='unknown')score-=3;else score-=20;
  if(effortFav<=0)score+=22;else if(effortFav<=50)score+=15;else if(effortFav<=100)score+=7;else if(effortFav<=200)score-=4;else score-=18;
  if(contributionGap>0)score-=Math.min(12,contributionGap/1000*2);
  if(price>profile.maxBudget)score-=10;
  score=Math.round(clamp(score,0,100));
  const hardBlock=!x.free||['F','G'].includes(x.dpe)||x.coproStatus==='risk';
  let verdict='🔴 Passer';
  if(!hardBlock){
    if(effortFav<=0&&effortPrudent<=100)verdict='🟢 Autofinancement probable';
    else if(effortFav<=50)verdict='🟢 Très proche du neutre';
    else if(effortFav<=100)verdict='🟠 À creuser';
    else if(effortFav<=180)verdict='🟡 À surveiller';
  }
  const opening=Math.max(0,Math.round(houserPrice*0.96/1000)*1000);
  return Object.assign({},x,{surface,price,rent,charges,tax,market,works,ppm,gross,chargesMonthly,chargesM2,netAnnual,netMonthly,totalCost,requiredContribution,contributionGap,financed,paymentFav,paymentPrudent,effortFav,effortPrudent,yieldPrice,marketPrice,riskAdjustedMarket,houserPrice,discount,score,hardBlock,verdict,opening});
}

function enriched(){return db.listings.map(calc)}
function activeMatches(){return enriched().filter(x=>!x.hardBlock&&!decisions[x.id]).sort((a,b)=>a.effortFav-b.effortFav||b.score-a.score)}
function shortlist(){return enriched().filter(x=>decisions[x.id]==='deep').sort((a,b)=>a.effortFav-b.effortFav)}

function header(){
  const n=db.listings.length,deep=Object.values(decisions).filter(v=>v==='deep').length;
  return '<header class="top"><div class="brand"><div class="logo">⌂</div><div><b>Houser Live</b><div class="muted small">Base '+n+' annonces · MAJ '+esc(db.updatedAt||'inconnue')+'</div></div></div><nav class="tabs">'+tab('matches','Matches')+tab('base','Base · '+n)+tab('short','À creuser · '+deep)+tab('criteria','Critères')+'</nav></header>';
}
function tab(k,l){return '<button class="btn '+(view===k?'on':'')+'" data-view="'+k+'">'+l+'</button>'}

function matchesView(){
  const q=activeMatches();
  if(!q.length)return '<section class="card empty"><h2>Aucun nouveau dossier solide pour l’instant</h2><p class="muted">C’est volontaire : Houser peut attendre. La veille continue d’alimenter la base et ne remonte que les dossiers proches de l’autofinancement.</p></section>';
  if(index>=q.length)index=0;
  const x=q[index];
  return '<div class="feedhead"><div><div class="eyebrow">AUTOFINANCEMENT FIRST</div><h1>'+esc(x.city)+' · '+esc(x.area)+'</h1><div class="muted">'+(index+1)+' / '+q.length+' · classés par effort Mourabaha estimé</div></div><div class="price">'+euro(x.price)+'</div></div>'+propertyCard(x);
}

function propertyCard(x){
  return '<section class="property card">'+gallery(x)+'<div class="propertyBody">'+
  '<div class="propertyTop"><div><span class="badge">'+esc(x.type||'Bien')+'</span><span class="badge">'+x.surface+' m²</span><span class="badge">DPE '+esc(x.dpe)+'</span><span class="badge">✅ Libre</span></div><strong>'+x.score+'/100</strong></div>'+ 
  '<div class="metricGrid">'+
    metric('Effort favorable',effortLabel(x.effortFav),'Proxy 20 ans / 4 % équivalent. Ce n’est pas un devis 570easi : c’est un scénario pour savoir si le dossier mérite qu’on demande un financement.',effortClass(x.effortFav))+
    metric('Effort prudent',effortLabel(x.effortPrudent),'Proxy 15 ans / 4,5 % équivalent, volontairement plus dur pour tester la robustesse du deal.',effortClass(x.effortPrudent))+
    metric('Loyer prudent',euro(x.rent)+' HC','Estimation Houser à partir du marché local et des comparables. On préfère sous-estimer que fabriquer du rendement.','')+
    metric('Rendement brut',pct(x.gross),'Loyer HC annuel ÷ prix affiché. Premier filtre seulement.','')+
    metric('Charges copro',euro(x.chargesMonthly)+'/mois','Houser pénalise les charges élevées et regarde aussi les €/m²/an. Au stade Creuser, on remplace l’hypothèse par la vraie part non récupérable.','')+
    metric('Apport proxy 570easi',euro(x.requiredContribution),'Repère de screening : 20 % du coût total estimé. La structure exacte et le devis réel du financeur priment.','')+
  '</div>'+ 
  '<div class="verdictRow"><div><div class="eyebrow">VERDICT</div><h2>'+x.verdict+'</h2></div><div class="chargePill '+(x.effortFav<=100?'ok':'warn')+'">Net avant financement '+euro(x.netMonthly)+'/mois</div></div>'+ 
  '<div class="twoCol"><div class="explain"><h3>Pourquoi ce prix conseillé ? '+tip('Houser Price = la plus prudente des deux ancres : prix compatible avec le rendement cible et valeur de marché ajustée des risques connus.')+'</h3>'+row('Prix compatible rendement',euro(x.yieldPrice),'cible '+pct(profile.targetGross))+row('Valeur marché',euro(x.marketPrice),(x.marketPriceM2||0)+' €/m² utilisé')+row('Marché ajusté risques',euro(x.riskAdjustedMarket),'charges, DPE, copro, travaux')+'<div class="houserPrice"><span>Houser Price™</span><b>'+euro(x.houserPrice)+'</b></div></div>'+ 
  '<div class="nego"><div class="eyebrow light">FINANCEMENT / NÉGO</div>'+rowDark('Coût total estimé',euro(x.totalCost))+rowDark('Apport 20 %',euro(x.requiredContribution))+rowDark('Manque vs 25 k€',x.contributionGap?euro(x.contributionGap):'0 €')+rowDark('Mensualité favorable',euro(x.paymentFav))+rowDark('Mensualité prudente',euro(x.paymentPrudent))+rowDark('Offre d’ouverture',euro(x.opening))+'<p class="small lightText">Le vrai devis Mourabaha remplacera ces proxies dès qu’on l’a.</p></div></div>'+ 
  '<div class="notes">'+(x.notes||[]).map(n=>'<span>✓ '+esc(n)+'</span>').join('')+'</div>'+ 
  '<div class="actions"><button class="btn ghost" data-action="pass">✕ Passer</button><button class="btn ghost" data-action="prev">←</button><button class="btn primary" data-action="deep">★ Creuser</button><a class="btn linkbtn" href="'+esc(x.url)+'" target="_blank" rel="noopener">Annonce ↗</a></div>'+ 
  '</div></section>';
}

function gallery(x){const imgs=x.images||[];if(!imgs.length)return '<div class="gallery emptyPhoto"><div><div class="photoIcon">⌂</div><b>Photo non importée</b><p>La base peut quand même scorer le bien.</p></div></div>';const i=Math.min(activeImage,imgs.length-1);return '<div class="gallery"><img class="heroImage" src="'+esc(imgs[i])+'" alt="Photo du bien" referrerpolicy="no-referrer"><div class="thumbs">'+imgs.map((u,j)=>'<button class="thumb '+(j===i?'active':'')+'" data-image="'+j+'"><img src="'+esc(u)+'" alt=""></button>').join('')+'</div><div class="photoSource">Photo annonce publique</div></div>'}
function metric(l,v,h,c){return '<div class="metric"><div class="metricLabel">'+l+' '+tip(h)+'</div><b class="'+c+'">'+v+'</b></div>'}
function effortLabel(v){return v<=0?'+'+euro(Math.abs(v))+'/mois':euro(v)+'/mois'}
function effortClass(v){return v<=0?'good':v<=100?'mid':'bad'}
function row(l,v,s){return '<div class="dataRow"><div><span>'+l+'</span><small>'+esc(s)+'</small></div><b>'+v+'</b></div>'}
function rowDark(l,v){return '<div class="darkRow"><span>'+l+'</span><b>'+v+'</b></div>'}

function baseView(){const xs=enriched().sort((a,b)=>new Date(b.lastSeen||0)-new Date(a.lastSeen||0));return '<div class="pageIntro"><div class="eyebrow">BASE PERSISTANTE</div><h1>'+xs.length+' annonces mémorisées</h1><p class="muted">La base conserve les annonces même si elles ne sont pas de bons matches, afin de détecter les baisses de prix et les relistings.</p></div>'+xs.map(x=>'<section class="card shortlistCard"><div><b>'+esc(x.city)+' · '+esc(x.area)+'</b><div class="muted small">'+esc(x.source)+' · '+x.surface+' m² · '+euro(x.chargesMonthly)+'/mois charges · vu '+esc(x.lastSeen||'')+'</div></div><div><strong>'+x.verdict+'</strong><div class="small">effort fav. '+effortLabel(x.effortFav)+'</div></div><a class="btn" href="'+esc(x.url)+'" target="_blank" rel="noopener">Annonce ↗</a></section>').join('')}

function shortlistView(){const xs=shortlist();if(!xs.length)return '<section class="card empty"><h2>Rien à creuser</h2><p class="muted">Quand un dossier mérite la due diligence, il apparaît ici.</p></section>';return '<div class="pageIntro"><div class="eyebrow">DUE DILIGENCE</div><h1>'+xs.length+' dossier(s) à approfondir</h1></div>'+xs.map(x=>'<section class="card shortlistCard"><div><b>'+esc(x.city)+' · '+esc(x.area)+'</b><div class="muted small">'+x.surface+' m² · '+x.verdict+' · cible '+euro(x.houserPrice)+'</div></div><div><strong>'+effortLabel(x.effortFav)+'</strong><div class="small">effort favorable</div></div><a class="btn" href="'+esc(x.url)+'" target="_blank">Annonce ↗</a></section>').join('')}

function criteriaView(){return '<div class="pageIntro"><div class="eyebrow">RÈGLES</div><h1>Houser peut attendre</h1><p class="muted">On inverse la logique : pas besoin d’acheter. Le bien doit justifier l’immobilisation de ton cash et tendre vers l’autofinancement.</p></div><div class="criteriaGrid">'+
card('🎯','Objectif',[['Effort mensuel cible','0 €','Autofinancement en priorité.'],['Tolérance','≤100 €','Uniquement actif très qualitatif.'],['Budget idéal','≤150 k€','Au-delà seulement anomalie exceptionnelle.'],['Apport disponible','25 k€','Matelas de sécurité séparé.']])+ 
card('💸','Proxy Mourabaha',[['Apport screening','20 %','Repère indicatif, pas devis.'],['Scénario favorable','20 ans / 4 %','Teste si le bien peut approcher le neutre.'],['Scénario prudent','15 ans / 4,5 %','Stress test locatif.'],['Verdict','Devis réel prioritaire','Les proxies sont remplacés dès obtention d’une simulation financeur.']])+ 
card('🏠','Bien',[['Occupation','Libre uniquement','Aucun bail repris.'],['DPE','A–E','F/G exclus.'],['Typologie','T1 bis / T2 / petit T3','Liquidité locative/revente.'],['Horizon','10–20 ans','Doit rester un bon actif si tu pars.']])+ 
card('⚠️','Risques',[['Charges copro','≤140 €/mois cible','Et ≤35 €/m²/an.'],['Copro procédure','Non','Sauf analyse exceptionnelle.'],['Gros travaux','Forte pénalité','Particulièrement avec Mourabaha.'],['Alternative','ETF World Islamic','Un achat moyen ne gagne pas par défaut.']])+ '</div>'}
function card(icon,title,items){return '<section class="card criteriaCard"><div class="criteriaTitle"><span>'+icon+'</span><h2>'+title+'</h2></div>'+items.map(i=>'<div class="criteriaRow"><div><b>'+i[0]+'</b><small>'+i[2]+'</small></div><strong>'+i[1]+'</strong></div>').join('')+'</section>'}

function render(){const content=view==='base'?baseView():view==='short'?shortlistView():view==='criteria'?criteriaView():matchesView();document.getElementById('app').innerHTML='<main class="app">'+header()+content+'</main>';bind()}
function bind(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;index=0;activeImage=0;render()});document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{activeImage=Number(b.dataset.image)||0;render()});document.querySelector('[data-action="prev"]')?.addEventListener('click',()=>{const q=activeMatches();index=(index-1+q.length)%q.length;activeImage=0;render()});document.querySelector('[data-action="pass"]')?.addEventListener('click',()=>decide('pass'));document.querySelector('[data-action="deep"]')?.addEventListener('click',()=>decide('deep'))}
function decide(v){const q=activeMatches();if(!q.length)return;decisions[q[index].id]=v;save('houserLiveDecisions',decisions);index=0;activeImage=0;render()}

await loadDb();
render();
})();
