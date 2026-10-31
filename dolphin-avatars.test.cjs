'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createResolver,nameKey,avatarHTML}=require('./dolphin-avatars');
test('all screens resolve one avatar across case, spacing, historical names and Staff ID',()=>{
 const r=createResolver();r.replace([{employeeId:'DOL-0001',name:'Giang Đập Chai',avatar:'🤠',nameAliases:['Tên cũ']}]);
 for(const name of ['GIANG ĐẬP CHAI','  Giang   Đập Chai ','Tên cũ'])assert.equal(r.resolve(name).avatar,'🤠');
 assert.equal(r.resolve('Different display name','DOL-0001').avatar,'🤠');
 r.upsert({employeeId:'DOL-0001',name:'Giang mới',avatar:'🐯'});
 assert.equal(r.resolve('Giang Đập Chai').avatar,'🐯');assert.equal(r.resolve('Giang mới').avatar,'🐯');
 assert.equal(nameKey(' GIANG  ĐẬP CHAI '),'giang đập chai');
});
test('people with the same name stay distinct; unknown IDs never borrow another employee avatar',()=>{
 const r=createResolver();r.replace([{employeeId:'A',name:'Lan',avatar:'🐬'},{employeeId:'B',name:'Lan',avatar:'🐯'}]);
 assert.equal(r.resolve('Lan'),null);assert.equal(r.resolve('Lan','A').avatar,'🐬');
 assert.equal(r.resolve('Lan','B').avatar,'🐯');assert.equal(r.resolve('Lan','UNKNOWN'),null);
});
test('avatar HTML safely escapes names, IDs and display content',()=>{
 const html=avatarHTML('<img onerror="x">','"bad','<script>');
 assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&quot;bad'));
});
test('all requested app surfaces load the shared renderer and carry staff-avatar markers',()=>{
 for(const file of ['dolphin-bungalow.html','dolphin-lounge.html','dolphin-show.html','dolphin-restaurant.html','ranking/index.html','giaitri/index.html']){
  const source=fs.readFileSync(__dirname+'/'+file,'utf8');assert.ok(source.includes('dolphin-avatars.js'),file);assert.ok(source.includes('data-staff-avatar'),file);
 }
 const profile=fs.readFileSync(__dirname+'/dolphin-profile.html','utf8');assert.ok(!profile.includes('id="department"'));
 assert.ok(profile.includes('id="claim-code"'));assert.ok(!profile.includes('<details id="claim-section"'));
});
