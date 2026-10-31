'use strict';
// Authenticated operator integration test. Uses the Rules simulator, never
// writes documents, creates users, or publishes rules. Requires firebase-tools.
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const toolsRoot=process.env.FIREBASE_TOOLS_ROOT || (process.platform==='win32'
  ? path.join(process.env.APPDATA,'npm/node_modules/firebase-tools')
  : '/usr/local/lib/node_modules/firebase-tools');
const req=createRequire(path.join(toolsRoot,'package.json'));
const {getGlobalDefaultAccount}=req('./lib/auth');
const {requireAuth}=req('./lib/requireAuth');
const {Client}=req('./lib/apiv2');
const project='dolphin-f6d67';
const privateCols=['dolphin_push_devices','dolphin_push_enrollments','dolphin_push_invites','dolphin_push_dispatches','dolphin_push_future'];
const legacyCols=['battleship_games','bun_calls','bun_history','bun_orders','bun_tables','caro_games','data','inputs','lounge_calls','lounge_history_sessions','lounge_orders','lounge_tables','mp_rooms','other_legacy_collection','players','ranking','res_calls','res_history','res_orders','res_settings','res_tables','shared_notes','shared_reminders','show_history','show_tables','staff_online','staff_profiles','xiangqi_games'];
const cases=[];
function add(collection,method,auth,expectation,nested=false){
  const suffix=method==='list'?collection:collection+'/rules-audit-fixture'+(nested?'/nested/rules-audit-fixture':'');
  const request={path:'/databases/(default)/documents/'+suffix,method,
    auth:auth?{uid:auth,token:{sub:auth,firebase:{sign_in_provider:'anonymous'}}}:null};
  if(method==='create'||method==='update')request.resource={data:{uid:'other-user',role:'manager',active:true,token:'x'.repeat(20000),status:'completed'},__name__:request.path};
  cases.push({label:collection+'/'+method+'/'+(auth||'guest')+(nested?'/nested':''),expectation,request,
    resource:{data:{uid:'owner-user',active:false,status:'pending'},__name__:request.path}});
}
for(const col of privateCols)for(const auth of [null,'unlinked-staff','simulated-manager'])
  for(const method of ['get','list','create','update','delete']){
    add(col,method,auth,'DENY');
    if(method!=='list')add(col,method,auth,'DENY',true);
  }
for(const col of legacyCols)for(const auth of [null,'unlinked-staff','simulated-manager'])
  for(const method of ['get','list','create','update','delete'])add(col,method,auth,'ALLOW');
(async()=>{
  await requireAuth({project,...getGlobalDefaultAccount()},true);
  const client=new Client({urlPrefix:'https://firebaserules.googleapis.com',apiVersion:'v1'});
  const source=fs.readFileSync(process.argv[2]||path.resolve(__dirname,'../firestore.rules'),'utf8');
  const all=[];
  for(let i=0;i<cases.length;i+=50){
    const batch=cases.slice(i,i+50);
    const res=await client.post('/projects/'+project+':test',{
      source:{files:[{name:'firestore.rules',content:source}]},
      testSuite:{testCases:batch.map(({label,...testCase})=>testCase)}
    },{skipLog:{body:true,resBody:true}});
    if(res.body.issues?.some(x=>x.severity==='ERROR'))throw Error(JSON.stringify(res.body.issues));
    const results=res.body.testResults||[];
    if(results.length!==batch.length)throw Error('Unexpected test result count');
    results.forEach((r,j)=>all.push({label:batch[j].label,state:r.state}));
    if(results.some(r=>r.state!=='SUCCESS'))throw Error(JSON.stringify(all.filter(r=>r.state!=='SUCCESS')));
  }
  if(process.env.RULES_TEST_REPORT)fs.writeFileSync(process.env.RULES_TEST_REPORT,JSON.stringify({project,tests:all.length,passed:all.length,results:all},null,2));
  console.log(JSON.stringify({tests:all.length,passed:all.length,privateCollections:privateCols.length,legacyCollections:legacyCols.length}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
