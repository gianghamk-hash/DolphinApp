'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('dolphin-show.html','utf8');
const start=html.indexOf("const SHOW_GROUPS = ");
const end=html.indexOf("/* ===== LAYOUT SHOW ===== */",start);
assert(start>=0&&end>start,'Combo definitions must be found');
const definition=html.slice(start,end);
const context={};
vm.runInNewContext(definition+'\nthis.COMBOS=COMBOS;this.SHOW_GROUPS=SHOW_GROUPS;',context);
const combos=context.COMBOS;
test('Existing three Daily Show combo IDs and prices remain stable',()=>{
  assert.deepEqual(['combo1','combo2','combo3'].map(id=>combos[id].price),['1390K','790K','2000K']);
  assert(['combo1','combo2','combo3'].every(id=>combos[id].group==='daily'));
  assert.equal(Object.values(combos).filter(x=>x.group==='daily').length,3);
});
test('Singer Show has three unique combo IDs and printed prices',()=>{
  assert.deepEqual(['singer1','singer2','singer3'].map(id=>combos[id].price),
    ['2.290.000 VND','2.290.000 VND','3.290.000 VND']);
  assert(['singer1','singer2','singer3'].every(id=>combos[id].group==='singer'));
  assert.equal(Object.keys(combos).length,6);
});
test('Singer Combo 1 has two fixed dishes and four cocktail/mocktail selections',()=>{
  const c=combos.singer1;
  assert.equal(c.maxDrinks,4);
  assert.equal(c.allowedDrinks.length,4);
  assert.deepEqual(Object.keys(c.fixedFoods),['HẠT ĐIỀU TẨM VỊ','PHÔ MAI SỢI']);
  assert.equal(c.guests,'2–4 người');
});
test('Singer Combo 2 includes exactly one De Bortoli wine bottle',()=>{
  const c=combos.singer2;
  assert.equal(c.maxDrinks,1);
  assert.equal(c.allowedDrinks.length,2);
  assert(c.allowedDrinks.every(name=>name.includes('DE BORTOLI')));
  assert.deepEqual(Object.keys(c.fixedFoods),['HẠT ĐIỀU TẨM VỊ','PHÔ MAI SỢI']);
});
test('Singer Combo 3 includes eight drinks, cashews, squid and cheese',()=>{
  const c=combos.singer3;
  assert.equal(c.maxDrinks,8);
  assert.deepEqual(Array.from(c.allowedDrinks),['COKE','I-ON WATER 300ML','BIA TIGER']);
  assert.deepEqual(Object.keys(c.fixedFoods),['HẠT ĐIỀU TẨM VỊ','MỰC KHÔ','PHÔ MAI SỢI']);
  assert.equal(c.guests,'6–8 người');
});
test('Show service stores package and same old combo ID; history remains compatible',()=>{
  assert.match(html,/combo:\s*currentCombo,\s*package:\s*comboGroup\(currentCombo\)/);
  assert.match(html,/const comboGroup = id => COMBOS\[id\]\?\.group \|\| 'daily'/);
  assert.match(html,/selected\.fixedFoods && drinkTotal!==selected\.maxDrinks/);
  assert.match(html,/service\.foods=\{\.\.\.selected\.fixedFoods\}/);
  assert.match(html,/const comboName = sv\.combo \? comboDisplay\(sv\.combo\) : '-'/);
  assert.match(html,/COL_LIVE = 'show_tables', COL_HISTORY = 'show_history'/);
});
test('Core Firebase order, booking and completion functions remain present',()=>{
  for(const value of ['window.saveBooking = async','window.confirmMove = async','window.saveService = async','window.updateShowServiceStatus=async','window.executeArchive = async','window.fetchHistory = async'])assert(html.includes(value),value);
  assert(html.includes("status:'pending'"));
  assert(html.includes("nextStatus==='preparing'"));
  assert(html.includes("nextStatus==='completed'"));
});

test('Daily Show lists explicit food choices and cannot save more than one dish',()=>{
  for(const id of ['combo1','combo2','combo3']){
    const c=combos[id];
    assert.equal(c.maxFoods,1);
    assert(c.allowedFoods.length>=2);
  }
  assert.match(html,/data-g="food_choice"/);
  assert.match(html,/selected\.allowedFoods\.includes\(choice\)/);
  assert.match(html,/service\.foods=\{\[choice\]:1\}/);
  assert.match(html,/Object\.keys\(service\.foods\)\.length>selected\.maxFoods/);
});
test('Fixed singer food is not an editable input and amounts are copied exactly',()=>{
  assert.match(html,/c\.fixedFoods\s*\?/);
  assert.match(html,/KHÔNG TÙY CHỌN, KHÔNG THÊM ĐĨA/);
  assert.match(html,/service\.foods=\{\.\.\.selected\.fixedFoods\}/);
});
test('Saving an existing older Daily Show SET preserves original dishes',()=>{
  assert.match(html,/option\.value='__legacy_set__'/);
  assert.match(html,/service\.foods=\{\.\.\.old\.foods\}/);
  assert.match(html,/old\.combo!==currentCombo/);
});
test('Reject invalid decimal and negative drink amounts before writing to Firestore',()=>{
  assert.match(html,/Number\.isSafeInteger\(Number\(i\.value\)\)/);
  assert.match(html,/Số đồ uống phải là số nguyên không âm/);
});
