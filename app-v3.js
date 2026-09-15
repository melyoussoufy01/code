(function(){
'use strict';

const DEFAULT_PROFILE={
 zone:'Strasbourg + première couronne',maxBudget:150000,targetGross:0.065,
 maxChargesMonthly:140,maxChargesM2Year:35,downPayment:25000,emergencyFund:6000,
 maxMonthlyEffort:100,dcaIslamic:500,vacancyRate:0.03,maintenanceRate:0.05,
 nonRecoverableShare:0.35,pnoYear:120,acquisitionCostRate:0.08,
 allowedTypes:'T1 bis / T2 / petit T3',freeOnly:true,minDpe:'E',
 financing:'Mourabaha uniquement',holdYears:'10–20 ans',
 murabahaMinDownRate:0.20,murabahaProxyYears:15,murabahaProxyAnnual:0.045,
 murabahaFavYears:20,murabahaFavAnnual:0.04
};

const listings=[
 {id:'H005',city:'Strasbourg',area:'Polygone Est',price:113500,sqm:40.78,dpe:'C',charges:1832,tax:800,taxEstimated:true,rent:610,market:2934,free:true,copro:'clean',works:0,
 source:'https://www.seloger.com/annonce/achat/grand-est/bas-rhin-67/strasbourg-67000/26GEJNP2EDXQ',
 rentSource:'Estimation prudente Houser à partir des loyers du 67100 et de comparables T2',marketSource:'Repère secteur Strasbourg sud / Meinau-Polygone',
 notes:['Libre d’occupation','Résidence 2013','3e étage','DPE C','Pas de procédure copro connue'],images:[]},
 {id:'H001',city:'Hœnheim',area:'7 rue Aristide Briand',price:130000,sqm:51.37,dpe:'D',charges:2200,tax:500,rent:708,market:2255,free:true,copro:'unknown',works:0,
 source:'https://www.orpi.com/annonce-vente-appartement-t2-hoenheim-67800-b818dd71-9d0e-4553-9896-b4ede0a819df/',
 rentSource:'Estimation Houser à partir du marché locatif local et de comparables publics',marketSource:'Repère communal Hœnheim + comparables',
 notes:['Balcon + loggia','Cave','1er étage sans ascenseur','Chauffage collectif','Libre de toute occupation'],
 images:['https://cutjhqvjma.cloudimg.io/_prod_/sweepbright-s3/b818dd71-9d0e-4553-9896-b4ede0a819df--15576364-7c81-47f6-8429-4ce4b63b4524.jpg?ci_sign=f0f9bc88884d7c778536ddc93d4e657169a02777&ci_url_encoded=1&p=default','https://cutjhqvjma.cloudimg.io/_prod_/sweepbright-s3/b818dd71-9d0e-4553-9896-b4ede0a819df--58644d60-3f82-42d1-a2aa-79dce58ae359.jpg?ci_sign=d0eb1c5edfb12834b9d22b91e4a1c64a68137120&ci_url_encoded=1&p=default']},
 {id:'H006',city:'Schiltigheim',area:'Rue de Sélestat',price:133500,sqm:45,dpe:'D',charges:2000,tax:800,taxEstimated:true,rent:650,market:2704,free:true,copro:'clean',works:0,
 source:'https://www.orpi.com/annonce-vente-appartement-t2-schiltigheim-67300-6059b251-42c7-4632-9d84-acaedb27c106/',
 rentSource:'Loyer prudent basé sur le marché T2 Schiltigheim et les comparables publics',marketSource:'Repère communal Schiltigheim',
 notes:['Libre immédiatement','1er étage avec ascenseur','Cave','Charges incluent chauffage + eau','DPE D'],images:[]},
 {id:'H002',city:'Lingolsheim',area:'Écoquartier',price:134900,sqm:45.41,dpe:'B',charges:1058,tax:741,rent:604,market:2410,free:true,copro:'clean',works:0,
 source:'https://www.squarehabitat.fr/annonces/achat/bien/appartement/immobilier/grand-est/bas-rhin-67',rentSource:'Estimation Houser à partir des loyers du secteur et comparables publics',marketSource:'Repère communal Lingolsheim',
 notes:['Immeuble 2012','2 stationnements','DPE B','Charges modérées'],images:[]},
 {id:'H007',city:'Strasbourg',area:'Montagne Verte',price:148000,sqm:40.17,dpe:'C',charges:956,tax:850,taxEstimated:true,rent:575,market:2548,free:true,copro:'clean',works:0,
 source:'https://www.seloger.com/annonces/achat/appartement/strasbourg-67/montagne-verte-centre-ouest/256707203.htm',rentSource:'Estimation prudente basée sur le loyer moyen du secteur Montagne Verte',marketSource:'Repère moyen Montagne Verte',
 notes:['Libre de toute occupation','DPE C','Charges faibles','Aucune procédure annoncée','Chauffage collectif avec compteurs'],images:[]},
 {id:'H008',city:'Strasbourg',area:'Avenue de Colmar / Canardière',price:148000,sqm:40.77,dpe:'D',charges:1286,tax:800,taxEstimated:true,rent:620,market:2934,free:true,copro:'clean',works:0,
 source:'https://www.seloger.com/annonces/achat/appartement/strasbourg-67/canardiere-ouest-est/268850573.htm',rentSource:'Estimation prudente Houser pour un T2 proche tram au sud de Strasbourg',marketSource:'Repère Canardière / Meinau',
 notes:['Libre de toute occupation','1er étage','Cave','Petite copro 25 lots','Pas de procédure annoncée'],images:[]},
 {id:'H004',city:'Bischheim',area:'Centre',price:129000,sqm:38,dpe:'C',charges:850,tax:700,rent:516,market:2551,free:true,copro:'clean',works:0,
 source:'https://www.hebdingimmobilier.fr/vente/10-bischheim/appartement/t2/2146-appartement-2-pieces-avec-terrasse-et-parking-immeuble-moderne-de-standing/',rentSource:'Estimation Houser à partir des loyers du secteur et comparables publics',marketSource:'Repère communal Bischheim',notes:['Petite copropriété','Terrasse','Bon état','Charges contenues'],images:[]},
 {id:'H003',city:'Ostwald',area:'Rives du Bohrie',price:158000,sqm:48,dpe:'C',charges:1743,tax:750,rent:670,market:2662,free:true,copro:'clean',works:0,
 source:'https://www.seloger.com/annonces/achat/appartement/ostwald-67/est/273869061.htm',rentSource:'Estimation Houser à partir des loyers du secteur et comparables publics',marketSource:'Repère communal Ostwald',notes:['Résidence 2020','Tram','Terrasse','Parking'],images:[]}
];

let profile=readJson('houserProfileV3',DEFAULT_PROFILE);
let decisions=readJson('houserDecisionsV3',{});
let view='feed',queue=[],index=0,activeImage=0,showRejected=false;

function readJson(k,f){try{const r=localStorage.getItem(k);return r?Object.assign({},f,JSON.parse(r)):Object.assign({},f)}catch{return Object.assign({},f)}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function euro(n){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0)}
function pct(n){return ((Number.isFinite(n)?n:0)*100).toFixed(1)+' %'}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function esc(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c))}
function tip(t){return '<span class="tip" tabindex="0">i<span class="tipbox">'+esc(t)+'</span></span>'}
function payment(P,annual,years){if(P<=0)return 0;const r=annual/12,n=years*12;return r?P*r/(1-Math.pow(1+r,-n)):P/n}

function calc(x){
 const ppm=x.price/x.sqm,gross=x.rent*12/x.price,chargesMonthly=x.charges/12,chargesM2=x.charges/x.sqm;
 const yieldPrice=x.rent*12/profile.targetGross,marketPrice=x.market*x.sqm;
 let risk=1;if(x.dpe==='E')risk-=.06;if(x.copro==='unknown')risk-=.03;if(chargesMonthly>profile.maxChargesMonthly)risk-=.04;if(chargesMonthly>220)risk-=.08;
 const riskMarket=Math.max(0,marketPrice*risk-x.works),houserPrice=Math.max(0,Math.round(Math.min(yieldPrice,riskMarket)/1000)*1000),discount=1-houserPrice/x.price;
 const nonRec=x.charges*profile.nonRecoverableShare,vac=x.rent*12*profile.vacancyRate,maint=x.rent*12*profile.maintenanceRate;
 const netAnnual=x.rent*12-nonRec-x.tax-vac-maint-profile.pnoYear,totalCost=x.price*(1+profile.acquisitionCostRate)+x.works,netYield=netAnnual/totalCost,noiMonthly=netAnnual/12;
 const minDown570=totalCost*profile.murabahaMinDownRate,downGap=Math.max(0,minDown570-profile.downPayment),financeAmount=Math.max(0,totalCost-minDown570);
 const payFav=payment(financeAmount,profile.murabahaFavAnnual,profile.murabahaFavYears),payProxy=payment(financeAmount,profile.murabahaProxyAnnual,profile.murabahaProxyYears);
 const effortFav=Math.max(0,payFav-noiMonthly),effortProxy=Math.max(0,payProxy-noiMonthly),cashFav=noiMonthly-payFav,cashProxy=noiMonthly-payProxy;
 let score=50;score+=clamp((gross-.055)*900,-18,18);score+=clamp((netYield-.035)*700,-12,12);score+=clamp(((x.market-ppm)/x.market)*35,-12,12);
 if(chargesMonthly<=100&&chargesM2<=28)score+=10;else if(chargesMonthly<=profile.maxChargesMonthly&&chargesM2<=profile.maxChargesM2Year)score+=5;else if(chargesMonthly<=220&&chargesM2<=50)score-=8;else score-=20;
 if(['A','B','C'].includes(x.dpe))score+=7;else if(x.dpe==='D')score+=3;else if(x.dpe==='E')score-=8;else score-=25;
 if(x.copro==='clean')score+=4;else if(x.copro==='unknown')score-=3;else score-=20;if(x.price>profile.maxBudget)score-=10;if(discount>.18)score-=8;score=Math.round(clamp(score,0,100));
 const hardBlock=!x.free||['F','G'].includes(x.dpe)||x.copro==='risk';let verdict=score>=72?'🟢 Match':score>=55?'🟠 À creuser':score>=45?'🟡 À surveiller':'🔴 Passer';if(hardBlock)verdict='🔴 Passer';
 const negotiation=discount<=.05?'Négo réaliste':discount<=.12?'Négociable':'Écart important',opening=Math.round(houserPrice*(discount<=.05?.985:discount<=.12?.96:.95)/1000)*1000;
 const chargeLevel=chargesMonthly<=100?'Faibles':chargesMonthly<=profile.maxChargesMonthly?'Acceptables':chargesMonthly<=220?'Élevées':'Très élevées';
 return Object.assign({},x,{ppm,gross,chargesMonthly,chargesM2,yieldPrice,marketPrice,riskMarket,houserPrice,discount,netAnnual,totalCost,netYield,noiMonthly,minDown570,downGap,financeAmount,payFav,payProxy,effortFav,effortProxy,cashFav,cashProxy,score,hardBlock,verdict,negotiation,opening,chargeLevel});
}

function rebuild(){queue=listings.map(calc).filter(x=>(showRejected||!x.hardBlock)&&!decisions[x.id]).sort((a,b)=>b.score-a.score);if(index>=queue.length)index=0}
function header(){const n=Object.values(decisions).filter(v=>v==='deep').length;return '<header class="top"><div class="brand"><div class="logo">⌂</div><div><b>Houser</b><div class="muted small">Le chasseur locatif calibré pour toi.</div></div></div><nav class="tabs">'+tab('feed','Matches')+tab('short','À creuser · '+n)+tab('criteria','Mes critères')+'</nav></header>'}
function tab(k,l){return '<button class="btn '+(view===k?'on':'')+'" data-view="'+k+'">'+l+'</button>'}

function metric(l,v,h,cls){return '<div class="metric"><div class="metricLabel">'+l+' '+tip(h)+'</div><b class="'+(cls||'')+'">'+v+'</b></div>'}
function row(l,v,s){return '<div class="dataRow"><div><span>'+l+'</span><small>'+esc(s||'')+'</small></div><b>'+v+'</b></div>'}
function rowDark(l,v){return '<div class="darkRow"><span>'+l+'</span><b>'+v+'</b></div>'}

function feedView(){
 rebuild();
 if(!queue.length)return '<section class="card empty"><h2>Aucun nouveau candidat à swiper</h2><p class="muted">Tu as traité tous les biens chargés dans cette version. Houser Watch continue la veille ; les anciens choix ne reviennent plus en boucle.</p><button class="btn" id="reset-decisions">Revoir les biens traités</button></section>';
 const x=queue[index],cls=x.score>=72?'good':x.score>=55?'mid':x.score>=45?'watch':'bad';
 const effortLow=Math.min(x.effortFav,x.effortProxy),effortHigh=Math.max(x.effortFav,x.effortProxy);
 return '<div class="feedhead"><div><div class="eyebrow">TOP MATCHES</div><h1>'+x.city+' · '+x.area+'</h1><div class="muted">'+(index+1)+' / '+queue.length+' candidat(s) non traités · meilleurs scores d’abord</div></div><label class="toggle"><input id="show-rejected" type="checkbox" '+(showRejected?'checked':'')+'> voir les rejets</label></div>'+ 
 '<section class="property card">'+gallery(x)+'<div class="propertyBody">'+
 '<div class="propertyTop"><div><span class="badge">✅ LIBRE</span><span class="badge">DPE '+x.dpe+'</span><span class="badge">'+x.sqm+' m²</span></div><div class="price">'+euro(x.price)+'</div></div>'+ 
 '<div class="metricGrid">'+metric('Score Houser',x.score+'/100','Score pré-financement : prix, rendement, charges, DPE, copropriété et risque.',cls)+metric('Loyer prudent',euro(x.rent)+' HC',x.rentSource+'. Houser sous-estime volontairement plutôt que reprendre un loyer optimiste.')+metric('Rendement brut',pct(x.gross),'Loyer annuel HC ÷ prix affiché.')+metric('Charges copro',euro(x.chargesMonthly)+'/mois','Budget copro annuel ÷ 12. La part récupérable sur le locataire sera vérifiée ensuite.')+metric('Net exploitation',pct(x.netYield),'Avant financement : loyer moins vacance, entretien, taxe foncière, PNO et charges non récupérables.')+metric('Effort Mourabaha',euro(effortLow)+'–'+euro(effortHigh)+'/mois','Fourchette indicative, pas un devis : scénario favorable 20 ans / 4 % équivalent et proxy locatif conservateur 15 ans / 4,5 % équivalent. 570easi ne publie pas aujourd’hui sa marge ni sa durée standard.')+'</div>'+ 
 '<div class="verdictRow"><div><div class="eyebrow">VERDICT IMMOBILIER</div><h2>'+x.verdict+'</h2></div><div class="chargePill '+(x.chargeLevel==='Faibles'||x.chargeLevel==='Acceptables'?'ok':'warn')+'">Charges '+x.chargeLevel+' · '+Math.round(x.chargesM2)+' €/m²/an</div></div>'+ 
 '<div class="twoCol"><div class="explain"><h3>Pourquoi Houser Price™ ? '+tip('Plafond économique : prix compatible rendement vs valeur marché ajustée des risques. Houser retient la plus prudente des deux ancres.')+'</h3>'+row('Prix compatible rendement',euro(x.yieldPrice),'Cible '+(profile.targetGross*100).toFixed(1)+' % brut')+row('Valeur marché estimée',euro(x.marketPrice),x.marketSource)+row('Marché ajusté risques',euro(x.riskMarket),'DPE, charges, copro, travaux')+'<div class="houserPrice"><span>Houser Price™</span><b>'+euro(x.houserPrice)+'</b></div></div>'+ 
 '<div class="nego"><div class="eyebrow light">PLAN POUR L’AVOIR</div><h3>'+x.negotiation+'</h3>'+rowDark('Offre d’ouverture',euro(x.opening))+rowDark('Cible',euro(x.houserPrice))+rowDark('Écart vendeur → cible',(x.discount*100).toFixed(1)+' %')+'<p class="small lightText">Si l’écart est trop grand, on surveille une baisse au lieu de forcer.</p></div></div>'+ 
 '<div class="financeNote"><b>Proxy 570easi / Mourabaha</b> '+tip('570easi ne publie pas de marge ni de durée résidentielle standard. Le site public/les sources datées indiquent surtout un apport de 20 % et un endettement max de 33 %. Houser affiche donc une sensibilité, pas une promesse de financement.')+'<br>Projet estimé : <b>'+euro(x.totalCost)+'</b> · apport mini proxy 20 % : <b>'+euro(x.minDown570)+'</b>'+(x.downGap>0?' · <span class="bad">il manquerait ~'+euro(x.downGap)+' vs tes 25 k€</span>':' · <span class="good">tes 25 k€ couvrent ce proxy</span>')+'<br>Mensualité indicative : <b>'+euro(x.payFav)+'</b> (20 ans / 4 %) à <b>'+euro(x.payProxy)+'</b> (15 ans / 4,5 %) · net avant financement : <b>'+euro(x.noiMonthly)+'/mois</b> · effort : <b>'+euro(effortLow)+' à '+euro(effortHigh)+'/mois</b>.</div>'+ 
 '<div class="notes">'+x.notes.map(n=>'<span>✓ '+esc(n)+'</span>').join('')+(x.taxEstimated?'<span>⚠️ Taxe foncière estimée pour screening</span>':'')+'</div>'+ 
 '<div class="actions"><button class="btn ghost" data-action="pass">✕ Passer</button><button class="btn ghost" data-action="prev">← Précédent</button><button class="btn primary" data-action="deep">★ Creuser</button><a class="btn linkbtn" href="'+x.source+'" target="_blank" rel="noopener">Annonce ↗</a></div></div></section>';
}

function gallery(x){if(!x.images||!x.images.length)return '<div class="gallery emptyPhoto"><div><div class="photoIcon">⌂</div><b>Photo non encore importée</b><p>Houser n’affiche que des photos de l’annonce source.</p></div></div>';const i=Math.min(activeImage,x.images.length-1),img=x.images[i],thumbs=x.images.map((u,j)=>'<button class="thumb '+(j===i?'active':'')+'" data-image="'+j+'"><img src="'+u+'" alt="Photo '+(j+1)+'"></button>').join('');return '<div class="gallery"><img class="heroImage" src="'+img+'" alt="Photo du bien" referrerpolicy="no-referrer"><div class="thumbs">'+thumbs+'</div><div class="photoSource">Annonce source</div></div>'}

function criteriaView(){return '<div class="pageIntro"><div class="eyebrow">PROFIL INVESTISSEUR</div><h1>Les règles de Houser</h1><p class="muted">Notre objectif n’est pas de trouver “un appartement”, mais un actif que tu seras content de garder même si tu quittes Strasbourg.</p></div><div class="criteriaGrid">'+
 card('🎯','Stratégie & budget',[['Zone',profile.zone,'Strasbourg + première couronne.'],['Budget idéal','≤ '+euro(profile.maxBudget),'Au-dessus uniquement pour un actif exceptionnel.'],['Apport disponible',euro(profile.downPayment),'Matelas de sécurité exclu.'],['Matelas intouchable',euro(profile.emergencyFund),'Ne sert jamais à acheter.'],['DCA ETF Islamic',euro(profile.dcaIslamic)+'/mois','L’immo ne doit pas tuer le DCA.']])+
 card('🏠','Bien recherché',[['Occupation','Libre uniquement','Aucun bail repris.'],['Typologie',profile.allowedTypes,'Petites surfaces liquides.'],['DPE','A–E ; F/G exclus','Risque réglementaire et travaux.'],['Horizon',profile.holdYears,'Doit rester bon si départ vers la Suisse.'],['Travaux','Faibles / maîtrisés','Important pour Mourabaha.']])+
 card('💰','Économie',[['Brut cible',(profile.targetGross*100).toFixed(1)+' %','Premier filtre, pas le verdict final.'],['Effort cible','≤ '+euro(profile.maxMonthlyEffort)+'/mois','Idéal 0 ou positif.'],['Charges copro','≤ '+euro(profile.maxChargesMonthly)+'/mois','Pénalité forte au-delà.'],['Charges normalisées','≤ '+profile.maxChargesM2Year+' €/m²/an','Comparaison objective des surfaces.'],['Vacance',(profile.vacancyRate*100).toFixed(0)+' %','Pas de modèle 12/12 parfait.']])+
 card('☪️','Proxy financement 570easi',[['Apport public repère','20 %','Repère public relevé en 2026 ; devis à confirmer.'],['Endettement public repère','≤ 33 %','Règle publiée/rapportée ; traitement du loyer futur à confirmer.'],['Scénario favorable','20 ans · 4 % eq.','Simple sensibilité, pas condition 570easi publiée.'],['Proxy locatif prudent','15 ans · 4,5 % eq.','Inspiré d’un cas public 570easi 2025 sur investissement mixte ; pas un devis résidentiel.'],['Règle Houser','Afficher une fourchette','On préfère une estimation imparfaite mais explicite à masquer l’effort.']])+
 card('🧾','Coûts intégrés',[['Taxe foncière','Incluse','Estimation signalée si inconnue.'],['PNO',euro(profile.pnoYear)+'/an','Propriétaire non occupant.'],['Entretien',(profile.maintenanceRate*100).toFixed(0)+' % loyers','Provision annuelle.'],['Non récupérable',(profile.nonRecoverableShare*100).toFixed(0)+' % charges','Hypothèse avant décompte réel.'],['Frais acquisition','≈ '+(profile.acquisitionCostRate*100).toFixed(0)+' %','Pour ne pas gonfler la renta.']])+
 card('⚠️','Kill switches',[['Occupé','NON','Rejet automatique.'],['DPE F/G','NON','Rejet.'],['Copro en procédure','NON','Sauf cas exceptionnel documenté.'],['Gros travaux','Très forte pénalité','Risque cash + Mourabaha.'],['Bien juste “correct”','NON','Tu peux rester locataire et investir ailleurs.']])+'</div>'}
function card(icon,title,items){return '<section class="card criteriaCard"><div class="criteriaTitle"><span>'+icon+'</span><h2>'+title+'</h2></div>'+items.map(i=>'<div class="criteriaRow"><div><b>'+i[0]+'</b><small>'+i[2]+'</small></div><strong>'+i[1]+'</strong></div>').join('')+'</section>'}

function shortlistView(){const items=listings.map(calc).filter(x=>decisions[x.id]==='deep').sort((a,b)=>b.score-a.score);if(!items.length)return '<section class="card empty"><h2>Rien à creuser</h2><p class="muted">Quand tu cliques ★ Creuser, le bien sort du feed et arrive ici.</p></section>';return '<div class="pageIntro"><div class="eyebrow">SHORTLIST</div><h1>Biens à approfondir</h1><p class="muted">Prochaine étape : PV d’AG, détail récupérable/non récupérable, vraie taxe foncière, loyer comparable, devis Mourabaha et négociation.</p></div>'+items.map(x=>'<section class="card shortlistCard"><div><b>'+x.city+' · '+x.area+'</b><div class="muted small">'+x.sqm+' m² · DPE '+x.dpe+' · charges '+euro(x.chargesMonthly)+'/mois · effort proxy '+euro(Math.min(x.effortFav,x.effortProxy))+'–'+euro(Math.max(x.effortFav,x.effortProxy))+'/mois</div></div><div><strong>'+x.score+'/100</strong><div class="small">cible '+euro(x.houserPrice)+'</div></div><a class="btn" href="'+x.source+'" target="_blank" rel="noopener">Annonce ↗</a></section>').join('')}

function render(){try{const content=view==='criteria'?criteriaView():view==='short'?shortlistView():feedView();document.getElementById('app').innerHTML='<main class="app">'+header()+content+'</main>';bind()}catch(err){document.getElementById('app').innerHTML='<div class="error"><b>Houser a rencontré une erreur.</b><pre>'+esc(err&&err.message?err.message:String(err))+'</pre></div>'}}
function bind(){document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;index=0;activeImage=0;render()});document.querySelector('#show-rejected')?.addEventListener('change',e=>{showRejected=e.target.checked;index=0;render()});document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{activeImage=Number(b.dataset.image)||0;render()});document.querySelector('[data-action="prev"]')?.addEventListener('click',()=>{rebuild();if(queue.length)index=(index-1+queue.length)%queue.length;activeImage=0;render()});document.querySelector('[data-action="pass"]')?.addEventListener('click',()=>decide('pass'));document.querySelector('[data-action="deep"]')?.addEventListener('click',()=>decide('deep'));document.querySelector('#reset-decisions')?.addEventListener('click',()=>{decisions={};writeJson('houserDecisionsV3',decisions);index=0;render()})}
function decide(v){rebuild();if(!queue.length)return;decisions[queue[index].id]=v;writeJson('houserDecisionsV3',decisions);index=0;activeImage=0;render()}

render();
})();