/* ============================================================
   🎨 THEME SYSTEM v3 — WOW EDITION
   - Canvas particle engine (fireworks, snow, aurora)
   - Multi-layer parallax
   - God rays + vignette + color grading
   - Animated gradient sky
   - 15 themes
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var THEMES = {
    default:      { name: 'Dolphin (Mặc định)', icon: '🐬', ranges: null, badge: 'DOLPHIN', color: ['#6fc3bf','#123634'] },
    tet:          { name: 'Tết Nguyên Đán',     icon: '🌸', ranges: [[1,15],[2,20]], badge: 'TẾT', color: ['#FF6B35','#8B1A1A'] },
    valentine:    { name: 'Valentine',          icon: '💖', ranges: [[2,10],[2,15]], badge: 'VALENTINE', color: ['#FF4D6D','#7a1030'] },
    womenday:     { name: 'Quốc Tế Phụ Nữ',     icon: '🌹', ranges: [[3,5],[3,10]], badge: '8/3', color: ['#D946A6','#5a105a'] },
    reunification:{ name: '30/4 Thống Nhất',    icon: '🇻🇳', ranges: [[4,28],[5,3]], badge: '30/4', color: ['#DA251D','#8b0000'] },
    children:     { name: 'Tết Thiếu Nhi',      icon: '🎈', ranges: [[5,25],[6,5]], badge: '1/6', color: ['#4ECDC4','#FF6B9D'] },
    nationalday:  { name: 'Quốc Khánh',         icon: '🇻🇳', ranges: [[8,30],[9,3]], badge: '2/9', color: ['#DA251D','#FFD700'] },
    midautumn:    { name: 'Trung Thu',          icon: '🏮', ranges: [[9,10],[10,5]], badge: 'TRUNG THU', color: ['#f0c060','#5a1a3a'] },
    halloween:    { name: 'Halloween',          icon: '🎃', ranges: [[10,25],[11,1]], badge: 'HALLOWEEN', color: ['#ff9500','#2a0a3a'] },
    christmas:    { name: 'Giáng Sinh',         icon: '🎄', ranges: [[12,15],[12,26]], badge: 'NOEL', color: ['#c41e3a','#0a7d3d'] },
    newyear:      { name: 'Tết Dương Lịch',     icon: '🎊', ranges: [[12,29],[1,2]], badge: 'NEW YEAR', color: ['#FFD700','#8B00FF'] },
    spring:       { name: 'Mùa Xuân',           icon: '🌸', months: [3,4,5], badge: 'SPRING', color: ['#FFB6C1','#4ECDC4'] },
    summer:       { name: 'Mùa Hè',             icon: '☀️', months: [6,7,8], badge: 'SUMMER', color: ['#FFB000','#1a4a8a'] },
    autumn:       { name: 'Mùa Thu',            icon: '🍂', months: [9,10,11], badge: 'AUTUMN', color: ['#D2691E','#5a3010'] },
    winter:       { name: 'Mùa Đông',           icon: '❄️', months: [12,1,2], badge: 'WINTER', color: ['#B8D8F0','#0a1428'] }
  };

  var state = {
    currentTheme: 'default',
    canvas: null,
    ctx: null,
    particles: [],
    rafId: null,
    lastSpawn: 0,
    dpr: window.devicePixelRatio || 1,
    viewportW: 0,
    viewportH: 0
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
    var holidayOrder = ['tet','valentine','womenday','reunification','children','nationalday','midautumn','halloween','christmas','newyear'];
    for (var i = 0; i < holidayOrder.length; i++){
      if (isInRange(vn.month, vn.day, THEMES[holidayOrder[i]].ranges)) return holidayOrder[i];
    }
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
          /* ═══════════════════════════════════════════════════
         🎀 THEME DECORATIONS — Announcement + Area Cards
         (đã sửa để khớp cấu trúc index.html)
         ═══════════════════════════════════════════════════ */

      /* ─── ANNOUNCEMENT BAR ─── */
      body[class*="theme-"] #announcementBar{
        border-width:3px;
        animation:ann-glow-pulse 2.5s ease-in-out infinite;
      }
      /* Trang trí bên PHẢI bar — bên trái đã có 📢 */
      body[class*="theme-"] #announcementBar::after{
        content:var(--ann-orn-r, '✨');
        position:absolute;right:10px;top:50%;
        transform:translateY(-50%);
        font-size:20px;z-index:6;pointer-events:none;
        filter:drop-shadow(0 0 8px var(--ann-glow, rgba(255,255,255,.8)));
        animation:ann-orn-bounce 1.6s ease-in-out infinite;
      }
      /* Đổi emoji 📢 gốc thành emoji theo theme */
      body[class*="theme-"] .announcement-icon::after{
        content:var(--ann-icon-swap, '');
      }
      /* Ẩn emoji 📢 gốc, thay bằng theme */
      body.theme-tet .announcement-icon{font-size:0}
      body.theme-tet .announcement-icon::after{content:'🧧';font-size:22px}
      body.theme-valentine .announcement-icon{font-size:0}
      body.theme-valentine .announcement-icon::after{content:'💝';font-size:22px}
      body.theme-womenday .announcement-icon{font-size:0}
      body.theme-womenday .announcement-icon::after{content:'🌷';font-size:22px}
      body.theme-reunification .announcement-icon,
      body.theme-nationalday .announcement-icon{font-size:0}
      body.theme-reunification .announcement-icon::after,
      body.theme-nationalday .announcement-icon::after{content:'⭐';font-size:22px}
      body.theme-children .announcement-icon{font-size:0}
      body.theme-children .announcement-icon::after{content:'🎈';font-size:22px}
      body.theme-midautumn .announcement-icon{font-size:0}
      body.theme-midautumn .announcement-icon::after{content:'🏮';font-size:22px}
      body.theme-halloween .announcement-icon{font-size:0}
      body.theme-halloween .announcement-icon::after{content:'🎃';font-size:22px}
      body.theme-christmas .announcement-icon{font-size:0}
      body.theme-christmas .announcement-icon::after{content:'🎄';font-size:22px}
      body.theme-newyear .announcement-icon{font-size:0}
      body.theme-newyear .announcement-icon::after{content:'🎊';font-size:22px}
      body.theme-spring .announcement-icon{font-size:0}
      body.theme-spring .announcement-icon::after{content:'🌸';font-size:22px}
      body.theme-summer .announcement-icon{font-size:0}
      body.theme-summer .announcement-icon::after{content:'☀️';font-size:22px}
      body.theme-autumn .announcement-icon{font-size:0}
      body.theme-autumn .announcement-icon::after{content:'🍁';font-size:22px}
      body.theme-winter .announcement-icon{font-size:0}
      body.theme-winter .announcement-icon::after{content:'❄️';font-size:22px}

      /* ─── AREA CARDS ─── */
      body[class*="theme-"] .area-card{
        border-width:2px;
        box-shadow:
          0 10px 40px -10px rgba(0,0,0,.6),
          0 0 30px var(--card-glow, rgba(244,184,66,.25)),
          inset 0 0 25px var(--card-inset, rgba(244,184,66,.05));
        animation:card-breathe 4s ease-in-out infinite;
      }
      body[class*="theme-"] .area-card:hover{
        box-shadow:
          0 20px 60px -10px rgba(0,0,0,.8),
          0 0 60px var(--card-glow, rgba(244,184,66,.6)),
          inset 0 0 40px var(--card-inset, rgba(244,184,66,.15))!important;
      }
      /* Emoji trang trí — đặt BÊN TRONG card, góc dưới-trái (tránh badge góc phải trên) */
      body[class*="theme-"] .area-card .theme-orn{
        position:absolute;font-size:22px;line-height:1;pointer-events:none;
        z-index:4;opacity:.85;
        filter:drop-shadow(0 0 10px var(--card-glow, rgba(255,255,255,.7)));
        animation:orn-float 3s ease-in-out infinite;
        transition:opacity .4s;
      }
      body[class*="theme-"] .area-card .theme-orn-tl{
        top:10px;left:10px;
      }
      body[class*="theme-"] .area-card .theme-orn-br{
        bottom:10px;right:10px;
        animation-delay:-1.5s;
      }
      body[class*="theme-"] .area-card:hover .theme-orn{opacity:1;font-size:26px}

      /* ─── ANIMATIONS ─── */
      @keyframes ann-glow-pulse{
        0%,100%{box-shadow:0 6px 28px var(--ann-glow,rgba(244,184,66,.5)),inset 0 0 30px var(--ann-inset,rgba(255,215,0,.08))}
        50%{box-shadow:0 6px 36px var(--ann-glow,rgba(244,184,66,.9)),inset 0 0 50px var(--ann-inset,rgba(255,215,0,.15))}
      }
      @keyframes ann-orn-bounce{
        0%,100%{transform:translateY(-50%) scale(1) rotate(-10deg)}
        50%{transform:translateY(-50%) scale(1.25) rotate(10deg)}
      }
      @keyframes card-breathe{
        0%,100%{box-shadow:0 10px 40px -10px rgba(0,0,0,.6),0 0 30px var(--card-glow,rgba(244,184,66,.25)),inset 0 0 25px var(--card-inset,rgba(244,184,66,.05))}
        50%{box-shadow:0 12px 50px -10px rgba(0,0,0,.7),0 0 45px var(--card-glow,rgba(244,184,66,.45)),inset 0 0 35px var(--card-inset,rgba(244,184,66,.1))}
      }
      @keyframes orn-float{
        0%,100%{transform:translateY(0) rotate(-6deg) scale(1)}
        50%{transform:translateY(-6px) rotate(6deg) scale(1.1)}
      }

      /* ─── BADGE theo theme ─── */
      body[class*="theme-"] .area-badge{
        background:linear-gradient(135deg, var(--badge-c1, #FBD77A), var(--badge-c2, #D99A2B))!important;
        box-shadow:0 4px 16px var(--badge-glow, rgba(244,184,66,.6))!important;
      }

      /* ═══════════════════════════════════════════════════
         🌸 PER-THEME VARIABLES
         ═══════════════════════════════════════════════════ */

      body.theme-tet{
        --ann-glow:rgba(255,215,0,.7); --ann-inset:rgba(255,215,0,.15);
        --ann-orn-r:'🏮';
        --card-glow:rgba(255,215,0,.5); --card-inset:rgba(255,80,80,.08);
        --badge-c1:#FFD700; --badge-c2:#D42A2A; --badge-glow:rgba(255,215,0,.7);
      }
      body.theme-valentine{
        --ann-glow:rgba(255,77,109,.7); --ann-inset:rgba(255,77,109,.15);
        --ann-orn-r:'💖';
        --card-glow:rgba(255,77,109,.5); --card-inset:rgba(255,150,180,.08);
        --badge-c1:#FFB6C1; --badge-c2:#C9184A; --badge-glow:rgba(255,77,109,.7);
      }
      body.theme-womenday{
        --ann-glow:rgba(217,70,166,.7); --ann-inset:rgba(217,70,166,.15);
        --ann-orn-r:'💐';
        --card-glow:rgba(217,70,166,.5); --card-inset:rgba(255,180,220,.08);
        --badge-c1:#FFC0CB; --badge-c2:#8B1A8B; --badge-glow:rgba(217,70,166,.7);
      }
      body.theme-reunification, body.theme-nationalday{
        --ann-glow:rgba(255,215,0,.8); --ann-inset:rgba(255,215,0,.15);
        --ann-orn-r:'🇻🇳';
        --card-glow:rgba(255,215,0,.55); --card-inset:rgba(218,37,29,.1);
        --badge-c1:#FFD700; --badge-c2:#DA251D; --badge-glow:rgba(255,215,0,.8);
      }
      body.theme-children{
        --ann-glow:rgba(78,205,196,.7); --ann-inset:rgba(255,215,0,.12);
        --ann-orn-r:'🎉';
        --card-glow:rgba(255,107,157,.5); --card-inset:rgba(78,205,196,.1);
        --badge-c1:#4ECDC4; --badge-c2:#FF6B9D; --badge-glow:rgba(255,107,157,.7);
      }
      body.theme-midautumn{
        --ann-glow:rgba(240,192,96,.8); --ann-inset:rgba(240,192,96,.15);
        --ann-orn-r:'🌕';
        --card-glow:rgba(255,180,60,.55); --card-inset:rgba(255,200,100,.1);
        --badge-c1:#FFE8A0; --badge-c2:#C98A20; --badge-glow:rgba(240,192,96,.8);
      }
      body.theme-halloween{
        --ann-glow:rgba(255,140,0,.8); --ann-inset:rgba(150,50,200,.15);
        --ann-orn-r:'🦇';
        --card-glow:rgba(255,140,0,.55); --card-inset:rgba(150,50,200,.15);
        --badge-c1:#FF9500; --badge-c2:#8B0000; --badge-glow:rgba(255,140,0,.8);
      }
      body.theme-christmas{
        --ann-glow:rgba(220,20,60,.7); --ann-inset:rgba(255,255,255,.1);
        --ann-orn-r:'🎁';
        --card-glow:rgba(220,20,60,.55); --card-inset:rgba(10,125,61,.15);
        --badge-c1:#FFFFFF; --badge-c2:#C41E3A; --badge-glow:rgba(220,20,60,.8);
      }
      body.theme-newyear{
        --ann-glow:rgba(255,215,0,.8); --ann-inset:rgba(255,20,147,.15);
        --ann-orn-r:'🎆';
        --card-glow:rgba(255,215,0,.55); --card-inset:rgba(255,20,147,.12);
        --badge-c1:#FFD700; --badge-c2:#8B00FF; --badge-glow:rgba(255,215,0,.8);
      }
      body.theme-spring{
        --ann-glow:rgba(255,182,193,.7); --ann-inset:rgba(255,182,193,.15);
        --ann-orn-r:'🌷';
        --card-glow:rgba(255,107,157,.5); --card-inset:rgba(78,205,196,.1);
        --badge-c1:#FFB6C1; --badge-c2:#4ECDC4; --badge-glow:rgba(255,182,193,.7);
      }
      body.theme-summer{
        --ann-glow:rgba(255,200,50,.8); --ann-inset:rgba(255,200,50,.15);
        --ann-orn-r:'🌴';
        --card-glow:rgba(255,200,50,.55); --card-inset:rgba(80,180,255,.12);
        --badge-c1:#FFE066; --badge-c2:#FF6B35; --badge-glow:rgba(255,200,50,.8);
      }
      body.theme-autumn{
        --ann-glow:rgba(255,179,71,.75); --ann-inset:rgba(255,179,71,.15);
        --ann-orn-r:'🍂';
        --card-glow:rgba(255,179,71,.55); --card-inset:rgba(210,105,30,.12);
        --badge-c1:#FFB347; --badge-c2:#8B4513; --badge-glow:rgba(255,179,71,.75);
      }
      body.theme-winter{
        --ann-glow:rgba(184,216,240,.8); --ann-inset:rgba(255,255,255,.12);
        --ann-orn-r:'⛄';
        --card-glow:rgba(184,216,240,.55); --card-inset:rgba(74,138,204,.12);
        --badge-c1:#FFFFFF; --badge-c2:#4A8ACC; --badge-glow:rgba(184,216,240,.8);
      }
      /* ═══ CANVAS LAYER ═══ */
      #themeCanvas{position:fixed;inset:0;pointer-events:none;z-index:2}
      #theme-vignette{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 1s}
      #theme-vignette.on{opacity:1}
      #theme-godrays{position:fixed;inset:0;pointer-events:none;z-index:1;opacity:0;transition:opacity 1.5s;
        background:
          linear-gradient(105deg,transparent 15%,currentColor 20%,transparent 25%),
          linear-gradient(85deg,transparent 40%,currentColor 45%,transparent 50%),
          linear-gradient(115deg,transparent 65%,currentColor 70%,transparent 75%);
        background-size:100% 100%;
        mix-blend-mode:overlay;
        animation:godray-drift 18s ease-in-out infinite alternate}
      #theme-godrays.on{opacity:.35}
      @keyframes godray-drift{
        0%{background-position:0 0,0 0,0 0}
        100%{background-position:30px 0,-20px 0,40px 0}
      }
      #theme-aurora{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:0;transition:opacity 2s;
        background:
          radial-gradient(ellipse 80% 40% at 20% 10%,var(--aurora-a,rgba(100,200,255,.25)),transparent 60%),
          radial-gradient(ellipse 70% 35% at 80% 20%,var(--aurora-b,rgba(180,100,255,.2)),transparent 60%),
          radial-gradient(ellipse 60% 30% at 50% 5%,var(--aurora-c,rgba(80,255,200,.15)),transparent 70%);
        animation:aurora-shift 12s ease-in-out infinite alternate;
        mix-blend-mode:screen}
      #theme-aurora.on{opacity:1}
      @keyframes aurora-shift{
        0%{transform:translateX(-3%) scaleY(1)}
        50%{transform:translateX(0%) scaleY(1.08)}
        100%{transform:translateX(3%) scaleY(1)}
      }

      /* ═══ BRAND + CARD INTERACTIONS ═══ */
      body[class*="theme-"] .brand-title{transition:filter .8s ease}
      body[class*="theme-"] .area-card{transition:all .4s cubic-bezier(.16,1,.3,1)}
      body[class*="theme-"] .area-card:hover{transform:translateY(-8px) scale(1.05)}

      /* ═══ TẾT ═══ */
      body.theme-tet{background:#2a0e0e!important}
      body.theme-tet .halong-bg{filter:saturate(1.3) hue-rotate(-15deg) brightness(.75)}
      body.theme-tet .brand-title{background:linear-gradient(180deg,#FFD700 0%,#FF6B35 50%,#D42A2A 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 35px rgba(255,215,0,.6))}
      body.theme-tet .area-card{border-color:rgba(255,215,0,.7)!important;background:rgba(42,14,14,.7)!important;box-shadow:0 0 40px rgba(255,215,0,.2),inset 0 0 30px rgba(255,215,0,.05)}
      body.theme-tet #announcementBar{border-color:#FFD700!important;background:linear-gradient(135deg,#8B1A1A,#5a0f0f)!important;box-shadow:0 0 40px rgba(255,215,0,.4)}
      body.theme-tet{--aurora-a:rgba(255,80,80,.25);--aurora-b:rgba(255,200,0,.25);--aurora-c:rgba(255,120,80,.2)}

      /* ═══ VALENTINE ═══ */
      body.theme-valentine{background:#2a0a1a!important}
      body.theme-valentine .halong-bg{filter:saturate(1.3) hue-rotate(-30deg) brightness(.85)}
      body.theme-valentine .brand-title{background:linear-gradient(180deg,#FFB6C1 0%,#FF4D6D 50%,#C9184A 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 35px rgba(255,77,109,.7))}
      body.theme-valentine .area-card{border-color:rgba(255,77,109,.7)!important;background:rgba(42,10,26,.75)!important;box-shadow:0 0 40px rgba(255,77,109,.25)}
      body.theme-valentine{--aurora-a:rgba(255,80,120,.3);--aurora-b:rgba(255,150,180,.2);--aurora-c:rgba(255,100,150,.2)}

      /* ═══ 8/3 ═══ */
      body.theme-womenday{background:#2a1030!important}
      body.theme-womenday .halong-bg{filter:saturate(1.2) hue-rotate(280deg) brightness(.85)}
      body.theme-womenday .brand-title{background:linear-gradient(180deg,#FFC0CB 0%,#D946A6 50%,#8B1A8B 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 35px rgba(217,70,166,.7))}
      body.theme-womenday .area-card{border-color:rgba(217,70,166,.7)!important;background:rgba(42,16,48,.75)!important;box-shadow:0 0 40px rgba(217,70,166,.25)}
      body.theme-womenday{--aurora-a:rgba(217,70,166,.3);--aurora-b:rgba(180,100,255,.25);--aurora-c:rgba(255,150,200,.2)}

      /* ═══ 30/4 ═══ */
      body.theme-reunification{background:#1a0505!important}
      body.theme-reunification .halong-bg{filter:saturate(1.5) hue-rotate(-20deg) brightness(.75)}
      body.theme-reunification .brand-title{background:linear-gradient(180deg,#FFD700 0%,#DA251D 50%,#8b0000 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 40px rgba(218,37,29,.9))}
      body.theme-reunification .area-card{border-color:rgba(255,215,0,.8)!important;background:rgba(30,8,8,.8)!important;box-shadow:0 0 40px rgba(218,37,29,.35)}
      body.theme-reunification{--aurora-a:rgba(255,40,40,.3);--aurora-b:rgba(255,215,0,.3);--aurora-c:rgba(200,20,20,.25)}

      /* ═══ THIẾU NHI ═══ */
      body.theme-children{background:#0e1e3a!important}
      body.theme-children .halong-bg{filter:saturate(1.6) brightness(1.05)}
      body.theme-children .brand-title{background:linear-gradient(180deg,#FFD700 0%,#FF6B35 40%,#4ECDC4 80%,#FF6B9D 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 30px rgba(255,107,157,.7))}
      body.theme-children .area-card{border-color:rgba(78,205,196,.7)!important;background:rgba(14,30,58,.75)!important;box-shadow:0 0 40px rgba(255,107,157,.3)}
      body.theme-children{--aurora-a:rgba(78,205,196,.3);--aurora-b:rgba(255,107,157,.3);--aurora-c:rgba(255,215,0,.25)}

      /* ═══ QUỐC KHÁNH ═══ */
      body.theme-nationalday{background:#1a0505!important}
      body.theme-nationalday .halong-bg{filter:saturate(1.5) hue-rotate(-20deg) brightness(.75)}
      body.theme-nationalday .brand-title{background:linear-gradient(180deg,#FFD700 0%,#DA251D 50%,#8b0000 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 40px rgba(218,37,29,.9))}
      body.theme-nationalday .area-card{border-color:rgba(255,215,0,.8)!important;background:rgba(30,10,10,.8)!important;box-shadow:0 0 45px rgba(218,37,29,.4)}
      body.theme-nationalday{--aurora-a:rgba(255,215,0,.3);--aurora-b:rgba(218,37,29,.3);--aurora-c:rgba(255,100,0,.25)}

      /* ═══ TRUNG THU ═══ */
      body.theme-midautumn{background:#1a0e2a!important}
      body.theme-midautumn .halong-bg{filter:saturate(1.3) hue-rotate(30deg) brightness(.7)}
      body.theme-midautumn .brand-title{background:linear-gradient(180deg,#ffe8a0 0%,#f0c060 50%,#c98a20 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 40px rgba(240,192,96,.8))}
      body.theme-midautumn .area-card{border-color:rgba(255,180,60,.7)!important;background:rgba(26,14,42,.75)!important;box-shadow:0 0 40px rgba(255,180,60,.3)}
      body.theme-midautumn{--aurora-a:rgba(255,200,100,.3);--aurora-b:rgba(255,120,80,.25);--aurora-c:rgba(200,150,255,.2)}

      /* ═══ HALLOWEEN ═══ */
      body.theme-halloween{background:#080308!important}
      body.theme-halloween .halong-bg{filter:saturate(.4) hue-rotate(270deg) brightness(.35)}
      body.theme-halloween .brand-title{background:linear-gradient(180deg,#ff9500 0%,#c45600 50%,#8b0000 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 30px rgba(255,140,0,.9))}
      body.theme-halloween .area-card{border-color:rgba(255,140,0,.6)!important;background:rgba(15,5,25,.85)!important;box-shadow:0 0 50px rgba(150,50,200,.4),inset 0 0 30px rgba(150,50,200,.1)}
      body.theme-halloween{--aurora-a:rgba(150,50,200,.4);--aurora-b:rgba(255,140,0,.3);--aurora-c:rgba(100,0,150,.3)}

      /* ═══ GIÁNG SINH ═══ */
      body.theme-christmas{background:#0a1a2e!important}
      body.theme-christmas .halong-bg{filter:saturate(.8) brightness(.85) hue-rotate(180deg)}
      body.theme-christmas .brand-title{background:linear-gradient(180deg,#fff 0%,#c41e3a 50%,#0a7d3d 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 30px rgba(220,20,60,.8))}
      body.theme-christmas .area-card{border-color:rgba(220,20,60,.7)!important;background:rgba(10,26,46,.75)!important;box-shadow:0 0 40px rgba(10,125,61,.3)}
      body.theme-christmas{--aurora-a:rgba(200,220,255,.35);--aurora-b:rgba(200,30,60,.25);--aurora-c:rgba(10,150,80,.25)}

      /* ═══ TẾT DƯƠNG ═══ */
      body.theme-newyear{background:#08081a!important}
      body.theme-newyear .halong-bg{filter:saturate(1.3) brightness(.8)}
      body.theme-newyear .brand-title{background:linear-gradient(180deg,#FFD700 0%,#FF1493 50%,#8B00FF 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 40px rgba(255,215,0,.8))}
      body.theme-newyear .area-card{border-color:rgba(255,215,0,.7)!important;background:rgba(10,10,30,.8)!important;box-shadow:0 0 50px rgba(139,0,255,.4)}
      body.theme-newyear{--aurora-a:rgba(255,215,0,.3);--aurora-b:rgba(255,20,147,.3);--aurora-c:rgba(139,0,255,.3)}

      /* ═══ MÙA XUÂN ═══ */
      body.theme-spring{background:#1a2a1a!important}
      body.theme-spring .halong-bg{filter:saturate(1.4) hue-rotate(30deg) brightness(1.1)}
      body.theme-spring .brand-title{background:linear-gradient(180deg,#FFB6C1 0%,#FF6B9D 50%,#4ECDC4 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 30px rgba(255,182,193,.7))}
      body.theme-spring .area-card{border-color:rgba(255,182,193,.7)!important;background:rgba(26,42,26,.75)!important;box-shadow:0 0 40px rgba(78,205,196,.3)}
      body.theme-spring{--aurora-a:rgba(255,182,193,.35);--aurora-b:rgba(78,205,196,.3);--aurora-c:rgba(180,255,180,.25)}

      /* ═══ MÙA HÈ ═══ */
      body.theme-summer{background:#0a1a3a!important}
      body.theme-summer .halong-bg{filter:saturate(1.5) brightness(1.15)}
      body.theme-summer .brand-title{background:linear-gradient(180deg,#FFE066 0%,#FFB000 50%,#FF6B35 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 40px rgba(255,200,50,.9))}
      body.theme-summer .area-card{border-color:rgba(255,200,50,.8)!important;background:rgba(10,26,58,.75)!important;box-shadow:0 0 50px rgba(255,200,50,.35)}
      body.theme-summer{--aurora-a:rgba(255,220,80,.35);--aurora-b:rgba(80,180,255,.3);--aurora-c:rgba(255,140,60,.3)}

      /* ═══ MÙA THU ═══ */
      body.theme-autumn{background:#2a1505!important}
      body.theme-autumn .halong-bg{filter:saturate(1.3) hue-rotate(-25deg) brightness(.85)}
      body.theme-autumn .brand-title{background:linear-gradient(180deg,#FFB347 0%,#D2691E 50%,#8B4513 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 35px rgba(255,179,71,.7))}
      body.theme-autumn .area-card{border-color:rgba(255,179,71,.7)!important;background:rgba(42,21,5,.75)!important;box-shadow:0 0 40px rgba(210,105,30,.3)}
      body.theme-autumn{--aurora-a:rgba(255,180,80,.35);--aurora-b:rgba(200,80,30,.3);--aurora-c:rgba(255,220,150,.25)}

      /* ═══ MÙA ĐÔNG ═══ */
      body.theme-winter{background:#0a1428!important}
      body.theme-winter .halong-bg{filter:saturate(.7) brightness(.8) hue-rotate(180deg)}
      body.theme-winter .brand-title{background:linear-gradient(180deg,#FFFFFF 0%,#B8D8F0 50%,#4A8ACC 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 0 30px rgba(184,216,240,.8))}
      body.theme-winter .area-card{border-color:rgba(184,216,240,.7)!important;background:rgba(10,20,40,.85)!important;box-shadow:0 0 40px rgba(184,216,240,.3)}
      body.theme-winter{--aurora-a:rgba(200,230,255,.35);--aurora-b:rgba(150,180,220,.3);--aurora-c:rgba(255,255,255,.25)}

      /* ═══ BADGE ═══ */
      #themeBadge{position:fixed;top:8px;left:8px;z-index:9998;
        display:flex;align-items:center;gap:6px;padding:6px 12px;
        background:rgba(10,31,29,.9);border:1px solid rgba(244,184,66,.5);
        border-radius:999px;font-size:11px;font-weight:900;color:#FBD77A;
        font-family:'Nunito',sans-serif;backdrop-filter:blur(10px);
        pointer-events:none;opacity:0;transition:opacity .5s;text-shadow:0 0 10px rgba(244,184,66,.5)}
      #themeBadge.show{opacity:1}
      #themeBadge .tb-icon{font-size:14px;animation:crown-spin 4s linear infinite}
      @keyframes crown-spin{0%,100%{transform:rotate(-15deg) scale(1)}50%{transform:rotate(15deg) scale(1.1)}}
      @media(max-width:768px){
        #themeBadge{font-size:9.5px;padding:4px 9px;top:6px;left:6px}
        #themeBadge .tb-icon{font-size:12px}
      }
    `;
    document.head.appendChild(s);
  }
      @media(max-width:768px){
        #themeBadge{font-size:9.5px;padding:4px 9px;top:6px;left:6px}
        #themeBadge .tb-icon{font-size:12px}
      }

      /* ═══════════════════════════════════════════════════
         🕐 HALONG CLOCK — Theme overrides
         ═══════════════════════════════════════════════════ */
      body[class*="theme-"] #halongClock{
        border-width:2px;
        animation:hclock-glow-pulse 3s ease-in-out infinite;
      }
      @keyframes hclock-glow-pulse{
        0%,100%{box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 30px var(--hclock-glow,rgba(244,184,66,.25)),inset 0 0 30px var(--hclock-inset,rgba(244,184,66,.06))}
        50%{box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 50px var(--hclock-glow,rgba(244,184,66,.5)),inset 0 0 45px var(--hclock-inset,rgba(244,184,66,.12))}
      }
      body[class*="theme-"] #halongClock .hclock-time{
        color:var(--hclock-color, #FBD77A);
        text-shadow:0 0 14px var(--hclock-glow, rgba(244,184,66,.65)),
                    0 0 28px var(--hclock-glow, rgba(244,184,66,.35));
      }
      body[class*="theme-"] #halongClock .hclock-loc-text{
        color:var(--hclock-color, #FBD77A);
      }
      body[class*="theme-"] #halongClock .hclock-icon{
        font-size:0;
        filter:drop-shadow(0 0 12px var(--hclock-glow, rgba(244,184,66,.8)));
      }
      body[class*="theme-"] #halongClock .hclock-icon::after{
        content:var(--hclock-icon, '🕐');
        font-size:28px;
      }
      body[class*="theme-"] #halongClock .hclock-loc-icon{
        font-size:0;
      }
      body[class*="theme-"] #halongClock .hclock-loc-icon::after{
        content:var(--hclock-loc, '📍');
        font-size:18px;
      }
      body[class*="theme-"] #halongClock .hclock-glow{
        background:radial-gradient(circle at 30% 50%,var(--hclock-glow,rgba(244,184,66,.18)),transparent 60%),
                   radial-gradient(circle at 70% 50%,var(--hclock-inset,rgba(78,205,196,.12)),transparent 60%);
      }

      /* ─── Per-theme clock variables ─── */
      body.theme-tet{
        --hclock-glow:rgba(255,215,0,.6); --hclock-inset:rgba(255,80,80,.15);
        --hclock-color:#FFD700; --hclock-icon:'🧧'; --hclock-loc:'🏮';
      }
      body.theme-valentine{
        --hclock-glow:rgba(255,77,109,.6); --hclock-inset:rgba(255,150,180,.15);
        --hclock-color:#FFB6C1; --hclock-icon:'💝'; --hclock-loc:'💖';
      }
      body.theme-womenday{
        --hclock-glow:rgba(217,70,166,.6); --hclock-inset:rgba(255,180,220,.15);
        --hclock-color:#FFC0CB; --hclock-icon:'🌷'; --hclock-loc:'🌹';
      }
      body.theme-reunification, body.theme-nationalday{
        --hclock-glow:rgba(255,215,0,.7); --hclock-inset:rgba(218,37,29,.2);
        --hclock-color:#FFD700; --hclock-icon:'⭐'; --hclock-loc:'🇻🇳';
      }
      body.theme-children{
        --hclock-glow:rgba(78,205,196,.6); --hclock-inset:rgba(255,107,157,.15);
        --hclock-color:#4ECDC4; --hclock-icon:'🎈'; --hclock-loc:'🎉';
      }
      body.theme-midautumn{
        --hclock-glow:rgba(240,192,96,.7); --hclock-inset:rgba(255,200,100,.15);
        --hclock-color:#FFE8A0; --hclock-icon:'🏮'; --hclock-loc:'🌕';
      }
      body.theme-halloween{
        --hclock-glow:rgba(255,140,0,.7); --hclock-inset:rgba(150,50,200,.2);
        --hclock-color:#FF9500; --hclock-icon:'🎃'; --hclock-loc:'🦇';
      }
      body.theme-christmas{
        --hclock-glow:rgba(220,20,60,.65); --hclock-inset:rgba(10,125,61,.2);
        --hclock-color:#FFE4E6; --hclock-icon:'🎄'; --hclock-loc:'🎁';
      }
      body.theme-newyear{
        --hclock-glow:rgba(255,215,0,.7); --hclock-inset:rgba(139,0,255,.2);
        --hclock-color:#FFD700; --hclock-icon:'🎊'; --hclock-loc:'🎆';
      }
      body.theme-spring{
        --hclock-glow:rgba(255,182,193,.6); --hclock-inset:rgba(78,205,196,.15);
        --hclock-color:#FFB6C1; --hclock-icon:'🌸'; --hclock-loc:'🦋';
      }
      body.theme-summer{
        --hclock-glow:rgba(255,200,50,.7); --hclock-inset:rgba(80,180,255,.15);
        --hclock-color:#FFE066; --hclock-icon:'☀️'; --hclock-loc:'🌴';
      }
      body.theme-autumn{
        --hclock-glow:rgba(255,179,71,.65); --hclock-inset:rgba(210,105,30,.15);
        --hclock-color:#FFB347; --hclock-icon:'🍁'; --hclock-loc:'🍂';
      }
      body.theme-winter{
        --hclock-glow:rgba(184,216,240,.7); --hclock-inset:rgba(74,138,204,.15);
        --hclock-color:#E0F0FF; --hclock-icon:'❄️'; --hclock-loc:'⛄';
      }
    `;                                    ← DẤU ĐÓNG BACKTICK VẪN GIỮ NGUYÊN
    document.head.appendChild(s);
  }
  
  // ═══════ LAYERS ═══════
  function ensureLayers(){
    var layers = ['theme-aurora','theme-godrays','themeCanvas','theme-vignette'];
    layers.forEach(function(id){
      if (!document.getElementById(id)){
        if (id === 'themeCanvas'){
          var c = document.createElement('canvas');
          c.id = id;
          document.body.appendChild(c);
        } else {
          var d = document.createElement('div');
          d.id = id;
          document.body.appendChild(d);
        }
      }
    });
    state.canvas = document.getElementById('themeCanvas');
    state.ctx = state.canvas.getContext('2d');
    resizeCanvas();
  }

  function resizeCanvas(){
    if (!state.canvas) return;
    state.viewportW = window.innerWidth;
    state.viewportH = window.innerHeight;
    state.canvas.width = state.viewportW * state.dpr;
    state.canvas.height = state.viewportH * state.dpr;
    state.canvas.style.width = state.viewportW + 'px';
    state.canvas.style.height = state.viewportH + 'px';
    state.ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);

  // ═══════ PARTICLE ENGINE ═══════
  function Particle(opts){
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx || 0;
    this.vy = opts.vy || 0;
    this.gravity = opts.gravity || 0;
    this.drag = opts.drag || 1;
    this.size = opts.size || 4;
    this.color = opts.color || '#fff';
    this.emoji = opts.emoji || null;
    this.life = opts.life || 1;
    this.maxLife = opts.maxLife || 1;
    this.rotation = opts.rotation || 0;
    this.spin = opts.spin || 0;
    this.shape = opts.shape || 'circle';
    this.wobble = opts.wobble || 0;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.alphaFade = opts.alphaFade !== false;
  }

  Particle.prototype.update = function(dt){
    this.wobblePhase += dt * 3;
    this.x += (this.vx + Math.sin(this.wobblePhase) * this.wobble) * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.vx *= Math.pow(this.drag, dt);
    this.vy *= Math.pow(this.drag, dt);
    this.rotation += this.spin * dt;
    this.life -= dt / this.maxLife;
  };

  Particle.prototype.draw = function(ctx){
    if (this.life <= 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    if (this.alphaFade) ctx.globalAlpha = Math.max(0, this.life);
    if (this.emoji){
      ctx.font = this.size + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.emoji, 0, 0);
    } else if (this.shape === 'circle'){
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 12;
      ctx.fill();
    } else if (this.shape === 'rect'){
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 2);
    } else if (this.shape === 'star'){
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      for (var i = 0; i < 5; i++){
        var angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        var x = Math.cos(angle) * this.size;
        var y = Math.sin(angle) * this.size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'spark'){
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(0, -this.size);
      ctx.lineTo(0, this.size);
      ctx.stroke();
    }
    ctx.restore();
  };

  function addParticle(opts){ state.particles.push(new Particle(opts)); }

  function tickLoop(){
    var now = performance.now();
    var dt = Math.min((now - state.lastSpawn) / 1000, 0.05);
    state.lastSpawn = now;

    var ctx = state.ctx;
    ctx.clearRect(0, 0, state.viewportW, state.viewportH);

    // Update + draw
    for (var i = state.particles.length - 1; i >= 0; i--){
      var p = state.particles[i];
      p.update(dt);
      p.draw(ctx);
      if (p.life <= 0 || p.y > state.viewportH + 100){
        state.particles.splice(i, 1);
      }
    }

    // Spawn theo theme
    var theme = state.currentTheme;
    if (theme !== 'default'){
      var spawner = SPAWNERS[theme];
      if (spawner) spawner(dt);
    }

    // Cắt bớt particles nếu quá nhiều
    if (state.particles.length > 500){
      state.particles.splice(0, state.particles.length - 500);
    }

    state.rafId = requestAnimationFrame(tickLoop);
  }

  // ═══════ SPAWNERS ═══════
  var spawnTimers = {};

  function shouldSpawn(key, interval){
    var now = Date.now();
    if (!spawnTimers[key] || (now - spawnTimers[key]) >= interval){
      spawnTimers[key] = now;
      return true;
    }
    return false;
  }

  var SPAWNERS = {
    // ═══ TẾT — hoa mai rơi + pháo hoa canvas ═══
    tet: function(){
      if (shouldSpawn('tet-flower', 250)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -30,
          vx: (Math.random() - 0.5) * 30,
          vy: 60 + Math.random() * 60,
          gravity: 15,
          size: 18 + Math.random() * 14,
          emoji: ['🌸','🌼','💮','🏵️'][Math.floor(Math.random() * 4)],
          maxLife: 12 + Math.random() * 6,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 2,
          wobble: 30
        });
      }
      if (shouldSpawn('tet-firework', 2500)){
        launchFirework('gold', Math.random() * state.viewportW, 100 + Math.random() * 200);
      }
    },
    // ═══ VALENTINE ═══
    valentine: function(){
      if (shouldSpawn('val-heart', 300)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -30,
          vx: (Math.random() - 0.5) * 40,
          vy: 60 + Math.random() * 50,
          gravity: 10,
          size: 16 + Math.random() * 14,
          emoji: ['💖','💕','💗','❤️','🌹','💝'][Math.floor(Math.random() * 6)],
          maxLife: 10 + Math.random() * 5,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 1.5,
          wobble: 40
        });
      }
      if (shouldSpawn('val-heartbeat', 400)){
        var x = Math.random() * state.viewportW;
        var y = 200 + Math.random() * 300;
        for (var i = 0; i < 6; i++){
          var angle = (i / 6) * Math.PI * 2;
          addParticle({
            x: x, y: y,
            vx: Math.cos(angle) * 60,
            vy: Math.sin(angle) * 60,
            gravity: 5,
            size: 8,
            color: '#FF4D6D',
            shape: 'circle',
            maxLife: 1.5
          });
        }
      }
    },
    // ═══ 8/3 ═══
    womenday: function(){
      if (shouldSpawn('wom-flower', 250)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -30,
          vx: (Math.random() - 0.5) * 30,
          vy: 50 + Math.random() * 50,
          gravity: 12,
          size: 18 + Math.random() * 14,
          emoji: ['🌹','🌷','💐','🌸','💮','🌺'][Math.floor(Math.random() * 6)],
          maxLife: 11 + Math.random() * 5,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 1.8,
          wobble: 35
        });
      }
    },
    // ═══ 30/4 ═══
    reunification: function(){
      if (shouldSpawn('reun-star', 150)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: Math.random() * state.viewportH,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          size: 6 + Math.random() * 10,
          color: '#FFD700',
          shape: 'star',
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 2,
          maxLife: 3 + Math.random() * 2
        });
      }
      if (shouldSpawn('reun-glow', 800)){
        for (var i = 0; i < 3; i++){
          addParticle({
            x: Math.random() * state.viewportW,
            y: state.viewportH + 20,
            vx: (Math.random() - 0.5) * 20,
            vy: -30 - Math.random() * 40,
            size: 4 + Math.random() * 6,
            color: '#FF4040',
            shape: 'spark',
            maxLife: 4
          });
        }
      }
    },
    // ═══ THIẾU NHI ═══
    children: function(){
      if (shouldSpawn('child-balloon', 400)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: state.viewportH + 40,
          vx: (Math.random() - 0.5) * 30,
          vy: -50 - Math.random() * 50,
          gravity: -5,
          size: 24 + Math.random() * 20,
          emoji: ['🎈','🎉','🎊','🎁','🍭','🍬','🎨','🎠'][Math.floor(Math.random() * 8)],
          maxLife: 12 + Math.random() * 6,
          rotation: (Math.random() - 0.5) * 0.3,
          spin: (Math.random() - 0.5) * 1,
          wobble: 25
        });
      }
    },
    // ═══ QUỐC KHÁNH ═══
    nationalday: function(){
      if (shouldSpawn('nat-star', 100)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: Math.random() * state.viewportH,
          vx: (Math.random() - 0.5) * 15,
          vy: (Math.random() - 0.5) * 15,
          size: 8 + Math.random() * 14,
          color: '#FFD700',
          shape: 'star',
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 3,
          maxLife: 2.5 + Math.random() * 2
        });
      }
      if (shouldSpawn('nat-firework', 1800)){
        launchFirework('gold', Math.random() * state.viewportW, 100 + Math.random() * 250);
      }
    },
    // ═══ TRUNG THU ═══
    midautumn: function(){
      if (shouldSpawn('mid-star', 120)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: Math.random() * state.viewportH * 0.7,
          vx: 0, vy: 0,
          size: 4 + Math.random() * 8,
          color: '#FFE8A0',
          shape: 'star',
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 2,
          maxLife: 3 + Math.random() * 2
        });
      }
      if (shouldSpawn('mid-lantern', 700)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: state.viewportH + 40,
          vx: (Math.random() - 0.5) * 20,
          vy: -25 - Math.random() * 25,
          gravity: -3,
          size: 24 + Math.random() * 16,
          emoji: ['🏮','🎐','🌟'][Math.floor(Math.random() * 3)],
          maxLife: 15 + Math.random() * 8,
          wobble: 15,
          rotation: 0,
          spin: (Math.random() - 0.5) * 0.8
        });
      }
    },
    // ═══ HALLOWEEN ═══
    halloween: function(){
      if (shouldSpawn('hal-pumpkin', 900)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: state.viewportH + 40,
          vx: (Math.random() - 0.5) * 20,
          vy: -20 - Math.random() * 30,
          gravity: -2,
          size: 22 + Math.random() * 18,
          emoji: ['🎃','👻','🕷️','🕸️'][Math.floor(Math.random() * 4)],
          maxLife: 10 + Math.random() * 5,
          wobble: 25,
          rotation: 0,
          spin: (Math.random() - 0.5) * 1
        });
      }
      if (shouldSpawn('hal-bat', 500)){
        var startLeft = Math.random() > 0.5;
        addParticle({
          x: startLeft ? -30 : state.viewportW + 30,
          y: 50 + Math.random() * 250,
          vx: (startLeft ? 1 : -1) * (80 + Math.random() * 60),
          vy: (Math.random() - 0.5) * 50,
          gravity: 0,
          size: 20 + Math.random() * 12,
          emoji: '🦇',
          maxLife: 15,
          rotation: 0,
          spin: 0,
          wobble: 40
        });
      }
    },
    // ═══ GIÁNG SINH ═══
    christmas: function(){
      if (shouldSpawn('xmas-snow', 100)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -10,
          vx: (Math.random() - 0.5) * 20,
          vy: 30 + Math.random() * 50,
          gravity: 8,
          size: 3 + Math.random() * 7,
          color: '#ffffff',
          shape: 'circle',
          maxLife: 12 + Math.random() * 5,
          wobble: 20
        });
      }
      if (shouldSpawn('xmas-star', 400)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: Math.random() * state.viewportH,
          vx: 0, vy: 0,
          size: 4 + Math.random() * 6,
          color: '#FFE8A0',
          shape: 'star',
          rotation: 0,
          spin: 1,
          maxLife: 2
        });
      }
    },
    // ═══ TẾT DƯƠNG ═══
    newyear: function(){
      if (shouldSpawn('ny-firework', 1200)){
        var colors = ['gold','pink','purple','blue'];
        launchFirework(colors[Math.floor(Math.random() * colors.length)], Math.random() * state.viewportW, 80 + Math.random() * 300);
      }
      if (shouldSpawn('ny-confetti', 200)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -20,
          vx: (Math.random() - 0.5) * 60,
          vy: 80 + Math.random() * 80,
          gravity: 30,
          size: 5 + Math.random() * 5,
          color: ['#FFD700','#FF1493','#8B00FF','#00FFFF','#FF6B35'][Math.floor(Math.random() * 5)],
          shape: 'rect',
          maxLife: 8 + Math.random() * 3,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 4,
          wobble: 15
        });
      }
    },
    // ═══ MÙA XUÂN ═══
    spring: function(){
      if (shouldSpawn('spring-petal', 200)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -20,
          vx: (Math.random() - 0.5) * 30,
          vy: 40 + Math.random() * 40,
          gravity: 10,
          size: 14 + Math.random() * 12,
          emoji: ['🌸','🌺','🌷','🌼','🦋','🐝'][Math.floor(Math.random() * 6)],
          maxLife: 12 + Math.random() * 6,
          wobble: 45,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 2
        });
      }
    },
    // ═══ MÙA HÈ ═══
    summer: function(){
      if (shouldSpawn('summer-bubble', 300)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: state.viewportH + 30,
          vx: (Math.random() - 0.5) * 15,
          vy: -40 - Math.random() * 40,
          gravity: -3,
          size: 4 + Math.random() * 10,
          color: 'rgba(150,220,255,' + (0.5 + Math.random() * 0.5) + ')',
          shape: 'circle',
          maxLife: 8 + Math.random() * 4,
          wobble: 30
        });
      }
      if (shouldSpawn('summer-leaf', 800)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -30,
          vx: (Math.random() - 0.5) * 30,
          vy: 40 + Math.random() * 30,
          gravity: 15,
          size: 20 + Math.random() * 12,
          emoji: ['🌴','🥥','🍹'][Math.floor(Math.random() * 3)],
          maxLife: 12,
          wobble: 35,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 1.5
        });
      }
    },
    // ═══ MÙA THU ═══
    autumn: function(){
      if (shouldSpawn('autumn-leaf', 200)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -30,
          vx: (Math.random() - 0.5) * 40,
          vy: 40 + Math.random() * 50,
          gravity: 12,
          size: 18 + Math.random() * 14,
          emoji: ['🍂','🍁','🌾','🍄'][Math.floor(Math.random() * 4)],
          maxLife: 12 + Math.random() * 6,
          wobble: 50,
          rotation: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 3
        });
      }
    },
    // ═══ MÙA ĐÔNG ═══
    winter: function(){
      if (shouldSpawn('winter-snow', 80)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: -10,
          vx: (Math.random() - 0.5) * 25,
          vy: 40 + Math.random() * 60,
          gravity: 12,
          size: 3 + Math.random() * 7,
          color: '#ffffff',
          shape: 'circle',
          maxLife: 12 + Math.random() * 5,
          wobble: 25
        });
      }
      if (shouldSpawn('winter-glow', 400)){
        addParticle({
          x: Math.random() * state.viewportW,
          y: Math.random() * state.viewportH,
          vx: 0, vy: 0,
          size: 5 + Math.random() * 8,
          color: '#c8e8ff',
          shape: 'star',
          rotation: 0,
          spin: 1.5,
          maxLife: 3
        });
      }
    }
  };

  // ═══════ FIREWORK ═══════
  function launchFirework(colorKey, x, y){
    var palettes = {
      gold:   ['#FFD700','#FFA500','#FF6B35','#FFE58F'],
      pink:   ['#FF1493','#FF6B9D','#FFB6C1','#FF80AB'],
      purple: ['#8B00FF','#B366FF','#DA70D6','#E0B0FF'],
      blue:   ['#00BFFF','#4ECDC4','#87CEEB','#00FFFF']
    };
    var colors = palettes[colorKey] || palettes.gold;
    // Trail rocket
    addParticle({
      x: x, y: state.viewportH,
      vx: 0, vy: -600,
      gravity: 200,
      size: 3,
      color: '#fff',
      shape: 'circle',
      maxLife: 1
    });
    // Explosion at target y
    setTimeout(function(){
      var count = 50 + Math.floor(Math.random() * 40);
      var baseSize = 4 + Math.random() * 3;
      for (var i = 0; i < count; i++){
        var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        var speed = 100 + Math.random() * 250;
        addParticle({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 120,
          drag: 0.96,
          size: baseSize + Math.random() * 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: 'circle',
          maxLife: 1.2 + Math.random() * 1.3
        });
      }
      // Extra sparks
      for (var j = 0; j < 20; j++){
        addParticle({
          x: x, y: y,
          vx: (Math.random() - 0.5) * 300,
          vy: (Math.random() - 0.5) * 300,
          gravity: 80,
          drag: 0.94,
          size: 8 + Math.random() * 6,
          color: '#fff',
          shape: 'spark',
          maxLife: 0.8 + Math.random() * 0.6
        });
      }
    }, 600 + Math.random() * 200);
  }

  // ═══════ CLEAR ═══════
  function clearAll(){
    state.particles = [];
    if (state.ctx && state.canvas){
      state.ctx.clearRect(0, 0, state.viewportW, state.viewportH);
    }
    spawnTimers = {};
    document.body.className = document.body.className.split(' ').filter(function(c){
      return c.indexOf('theme-') !== 0;
    }).join(' ');
    var aurora = document.getElementById('theme-aurora');
    var rays = document.getElementById('theme-godrays');
    var vig = document.getElementById('theme-vignette');
    if (aurora) aurora.classList.remove('on');
    if (rays) rays.classList.remove('on');
    if (vig) vig.classList.remove('on');
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

  function applyTheme(key){
    if (!THEMES[key]) key = 'default';
    clearAll();
     document.querySelectorAll('.theme-orn').forEach(function(el){ el.remove(); });
    state.currentTheme = key;
    if (key === 'default'){
      showBadge(null);
      if (state.rafId) cancelAnimationFrame(state.rafId);
      return;
    }
    ensureLayers();
    document.body.classList.add('theme-' + key);
     decorateAreaCards(key);
    var aurora = document.getElementById('theme-aurora');
    var rays = document.getElementById('theme-godrays');
    var vig = document.getElementById('theme-vignette');
    if (aurora) aurora.classList.add('on');
    if (rays) rays.classList.add('on');
    if (vig) vig.classList.add('on');
    showBadge(key);
    if (!state.rafId){
      state.lastSpawn = performance.now();
      tickLoop();
    }
  }

// ═══════ FIREBASE (realtime, có auth) ═══════
var themeApp = null;
var themeUnsubscribe = null;

function fetchThemeFromFirebase(){
  Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
  ]).then(function(mods){
    try {
      themeApp = mods[0].getApp('theme-app');
    } catch(e){
      themeApp = mods[0].initializeApp(FIREBASE_CONFIG, 'theme-app');
    }
    var auth = mods[1].getAuth(themeApp);
    var db = mods[2].getFirestore(themeApp);

    function startListener(){
      if (themeUnsubscribe) themeUnsubscribe();
      var ref = mods[2].doc(db, 'master_config', 'theme');
      themeUnsubscribe = mods[2].onSnapshot(ref, function(snap){
        var key = 'auto';
        if (snap.exists()){
          var data = snap.data();
          key = data.themeKey || data.theme || 'auto';
        }
        console.log('[Theme] Firestore says:', key);
        if (key === 'auto' || !THEMES[key]) applyTheme(detectThemeByDate());
        else applyTheme(key);
      }, function(err){
        console.warn('[Theme] Listen error:', err);
        applyTheme(detectThemeByDate());
      });
    }

    if (auth.currentUser) startListener();
    else mods[1].signInAnonymously(auth)
      .then(startListener)
      .catch(function(err){
        console.warn('[Theme] Auth error:', err);
        applyTheme(detectThemeByDate());
      });
  }).catch(function(err){
    console.warn('[Theme] Firebase init fail:', err);
    applyTheme(detectThemeByDate());
  });
}

  function init(){
    injectStyles();
    var urlParams = new URLSearchParams(location.search);
    var urlTheme = urlParams.get('theme');
    if (urlTheme && THEMES[urlTheme]){
      applyTheme(urlTheme);
      return;
    }
   fetchThemeFromFirebase();
// Không cần setInterval — onSnapshot tự realtime
  }

// ═══════ DECORATE AREA CARDS ═══════
function decorateAreaCards(themeKey){
  var cards = document.querySelectorAll('.area-card');
  var ornMap = {
    tet:          ['🧧','🌸'],
    valentine:    ['💕','🌹'],
    womenday:     ['🌹','💮'],
    reunification:['⭐','🎆'],
    children:     ['🎁','🍭'],
    nationalday:  ['⭐','🎆'],
    midautumn:    ['🏮','🥮'],
    halloween:    ['👻','🕷️'],
    christmas:    ['❄️','🎅'],
    newyear:      ['🥂','✨'],
    spring:       ['🦋','🌺'],
    summer:       ['🍹','🥥'],
    autumn:       ['🌾','🍄'],
    winter:       ['❄️','🌨️']
  };
  var orns = ornMap[themeKey] || ['',''];

  cards.forEach(function(card){
    // Xóa decoration cũ
    card.querySelectorAll('.theme-orn').forEach(function(el){ el.remove(); });
    if (themeKey === 'default') return;

    // Chèn 2 emoji — dùng setTimeout để đảm bảo sau khi DOM sẵn sàng
    var tl = document.createElement('span');
    tl.className = 'theme-orn theme-orn-tl';
    tl.textContent = orns[0];
    card.appendChild(tl);

    var br = document.createElement('span');
    br.className = 'theme-orn theme-orn-br';
    br.textContent = orns[1];
    card.appendChild(br);
  });
}
   window.ThemeSystem = {
    setTheme: function(key){ applyTheme(key); },
    getCurrent: function(){ return state.currentTheme; },
    listThemes: function(){ return Object.keys(THEMES); },
    detect: detectThemeByDate,
    getThemes: function(){ return THEMES; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  console.log('%c🎨 THEME SYSTEM v3 WOW EDITION LOADED', 'background:linear-gradient(90deg,#FFD700,#FF1493);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
