(function(){
  'use strict';

  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));}
  function fmtDate(v){
    if(!v)return 'inconnu';
    try{return new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Paris'}).format(new Date(v));}
    catch{return esc(v);}
  }

  async function mount(){
    try{
      const r=await fetch('./data/listings.json?scan='+Date.now(),{cache:'no-store'});
      if(!r.ok)return;
      const data=await r.json();
      const s=data.scanStats||{};
      const baseCount=(data.listings||[]).length;
      const header=document.querySelector('header.top');
      if(!header||document.querySelector('.scanStatus'))return;

      const candidates=s.candidatesExamined;
      const compatible=s.compatibleCount;
      const added=s.addedCount;
      const updated=s.updatedCount;
      const matches=s.matchesCount;
      const last=s.lastScanAt||data.updatedAt;

      const value=(v,fallback='—')=>Number.isFinite(v)?String(v):fallback;
      const el=document.createElement('section');
      el.className='scanStatus card';
      el.innerHTML=`
        <div class="scanStatusMain">
          <div><div class="eyebrow">HOUSER WATCH</div><b>Dernier scan : ${fmtDate(last)}</b></div>
          <span class="scanPulse"><i></i> veille horaire active</span>
        </div>
        <div class="scanStatsGrid">
          <div><span>Annonces examinées</span><b>${value(candidates)}</b></div>
          <div><span>Passent les kill-switchs</span><b>${value(compatible,baseCount)}</b></div>
          <div><span>Ajoutées en base</span><b>${value(added)}</b></div>
          <div><span>Mises à jour</span><b>${value(updated)}</b></div>
          <div><span>Vrais matchs</span><b>${value(matches)}</b></div>
          <div><span>Base totale</span><b>${baseCount}</b></div>
        </div>
        ${Number.isFinite(candidates)?'':'<div class="scanHint">Les compteurs détaillés seront renseignés automatiquement au prochain scan. La base contient déjà '+baseCount+' dossiers.</div>'}
      `;
      header.insertAdjacentElement('afterend',el);
    }catch(e){console.debug('scan status unavailable',e);}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,250));
  else setTimeout(mount,250);
})();
