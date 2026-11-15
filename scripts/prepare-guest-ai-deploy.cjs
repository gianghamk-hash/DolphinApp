'use strict';
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('.firebase-guest-ai/functions');
fs.mkdirSync(out,{recursive:true});
for(const file of ['guest-note-summary.js','guest-request-translation.js','guest-note-classification.js','guest-nationalities.js','guest-country-codes.json']){
 fs.copyFileSync(path.join('functions',file),path.join(out,file));
}
const pkg=JSON.parse(fs.readFileSync('functions/package.json','utf8'));
pkg.main='index.js';delete pkg.scripts;
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(pkg,null,2));
fs.writeFileSync(path.join(out,'index.js'),"'use strict';\nrequire('firebase-admin/app').initializeApp();\nexports.guestSummarizeNotes=require('./guest-note-summary').guestSummarizeNotes;\n");
fs.writeFileSync('.firebase-guest-ai/firebase.json',JSON.stringify({functions:{source:'functions',runtime:'nodejs22'}}));
console.log('Prepared guestSummarizeNotes only; no unrelated secret-bound functions.');
