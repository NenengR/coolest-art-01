import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const INDIGO = [20, 20, 60];
const DARK = [11, 11, 36];
const CORAL = [255, 107, 74];
const TEAL = [46, 196, 182];
const CREAM = [255, 243, 224];
const RIDGE_INDIGO = [38, 38, 82];
const pixels = new Uint8Array(W * H * 3);

function px(x: number, y: number, color: number[]) {
  const offset = (y * W + x) * 3;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
}

function drawSky() {
  for (let y = 0; y < H; y++) {
    const amount = y / (H - 1);
    const color = INDIGO.map((channel, index) =>
      Math.round(channel + (DARK[index] - channel) * amount));
    for (let x = 0; x < W; x++) px(x, y, color);
  }
}

function disc(cx: number, cy: number, radius: number, color: number[]) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) px(x, y, color);
    }
  }
}

function fillRect(x: number, y: number, width: number, height: number, color: number[]) {
  for (let row = y; row < y + height; row++) {
    for (let column = x; column < x + width; column++) px(column, row, color);
  }
}

function blendPx(x: number, y: number, color: number[], alpha: number) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const offset = (y * W + x) * 3;
  pixels[offset] = Math.round(pixels[offset] * (1 - alpha) + color[0] * alpha);
  pixels[offset + 1] = Math.round(pixels[offset + 1] * (1 - alpha) + color[1] * alpha);
  pixels[offset + 2] = Math.round(pixels[offset + 2] * (1 - alpha) + color[2] * alpha);
}

function ellipse(cx: number, cy: number, radiusX: number, radiusY: number, color: number[]) {
  for (let y = Math.floor(cy - radiusY); y <= Math.ceil(cy + radiusY); y++) {
    for (let x = Math.floor(cx - radiusX); x <= Math.ceil(cx + radiusX); x++) {
      if (((x - cx) / radiusX) ** 2 + ((y - cy) / radiusY) ** 2 <= 1) px(x, y, color);
    }
  }
}

function pointInPolygon(x: number, y: number, polygon: number[][]) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const [currentX, currentY] = polygon[current];
    const [previousX, previousY] = polygon[previous];
    const crosses = (currentY > y) !== (previousY > y)
      && x < (previousX - currentX) * (y - currentY) / (previousY - currentY) + currentX;
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygon(points: number[][], color: number[]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) px(x, y, color);
    }
  }
}

function drawStars() {
  let state = 0x5eed1234;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  for (let index = 0; index < 200; index++) {
    const x = Math.floor(random() * W);
    const y = Math.floor(random() * 690);
    const radius = random() > 0.82 ? 2 : 1;
    const alpha = 0.55 + random() * 0.45;
    for (let row = -radius; row <= radius; row++) {
      for (let column = -radius; column <= radius; column++) {
        if (column * column + row * row <= radius * radius) blendPx(x + column, y + row, CREAM, alpha);
      }
    }
  }
}

function drawAurora() {
  const ribbons = [
    { base: 118, amplitude: 52, frequency: 0.009, phase: 0.2, thickness: 30, alpha: 0.48 },
    { base: 205, amplitude: 68, frequency: 0.007, phase: 1.9, thickness: 25, alpha: 0.4 },
    { base: 288, amplitude: 45, frequency: 0.011, phase: 3.1, thickness: 20, alpha: 0.34 },
  ];
  for (const ribbon of ribbons) {
    for (let x = 0; x < W; x++) {
      const center = ribbon.base + Math.sin(x * ribbon.frequency + ribbon.phase) * ribbon.amplitude;
      for (let y = Math.floor(center - ribbon.thickness); y <= center + ribbon.thickness; y++) {
        const distance = Math.abs(y - center) / ribbon.thickness;
        if (distance < 1) {
          const falloff = Math.sin(Math.PI * (1 - distance)) ** 2;
          blendPx(x, y, TEAL, ribbon.alpha * falloff);
        }
      }
    }
  }
}

function drawSunStripes() {
  const centerX = 512;
  const centerY = 400;
  const radius = 210;
  for (const [stripeY, stripeHeight] of [[426, 13], [469, 13], [512, 13]]) {
    for (let y = stripeY; y < stripeY + stripeHeight; y++) {
      const halfWidth = Math.floor(Math.sqrt(radius * radius - (y - centerY) ** 2));
      fillRect(centerX - halfWidth, y, halfWidth * 2 + 1, 1, CREAM);
    }
  }
}

function drawRidge() {
  polygon([
    [0, 760], [90, 730], [180, 750], [270, 690], [350, 710], [430, 675],
    [520, 705], [610, 680], [700, 725], [790, 690], [880, 720], [970, 685],
    [1024, 710], [1024, 1024], [0, 1024],
  ], RIDGE_INDIGO);
  polygon([
    [0, 790], [80, 760], [160, 775], [245, 735], [320, 748], [380, 720],
    [440, 700], [510, 730], [590, 712], [680, 748], [760, 720], [850, 755],
    [930, 735], [1024, 770], [1024, 1024], [0, 1024],
  ], DARK);
}

function drawTail() {
  const start = [330, 590];
  const controlA = [280, 575];
  const controlB = [292, 490];
  const end = [365, 475];
  const left: number[][] = [];
  const right: number[][] = [];
  for (let index = 0; index <= 30; index++) {
    const amount = index / 30;
    const inverse = 1 - amount;
    const x = inverse ** 3 * start[0] + 3 * inverse ** 2 * amount * controlA[0]
      + 3 * inverse * amount ** 2 * controlB[0] + amount ** 3 * end[0];
    const y = inverse ** 3 * start[1] + 3 * inverse ** 2 * amount * controlA[1]
      + 3 * inverse * amount ** 2 * controlB[1] + amount ** 3 * end[1];
    const tangentX = 3 * inverse ** 2 * (controlA[0] - start[0])
      + 6 * inverse * amount * (controlB[0] - controlA[0])
      + 3 * amount ** 2 * (end[0] - controlB[0]);
    const tangentY = 3 * inverse ** 2 * (controlA[1] - start[1])
      + 6 * inverse * amount * (controlB[1] - controlA[1])
      + 3 * amount ** 2 * (end[1] - controlB[1]);
    const length = Math.hypot(tangentX, tangentY) || 1;
    const radius = 20 + 23 * amount ** 0.72;
    const normalX = -tangentY / length;
    const normalY = tangentX / length;
    left.push([x + normalX * radius, y + normalY * radius]);
    right.push([x - normalX * radius, y - normalY * radius]);
  }
  polygon([...left, ...right.reverse()], DARK);
}

function drawFox() {
  drawTail();
  ellipse(390, 590, 95, 52, DARK);
  polygon([[332, 620], [370, 633], [368, 734], [338, 735]], DARK);
  polygon([[448, 611], [478, 607], [475, 710], [445, 707]], DARK);
  polygon([
    [454, 554], [505, 527], [540, 540], [575, 560], [550, 581],
    [535, 605], [484, 608], [451, 585],
  ], DARK);
  polygon([[477, 541], [470, 470], [514, 522]], DARK);
  polygon([[514, 523], [548, 460], [558, 538]], DARK);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[n] = value >>> 0;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const name = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([name, data]));
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  name.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc, data.length + 8);
  return output;
}

function encodePng() {
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function main() {
  drawSky();
  drawStars();
  drawAurora();
  disc(512, 400, 210, CORAL);
  drawSunStripes();
  drawRidge();
  drawFox();
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'entry.png'), encodePng());
}

main();
