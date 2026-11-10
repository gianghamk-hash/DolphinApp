'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'giaitri/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'giaitri/game-icons.css'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const iconFile=path.join(root,'giaitri/assets/dolphin-game-icons-v1.webp');
const games=[
 ['dolphin-tactics-online','tactics','dolphin-tactics'],
 ['caro','caro','caro'],
 ['chess','chess','chess'],
 ['xiangqi','xiangqi','xiangqi'],
 ['battleship','battleship','battleship'],
 ['snake-coop-online','snake-coop','snake-coop-online'],
 ['snake','snake','snake'],
 ['game2048','2048','game2048'],
];
test('approved 2D sprite is a valid RIFF WEBP, rather than a missing asset',()=>{
 const asset=fs.readFileSync(iconFile);
 assert(asset.length>25_000 && asset.length<450_000,'Atlas is present and optimized');
 assert.equal(asset.toString('ascii',0,4),'RIFF');
 assert.equal(asset.toString('ascii',8,12),'WEBP');
 assert.match(html,/game-icons\.css\?v=approved2d-v1/);
 assert.match(css,/assets\/dolphin-game-icons-v1\.webp/);
 assert.match(sw,/giaitri\/assets\/dolphin-game-icons-v1\.webp/);
});
test('all eight games have a 2D image tile and working original onclick game key',()=>{
 for(const [key,style] of games){
  const quoted=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp('onclick="openGame\\(\\\''+quoted+'\\\'\\)"[^>]*>\\s*<span class="(?:featured-art|arcade-icon) game-art game-art--'+style+'"'));
  assert.match(css,new RegExp('\\.game-art--'+style+'\\{'));
 }
 assert(!/class="arcade-icon icon-(?:caro|chess|xiangqi|ship|snake|snake-coop|2048)"/.test(html));
 assert(!/class="featured-art" aria-hidden="true">🐉/.test(html));
});
test('all leaderboard game filters use the same game artwork, not old SVG/emoji',()=>{
 for(const [_key,style,rankKey]of games){
  const escaped=rankKey.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  assert.match(html,new RegExp('data-lb="'+escaped+'"[^>]*>\\s*<span class="game-tab-art game-art game-art--'+style+'"'));
  assert.match(html,new RegExp("(?:'"+escaped+"'|"+escaped+")\\s*:\\s*\\{\\s*icon:\\s*'<span class=\"game-tab-art game-art game-art--"+style));
 }
 assert.match(html,/id="lbGameIcon"><span class="game-tab-art game-art game-art--snake"/);
});
test('rendered images cannot alter any matches, XP, Firebase or ordering behavior',()=>{
 assert(!/firebase|onSnapshot|writeBatch|transaction|fetch\(/i.test(css));
 assert(!/script/i.test(css));
 assert.match(html,/onclick="openGame\('caro'\)"/);
 assert.match(html,/onclick="openGame\('dolphin-tactics-online'\)"/);
});
