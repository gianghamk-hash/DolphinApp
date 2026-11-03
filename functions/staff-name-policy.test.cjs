'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const policy=require('./staff-name-policy.cjs');
const registry={
 'DOL-0001':{employeeId:'DOL-0001',name:'Nguyễn Văn An',active:true,createdAt:100,registrationSource:'manager',xp:200000,levelPeak:11},
 'DOL-0002':{employeeId:'DOL-0002',name:'  NGUYỄN   VĂN AN  ',active:true,createdAt:200,registrationSource:'self',approved:true,xp:9000},
 'DOL-0003':{employeeId:'DOL-0003',name:'Mai',active:true,createdAt:300},
 'DOL-0004':{employeeId:'DOL-0004',name:'Trần Thị Lan',active:true,createdAt:400},
 'DOL-0005':{employeeId:'DOL-0005',name:'Trần Thị Lan',active:false,createdAt:500}
};
test('strict greater-than-six Unicode characters and normalization',()=>{
 assert.equal(policy.valid('abcdef'),false);
 assert.equal(policy.valid('abcdefg'),true);
 assert.equal(policy.valid('  Nguyễn Văn An '),true);
 assert.equal(policy.key('  NGUYỄN   VĂN AN  '),policy.key('Nguyễn Văn An'));
});
test('active duplicate check includes pending and approved names, excludes inactive records',()=>{
 assert.equal(policy.nameConflict(registry,'nguyễn văn an').employeeId,'DOL-0001');
 assert.equal(policy.nameConflict(registry,'Trần Thị Lan').employeeId,'DOL-0004');
 assert.equal(policy.nameConflict(registry,'Trần Thị Lan','DOL-0004').employeeId,'DOL-0005');
});
test('legacy remediation targets only short names and later duplicate accounts',()=>{
 assert.equal(policy.needsRename(registry,'DOL-0001'),false);
 assert.equal(policy.needsRename(registry,'DOL-0002'),true);
 assert.equal(policy.needsRename(registry,'DOL-0003'),true);
 assert.equal(policy.needsRename(registry,'DOL-0004'),false);
 assert.equal(policy.needsRename(registry,'DOL-0005'),false);
});
