'use strict';
const fs=require('node:fs');
const {GoogleAuth,Impersonated}=require('../functions/node_modules/google-auth-library');
const project='dolphin-f6d67';
const url='https://cloudfunctions.googleapis.com/v2/projects/'+project+'/locations/asia-southeast1/functions/guestSummarizeNotes';
(async()=>{
 const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']});
 const client=await auth.getClient();
 const {data:fn}=await client.request({url,timeout:30000});
 const model=fn.serviceConfig?.environmentVariables?.GUEST_NOTE_AI_MODEL||'gemini-3.5-flash';
 if(!/^[a-zA-Z0-9._-]+$/.test(model))throw Error('Unexpected model setting');
 if(process.argv[2]==='prepare'){
  fs.writeFileSync('.firebase-guest-ai/functions/.env.'+project,'GUEST_NOTE_AI_MODEL='+model+'\n',{mode:0o600});
  console.log('Preserved production model parameter: '+model);
  return;
 }
 if(fn.state!=='ACTIVE')throw Error('Function is not ACTIVE: '+fn.state);
 console.log('guestSummarizeNotes ACTIVE; updated '+fn.updateTime);
 const endpoint=fn.serviceConfig?.uri;
 if(!endpoint||new URL(endpoint).protocol!=='https:')throw Error('Missing HTTPS endpoint');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{task:'translate-requests',notes:['Please bring 2 glasses of water, no ice.']}})});
 const payload=await response.json();
 if(response.status!==401||payload.error?.status!=='UNAUTHENTICATED')throw Error('Staff authentication check failed');
 console.log('Unauthenticated requests are rejected.');
 const effective=/^(?:gemini-2\.5-flash(?:-lite)?|gemini-3\.1-flash-lite)$/.test(model)?'gemini-3.5-flash':model;
 let runtimeClient=client;
 const runtimeEmail=fn.serviceConfig?.serviceAccountEmail;
 const credentials=await auth.getCredentials();
 if(runtimeEmail&&runtimeEmail!==credentials.client_email){
  runtimeClient=new Impersonated({sourceClient:client,targetPrincipal:runtimeEmail,targetScopes:['https://www.googleapis.com/auth/cloud-platform'],lifetime:600});
  try{await runtimeClient.getAccessToken();}catch(e){
   const status=Number(e.response?.status)||0;
   const message='Deployment and endpoint authentication verified. Runtime translation smoke test NOT RUN: deployment identity cannot impersonate the runtime service account (HTTP '+status+'). No IAM permissions were changed.';
   console.warn('::warning::'+message);
   if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,message+'\n');
   return;
  }
 }
 const inspectedAuth={getClient:async()=>({request:async options=>{
  try{return await runtimeClient.request(options);}catch(e){
   console.error('Vertex AI diagnostic:',Number(e.response?.status)||0,String(e.response?.data?.error?.message||'Provider request failed'));
   throw e;
  }
 }})};
 const {handle}=require('../functions/guest-request-translation');
 class HttpsError extends Error{}
 const result=await handle({auth:{uid:'deployment-smoke-test'},data:{notes:[
  'Please bring 2 glasses of water, no ice.',
  '不要花生，我对花生过敏。',
  '설탕을 넣지 마세요.',
  'Без молока, пожалуйста.'
 ]}},inspectedAuth,effective,HttpsError);
 console.log('Synthetic translation smoke test (runtime identity):',JSON.stringify(result.translations.map(x=>({id:x.id,text:x.text,needsReview:x.needsReview}))));
})().catch(e=>{console.error('Guest AI verification failed:',e.message);process.exitCode=1;});
