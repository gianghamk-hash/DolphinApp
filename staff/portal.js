import{initializeApp}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import{getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import{getFunctions,httpsCallable}from'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js';
const app=initializeApp({apiKey:'AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ',authDomain:'dolphin-f6d67.firebaseapp.com',projectId:'dolphin-f6d67'});
const auth=getAuth(app),functions=getFunctions(app,'asia-southeast1');
const api=name=>httpsCallable(functions,name),el=id=>document.getElementById(id),status=x=>el('status').textContent=x;
const safe=x=>String(x||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadStaff(){const rows=(await api('staffAdminList')()).data.staff;el('staff').innerHTML=rows.map(x=>'<p><b>'+safe(x.staffId)+'</b> '+safe(x.displayName)+' · '+safe(x.department)+' · '+safe(x.status)+'</p>').join('');}
el('signin').onclick=async()=>{try{await signInWithEmailAndPassword(auth,el('email').value.trim(),el('pass').value);status('Đăng nhập thành công');}catch(e){status('Đăng nhập thất bại: '+e.code);}};
el('signout').onclick=()=>signOut(auth);
onAuthStateChanged(auth,async user=>{el('login').classList.toggle('hide',!!user);el('profile').classList.toggle('hide',!user);el('admin').classList.add('hide');if(!user)return;
try{const data=(await api('staffMyIdentity')()).data;el('profileInfo').textContent=data.linked?data.staffId+' · '+data.displayName:'Chưa liên kết ID cố định';
const claims=(await user.getIdTokenResult(true)).claims;if(claims.staffAdmin===true){el('admin').classList.remove('hide');await loadStaff();}}catch(e){status(e.code||'Không tải được hồ sơ');}});
el('form').onsubmit=async e=>{e.preventDefault();try{const values=Object.fromEntries(new FormData(e.target));const v=(await api('staffAdminCreate')(values)).data;el('credentials').textContent='ID: '+v.staffId+'\nMật khẩu tạm (chỉ hiển thị lần này): '+v.temporaryPassword;e.target.reset();await loadStaff();}catch(err){status(err.code||'Không cấp được ID');}};
