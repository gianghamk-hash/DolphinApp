'use strict';
const fs=require('node:fs'),vm=require('node:vm'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
for(const file of ['index.html','dolphin-bungalow.html','dolphin-lounge.html','dolphin-restaurant.html','manager/dashboard.html','giaitri/index.html']){
 for(const match of fs.readFileSync(file,'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/src\s*=|application\//i.test(match[1]))continue;
  if(/type\s*=\s*["']module["']/i.test(match[1])){
   const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[2],encoding:'utf8'});assert.equal(result.status,0,file+': '+result.stderr);
  }else new vm.Script(match[2],{filename:file});
 }
 console.log('Syntax OK:',file);
}
