import { defineConfig, devices } from "@playwright/test";

/**
 * e2e contra o build de produção em modo servidor (`npm run build` antes).
 * Localmente, aponte para um Chrome já instalado: CHROME_PATH=/usr/bin/google-chrome npm run test:e2e
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] },
  },
  webServer: { command: `npx next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "celular", use: { ...devices["Pixel 7"], launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : { args: ["--no-sandbox"] } } },
  ],
});
