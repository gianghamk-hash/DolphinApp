/* Dolphin Tactics shop hints: presentation-only, shared by offline and multiplayer. */
(function(root){
'use strict';
function hints(player,heroId,catalog){
 const defs=Object.fromEntries((catalog.heroes||[]).map(h=>[h.id,h]));
 const offered=defs[heroId];if(!player||!offered)return {upgrade:false,synergy:false,traits:[]};
 const units=Object.values(player.units||{});
 // BUY generates exactly one star-1 unit; two owned star-1 copies can combine immediately.
 const copies=units.filter(u=>u.heroId===heroId&&u.star===1).length;
 const upgrade=copies>=2;
 const fieldIds=new Set(Object.values(player.board||{}).map(id=>player.units?.[id]?.heroId).filter(Boolean));
 const fieldTraits=new Set();
 for(const id of fieldIds){const h=defs[id];if(h)for(const trait of [...(h.origins||[]),...(h.classes||[])])fieldTraits.add(trait);}
 const shared=[...(offered.origins||[]),...(offered.classes||[])].filter(t=>fieldTraits.has(t));
 return {upgrade,synergy:shared.length>0,traits:[...new Set(shared)]};
}
const api={hints};
root.DolphinTFTShopHints=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
