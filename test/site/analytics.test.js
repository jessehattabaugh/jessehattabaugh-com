import { expect, signIn, test } from '../shared/messages.js';
import { paths } from '../../shared/routes.js';
import { lighthouseAudit } from '../shared/lighthouse.js';

test('branch previews display a blank counter without the production beacon', async ({ page }) => {
	const response = await page.goto(paths.colophon);
	const footer = page.getByRole('contentinfo');
	const output = footer.getByRole('status', { name: 'Site page views' });
	await expect(output).toBeVisible();
	await expect(output).toHaveText('');
	await expect(footer.getByText('Page views · last 30 days')).toBeVisible();
	expect(await response.text()).not.toContain('data-cf-beacon');
});

test('the sample counter has a native fallback and can display a new count', async ({ page, javaScriptEnabled }) => {
	await page.goto(paths.webCounter);
	const output = page.getByRole('region', { name: 'Sample counter' }).getByRole('status', { name: 'Site page views' });
	await expect(output).toHaveText('1,234');
	if (javaScriptEnabled) {
		await page.evaluate(() => { return customElements.whenDefined('web-counter').then(() => {}); });
		await output.evaluate((element) => { element.parentElement.setAttribute('value', '12345'); });
		await expect(output).toHaveText('12,345');
		await output.evaluate((element) => { element.parentElement.setAttribute('value', '-1'); });
		await expect(output).toHaveText('12,345');
	}
});

test('the old component URL redirects to Web Counter', async ({ request }) => {
	const response = await request.get('/components/page-counter/', { maxRedirects: 0 });
	expect(response.status()).toBe(301);
	expect(response.headers().location).toBe(paths.webCounter);
});

test('signed-out visitors are sent to sign in to view analytics', async ({ page }) => {
	await page.goto(paths.analytics);
	await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fanalytics%2F$/);
	await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
});

test('a signed-in visitor cannot open analytics', async ({ page, identities }) => {
	await signIn(page, identities.create());
	await expect(page.getByRole('link', { name: 'Visitor analytics' })).toHaveCount(0);
	const response = await page.goto(paths.analytics);
	expect(response.status()).toBe(403);
	await expect(page.getByText('Only the site owner can view visitor analytics.')).toBeVisible();
});

test('the site owner can open analytics and switch date ranges on a preview', async ({ page, identities }) => {
	await signIn(page, await identities.owner());
	await page.getByRole('link', { name: 'Visitor analytics' }).click();
	await expect(page.getByRole('heading', { name: 'Visitor analytics', level: 1 })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(page.getByRole('status').filter({ hasText: 'Cloudflare Web Analytics is unavailable in this environment.' })).toBeVisible();
	const range = page.getByLabel('Date range');
	await expect(range).toHaveValue('30');
	await range.selectOption('7');
	await page.getByRole('button', { name: 'Apply', exact: true }).click();
	await expect(page).toHaveURL(/\/admin\/analytics\/\?days=7$/);
	await expect(range).toHaveValue('7');
	await page.goto(`${paths.analytics}?days=invalid`);
	await expect(range).toHaveValue('30');
});

test('the owner dashboard scores at least 90 in every Lighthouse category', async ({ page, context, identities, baseURL }, testInfo) => {
	test.skip(testInfo.project.name !== 'Desktop Chrome', 'Lighthouse runs on Desktop Chrome.');
	test.setTimeout(90000);
	await signIn(page, await identities.owner());
	const url = new URL(paths.analytics, baseURL).href;
	const categories = await lighthouseAudit(url, await context.cookies(url));
	for (const name of ['performance', 'accessibility', 'best-practices', 'seo']) {
		expect(categories[name]?.score ?? 0, name).toBeGreaterThanOrEqual(0.9);
	}
});
