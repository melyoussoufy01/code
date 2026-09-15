(function(){
  'use strict';

  const DEFAULT_PROFILE={
    maxBudget:150000,targetGross:0.065,maxChargesMonthly:140,maxChargesM2Year:35,
    downPayment:25000,emergencyFund:6000,maxMonthlyEffort:100,dcaIslamic:500,
    vacancyRate:0.03,maintenanceRate:0.05,nonRecoverableShare:0.35,pnoYear:120,
    acquisitionCostRate:0.08
  };

  const $=s=>document.querySelector(s);
  const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
  const pct=n=>((Number.isFinite(n)?n:0)*100).toFixed(1)+' %';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function readJSON(key,fallback){
    try{const raw=localStorage.getItem(key);return raw?Object.assign({},fallback,JSON.parse(raw)):Object.assign({},fallback)}catch{return Object.assign({},fallback)}
  }
  function writeJSON(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch{}}

  let profile=readJSON('houserProfileV2',DEFAULT_PROFILE);
  let decisions={};
  try{decisions=JSON.parse(localStorage.getItem('houserDecisionsV2')||localStorage.getItem('houserDecisions')||'{}')}catch{decisions={}}
  let listings=[];
  let view='feed';
  let detailId=null;
  let detailReturn='feed';
  let activeImage=0;

  function annuity(principal,annualRate,years){
    const r=annualRate/12,n=years*12;
    if(principal<=0)return 0;
    return principal*r/(1-Math.pow(1+r,-n));
  }

  function calc(x){
    const sqm=x.surface||x.sqm||0;
    const chargesAnnual=x.chargesAnnual??x.charges??0;
    const tax=x.propertyTax??x.tax??0;
    const rent=x.rentEstimateHC??x.rent??0;
    const marketM2=x.marketPriceM2??x.market??0;
    const works=x.works||0;
    const price=x.price||0;
    const ppm=sqm?price/sqm:0;
    const gross=price?rent*12/price:0;
    const chargesMonthly=chargesAnnual/12;
    const chargesM2=sqm?chargesAnnual/sqm:0;
    const yieldPrice=profile.targetGross?rent*12/profile.targetGross:0;
    const marketPrice=marketM2*sqm;
    let riskFactor=1;
    if(x.dpe==='E')riskFactor-=0.06;
    if((x.coproStatus||x.copro)==='unknown')riskFactor-=0.03;
    if(chargesMonthly>profile.maxChargesMonthly)riskFactor-=0.04;
    if(chargesMonthly>220)riskFactor-=0.08;
    const riskAdjustedMarket=Math.max(0,marketPrice*riskFactor-works);
    const houserPrice=Math.max(0,Math.round(Math.min(yieldPrice||Infinity,riskAdjustedMarket||Infinity)/1000)*1000);
    const discount=price?1-houserPrice/price:0;
    const nonRecoverable=chargesAnnual*profile.nonRecoverableShare;
    const vacancy=rent*12*profile.vacancyRate;
    const maintenance=rent*12*profile.maintenanceRate;
    const netAnnual=rent*12-nonRecoverable-tax-vacancy-maintenance-profile.pnoYear;
    const totalCost=price*(1+profile.acquisitionCostRate)+works;
    const netYield=totalCost?netAnnual/totalCost:0;

    const apportRef=totalCost*0.20;
    const financed=Math.max(0,totalCost-apportRef);
    const paymentFav=annuity(financed,0.04,20);
    const paymentPrudent=annuity(financed,0.045,15);
    const netBeforeFinance=netAnnual/12;
    const effortFav=paymentFav-netBeforeFinance;
    const effortPrudent=paymentPrudent-netBeforeFinance;

    let score=50;
    score+=clamp((gross-0.055)*900,-18,18);
    score+=clamp((netYield-0.035)*700,-12,12);
    if(marketM2)score+=clamp(((marketM2-ppm)/marketM2)*35,-12,12);
    if(chargesMonthly<=100&&chargesM2<=28)score+=10;
    else if(chargesMonthly<=profile.maxChargesMonthly&&chargesM2<=profile.maxChargesM2Year)score+=5;
    else if(chargesMonthly<=220&&chargesM2<=50)score-=8;
    else score-=20;
    if(['A','B','C'].includes(x.dpe))score+=7;else if(x.dpe==='D')score+=3;else if(x.dpe==='E')score-=8;else score-=25;
    if((x.coproStatus||x.copro)==='clean')score+=4;else if((x.coproStatus||x.copro)==='unknown')score-=3;else score-=20;
    if(price>profile.maxBudget)score-=10;
    if(discount>0.18)score-=8;
    if(effortFav<=0)score+=10; else if(effortFav<=100)score+=5; else if(effortFav>200)score-=10;
    score=Math.round(clamp(score,0,100));

    const hardBlock=!x.free||['F','G'].includes(x.dpe)||(x.coproStatus||x.copro)==='risk';
    let verdict=effortFav<=0?'🟢 Autofinancement probable':effortFav<=100?'🟢 Proche du neutre':score>=55?'🟠 À creuser':'🔴 Passer';
    if(hardBlock)verdict='🔴 Passer';
    const opening=Math.round(houserPrice*(discount<=.05?.985:discount<=.12?.96:.95)/1000)*1000;
    const negotiation=discount<=.05?'Négo réaliste':discount<=.12?'Négociable':'Écart important';
    return Object.assign({},x,{sqm,chargesAnnual,tax,rent,marketM2,works,price,ppm,gross,chargesMonthly,chargesM2,yieldPrice,marketPrice,riskAdjustedMarket,houserPrice,discount,nonRecoverable,netAnnual,totalCost,netYield,apportRef,financed,paymentFav,paymentPrudent,netBeforeFinance,effortFav,effortPrudent,score,hardBlock,verdict,opening,negotiation});
  }

  async function load(){
    try{
      const r=await fetch('./data/listings.json?ts='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const data=await r.json();
      listings=(data.listings||[]).map(calc);
    }catch(err){
      console.error(err);
      listings=[];
    }
    render();
  }

  function counts(){
    return {
      new:listings.filter(x=>!decisions[x.id]&&!x.hardBlock).length,
      deep:listings.filter(x=>decisions[x.id]==='deep').length,
      pass:listings.filter(x=>decisions[x.id]==='pass').length
    };
  }

  function header(){
    const c=counts();
    return `<header class="top"><div class="brand"><div class="logo">⌂</div><div><b>Houser</b><div class="muted small">Le chasseur locatif calibré pour toi.</div></div></div><nav class="tabs">
      ${tab('feed','Nouveaux · '+c.new)}${tab('deep','À creuser · '+c.deep)}${tab('pass','Passés · '+c.pass)}${tab('base','Base · '+listings.length)}${tab('criteria','Mes critères')}
    </nav></header>`;
  }
  function tab(k,l){return `<button class="btn ${view===k&&!detailId?'on':''}" data-view="${k}">${l}</button>`}

  function feedView(){
    const q=listings.filter(x=>!decisions[x.id]&&!x.hardBlock).sort((a,b)=>a.effortFav-b.effortFav||b.score-a.score);
    if(!q.length)return `<section class="card empty"><h2>Aucun nouveau candidat</h2><p class="muted">Les biens déjà décidés restent accessibles dans À creuser et Passés. Houser Watch continue d’alimenter la base.</p></section>`;
    return propertyDetail(q[0],true);
  }

  function archiveView(kind){
    const items=listings.filter(x=>decisions[x.id]===kind).sort((a,b)=>a.effortFav-b.effortFav||b.score-a.score);
    const title=kind==='deep'?'Biens à creuser':'Biens passés';
    const copy=kind==='deep'?'Ta shortlist. Tu peux rouvrir le débrief complet à tout moment.':'Historique des biens écartés. Rien n’est perdu : tu peux revoir l’analyse ou changer d’avis.';
    if(!items.length)return `<section class="card empty"><h2>${title}</h2><p class="muted">Aucun bien ici pour l’instant.</p></section>`;
    return `<div class="pageIntro"><div class="eyebrow">HISTORIQUE</div><h1>${title}</h1><p class="muted">${copy}</p></div><div class="archiveGrid">${items.map(archiveCard).join('')}</div>`;
  }

  function archiveCard(x){
    const effortClass=x.effortFav<=0?'good':x.effortFav<=100?'mid':'bad';
    const img=(x.images&&x.images[0])||'';
    return `<article class="card archiveCard">
      <div class="archivePhoto">${img?`<img src="${img}" alt="${esc(x.city)}" loading="lazy">`:'<div class="photoIcon">⌂</div>'}</div>
      <div class="archiveBody"><div class="archiveTop"><div><div class="eyebrow">${esc(x.source||'Annonce')}</div><h3>${esc(x.city)} · ${esc(x.area||'')}</h3><div class="muted small">${x.sqm} m² · DPE ${esc(x.dpe)} · ${euro(x.price)}</div></div><b>${x.score}/100</b></div>
      <div class="archiveMetrics"><span>Loyer <b>${euro(x.rent)} HC</b></span><span>Brut <b>${pct(x.gross)}</b></span><span class="${effortClass}">Effort fav. <b>${signedEuro(x.effortFav)}/m</b></span></div>
      <div class="archiveActions"><button class="btn primary" data-review="${x.id}" data-return="${view}">Revoir l’analyse</button><a class="btn" href="${x.url||x.source||'#'}" target="_blank" rel="noopener">Annonce ↗</a></div></div>
    </article>`;
  }

  function baseView(){
    const items=[...listings].sort((a,b)=>a.effortFav-b.effortFav||b.score-a.score);
    if(!items.length)return `<section class="card empty">Base vide pour l’instant.</section>`;
    return `<div class="pageIntro"><div class="eyebrow">BASE HOUSER</div><h1>${items.length} dossiers suivis</h1><p class="muted">La base conserve aussi les dossiers moyens afin de détecter les baisses de prix.</p></div><div class="archiveGrid">${items.map(archiveCard).join('')}</div>`;
  }

  function criteriaView(){
    return `<div class="pageIntro"><div class="eyebrow">PROFIL</div><h1>Ce que Houser cherche pour toi</h1><p class="muted">Priorité à l’autofinancement, bien libre, charges maîtrisées, DPE correct, Mourabaha compatible et revente facile.</p></div>
    <div class="criteriaGrid">
      ${criteriaCard('🎯','Objectif',['Effort cible : 0 €/mois','≤ 100 €/mois seulement pour un actif supérieur','Budget idéal ≤ '+euro(profile.maxBudget),'Apport cible '+euro(profile.downPayment)])}
      ${criteriaCard('🏠','Kill switches',['Bien occupé','DPE F/G','Copro en procédure sérieuse','Gros travaux incompatibles Mourabaha'])}
      ${criteriaCard('💰','Économie',['Rendement brut cible '+(profile.targetGross*100).toFixed(1)+' %','Charges cible ≤ '+euro(profile.maxChargesMonthly)+'/mois','Charges normalisées ≤ '+profile.maxChargesM2Year+' €/m²/an','ETF Islamic 500 €/mois maintenu'])}
      ${criteriaCard('🧾','Prudence',['Vacance 3 %','Entretien 5 % des loyers','PNO '+euro(profile.pnoYear)+'/an','Proxy Mourabaha indicatif, devis réel prioritaire'])}
    </div>`;
  }
  function criteriaCard(icon,title,rows){return `<section class="card criteriaCard"><div class="criteriaTitle"><span>${icon}</span><h2>${title}</h2></div>${rows.map(r=>`<div class="criteriaRow"><b>${esc(r)}</b></div>`).join('')}</section>`}

  function propertyDetail(x,decisionButtons){
    const main=(x.images&&x.images[activeImage])||(x.images&&x.images[0])||'';
    const effortClass=x.effortFav<=0?'good':x.effortFav<=100?'mid':'bad';
    const back=detailId?`<button class="btn" data-back="1">← Retour</button>`:'';
    const buttons=decisionButtons?
      `<button class="btn ghost" data-decision="pass" data-id="${x.id}">✕ Passer</button><button class="btn primary" data-decision="deep" data-id="${x.id}">★ Creuser</button>`:
      `<button class="btn ghost" data-decision="clear" data-id="${x.id}">↩ Remettre dans les nouveaux</button><button class="btn" data-decision="pass" data-id="${x.id}">✕ Passer</button><button class="btn primary" data-decision="deep" data-id="${x.id}">★ Creuser</button>`;
    return `<div class="feedhead"><div><div class="eyebrow">DÉBRIEF COMPLET</div><h1>${esc(x.city)} · ${esc(x.area||'')}</h1><div class="muted">${esc(x.source||'Annonce')} · ${x.sqm} m² · DPE ${esc(x.dpe)}</div></div>${back}</div>
    <section class="property card">
      <div class="gallery ${main?'':'emptyPhoto'}">${main?`<img class="heroImage" src="${main}" alt="Photo du bien">`:'<div><div class="photoIcon">⌂</div><b>Photo non disponible</b></div>'}${thumbs(x)}</div>
      <div class="propertyBody">
        <div class="propertyTop"><div><span class="badge">${x.free?'✅ LIBRE':'🔴 OCCUPÉ'}</span><span class="badge">DPE ${esc(x.dpe)}</span><span class="badge">${x.sqm} m²</span></div><div class="price">${euro(x.price)}</div></div>
        <div class="metricGrid">
          ${metric('Score Houser',x.score+'/100','Synthèse rendement, charges, DPE, marché et financement.')}
          ${metric('Loyer prudent',euro(x.rent)+' HC','Estimation conservatrice basée sur le marché et les comparables, pas sur le loyer rêvé du vendeur.')}
          ${metric('Rendement brut',pct(x.gross),'Loyer annuel HC / prix affiché.')}
          ${metric('Net exploitation',pct(x.netYield),'Après vacance, entretien, PNO, taxe foncière et charges non récupérables estimées.')}
          ${metric('Charges copro',euro(x.chargesMonthly)+'/m','Soit '+Math.round(x.chargesM2)+' €/m²/an. La part récupérable doit être vérifiée au stade dossier.')}
          ${metric('Prix / m²',euro(x.ppm)+'/m²','Comparé au repère local de '+euro(x.marketM2)+'/m².')}
        </div>
        <div class="verdictRow"><div><div class="eyebrow">VERDICT</div><h2>${x.verdict}</h2></div><div class="chargePill ${x.chargesMonthly<=profile.maxChargesMonthly?'ok':'warn'}">Effort favor. <span class="${effortClass}">${signedEuro(x.effortFav)}/m</span></div></div>
        <div class="twoCol">
          <div class="explain"><h3>Pourquoi Houser Price™ ?</h3>${row('Prix compatible rendement',euro(x.yieldPrice),'Cible '+(profile.targetGross*100).toFixed(1)+' % brut')}${row('Valeur marché',euro(x.marketPrice),euro(x.marketM2)+'/m² × surface')}${row('Marché ajusté risques',euro(x.riskAdjustedMarket),'DPE, charges, copro, travaux')}<div class="houserPrice"><span>Houser Price™</span><b>${euro(x.houserPrice)}</b></div></div>
          <div class="nego"><div class="eyebrow light">PLAN D’ACQUISITION</div><h3>${x.negotiation}</h3>${rowDark('Offre d’ouverture',euro(x.opening))}${rowDark('Cible',euro(x.houserPrice))}${rowDark('Écart',(x.discount*100).toFixed(1)+' %')}</div>
        </div>
        <div class="financeBox"><h3>Proxy Mourabaha / 570easi <span class="muted small">indicatif</span></h3><div class="financeGrid">${financeMetric('Coût total projet',euro(x.totalCost))}${financeMetric('Apport repère 20 %',euro(x.apportRef))}${financeMetric('Mensualité favorable',euro(x.paymentFav)+'/m')}${financeMetric('Effort favorable',signedEuro(x.effortFav)+'/m',effortClass)}${financeMetric('Mensualité prudente',euro(x.paymentPrudent)+'/m')}${financeMetric('Effort prudent',signedEuro(x.effortPrudent)+'/m',x.effortPrudent<=100?'mid':'bad')}</div><p class="small muted">Proxy : 20 ans / 4 % équivalent favorable ; 15 ans / 4,5 % équivalent prudent. Ce n’est pas un devis 570easi.</p></div>
        <div class="notes">${(x.notes||[]).map(n=>`<span>✓ ${esc(n)}</span>`).join('')}</div>
        ${priceHistory(x)}
        <div class="actions">${buttons}<a class="btn linkbtn" href="${x.url||'#'}" target="_blank" rel="noopener">Annonce ↗</a></div>
      </div>
    </section>`;
  }

  function thumbs(x){
    if(!x.images||x.images.length<2)return '';
    return `<div class="thumbs">${x.images.map((u,i)=>`<button class="thumb ${i===activeImage?'active':''}" data-image="${i}"><img src="${u}" alt="Photo ${i+1}"></button>`).join('')}</div>`;
  }
  function metric(l,v,h){return `<div class="metric"><div class="metricLabel">${l} ${tip(h)}</div><b>${v}</b></div>`}
  function tip(t){return `<span class="tip" tabindex="0">i<span class="tipbox">${esc(t)}</span></span>`}
  function row(l,v,s){return `<div class="dataRow"><div><span>${l}</span><small>${esc(s)}</small></div><b>${v}</b></div>`}
  function rowDark(l,v){return `<div class="darkRow"><span>${l}</span><b>${v}</b></div>`}
  function financeMetric(l,v,cls=''){return `<div class="financeMetric"><span>${l}</span><b class="${cls}">${v}</b></div>`}
  function signedEuro(n){return (n<=0?'-':'+')+euro(Math.abs(n))}
  function priceHistory(x){
    const h=x.priceHistory||[];
    if(!h.length)return '';
    return `<div class="priceHistory"><h3>Historique prix</h3>${h.map(p=>`<span>${esc(p.date)} · <b>${euro(p.price)}</b></span>`).join('')}</div>`;
  }

  function render(){
    let content;
    if(detailId){const x=listings.find(x=>x.id===detailId);content=x?propertyDetail(x,false):'<section class="card empty">Bien introuvable.</section>'}
    else if(view==='deep')content=archiveView('deep');
    else if(view==='pass')content=archiveView('pass');
    else if(view==='base')content=baseView();
    else if(view==='criteria')content=criteriaView();
    else content=feedView();
    $('#app').innerHTML=`<main class="app">${header()}${content}</main>`;
    bind();
  }

  function bind(){
    document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;detailId=null;activeImage=0;render()});
    document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{detailId=b.dataset.review;detailReturn=b.dataset.return||view;activeImage=0;render()});
    document.querySelector('[data-back]')?.addEventListener('click',()=>{view=detailReturn;detailId=null;activeImage=0;render()});
    document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{activeImage=Number(b.dataset.image)||0;render()});
    document.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>{
      const id=b.dataset.id,action=b.dataset.decision;
      if(action==='clear')delete decisions[id];else decisions[id]=action;
      writeJSON('houserDecisionsV2',decisions);
      detailId=null;activeImage=0;
      if(action==='deep')view='deep'; else if(action==='pass')view='pass'; else view='feed';
      render();
    });
  }

  load();
})();