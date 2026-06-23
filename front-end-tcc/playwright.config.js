const { defineConfig } = require('@playwright/test');

const apiPort = Number(process.env.PLAYWRIGHT_API_PORT || 8011);
const pythonCommand = process.env.PLAYWRIGHT_PYTHON || '../venv312/bin/python';

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_API_BASE_URL || `http://127.0.0.1:${apiPort}`,
  },
  webServer: {
    command: `cd ../back-end-tcc && PLAYWRIGHT_API_PORT=${apiPort} ${pythonCommand} tests/playwright_materials_server.py`,
    url: `http://127.0.0.1:${apiPort}/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
