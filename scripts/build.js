/**
 * Build script — validates the extension structure and copies files to dist/.
 * Run: node scripts/build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const FILES_AND_DIRS = [
  'manifest.json',
  'src',
  'devtools',
  'assets',
];

function clean() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('🔨 Building Security Headers Auditor...\n');

  clean();

  for (const entry of FILES_AND_DIRS) {
    const src = path.join(ROOT, entry);
    const dest = path.join(DIST, entry);

    if (!fs.existsSync(src)) {
      console.error(`  ✗ Missing: ${entry}`);
      process.exit(1);
    }

    copyRecursive(src, dest);
    console.log(`  ✓ Copied ${entry}`);
  }

  // Validate manifest
  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf-8'));
  console.log(`\n  Extension: ${manifest.name} v${manifest.version}`);
  console.log(`  Manifest V${manifest.manifest_version}`);

  console.log('\n✅ Build complete → dist/\n');
}

build();
