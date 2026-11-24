import { drawArcana, drawSealBurst, drawLionGuardian, drawAbilityAura } from "./arcana-art.js";
import { unlock, score, cue, toggleSound, isMuted, hush } from "./score.js";
import { CARDS, LEVELS, advanceLevel, createGame, getObjective, restartLevel, retrySealChallenge, powerTarget, tick } from "./rules.js";

const canvas = document.getElementById("garden");
const context = canvas.getContext("2d");
const scene = document.getElementById("scene");
const objective = document.getElementById("objective");
const feedback = document.getElementById("feedback");
const stageNumber = document.getElementById("stage-number");
const stageTitle = document.getElementById("stage-title");
const sparkCount = document.getElementById("spark-count");
const cardButton = document.getElementById("arcana");
const cardArt = document.getElementById("card-art");
const cardName = document.getElementById("card-name");
const cardPower = document.getElementById("card-power");
const cardStatus = document.getElementById("card-state");
const pauseMenu = document.getElementById("pause-menu");
const pauseButton = document.getElementById("pause-game");
const victory = document.getElementById("victory");
const victoryTitle = document.getElementById("victory-title");
const victoryDetail = document.getElementById("victory-detail");
const nextAction = document.getElementById("next-action");
const touches = [...document.querySelectorAll(".touch-controls button")];
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const TILE = 18;
const VIEW_HEIGHT = 237.5;
const WIDE_VIEW = 550;
const STEP = 1 / 60;
const sparksPerLevel = LEVELS.map(({ rows }) =>
  rows.reduce((total, row) => total + row.split("*").length - 1, 0)
);
const keyActions = {
  a: "left", arrowleft: "left",
  d: "right", arrowright: "right",
  " ": "jump", spacebar: "jump", arrowup: "jump", w: "jump",
  e: "use", "1": "use",
};

const palettes = {
  garden: {
    sky: ["#191932", "#453b59", "#a27985"],
    distant: "#5d4968", middle: "#383552", near: "#272e40",
    soil: "#333642", stone: "#44464f", shade: "#262938",
    top: "#9eae81", second: "#5e775f", detail: "#64605e",
    light: "#e3ceff", glow: "#a48adf",
  },
  crypt: {
    sky: ["#1b152e", "#43324d", "#80576a"],
    distant: "#5b415b", middle: "#3f304c", near: "#30253e",
    soil: "#493241", stone: "#5b3d4d", shade: "#302638",
    top: "#c7a181", second: "#916a67", detail: "#805e68",
    light: "#ffdab3", glow: "#eb966e",
  },
  observatory: {
    sky: ["#151a36", "#30385c", "#6f7799"],
    distant: "#4e5779", middle: "#334269", near: "#243454",
    soil: "#333e58", stone: "#405371", shade: "#29314a",
    top: "#a0cdc6", second: "#638d96", detail: "#586a86",
    light: "#f7e6a7", glow: "#a1e5df",
  },
};

const symbols = ["☾", "◆", "✦"];
const abilityHints = ["Segure o pulo para planar.", "Use a carta de novo para dar um impulso.", "Pule outra vez no ar para alcançar mais alto."];
const arcanaNumbers = ["XVIII", "VIII", "XVII"];
const sealHints = [
  "Selo opcional · Plane no medalhão além da ponte.",
  "Selo opcional · Atravesse o medalhão com um impulso.",
  "Selo opcional · Use o segundo salto para alcançar o medalhão.",
];
const readings = [
  "A Lua fala de intuição. No jardim, a água guarda o desenho da ponte antes que as pedras se revelem.",
  "A Força fala de coragem com domínio. Na cripta, um impulso preciso atravessa o selo entre as plataformas.",
  "A Estrela fala de esperança. No observatório, Neblina encontra outro salto onde parecia faltar chão.",
];
const activeLabels = ["Planeio", "Impulso", "Salto duplo"];
const stage = scene.closest(".stage");
const sealHint = document.getElementById("seal-hint");
const spread = document.getElementById("spread");
const retrySeal = document.getElementById("retry-seal");
const useButton = touches.find(button => button.dataset.action === "use");
let landing, burst, sealBurst, guardianDust;
let sealMissTime = 0;
let bridgeChimed = false;
let impact = null;
const readButton = document.getElementById("read-card");
const targetButton = document.getElementById("target-action");
const rituals = ["Revelar", "Quebrar", "Acender"];
function unlockDuringPlay() {
  if (!pauseMenu.open) unlock();
}
window.addEventListener("pointerdown", unlockDuringPlay, { once: true, capture: true });
window.addEventListener("keydown", unlockDuringPlay, { once: true, capture: true });
const soundButton = document.getElementById("sound");
function updateSound() {
  soundButton.textContent = isMuted() ? "Som desligado" : "Som ligado";
  soundButton.setAttribute("aria-pressed", String(!isMuted()));
}
soundButton.addEventListener("click", () => { toggleSound(); updateSound(); });
updateSound();
let state = createGame();
let cameraX = 0;
let viewWidth = WIDE_VIEW;
let lastFrame;
let powerTime = 2;
let touchMode = matchMedia("(pointer: coarse)").matches;
window.addEventListener("pointerdown", event => { touchMode = event.pointerType !== "mouse"; }, { capture: true });
const exitColumns = LEVELS.map(({ rows }) => rows.find(row => row.includes("X")).indexOf("X"));
const moonStart = LEVELS[0].rows.reduce((left, row) => {
  const column = row.indexOf("M");
  return column < 0 ? left : Math.min(left, column);
}, Infinity);
let accumulator = 0;
let shownLevel = -1;
const keyboard = new Map();
const pointers = new Map();
const queued = new Set();
const movementPulse = { left: 0, right: 0 };

function rect(color, x, y, width, height) {
  context.fillStyle = color;
  context.fillRect(Math.round(x), Math.round(y), width, height);
}

function pixelPath(color, x, y, points) {
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(x + points[0][0], y + points[0][1]);
  for (const [dx, dy] of points.slice(1)) context.lineTo(x + dx, y + dy);
  context.closePath();
  context.fill();
}

function randomAt(x, y, seed = 0) {
  const mixed = Math.imul(x + seed * 17, 374761393) ^ Math.imul(y + seed, 668265263);
  return ((mixed ^ (mixed >>> 13)) >>> 0) / 4294967296;
}

function sparkle(x, y, color, size = 2) {
  rect(color, x - size, y, size * 2 + 1, 1);
  rect(color, x, y - size, 1, size * 2 + 1);
  rect("#fff4dd", x, y, 1, 1);
}

function halo(color, x, y, radius) {
  const glow = context.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, "#0000");
  context.fillStyle = glow;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// Distant landmarks share the horizon and move more slowly than the terrain.
function drawLandmarks(theme, palette) {
  const spacing = 184;
  const offset = Math.round(cameraX * .21);
  for (let n = Math.floor(offset / spacing) - 1; n * spacing - offset < viewWidth; n++) {
    const x = n * spacing - offset + 21;
    const y = 100 + Math.floor(randomAt(n, 2) * 14);
    if (theme === "garden") {
      // A grove of cypresses framing an open garden pavilion.
      for (const dx of [0, 13, 86, 105]) {
        const h = 28 + Math.round(randomAt(n, dx) * 22);
        rect(palette.middle, x + dx, y + 12, 3, 43);
        pixelPath(palette.middle, x + dx, y + 20, [[-7, 0], [-5, -14], [1, -h], [6, -16], [8, 0], [2, 6]]);
      }
      pixelPath(palette.middle, x + 29, y, [[0, 4], [7, 0], [18, -12], [29, 0], [36, 4]]);
      for (const dx of [32, 43, 60]) rect(palette.middle, x + dx, y + 4, 3, 43);
    } else if (theme === "crypt") {
      // Recessed pointed windows in a broken sandstone arcade.
      for (let bay = 0; bay < 3; bay++) {
        const left = x + bay * 23;
        const top = y + (bay === 2 ? 9 : 0);
        pixelPath(palette.middle, left, top, [[0, 48], [0, 0], [22, 0], [22, 48], [18, 48], [18, 14], [11, 7], [5, 14], [5, 48]]);
        rect(palette.distant, left + 2, top + 2, 17, 2);
      }
    } else {
      // A copper observatory with a slit dome and a telescope.
      const left = x + 16;
      rect(palette.middle, left, y + 2, 49, 51);
      pixelPath(palette.middle, left - 3, y + 2, [[0, 0], [3, -9], [11, -17], [20, -21], [34, -21], [46, -14], [55, 0]]);
      pixelPath(palette.distant, left + 23, y, [[0, -18], [3, -18], [9, -3], [6, -3]]);
      pixelPath(palette.middle, left + 34, y - 13, [[0, -3], [21, -19], [25, -15], [4, 2]]);
      for (const dx of [8, 21, 34]) rect(palette.distant, left + dx, y + 8, 4, 9);
    }
  }
}

function paintBackground(theme, palette, time) {
  const sky = context.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  for (const [i, color] of palette.sky.entries()) sky.addColorStop(i / 2, color);
  rect(sky, 0, 0, viewWidth + 1, VIEW_HEIGHT);

  for (let i = 0; i < 116; i++) {
    const x = randomAt(i, 19, 5) * 735 - cameraX * .05;
    const y = 9 + randomAt(29, i, 11) * 130;
    const bright = Math.sin(time / 1100 + i * 1.7) > .6;
    rect(bright ? "#f8e4cbe5" : "#d6c9df80", x, y, 1, 1);
    if (i % 22 === 0) sparkle(x, y, "#f1dfc0", 2);
  }

  const moonX = viewWidth * .76 - cameraX * .10;
  const moonY = 60;
  halo(palette.light + "55", moonX, moonY, 62);
  context.beginPath();
  context.arc(moonX, moonY, theme === "garden" ? 32 : 25, 0, Math.PI * 2);
  context.fillStyle = palette.light;
  context.fill();

  // Keep the lunar maria inside the illuminated disc.
  for (const [dx, dy, width] of [[-11, -12, 7], [-15, -9, 10], [6, 4, 8], [9, 7, 6], [-2, 15, 4]]) {
    rect(palette.glow + "69", moonX + dx, moonY + dy, width, 2);
  }

  const hills = [
    { color: palette.distant, speed: .15, height: 120, span: 98 },
    { color: palette.middle, speed: .28, height: 148, span: 77 },
    { color: palette.near, speed: .44, height: 170, span: 67 },
  ];
  for (const [layer, hill] of hills.entries()) {
    if (layer === 1) drawLandmarks(theme, palette);
    const offset = cameraX * hill.speed;
    const start = Math.floor(offset / hill.span);
    for (let i = start - 1; i < start + 2 + viewWidth / hill.span; i++) {
      const lift = Math.floor(randomAt(i, layer, 5) * 32);
      pixelPath(hill.color, Math.floor(i * hill.span - offset), hill.height, [
        [0, 20], [12, 8], [27, -lift], [43, 3 - lift], [hill.span, 20],
        [hill.span + 4, 99], [0, 99],
      ]);
    }
  }
}

function drawTerrain(tile, x, y, column, row, rows, palette) {
  const top = !"#=B".includes(rows[row - 1]?.[column] ?? ".");
  switch (tile) {
    case "#":
    case "=":
      rect(palette.shade, x, y, TILE, TILE);
      rect(tile === "=" ? palette.stone : palette.soil, x + 1, y + 2, TILE - 2, TILE - 3);
      if (top) {
        rect(palette.top, x, y, TILE, 2);
        rect(palette.second, x, y + 2, TILE, 3);
      }
      rect(palette.detail, x + 4, y + 9, 2 + Math.floor(randomAt(column, row) * 8), 1);
      break;
    case "^":
      for (let i = 0; i < TILE; i += 6) {
        pixelPath("#ad7892", x + i, y + 6, [[0, 12], [3, 0], [6, 12]]);
        pixelPath("#f5bdd0", x + i, y + 6, [[0, 12], [3, 0], [3, 8]]);
      }
      break;
    case "M":
      if (state.powerUsed) {
        rect("#433b72", x, y, TILE, TILE);
        rect("#bdabff", x, y, TILE, 2);
        rect("#786aad", x + 1, y + 8, TILE - 2, 1);
        sparkle(x + TILE / 2, y + 9, "#aa9ae7");
      } else {
        rect("#b2a3ef70", x + 2, y + 2, TILE - 4, 1);
        rect("#b2a3ef55", x + 3, y + 14, TILE - 6, 1);
        sparkle(x + TILE / 2, y + 8, "#9c91c8");
      }
      break;
    case "B":
      if (!state.powerUsed) {
        rect("#4a3042", x, y, TILE, TILE);
        rect("#875b61", x + 1, y + 1, TILE - 2, TILE - 2);
        rect("#c59081", x + 1, y + 1, TILE - 2, 2);
        pixelPath("#492b41", x, y, [[6, 0], [10, 6], [8, 10], [12, 18], [10, 18], [6, 10], [8, 6]]);
      }
      break;
  }
}

function drawFeature(tile, x, y, column, row, palette, time) {
  const center = x + TILE / 2;
  switch (tile) {
    case "C":
    case "R": {
      const cardId = LEVELS[state.levelIndex].cardId;
      const isSeal = tile === "R";
      if (isSeal ? !state.powerUsed || state.seals.includes(cardId) : state.cardFound) break;
      if (isSeal && sealMissTime > 0) {
        const spread = reducedMotion.matches ? 3 : Math.round((1 - sealMissTime / .65) * 6);
        for (const sign of [-1, 1]) {
          const edge = center + sign * (11 + spread);
          rect(palette.light, edge, y + 6, 1, 6);
          rect(palette.light, edge - (sign > 0 ? 2 : 0), y + 5, 3, 1);
        }
      }
      drawArcana(context, { cardId, x: center, y: y + TILE / 2, time,
        kind: isSeal ? "seal" : "card", reducedMotion: reducedMotion.matches });
      break;
    }
    case "*":
      if (!state.collected.includes(`${column},${row}`)) {
        const lift = reducedMotion.matches ? 0 : Math.round(Math.sin(time / 320 + column));
        const cy = y + 8 + lift;
        pixelPath("#5d384d", center, cy, [[0,-6],[2,-2],[5,0],[2,2],[0,6],[-2,2],[-5,0],[-2,-2]]);
        pixelPath("#efbd62", center, cy, [[0,-5],[3,0],[0,5],[-3,0]]);
        rect("#fff4c8", center - 1, cy - 3, 1, 4);
      }
      break;
    case "K":
      rect("#7b708a", center - 1, y - 6, 2, 24);
      rect(state.checkpoint ? "#a3e5b2" : "#c69b82", center, y - 7, 10, 6);
      if (state.checkpoint?.x === column && state.checkpoint.y === row) {
        rect("#76582d", center + 2, y - 7, 7, 6);
        rect("#ffdf8a", center + 4, y - 4, 3, 2);
        for (const dx of [3, 5, 7]) rect("#ffdf8a", center + dx, y - 6, 1, 1);
      }
      sparkle(center - 1, y - 8, state.checkpoint ? "#e6ffd1" : "#e0ba9e", 1);
      break;
    case "S":
      halo(state.powerUsed ? "#ffe3a780" : "#b3b0ed5c", center, y + 4, 22);
      rect("#2b2744", x + 1, y + 13, 16, 5);
      rect("#a8a0c0", x + 1, y + 12, 16, 2);
      rect("#615976", center - 3, y + 6, 6, 6);
      sparkle(center, y + 2, state.powerUsed ? "#ffdc90" : "#cfb6ec", 4);
      break;
    case "X": {
      const door = state.powerUsed ? "#dcab7b" : "#2b2539";
      if (state.powerUsed) halo("#f0bc7c85", center, y + 4, 37);
      pixelPath("#55455f", x - 5, y - 16, [[0, 34], [0, 12], [4, 5], [9, 0],
        [19, 0], [24, 5], [28, 12], [28, 34]]);
      pixelPath(door, x - 1, y - 13, [[0, 31], [0, 10], [4, 4], [7, 1],
        [13, 1], [16, 4], [20, 10], [20, 31]]);
      rect(state.powerUsed ? "#ffe5a2" : "#c09677", center - 2, y + 3, 4, 4);
      if (!state.powerUsed) {
        rect("#6d5c76", center - 6, y - 5, 1, 22);
        rect("#6d5c76", center + 5, y - 5, 1, 22);
      } else {
        sparkle(center, y - 4, "#fff1c6", 3);
      }
      break;
    }
  }
}

function drawEnemy(enemy, originY, palette, time) {
  const x = Math.round((enemy.x + enemy.w / 2) * TILE - cameraX);
  const y = Math.round((enemy.y + enemy.h) * TILE + originY);
  if (enemy.guardian) {
    drawLionGuardian(context, { x, y, facing: enemy.facing, time, reducedMotion: reducedMotion.matches });
    return;
  }
  const step = Math.round(Math.sin(time / 85 + enemy.x) * 2);
  rect("#201a31", x - 8, y - 2, 16, 2);
  rect("#382a48", x - 8, y - 11, 16, 11);
  rect("#6b4564", x - 7, y - 10, 14, 9);
  rect("#f7bab0", x - 6, y - 12, 3, 2);
  rect(palette.glow, x - 5, y - 12, 10, 2);
  rect(palette.light, x - 3 + enemy.facing, y - 7, 2, 2);
  rect(palette.light, x + 1 + enemy.facing, y - 7, 2, 2);
  rect("#4d375e", x - 5 + step, y - 2, 3, 2);
  rect("#4d375e", x + 2 - step, y - 2, 3, 2);
}

function drawCat(player, originY, time) {
  const x = Math.round((player.x + player.w / 2) * TILE - cameraX);
  const y = Math.round((player.y + player.h) * TILE + originY);
  const walking = player.grounded && Math.abs(player.vx) > .45;
  const step = walking ? Math.round(Math.sin(time / 62) * 2) : 0;
  const tail = player.grounded ? Math.round(Math.sin(time / 175)) : -2;
  context.save();
  context.translate(x, y);
  context.scale(player.facing, landing?.age < .10 && !reducedMotion.matches ? .88 : 1);
  pixelPath("#a099b5", -11, -19, [[0, 12], [-3, 9 + tail], [-4, 4 + tail],
    [-2, 3 + tail], [-1, 7 + tail], [3, 11], [8, 11], [9, 5], [9, 0], [11, 0],
    [14, 3], [16, 3], [19, 0], [20, 0], [21, 8], [23, 10], [23, 14],
    [20, 16], [19, 19], [16, 19], [15, 17], [9, 17], [8, 19], [3, 19], [2, 15]]);
  pixelPath("#191724", -11, -19, [[0, 13], [-2, 9 + tail], [-3, 5 + tail],
    [-2, 5 + tail], [-1, 9 + tail], [3, 12], [9, 12], [10, 5], [10, 1],
    [14, 4], [16, 4], [20, 1], [20, 8], [22, 10], [22, 13], [19, 15],
    [18, 18], [16, 18], [16, 16], [8, 16], [7, 18], [4, 18], [3, 14]]);
  rect("#67516e", 0, -16, 2, 3);
  rect("#67516e", 7, -16, 2, 3);
  rect("#3a3248", -7, -7, 9, 3);
  rect("#f6ce7a", 2, -11, 2, 2);
  rect("#f6ce7a", 7, -11, 2, 2);
  rect("#c29bb4", 9, -8, 2, 1);
  // Saffron neckerchief and a moonlit edge along the black coat.
  rect("#ba604d", 0, -6, 9, 2);
  rect("#ffd08a", 3, -6, 5, 1);
  pixelPath("#db8562", 0, -5, [[1, 0], [-4, 3], [-7, 2], [-5, 0]]);
  rect("#ceb5d9", -6, -8, 4, 1);
  rect("#fff3c7", 8, -11, 1, 1);
  rect("#786787", -6 + step, -2, 3, 2);
  rect("#786787", 6 - step, -2, 3, 2);
  context.restore();
}

function drawPowerEffect(tile, x, y, column, palette) {
  if (!state.powerUsed || powerTime >= 1.4) return;
  const t = reducedMotion.matches ? .45 : powerTime;
  if (tile === "M" && state.levelIndex === 0) {
    const wave = reducedMotion.matches ? .2 : t - (column - moonStart) * .09;
    if (wave >= 0 && wave < .45) rect("#fff2cd", x, y, TILE, 3);
  } else if (tile === "B") {
    for (let i = 0; i < 3; i++) {
      rect(palette.top, x + 8 + (i - 1) * t * 17, y + 6 - t * 10 + t * t * 20, 3, 2);
    }
  }
}

function drawStarTrail(originY, palette) {
    if (!state.powerUsed || state.levelIndex !== 2 || powerTime >= 1.4) return;
    const rows = LEVELS[state.levelIndex].rows;
    const row = rows.findIndex(line => line.includes("S"));
    const column = rows[row].indexOf("S");
    const x = column * TILE - cameraX;
    const y = row * TILE + originY;
    const t = powerTime;
    const travel = reducedMotion.matches ? 0 : Math.min(1, t);
    const reach = (exitColumns[state.levelIndex] - column) * TILE;
    const exitRow = LEVELS[state.levelIndex].rows.findIndex(row => row.includes("X"));
    sparkle(x + 9 + reach * travel, y + 2 + (exitRow - row) * TILE * travel - Math.sin(travel * Math.PI) * 22, palette.light, 4);
}

function draw(time) {
  const level = LEVELS[state.levelIndex];
  const { rows, theme } = level;
  const palette = palettes[theme];
  const originY = VIEW_HEIGHT - rows.length * TILE;
  paintBackground(theme, palette, time);
  const start = Math.max(0, Math.floor(cameraX / TILE) - 2);
  const end = Math.min(rows[0].length, Math.ceil((cameraX + viewWidth) / TILE) + 2);
  for (const [row, line] of rows.entries()) {
    for (let column = start; column < end; column++) {
      const tile = line[column];
      const x = column * TILE - cameraX;
      const y = row * TILE + originY;
      drawTerrain(tile, x, y, column, row, rows, palette);
      drawFeature(tile, x, y, column, row, palette, time);
      drawPowerEffect(tile, x, y, column, palette);
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.alive) drawEnemy(enemy, originY, palette, time);
  }
  drawStarTrail(originY, palette);
  if (level.cardId === "lua") {
    const left = 29 * TILE - cameraX;
    const water = originY + 13 * TILE;
    rect("#34405a", left, water, 8 * TILE, TILE);
    for (let i = 0; i < 8; i++) {
      const tileRow = rows.findIndex(line => line[29 + i] === "M");
      if (tileRow < 0) continue;
      const depth = (11 - tileRow) * 4;
      rect(state.powerUsed ? "#bcb0eb" : "#8f91b5", left + i * TILE + 1, water + 3 + depth, TILE - 2, 2);
    }
  }
  if (landing && landing.age < .36 && !reducedMotion.matches) {
    const x = landing.x * TILE - cameraX;
    const y = originY + landing.y * TILE;
    const t = landing.age / .36;
    for (const sign of [-1, 1]) {
      if (landing.bridge) rect("#bcb0eb", x + sign * t * 16, originY + 13 * TILE + 8, 6, 1);
      else rect(["#afad75","#c38a79","#b7cfee"][state.levelIndex], x + sign * (4 + t * 11), y - Math.sin(t * Math.PI) * 7, 3, 2);
    }
  }
  if (state.levelIndex === 2) {
    const stars = [[32,39],[48,28],[63,36]];
    context.strokeStyle = "#ebd8a2";
    context.beginPath();
    stars.slice(0,state.collected.length).forEach(([x,y],i) => {
      if (!i) context.moveTo(x,y); else context.lineTo(x,y);
    });
    context.stroke();
    stars.slice(0,state.collected.length).forEach(([x,y]) => sparkle(x,y,"#ffe4a5",2));
  }
  if (burst && burst.age < .42) {
    const t = reducedMotion.matches ? .35 : burst.age / .42;
    for (let i=0; i<6; i++) {
      const angle = i * Math.PI / 3;
      rect(palette.light, burst.x * TILE - cameraX + Math.cos(angle)*t*16,
        originY + burst.y*TILE + Math.sin(angle)*t*12, 2, 2);
    }
  }
  if (sealBurst && sealBurst.age < .8) {
    drawSealBurst(context, {
      cardId: level.cardId, x: sealBurst.x * TILE - cameraX, y: originY + sealBurst.y * TILE,
      progress: sealBurst.age / .8, reducedMotion: reducedMotion.matches
    });
  }
  const target = powerTarget(state);
  targetButton.hidden = !target || !!impact;
  if (target && !impact) {
    const x = Math.round((target.x + .5) * TILE - cameraX);
    const y = originY + target.y * TILE - 4;
    const verb = rituals[state.levelIndex];
    showText(targetButton, touchMode ? ["Toque para revelar","Toque para quebrar","Toque para acender"][state.levelIndex] : "E · " + verb);
    targetButton.style.left = (100 * x / viewWidth) + "%";
    targetButton.style.top = (100 * (y - 8) / VIEW_HEIGHT) + "%";
    halo(palette.glow + "bb", x, y, 15);
    context.fillStyle = palette.light;
    context.font = "bold 14px serif";
    context.fillText(symbols[state.levelIndex], x - 5, y + 4);
  }
  if (guardianDust && guardianDust.age < .4) {
    const t = reducedMotion.matches ? .3 : guardianDust.age / .4;
    for (let i = -2; i <= 2; i++) {
      const x = guardianDust.x * TILE - cameraX + i * (3 + t * 9);
      const y = originY + guardianDust.y * TILE - (3 - Math.abs(i)) * 4 * Math.sin(t * Math.PI);
      rect(i % 2 ? "#dfad79" : "#99736a", x, y, 3, 2);
    }
  }
  if (state.activeAbility) {
    const { player } = state;
    drawAbilityAura(context, {
      cardId: level.cardId,
      x: (player.x + player.w / 2) * TILE - cameraX,
      y: (player.y + player.h / 2) * TILE + originY,
      facing: player.facing, time, reducedMotion: reducedMotion.matches
    });
  }
  if (impact) {
    const px = impact.x * TILE - cameraX;
    const py = Math.max(10, Math.min(VIEW_HEIGHT - 10, originY + impact.y * TILE));
    const radius = reducedMotion.matches ? 7 : 4 + Math.round((.32 - impact.remaining) * 25);
    context.strokeStyle = "#ffe1a2";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(px, py, radius, 0, Math.PI * 2);
    context.stroke();
    rect("#f7a28d", px - 1, py - 3, 2, 4);
    rect("#fff0dd", px - 1, py + 3, 2, 2);
  } else {
    drawCat(state.player, originY, time);
  }
}

function targetCamera() {
  const levelWidth = LEVELS[state.levelIndex].rows[0].length * TILE;
  const playerCenter = (state.player.x + state.player.w / 2) * TILE;
  return Math.max(0, Math.min(levelWidth - viewWidth, playerCenter - viewWidth * .34));
}

function resize() {
  const { clientWidth, clientHeight } = canvas;
  if (!clientWidth || !clientHeight) return;
  viewWidth = VIEW_HEIGHT * clientWidth / clientHeight;
  canvas.width = Math.round(viewWidth * 2);
  context.setTransform(canvas.width / viewWidth, 0, 0, canvas.height / VIEW_HEIGHT, 0, 0);
  context.imageSmoothingEnabled = false;
  if (impact) {
    const farEdge = LEVELS[state.levelIndex].rows[0].length * TILE - viewWidth;
    cameraX = Math.max(0, Math.min(impact.x * TILE - viewWidth * .45, farEdge));
  } else {
    cameraX = targetCamera();
  }
  draw(0);
}

function showText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function showSpread() {
  spread.replaceChildren();
  for (const level of LEVELS.slice(0, state.levelIndex + 1)) {
    const { cardId } = level;
    const sealed = state.seals.includes(cardId);
    const figure = document.createElement("figure");
    figure.dataset.sealed = String(sealed);
    const art = document.createElement("img");
    art.src = "./assets/taro/" + cardId + ".webp";
    art.alt = "";
    const caption = document.createElement("figcaption");
    caption.textContent = (sealed ? "✧ " : "") + CARDS[cardId].name;
    figure.setAttribute("aria-label", CARDS[cardId].name + (sealed ? ", com selo" : ", sem selo"));
    figure.append(art, caption);
    spread.append(figure);
  }
}
function updateHUD() {
  const { levelIndex, phase, cardFound, powerUsed, message } = state;
  const level = LEVELS[levelIndex];
  const card = CARDS[level.cardId];
  if (shownLevel !== levelIndex) {
    shownLevel = levelIndex;
    stageNumber.textContent = `Fase ${levelIndex + 1} / ${LEVELS.length}`;
    stageTitle.textContent = level.name;
    stage.dataset.card = level.cardId;
    document.getElementById("arcana-number").textContent = "Arcano " + arcanaNumbers[levelIndex];
    canvas.setAttribute("aria-label", `Neblina em ${level.name}`);
    cardArt.src = `./assets/taro/${level.cardId}.webp`;
    cardName.textContent = card.name;
    cardPower.textContent = card.power;
  }

  readButton.hidden = !cardFound || phase !== "playing";
  showText(readButton, "Ler " + card.name + (touchMode ? "" : " · L"));
  showText(cardPower, powerUsed ? abilityHints[levelIndex] : card.power);
  let goal = getObjective(state);
  if (powerUsed && phase === "playing") {
    const guardianAhead = level.cardId === "forca" && state.enemies.some(enemy =>
      enemy.guardian && enemy.alive && Math.abs(enemy.x - state.player.x) < 9);
    goal += " " + (guardianAhead ? "Salte sobre o leão ou atravesse-o com o impulso da Força." : abilityHints[levelIndex]);
  }
  showText(objective, goal);
  const sealed = state.seals.includes(level.cardId);
  sealHint.hidden = !powerUsed;
  showText(sealHint, sealed ? "✧ Selo conquistado" : sealHints[levelIndex]);
  showText(feedback, sealed && message.startsWith("Selo conquistado") ? "" : message || "");
  const sparks = `✦ ${state.collected.length}/${sparksPerLevel[levelIndex]}`;
  if (sparkCount.textContent !== sparks) {
    sparkCount.textContent = sparks;
    sparkCount.setAttribute("aria-label", `${state.collected.length} de ${sparksPerLevel[levelIndex]} brilhos coletados`);
  }
  const ready = Boolean(powerTarget(state));
  cardButton.dataset.state = powerUsed ? "used" : ready ? "ready" : cardFound ? "found" : "locked";
  const dash = powerUsed && levelIndex === 1 && phase === "playing";
  const recharging = dash && state.dashCooldown > 0;
  cardButton.disabled = !ready && (!dash || recharging);
  const useLabel = touchMode ? "Toque para usar" : "Usar · E";
  showText(cardStatus, recharging ? "Recarregando" : powerUsed ? activeLabels[levelIndex] : ready ? useLabel : cardFound ? "Aproxime-se do alvo" : "A encontrar");
  useButton.disabled = cardButton.disabled;
  const touchLabel = dash ? (recharging ? "Recarga" : "Impulso") : "Carta";
  if (useButton.lastChild.textContent !== " " + touchLabel) useButton.lastChild.textContent = " " + touchLabel;

  pauseButton.disabled = phase !== "playing";
  if (scene.dataset.phase === phase) return;
  scene.dataset.phase = phase;
  victory.hidden = phase === "playing";
  if (phase === "playing") return;

  const won = phase === "won";
  showSpread();
  retrySeal.hidden = sealed;
  const fullReading = won && state.seals.length === LEVELS.length;
  victoryTitle.textContent = won ? "A tiragem de Neblina" : CARDS[level.cardId].name;

  victoryDetail.textContent = won
    ? fullReading
      ? "A Lua revelou o caminho, a Força deu coragem e a Estrela guiou Neblina para casa."
      : "Sob a última estrela, Neblina abre as três cartas que a trouxeram até aqui."
    : `A seguir: ${LEVELS[levelIndex + 1].name}.`;
  victoryDetail.textContent += ` Brilhos nesta fase: ${state.collected.length}/${sparksPerLevel[levelIndex]}.`;
  if (won) {
    const total = sparksPerLevel.reduce((sum, count) => sum + count, 0);
    victoryDetail.textContent += ` Aventura: ${state.previousSparks + state.collected.length}/${total}.`;
  }
  victoryDetail.textContent += won
    ? ` Selos da tiragem: ${state.seals.length}/${LEVELS.length}.`
    : sealed ? " Selo conquistado." : " Tente o selo outra vez com a carta ativa.";
  nextAction.textContent = won ? "Jogar de novo" : "Próxima fase";
  clearInput();
  nextAction.focus({ preventScroll: true });
}

function queueAction(action) {
  if (action === "left" || action === "right") {
    movementPulse[action] = 3;
  } else {
    queued.add(action);
  }
}

function clearInput() {
  keyboard.clear();
  pointers.clear();
  queued.clear();
  movementPulse.left = 0;
  movementPulse.right = 0;
  for (const button of touches) button.classList.remove("is-held");
}

function stepInput() {
  const held = new Set([...keyboard.values(), ...pointers.values()]);
  const jump = queued.delete("jump");
  const use = queued.delete("use");
  const left = held.has("left") || movementPulse.left > 0;
  const right = held.has("right") || movementPulse.right > 0;
  movementPulse.left = Math.max(0, movementPulse.left - 1);
  movementPulse.right = Math.max(0, movementPulse.right - 1);
  return { left, right, jump, jumpHeld: jump || held.has("jump"), use };
}

function animate(now) {
  if (pauseMenu.open) {
    requestAnimationFrame(animate);
    return;
  }
  if (state.phase === "playing") score(state.levelIndex);
  const elapsed = lastFrame === undefined ? 0 : Math.min((now - lastFrame) / 1000, .05);
  lastFrame = now;
  if (impact) {
    impact.remaining -= elapsed;
    if (impact.remaining > 0) {
      draw(reducedMotion.matches ? 0 : now);
      requestAnimationFrame(animate);
      return;
    }
    impact = null;
    cameraX = targetCamera();
  }
  accumulator += elapsed;
  let snapped = reducedMotion.matches;
  while (accumulator >= STEP) {
    const playerX = state.player.x;
    const wasFalling = state.player.vy > 3;
    const oldPlayer = state.player;
    const oldCount = state.collected.length, oldCard = state.cardFound, oldPulse = state.skillPulse, oldCheckpoint = state.checkpoint;
    const oldSeals = state.seals.length;
    const oldSealMiss = state.sealMissPulse;
    const oldGuardian = state.guardianPulse;
    sealMissTime = Math.max(0, sealMissTime - STEP);
    if (guardianDust) guardianDust.age += STEP;
    if (sealBurst) sealBurst.age += STEP;
    if (burst) burst.age += STEP;
    if (landing) landing.age += STEP;
    const hadPower = state.powerUsed;
    powerTime += STEP;
    const oldLoss = state.loss;
    state = tick(state, stepInput(), STEP);
    if (state.loss !== oldLoss) {
      impact = { ...state.loss, remaining: .32 };
      cue([55, 48]);
      clearInput();
      accumulator = 0;
      break;
    }
    if (state.guardianPulse !== oldGuardian) {
      const lion = state.enemies.find(enemy => enemy.guardian);
      guardianDust = { x: lion.x + lion.w / 2, y: lion.y + lion.h / 2, age: 0 };
      cue([48, 55, 63, 72]);
    }
    if (state.sealMissPulse !== oldSealMiss) {
      sealMissTime = .65;
      cue([69, 64]);
    }
    if (state.seals.length > oldSeals) {
      sealMissTime = 0;
      sealBurst = { x: state.player.x + state.player.w / 2, y: state.player.y + state.player.h / 2, age: 0 };
      cue([[74,81,86,90],[60,67,72,76],[71,78,83,90]][state.levelIndex]);
    }
    if (!oldCard && state.cardFound) cardButton.classList.add("revealed");
    if (state.skillPulse !== oldPulse || state.cardFound !== oldCard || state.collected.length !== oldCount || state.checkpoint !== oldCheckpoint) {
      burst = { x: state.player.x + .35, y: state.player.y + .4, age: 0 };
      if (hadPower || !state.powerUsed) cue(state.cardFound !== oldCard ? [67,74,79] : state.skillPulse !== oldPulse ? [55,67] : state.checkpoint !== oldCheckpoint ? [60,67,72] : [76,81]);
    }
    if (!hadPower && state.powerUsed) cue([[74,81,86],[48,55,60],[67,74,83]][state.levelIndex]);
    if (oldPlayer === state.player && wasFalling && state.player.grounded) {
      const x = state.player.x + state.player.w / 2;
      const y = state.player.y + state.player.h;
      const bridge = state.levelIndex === 0 && LEVELS[0].rows[Math.round(y)]?.[Math.floor(x)] === "M";
      landing = { x, y, bridge, age: 0 };
      if (bridge && !bridgeChimed) { cue([83]); bridgeChimed = true; }
    }
    if (!hadPower && state.powerUsed) powerTime = 0;
    if (Math.abs(playerX - state.player.x) > 4) snapped = true;
    accumulator -= STEP;
  }
  const target = targetCamera();
  if (!impact) cameraX = snapped ? target : cameraX + (target - cameraX) * Math.min(1, elapsed * 9);
  draw(reducedMotion.matches ? 0 : now);
  updateHUD();
  requestAnimationFrame(animate);
}

function begin(nextState) {
  clearInput();
  powerTime = 2;
  landing = burst = sealBurst = guardianDust = null;
  sealMissTime = 0;
  impact = null;
  cardButton.classList.remove("revealed");
  bridgeChimed = false;
  state = nextState;
  accumulator = 0;
  cameraX = targetCamera();
  updateHUD();
  draw(0);
  canvas.focus({ preventScroll: true });
}

function completeAction() {
  if (state.phase === "won") begin(createGame());
  else if (state.phase === "level-complete") begin(advanceLevel(state));
}

function pauseGame(readingRequested = false) {
  if (pauseMenu.open || state.phase !== "playing") return;
  clearInput();
  lastFrame = undefined;
  accumulator = 0;
  hush();
  const { cardId } = LEVELS[state.levelIndex];
  const reading = document.getElementById("card-reading");
  reading.hidden = !state.cardFound;
  if (state.cardFound) {
    document.getElementById("reading-art").src = cardArt.src;
    document.getElementById("reading-title").textContent = arcanaNumbers[state.levelIndex] + " · " + CARDS[cardId].name;
    document.getElementById("reading-text").textContent = readings[state.levelIndex];
  }
  const readingOnly = readingRequested === true && state.cardFound;
  pauseMenu.setAttribute("aria-labelledby", readingOnly ? "reading-title" : "pause-title");
  if (readingOnly) pauseMenu.setAttribute("aria-describedby", "reading-text");
  else pauseMenu.removeAttribute("aria-describedby");
  pauseMenu.showModal();
}

readButton.addEventListener("click", () => pauseGame(true));
targetButton.addEventListener("click", () => {
  if (powerTarget(state)) queueAction("use");
  canvas.focus({ preventScroll: true });
});
pauseButton.addEventListener("click", pauseGame);
document.getElementById("resume-game").addEventListener("click", () => pauseMenu.close());
pauseMenu.addEventListener("close", () => {
  unlock();
  lastFrame = undefined;
  canvas.focus({ preventScroll: true });
});

window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  touchMode = false;
  const key = event.key.toLowerCase();
  if (key === "p" || key === "escape") {
    if (state.phase === "playing") {
      event.preventDefault();
      if (!event.repeat) {
        if (pauseMenu.open) pauseMenu.close();
        else pauseGame();
      }
    }
    return;
  }
  if (pauseMenu.open) return;
  if (key === "l" && state.cardFound && state.phase === "playing") {
    event.preventDefault();
    if (!event.repeat) pauseGame(true);
    return;
  }
  if (state.phase !== "playing") {
    if (key === "enter" && event.target !== retrySeal && !event.repeat) {
      event.preventDefault();
      completeAction();
    }
    return;
  }

  const action = keyActions[key];
  if (!action || (key === " " && event.target instanceof HTMLButtonElement)) return;
  event.preventDefault();
  if (event.repeat || keyboard.has(key)) return;
  keyboard.set(key, action);
  queueAction(action);
});

window.addEventListener("keyup", (event) => keyboard.delete(event.key.toLowerCase()));
window.addEventListener("blur", clearInput);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseGame();
    clearInput();
    lastFrame = undefined;
    accumulator = 0;
  }
});

canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
document.getElementById("reset-game").addEventListener("click", () => {
  pauseMenu.close();
  begin(restartLevel(state));
});
retrySeal.addEventListener("click", () => begin(retrySealChallenge(state)));
nextAction.addEventListener("click", completeAction);
cardButton.addEventListener("click", () => {
  if (state.phase === "playing") queueAction("use");
  canvas.focus({ preventScroll: true });
});

for (const button of touches) {
  const { action } = button.dataset;
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.phase !== "playing") return;
    event.preventDefault();
    touchMode = event.pointerType !== "mouse";
    button.setPointerCapture(event.pointerId);
    button.classList.add("is-held");
    pointers.set(event.pointerId, action);
    queueAction(action);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(eventName, (event) => {
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(action)) button.classList.remove("is-held");
    });
  }
  button.addEventListener("click", (event) => {
    if (event.detail === 0 && state.phase === "playing") queueAction(action);
  });
}

new ResizeObserver(resize).observe(canvas);
resize();
updateHUD();
requestAnimationFrame(animate);
