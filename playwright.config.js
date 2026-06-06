import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/playwright',
	testMatch: '**/*.e2e.js',
	timeout: 30_000,
	retries: 0,
	workers: 1,
	use: { headless: true },
});
