'use strict';
const fs=require('node:fs'),vm=require('node:vm'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const path=require('node:path');
function pages(dir='.'){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='.git'||e.name==='node_modules'?[]:e.isDirectory()?pages(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
for(const file of pages()){
 for(const match of fs.readFileSync(file,'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(/src\s*=|application\//i.test(match[1]))continue;
  if(/type\s*=\s*["']importmap["']/i.test(match[1])){JSON.parse(match[2]);continue;}
  if(/type\s*=\s*["']module["']/i.test(match[1])){
   const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:match[2],encoding:'utf8'});assert.equal(result.status,0,file+': '+result.stderr);
  }else new vm.Script(match[2],{filename:file});
 }
 console.log('Syntax OK:',file);
}
