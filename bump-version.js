#!/usr/bin/env node
/* ============================================================
   DOLPHIN BUMP VERSION — Auto version manager
   ─────────────────────────────────────────────────────────────
   Cách dùng:
     node bump-version.js patch "Fix lỗi service worker"
     node bump-version.js minor "Thêm moon phase"
     node bump-version.js major "Redesign landing"
     node bump-version.js patch "..." --push
     node bump-version.js patch "..." --dry-run
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* ═══════════ CONFIG ═══════════ */
const ROOT = __dirname;
const FILES = {
  swConfig:    path.join(ROOT, 'sw-config.json'),
  version:     path.join(ROOT, 'version.json'),
  changelog:   path.join(ROOT, 'changelog.json'),
  changelogHx: path.join(ROOT, 'changelog-history.json'),
};

/* File HTML cần bump ?v= */
const HTML_FILES = [
  'index.html',
  'dolphin-bungalow.html',
  'dolphin-lounge.html',
  'dolphin-restaurant.html',
  'dolphin-show.html',
  'ranking/index.html',
  'caro/index.html',
];

/* Regex match ?v= trong script/link tag */
const VERSION_REGEX = /(\?(?:v|version)=)[\d.]+/g;

/* ═══════════ COLORS ═══════════ */
const C = {
  reset:  '\x1b[0m',
  bright: '\x1b[1m',
  red:    '\x1b[31m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
};

function log(msg, color){
  console.log((color || '') + msg + C.reset);
}
function success(msg){ log('✅ ' + msg, C.green); }
function info(msg){    log('ℹ️  ' + msg, C.cyan); }
function warn(msg){    log('⚠️  ' + msg, C.yellow); }
function error(msg){   log('❌ ' + msg, C.red); }

/* ═══════════ UTILS ═══════════ */
function readJSON(file){
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(e){
    error('Không đọc được: ' + file);
    process.exit(1);
  }
}

function writeJSON(file, data){
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function bumpSemver(current, type){
  const m = String(current).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m){
    /* Nếu không phải semver → reset về 1.0.0 */
    return '1.0.0';
  }
  let major = parseInt(m[1], 10);
  let minor = parseInt(m[2], 10);
  let patch = parseInt(m[3], 10);

  switch (type){
    case 'major': major++; minor = 0; patch = 0; break;
    case 'minor': minor++; patch = 0;            break;
    case 'patch': patch++;                       break;
    default: patch++;
  }
  return major + '.' + minor + '.' + patch;
}

/* Bump version ngắn cho HTML (chỉ major.minor) */
function shortVersion(v){
  const m = String(v).match(/^(\d+)\.(\d+)/);
  return m ? (m[1] + '.' + m[2]) : v;
}

function getGitInfo(){
  try {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const msg    = execSync('git log -1 --pretty=%B',       { encoding: 'utf8' }).trim();
    const files  = execSync('git diff --name-only HEAD~1 HEAD 2>nul || echo ""', { encoding: 'utf8' }).trim();
    return { commit, msg, files: files ? files.split('\n').filter(Boolean) : [] };
  } catch(e){
    return { commit: 'local', msg: '', files: [] };
  }
}

/* ═══════════ MAIN ═══════════ */
function main(){
  const args = process.argv.slice(2);
  const type = (args[0] || 'patch').toLowerCase();
  const note = args[1] || 'Update';
  const flags = args.slice(2);
  const isDryRun = flags.includes('--dry-run');
  const shouldPush = flags.includes('--push');
  const skipChangelog = flags.includes('--no-changelog');

  if (!['patch', 'minor', 'major'].includes(type)){
    error('Type không hợp lệ. Dùng: patch | minor | major');
    process.exit(1);
  }

  console.log('');
  log('════════════════════════════════════════════', C.bright);
  log('  🐬 DOLPHIN BUMP VERSION', C.bright);
  log('════════════════════════════════════════════', C.bright);
  console.log('');
  info('Type:     ' + type);
  info('Note:     ' + note);
  info('Dry-run:  ' + (isDryRun ? 'YES' : 'no'));
  info('Push:     ' + (shouldPush ? 'YES' : 'no'));
  console.log('');

  /* ═══════ Đọc version hiện tại ═══════ */
  const swCfg    = readJSON(FILES.swConfig);
  const verFile  = readJSON(FILES.version);
  const chgFile  = readJSON(FILES.changelog);
  const chgHx    = readJSON(FILES.changelogHx);

  const oldVersion = swCfg.version || '0.0.0';
  const newVersion = bumpSemver(oldVersion, type);
  const newShort   = shortVersion(newVersion);

  info('Version:  ' + C.bright + oldVersion + C.reset + ' → ' + C.green + newVersion + C.reset);
  console.log('');

  if (isDryRun){
    warn('DRY-RUN — không ghi file');
    console.log('');
  }

  const now = new Date();
  const isoDate = now.toISOString().split('T')[0];  // YYYY-MM-DD
  const isoFull = now.toISOString();
  const gitInfo = getGitInfo();

  /* ═══════ 1. sw-config.json ═══════ */
  swCfg.version = newVersion;
  swCfg.releaseDate = isoDate;
  swCfg.notes = note;
  if (!isDryRun) writeJSON(FILES.swConfig, swCfg);
  success('sw-config.json → v' + newVersion);

  /* ═══════ 2. version.json ═══════ */
  verFile.version = newVersion;
  verFile.buildDate = isoFull;
  verFile.commit = gitInfo.commit;
  verFile.notes = note;
  if (!isDryRun) writeJSON(FILES.version, verFile);
  success('version.json → v' + newVersion);

  /* ═══════ 3. changelog.json ═══════ */
  if (!skipChangelog){
    const oldChangelog = { ...chgFile };

    chgFile.version = newVersion;
    chgFile.previousVersion = oldVersion;
    chgFile.commit = gitInfo.commit;
    chgFile.previousCommit = oldChangelog.commit || '';
    chgFile.buildDate = isoFull;
    chgFile.summary = note;
    chgFile.changes = {
      totalCommits: (oldChangelog.changes?.totalCommits || 0) + 1,
      filesChanged: gitInfo.files.length || 0,
      insertions: 0,
      deletions: 0
    };
    chgFile.details = [note];
    chgFile.fileChanges = gitInfo.files.map(f => ({
      file: f,
      type: 'update'
    }));

    if (!isDryRun) writeJSON(FILES.changelog, chgFile);
    success('changelog.json → v' + newVersion);

    /* ═══════ 4. changelog-history.json ═══════ */
    /* Push version cũ vào history */
    if (!chgHx.versions) chgHx.versions = [];

    const historyEntry = {
      version: oldVersion,
      releaseDate: oldChangelog.buildDate || isoFull,
      summary: oldChangelog.summary || '',
      details: oldChangelog.details || []
    };

    /* Chỉ thêm nếu chưa có */
    if (!chgHx.versions.find(v => v.version === oldVersion)){
      chgHx.versions.unshift(historyEntry);
      /* Giữ tối đa 50 version */
      if (chgHx.versions.length > 50){
        chgHx.versions = chgHx.versions.slice(0, 50);
      }
      if (!isDryRun) writeJSON(FILES.changelogHx, chgHx);
      success('changelog-history.json → thêm v' + oldVersion);
    } else {
      info('changelog-history.json → v' + oldVersion + ' đã có');
    }
  }

  /* ═══════ 5. Bump ?v= trong HTML ═══════ */
  console.log('');
  info('Bumping ?v= trong HTML files...');
  let htmlCount = 0;

  HTML_FILES.forEach(file => {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)){
      warn('  Không có: ' + file);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(VERSION_REGEX);
    if (!matches || matches.length === 0){
      info('  Không có ?v=: ' + file);
      return;
    }

    /* Replace tất cả ?v=X.Y → ?v=newShort */
    content = content.replace(VERSION_REGEX, '$1' + newShort);

    if (!isDryRun) fs.writeFileSync(fullPath, content, 'utf8');
    success('  ' + file + ' → ?v=' + newShort + ' (' + matches.length + ' chỗ)');
    htmlCount++;
  });

  /* ═══════ 6. Bump BUILD comment trong SW ═══════ */
  const swPath = path.join(ROOT, 'service-worker.js');
  if (fs.existsSync(swPath)){
    let sw = fs.readFileSync(swPath, 'utf8');
    const dateStr = now.toISOString().slice(0, 16).replace('T', '-').replace(':', '');
    sw = sw.replace(/^\/\* BUILD: .*?\*\//m, '/* BUILD: ' + dateStr + ' */');
    if (!isDryRun) fs.writeFileSync(swPath, sw, 'utf8');
    success('service-worker.js → BUILD: ' + dateStr);
  }

  /* ═══════ SUMMARY ═══════ */
  console.log('');
  log('════════════════════════════════════════════', C.bright);
  success('Hoàn tất! v' + oldVersion + ' → v' + newVersion);
  log('════════════════════════════════════════════', C.bright);
  console.log('');
  info('Files đã update:');
  info('  • sw-config.json');
  info('  • version.json');
  info('  • changelog.json');
  info('  • changelog-history.json');
  info('  • service-worker.js');
  info('  • ' + htmlCount + ' file HTML');
  console.log('');

  /* ═══════ PUSH (nếu có flag) ═══════ */
  if (shouldPush && !isDryRun){
    console.log('');
    warn('Đang commit và push...');
    try {
      execSync('git add -A', { stdio: 'inherit' });
      execSync('git commit -m "bump v' + newVersion + ': ' + note.replace(/"/g, '\\"') + '"', { stdio: 'inherit' });
      execSync('git push', { stdio: 'inherit' });
      console.log('');
      success('Đã push lên GitHub! Đợi 1-2 phút để CDN cập nhật.');
    } catch(e){
      error('Push thất bại: ' + e.message);
      process.exit(1);
    }
  } else if (shouldPush && isDryRun){
    warn('Bỏ qua push vì đang DRY-RUN');
  } else {
    console.log('');
    info('Chưa push. Chạy lại với --push để tự động commit + push:');
    log('  $ node bump-version.js ' + type + ' "' + note + '" --push', C.cyan);
  }

  console.log('');
}

/* ═══════════ RUN ═══════════ */
main();
