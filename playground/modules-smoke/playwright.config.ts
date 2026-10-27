import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  // 每个用例都会拉起一个 Electron 进程, 串行跑更稳
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
});
