import {writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pipeline} from '@huggingface/transformers';

const now=Date.now(), hour=3600000;
const headers={'User-Agent':'DolphinApp/1.0 (https://github.com/gianghamk-hash/DolphinApp)'};
async function json(url){
 const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error(new URL(url).hostname+' HTTP '+res.status);
 return res.json();
}

async function trends(){
 const sources=await Promise.allSettled([
  json('https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrends?limit=25').then(({trends})=>trends
   .filter(t=>['culture','entertainment','sports','science','technology','other'].includes(t.category)&&/^\/profile\/[\w:.-]+\/feed\/[\w.-]+$/.test(t.link))
   .map(t=>({title:t.displayName,context:t.description,url:'https://bsky.app'+t.link,source:'Bluesky'}))),
  json('https://mastodon.social/api/v1/trends/tags?limit=20').then(tags=>tags
   .filter(t=>/^https:\/\/mastodon\.social\/tags\//i.test(t.url))
   .map(t=>({title:'#'+t.name,context:t.name.replace(/([a-z])([A-Z])/g,'$1 $2'),url:t.url,source:'Mastodon'})))
 ]);
 const topics=sources.flatMap(s=>s.status==='fulfilled'?s.value:[]).filter(t=>t.title&&t.title.length<=90);
 if(!topics.length)throw Error('No current social topics');
 const themes={
  music:'Listening to a favorite song, a singer, concert, band or music album.',
  art:'Photography, drawing and painting, watercolor, favorite artwork or landscape photographs.',
  animals:'Cute cats, dogs, dolphins, wildlife photography and friendly animals.',
  food:'Delicious food, home cooking, desserts and favorite recipes.',
  games:'Fun board games, video games, playing cards or a friendly sports match.',
  nature:'Exploring nature, beaches, the ocean, flowers and the night sky.'
 };
 const reject='Political controversy, partisan conflict, death, war, crime, illness, tragedy, adult content, hate or violence.';
 const embed=await pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{
  revision:'751bff37182d3f1213fa05d7196b954e230abad9',dtype:'q8',device:'cpu',cache_dir:join(tmpdir(),'dolphin-embeddings')
 });
 const vectors=(await embed([...Object.values(themes),reject,...topics.map(t=>t.title+' '+(t.context||''))],
  {pooling:'mean',normalize:true})).tolist();
 const keys=Object.keys(themes),start=keys.length+1;
 const ranked=topics.map(({context,...topic},i)=>{
  const scores=vectors.slice(0,start).map(anchor=>anchor.reduce((sum,x,j)=>sum+x*vectors[start+i][j],0));
  const score=Math.max(...scores.slice(0,-1));
  return {...topic,category:keys[scores.indexOf(score)],score,eligible:score>=.23&&score>scores.at(-1)+.09};
 }).filter(t=>t.eligible).sort((a,b)=>b.score-a.score);
 await embed.dispose();
 if(!ranked.length)throw Error('No suitable trending topics this cycle');
 return {updated:now,items:ranked.slice(0,12).map(({score,eligible,...t})=>t)};
}
async function weather(){
 const {properties}=await json('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=20.95&lon=107.08');
 const updated=Date.parse(properties.meta.updated_at);
 if(!Number.isFinite(updated)||Math.abs(now-updated)>24*hour)throw Error('Old weather model');
 const hours=properties.timeseries.map(({time,data})=>({at:Date.parse(time),temperature:data.instant.details.air_temperature,
  wind:data.instant.details.wind_speed,sky:data.next_1_hours?.summary?.symbol_code||''}))
  .filter(x=>x.at>=now-hour&&x.at<=now+18*hour&&Number.isFinite(x.temperature)&&x.sky);
 if(!hours.length)throw Error('No hourly forecast for Ha Long');
 return {updated,hours};
}
const previous=await json('https://raw.githubusercontent.com/gianghamk-hash/DolphinApp/companion-bulletin/brief.json').catch(()=>({}));
const result=await Promise.allSettled([trends(),weather()]);
const brief={};
for(const [index,key] of ['trends','weather'].entries()){
 const item=result[index];
 if(item.status==='fulfilled')brief[key]=item.value;
 else {console.warn(key+': '+item.reason.message);if(previous[key])brief[key]=previous[key];}
}
if(result.every(r=>r.status==='rejected')||(!previous.trends&&!brief.trends)||(!previous.weather&&!brief.weather))throw Error('Incomplete initial bulletin or both sources unavailable');
await writeFile(process.argv[2],JSON.stringify(brief)+'\n');
console.log((brief.trends?.items.length||0)+' social topics, '+(brief.weather?.hours.length||0)+' forecast hours');
