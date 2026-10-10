/* ============================================================
   THEME SYSTEM v3 — CLEAN BUILD
   - 15 themes + Halong Clock integration
   - Emoji via JS (no emoji in CSS)
   - ASCII only in CSS
   ============================================================ */
(function(){
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAtBNp9WBnyIkCiVjXfUpjH2d7-9dbg-JQ",
    authDomain: "dolphin-f6d67.firebaseapp.com",
    projectId: "dolphin-f6d67"
  };

  var THEMES = {
    default:      { name: 'Dolphin (Mac dinh)', icon: '🐬', ranges: null, badge: 'DOLPHIN', color: ['#6fc3bf','#123634'] },
    tet:          { name: 'Tet Nguyen Dan',     icon: '🌸', ranges: [[1,15],[2,20]], badge: 'TET', color: ['#FF6B35','#8B1A1A'] },
    valentine:    { name: 'Valentine',          icon: '💖', ranges: [[2,10],[2,15]], badge: 'VALENTINE', color: ['#FF4D6D','#7a1030'] },
    womenday:     { name: 'Quoc Te Phu Nu',     icon: '🌹', ranges: [[3,5],[3,10]], badge: '8/3', color: ['#D946A6','#5a105a'] },
    reunification:{ name: '30/4 Thong Nhat',    icon: '🇻🇳', ranges: [[4,28],[5,3]], badge: '30/4', color: ['#DA251D','#8b0000'] },
    children:     { name: 'Tet Thieu Nhi',      icon: '🎈', ranges: [[5,25],[6,5]], badge: '1/6', color: ['#4ECDC4','#FF6B9D'] },
    nationalday:  { name: 'Quoc Khanh',         icon: '🇻🇳', ranges: [[8,30],[9,3]], badge: '2/9', color: ['#DA251D','#FFD700'] },
    midautumn:    { name: 'Trung Thu',          icon: '🏮', ranges: [[9,10],[10,5]], badge: 'TRUNG THU', color: ['#f0c060','#5a1a3a'] },
    halloween:    { name: 'Halloween',          icon: '🎃', ranges: [[10,25],[11,1]], badge: 'HALLOWEEN', color: ['#ff9500','#2a0a3a'] },
    christmas:    { name: 'Giang Sinh',         icon: '🎄', ranges: [[12,15],[12,26]], badge: 'NOEL', color: ['#c41e3a','#0a7d3d'] },
    newyear:      { name: 'Tet Duong Lich',     icon: '🎊', ranges: [[12,29],[1,2]], badge: 'NEW YEAR', color: ['#FFD700','#8B00FF'] },
    spring:       { name: 'Mua Xuan',           icon: '🌸', months: [3,4,5], badge: 'SPRING', color: ['#FFB6C1','#4ECDC4'] },
    summer:       { name: 'Mua He',             icon: '☀️', months: [6,7,8], badge: 'SUMMER', color: ['#FFB000','#1a4a8a'] },
    autumn:       { name: 'Mua Thu',            icon: '🍂', months: [9,10,11], badge: 'AUTUMN', color: ['#D2691E','#5a3010'] },
    winter:       { name: 'Mua Dong',           icon: '❄️', months: [12,1,2], badge: 'WINTER', color: ['#B8D8F0','#0a1428'] }
  };

  var EMOJI = {
    default:      { icon:'🕐', loc:'📍', ann:'📢', annRight:'✨', cardTL:'', cardBR:'' },
    tet:          { icon:'🧧', loc:'🏮', ann:'🧧', annRight:'🏮', cardTL:'🧧', cardBR:'🌸' },
    valentine:    { icon:'💝', loc:'💖', ann:'💝', annRight:'💖', cardTL:'💕', cardBR:'🌹' },
    womenday:     { icon:'🌷', loc:'🌹', ann:'🌷', annRight:'💐', cardTL:'🌹', cardBR:'💮' },
    reunification:{ icon:'⭐', loc:'🇻🇳', ann:'⭐', annRight:'🇻🇳', cardTL:'⭐', cardBR:'🎆' },
    children:     { icon:'🎈', loc:'🎉', ann:'🎈', annRight:'🎉', cardTL:'🎁', cardBR:'🍭' },
    nationalday:  { icon:'⭐', loc:'🇻🇳', ann:'⭐', annRight:'🇻🇳', cardTL:'⭐', cardBR:'🎆' },
    midautumn:    { icon:'🏮', loc:'🌕', ann:'🏮', annRight:'🌕', cardTL:'🏮', cardBR:'🥮' },
    halloween:    { icon:'🎃', loc:'🦇', ann:'🎃', annRight:'🦇', cardTL:'👻', cardBR:'🕷️' },
    christmas:    { icon:'🎄', loc:'🎁', ann:'🎄', annRight:'🎁', cardTL:'❄️', cardBR:'🎅' },
    newyear:      { icon:'🎊', loc:'🎆', ann:'🎊', annRight:'🎆', cardTL:'🥂', cardBR:'✨' },
    spring:       { icon:'🌸', loc:'🦋', ann:'🌸', annRight:'🌷', cardTL:'🦋', cardBR:'🌺' },
    summer:       { icon:'☀️', loc:'🌴', ann:'☀️', annRight:'🌴', cardTL:'🍹', cardBR:'🥥' },
    autumn:       { icon:'🍁', loc:'🍂', ann:'🍁', annRight:'🍂', cardTL:'🌾', cardBR:'🍄' },
    winter:       { icon:'❄️', loc:'⛄', ann:'❄️', annRight:'⛄', cardTL:'❄️', cardBR:'🌨️' }
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

  function injectStyles(){
    if (document.getElementById('theme-styles')) return;
    var s = document.createElement('style');
    s.id = 'theme-styles';
    s.textContent = [
      '#themeCanvas{position:fixed;inset:0;pointer-events:none;z-index:2}',
      '#theme-vignette{position:fixed;inset:0;pointer-events:none;z-index:3;opacity:0;transition:opacity 1s}',
      '#theme-vignette.on{opacity:1}',
      '#theme-aurora{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:0;transition:opacity 2s;mix-blend-mode:screen}',
      '#theme-aurora.on{opacity:1}',
      'body[class*="theme-"] .area-card{border-width:2px}',
      'body[class*="theme-"] .area-card .theme-orn{position:absolute;font-size:22px;line-height:1;pointer-events:none;z-index:4;opacity:.85;transition:opacity .4s;animation:orn-float 3s ease-in-out infinite}',
      'body[class*="theme-"] .area-card .theme-orn-tl{top:10px;left:10px}',
      'body[class*="theme-"] .area-card .theme-orn-br{bottom:10px;right:10px;animation-delay:-1.5s}',
      'body[class*="theme-"] .area-card:hover .theme-orn{opacity:1;font-size:26px}',
      '@keyframes orn-float{0%,100%{transform:translateY(0) rotate(-6deg) scale(1)}50%{transform:translateY(-6px) rotate(6deg) scale(1.1)}}',
      '#themeBadge{position:fixed;top:8px;left:8px;z-index:9998;display:flex;align-items:center;gap:6px;padding:6px 12px;background:rgba(10,31,29,.9);border:1px solid rgba(244,184,66,.5);border-radius:999px;font-size:11px;font-weight:900;color:#FBD77A;font-family:Nunito,sans-serif;backdrop-filter:blur(10px);pointer-events:none;opacity:0;transition:opacity .5s}',
      '#themeBadge.show{opacity:1}',
      '#themeBadge .tb-icon{font-size:14px}',
      'body[class*="theme-"] #halongClock{border-width:2px}',
      'body[class*="theme-"] #halongClock .hclock-time{transition:color .5s}',
      'body[class*="theme-"] #halongClock .hclock-loc-text{transition:color .5s}',
      'body.theme-tet{background:#2a0e0e!important}',
      'body.theme-valentine{background:#2a0a1a!important}',
      'body.theme-womenday{background:#2a1030!important}',
      'body.theme-reunification{background:#1a0505!important}',
      'body.theme-children{background:#0e1e3a!important}',
      'body.theme-nationalday{background:#1a0505!important}',
      'body.theme-midautumn{background:#1a0e2a!important}',
      'body.theme-halloween{background:#080308!important}',
      'body.theme-christmas{background:#0a1a2e!important}',
      'body.theme-newyear{background:#08081a!important}',
      'body.theme-spring{background:#1a2a1a!important}',
      'body.theme-summer{background:#0a1a3a!important}',
      'body.theme-autumn{background:#2a1505!important}',
      'body.theme-winter{background:#0a1428!important}',
      '@media(max-width:768px){#themeBadge{font-size:9.5px;padding:4px 9px;top:6px;left:6px}#themeBadge .tb-icon{font-size:12px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function ensureLayers(){
    var layers = ['theme-aurora','themeCanvas','theme-vignette'];
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

    for (var i = state.particles.length - 1; i >= 0; i--){
      var p = state.particles[i];
      p.update(dt);
      p.draw(ctx);
      if (p.life <= 0 || p.y > state.viewportH + 100){
        state.particles.splice(i, 1);
      }
    }

    var theme = state.currentTheme;
    if (theme !== 'default' && SPAWNERS[theme]) SPAWNERS[theme](dt);

    if (state.particles.length > 500){
      state.particles.splice(0, state.particles.length - 500);
    }

    state.rafId = requestAnimationFrame(tickLoop);
  }

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
    tet: function(){
      if (shouldSpawn('tet-flower', 250)) addParticle({x:Math.random()*state.viewportW,y:-30,vx:(Math.random()-0.5)*30,vy:60+Math.random()*60,gravity:15,size:18+Math.random()*14,emoji:['🌸','🌼','💮','🏵️'][Math.floor(Math.random()*4)],maxLife:12+Math.random()*6,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*2,wobble:30});
      if (shouldSpawn('tet-fw', 2500)) launchFirework('gold', Math.random()*state.viewportW, 100+Math.random()*200);
    },
    valentine: function(){
      if (shouldSpawn('val-heart', 300)) addParticle({x:Math.random()*state.viewportW,y:-30,vx:(Math.random()-0.5)*40,vy:60+Math.random()*50,gravity:10,size:16+Math.random()*14,emoji:['💖','💕','💗','❤️','🌹','💝'][Math.floor(Math.random()*6)],maxLife:10+Math.random()*5,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*1.5,wobble:40});
    },
    womenday: function(){
      if (shouldSpawn('wom-flower', 250)) addParticle({x:Math.random()*state.viewportW,y:-30,vx:(Math.random()-0.5)*30,vy:50+Math.random()*50,gravity:12,size:18+Math.random()*14,emoji:['🌹','🌷','💐','🌸','💮','🌺'][Math.floor(Math.random()*6)],maxLife:11+Math.random()*5,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*1.8,wobble:35});
    },
    reunification: function(){
      if (shouldSpawn('reun-star', 150)) addParticle({x:Math.random()*state.viewportW,y:Math.random()*state.viewportH,vx:(Math.random()-0.5)*10,vy:(Math.random()-0.5)*10,size:6+Math.random()*10,color:'#FFD700',shape:'star',rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*2,maxLife:3+Math.random()*2});
    },
    children: function(){
      if (shouldSpawn('child-b', 400)) addParticle({x:Math.random()*state.viewportW,y:state.viewportH+40,vx:(Math.random()-0.5)*30,vy:-50-Math.random()*50,gravity:-5,size:24+Math.random()*20,emoji:['🎈','🎉','🎊','🎁','🍭','🍬','🎨','🎠'][Math.floor(Math.random()*8)],maxLife:12+Math.random()*6,rotation:(Math.random()-0.5)*0.3,spin:(Math.random()-0.5),wobble:25});
    },
    nationalday: function(){
      if (shouldSpawn('nat-star', 100)) addParticle({x:Math.random()*state.viewportW,y:Math.random()*state.viewportH,vx:(Math.random()-0.5)*15,vy:(Math.random()-0.5)*15,size:8+Math.random()*14,color:'#FFD700',shape:'star',rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*3,maxLife:2.5+Math.random()*2});
      if (shouldSpawn('nat-fw', 1800)) launchFirework('gold', Math.random()*state.viewportW, 100+Math.random()*250);
    },
    midautumn: function(){
      if (shouldSpawn('mid-star', 120)) addParticle({x:Math.random()*state.viewportW,y:Math.random()*state.viewportH*0.7,size:4+Math.random()*8,color:'#FFE8A0',shape:'star',rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*2,maxLife:3+Math.random()*2});
      if (shouldSpawn('mid-lantern', 700)) addParticle({x:Math.random()*state.viewportW,y:state.viewportH+40,vx:(Math.random()-0.5)*20,vy:-25-Math.random()*25,gravity:-3,size:24+Math.random()*16,emoji:['🏮','🎐','🌟'][Math.floor(Math.random()*3)],maxLife:15+Math.random()*8,wobble:15,spin:(Math.random()-0.5)*0.8});
    },
    halloween: function(){
      if (shouldSpawn('hal-p', 900)) addParticle({x:Math.random()*state.viewportW,y:state.viewportH+40,vx:(Math.random()-0.5)*20,vy:-20-Math.random()*30,gravity:-2,size:22+Math.random()*18,emoji:['🎃','👻','🕷️','🕸️'][Math.floor(Math.random()*4)],maxLife:10+Math.random()*5,wobble:25,spin:(Math.random()-0.5)});
      if (shouldSpawn('hal-bat', 500)){
        var L = Math.random() > 0.5;
        addParticle({x:L?-30:state.viewportW+30,y:50+Math.random()*250,vx:(L?1:-1)*(80+Math.random()*60),vy:(Math.random()-0.5)*50,size:20+Math.random()*12,emoji:'🦇',maxLife:15,wobble:40});
      }
    },
    christmas: function(){
      if (shouldSpawn('xmas-snow', 100)) addParticle({x:Math.random()*state.viewportW,y:-10,vx:(Math.random()-0.5)*20,vy:30+Math.random()*50,gravity:8,size:3+Math.random()*7,color:'#fff',shape:'circle',maxLife:12+Math.random()*5,wobble:20});
      if (shouldSpawn('xmas-star', 400)) addParticle({x:Math.random()*state.viewportW,y:Math.random()*state.viewportH,size:4+Math.random()*6,color:'#FFE8A0',shape:'star',spin:1,maxLife:2});
    },
    newyear: function(){
      if (shouldSpawn('ny-fw', 1200)){ var C=['gold','pink','purple','blue']; launchFirework(C[Math.floor(Math.random()*C.length)], Math.random()*state.viewportW, 80+Math.random()*300); }
      if (shouldSpawn('ny-conf', 200)) addParticle({x:Math.random()*state.viewportW,y:-20,vx:(Math.random()-0.5)*60,vy:80+Math.random()*80,gravity:30,size:5+Math.random()*5,color:['#FFD700','#FF1493','#8B00FF','#00FFFF','#FF6B35'][Math.floor(Math.random()*5)],shape:'rect',maxLife:8+Math.random()*3,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*4,wobble:15});
    },
    spring: function(){
      if (shouldSpawn('spr-p', 200)) addParticle({x:Math.random()*state.viewportW,y:-20,vx:(Math.random()-0.5)*30,vy:40+Math.random()*40,gravity:10,size:14+Math.random()*12,emoji:['🌸','🌺','🌷','🌼','🦋','🐝'][Math.floor(Math.random()*6)],maxLife:12+Math.random()*6,wobble:45,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*2});
    },
    summer: function(){
      if (shouldSpawn('sum-bub', 300)) addParticle({x:Math.random()*state.viewportW,y:state.viewportH+30,vx:(Math.random()-0.5)*15,vy:-40-Math.random()*40,gravity:-3,size:4+Math.random()*10,color:'rgba(150,220,255,'+(0.5+Math.random()*0.5)+')',shape:'circle',maxLife:8+Math.random()*4,wobble:30});
      if (shouldSpawn('sum-leaf', 800)) addParticle({x:Math.random()*state.viewportW,y:-30,vx:(Math.random()-0.5)*30,vy:40+Math.random()*30,gravity:15,size:20+Math.random()*12,emoji:['🌴','🥥','🍹'][Math.floor(Math.random()*3)],maxLife:12,wobble:35,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*1.5});
    },
    autumn: function(){
      if (shouldSpawn('aut-leaf', 200)) addParticle({x:Math.random()*state.viewportW,y:-30,vx:(Math.random()-0.5)*40,vy:40+Math.random()*50,gravity:12,size:18+Math.random()*14,emoji:['🍂','🍁','🌾','🍄'][Math.floor(Math.random()*4)],maxLife:12+Math.random()*6,wobble:50,rotation:Math.random()*Math.PI,spin:(Math.random()-0.5)*3});
    },
    winter: function(){
      if (shouldSpawn('win-snow', 80)) addParticle({x:Math.random()*state.viewportW,y:-10,vx:(Math.random()-0.5)*25,vy:40+Math.random()*60,gravity:12,size:3+Math.random()*7,color:'#fff',shape:'circle',maxLife:12+Math.random()*5,wobble:25});
      if (shouldSpawn('win-glow', 400)) addParticle({x:Math.random()*state.viewportW,y:Math.random()*state.viewportH,size:5+Math.random()*8,color:'#c8e8ff',shape:'star',spin:1.5,maxLife:3});
    }
  };

  function launchFirework(colorKey, x, y){
    var palettes = {
      gold:   ['#FFD700','#FFA500','#FF6B35','#FFE58F'],
      pink:   ['#FF1493','#FF6B9D','#FFB6C1','#FF80AB'],
      purple: ['#8B00FF','#B366FF','#DA70D6','#E0B0FF'],
      blue:   ['#00BFFF','#4ECDC4','#87CEEB','#00FFFF']
    };
    var colors = palettes[colorKey] || palettes.gold;
    addParticle({x:x,y:state.viewportH,vx:0,vy:-600,gravity:200,size:3,color:'#fff',shape:'circle',maxLife:1});
    setTimeout(function(){
      var count = 50 + Math.floor(Math.random() * 40);
      for (var i = 0; i < count; i++){
        var angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
        var speed = 100 + Math.random() * 250;
        addParticle({x:x,y:y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,gravity:120,drag:0.96,size:4+Math.random()*6,color:colors[Math.floor(Math.random()*colors.length)],shape:'circle',maxLife:1.2+Math.random()*1.3});
      }
      for (var j = 0; j < 20; j++){
        addParticle({x:x,y:y,vx:(Math.random()-0.5)*300,vy:(Math.random()-0.5)*300,gravity:80,drag:0.94,size:8+Math.random()*6,color:'#fff',shape:'spark',maxLife:0.8+Math.random()*0.6});
      }
    }, 600 + Math.random() * 200);
  }

  function clearAll(){
    state.particles = [];
    if (state.ctx && state.canvas) state.ctx.clearRect(0, 0, state.viewportW, state.viewportH);
    spawnTimers = {};
    document.body.className = document.body.className.split(' ').filter(function(c){
      return c.indexOf('theme-') !== 0;
    }).join(' ');
    var aurora = document.getElementById('theme-aurora');
    var vig = document.getElementById('theme-vignette');
    if (aurora) aurora.classList.remove('on');
    if (vig) vig.classList.remove('on');
  }

  function showBadge(theme){
    var b = document.getElementById('themeBadge');
    if (!b){ b = document.createElement('div'); b.id = 'themeBadge'; document.body.appendChild(b); }
    if (!theme || theme === 'default'){ b.classList.remove('show'); return; }
    var t = THEMES[theme];
    b.innerHTML = '<span class="tb-icon">' + t.icon + '</span><span>' + t.badge + '</span>';
    b.classList.add('show');
  }

  function decorateAreaCards(themeKey){
    var cards = document.querySelectorAll('.area-card');
    var e = EMOJI[themeKey] || EMOJI.default;
    cards.forEach(function(card){
      card.querySelectorAll('.theme-orn').forEach(function(el){ el.remove(); });
      if (themeKey === 'default' || (!e.cardTL && !e.cardBR)) return;
      if (e.cardTL){
        var tl = document.createElement('span');
        tl.className = 'theme-orn theme-orn-tl';
        tl.textContent = e.cardTL;
        card.appendChild(tl);
      }
      if (e.cardBR){
        var br = document.createElement('span');
        br.className = 'theme-orn theme-orn-br';
        br.textContent = e.cardBR;
        card.appendChild(br);
      }
    });
  }

  function decorateUI(themeKey){
    var e = EMOJI[themeKey] || EMOJI.default;
    var icon = document.querySelector('#halongClock .hclock-icon');
    if (icon) icon.textContent = e.icon;
    var loc = document.querySelector('#halongClock .hclock-loc-icon');
    if (loc) loc.textContent = e.loc;
    var annIcon = document.querySelector('#announcementBar .announcement-icon');
    if (annIcon) annIcon.textContent = e.ann;
    var annBar = document.getElementById('announcementBar');
    if (annBar){
      var old = annBar.querySelector('.ann-emoji-right');
      if (old) old.remove();
      if (themeKey !== 'default'){
        var sp = document.createElement('span');
        sp.className = 'ann-emoji-right';
        sp.textContent = e.annRight;
        sp.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:20px;z-index:6;pointer-events:none;';
        annBar.appendChild(sp);
      }
    }
  }

  function applyTheme(key){
    if (!THEMES[key]) key = 'default';
    clearAll();
    document.querySelectorAll('.theme-orn').forEach(function(el){ el.remove(); });
    state.currentTheme = key;
    if (key === 'default'){
      showBadge(null);
      decorateUI('default');
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      return;
    }
    ensureLayers();
    document.body.classList.add('theme-' + key);
    decorateAreaCards(key);
    decorateUI(key);
    var aurora = document.getElementById('theme-aurora');
    var vig = document.getElementById('theme-vignette');
    if (aurora) aurora.classList.add('on');
    if (vig) vig.classList.add('on');
    showBadge(key);
    if (!state.rafId){
      state.lastSpawn = performance.now();
      tickLoop();
    }
  }

  var themeApp = null;
  var themeUnsubscribe = null;

  function fetchThemeFromFirebase(){
    Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
    ]).then(function(mods){
      try { themeApp = mods[0].getApp('theme-app'); }
      catch(e){ themeApp = mods[0].initializeApp(FIREBASE_CONFIG, 'theme-app'); }
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

  console.log('%c🎨 THEME SYSTEM v3 CLEAN BUILD LOADED', 'background:linear-gradient(90deg,#FFD700,#FF1493);color:#fff;font-size:12px;padding:4px 10px;border-radius:4px;font-weight:900');
})();
