// Renders the app icon to the PNG sizes Android and iOS expect.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const ring = (padding) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#000"/>
  <circle cx="90" cy="90" r="${58 - padding}" fill="none" stroke="#00F19F" stroke-width="14"
    stroke-dasharray="${2 * Math.PI * (58 - padding) * 0.75} 999" transform="rotate(-90 90 90)"
    stroke-linecap="round"/>
</svg>`;

await mkdir("public/icons", { recursive: true });
const targets = [
  { file: "icon-192.png", size: 192, padding: 0 },
  { file: "icon-512.png", size: 512, padding: 0 },
  // Maskable icons get cropped by the launcher, so the ring sits further in.
  { file: "icon-maskable-512.png", size: 512, padding: 14 },
  { file: "apple-touch-icon.png", size: 180, padding: 0 },
];
for (const { file, size, padding } of targets) {
  const png = await sharp(Buffer.from(ring(padding))).resize(size, size).png().toBuffer();
  await writeFile(`public/icons/${file}`, png);
  console.log(file, png.length, "bytes");
}
