// Ink, midtone, foil and glint are shared by each card and its matching seal.
// Each glyph is drawn on a nine-pixel grid in scene coordinates.
const arcana = {
  lua: {
    ink: "#32284c", mid: "#977dbd", foil: "#decbff", glint: "#fff4d4",
    glyph: [
      "...++....",
      "..+o.....",
      ".+o....*.",
      ".+o......",
      ".+o......",
      ".++o.....",
      "..+*o..o.",
      "...+***..",
      "....++...",
    ],
  },
  forca: {
    ink: "#452634", mid: "#ce795b", foil: "#ffbf84", glint: "#fff0ae",
    // Mane, raised ears and muzzle of the lion of Strength.
    glyph: [
      "..oo.oo..",
      ".oo+++oo.",
      "oo*+++*oo",
      "o++*+*++o",
      "oo+.++.+o",
      ".o++*++o.",
      "..o+.+o..",
      "...o+o...",
      "....o....",
    ],
  },
  estrela: {
    ink: "#21384c", mid: "#6ba9b4", foil: "#a3eadd", glint: "#fff5c0",
    glyph: [
      "....o....",
      "....+....",
      ".o..+..o.",
      "..o+*+o..",
      "o++***++o",
      "..o+*+o..",
      ".o..+..o.",
      "....+....",
      "....o....",
    ],
  },
};

// Store same-color runs once; the game also draws these sprites while scrolling.
for (const art of Object.values(arcana)) {
  art.runs = [];
  const colors = { o: art.mid, "+": art.foil, "*": art.glint };
  art.glyph.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      const start = x;
      while (x < row.length && row[x] === row[start]) x++;
      if (row[start] !== ".") art.runs.push([colors[row[start]], start - 4, y - 4, x - start]);
    }
  });
}

function gleam(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y, 3, 1);
  ctx.fillRect(x, y - 1, 1, 3);
}

function cardFrame(ctx, art) {
  ctx.fillStyle = "#261d30";
  ctx.fillRect(-7, -10, 16, 22);
  ctx.fillRect(-6, -11, 14, 24);
  ctx.fillStyle = art.foil;
  ctx.fillRect(-7, -10, 14, 20);
  ctx.fillRect(-6, -11, 12, 22);
  ctx.fillStyle = art.ink;
  ctx.fillRect(-6, -9, 12, 18);
  ctx.fillStyle = art.mid;
  ctx.fillRect(-4, -7, 8, 1);
  ctx.fillRect(-4, 6, 8, 1);
  ctx.fillStyle = art.glint;
  ctx.fillRect(-5, -8, 2, 1);
  ctx.fillRect(3, 7, 2, 1);
  ctx.fillRect(-1, 8, 2, 1);
}

function sealFrame(ctx, art) {
  // Faceted wax and an inset rim distinguish the seal from a collectible card.
  ctx.fillStyle = "#241d31";
  ctx.fillRect(-8, -4, 17, 10);
  ctx.fillRect(-6, -6, 13, 14);
  ctx.fillRect(-4, -8, 9, 17);
  ctx.fillStyle = art.mid;
  ctx.fillRect(-7, -4, 15, 9);
  ctx.fillRect(-5, -6, 11, 13);
  ctx.fillRect(-3, -7, 7, 15);
  ctx.fillStyle = art.ink;
  ctx.fillRect(-5, -3, 11, 7);
  ctx.fillRect(-3, -5, 7, 11);
  ctx.fillStyle = art.foil;
  ctx.fillRect(-3, -7, 6, 1);
  ctx.fillRect(-6, -4, 1, 3);
  ctx.fillRect(2, 6, 3, 1);
}

export function drawArcana(ctx, { cardId, x, y, time = 0, kind = "card", reducedMotion = false }) {
  const art = arcana[cardId];
  if (!art) return;
  const bob = reducedMotion ? 0 : Math.round(Math.sin(time / 420) * (kind === "card" ? 2 : 1));
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y) + bob);
  if (kind === "seal") sealFrame(ctx, art);
  else cardFrame(ctx, art);
  for (const [color, dx, dy, width] of art.runs) {
    ctx.fillStyle = color;
    ctx.fillRect(dx, dy, width, 1);
  }
  if (kind === "card" && !reducedMotion && time % 2400 < 520) {
    const sweep = Math.floor((time % 2400) / 52);
    gleam(ctx, -5 + sweep, -10, art.glint);
  }
  ctx.restore();
}

function lunarRipples(ctx, art, t) {
  const width = Math.round(5 + t * 15);
  for (const offset of [0, 4]) {
    const y = Math.round(1 + t * 6) + offset;
    ctx.fillStyle = offset ? art.mid : art.foil;
    ctx.fillRect(-width + 2, y + 2, width * 2 - 3, 1);
    ctx.fillRect(-width, y, 2, 2);
    ctx.fillRect(width - 1, y, 2, 2);
  }
  gleam(ctx, 0, -Math.round(5 + t * 8), art.glint);
}

function strengthClaws(ctx, art, t) {
  // Three short diagonal incisions traveling to opposite sides of the stamp.
  for (const side of [-1, 1]) {
    const spread = Math.round(5 + t * 10);
    for (let cut = 0; cut < 3; cut++) {
      const y = cut * 4 - 5;
      ctx.fillStyle = art.mid;
      ctx.fillRect(side * (spread + 2), y - 1, 2, 1);
      ctx.fillStyle = art.foil;
      ctx.fillRect(side * spread, y, 3, 2);
    }
  }
  gleam(ctx, 0, -Math.round(t * 6), art.glint);
}

function starCrown(ctx, art, t) {
  const radius = 6 + t * 10;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 - Math.PI / 2;
    const x = Math.round(Math.cos(a) * radius);
    const y = Math.round(Math.sin(a) * radius * .65 - t * 7);
    if (!i) ctx.moveTo(x + .5, y + .5);
    else ctx.lineTo(x + .5, y + .5);
    gleam(ctx, x, y, art.glint);
  }
  ctx.closePath();
  ctx.strokeStyle = art.mid;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawSealBurst(ctx, { cardId, x, y, progress, reducedMotion = false }) {
  const art = arcana[cardId];
  if (!art || progress < 0 || progress >= 1) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.globalAlpha *= Math.min(1, (1 - progress) * 4);
  const t = reducedMotion ? .45 : progress;
  if (cardId === "lua") lunarRipples(ctx, art, t);
  if (cardId === "forca") strengthClaws(ctx, art, t);
  if (cardId === "estrela") starCrown(ctx, art, t);
  ctx.restore();
}

// Keep the cat's face and feet clear so it is possible to judge the next landing.
export function drawAbilityAura(ctx, { cardId, x, y, facing = 1, time = 0, reducedMotion = false }) {
  const art = arcana[cardId];
  if (!art) return;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing < 0 ? -1 : 1, 1);

  if (cardId === "lua") {
    const lift = reducedMotion ? 0 : Math.round(Math.sin(time / 230));
    // Slender wings with a stepped edge of light, like two halves of a crescent.
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.fillStyle = art.mid;
      ctx.fillRect(5, -3, 6, 4);
      ctx.fillRect(10, -5, 6, 3);
      ctx.fillRect(14, -7 + lift, 6, 2);
      ctx.fillStyle = art.foil;
      ctx.fillRect(7, -4, 4, 1);
      ctx.fillRect(11, -6, 4, 2);
      ctx.fillRect(15, -7 + lift, 3, 1);
      ctx.fillStyle = art.glint;
      ctx.fillRect(18, -8 + lift, 3, 1);
      ctx.restore();
    }
  } else if (cardId === "forca") {
    // Three copper afterimages taper behind the direction of the lunge.
    const shift = reducedMotion ? 0 : Math.floor(time / 47) % 3;
    for (let i = 0; i < 3; i++) {
      const y = i * 4 - 6;
      const length = i === 1 ? 15 : 9;
      const end = -9 - i;
      ctx.fillStyle = art.mid;
      ctx.fillRect(end - length - shift, y, length, 1);
      ctx.fillStyle = art.foil;
      ctx.fillRect(end - length + 4, y + 1, length - 3, 1);
      ctx.fillStyle = art.glint;
      ctx.fillRect(end - 2, y, 4, 1);
    }
  } else {
    // The second jump leaves a tiny arcing constellation below the hind paws.
    const drift = reducedMotion ? 0 : Math.round(Math.sin(time / 100));
    ctx.fillStyle = art.mid;
    ctx.fillRect(-5, 8, 2, 3);
    ctx.fillRect(-7, 11, 2, 3);
    ctx.fillRect(-10, 14, 3, 1);
    gleam(ctx, -4, 8, art.glint);
    gleam(ctx, -10, 14, art.foil);
    gleam(ctx, -14, 17 + drift, art.glint);
    ctx.fillStyle = art.foil;
    ctx.fillRect(8, 10, 1, 2);
  }
  ctx.restore();
}

// Bronze relief seen in profile, inset in the sentinel's sandstone mane.
// Feet animate separately from the hull, preserving a readable ground contact.
const guardianColors = {
  "#": "#382838", m: "#835663", b: "#bd7e67", l: "#eeb187",
  t: "#65505a", g: "#f4c173", e: "#fff3ad",
};
const guardianHull = [
  "........###.##....",
  "......##bbl#lb#...",
  ".....#lbbblbbm##..",
  "...##bblmm#mbbl#..",
  "..#mbblmmbbblbb#..",
  ".#mbbbmmbl#elbbl#.",
  ".#bllbmmlbbbbbll##",
  "##blgbmmbbbmmmblb#",
  "#tblglmbblblblmb#.",
  "#ttbgbmmmblbbbm#..",
  ".#tttbmbbmbmmb#...",
  "..#tttmbmmbbm#....",
  "...####mmbm##.....",
  ".......####.......",
];

export function drawLionGuardian(ctx, { x, y, facing = 1, time = 0, reducedMotion = false }) {
  const stride = reducedMotion ? 0 : Math.round(Math.sin(time / 120) * 2);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(facing < 0 ? -1 : 1, 1);
  ctx.fillStyle = guardianColors["#"];
  ctx.fillRect(-6 - stride, -4, 4, 4);
  ctx.fillRect(2 + stride, -4, 4, 4);
  ctx.fillStyle = guardianColors.b;
  ctx.fillRect(-6 - stride, -2, 3, 1);
  ctx.fillRect(3 + stride, -2, 3, 1);
  const bob = stride === 0 ? 0 : -1;
  // Raised shoulder ruff, pointed ears and a tufted tail break the round silhouette.
  ctx.fillStyle = "#704839";
  ctx.fillRect(-12, -11 + bob, 3, 6);
  ctx.fillRect(-10, -7 + bob, 6, 2);
  ctx.fillStyle = "#dfab70";
  ctx.fillRect(-13, -13 + bob, 3, 4);
  ctx.fillRect(1, -18 + bob, 2, 4);
  ctx.fillRect(5, -17 + bob, 2, 3);
  for (let row = 0; row < guardianHull.length; row++) {
    const cells = guardianHull[row];
    for (let col = 0; col < cells.length;) {
      const first = col;
      while (col < cells.length && cells[col] === cells[first]) col++;
      if (cells[first] === ".") continue;
      ctx.fillStyle = guardianColors[cells[first]];
      ctx.fillRect(first - 9, row - 16 + bob, col - first, 1);
    }
  }
  ctx.fillStyle = guardianColors.b;
  ctx.fillRect(6, -10 + bob, 5, 3);
  ctx.fillStyle = guardianColors["#"];
  ctx.fillRect(10, -10 + bob, 2, 2);
  ctx.fillStyle = guardianColors.l;
  ctx.fillRect(7, -8 + bob, 3, 1);
  ctx.restore();
}
