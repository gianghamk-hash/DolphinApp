/* ============================================================
   🎨 THEME SYSTEM v2 — 15 chủ đề sự kiện + 4 mùa
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var THEMES = {
    default:      { name: 'Dolphin (Mặc định)', icon: '🐬', ranges: null, badge: 'DOLPHIN' },
    tet:          { name: 'Tết Nguyên Đán',     icon: '🌸', ranges: [[1,15],[2,20]], badge: 'TẾT' },
    valentine:    { name: 'Valentine',          icon: '💖', ranges: [[2,10],[2,15]], badge: 'VALENTINE' },
    womenday:     { name: 'Quốc Tế Phụ Nữ',     icon: '🌹', ranges: [[3,5],[3,10]], badge: '8/3' },
    reunification:{ name: '30/4 Thống Nhất',    icon: '🇻🇳', ranges: [[4,28],[5,3]], badge: '30/4' },
    children:     { name: 'Tết Thiếu Nhi',      icon: '🎈', ranges: [[5,25],[6,5]], badge: '1/6' },
    nationalday:  { name: 'Quốc Khánh',         icon: '🇻🇳', ranges: [[8,30],[9,3]], badge: '2/9' },
    midautumn:    { name: 'Trung Thu',          icon: '🏮', ranges: [[9,10],[10,5]], badge: 'TRUNG THU' },
    halloween:    { name: 'Halloween',          icon: '🎃', ranges: [[10,25],[11,1]], badge: 'HALLOWEEN' },
    christmas:    { name: 'Giáng Sinh',         icon: '🎄', ranges: [[12,15],[12,26]], badge: 'NOEL' },
    newyear:      { name: 'Tết Dương Lịch',     icon: '🎊', ranges: [[12,29],[1,2]], badge: 'NEW YEAR' },
    spring:       { name: 'Mùa Xuân',           icon: '🌸', months: [3,4,5], badge: 'SPRING' },
    summer:       { name: 'Mùa Hè',             icon: '☀️', months: [6,7,8], badge: 'SUMMER' },
    autumn:       { name: 'Mùa Thu',            icon: '🍂', months: [9,10,11], badge: 'AUTUMN' },
    winter:       { name: 'Mùa Đông',           icon: '❄️', months: [12,1,2], badge: 'WINTER' }
  };

  function getVNDate(){
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var o = {};
    parts.forEach(function(p){ if (p.type !== 'literal') o[p.type] = p.value; });
    return { year: parseInt(o.year), month: parseInt(o.month), day: parseInt(o.day) };
  }

  function isInRange(m, d, ranges){
    if (!ranges) return false;
    for (var i = 0; i < ranges.length; i++){
      var r = ranges[i];
      var start = r[0][0] * 100 + r[0][1];
      var end = r[1][0] * 100 + r[1][1];
      var curr = m * 100 + d;
      // Xử lý trường hợp qua năm (VD: 29/12 → 2/1)
      if (end < start){
        if (curr >= start || curr <= end) return true;
      } else {
        if (curr >= start && curr <= end) return true;
      }
    }
    return false;
  }

  function detectThemeByDate(){
    var vn = getVNDate();
    // Ưu tiên: Lễ trước, mùa sau
    var holidayOrder = ['tet','valentine','womenday','reunification','children','nationalday','midautumn','halloween','christmas','newyear'];
    for (var i = 0; i < holidayOrder.length; i++){
      var key = holidayOrder[i];
      if (isInRange(vn.month, vn.day, THEMES[key].ranges)) return key;
    }
    // Mùa
    var seasonOrder = ['spring','summer','autumn','winter'];
    for (var j = 0; j < seasonOrder.length; j++){
      var sk = seasonOrder[j];
      if (THEMES[sk].months && THEMES[sk].months.indexOf(vn.month) >= 0) return sk;
    }
    return 'default';
  }

  // ═══════ CSS ═══════
  function injectStyles(){
    if (document.getElementById('theme-styles')) return;
    var s = document.createElement('style');
    s.id = 'theme-styles';
    s.textContent = `
      #theme-overlay{position:fixed;inset:0;pointer-events:none;z-index:1;overflow:hidden}

      /* ═══ COMMON ANIMATIONS ═══ */
      .th-fall{position:absolute;will-change:transform;animation:th-fall-anim linear infinite}
      @keyframes th-fall-anim{
        0%{transform:translateY(-10vh) rotate(0deg);opacity:0}
        10%{opacity:1}
        90%{opacity:1}
        100%{transform:translateY(110vh) rotate(720deg);opacity:0}
      }
      .th-float{position:absolute;will-change:transform;animation:th-float-anim 4s ease-in-out infinite}
      @keyframes th-float-anim{
        0%,100%{transform:translateY(0) rotate(-3deg)}
        50%{transform:translateY(-15px) rotate(3deg)}
      }
      .th-shine{position:absolute;will-change:transform;animation:th-shine-anim 3s ease-in-out infinite;filter:drop-shadow(0 0 15px currentColor)}
      @keyframes th-shine-anim{
        0%,100%{opacity:.3;transform:scale(.8) rotate(0deg)}
        50%{opacity:1;transform:scale(1.3) rotate(180deg)}
      }
      .th-fly{position:absolute;will-change:transform}
      @keyframes th-fly-anim{
        0%{transform:translateX(-15vw)}
        100%{transform:translateX(115vw)}
      }
      .th-pop{position:absolute;animation:th-pop-anim 2s ease-out}
      @keyframes th-pop-anim{
        0%{transform:scale(0);opacity:0}
        20%{transform:scale(1.5);opacity:1}
        80%{transform:scale(1.8);opacity:.8}
        100%{transform:scale(2.2);opacity:0}
      }

      /* ═══ TẾT ═══ */
      body.theme-tet{background:#3a1515!important}
      body.theme-tet .halong-bg{filter:saturate(1.3) hue-rotate(-15deg) brightness(.85)}
      body.theme-tet .brand-title{background:linear-gradient(180deg,#FFD700 0%,#FF6B35 50%,#D42A2A 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-tet .area-card{border-color:rgba(255,215,0,.6)!important}
      body.theme-tet #announcementBar{border-color:#FFD700!important;background:linear-gradient(135deg,#8B1A1A,#5a0f0f)!important}

      /* ═══ VALENTINE ═══ */
      body.theme-valentine{background:#2a0a1a!important}
      body.theme-valentine .halong-bg{filter:saturate(1.2) hue-rotate(-30deg) brightness(.9)}
      body.theme-valentine .brand-title{background:linear-gradient(180deg,#FFB6C1 0%,#FF4D6D 50%,#C9184A 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-valentine .area-card{border-color:rgba(255,77,109,.6)!important;background:rgba(42,10,26,.85)!important}
      body.theme-valentine #announcementBar{border-color:#FF4D6D!important;background:linear-gradient(135deg,#7a1030,#40081a)!important}
      body.theme-valentine::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;
        background:radial-gradient(circle at 50% 50%,rgba(255,77,109,.12),transparent 60%)}

      /* ═══ PHỤ NỮ 8/3 ═══ */
      body.theme-womenday{background:#2a1030!important}
      body.theme-womenday .halong-bg{filter:saturate(1.15) hue-rotate(280deg) brightness(.9)}
      body.theme-womenday .brand-title{background:linear-gradient(180deg,#FFC0CB 0%,#D946A6 50%,#8B1A8B 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-womenday .area-card{border-color:rgba(217,70,166,.6)!important;background:rgba(42,16,48,.85)!important}
      body.theme-womenday #announcementBar{border-color:#D946A6!important;background:linear-gradient(135deg,#5a105a,#2a082a)!important}

      /* ═══ 30/4 THỐNG NHẤT ═══ */
      body.theme-reunification{background:#1a0808!important}
      body.theme-reunification .halong-bg{filter:saturate(1.4) hue-rotate(-20deg) brightness(.85)}
      body.theme-reunification .brand-title{background:linear-gradient(180deg,#FFD700 0%,#DA251D 50%,#8b0000 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 25px rgba(218,37,29,.8))}
      body.theme-reunification .area-card{border-color:rgba(255,215,0,.7)!important;background:rgba(30,8,8,.88)!important}
      body.theme-reunification #announcementBar{border-color:#DA251D!important;background:linear-gradient(135deg,#DA251D,#8b0000)!important}
      body.theme-reunification::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;
        background:linear-gradient(180deg,rgba(218,37,29,.12) 0%,transparent 40%,rgba(218,37,29,.08) 100%)}

      /* ═══ THIẾU NHI 1/6 ═══ */
      body.theme-children{background:#0e1e3a!important}
      body.theme-children .halong-bg{filter:saturate(1.5) brightness(1.05)}
      body.theme-children .brand-title{background:linear-gradient(180deg,#FFD700 0%,#FF6B35 40%,#4ECDC4 80%,#FF6B9D 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-children .area-card{border-color:rgba(255,107,157,.6)!important;background:rgba(14,30,58,.85)!important}
      body.theme-children #announcementBar{border-color:#4ECDC4!important;background:linear-gradient(135deg,#1a3a6a,#0a1a3a)!important}

      /* ═══ QUỐC KHÁNH 2/9 ═══ */
      body.theme-nationalday{background:#1a0a0a!important}
      body.theme-nationalday .halong-bg{filter:saturate(1.4) hue-rotate(-20deg) brightness(.85)}
      body.theme-nationalday .brand-title{background:linear-gradient(180deg,#FFD700 0%,#DA251D 50%,#8b0000 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 25px rgba(218,37,29,.8))}
      body.theme-nationalday .area-card{border-color:rgba(255,215,0,.7)!important;background:rgba(30,10,10,.85)!important;box-shadow:0 0 30px rgba(218,37,29,.35)}
      body.theme-nationalday #announcementBar{border-color:#DA251D!important;background:linear-gradient(135deg,#DA251D,#8b0000)!important}
      body.theme-nationalday::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;
        background:linear-gradient(180deg,rgba(218,37,29,.15) 0%,transparent 40%,rgba(218,37,29,.1) 100%)}

      /* ═══ TRUNG THU ═══ */
      body.theme-midautumn{background:#1a0e2a!important}
      body.theme-midautumn .halong-bg{filter:saturate(1.2) hue-rotate(30deg) brightness(.75)}
      body.theme-midautumn .brand-title{background:linear-gradient(180deg,#ffe8a0 0%,#f0c060 50%,#c98a20 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-midautumn .area-card{border-color:rgba(255,150,50,.6)!important;background:rgba(26,14,42,.85)!important}
      body.theme-midautumn #announcementBar{border-color:#ffb366!important;background:linear-gradient(135deg,#5a1a3a,#3a0e2a)!important}

      /* ═══ HALLOWEEN ═══ */
      body.theme-halloween{background:#0a0510!important}
      body.theme-halloween .halong-bg{filter:saturate(.5) hue-rotate(270deg) brightness(.4)}
      body.theme-halloween::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:1;
        background:radial-gradient(ellipse at 50% 80%,rgba(150,50,200,.15),transparent 60%),radial-gradient(circle at 50% 50%,transparent 30%,rgba(0,0,0,.5) 90%)}
      body.theme-halloween .brand-title{background:linear-gradient(180deg,#ff9500 0%,#c45600 50%,#8b0000 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 20px rgba(255,140,0,.8))}
      body.theme-halloween .area-card{border-color:rgba(255,140,0,.5)!important;background:rgba(15,5,25,.9)!important;box-shadow:0 0 30px rgba(150,50,200,.3)}
      body.theme-halloween #announcementBar{border-color:#ff9500!important;background:linear-gradient(135deg,#2a0a3a,#1a0520)!important}

      /* ═══ GIÁNG SINH ═══ */
      body.theme-christmas{background:#0a1a2e!important}
      body.theme-christmas .halong-bg{filter:saturate(.7) brightness(.9) hue-rotate(180deg)}
      body.theme-christmas .brand-title{background:linear-gradient(180deg,#fff 0%,#c41e3a 50%,#0a7d3d 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-christmas .area-card{border-color:rgba(220,20,60,.6)!important;background:rgba(10,26,46,.85)!important}
      body.theme-christmas #announcementBar{border-color:#c41e3a!important;background:linear-gradient(135deg,#0a7d3d,#0a4a2a)!important}

      /* ═══ TẾT DƯƠNG LỊCH ═══ */
      body.theme-newyear{background:#0a0a1a!important}
      body.theme-newyear .halong-bg{filter:saturate(1.2) brightness(.85)}
      body.theme-newyear .brand-title{background:linear-gradient(180deg,#FFD700 0%,#FF1493 50%,#8B00FF 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 25px rgba(255,215,0,.7))}
      body.theme-newyear .area-card{border-color:rgba(255,215,0,.6)!important;background:rgba(10,10,26,.9)!important;box-shadow:0 0 30px rgba(139,0,255,.3)}
      body.theme-newyear #announcementBar{border-color:#FFD700!important;background:linear-gradient(135deg,#1a0a4a,#0a0520)!important}

      /* ═══ MÙA XUÂN ═══ */
      body.theme-spring{background:#1a2a1a!important}
      body.theme-spring .halong-bg{filter:saturate(1.3) hue-rotate(30deg) brightness(1.05)}
      body.theme-spring .brand-title{background:linear-gradient(180deg,#FFB6C1 0%,#FF6B9D 50%,#4ECDC4 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-spring .area-card{border-color:rgba(255,182,193,.6)!important;background:rgba(26,42,26,.85)!important}
      body.theme-spring #announcementBar{border-color:#FF6B9D!important;background:linear-gradient(135deg,#2a5a2a,#0a2a0a)!important}

      /* ═══ MÙA HÈ ═══ */
      body.theme-summer{background:#0a1a3a!important}
      body.theme-summer .halong-bg{filter:saturate(1.4) brightness(1.1)}
      body.theme-summer .brand-title{background:linear-gradient(180deg,#FFE066 0%,#FFB000 50%,#FF6B35 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 20px rgba(255,200,50,.7))}
      body.theme-summer .area-card{border-color:rgba(255,200,50,.7)!important;background:rgba(10,26,58,.85)!important}
      body.theme-summer #announcementBar{border-color:#FFB000!important;background:linear-gradient(135deg,#1a4a8a,#0a2a5a)!important}

      /* ═══ MÙA THU ═══ */
      body.theme-autumn{background:#2a1505!important}
      body.theme-autumn .halong-bg{filter:saturate(1.2) hue-rotate(-25deg) brightness(.9)}
      body.theme-autumn .brand-title{background:linear-gradient(180deg,#FFB347 0%,#D2691E 50%,#8B4513 100%);-webkit-background-clip:text;background-clip:text}
      body.theme-autumn .area-card{border-color:rgba(255,179,71,.6)!important;background:rgba(42,21,5,.85)!important}
      body.theme-autumn #announcementBar{border-color:#FFB347!important;background:linear-gradient(135deg,#5a3010,#2a1505)!important}

      /* ═══ MÙA ĐÔNG ═══ */
      body.theme-winter{background:#0a1428!important}
      body.theme-winter .halong-bg{filter:saturate(.7) brightness(.85) hue-rotate(180deg)}
      body.theme-winter .brand-title{background:linear-gradient(180deg,#FFFFFF 0%,#B8D8F0 50%,#4A8ACC 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 20px rgba(184,216,240,.7))}
      body.theme-winter .area-card{border-color:rgba(184,216,240,.6)!important;background:rgba(10,20,40,.9)!important}
      body.theme-winter #announcementBar{border-color:#B8D8F0!important;background:linear-gradient(135deg,#1a3060,#0a1428)!important}

      /* ═══ BADGE ═══ */
      #themeBadge{position:fixed;top:8px;left:8px;z-index:9998;
        display:flex;align-items:center;gap:6px;padding:6px 12px;
        background:rgba(10,31,29,.9);border:1px solid rgba(244,184,66,.5);
        border-radius:999px;font-size:11px;font-weight:900;color:#FBD77A;
        font-family:'Nunito',sans-serif;backdrop-filter:blur(10px);
        pointer-events:none;opacity:0;transition:opacity .5s}
      #themeBadge.show{opacity:1}
      #themeBadge .tb-icon{font-size:14px}
      @media(max-width:768px){
        #themeBadge{font-size:9.5px;padding:4px 9px;top:6px;left:6px}
        #themeBadge .tb-icon{font-size:12px}
      }
    `;
    document.head.appendChild(s);
  }

  function clearOverlay(){
    var o = document.getElementById('theme-overlay');
    if (o) o.innerHTML = '';
    var body = document.body.className;
    body.split(' ').forEach(function(c){
      if (c.indexOf('theme-') === 0) document.body.classList.remove(c);
    });
  }

  function ensureOverlay(){
    var o = document.getElementById('theme-overlay');
    if (!o){
      o = document.createElement('div');
      o.id = 'theme-overlay';
      document.body.appendChild(o);
    }
    return o;
  }

  function showBadge(theme){
    var b = document.getElementById('themeBadge');
    if (!b){
      b = document.createElement('div');
      b.id = 'themeBadge';
      document.body.appendChild(b);
    }
    if (!theme || theme === 'default'){
      b.classList.remove('show');
      return;
    }
    var t = THEMES[theme];
    b.innerHTML = '<span class="tb-icon">' + t.icon + '</span><span>' + t.badge + '</span>';
    b.classList.add('show');
  }

  // ═══════ APPLY FUNCTIONS ═══════
  function addFalling(o, emojis, count, minSize, maxSize, minDur, maxDur){
    for (var i = 0; i < count; i++){
      var el = document.createElement('div');
      el.className = 'th-fall';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = (Math.random() * 100) + '%';
      el.style.animationDuration = (minDur + Math.random() * (maxDur - minDur)) + 's';
      el.style.animationDelay = (-Math.random() * 15) + 's';
      el.style.fontSize = (minSize + Math.random() * (maxSize - minSize)) + 'px';
      o.appendChild(el);
    }
  }

  function addShine(o, emoji, count, minSize, maxSize, color){
    for (var i = 0; i < count; i++){
      var s = document.createElement('div');
      s.className = 'th-shine';
      s.textContent = emoji;
      s.style.color = color || '#FFD700';
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      s.style.fontSize = (minSize + Math.random() * (maxSize - minSize)) + 'px';
      s.style.animationDelay = (-Math.random() * 3) + 's';
      s.style.animationDuration = (2 + Math.random() * 2) + 's';
      o.appendChild(s);
    }
  }

  function addFloat(o, emojis, count, minSize, maxSize){
    for (var i = 0; i < count; i++){
      var el = document.createElement('div');
      el.className = 'th-float';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = (5 + Math.random() * 90) + '%';
      el.style.top = (10 + Math.random() * 70) + '%';
      el.style.fontSize = (minSize + Math.random() * (maxSize - minSize)) + 'px';
      el.style.animationDelay = (-Math.random() * 4) + 's';
      o.appendChild(el);
    }
  }

  function addFly(o, emoji, count, minSize, maxSize, minDur, maxDur, topMin, topMax){
    for (var i = 0; i < count; i++){
      var el = document.createElement('div');
      el.className = 'th-fly';
      el.textContent = emoji;
      el.style.top = (topMin + Math.random() * (topMax - topMin)) + '%';
      el.style.fontSize = (minSize + Math.random() * (maxSize - minSize)) + 'px';
      el.style.animation = 'th-fly-anim ' + (minDur + Math.random() * (maxDur - minDur)) + 's linear infinite';
      el.style.animationDelay = (-Math.random() * 15) + 's';
      o.appendChild(el);
    }
  }

  function addIntervalPop(o, emojis, interval){
    setInterval(function(){
      if (!document.getElementById('theme-overlay')) return;
      if (o !== document.getElementById('theme-overlay')) return;
      var el = document.createElement('div');
      el.className = 'th-pop';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = (10 + Math.random() * 80) + '%';
      el.style.top = (10 + Math.random() * 40) + '%';
      el.style.fontSize = (30 + Math.random() * 20) + 'px';
      o.appendChild(el);
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
    }, interval);
  }

  // ═══════ THEME APPLIERS ═══════
  function applyTet(){
    var o = ensureOverlay();
    addFalling(o, ['🌸','🌼','💮','🏵️'], 20, 16, 36, 8, 14);
    addIntervalPop(o, ['🎆','🎇','✨'], 3000);
  }
  function applyValentine(){
    var o = ensureOverlay();
    addFalling(o, ['💖','💕','💗','❤️','🌹'], 22, 16, 34, 7, 12);
    addFloat(o, ['💝','💘'], 6, 24, 40);
  }
  function applyWomenday(){
    var o = ensureOverlay();
    addFalling(o, ['🌹','🌷','💐','🌸','💮'], 22, 16, 36, 8, 13);
    addFloat(o, ['💐','🌺'], 5, 24, 40);
  }
  function applyReunification(){
    var o = ensureOverlay();
    addShine(o, '★', 30, 10, 25, '#FFD700');
    var flag = document.createElement('div');
    flag.className = 'th-float';
    flag.textContent = '🇻🇳';
    flag.style.left = '5%';
    flag.style.top = '15%';
    flag.style.fontSize = '80px';
    flag.style.opacity = '.18';
    flag.style.animationDuration = '6s';
    o.appendChild(flag);
  }
  function applyChildren(){
    var o = ensureOverlay();
    addFalling(o, ['🎈','🎉','🎊','🎁','🍭','🍬'], 24, 16, 36, 7, 12);
    addFloat(o, ['🎠','🎪','🎨'], 5, 24, 42);
  }
  function applyNationalday(){
    var o = ensureOverlay();
    addShine(o, '★', 35, 10, 25, '#FFD700');
    var flag = document.createElement('div');
    flag.className = 'th-float';
    flag.textContent = '🇻🇳';
    flag.style.left = '3%';
    flag.style.top = '12%';
    flag.style.fontSize = '90px';
    flag.style.opacity = '.2';
    flag.style.animationDuration = '5s';
    o.appendChild(flag);
  }
  function applyMidautumn(){
    var o = ensureOverlay();
    // Mặt trăng
    var moon = document.createElement('div');
    moon.style.cssText = 'position:absolute;top:8%;right:8%;width:110px;height:110px;border-radius:50%;' +
      'background:radial-gradient(circle at 35% 35%,#fff 0%,#ffe8a0 60%,#f0c060 100%);' +
      'box-shadow:0 0 60px rgba(255,232,160,.9),0 0 120px rgba(255,232,160,.5);' +
      'animation:th-float-anim 6s ease-in-out infinite';
    o.appendChild(moon);
    // Đèn lồng
    addFloat(o, ['🏮','🎐','🌟'], 10, 24, 42);
    // Sao
    addShine(o, '✨', 15, 10, 20, '#FFE8A0');
  }
  function applyHalloween(){
    var o = ensureOverlay();
    addFloat(o, ['🎃','👻','🦇','🕷️','🕸️'], 12, 20, 40);
    addFly(o, '🦇', 5, 18, 28, 12, 20, 5, 35);
  }
  function applyChristmas(){
    var o = ensureOverlay();
    addFalling(o, ['❄','❅','❆','*'], 40, 8, 22, 6, 14);
    addFly(o, '🎅', 1, 50, 60, 20, 25, 10, 20);
  }
  function applyNewyear(){
    var o = ensureOverlay();
    addIntervalPop(o, ['🎆','🎇','✨','🎊'], 2000);
    addShine(o, '✨', 25, 12, 26, '#FFD700');
  }
  function applySpring(){
    var o = ensureOverlay();
    addFalling(o, ['🌸','🌺','🌷','🌼','🦋'], 22, 16, 34, 8, 14);
    addFloat(o, ['🐝','🦋'], 5, 20, 32);
  }
  function applySummer(){
    var o = ensureOverlay();
    addFloat(o, ['☀️','🌴','🥥','🍹','🏖️'], 8, 24, 40);
    addFalling(o, ['🌊'], 8, 20, 32, 10, 16);
  }
  function applyAutumn(){
    var o = ensureOverlay();
    addFalling(o, ['🍂','🍁','🌾'], 25, 16, 34, 8, 14);
    addFloat(o, ['🍄','🌰'], 4, 20, 32);
  }
  function applyWinter(){
    var o = ensureOverlay();
    addFalling(o, ['❄','❅','❆'], 45, 8, 24, 6, 13);
  }

  var APPLIERS = {
    tet: applyTet, valentine: applyValentine, womenday: applyWomenday,
    reunification: applyReunification, children: applyChildren,
    nationalday: applyNationalday, midautumn: applyMidautumn,
    halloween: applyHalloween, christmas: applyChristmas,
    newyear: applyNewyear, spring: applySpring, summer: applySummer,
    autumn: applyAutumn, winter: applyWinter
  };

  function applyTheme(key){
    if (!THEMES[key]) key = 'default';
    clearOverlay();
    if (key === 'default'){
      showBadge(null);
      return;
    }
    document.body.classList.add('theme-' + key);
    if (APPLIERS[key]) APPLIERS[key]();
    showBadge(key);
  }

  // ═══════ FIREBASE READ ═══════
  function fetchThemeFromFirebase(){
    fetch('https://firestore.googleapis.com/v1/projects/dolphin-f6d67/databases/(default)/documents/master_config/theme?key=' + FIREBASE_CONFIG.apiKey, { cache: 'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('404');
        return r.json();
      })
      .then(function(data){
        var key = (data && data.fields && data.fields.themeKey && data.fields.themeKey.stringValue) || 'auto';
        if (key === 'auto' || !THEMES[key]) applyTheme(detectThemeByDate());
        else applyTheme(key);
      })
      .catch(function(){
        applyTheme(detectThemeByDate());
      });
  }

  // ═══════ INIT ═══════
  function init(){
    injectStyles();
    // URL param ưu tiên cao nhất (để preview)
    var urlParams = new URLSearchParams(location.search);
    var urlTheme = urlParams.get('theme');
    if (urlTheme && THEMES[urlTheme]){
      applyTheme(urlTheme);
      return;
    }
    fetchThemeFromFirebase();
    setInterval(fetchThemeFromFirebase, 10 * 60 * 1000);
  }

  window.ThemeSystem = {
    setTheme: function(key){ applyTheme(key); },
    getCurrent: function(){
      var m = document.body.className.match(/theme-([a-z]+)/);
      return m ? m[1] : 'default';
    },
    listThemes: function(){ return Object.keys(THEMES); },
    detect: detectThemeByDate
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🎨 THEME SYSTEM v2 LOADED (15 themes)', 'background:#FBD77A;color:#123634;font-size:12px;padding:3px 8px;border-radius:4px;font-weight:900');
})();
