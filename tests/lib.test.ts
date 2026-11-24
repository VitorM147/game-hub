import assert from "node:assert/strict";
import { test } from "node:test";
import { pickStoredValue } from "../lib/migrate.ts";
import { matchesQuery } from "../lib/search.ts";

const store = (data: Record<string, string>) => ({ getItem: (k: string) => data[k] ?? null });

test("migração: usa a chave nova quando existe", () => {
  const r = pickStoredValue(store({ "joystation:v1": '{"favorites":["a"]}', "gamehub:v1": '{"favorites":["b"]}' }), "joystation:v1", ["gamehub:v1"]);
  assert.deepEqual(r, { raw: '{"favorites":["a"]}', migrated: false });
});

test("migração: traz dados do Game Hub quando a chave nova não existe", () => {
  const r = pickStoredValue(store({ "gamehub:v1": '{"favorites":["rio-redline"]}' }), "joystation:v1", ["gamehub:v1"]);
  assert.equal(r?.migrated, true);
  assert.equal(JSON.parse(r!.raw).favorites[0], "rio-redline");
});

test("migração: ignora JSON antigo corrompido e não quebra", () => {
  assert.equal(pickStoredValue(store({ "gamehub:v1": "{oops" }), "joystation:v1", ["gamehub:v1"]), null);
});

test("migração: sem dados devolve null", () => {
  assert.equal(pickStoredValue(store({}), "joystation:v1", ["gamehub:v1"]), null);
});

const game = {
  slug: "rio-redline",
  title: "RIO REDLINE",
  developer: "Kaique Martins dos Santos",
  genre: "Corrida arcade",
  tags: ["Nitro"],
  categoryLabels: ["Corrida"],
  description: "Velocidade sem limites",
};

test("busca: acha por título, ignorando acento e caixa", () => {
  assert.ok(matchesQuery(game, "rio"));
  assert.ok(matchesQuery(game, "VELOCIDADE"));
});

test("busca: acha por desenvolvedor", () => {
  assert.ok(matchesQuery(game, "kaique"));
  assert.ok(matchesQuery(game, "martins santos"));
});

test("busca: todos os termos precisam casar", () => {
  assert.equal(matchesQuery(game, "kaique zelda"), false);
});

test("busca: consulta vazia casa tudo", () => {
  assert.ok(matchesQuery(game, "  "));
});
