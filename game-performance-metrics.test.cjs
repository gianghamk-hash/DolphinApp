'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const metrics=require('./game-performance-metrics.js');
test('Sprint 3 reports measured browser render callbacks, not synthetic network FPS',()=>{
 metrics.reset();metrics.start('tft-render');
 for(let i=0;i<101;i++)metrics.frame('tft-render',i*1000/30);
 const r=metrics.report('tft-render');
 assert.equal(r.source,'browser-render-callbacks');
 assert.equal(r.frames,101);
 assert.equal(r.intervalSamples,100);
 assert.ok(Math.abs(r.fps-30)<.15);
 assert.ok(Math.abs(r.p95FrameMs-1000/30)<1e-8);
 assert.equal(r.longFrames,0);
});
test('Sprint 3 FPS probe bounds memory, rejects duplicate timestamps and exposes a dropped-frame tail',()=>{
 metrics.reset();metrics.start('snake-head-interpolation');
 metrics.frame('snake-head-interpolation',100);
 metrics.frame('snake-head-interpolation',100);
 metrics.frame('snake-head-interpolation',99);
 for(let i=1;i<=750;i++)metrics.frame('snake-head-interpolation',100+i*16.7);
 const report=metrics.report('snake-head-interpolation');
 assert.equal(report.frames,metrics.MAX_FRAMES);
 assert.equal(report.intervalSamples,metrics.MAX_FRAMES-1);
 assert.ok(report.fps>58&&report.fps<61);
 metrics.frame('snake-head-interpolation',100+751*16.7+250);
 assert.ok(metrics.report('snake-head-interpolation').longFrames>=1);
 metrics.reset('snake-head-interpolation');
 assert.equal(metrics.report('snake-head-interpolation').fps,null);
});
test('Sprint 3 FPS probe is wired to actual Snake and TFT draw callbacks',()=>{
 const snake=fs.readFileSync('giaitri/games/snake-coop-online.html','utf8');
 const tft=fs.readFileSync('giaitri/games/tactics-online/index.html','utf8');
 assert.match(snake,/DolphinRenderMetrics\?\.frame\('snake-head-interpolation',now\)/);
 assert.match(tft,/renderer\.render\(stageScene,camera\);window\.DolphinRenderMetrics\?\.frame\('tft-render',now\)/);
 assert.match(snake,/game-performance-metrics\.js\?v=sprint3-20261112/);
 assert.match(tft,/game-performance-metrics\.js\?v=sprint3-20261112/);
});
