(function(){
  'use strict';

  const DEFAULT_PROFILE = {
    zone: 'Strasbourg + première couronne',
    maxBudget: 150000,
    targetGross: 0.065,
    maxChargesMonthly: 140,
    maxChargesM2Year: 35,
    downPayment: 25000,
    emergencyFund: 6000,
    maxMonthlyEffort: 100,
    dcaIslamic: 500,
    vacancyRate: 0.03,
    maintenanceRate: 0.05,
    nonRecoverableShare: 0.35,
    pnoYear: 120,
    acquisitionCostRate: 0.08,
    allowedTypes: 'T1 bis / T2 / petit T3',
    freeOnly: true,
    minDpe: 'E',
    financing: 'Mourabaha uniquement',
    holdYears: '10–20 ans'
  };

  const listings = [
    {
      id:'H001', city:'Hœnheim', area:'7 rue Aristide Briand', price:130000, sqm:51.37,
      dpe:'D', charges:2200, tax:500, rent:708, market:2255, free:true, copro:'unknown', works:0,
      source:'https://www.orpi.com/annonce-vente-appartement-t2-hoenheim-67800-b818dd71-9d0e-4553-9896-b4ede0a819df/',
      rentSource:'Estimation Houser à partir du marché locatif local et de comparables publics',
      marketSource:'Repère communal de marché + annonces comparables',
      notes:['Balcon + loggia','Cave','1er étage sans ascenseur','Chauffage collectif','Libre de toute occupation'],
      images:[
        'https://cutjhqvjma.cloudimg.io/_prod_/sweepbright-s3/b818dd71-9d0e-4553-9896-b4ede0a819df--15576364-7c81-47f6-8429-4ce4b63b4524.jpg?ci_sign=f0f9bc88884d7c778536ddc93d4e657169a02777&ci_url_encoded=1&p=default',
        'https://cutjhqvjma.cloudimg.io/_prod_/sweepbright-s3/b818dd71-9d0e-4553-9896-b4ede0a819df--58644d60-3f82-42d1-a2aa-79dce58ae359.jpg?ci_sign=d0eb1c5edfb12834b9d22b91e4a1c64a68137120&ci_url_encoded=1&p=default',
        'https://cutjhqvjma.cloudimg.io/_prod_/sweepbright-s3/b818dd71-9d0e-4553-9896-b4ede0a819df--c0d945a0-a04e-4702-8863-1f4375829e30.jpg?ci_sign=2d20894a862423461a852df512c4cf3aa7aae09b&ci_url_encoded=1&p=default',
        'https://cutjhqvjma.cloudimg.io/_prod_/sweepbright-s3/b818dd71-9d0e-4553-9896-b4ede0a819df--44d9220b-be78-4692-a45b-1b2da05b8f82.jpg?ci_sign=3dc2f960a30f4e6caeb53e59808233f9ea295c8b&ci_url_encoded=1&p=default'
      ]
    },
    {
      id:'H002', city:'Lingolsheim', area:'Écoquartier', price:134900, sqm:45.41,
      dpe:'B', charges:1058, tax:741, rent:604, market:2410, free:true, copro:'clean', works:0,
      source:'https://www.squarehabitat.fr/annonces/achat/bien/appartement/immobilier/grand-est/bas-rhin-67',
      rentSource:'Estimation Houser à partir des loyers du secteur et comparables publics',
      marketSource:'Repère communal de marché',
      notes:['Immeuble 2012','2 stationnements','DPE B','Charges modérées'], images:[]
    },
    {
      id:'H003', city:'Ostwald', area:'Rives du Bohrie', price:158000, sqm:48,
      dpe:'C', charges:1743, tax:750, rent:670, market:2662, free:true, copro:'clean', works:0,
      source:'https://www.seloger.com/annonces/achat/appartement/ostwald-67/est/273869061.htm',
      rentSource:'Estimation Houser à partir des loyers du secteur et comparables publics',
      marketSource:'Repère communal de marché',
      notes:['Résidence 2020','Tram','Terrasse','Parking'], images:[]
    },
    {
      id:'H004', city:'Bischheim', area:'Centre', price:129000, sqm:38,
      dpe:'C', charges:850, tax:700, rent:516, market:2551, free:true, copro:'clean', works:0,
      source:'https://www.hebdingimmobilier.fr/vente/10-bischheim/appartement/t2/2146-appartement-2-pieces-avec-terrasse-et-parking-immeuble-moderne-de-standing/',
      rentSource:'Estimation Houser à partir des loyers du secteur et comparables publics',
      marketSource:'Repère communal de marché',
      notes:['Petite copropriété','Terrasse','Bon état','Charges contenues'], images:[]
    }
  ];

  let profile = readJson('houserProfileV2', DEFAULT_PROFILE);
  let decisions = readJson('houserDecisionsV2', {});
  let view = 'feed';
  let queue = [];
  let index = 0;
  let activeImage = 0;
  let showRejected = false;

  function readJson(key, fallback){
    try { const raw = localStorage.getItem(key); return raw ? Object.assign({}, fallback, JSON.parse(raw)) : Object.assign({}, fallback); }
    catch { return Object.assign({}, fallback); }
  }
  function writeJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  function euro(n){ return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0); }
  function pct(n){ return ((Number.isFinite(n)?n:0)*100).toFixed(1)+' %'; }
  function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  function tooltip(text){ return '<span class="tip" tabindex="0" aria-label="'+escapeHtml(text)+'">i<span class="tipbox">'+escapeHtml(text)+'</span></span>'; }
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  function calc(x){
    const ppm = x.price/x.sqm;
    const gross = x.rent*12/x.price;
    const chargesMonthly = x.charges/12;
    const chargesM2 = x.charges/x.sqm;
    const yieldPrice = x.rent*12/profile.targetGross;
    const marketPrice = x.market*x.sqm;

    let riskFactor=1;
    if(x.dpe==='E') riskFactor-=0.06;
    if(x.copro==='unknown') riskFactor-=0.03;
    if(chargesMonthly>profile.maxChargesMonthly) riskFactor-=0.04;
    if(chargesMonthly>220) riskFactor-=0.08;
    const riskAdjustedMarket=Math.max(0,marketPrice*riskFactor-x.works);
    const houserPrice=Math.max(0,Math.round(Math.min(yieldPrice,riskAdjustedMarket)/1000)*1000);
    const discount=1-houserPrice/x.price;

    const nonRecoverable=x.charges*profile.nonRecoverableShare;
    const vacancy=x.rent*12*profile.vacancyRate;
    const maintenance=x.rent*12*profile.maintenanceRate;
    const netAnnual=x.rent*12-nonRecoverable-x.tax-vacancy-maintenance-profile.pnoYear;
    const totalCost=x.price*(1+profile.acquisitionCostRate)+x.works;
    const netYield=netAnnual/totalCost;

    let score=50;
    score+=clamp((gross-0.055)*900,-18,18);
    score+=clamp((netYield-0.035)*700,-12,12);
    score+=clamp(((x.market-ppm)/x.market)*35,-12,12);
    if(chargesMonthly<=100 && chargesM2<=28) score+=10;
    else if(chargesMonthly<=profile.maxChargesMonthly && chargesM2<=profile.maxChargesM2Year) score+=5;
    else if(chargesMonthly<=220 && chargesM2<=50) score-=8;
    else score-=20;
    if(['A','B','C'].includes(x.dpe)) score+=7;
    else if(x.dpe==='D') score+=3;
    else if(x.dpe==='E') score-=8;
    else score-=25;
    if(x.copro==='clean') score+=4;
    else if(x.copro==='unknown') score-=3;
    else score-=20;
    if(x.price>profile.maxBudget) score-=10;
    if(discount>0.18) score-=8;
    score=Math.round(clamp(score,0,100));

    const hardBlock=!x.free || ['F','G'].includes(x.dpe) || x.copro==='risk';
    let verdict=score>=72?'🟢 Match':score>=55?'🟠 À creuser':score>=45?'🟡 À surveiller':'🔴 Passer';
    if(hardBlock) verdict='🔴 Passer';
    const negotiation=discount<=0.05?'Négo réaliste':discount<=0.12?'Négociable':'Écart important';
    const opening=Math.round(houserPrice*(discount<=0.05?0.985:discount<=0.12?0.96:0.95)/1000)*1000;
    const chargeLevel=chargesMonthly<=100?'Faibles':chargesMonthly<=profile.maxChargesMonthly?'Acceptables':chargesMonthly<=220?'Élevées':'Très élevées';

    return Object.assign({},x,{ppm,gross,chargesMonthly,chargesM2,yieldPrice,marketPrice,riskAdjustedMarket,houserPrice,discount,nonRecoverable,netAnnual,totalCost,netYield,score,hardBlock,verdict,negotiation,opening,chargeLevel});
  }

  function rebuildQueue(){
    queue=listings.map(calc).filter(x=>showRejected || !x.hardBlock).sort((a,b)=>b.score-a.score);
    if(index>=queue.length) index=0;
  }

  function header(){
    const shortlistCount=Object.values(decisions).filter(v=>v==='deep').length;
    return '<header class="top"><div class="brand"><div class="logo">⌂</div><div><b>Houser</b><div class="muted small">Le chasseur locatif calibré pour toi.</div></div></div><nav class="tabs">'+
      tab('feed','Matches')+tab('short','À creuser · '+shortlistCount)+tab('criteria','Mes critères')+'</nav></header>';
  }
  function tab(key,label){ return '<button class="btn '+(view===key?'on':'')+'" data-view="'+key+'">'+label+'</button>'; }

  function feedView(){
    rebuildQueue();
    if(!queue.length) return '<section class="card empty"><h2>Aucun candidat affichable</h2><p class="muted">Houser préfère un écran vide à un mauvais achat.</p></section>';

    const x=queue[index];
    const scoreClass=x.score>=72?'good':x.score>=55?'mid':x.score>=45?'watch':'bad';
    const progress=(index+1)+' / '+queue.length;

    return '<div class="feedhead"><div><div class="eyebrow">TOP MATCHES</div><h1>'+x.city+' · '+x.area+'</h1><div class="muted">'+progress+' · triés du meilleur au moins bon</div></div><label class="toggle"><input id="show-rejected" type="checkbox" '+(showRejected?'checked':'')+'> voir les rejets</label></div>'+ 
      '<section class="property card">'+gallery(x)+'<div class="propertyBody">'+
        '<div class="propertyTop"><div><span class="badge">✅ LIBRE</span><span class="badge">DPE '+x.dpe+'</span><span class="badge">'+x.sqm+' m²</span></div><div class="price">'+euro(x.price)+'</div></div>'+ 
        '<div class="metricGrid">'+
          metric('Score Houser',x.score+'/100','Synthèse rendement, prix/m², charges, DPE, copropriété et risques. Un score élevé ne remplace pas la vérification des documents.',scoreClass)+
          metric('Loyer prudent',euro(x.rent)+' HC',x.rentSource+'. Houser ne reprend pas aveuglément le loyer annoncé par le vendeur.','')+
          metric('Rendement brut',pct(x.gross),'Loyer annuel hors charges ÷ prix d’achat affiché. Sert de premier filtre, pas de résultat final.','')+
          metric('Charges copro',euro(x.chargesMonthly)+'/mois','Charges annuelles annoncées ÷ 12. On regarde aussi les €/m²/an et, au stade Creuser, la part réellement non récupérable.','')+
          metric('Net exploitation',pct(x.netYield),'Estimation avant financement : loyer moins taxe foncière, vacance, entretien, PNO et part estimée de charges non récupérables, rapporté au coût total avec frais d’acquisition.','')+
          metric('Prix / m²',euro(x.ppm)+'/m²','Prix affiché ÷ surface. Comparé au repère local pour éviter de surpayer un rendement correct.','')+
        '</div>'+ 
        '<div class="verdictRow"><div><div class="eyebrow">VERDICT</div><h2>'+x.verdict+'</h2></div><div class="chargePill '+(x.chargeLevel==='Faibles'||x.chargeLevel==='Acceptables'?'ok':'warn')+'">Charges '+x.chargeLevel+' · '+Math.round(x.chargesM2)+' €/m²/an</div></div>'+ 
        '<div class="twoCol">'+
          '<div class="explain"><h3>Pourquoi ce prix conseillé ? '+tooltip('Le Houser Price n’est pas une expertise notariale. C’est notre plafond économique : on croise le prix compatible avec le rendement cible et une valeur de marché ajustée des risques, puis on retient l’ancre la plus prudente.')+'</h3>'+ 
            row('Prix compatible rendement',euro(x.yieldPrice), 'Avec '+(profile.targetGross*100).toFixed(1)+' % brut cible')+
            row('Valeur marché estimée',euro(x.marketPrice), x.marketSource)+
            row('Marché ajusté risques',euro(x.riskAdjustedMarket),'DPE, charges, copro et travaux connus')+
            '<div class="houserPrice"><span>Houser Price™</span><b>'+euro(x.houserPrice)+'</b></div>'+ 
          '</div>'+ 
          '<div class="nego"><div class="eyebrow light">PLAN POUR L’AVOIR</div><h3>'+x.negotiation+'</h3>'+ 
            rowDark('Offre d’ouverture',euro(x.opening))+rowDark('Cible d’atterrissage',euro(x.houserPrice))+rowDark('Écart vendeur → cible',(x.discount*100).toFixed(1)+' %')+
            '<p class="small lightText">Si l’écart est trop grand, Houser recommande de surveiller une baisse plutôt que de forcer une offre irréaliste.</p>'+ 
          '</div>'+ 
        '</div>'+ 
        '<div class="notes">'+x.notes.map(n=>'<span>✓ '+escapeHtml(n)+'</span>').join('')+'</div>'+ 
        '<div class="financeNote"><b>Cash-flow après Mourabaha :</b> non affiché tant qu’on n’a pas une mensualité réelle du financeur. '+tooltip('On refuse d’inventer un taux conventionnel. Dès qu’on a une mensualité réelle ou un coût par 100 k€ financés, Houser calcule automatiquement l’effort mensuel.')+'</div>'+ 
        '<div class="actions"><button class="btn ghost" data-action="pass">✕ Passer</button><button class="btn ghost" data-action="prev">← Précédent</button><button class="btn primary" data-action="deep">★ Creuser</button><a class="btn linkbtn" href="'+x.source+'" target="_blank" rel="noopener">Annonce ↗</a></div>'+ 
      '</div></section>';
  }

  function gallery(x){
    if(!x.images || !x.images.length){
      return '<div class="gallery emptyPhoto"><div><div class="photoIcon">⌂</div><b>Photo non encore importée</b><p>Houser affiche uniquement des photos publiques provenant de l’annonce source.</p></div></div>';
    }
    const img=x.images[Math.min(activeImage,x.images.length-1)];
    const thumbs=x.images.map((url,i)=>'<button class="thumb '+(i===activeImage?'active':'')+'" data-image="'+i+'"><img src="'+url+'" alt="Photo '+(i+1)+' du bien" loading="lazy" onerror="this.closest(\'button\').style.display=\'none\'"></button>').join('');
    return '<div class="gallery"><img class="heroImage" src="'+img+'" alt="Photo du bien immobilier" referrerpolicy="no-referrer" onerror="this.closest(\'.gallery\').classList.add(\'imageFailed\');this.style.display=\'none\'"><div class="imageFallback"><b>Photo indisponible</b><span>Le portail bloque peut-être l’affichage externe.</span></div><div class="thumbs">'+thumbs+'</div><div class="photoSource">Photos : annonce source publique</div></div>';
  }

  function metric(label,value,help,cls){ return '<div class="metric"><div class="metricLabel">'+label+' '+tooltip(help)+'</div><b class="'+cls+'">'+value+'</b></div>'; }
  function row(label,value,sub){ return '<div class="dataRow"><div><span>'+label+'</span><small>'+escapeHtml(sub)+'</small></div><b>'+value+'</b></div>'; }
  function rowDark(label,value){ return '<div class="darkRow"><span>'+label+'</span><b>'+value+'</b></div>'; }

  function criteriaView(){
    return '<div class="pageIntro"><div class="eyebrow">PROFIL INVESTISSEUR</div><h1>Les règles de Houser</h1><p class="muted">Ces critères reprennent notre cahier des charges. Ils ne servent pas à “trouver un appartement”, mais à éviter de bloquer 25 k€ dans un actif moyen.</p></div>'+ 
      '<div class="criteriaGrid">'+
        criteriaCard('🎯','Stratégie & budget',[
          ['Zone',profile.zone,'Strasbourg et première couronne : priorité à la demande locative, transports, emploi et revente.'],
          ['Budget idéal','≤ '+euro(profile.maxBudget),'Au-dessus seulement si l’actif est exceptionnel ou la négociation ramène l’économie dans notre zone.'],
          ['Apport cible',euro(profile.downPayment),'L’épargne de sécurité reste séparée.'],
          ['Matelas intouchable',euro(profile.emergencyFund),'Ne finance ni frais, ni travaux, ni apport.'],
          ['DCA ETF Islamic',euro(profile.dcaIslamic)+'/mois','Le projet immobilier ne doit pas tuer la stratégie boursière long terme.']
        ])+
        criteriaCard('🏠','Bien recherché',[
          ['Occupation','Libre uniquement','Aucun bail existant : tu gardes la main sur le loyer, le locataire et la stratégie.'],
          ['Typologie',profile.allowedTypes,'Petites surfaces liquides, faciles à relouer et revendables.'],
          ['DPE','A à E ciblés ; F/G exclus','Un mauvais DPE peut créer interdiction de louer, travaux et décote future.'],
          ['Horizon',profile.holdYears,'Le bien doit rester agréable à conserver même si tu quittes Strasbourg dans 6–12 mois.'],
          ['Mourabaha','Bien habitable sans gros travaux','On évite les opérations incompatibles avec les critères du financeur halal.']
        ])+
        criteriaCard('💰','Économie du deal',[
          ['Rendement brut cible',(profile.targetGross*100).toFixed(1)+' %','Premier filtre. Plus bas uniquement si emplacement et qualité patrimoniale compensent vraiment.'],
          ['Effort mensuel max','≈ '+euro(profile.maxMonthlyEffort),'Idéal : neutre ou positif. Jusqu’à ~100 € seulement pour un actif qualitatif.'],
          ['Charges copro cible','≤ '+euro(profile.maxChargesMonthly)+'/mois','Les grosses charges mangent le rendement et rendent le bien moins liquide à la revente.'],
          ['Charges normalisées','≤ '+profile.maxChargesM2Year+' €/m²/an','Permet de comparer objectivement un 30 m² à un 60 m².'],
          ['Vacance prudente',(profile.vacancyRate*100).toFixed(0)+' % des loyers','Même à Strasbourg, on ne modélise jamais 12 mois encaissés parfaitement chaque année.']
        ])+
        criteriaCard('🧾','Coûts intégrés',[
          ['Taxe foncière','Toujours incluse','Charge propriétaire directe.'],
          ['PNO',euro(profile.pnoYear)+'/an','Assurance propriétaire non occupant.'],
          ['Entretien',(profile.maintenanceRate*100).toFixed(0)+' % des loyers','Provision prudente pour petits travaux et remplacement d’équipements.'],
          ['Charges non récupérables','Hypothèse '+(profile.nonRecoverableShare*100).toFixed(0)+' %','Valeur provisoire tant qu’on n’a pas le décompte réel de copropriété.'],
          ['Frais acquisition','≈ '+(profile.acquisitionCostRate*100).toFixed(0)+' %','Utilisé dans le rendement net d’exploitation pour éviter un rendement artificiellement flatteur.']
        ])+
        criteriaCard('⚠️','Kill switches',[
          ['Bien occupé','NON','Éliminatoire.'],['DPE F/G','NON','Éliminatoire dans Houser.'],['Copro en procédure','NON / analyse exceptionnelle','Risque d’appels de fonds, impayés et revente difficile.'],['Gros travaux','Très forte pénalité','Encore plus important avec Mourabaha.'],['Prix “correct” sans avantage','NON','Tu n’es pas pressé d’acheter : il faut une vraie raison économique.']
        ])+
        criteriaCard('🚪','Test de sortie',[
          ['Question finale','“Si je pars dans 6–12 mois, est-ce que je veux garder ce bien 10–20 ans ?”','C’est notre test anti-FOMO.'],['Revente','Liquidité prioritaire','Quartier, transport, étage, plan, charges et DPE comptent autant que la renta.'],['Alternative','ETF World Islamic / liquidités','L’immobilier n’a pas automatiquement la priorité : il doit battre son coût d’opportunité.']
        ])+
      '</div>';
  }

  function criteriaCard(icon,title,items){
    return '<section class="card criteriaCard"><div class="criteriaTitle"><span>'+icon+'</span><h2>'+title+'</h2></div>'+items.map(i=>'<div class="criteriaRow"><div><b>'+i[0]+'</b><small>'+i[2]+'</small></div><strong>'+i[1]+'</strong></div>').join('')+'</section>';
  }

  function shortlistView(){
    const items=listings.map(calc).filter(x=>decisions[x.id]==='deep').sort((a,b)=>b.score-a.score);
    if(!items.length) return '<section class="card empty"><h2>Rien à creuser pour l’instant</h2><p class="muted">Quand tu cliques ★ Creuser, le bien est ajouté ici et Houser passe automatiquement au suivant.</p></section>';
    return '<div class="pageIntro"><div class="eyebrow">SHORTLIST</div><h1>Biens à approfondir</h1><p class="muted">Ici on passe du screening à la vraie due diligence : PV d’AG, décompte de charges, taxe foncière, travaux, loyer comparable, financement et stratégie de négociation.</p></div>'+items.map(x=>'<section class="card shortlistCard"><div><b>'+x.city+' · '+x.area+'</b><div class="muted small">'+x.sqm+' m² · DPE '+x.dpe+' · '+euro(x.chargesMonthly)+'/mois de charges</div></div><div><strong>'+x.score+'/100</strong><div class="small">cible '+euro(x.houserPrice)+'</div></div><a class="btn" href="'+x.source+'" target="_blank" rel="noopener">Annonce ↗</a></section>').join('');
  }

  function render(){
    try{
      const content=view==='criteria'?criteriaView():view==='short'?shortlistView():feedView();
      document.getElementById('app').innerHTML='<main class="app">'+header()+content+'</main>';
      bind();
    }catch(err){
      document.getElementById('app').innerHTML='<div class="error"><b>Houser a rencontré une erreur.</b><pre>'+escapeHtml(err && err.message ? err.message : String(err))+'</pre></div>';
    }
  }

  function bind(){
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;activeImage=0;render();}));
    document.querySelector('#show-rejected')?.addEventListener('change',e=>{showRejected=e.target.checked;index=0;activeImage=0;render();});
    document.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>{activeImage=Number(b.dataset.image)||0;render();}));
    document.querySelector('[data-action="prev"]')?.addEventListener('click',()=>{rebuildQueue(); index=(index-1+queue.length)%queue.length;activeImage=0;render();});
    document.querySelector('[data-action="pass"]')?.addEventListener('click',()=>decide('pass'));
    document.querySelector('[data-action="deep"]')?.addEventListener('click',()=>decide('deep'));
  }

  function decide(value){
    rebuildQueue();
    if(!queue.length) return;
    const current=queue[index];
    decisions[current.id]=value;
    writeJson('houserDecisionsV2',decisions);
    index=(index+1)%queue.length;
    activeImage=0;
    render();
  }

  render();
})();