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

    const fLow=annuityFactor(0.04,20);
    const fStress=annuityFactor(0.045,15);
    const paymentLow=financed*fLow;
    const paymentStress=financed*fStress;

    const chargesOwnerMonthly=(chargesAnnual*PROFILE.nonRecoverableShare)/12;
    const taxMonthly=tax/12;
    const pnoMonthly=PROFILE.pnoYear/12;
    const vacancyReserve=rent*PROFILE.vacancyRate;
    const maintenanceReserve=rent*PROFILE.maintenanceRate;

    const cashBeforeFinance=rent-chargesOwnerMonthly-taxMonthly-pnoMonthly;
    const effortCurrent=paymentLow-cashBeforeFinance;
    const reserves=vacancyReserve+maintenanceReserve;
    const effortPrudent=effortCurrent+reserves;
    const effortStress=paymentStress-cashBeforeFinance+reserves;

    const gross=price?rent*12/price:0;
    const netAnnual=(cashBeforeFinance-reserves)*12;
    const netYield=totalCost?netAnnual/totalCost:0;

    function breakEvenPrice(factor,monthlyNet){
      if(monthlyNet<=0)return 0;
      const maxFinanced=monthlyNet/factor;
      const maxTotalCost=maxFinanced/(1-PROFILE.downShare);
      return Math.max(0,(maxTotalCost-works)/(1+PROFILE.acquisitionCostRate));
    }

    const breakEvenCurrent=breakEvenPrice(fLow,cashBeforeFinance);
    const breakEvenPrudent=breakEvenPrice(fLow,cashBeforeFinance-reserves);

    return {price,rent,chargesAnnual,tax,totalCost,paymentLow,paymentStress,chargesOwnerMonthly,taxMonthly,pnoMonthly,vacancyReserve,maintenanceReserve,cashBeforeFinance,reserves,effortCurrent,effortPrudent,effortStress,gross,netYield,breakEvenCurrent,breakEvenPrudent};
  }

  function signed(n){return (n<=0?'-':'+')+euro(Math.abs(n));}

  function verdict(c){
    if(c.effortPrudent<=0)return {cls:'decisionGood',title:'🟢 Pépite · autofinancement prudent',action:'À faire : creuser en priorité. Même en lissant charges propriétaire, taxe, PNO, vacance et entretien, le bien reste neutre ou positif.'};
    if(c.effortPrudent<=50)return {cls:'decisionGood',title:'🟢 Très solide',action:'À faire : creuser. L’effort prudent reste très faible ; vérifier les charges réelles et la Mourabaha.'};
    if(c.effortPrudent<=100)return {cls:'decisionMid',title:'🟠 Correct seulement si actif supérieur',action:'À faire : garder uniquement si emplacement, qualité et revente sont vraiment supérieurs, sinon négocier davantage.'};
    return {cls:'decisionBad',title:'🔴 Pas assez rentable au prix actuel',action:'À faire : passer ou attendre une baisse. Houser cherche une vraie pépite, pas un effort mensuel important.'};
  }

  function findCurrentListing(){
    const h1=document.querySelector('.feedhead h1');
    if(!h1)return null;
    const title=h1.textContent.trim();
    return listings.find(x=>title.includes(x.city||'') && (!x.area || title.includes(x.area))) || listings.find(x=>title.includes(x.city||'')) || null;
  }

  function render(){
    const body=document.querySelector('.propertyBody');
    if(!body)return;
    const x=findCurrentListing();
    if(!x)return;
    const key=x.id+'|'+x.price+'|'+x.rentEstimateHC+'|'+x.chargesAnnual+'|strict-v3';
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
        <div><span>Mensualité Mourabaha basse</span><b>${euro(c.paymentLow)}/mois</b><small>proxy long/favorable ; devis réel à confirmer</small></div>
        <div><span>Charges copro annoncées</span><b>${euro(totalChargesMonthly)}/mois</b><small>part propriétaire estimée ~${euro(c.chargesOwnerMonthly)}/mois</small></div>
        <div><span>Taxe foncière</span><b>${euro(c.tax)}/an</b><small>~${euro(c.taxMonthly)}/mois</small></div>
        <div><span>Rendement</span><b>${pct(c.gross)} brut · ${pct(c.netYield)} net</b><small>net exploitation avec réserves, avant financement</small></div>
        <div><span>Effort prudent tout compris</span><b class="${c.effortPrudent<=0?'good':c.effortPrudent<=100?'mid':'bad'}">${signed(c.effortPrudent)}/mois</b><small>Mourabaha + charges propriétaire + TF + PNO + vacance + entretien − loyer</small></div>
      </div>
      <div class="buyPriceBox">
        <div><span>Prix affiché</span><b>${euro(c.price)}</b></div>
        <div class="buyTarget"><span>Prix max pour ~0 € d’effort prudent</span><b>≈ ${euro(c.breakEvenPrudent)}</b><small>c’est la vraie cible Houser</small></div>
        <div><span>Prix neutre mois normal</span><b>≈ ${euro(c.breakEvenCurrent)}</b><small>hors provisions vacance + entretien</small></div>
      </div>
      <div class="decisionNumbers" style="margin-top:10px">
        <div><span>Effort mois normal</span><b>${signed(c.effortCurrent)}/mois</b><small>info secondaire : sans provisions vacance + entretien</small></div>
        <div><span>Stress financement</span><b>${signed(c.effortStress)}/mois</b><small>proxy 15 ans / 4,5 % équivalent + réserves</small></div>
      </div>
      <p class="decisionFoot">Houser reste volontairement strict : l’indicateur principal inclut la part de copro non récupérable, la taxe foncière, la PNO et des provisions de vacance et d’entretien. Les charges récupérables locataire ne sont pas comptées comme coût propriétaire. Tant que le décompte réel n’est pas disponible, Houser estime provisoirement 35 % des charges de copro comme non récupérables. Le proxy Mourabaha n’est pas un devis 570easi.</p>`;

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