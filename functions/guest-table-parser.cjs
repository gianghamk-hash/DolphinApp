'use strict';
 function parseTables(raw){
  const src=String(raw||'').replace(/LOUNGE\s*/gi,'L'),rooms=[];
  const re=/\b([ABCDEJQL])\s*(\d{1,3})(?:\s*[-–]\s*(?:([ABCDEJQL])\s*)?(\d{1,3}))?/gi;let m;
  while((m=re.exec(src))){
   const a=m[1].toUpperCase(),other=m[3]?.toUpperCase(),from=+m[2],to=m[4]?+m[4]:from;
   if(other&&other!==a||from<1||to<1||from>999||to>999||Math.abs(to-from)>60)continue;
   for(let n=Math.min(from,to);n<=Math.max(from,to);n++)rooms.push(a+n);
  }
  return [...new Set(rooms)];
 }

module.exports={parseTables};
