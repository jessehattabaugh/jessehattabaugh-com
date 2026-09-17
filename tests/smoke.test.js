import { test, expect } from '@playwright/test';
import { lighthouseAudit } from './helpers/lighthouse.js';

/** All named routes with their expected h1 text. */
const PAGES = [
	{ path: '/', heading: 'Jesse Hattabaugh' },
	{ path: '/about', heading: 'About' },
	{ path: '/colophon', heading: 'Colophon' },
	{ path: '/apps', heading: 'Apps' },
];

// ── Page render tests (run in all 4 projects) ────────────────────────────────

for (const { path, heading } of PAGES) {
	test(`${path} — heading and main navigation`, async ({ page }) => {
		await page.goto(path);
		await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
		const nav = page.getByRole('navigation', { name: 'Main navigation' });
		await expect(nav.getByRole('link', { name: 'About' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Send me a message' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Colophon' })).toBeVisible();
	});
}

// ── 404 ───────────────────────────────────────────────────────────────────────

test('unknown route returns a 404 response', async ({ page }) => {
	const response = await page.goto('/this-page-does-not-exist-xyz');
	expect(response?.status()).toBe(404);
});

// ── Lighthouse audits (Desktop Chrome only) ───────────────────────────────────

test.describe('Lighthouse audits', () => {
	test.beforeEach(() => {
		test.skip(
			test.info().project.name !== 'Desktop Chrome',
			'Lighthouse only runs on Desktop Chrome',
		);
	});

	const MIN_SCORE = 0.9;

	for (const { path } of PAGES) {
		test(`${path} — scores ≥ ${MIN_SCORE * 100}`, async ({ baseURL }) => {
			const categories = await lighthouseAudit(new URL(path, baseURL).href);
			expect(categories.performance?.score ?? 0, 'performance').toBeGreaterThanOrEqual(
				MIN_SCORE,
			);
			expect(categories.accessibility?.score ?? 0, 'accessibility').toBeGreaterThanOrEqual(
				MIN_SCORE,
			);
			expect(
				categories['best-practices']?.score ?? 0,
				'best-practices',
			).toBeGreaterThanOrEqual(MIN_SCORE);
			expect(categories.seo?.score ?? 0, 'seo').toBeGreaterThanOrEqual(MIN_SCORE);
		});
	}
});
