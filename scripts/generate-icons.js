const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const svgPath = path.join(
  "C:",
  "LocalFiles",
  "Opencode",
  "node_modules",
  "pixelarticons",
  "svg",
  "pen-square.svg"
);
const svg = fs
  .readFileSync(svgPath, "utf-8")
  .replace(/currentColor/g, "#D3D4CF");

const blackBg = { r: 19, g: 19, b: 19, alpha: 1 };

async function renderIcon(size, scale = 0.75) {
  const iconSize = Math.round(size * scale);
  const padding = Math.round((size - iconSize) / 2);

  const rendered = await sharp(Buffer.from(svg))
    .resize(iconSize, iconSize, { fit: "contain" })
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: blackBg,
    },
  })
    .composite([{ input: rendered, left: padding, top: padding }])
    .png()
    .toBuffer();
}

async function main() {
  const icon192 = await renderIcon(192, 0.75);
  const icon512 = await renderIcon(512, 0.75);
  const appleIcon = await renderIcon(180, 0.72);

  fs.mkdirSync("public/icons", { recursive: true });
  fs.writeFileSync("public/icons/icon-192x192.png", icon192);
  fs.writeFileSync("public/icons/icon-512x512.png", icon512);
  fs.writeFileSync("public/apple-icon.png", appleIcon);

  console.log("Icons generated");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
