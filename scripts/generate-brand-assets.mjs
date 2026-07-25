import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const source = path.join(
  projectRoot,
  "public/brand/qurancircle-mark-on-dark.svg"
);
const brandDirectory = path.join(projectRoot, "public/brand");
const deepGreen = "#0d332a";

async function renderIcon(size, markSize, output) {
  const mark = await sharp(source)
    .resize(markSize, markSize)
    .png()
    .toBuffer();
  const offset = Math.round((size - markSize) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: deepGreen,
    },
  })
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toFile(output);
}

async function buildIco(sizes, output) {
  const images = await Promise.all(
    sizes.map((size) =>
      sharp(path.join(brandDirectory, "qurancircle-icon-512.png"))
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let imageOffset = headerSize;
  images.forEach((image, index) => {
    const entryOffset = 6 + index * 16;
    const size = sizes[index];
    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += image.length;
  });

  await fs.writeFile(output, Buffer.concat([header, ...images]));
}

await fs.mkdir(brandDirectory, { recursive: true });
await renderIcon(
  180,
  138,
  path.join(brandDirectory, "qurancircle-icon-180.png")
);
await renderIcon(
  192,
  148,
  path.join(brandDirectory, "qurancircle-icon-192.png")
);
await renderIcon(
  512,
  394,
  path.join(brandDirectory, "qurancircle-icon-512.png")
);
await renderIcon(
  512,
  308,
  path.join(brandDirectory, "qurancircle-maskable-512.png")
);

await fs.copyFile(
  path.join(brandDirectory, "qurancircle-icon-512.png"),
  path.join(projectRoot, "public/quran-icon.png")
);

await buildIco(
  [16, 32, 48],
  path.join(projectRoot, "app/favicon.ico")
);
