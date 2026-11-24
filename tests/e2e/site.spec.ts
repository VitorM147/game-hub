import { expect, test } from "@playwright/test";

const ROTAS = ["/", "/games", "/categorias", "/novidades", "/favoritos", "/preferencias", "/criadores", "/desenvolvedores", "/privacidade", "/games/rio-redline", "/games/gta-vi"];

test("rotas principais abrem sem erro de console e sem rolagem horizontal", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  for (const r of ROTAS) {
    await page.goto(r, { waitUntil: "networkidle" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow em ${r}`).toBe(true);
    await expect(page.locator("body")).not.toContainText(/game ?hub/i);
  }
  expect(erros).toEqual([]);
});

test("CSP presente em produção e sem recursos de terceiros", async ({ page }) => {
  const externos: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (!["localhost", ""].includes(u.hostname) && !r.url().startsWith("data:") && !r.url().startsWith("blob:")) externos.push(r.url());
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute("content", /object-src 'none'/);
  expect(externos).toEqual([]);
});

test("busca por título e por desenvolvedor", async ({ page }) => {
  await page.goto("/games?q=kaique", { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toContainText(/RIO REDLINE/i);
  await page.goto("/games?q=zzzz-nada", { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).not.toContainText(/RIO REDLINE/i);
});

test("GTA VI aparece em Explorar como em breve, sem jogar nem baixar", async ({ page }) => {
  await page.goto("/games", { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toContainText(/Grand Theft Auto VI/i);
  await page.goto("/games/gta-vi", { waitUntil: "networkidle" });
  await expect(page.locator('a[href^="/play/"], a[download]')).toHaveCount(0);
  const r = await page.goto("/play/gta-vi");
  expect(r?.status()).toBe(404);
});

test("migração de gamehub:v1 e remoção de item do histórico", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem("gamehub:v1", JSON.stringify({ favorites: ["rio-redline"], history: [{ slug: "neblina", lastPlayedAt: Date.now(), plays: 2 }] })),
  );
  await page.goto("/favoritos", { waitUntil: "networkidle" });
  await expect(page.getByRole("main")).toContainText(/RIO REDLINE/i);
  expect(await page.evaluate(() => [localStorage.getItem("joystation:v1") !== null, localStorage.getItem("gamehub:v1") !== null])).toEqual([true, true]);
  await page.getByRole("button", { name: /Remover NEBLINA/i }).click();
  await expect(page.getByRole("main")).not.toContainText(/Última sessão/);
});

test("limpar histórico pede confirmação", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("joystation:v1", JSON.stringify({ history: [{ slug: "neblina", lastPlayedAt: Date.now(), plays: 1 }] })));
  await page.goto("/favoritos", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Limpar histórico/i }).click();
  await expect(page.getByText(/Apagar todo o histórico\?/)).toBeVisible();
  await page.getByRole("button", { name: /Cancelar/i }).click();
  await expect(page.getByRole("main")).toContainText(/Última sessão/);
});

test("dados corrompidos no localStorage não quebram o site", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("joystation:v1", '{"favorites":["<script>alert(1)</script>"],"history":"x"'));
  await page.goto("/favoritos", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Favoritos/i }).first()).toBeVisible();
});

for (const slug of ["rio-redline", "neblina", "rescue-robot"]) {
  test(`jogo ${slug} carrega no iframe com sandbox`, async ({ page }) => {
    await page.goto(`/play/${slug}`, { waitUntil: "networkidle" });
    const iframe = page.locator("iframe");
    await expect(iframe).toHaveAttribute("sandbox", /allow-scripts/);
    expect(await iframe.getAttribute("sandbox")).not.toMatch(/allow-top-navigation|allow-popups|allow-forms/);
    await expect(page.frameLocator("iframe").locator("canvas").first()).toBeAttached({ timeout: 15_000 });
  });
}
