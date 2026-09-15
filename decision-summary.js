(function(){
  'use strict';

  const PROFILE={
    vacancyRate:0.03,
    maintenanceRate:0.05,
    nonRecoverableShare:0.35,
    pnoYear:120,
    acquisitionCostRate:0.08,
    downShare:0.20
  };

  let listings=[];
  let lastKey='';

  const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
  const pct=n=>((Number.isFinite(n)?n:0)*100).toFixed(1)+' %';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  function annuityFactor(rate,years){
    const r=rate/12,n=years*12;
    return r/(1-Math.pow(1+r,-n));
  }

  function calc(x){
    const price=x.price||0;
    const rent=x.rentEstimateHC??x.rent??0;
    const chargesAnnual=x.chargesAnnual??x.charges??0;
    const tax=x.propertyTax??x.tax??0;
    const works=x.works||0;
    const totalCost=price*(1+PROFILE.acquisitionCostRate)+works;
    const financed=totalCost*(1-PROFILE.downShare);
    const fFav=annuityFactor(0.04,20);
    const fPrudent=annuityFactor(0.045,15);
    const paymentFav=financed*fFav;
    const paymentPrudent=financed*fPrudent;
    const chargesOwnerMonthly=(chargesAnnual*PROFILE.nonRecoverableShare)/12;
    const taxMonthly=tax/12;
    const vacancyMonthly=rent*PROFILE.vacancyRate;
    const maintenanceMonthly=rent*PROFILE.maintenanceRate;
    const pnoMonthly=PROFILE.pnoYear/12;
    const netBeforeFinance=rent-chargesOwnerMonthly-taxMonthly-vacancyMonthly-maintenanceMonthly-pnoMonthly;
    const effortFav=paymentFav-netBeforeFinance;
    const effortPrudent=paymentPrudent-netBeforeFinance;
    const gross=price?rent*12/price:0;
    const netAnnual=netBeforeFinance*12;
    const netYield=totalCost?netAnnual/totalCost:0;

    function breakEvenPrice(factor){
      if(netBeforeFinance<=0)return 0;
      const maxFinanced=netBeforeFinance/factor;
      const maxTotalCost=maxFinanced/(1-PROFILE.downShare);
      return Math.max(0,(maxTotalCost-works)/(1+PROFILE.acquisitionCostRate));
    }

    const breakEvenFav=breakEvenPrice(fFav);
    const breakEvenPrudent=breakEvenPrice(fPrudent);
    return {price,rent,chargesAnnual,tax,totalCost,paymentFav,paymentPrudent,chargesOwnerMonthly,taxMonthly,netBeforeFinance,effortFav,effortPrudent,gross,netYield,breakEvenFav,breakEvenPrudent};
  }

  function signed(n){return (n<=0?'-':'+')+euro(Math.abs(n));}

  function verdict(c){
    if(c.effortFav<=0)return {cls:'decisionGood',title:'🟢 Rentable / autofinancé',action:'À faire : creuser en priorité. Le proxy favorable donne un cash-flow positif ou nul.'};
    if(c.effortFav<=100)return {cls:'decisionMid',title:'🟠 Presque rentable',action:'À faire : creuser seulement si le bien est qualitatif et négocier vers le prix d’autofinancement.'};
    return {cls:'decisionBad',title:'🔴 Pas rentable au prix actuel',action:'À faire : ne pas acheter à ce prix. Surveiller ou négocier vers le prix d’autofinancement.'};
  }

  function findCurrentListing(){
    const h1=document.querySelector('.feedhead h1');
    if(!h1)return null;
    const title=h1.textContent.trim();
    return listings.find(x=>title.includes(x.city||'') && (!x.area || title.includes(x.area))) ||
      listings.find(x=>title.includes(x.city||'')) || null;
  }

  function render(){
    const body=document.querySelector('.propertyBody');
    if(!body)return;
    const x=findCurrentListing();
    if(!x)return;
    const key=x.id+'|'+x.price+'|'+x.rentEstimateHC+'|'+x.chargesAnnual;
    if(key===lastKey && document.querySelector('.decisionSummary'))return;
    lastKey=key;

    document.querySelector('.decisionSummary')?.remove();
    const c=calc(x);
    const v=verdict(c);
    const totalChargesMonthly=c.chargesAnnual/12;
    const block=document.createElement('section');
    block.className='decisionSummary '+v.cls;
    block.innerHTML=`
      <div class="decisionHead">
        <div><div class="eyebrow">DÉCISION EN 10 SECONDES</div><h2>${v.title}</h2></div>
        <div class="decisionAction">${esc(v.action)}</div>
      </div>
      <div class="decisionNumbers">
        <div><span>Loyer estimé HC</span><b>${euro(c.rent)}/mois</b></div>
        <div><span>Mensualité Mourabaha estimée</span><b>${euro(c.paymentFav)} à ${euro(c.paymentPrudent)}/mois</b><small>proxy favorable → prudent</small></div>
        <div><span>Charges copro annoncées</span><b>${euro(totalChargesMonthly)}/mois</b><small>dont propriétaire estimé ~${euro(c.chargesOwnerMonthly)}/mois</small></div>
        <div><span>Taxe foncière</span><b>${euro(c.tax)}/an</b><small>~${euro(c.taxMonthly)}/mois</small></div>
        <div><span>Rendement</span><b>${pct(c.gross)} brut · ${pct(c.netYield)} net</b><small>net exploitation avant financement</small></div>
        <div><span>Effort mensuel estimé</span><b class="${c.effortFav<=0?'good':c.effortFav<=100?'mid':'bad'}">${signed(c.effortFav)} à ${signed(c.effortPrudent)}/mois</b><small>favorable → prudent</small></div>
      </div>
      <div class="buyPriceBox">
        <div><span>Prix affiché</span><b>${euro(c.price)}</b></div>
        <div class="buyTarget"><span>Prix max pour viser ~0 € d’effort</span><b>≈ ${euro(c.breakEvenFav)}</b><small>scénario favorable 20 ans / 4 % équivalent</small></div>
        <div><span>Version prudente</span><b>≈ ${euro(c.breakEvenPrudent)}</b><small>15 ans / 4,5 % équivalent</small></div>
      </div>
      <p class="decisionFoot">Lecture simple : le prix d’autofinancement répond à “à combien dois-je acheter pour que le loyer couvre approximativement financement + charges propriétaire + taxe + vacance + entretien + PNO ?”. Ce sont des estimations, pas un devis 570easi.</p>`;

    const propertyTop=body.querySelector('.propertyTop');
    if(propertyTop)propertyTop.insertAdjacentElement('afterend',block);
    else body.prepend(block);
  }

  async function init(){
    try{
      const r=await fetch('./data/listings.json?decision='+Date.now(),{cache:'no-store'});
      const data=await r.json();
      listings=data.listings||[];
    }catch(e){console.error('Houser decision summary:',e);}
    render();
    const obs=new MutationObserver(()=>requestAnimationFrame(render));
    obs.observe(document.getElementById('app'),{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();