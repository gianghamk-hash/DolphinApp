const hour=3600000;
const radar='https://endless.app/radar/tiktok/vietnam';
const agent={'User-Agent':'DolphinApp/1.0 (+https://github.com/gianghamk-hash/DolphinApp)'};

function fresh(time,now,maxHours){
 return Number.isFinite(time)&&time<=now&&now-time<maxHours*hour;
}
function topic(source,url,caption,observed){
 const context=String(caption||'').normalize('NFC').replace(/\s+/gu,' ').trim();
 const title=context.split(/\s*#|https?:\/\//u)[0].trim().replace(/^POV:\s*/i,'');
 if(title.length<4||/voucher|giảm giá|thanh lý|mua ngay|khuyến mãi|đại sứ|giới thiệu|đặt hàng|nhãn hàng|tài trợ|bia |rượu|tên lửa|trại giam|tử vong|tai nạn|bị phạt/iu.test(context))return null;
 return {source,url,title:title.length>86?title.slice(0,84).replace(/\s+\S*$/u,'')+'…':title,context:context.slice(0,250),observed,region:'VN'};
}
export function tiktokChart(html,now){
 const docs=[];
 for(const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{docs.push(JSON.parse(script[1]));}catch{}
 }
 const observed=Date.parse(docs.find(x=>x.url===radar)?.dateModified);
 if(!fresh(observed,now,36))return [];
 const list=docs.find(x=>x['@type']==='ItemList'&&x['@id']===radar+'#trends');
 return (list?.itemListElement||[]).filter(x=>/^https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+$/i.test(x.url))
  .map(x=>topic('TikTok',x.url,x.name,observed)).filter(Boolean);
}
export function facebookPosts(rows,now){
 return rows.filter(p=>fresh(Date.parse(p.created_time),now,36)&&/^https:\/\/(?:www\.)?facebook\.com\/(?:[\w.-]+\/(?:posts|videos)\/[\w.-]+|reel\/\d+)\/?$/i.test(p.permalink_url))
  .map(p=>({post:p,engagement:(p.reactions?.summary?.total_count||0)+(p.comments?.summary?.total_count||0)+(p.shares?.count||0)}))
  .filter(p=>p.engagement>=100).sort((a,b)=>b.engagement-a.engagement)
  .map(({post})=>topic('Facebook',post.permalink_url,post.message,Date.parse(post.created_time))).filter(Boolean);
}
export async function vietnamTopics(now){
 const ids=(process.env.FACEBOOK_VN_PAGE_IDS||'').split(',').map(x=>x.trim()).filter(x=>/^\d+$/.test(x));
 const token=process.env.FACEBOOK_VN_ACCESS_TOKEN;
 async function get(url,headers=agent){
  const res=await fetch(url,{headers,signal:AbortSignal.timeout(25000)});
  if(!res.ok)throw Error('HTTP '+res.status);
  return res;
 }
 const jobs=[get(radar).then(r=>r.text()).then(s=>tiktokChart(s,now))];
 if(token)for(const id of new Set(ids)){
  const url=new URL('https://graph.facebook.com/v25.0/'+id+'/published_posts');
  url.searchParams.set('fields','message,created_time,permalink_url,shares,reactions.limit(0).summary(true),comments.limit(0).summary(true)');
  url.searchParams.set('limit','40');
  jobs.push(get(url,{...agent,Authorization:'Bearer '+token}).then(r=>r.json()).then(r=>facebookPosts(r.data,now)));
 }
 const results=await Promise.allSettled(jobs);
 if(!token||!ids.length)console.warn('Facebook: authorized Vietnam Page list or token absent');
 results.forEach((r,i)=>{if(r.status==='rejected')console.warn((i?'Facebook':'TikTok')+' fetch failed');});
 return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
}
