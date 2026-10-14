/**
 * Scan sounds/ folder → generate manifest.json
 * CHỈ chấp nhận file tên chuẩn: a-z, 0-9, gạch ngang, gạch dưới
 * File có dấu cách / dấu tiếng Việt → BỊ BỎ QUA + warning
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

/**
 * CHỈ match file tên chuẩn: soundscape-xxx.mp3
 * xxx = chữ thường, số, gạch ngang, gạch dưới
 */
function parseFileName(name) {
  const m = name.match(/^soundscape-([a-z0-9_-]+)\.mp3$/);
  if (!m) return null;
  return { key: m[1], file: name };
}

function main() {
  if (!fs.existsSync(SOUNDS_DIR)) {
    console.error('❌ Folder sounds/ không tồn tại');
    process.exit(1);
  }

  const files = fs.readdirSync(SOUNDS_DIR);
  const tracks = [];
  const skipped = [];

  files.forEach(f => {
    if (!f.toLowerCase().endsWith('.mp3')) return;
    const parsed = parseFileName(f);
    if (parsed) {
      tracks.push(parsed);
    } else {
      skipped.push(f);
    }
  });

  if (skipped.length) {
    console.warn('⚠️ BỎ QUA ' + skipped.length + ' file (tên sai chuẩn):');
    skipped.forEach(f => {
      console.warn('   ❌ ' + f);
      console.warn('      → Đổi tên thành: ' + suggestName(f));
    });
  }

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
  console.log('✅ Đã quét ' + tracks.length + ' bài hát:');
  tracks.forEach(t => console.log('   - ' + t.key + ' → ' + t.file));

  if (skipped.length) {
    console.log('');
    console.log('📌 Tổng: ' + tracks.length + ' OK, ' + skipped.length + ' bị bỏ qua');
  }
}

function suggestName(name) {
  return name
    .replace(/^soundscape-/i, '')
    .replace(/\.mp3$/i, '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^/, 'soundscape-')
    .replace(/$/, '.mp3');
}

main();
