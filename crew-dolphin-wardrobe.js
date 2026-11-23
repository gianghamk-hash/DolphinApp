(function(root){
 'use strict';
 // Gregorian month/day for Tết and Trung Thu, calculated from the Vietnamese lunar calendar (UTC+7).
 const festivals=[[125,1001],[212,921],[201,910],[122,929],[210,917],[129,1006],[217,925],[206,915],[126,1003],[213,922],[202,912],[123,1001],[211,919],[131,908],[219,926],[208,916],[128,1004],[215,924],[204,913],[124,1002],[212,920],[201,909],[122,928],[210,917],[130,1005],[217,925],[206,915],[126,1004],[214,922],[202,911],[123,930],[211,919],[201,907],[218,926],[208,916],[128,1005],[215,924],[204,913],[124,1002],[212,921],[202,909],[121,928],[209,917],[129,1006],[217,925],[205,914],[126,1003],[214,923],[203,911],[123,929],[211,919],[131,908],[219,926],[207,916],[127,1005],[215,924],[205,912],[124,1001],[212,920],[202,910],[122,927],[209,917],[129,1006],[217,926],[206,914],[126,1003],[214,922],[203,911],[124,929],[210,918],[130,908],[218,927],[207,916],[127,1005],[215,924],[205,913],[125,930],[212,920],[201,909],[121,928],[209,918]];
 const looks={
  tet:['Áo gấm mai vàng','flower','#c52b37','#ffd273','flower'],
  valentine:['Nơ hồng san hô','bow','#db5080','#ffe1ce','ribbon'],
  womenday:['Vòng hoa mẫu đơn','flower','#ce67ae','#fff2ae','flower'],
  reunification:['Huy hiệu tháng Tư','medal','#b92737','#ffdb69','star'],
  children:['Nơ kẹo bạc hà','bow','#74dbc5','#ffd687','ribbon'],
  nationalday:['Huy chương sao vàng','medal','#c62e40','#ffdd62','star'],
  midautumn:['Gấm trăng rằm','medal','#e99a42','#fff1a1','star'],
  halloween:['Mũ pháp sư tí hon','hat','#70529b','#efa255','hat'],
  christmas:['Mũ len Noel','cap','#c13d41','#fff2da','scarf'],
  newyear:['Nơ giao thừa','bow','#315485','#ffcf6e','ribbon'],
  winter:['Khăn len biển đông','scarf','#3789ad','#cceef7','scarf'],
  spring:['Hoa đầu mùa','flower','#e7a6b6','#fff6bc','flower'],
  summer:['Nơ thủy thủ','bow','#2489a7','#e5f6f4','ribbon'],
  autumn:['Khăn màu hổ phách','scarf','#b9773d','#ffe1a1','scarf']
 };
 function select(now=new Date(),theme=''){
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const [y,m,d]=day.split('-').map(Number),md=m*100+d,dates=festivals[y-2020];
  function near(code,before,after){
   const days=(Date.UTC(y,m-1,d)-Date.UTC(y,Math.floor(code/100)-1,code%100))/86400000;
   return days>=-before&&days<=after;
  }
  let key=Object.hasOwn(looks,theme)?theme:null;
  if(!key){
   if(dates&&near(dates[0],3,6))key='tet';
   else if(dates&&near(dates[1],3,1))key='midautumn';
   else if(md>=1220&&md<=1226)key='christmas';
   else if(md>=1230||md<=102)key='newyear';
   else if(md>=1027&&md<=1031)key='halloween';
   else if(md>=212&&md<=214)key='valentine';
   else if(md===308||md===1020)key='womenday';
   else if(md===430||md===501)key='reunification';
   else if(md===601)key='children';
   else if(md===902)key='nationalday';
   else key=m<=2||m>=12?'winter':m<=5?'spring':m<=8?'summer':'autumn';
  }
  const [name,part,color,trim,icon]=looks[key];return {key,name,part,color,trim,icon};
 }
 root.DolphinWardrobe={select};
 if(typeof module==='object'&&module.exports)module.exports=root.DolphinWardrobe;
})(globalThis);
