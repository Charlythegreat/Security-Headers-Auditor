/**
 * Package script — creates a .zip file ready for Edge Add-ons submission.
 * Run: node scripts/package.js
 *
 * Requires a prior build (node scripts/build.js).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function packageExtension() {
  if (!fs.existsSync(DIST)) {
    console.error('❌  dist/ not found. Run "node scripts/build.js" first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.json'), 'utf-8'));
  const version = manifest.version || '0.0.0';
  const zipName = `security-headers-auditor-v${version}.zip`;
  const zipPath = path.join(ROOT, zipName);

  // Remove old zip if exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  console.log(`📦 Packaging ${zipName}...\n`);

  try {
    execSync(`cd "${DIST}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
    const stat = fs.statSync(zipPath);
    console.log(`\n✅ Package created: ${zipName} (${(stat.size / 1024).toFixed(1)} KB)\n`);
  } catch (err) {
    console.error('❌  Packaging failed. Make sure zip is installed.');
    process.exit(1);
  }
}

packageExtension();
