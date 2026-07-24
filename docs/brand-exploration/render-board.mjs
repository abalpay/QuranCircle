import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDirectory = path.dirname(new URL(import.meta.url).pathname);

const concepts = [
  {
    file: "concept-01-continuum-q.svg",
    name: "01  CONTINUUM Q",
    note: "Completion • return • momentum",
  },
  {
    file: "concept-02-common-space.svg",
    name: "02  COMMON SPACE",
    note: "Community • shared source • structure",
  },
  {
    file: "concept-03-interlock.svg",
    name: "03  INTERLOCK",
    note: "Reciprocity • partnership • belonging",
  },
  {
    file: "concept-04-thirtyfold.svg",
    name: "04  THIRTYFOLD",
    note: "30 Juz • distributed action • unity",
  },
];

const escapeXml = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const boardWidth = 1600;
const boardHeight = 1080;
const cardWidth = 730;
const cardHeight = 390;
const positions = [
  [55, 210],
  [815, 210],
  [55, 630],
  [815, 630],
];

const boardChrome = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="${boardWidth}" height="${boardHeight}">
    <rect width="100%" height="100%" fill="#F2F1F7"/>
    <text x="55" y="80" fill="#171A3D" font-family="Georgia, serif" font-size="48" font-weight="700">QuranCircle</text>
    <text x="55" y="125" fill="#4F5575" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="4">NET-NEW ISOMETRIC IDENTITY EXPLORATION</text>
    <text x="1545" y="122" text-anchor="end" fill="#727793" font-family="Arial, sans-serif" font-size="16">Round 01 • production-minded concepts</text>
    ${concepts
      .map((concept, index) => {
        const [x, y] = positions[index];
        return `
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="#FFFFFF"/>
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="30" fill="none" stroke="#DFDEE9" stroke-width="2"/>
          <text x="${x + 260}" y="${y + 110}" fill="#5E6381" font-family="Arial, sans-serif" font-size="15" font-weight="700" letter-spacing="2.4">${escapeXml(concept.name)}</text>
          <text x="${x + 260}" y="${y + 193}" fill="#171A3D" font-family="Georgia, serif" font-size="54" font-weight="700">QuranCircle</text>
          <text x="${x + 262}" y="${y + 235}" fill="#636983" font-family="Arial, sans-serif" font-size="18">${escapeXml(concept.note)}</text>
          <line x1="${x + 260}" y1="${y + 275}" x2="${x + 665}" y2="${y + 275}" stroke="#E5E4EC" stroke-width="2"/>
          <text x="${x + 260}" y="${y + 318}" fill="#7A7F98" font-family="Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="1.6">ICON • HORIZONTAL LOCKUP • SMALL-SIZE TEST</text>
        `;
      })
      .join("")}
  </svg>
`);

const composites = [{ input: boardChrome, left: 0, top: 0 }];

for (const [index, concept] of concepts.entries()) {
  const sourcePath = path.join(outputDirectory, concept.file);
  const svg = await fs.readFile(sourcePath);
  const largeIcon = await sharp(svg).resize(180, 180).png().toBuffer();
  const smallIcon = await sharp(svg).resize(32, 32).png().toBuffer();
  const pngName = concept.file.replace(".svg", ".png");

  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile(path.join(outputDirectory, pngName));

  const [cardX, cardY] = positions[index];
  composites.push(
    { input: largeIcon, left: cardX + 40, top: cardY + 80 },
    { input: smallIcon, left: cardX + 648, top: cardY + 304 }
  );
}

await sharp({
  create: {
    width: boardWidth,
    height: boardHeight,
    channels: 4,
    background: "#F2F1F7",
  },
})
  .composite(composites)
  .png()
  .toFile(path.join(outputDirectory, "concept-board.png"));
