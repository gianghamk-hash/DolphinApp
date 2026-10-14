/**
 * Scan sounds/ folder → generate manifest.json
 * Chạy tự động bởi GitHub Actions khi push MP3 mới
 */
const fs = require('fs');
const path = require('path');

const SOUNDS_DIR = path.join(__dirname, '..', 'sounds');
const MANIFEST_FILE = path.join(SOUNDS_DIR, 'manifest.json');

const TRACKS_ORDER = [
  'default', 'tet', 'valentine', 'womenday', 'reunification', 'children',
  'nationalday', 'midautumn', 'halloween', 'christmas', 'newyear',
  'spring', 'summer', 'autumn', 'winter'
];

function parseFileName(name) {
  const m = name.match(/^soundscape-(.+)\.mp3$/i);
  if (!m) return null;
  const key = m[1].toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!key) return null;
  return { key, file: name };
}

function main() {
  if (!fs.existsSync(SOUNDS_DIR)) {
    console.error('❌ Folder sounds/ không tồn tại');
    process.exit(1);
  }

  const files = fs.readdirSync(SOUNDS_DIR);
  const tracks = [];

  files.forEach(f => {
    const parsed = parseFileName(f);
    if (parsed) tracks.push(parsed);
  });

  tracks.sort((a, b) => {
    const ia = TRACKS_ORDER.indexOf(a.key);
    const ib = TRACKS_ORDER.indexOf(b.key);
    if (ia === -1 && ib === -1) return a.key.localeCompare(b.key);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const manifest = {
    generated: new Date().toISOString(),
    count: tracks.length,
    tracks
  };

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`✅ Đã quét ${tracks.length} bài hát:`);
  tracks.forEach(t => console.log(`   - ${t.key} → ${t.file}`));
}

main();
