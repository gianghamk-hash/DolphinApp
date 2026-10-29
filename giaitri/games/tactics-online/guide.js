/* Dolphin Tactics start-screen handbook — catalog driven and read-only. */
(function(root){
'use strict';
const TOPICS=[
 ['gameplay','🎮','CƠ CHẾ CHƠI'],['controls','🕹️','NÚT ĐIỀU KHIỂN'],
 ['heroes','🦸','TƯỚNG & KỸ NĂNG'],['traits','✨','TỘC / HỆ'],
 ['economy','🪙','KINH TẾ & VÀNG'],['items','🛡️','TRANG BỊ'],
 ['tips','💡','MẸO CHƠI NHANH']
];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATS={attack:'Công',abilityPower:'Sức mạnh phép',armor:'Giáp',magicResist:'Kháng phép',hp:'HP',mana:'Mana',regen:'Hồi máu/giây',bonusMana:'Mana thêm',adjacentShield:'Khiên đồng minh',hpRatio:'% HP',trueDamageRatio:'Sát thương chuẩn',stackAttackSpeed:'Tốc độ đánh cộng dồn',cloneRatio:'Tạo phân thân',omnivamp:'Hút máu',critChance:'Tỉ lệ chí mạng',critDamage:'Sát thương chí mạng',doubleHitChance:'Tỉ lệ đánh đôi'};
const FRACTIONS=new Set(['hpRatio','trueDamageRatio','stackAttackSpeed','cloneRatio','omnivamp','critChance','critDamage','doubleHitChance']);
const EFFECTS={crit:'Tăng 25% tỉ lệ chí mạng và 40% sát thương chí mạng',lifesteal:'Hút máu 15% sát thương thực gây ra',apGrowth:'Thêm 8 AP sau mỗi lần tung chiêu (tối đa 250)',burn:'Đốt mục tiêu trong 3 giây; nguồn thiêu đốt không cộng dồn DPS',manaRegen:'Hồi 5 Mana mỗi giây',manaPulse:'Hồi 2 Mana mỗi giây',stat:'Cộng chỉ số'};
const ROLES={Tank:['🛡️','Đỡ Đòn'],Fighter:['⚔️','Đấu Sĩ'],Assassin:['🗡️','Sát Thủ'],Ranger:['🏹','Xạ Thủ'],Sorcerer:['🔮','Pháp Sư'],Support:['✚','Hỗ Trợ']};
const SIGNATURE_EFFECTS={shock:'Choáng',armorBreak:'Giảm Giáp',quickstep:'Tăng tốc đánh',renew:'Hồi máu',fortify:'Tạo khiên',ignite:'Thiêu đốt',siphon:'Hút máu',frost:'Làm chậm',empower:'Tăng ATK',sunder:'Giảm kháng phép',spark:'Hồi Mana',guard:'Bảo vệ'};
const TARGET_PATTERNS={focused:'1 mục tiêu',sweep:'tối đa 2 mục tiêu gần đích',chain:'tối đa 3 mục tiêu gần tướng',burst:'tối đa 2 mục tiêu HP thấp',arc:'tối đa 3 mục tiêu ưu tiên chiến thuật'};
const SKILLS={strike:'Tấn công cường hóa',dash:'Lướt tấn công',bolt:'Đạn năng lượng',heal:'Tự hồi HP',shield:'Tạo khiên bản thân',blast:'Nổ diện rộng',drain:'Gây sát thương và hút máu',stun:'Làm choáng mục tiêu',aoe:'Sát thương diện rộng',teamHeal:'Hồi HP tối đa 4 đồng minh trong phạm vi',teamShield:'Tạo khiên tối đa 4 đồng minh trong phạm vi',teamHaste:'Tăng tốc đánh tối đa 4 đồng minh trong phạm vi'};
const stat=(k,v)=>escape(STATS[k]||k)+' '+(v>=0?'+':'')+escape(FRACTIONS.has(k)?Math.round(v*100)+'%':v);
function section(title,body){return '<section class="guideSection"><h3>'+escape(title)+'</h3>'+body+'</section>';}
function paragraph(txt){return '<p>'+escape(txt)+'</p>';}
function list(items){return '<ul>'+items.map(v=>'<li>'+escape(v)+'</li>').join('')+'</ul>';}
function badge(text){return '<span class="guideBadge">'+escape(text)+'</span>';}
function createGuide(c){
 const heroById=Object.fromEntries(c.heroes.map(h=>[h.id,h]));
 const components=Object.fromEntries(c.components.map(x=>[x.id,x]));
 const fmt=(obj)=>Object.entries(obj||{}).filter(([,v])=>v!==0).map(([k,v])=>stat(k,v)).join(' · ');
 const traitName=k=>c.origins[k]?.label||k;
 function render(topic){
 if(topic==='gameplay')return section('Mục tiêu',list(['Thi đấu 4 người; bảo vệ HP và trở thành người sống sót cuối cùng.','Mua tướng từ Shop, sắp xếp tối đa số tướng theo cấp trên sân 8×4, 8 ô hàng chờ.','3 tướng cùng tên, cùng bậc sao ghép thành tướng cao hơn (tối đa 3 sao).','Đội hình có cùng Tộc/Hệ sẽ kích hoạt hiệu ứng cộng hưởng tại các mốc nhất định.']))+
 section('Vai trò tướng',list(Object.values(ROLES).map(([icon,name])=>icon+' '+name))+paragraph('Biểu tượng lấy theo vai trò hiện tại, không theo giá vàng hay Tộc. Xem Signature và thông số từng tướng tại mục Tướng & Kỹ năng.'))+
 section('Chu trình trận',list(['Chuẩn bị: 30 giây — mua/bán, bố trí và ghép trang bị.','Chiến đấu: 30 giây — tướng tự tấn công, tích Mana và tung kỹ năng.','Kết quả: 5 giây — xem thắng/thua, sát thương HP và chuỗi; sau đó bắt đầu vòng tiếp theo.','Các vòng đầu và mỗi vòng thứ 5 gặp quái PvE; thắng PvE có thể nhận thành phần trang bị.','36 tướng có kỹ năng chính và Signature riêng theo vai trò: Đỡ Đòn, Đấu Sĩ, Sát Thủ, Xạ Thủ, Pháp Sư và Hỗ Trợ.']));
 if(topic==='controls')return section('Các nút và thao tác',[
 ['OFFLINE / ONLINE','Offline: luyện tập với 3 AI. Online: tham gia phòng bốn nhân viên xác thực; thao tác và kết quả được xử lý ở server. Phải cấu hình Firebase và danh tính nhân viên trước khi chơi Online.'],
 ['🔄 Đổi Shop','Tốn 2 vàng để lấy 5 lựa chọn tướng mới.'],
 ['⭐ Mua XP','Tốn 4 vàng, nhận 4 XP; lên cấp để đặt nhiều tướng hơn (tối đa cấp 9).'],
 ['🔒 Khóa Shop','Giữ nguyên các lựa chọn shop qua vòng tiếp theo; mở khóa để shop tự đổi.'],
 ['SẴN SÀNG','Chốt bố trí; không đổi trang bị hoặc đội hình sau khi xác nhận.'],
 ['Chạm tướng','Xem giá, kỹ năng, tộc/hệ và chỉ số của tướng.'],
 ['Kéo/thả tướng','Đưa từ hàng chờ lên các ô sân, đổi vị trí hoặc đưa về hàng chờ.'],
 ['Bán tướng','Chọn tướng và xác nhận bán; trang bị được trả về kho.'],
 ['Kéo trang bị','Kéo từ khay trang bị lên tướng trên sân/hàng chờ; có hộp thoại khi ghép thành trang bị lớn.'],
 ['Tháo trang bị','Chọn tướng rồi nhấn Tháo trong phần thông tin; chỉ dùng lúc Chuẩn bị.'],
 ['Tộc/Hệ','Chạm biểu tượng tộc/hệ để xem số tướng cần thiết và hiệu ứng.'],
 ['Toàn màn hình / Âm thanh','Chuyển chế độ xem và bật/tắt âm thanh giao tranh.'],
 ['Phóng to/thu nhỏ','Chụm hai ngón tay trên bản đồ hoặc sử dụng nút điều khiển khi có.']
 ].map(([a,b])=>'<div class="guideRow"><strong>'+escape(a)+'</strong><p>'+escape(b)+'</p></div>').join(''));
 if(topic==='heroes')return section(c.heroes.length+' tướng • '+Object.keys(ROLES).length+' vai trò • Giá 1–5 vàng',
 '<div class="guideCards">'+c.heroes.slice().sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name)).map(h=>{
 const ab=h.ability||{},role=h.classes?.find(x=>ROLES[x]),roleInfo=ROLES[role]||['❔','Không xác định'],sig=ab.signature||null;const extra=ab.kind==='teamHaste'?' • '+Math.round((ab.power||0)*100)+'% trong '+((ab.durationMs||3500)/1000)+'s':ab.power?' • Sức mạnh '+ab.power:'';
 return '<article class="guideCard"><div class="guideCardHead"><strong>'+escape(roleInfo[0]+' '+h.name)+'</strong>'+badge(roleInfo[1]) + badge(h.cost+' vàng')+'</div><p>'+escape([...h.origins,...h.classes].map(traitName).join(' · '))+'</p><p><b>⚡ '+escape(ab.name||SKILLS[ab.kind]||'Kỹ năng')+'</b></p><p>'+escape(SKILLS[ab.kind]||ab.kind||'')+escape(extra)+'</p>'+(sig?'<p><b>✦ Kỹ năng đặc trưng:</b> '+escape(sig.name)+' — '+escape(SIGNATURE_EFFECTS[sig.effect]||sig.effect)+' · '+escape(TARGET_PATTERNS[sig.pattern]||sig.pattern)+' · Power '+escape(sig.power)+(sig.durationMs?' · '+escape((sig.durationMs/1000).toFixed(2))+'s':'')+'</p>':'')+'<p>HP '+escape(h.hp)+' · ATK '+escape(h.attack)+' · Giáp '+escape(h.armor)+' · Mana '+escape(h.manaStart)+'/'+escape(h.manaMax)+'</p></article>';
 }).join('')+'</div>');
 if(topic==='traits')return section('Tộc và Hệ đang có trong game',paragraph('Chỉ các tướng khác nhau được đặt trên sân mới tăng số lượng kích hoạt; xem các mốc thưởng dưới đây.')+
 '<div class="guideCards">'+Object.entries(c.origins).map(([k,def])=>'<article class="guideCard"><div class="guideCardHead"><strong>'+escape(def.label||k)+'</strong>'+badge(def.type==='origin'?'Tộc':'Hệ')+'</div><p>'+Object.entries(def.thresholds||{}).map(([n,bonus])=>'<b>'+escape(n)+' tướng:</b> '+fmt(bonus)).join('<br>')+'</p><p><b>Tướng:</b> '+escape(c.heroes.filter(h=>[...h.origins,...h.classes].includes(k)).map(h=>h.name).join(', '))+'</p></article>').join('')+'</div>');
 if(topic==='economy')return section('Thu nhập đầu vòng',list(['Đầu mỗi vòng Chuẩn bị sau vòng đầu: +5 vàng cơ bản.','Lãi: +1 vàng cho mỗi 10 vàng đang giữ, tối đa +5 vàng.','Chuỗi thắng/thua liên tục 2–3 vòng: +1 vàng; 4 vòng: +2; từ 5 vòng: +3.','Giới hạn vàng trong ví: 80.']) )+
 section('Chi phí và tích lũy',list(['Tướng Shop có giá 1–5 vàng theo bậc tướng.','Mỗi vòng mới sau khi hoàn tất giao tranh: tự nhận 2 XP (nếu chưa đạt cấp tối đa). Đổi Shop: 2 vàng. Mua 4 XP: 4 vàng.','Bán tướng: hoàn giá gốc nhân 1, 3 hoặc 9 theo sao 1★, 2★, 3★.','Tướng trong bể chung có số bản sao hữu hạn; đối thủ mua cùng tướng sẽ làm giảm số còn lại.']))+
 section('Mẹo kinh tế',paragraph('Giữ các mốc 10/20/30/40/50 vàng để tích lãi khi không cần chi tiêu khẩn cấp; nếu HP thấp, cân nhắc lên cấp hoặc đổi Shop để giữ đội hình.'));
 if(topic==='items')return section('6 thành phần trang bị','<div class="guideCards">'+c.components.map(it=>'<article class="guideCard guideItem">'+badge(it.name)+'<p>'+fmt({[it.stat]:it.value})+'</p></article>').join('')+'</div>')+
 section('21 trang bị hoàn chỉnh','<div class="guideCards">'+c.recipes.map(it=>'<article class="guideCard guideItem"><div class="guideCardHead"><strong>'+escape(it.name)+'</strong>'+badge(it.id)+'</div><p><b>Ghép:</b> '+escape((it.components||[]).map(id=>components[id]?.name||id).join(' + '))+'</p><p>'+fmt(it.bonus)+'</p><p>'+escape(it.description||EFFECTS[it.effect]||'Cộng chỉ số')+'</p></article>').join('')+'</div>')+
 section('Quy tắc trang bị',list(['Mỗi tướng có tối đa 3 ô trang bị; ghép hai thành phần phù hợp chiếm một ô.','Chỉ kéo, ghép, tháo trang bị trong giai đoạn Chuẩn bị, trước khi Sẵn sàng.','Bán tướng trả lại trang bị vào kho; hợp nhất tướng ưu tiên giữ trang bị hoàn chỉnh.']));
 if(topic==='tips')return section('Khởi đầu',list(['Mua các tướng phù hợp hệ dễ kích hoạt và dùng đủ số ô triển khai.','Đặt Đỡ Đòn/Đấu Sĩ phía trước (tầm đánh thường 1 ô), Xạ Thủ/Pháp Sư phía sau (tầm đánh thường 3 ô); kỹ năng có phạm vi riêng.','Không tiêu hết vàng vào Shop nếu chưa thực sự cần nâng cấp.']))+
 section('Giữa và cuối trận',list(['Chú ý những tướng bị tranh mua trong bể chung; có thể đổi sang đội hình ít cạnh tranh hơn.','Trang bị nên được ghép cho chủ lực sát thương hoặc tướng chống chịu phù hợp.','Hỗ Trợ nên đứng gần đồng minh cần hồi máu, khiên hoặc tốc độ đánh để kỹ năng tác động đúng phạm vi.','Khi thua liên tiếp, cân nhắc đổi Shop/mua XP để bảo toàn HP; khi thắng có thể tích vàng và tận dụng thưởng chuỗi.']));
 return paragraph('Chưa có nội dung cho mục này.');
 }
 return {topics:TOPICS,render,escape};
}
root.DolphinTacticsGuide=createGuide;
if(typeof module!=='undefined'&&module.exports)module.exports=createGuide;
})(typeof window!=='undefined'?window:globalThis);
