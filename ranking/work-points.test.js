const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'ranking/index.html'),'utf8');
const start=src.indexOf('function vnDateToTimestamp('),end=src.indexOf('/* ════════ FIREBASE',start);
const funcs=src.slice(start,end)+src.slice(src.indexOf('function parseStaffNames('),src.indexOf('function renderPoints(){'));
const state={weekStart:Date.UTC(2026,9,25,17),weekEnd:Date.UTC(2026,10,1,17),loungeOrders:[],bunOrders:[],resOrders:[],loungeHistory:[],bunHistory:[],resHistory:[]};
const context={state,TOP_N:10,Date,Intl,Set,Object,Math,Number,String,console};vm.createContext(context);vm.runInContext(funcs,context);
test('new and old archived Lounge work orders count using existing formula',()=>{
 state.loungeOrders=[{status:'completed',completedAt:Date.UTC(2026,9,27),preparedBy:'A',completedBy:'A'}];
 state.loungeHistory=[{date:'2026-10-27',orders:[{status:'completed',completedTime:'12:30',preparedBy:'B',completedBy:'C'}]}];
 const rows=context.calcPoints();const points=Object.fromEntries(rows.map(x=>[x.name,x.points]));
 assert.equal(points.A,1);assert.equal(points.B,.5);assert.equal(points.C,1);
});
test('completedAt Firestore timestamp supported and out-of-week orders excluded',()=>{
 state.loungeOrders=[{status:'completed',completedAt:{seconds:Math.floor(Date.UTC(2026,9,28)/1000)},completedBy:'X'}, {status:'completed',completedAt:Date.UTC(2026,9,1),completedBy:'Y'}];state.loungeHistory=[];
 const p=context.calcPoints();assert.equal(p[0].name,'X');assert.equal(p.find(x=>x.name==='Y'),undefined);
});
test('missing date from active legacy Lounge order is not fabricated',()=>{
 state.loungeOrders=[{status:'completed',completedTime:'13:30',completedBy:'Legacy'}];state.loungeHistory=[];
 assert.equal(context.calcPoints().length,0);
});
