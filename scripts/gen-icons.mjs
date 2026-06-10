import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const TEAL   = [0x29, 0xd8, 0xc7];
const INDIGO = [0x63, 0x66, 0xf1];
const BG     = [0x0a, 0x0a, 0x0a];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1 >>> 0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePNG(width, height, pixel) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(height * (1 + width * 3));
  let off = 0;
  for (let y = 0; y < height; y++) {
    raw[off++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      raw[off++] = r;
      raw[off++] = g;
      raw[off++] = b;
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Blocky lowercase glyphs for the "lab." wordmark, 7 rows tall.
// '#' = letter color, '@' = dot color (indigo period).
const GLYPHS = {
  l: [
    '##.',
    '.#.',
    '.#.',
    '.#.',
    '.#.',
    '.#.',
    '###'
  ],
  a: [
    '.....',
    '.....',
    '####.',
    '....#',
    '#####',
    '#...#',
    '#####'
  ],
  b: [
    '#....',
    '#....',
    '####.',
    '#...#',
    '#...#',
    '#...#',
    '####.'
  ],
  '.': [
    '..',
    '..',
    '..',
    '..',
    '..',
    '@@',
    '@@'
  ]
};

// Render text into a cell grid: returns { cols, rows, at(cx, cy) -> 0|1|2 }.
function textGrid(text) {
  const rows = 7;
  const cells = [];
  let cols = 0;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) continue;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < g[y].length; x++) {
        const v = g[y][x] === '#' ? 1 : g[y][x] === '@' ? 2 : 0;
        if (v) cells.push([cols + x, y, v]);
      }
    }
    cols += g[0].length + 1;   // 1-cell letter spacing
  }
  cols -= 1;
  const map = new Map(cells.map(([x, y, v]) => [y * cols + x, v]));
  return { cols, rows, at: (cx, cy) => map.get(cy * cols + cx) || 0 };
}

// Wordmark centered on a dark canvas. scale = fraction of width the text spans.
function brandPixelFn(width, height, text, scale) {
  const grid = textGrid(text);
  const cell = Math.max(1, Math.floor((width * scale) / grid.cols));
  const tw = grid.cols * cell;
  const th = grid.rows * cell;
  const ox = Math.floor((width - tw) / 2);
  const oy = Math.floor((height - th) / 2);
  return (x, y) => {
    const cx = Math.floor((x - ox) / cell);
    const cy = Math.floor((y - oy) / cell);
    if (x < ox || y < oy || cx >= grid.cols || cy >= grid.rows) return BG;
    const v = grid.at(cx, cy);
    return v === 1 ? TEAL : v === 2 ? INDIGO : BG;
  };
}

// App icon: "lab." mark. Maskable keeps content inside the central safe zone.
function icon(size, scale) {
  return makePNG(size, size, brandPixelFn(size, size, 'lab.', scale));
}

// Share card for og:image (1200x630): big mark + teal baseline bar.
function ogImage() {
  const W = 1200, H = 630;
  const brand = brandPixelFn(W, H, 'lab.', 0.42);
  const barY0 = Math.floor(H * 0.78), barY1 = barY0 + 8;
  const barX0 = Math.floor(W * 0.29), barX1 = Math.floor(W * 0.71);
  return makePNG(W, H, (x, y) => {
    if (y >= barY0 && y < barY1 && x >= barX0 && x < barX1) return TEAL;
    return brand(x, y);
  });
}

mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', icon(192, 0.72));
writeFileSync('icons/icon-512.png', icon(512, 0.72));
writeFileSync('icons/maskable-512.png', icon(512, 0.5));
writeFileSync('og.png', ogImage());
console.log('[gen-icons] wrote icons/icon-192.png, icons/icon-512.png, icons/maskable-512.png, og.png');
