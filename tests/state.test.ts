import assert from "node:assert/strict";
import { test } from "node:test";
import { FAVORITES_LIMIT, HISTORY_LIMIT, sanitize } from "../lib/state.ts";

test("estado: entradas inválidas viram o padrão", () => {
  for (const bad of [null, undefined, 42, "x", [], { favorites: "x", history: 5, prefs: null }]) {
    const s = sanitize(bad);
    assert.deepEqual(s.favorites, []);
    assert.deepEqual(s.history, []);
    assert.equal(s.prefs.showControlsHint, true);
  }
});

test("estado: descarta slugs maliciosos ou fora do formato", () => {
  const s = sanitize({ favorites: ["rio-redline", "<script>", "../etc", "A", "", 7, "a".repeat(200), "ok-1"] });
  assert.deepEqual(s.favorites, ["rio-redline", "ok-1"]);
});

test("estado: favoritos sem repetição e com teto", () => {
  const many = Array.from({ length: FAVORITES_LIMIT + 50 }, (_, i) => `jogo-${i}`);
  assert.equal(sanitize({ favorites: [...many, "jogo-0"] }).favorites.length, FAVORITES_LIMIT);
});

test("estado: histórico valida números, limita e remove duplicados mantendo o mais recente", () => {
  const h = [
    { slug: "a", lastPlayedAt: 10, plays: 2 },
    { slug: "a", lastPlayedAt: 20, plays: 5 },
    { slug: "b", lastPlayedAt: Number.NaN, plays: 1 },
    { slug: "c", lastPlayedAt: 5, plays: -3 },
    { slug: "d", lastPlayedAt: 6, plays: 1e12 },
  ];
  const s = sanitize({ history: h });
  assert.deepEqual(s.history.map((x) => x.slug), ["a", "d", "c"]);
  assert.equal(s.history[0].plays, 5);
  assert.equal(s.history.find((x) => x.slug === "c")?.plays, 1);
  assert.equal(s.history.find((x) => x.slug === "d")?.plays, 1_000_000);
  const big = Array.from({ length: 100 }, (_, i) => ({ slug: `j${i}`, lastPlayedAt: i, plays: 1 }));
  assert.equal(sanitize({ history: big }).history.length, HISTORY_LIMIT);
});

test("estado: preferências só aceitam booleanos", () => {
  const s = sanitize({ prefs: { reduceMotion: "sim", compactGrid: true, showControlsHint: 0 } });
  assert.deepEqual(s.prefs, { reduceMotion: false, showControlsHint: true, compactGrid: true });
});
