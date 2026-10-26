/* TFT Phase 1C - cheap, deterministic identity descriptors for original 30 hero rigs.
   Gameplay catalog is authoritative for origin/class; this module changes visuals only. */
(function(root){'use strict';
const ORIGINS={
 Mech:{symbol:'core',color:0x40dbef},Void:{symbol:'spikes',color:0xb78bff},
 Arcane:{symbol:'runes',color:0x6b9dff},Beast:{symbol:'horns',color:0x7dde84},
 Shadow:{symbol:'blades',color:0xcf70df},Celestial:{symbol:'halo',color:0xffd981}
};
function buildIdentity(defs,catalog){
 const result={};
 for(const h of catalog.heroes||[]){
  const base=defs[h.id]||{},origin=h.origins?.[0]||'Mech',role=h.classes?.[0]||'Brawler';
  const ordinal=Number(h.id.slice(1))||1;
  result[h.id]={...base,heroId:h.id,displayName:h.name,origin,role,
    motif:ORIGINS[origin]?.symbol||'core',
    motifColor:ORIGINS[origin]?.color||0x66ddff,
    silhouetteVariant:ordinal%5,
    signatureVariant:Math.floor((ordinal-1)/5)%3};
 }
 return result;
}
root.DolphinTacticsHeroIdentity=buildIdentity;
if(typeof module!=='undefined'&&module.exports)module.exports={buildIdentity,ORIGINS};
})(typeof window!=='undefined'?window:globalThis);
