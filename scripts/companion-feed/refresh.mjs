import {writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {vietnamTopics} from './vietnam.mjs';
import {pipeline} from '@huggingface/transformers';

const now=Date.now(), hour=3600000;
const headers={'User-Agent':'DolphinApp/1.0 (https://github.com/gianghamk-hash/DolphinApp)'};
async function json(url){
 const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw Error(new URL(url).hostname+' HTTP '+res.status);
 return res.json();
}

async function classify(topics){
 const themes={
  music:'Nghe nhạc, bài hát yêu thích, ca sĩ, hòa nhạc và album.',
  art:'Photography, drawing and painting, watercolor, favorite artwork or landscape photographs.',
  animals:'Mèo dễ thương, chó, cá heo và những con vật đáng yêu.',
  food:'Delicious food, home cooking, desserts and favorite recipes.',
  games:'Trò chơi vui, giải Rubik, trò điện tử, cờ bàn và thi đấu thể thao.',
  nature:'Exploring nature, beaches, the ocean, flowers and the night sky.'
 };
 const reject='Political controversy, partisan conflict, death, war, crime, illness, tragedy, adult content, hate or violence.';
 const embed=await pipeline('feature-extraction','Xenova/paraphrase-multilingual-MiniLM-L12-v2',{
  revision:'2c4055b12046f11709e9df2c122e59ffbdc2f900',dtype:'q8',device:'cpu',cache_dir:join(tmpdir(),'dolphin-embeddings')
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
 return {updated:now,items:ranked.map(({score,eligible,...t})=>t)};
}
async function trends(){
 const topics=await vietnamTopics(now);
 if(!topics.length)throw Error('No current social topics');
 try{return await classify(topics);}
 catch(error){
  console.warn('AI selection unavailable: '+error.message);
  // Select from the same observed posts if the embedding model cannot be loaded.
  const keywords={games:/rubik|chơi game|trò chơi|bóng đá/iu,music:/bài hát|bản nhạc|hòa nhạc|nghe nhạc/iu,
   nature:/bình minh|vịnh hạ long|hoàng hôn/iu,animals:/mèo con|cá heo|#cat\b/iu,food:/nấu ăn|món ngon|công thức nấu/iu,art:/vẽ tranh|tranh màu nước/iu};
  const items=topics.flatMap(({context,...topic})=>{
   const category=Object.keys(keywords).find(key=>keywords[key].test(context));
   return category?[{...topic,category}]:[];
  });
  return {updated:now,items};
 }
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
const current=result[0].status==='fulfilled'?result[0].value.items:[];
const items=new Map();
for(const t of [...current,...(previous.trends?.items||[])]){
 if(t.region==='VN'&&['Facebook','TikTok'].includes(t.source)&&t.observed<=now&&now-t.observed<36*hour&&!items.has(t.url))items.set(t.url,t);
}
const available=[...items.values()];
const brief={trends:{updated:now,items:['TikTok','Facebook'].flatMap(source=>available.filter(x=>x.source===source).slice(0,8))}};
brief.weather=result[1].status==='fulfilled'?result[1].value:previous.weather;
for(const item of result)if(item.status==='rejected')console.warn(item.reason.message);
if(!brief.weather&&!brief.trends.items.length)throw Error('No bulletin data available');
await writeFile(process.argv[2],JSON.stringify(brief)+'\n');
console.log((brief.trends?.items.length||0)+' social topics, '+(brief.weather?.hours.length||0)+' forecast hours');
