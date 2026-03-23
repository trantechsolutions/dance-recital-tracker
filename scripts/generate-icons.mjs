/**
 * Generate all favicon/icon PNGs from the SVG source.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dir, '..', 'public');
const svgPath = resolve(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'icon-192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'icon-512.png', size: 512 },
];

async function generate() {
  console.log('Generating icons from favicon.svg...\n');

  for (const { name, size } of sizes) {
    const outputPath = resolve(publicDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // Generate ICO (contains 16x16 and 32x32)
  // ICO format: we'll create a simple ICO with the 32x32 PNG embedded
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();

  const ico = createIco([
    { size: 16, buffer: png16 },
    { size: 32, buffer: png32 },
  ]);
  writeFileSync(resolve(publicDir, 'favicon.ico'), ico);
  console.log('  ✓ favicon.ico (16x16 + 32x32)');

  console.log('\nDone!');
}

// Minimal ICO file builder
function createIco(images) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const numImages = images.length;
  let dataOffset = headerSize + dirEntrySize * numImages;

  // ICO header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);        // Reserved
  header.writeUInt16LE(1, 2);        // Type: ICO
  header.writeUInt16LE(numImages, 4); // Number of images

  const dirEntries = [];
  const dataBuffers = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0);  // Width
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1);  // Height
    entry.writeUInt8(0, 2);                   // Color palette
    entry.writeUInt8(0, 3);                   // Reserved
    entry.writeUInt16LE(1, 4);                // Color planes
    entry.writeUInt16LE(32, 6);               // Bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // Size of image data
    entry.writeUInt32LE(dataOffset, 12);       // Offset to image data

    dirEntries.push(entry);
    dataBuffers.push(img.buffer);
    dataOffset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers]);
}

generate().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
