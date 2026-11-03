'use strict';
// Name policy is shared by registration, login, and legacy-name remediation.
// NFKC + case folding makes visually equivalent spacing/case/Unicode collide.
const normalize=name=>String(name||'').normalize('NFKC').trim().replace(/\s+/g,' ');
const key=name=>normalize(name).toLocaleLowerCase('vi-VN');
const valid=name=>{const n=normalize(name);return n.length>=7&&n.length<=64&&!/[\u0000-\u001f<>]/.test(n);};
const approved=p=>p?.registrationSource!=='self'||p.approved===true;
const ordered=registry=>Object.values(registry||{}).filter(p=>p&&p.active&&p.employeeId)
 .sort((a,b)=>(Number(a.createdAt)||0)-(Number(b.createdAt)||0)||String(a.employeeId).localeCompare(String(b.employeeId)));
function nameConflict(registry,name,exceptId=''){
 const k=key(name);
 return ordered(registry).find(p=>p.employeeId!==exceptId&&key(p.name)===k)||null;
}
function needsRename(registry,id){
 const p=registry?.[id];if(!p?.active)return false;
 if(!valid(p.name))return true;
 // Old duplicate names: retain the earliest account; others must rename.
 const first=ordered(registry).find(x=>key(x.name)===key(p.name));
 return !!first&&first.employeeId!==id;
}
module.exports={normalize,key,valid,approved,ordered,nameConflict,needsRename};
