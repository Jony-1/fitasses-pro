/**
 * Genera todos los íconos PWA a partir de favicon.png
 * Requiere: npm install sharp  (solo para este script, no va al bundle)
 * Uso: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const source = join(root, "public", "favicon.png");

if (!existsSync(source)) {
  console.error("No se encontró public/favicon.png");
  process.exit(1);
}

for (const size of sizes) {
  const dest = join(root, "public", "icons", `icon-${size}.png`);
  await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 7, g: 12, b: 24, alpha: 1 } })
    .png()
    .toFile(dest);
  console.log(`✓ icon-${size}.png`);
}

// screenshot placeholder (si no tienes uno real)
const screenshotDest = join(root, "public", "icons", "screenshot-mobile.png");
if (!existsSync(screenshotDest)) {
  await sharp({
    create: { width: 390, height: 844, channels: 4, background: { r: 7, g: 12, b: 24, alpha: 1 } }
  }).png().toFile(screenshotDest);
  console.log("✓ screenshot-mobile.png (placeholder)");
}

console.log("\nÍconos generados en public/icons/");
