import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const url = 'http://localhost:3333';
export default defineConfig({
	fullyParallel: true,
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	reporter: 'html',
	testDir: './tests',
	use: {
		baseURL: url,
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'npm run start',
		url,
	},
});
