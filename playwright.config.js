import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: [['html', { open: 'never' }]],
	use: {
		baseURL: process.env.PREVIEW_URL,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'Desktop Chrome',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'Desktop Chrome (no JS)',
			use: {
				...devices['Desktop Chrome'],
				javaScriptEnabled: false,
			},
		},
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] },
		},
		{
			name: 'Mobile Chrome (no JS)',
			use: {
				...devices['Pixel 5'],
				javaScriptEnabled: false,
			},
		},
	],
});
