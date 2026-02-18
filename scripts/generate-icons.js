/**
 * Generate simple PNG icons for the extension.
 * Creates minimal valid PNG files with a shield design.
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 128];
const ICON_DIR = path.join(__dirname, '..', 'assets', 'icons');

/**
 * Create a minimal valid PNG file.
 * Draws a solid colored rounded shield icon.
 */
function createPng(size) {
  const width = size;
  const height = size;

  // RGBA pixel buffer (with filter byte per row)
  const rawData = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    rawData[rowOffset] = 0; // filter: None

    for (let x = 0; x < width; x++) {
      const px = rowOffset + 1 + x * 4;
      const pixel = getPixel(x, y, width, height);
      rawData[px] = pixel[0];     // R
      rawData[px + 1] = pixel[1]; // G
      rawData[px + 2] = pixel[2]; // B
      rawData[px + 3] = pixel[3]; // A
    }
  }

  // Compress
  const compressed = zlib.deflateSync(rawData);

  // Build PNG
  const chunks = [];

  // Signature
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  chunks.push(makeChunk('IHDR', ihdr));

  // IDAT
  chunks.push(makeChunk('IDAT', compressed));

  // IEND
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([len, typeBuffer, data, crc]);
}

// CRC32 for PNG
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Get RGBA color for pixel at (x, y) in a size×size image.
 * Draws a shield with a checkmark on a blue background.
 */
function getPixel(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;

  // Normalize coordinates to 0-1 range
  const nx = x / w;
  const ny = y / h;

  // Background: rounded rect
  const margin = w * 0.08;
  const radius = w * 0.15;
  const inRoundedRect = isInRoundedRect(x, y, margin, margin, w - 2 * margin, h - 2 * margin, radius);
  if (!inRoundedRect) return [0, 0, 0, 0]; // transparent

  // Background gradient: #0078d4 -> #005a9e
  const t = (nx + ny) / 2;
  const bgR = Math.round(0 + t * 0);
  const bgG = Math.round(120 - t * 30);
  const bgB = Math.round(212 - t * 54);

  // Shield outline
  const shieldScale = 0.65;
  const sx = (nx - 0.5) / shieldScale + 0.5;
  const sy = (ny - 0.42) / shieldScale + 0.42;

  // Shield boundary
  const inShield = isInShield(sx, sy);
  const onShieldEdge = inShield && !isInShield(sx + 0.03, sy) || !inShield && isInShield(sx + 0.03, sy) ||
                       inShield && !isInShield(sx, sy + 0.03) || !inShield && isInShield(sx, sy + 0.03) ||
                       inShield && !isInShield(sx - 0.03, sy) || !inShield && isInShield(sx - 0.03, sy) ||
                       inShield && !isInShield(sx, sy - 0.03) || !inShield && isInShield(sx, sy - 0.03);

  // Checkmark
  const onCheck = isOnCheckmark(nx, ny);

  if (onShieldEdge || onCheck) {
    return [255, 255, 255, 255]; // white
  }

  return [bgR, bgG, bgB, 255];
}

function isInRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || px > x + w || py < y || py > y + h) return false;

  // Check corners
  const corners = [
    [x + r, y + r],
    [x + w - r, y + r],
    [x + r, y + h - r],
    [x + w - r, y + h - r],
  ];

  for (const [cx, cy] of corners) {
    const inCornerZone =
      (px < x + r || px > x + w - r) && (py < y + r || py > y + h - r);
    if (inCornerZone) {
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy > r * r) return false;
    }
  }
  return true;
}

function isInShield(nx, ny) {
  // Simple shield: top point at (0.5, 0.14), widens to sides at y=0.27, curves down to (0.5, 0.87)
  if (ny < 0.14 || ny > 0.87) return false;
  if (ny < 0.27) {
    // Top triangle
    const progress = (ny - 0.14) / (0.27 - 0.14);
    const halfWidth = progress * 0.35;
    return Math.abs(nx - 0.5) < halfWidth;
  }
  // Body: narrows as we go down
  const progress = (ny - 0.27) / (0.87 - 0.27);
  const halfWidth = 0.35 * (1 - progress * progress);
  return Math.abs(nx - 0.5) < halfWidth;
}

function isOnCheckmark(nx, ny) {
  // Checkmark from (0.32, 0.50) -> (0.44, 0.62) -> (0.68, 0.38)
  const thickness = 0.04;

  // First segment: (0.32, 0.50) -> (0.44, 0.62)
  const d1 = distToSegment(nx, ny, 0.32, 0.50, 0.44, 0.62);
  if (d1 < thickness) return true;

  // Second segment: (0.44, 0.62) -> (0.68, 0.38)
  const d2 = distToSegment(nx, ny, 0.44, 0.62, 0.68, 0.38);
  if (d2 < thickness) return true;

  return false;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const ddx = px - projX;
  const ddy = py - projY;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

// ── Main ──
if (!fs.existsSync(ICON_DIR)) {
  fs.mkdirSync(ICON_DIR, { recursive: true });
}

for (const size of SIZES) {
  const png = createPng(size);
  const filePath = path.join(ICON_DIR, `icon${size}.png`);
  fs.writeFileSync(filePath, png);
  console.log(`✓ Generated ${filePath} (${png.length} bytes)`);
}

console.log('\nDone! Icon files generated.');
