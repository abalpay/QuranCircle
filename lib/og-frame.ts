// The illumination frame for share cards (#105, direction C): a gold double rule with corner finials and an
// octagram seal that sits on the top edge. Drawn as one SVG data URI (satori has no border-image and no
// pseudo-elements). Same geometry as app/decor.css, scaled to the 1200x630 card; symmetric, so it is never mirrored.
const W = 1200;
const H = 630;

const f = (n: number) => Number(n.toFixed(2));
const polygon = (cx: number, cy: number, r: number, phase: number) =>
  Array.from({ length: 4 }, (_, k) => {
    const a = phase + (Math.PI / 2) * k;
    return `${k ? "L" : "M"}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }).join("") + "Z";
const diamond = (x: number, y: number, r: number) => `M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`;

export function ogFrameDataUri({ stroke, fill }: { stroke: string; fill: string }): string {
  const sealY = 28;
  const finials = [52, W - 52].flatMap((x) => [52, H - 52].map((y) => diamond(x, y, 4.5))).join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" stroke="${stroke}">` +
    `<rect x="22" y="22" width="${W - 44}" height="${H - 44}" rx="14" stroke-width="1.6"/>` +
    `<rect x="34" y="34" width="${W - 68}" height="${H - 68}" rx="6" stroke-width="1"/>` +
    `<path d="${finials}" fill="${stroke}" stroke="none"/>` +
    `<circle cx="${W / 2}" cy="${sealY}" r="29" fill="${fill}" stroke-width="1.4"/>` +
    `<circle cx="${W / 2}" cy="${sealY}" r="24" stroke-width="0.8"/>` +
    `<path d="${polygon(W / 2, sealY, 15, 0)}${polygon(W / 2, sealY, 15, Math.PI / 4)}" stroke-width="1" stroke-linejoin="miter"/>` +
    `<circle cx="${W / 2}" cy="${sealY}" r="3" stroke-width="0.8"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
