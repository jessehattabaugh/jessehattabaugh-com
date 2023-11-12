import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
const url = 'http://localhost:3333';
export default defineConfig({
	expect: {
		toMatchSnapshot: { maxDiffPixelRatio: 0.1 },
	},
	fullyParallel: true,
	maxFailures: 0,
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
		command: 'npm start',
		url,
	},
});
