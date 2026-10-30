const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'index.html'),'utf8');
const start=src.indexOf('function vnDateToTimestamp('),end=src.indexOf('/* ════════ FIREBASE',start);
const funcs=src.slice(start,end)
 +src.slice(src.indexOf('function isExcludedFromRevenue('),src.indexOf('function renderRevenue(){'))
 +src.slice(src.indexOf('function parseStaffNames('),src.indexOf('function renderPoints(){'));
const state={weekStart:Date.UTC(2026,9,25,17),weekEnd:Date.UTC(2026,10,1,17),loungeTables:{},bunTables:{},showTables:{},loungeOrders:[],bunOrders:[],resOrders:[],loungeHistory:[],bunHistory:[],resHistory:[]};
const context={state,TOP_N:10,PRICE_LOUNGE_PAX:250000,PRICE_BUNGALOW:2000000,PRICE_SHOW_BGL:2000000,PRICE_SHOW_VPS:1390000,PRICE_SHOW_BARVIEW:790000,EXCLUDE_PAYMENTS:['FOC','TA_UNPAID','KTOUR'],Date,Intl,Set,Object,Math,Number,String,console};vm.createContext(context);vm.runInContext(funcs,context);
test('new and old archived Lounge work orders count using existing formula',()=>{
 state.loungeOrders=[{status:'completed',completedAt:Date.UTC(2026,9,27),preparedBy:'A',completedBy:'A'}];
 state.loungeHistory=[{date:'2026-10-27',orders:[{status:'completed',completedTime:'12:30',preparedBy:'B',completedBy:'C'}]}];
 const rows=context.calcPoints();const points=Object.fromEntries(rows.map(x=>[x.name,x.points]));
 assert.equal(points.A,.25);assert.equal(points.B,.1);assert.equal(points.C,.25);
});
test('completedAt Firestore timestamp supported and out-of-week orders excluded',()=>{
 state.loungeOrders=[{status:'completed',completedAt:{seconds:Math.floor(Date.UTC(2026,9,28)/1000)},completedBy:'X'}, {status:'completed',completedAt:Date.UTC(2026,9,1),completedBy:'Y'}];state.loungeHistory=[];
 const p=context.calcPoints();assert.equal(p[0].name,'X');assert.equal(p.find(x=>x.name==='Y'),undefined);
});
test('missing date from active legacy Lounge order is not fabricated',()=>{
 state.loungeOrders=[{status:'completed',completedTime:'13:30',completedBy:'Legacy'}];state.loungeHistory=[];
 assert.equal(context.calcPoints().length,0);
});

test('Lounge and Bungalow/Restaurant use different scoring rules with shared names',()=>{
 state.loungeOrders=[
  {status:'completed',completedAt:Date.UTC(2026,9,27),preparedBy:'Lan',completedBy:'Lan'},
  {status:'completed',completedAt:Date.UTC(2026,9,27),preparedBy:'Minh',completedBy:'Lan'}
 ];
 state.bunOrders=[{status:'completed',completedAt:Date.UTC(2026,9,27),preparedBy:'Lan',completedBy:'Lan'}];
 state.resOrders=[{status:'completed',completedAt:Date.UTC(2026,9,27),preparedBy:'Nam',completedBy:'Lan'}];
 state.loungeHistory=[];
 const points=Object.fromEntries(context.calcPoints().map(x=>[x.name,x.points]));
 assert.equal(points.Lan,2.5); // .25 + .25 + 1 + 1
 assert.equal(points.Minh,.1);
 assert.equal(points.Nam,.5);
});
test('Lounge fractional points render with two decimals',()=>{
 const a=src.indexOf('function formatPoints('),b=src.indexOf('/* ════════ WEEK RANGE',a);
 vm.runInContext(src.slice(a,b),context);
 assert.equal(context.formatPoints(.25),'0,25');
 assert.equal(context.formatPoints(.1),'0,1');
});

test('sales merge case, spaces and equivalent Unicode names across outlets and archives',()=>{
 state.loungeTables={
  a:{openedByStaff:'Giang Đập Chai',pax:8},
  b:{openedByStaff:'  GIANG   ĐẬP CHAI  ',pax:4},
  other:{openedByStaff:'Giang Đẹp Chai',pax:1},
  excluded:{openedByStaff:'GIANG ĐẬP CHAI',pax:100,payment:'FOC'}
 };
 state.bunTables={a:{openedByStaff:'GIANG ĐẬP CHAI'.normalize('NFD')}};
 state.showTables={a:{seller:'giang đập chai',label:'VPS'}};
 state.loungeHistory=[{date:'2026-10-27',tables:{a:{openedByStaff:'Giang Đập Chai',pax:2}}}];
 state.bunHistory=[];
 const original=JSON.stringify(state);
 const rows=context.calcRevenue();
 assert.equal(rows.length,2);
 assert.equal(rows[0].name,'Giang Đập Chai');
 assert.equal(rows[0].rev,6890000);
 assert.equal(rows[0].cnt,5);
 assert.equal(rows[0].details.length,5);
 assert.equal(rows[1].name,'Giang Đẹp Chai');
 assert.equal(rows[1].rev,250000);
 assert.equal(JSON.stringify(state),original,'Source orders and names must remain untouched');
});

test('work merges casing across roles without counting one employee twice in an order',()=>{
 const completedAt=Date.UTC(2026,9,27);
 state.loungeOrders=[{status:'completed',completedAt,preparedBy:'GIANG  ĐẬP CHAI & Giang Đập Chai',completedBy:'giang đập chai'}];
 state.bunOrders=[{status:'completed',completedAt,preparedBy:'Giang Đập Chai',completedBy:'GIANG ĐẬP CHAI'}];
 state.resOrders=[];state.loungeHistory=[];state.bunHistory=[];state.resHistory=[];
 const rows=context.calcPoints();
 assert.equal(rows.length,1);
 assert.equal(rows[0].points,1.25);
 assert.equal(rows[0].both,2);
 assert.equal(rows[0].onlyComplete,0);
 assert.equal(rows[0].onlyPrepare,0);
});

