'use strict';
// Guard the Firebase source boundary before deployment. Only ./functions
// is uploaded to Firebase (firebase.json). Static local imports must not
// resolve into the repository root or any other undeployed sibling folder.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..','functions');
const errors=[],visited=[];
function walk(dir){
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(e.name==='node_modules'||e.name.startsWith('.'))continue;
  const file=path.join(dir,e.name);
  if(e.isDirectory()){walk(file);continue;}
  if(!/\.(?:js|cjs|mjs)$/.test(e.name)||/\.(?:test|spec)\.[cm]?js$/.test(e.name))continue;
  visited.push(file);
  const source=fs.readFileSync(file,'utf8');
  const re=/\brequire\(\s*['"]([.][.]?\/[\w./-]+)['"]\s*\)/g;
  let m;
  while((m=re.exec(source))){
   const target=path.resolve(path.dirname(file),m[1]);
   if(target!==root&&!target.startsWith(root+path.sep)){
    errors.push(path.relative(root,file)+' imports outside deployed functions: '+m[1]);
    continue;
   }
   if(![target,target+'.js',target+'.cjs',target+'.json',path.join(target,'index.js')].some(fs.existsSync)){
    errors.push(path.relative(root,file)+' imports missing module: '+m[1]);
   }
  }
 }
}
walk(root);
if(errors.length){console.error('Firebase source boundary violations:\n'+errors.join('\n'));process.exitCode=1;}
else console.log('Firebase source boundary validated for '+visited.length+' runtime JavaScript files.');
