'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {trending,weather}=require('../crew-dolphin-brief.js');
const {select}=require('../crew-dolphin-wardrobe.js');
const now=Date.UTC(2026,10,23,4),hour=3600000;
test('only fresh topics from the public sources are spoken, with no repeat until the pool is exhausted',()=>{
 const item={title:'#ListeningClub',category:'music',source:'Facebook',region:'VN',observed:now,url:'https://www.facebook.com/12/posts/34'};
 const brief={trends:{updated:now,items:[item,{...item,title:'#Caturday',url:'https://www.tiktok.com/@cat/video/123',source:'TikTok'}, {...item,url:'javascript:alert(1)'},{...item,region:'US'},{...item,observed:now-40*hour},{...item,source:'TikTok'}]}};
 const seen=new Set();
 assert.equal(trending(brief,seen,now,()=>0).url,item.url);
 assert.match(trending(brief,seen,now,()=>0).text,/Caturday/);
 assert.equal(trending(brief,seen,now,()=>0).url,item.url);
 assert.equal(trending(brief,seen,now+19*hour),null);
});
test('weather uses only the current Ha Long hour and adapts the check-in',()=>{
 const item={at:now,temperature:30.3,wind:3,sky:'fair_day'},brief={weather:{updated:now-hour,hours:[item]}};
 assert.match(weather(brief,now).text,/Hạ Long.*30°C.*uống nước/);
 for(const [values,phrase] of [[{temperature:17},/đủ ấm/],[{wind:10},/gió mạnh/],[{sky:'rain'},/áo mưa/]]){
  assert.match(weather({weather:{...brief.weather,hours:[{...item,...values}]}},now).text,phrase);
 }
 assert.equal(weather(brief,now+hour),null);
 assert.equal(weather({weather:{...brief.weather,updated:now-25*hour}},now),null);
});
test('Vietnam local dates drive the holiday wardrobe, including lunar holidays crossing midnight',()=>{
 assert.equal(select(new Date('2026-09-25T01:00:00Z')).key,'midautumn');
 assert.equal(select(new Date('2027-02-06T01:00:00Z')).key,'tet');
 assert.equal(select(new Date('2026-12-19T17:01:00Z')).part,'cap');
 assert.equal(select(new Date('2026-12-19T16:59:00Z')).part,'scarf');
 assert.equal(select(new Date(now),'halloween').part,'hat');
});

test('Vietnam collectors require dated rankings, original post links and recent engagement',async()=>{
 const {facebookPosts,tiktokChart}=await import('./companion-feed/vietnam.mjs');
 const post={created_time:new Date(now).toISOString(),message:'Giải Rubik cuối tuần',permalink_url:'https://www.facebook.com/dolphin/posts/345',shares:{count:120}};
 assert.equal(facebookPosts([post,{...post,shares:{}},{...post,created_time:'2020-01-01'},{...post,permalink_url:'https://example.com'}],now).length,1);
 const url='https://endless.app/radar/tiktok/vietnam',link='https://www.tiktok.com/@dolphin/video/123';
 const html=[{url,dateModified:new Date(now).toISOString()},{'@type':'ItemList','@id':url+'#trends',itemListElement:[{name:'Biển Hạ Long',url:link},{name:'Sai nguồn',url:'https://example.com'}]}]
  .map(x=>'<script type="application/ld+json">'+JSON.stringify(x)+'</script>').join('');
 assert.equal(tiktokChart(html,now)[0].url,link);assert.equal(tiktokChart(html,now).length,1);
 assert.deepEqual(tiktokChart(html,now+40*hour),[]);
});
