import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { CATEGORIES } from "../data/categories.ts";
import { CREATORS } from "../data/creators.ts";
import { GAMES } from "../data/games.ts";

const pub = (u: string) => new URL(`../public${u}`, import.meta.url);
const ids = new Set(CATEGORIES.map((c) => c.id));

test("catálogo: ids, slugs e títulos únicos; slug seguro para URL", () => {
  assert.equal(new Set(GAMES.map((g) => g.id)).size, GAMES.length);
  assert.equal(new Set(GAMES.map((g) => g.slug)).size, GAMES.length);
  for (const g of GAMES) assert.match(g.slug, /^[a-z0-9][a-z0-9-]*$/, g.slug);
});

test("catálogo: categorias existem e são 10 sem repetição", () => {
  assert.equal(CATEGORIES.length, 10);
  assert.equal(ids.size, 10);
  for (const g of GAMES) {
    assert.ok(g.categories.length > 0, `${g.slug} sem categoria`);
    for (const c of g.categories) assert.ok(ids.has(c), `${g.slug}: categoria ${c}`);
  }
});

test("catálogo: imagens e builds web referenciados existem em /public", () => {
  for (const g of GAMES) {
    assert.ok(existsSync(pub(g.coverImage.src)), `${g.slug}: capa ${g.coverImage.src}`);
    for (const s of g.screenshots) assert.ok(existsSync(pub(s.src)), `${g.slug}: captura ${s.src}`);
  }
});

test("catálogo: jogo web publicado tem arquivo de entrada (depois de npm run build:game)", () => {
  for (const g of GAMES.filter((x) => x.status === "published" && x.launchMode === "web")) {
    assert.ok(g.playableUrl, `${g.slug} sem playableUrl`);
    assert.ok(existsSync(pub(g.playableUrl!)), `${g.slug}: ${g.playableUrl} não existe; rode npm run build:game`);
  }
});

test("catálogo: conteúdo editorial/em breve nunca é jogável nem baixável", () => {
  for (const g of GAMES.filter((x) => x.editorial || x.status === "coming-soon")) {
    assert.equal(g.playableUrl, undefined, g.slug);
    assert.equal(g.downloadUrl, undefined, g.slug);
    assert.notEqual(g.launchMode, "web", g.slug);
    assert.ok(g.notice, `${g.slug} precisa de aviso`);
  }
});

test("catálogo: todo jogo tem créditos reais ou é editorial", () => {
  for (const g of GAMES.filter((x) => !x.editorial)) assert.ok(g.credits.length > 0, `${g.slug} sem créditos`);
});

test("criadores: 8 pessoas, RAs numéricos e únicos", () => {
  assert.equal(CREATORS.length, 8);
  assert.equal(new Set(CREATORS.map((c) => c.ra)).size, 8);
  for (const c of CREATORS) assert.match(c.ra, /^\d{8,9}$/);
});
