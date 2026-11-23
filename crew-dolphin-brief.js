/* Shared public bulletin. Employee names and preferences stay on the device. */
(function(root){
 'use strict';
 const hour=3600000;
 const url='https://raw.githubusercontent.com/gianghamk-hash/DolphinApp/companion-bulletin/brief.json';
 const questions={
  music:'Nếu chọn nhạc cho chuyến ra khơi hôm nay, bạn sẽ bật bài nào?',
  art:'Nếu vẽ một góc trên tàu, bạn sẽ chọn cảnh nào?',
  animals:'Nếu được gặp một loài vật ngoài vịnh, bạn muốn gặp ai?',
  food:'Món nào làm bạn nhớ tới một buổi đi biển?',
  games:'Nếu mình cùng lập đội, bạn muốn chơi trò gì?',
  nature:'Hôm nay có khoảnh khắc nào ngoài vịnh khiến bạn muốn chụp lại không?'
 };
 let cached=null,until=0,pending=null;
 async function read(){
  if(Date.now()<until)return cached;
  if(pending)return pending;
  pending=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
   try{
    const res=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
    if(!res.ok)throw Error('Bulletin unavailable');
    cached=await res.json();until=Date.now()+20*60000;
   }catch{until=Date.now()+60000;}
   finally{clearTimeout(timeout);pending=null;}
   return cached;
  })();
  return pending;
 }
 function trending(brief,seen,now=Date.now(),random=Math.random){
  const feed=brief?.trends;
  if(!feed||!(now-feed.updated>=0&&now-feed.updated<18*hour))return null;
  const items=(feed.items||[]).filter(x=>Object.hasOwn(questions,x.category)&&typeof x.title==='string'&&
   /^https:\/\/(?:mastodon\.social\/tags\/|bsky\.app\/profile\/)/i.test(x.url));
  if(!items.length)return null;
  if(items.every(x=>seen.has(x.url)))seen.clear();
  const fresh=items.filter(x=>!seen.has(x.url)),item=fresh[Math.floor(random()*fresh.length)];
  seen.add(item.url);
  return {text:'Trên '+item.source+' đang rôm rả về '+item.title+'. '+questions[item.category],
   source:item.source,url:item.url};
 }
 function weather(brief,now=Date.now()){
  const data=brief?.weather;
  if(!data||!(now-data.updated>=0&&now-data.updated<24*hour))return null;
  const entry=data.hours?.find(x=>now>=x.at&&now<x.at+hour&&Number.isFinite(x.temperature));
  if(!entry)return null;
  const wet=/rain|sleet|snow|thunder/.test(entry.sky);
  const sky=wet?'có khả năng mưa':/fog/.test(entry.sky)?'có sương':/clear|fair/.test(entry.sky)?'trời quang':'có mây';
  const care=wet?'Bạn có mang áo mưa để đi lại cho khô ráo không?':entry.wind>=8?'Ngoài boong có gió mạnh. Bạn có áo khoác bên mình không?':
   entry.temperature>=28?'Bạn đã kịp uống nước và nghỉ trong bóng râm một chút chưa?':
   entry.temperature<=20?'Bạn có đủ ấm khi ra boong không?':'Hôm nay bạn thấy trong người thế nào?';
  const time=new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'}).format(entry.at);
  return {text:'Hạ Long lúc '+time+' dự báo '+Math.round(entry.temperature)+'°C, '+sky+'. '+care,
   source:'MET Norway · CC BY 4.0',url:'https://api.met.no/doc/License'};
 }
 root.DolphinBrief={read,trending,weather};
 if(typeof module==='object'&&module.exports)module.exports=root.DolphinBrief;
})(globalThis);
