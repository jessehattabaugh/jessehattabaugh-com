import { test, expect } from '@playwright/test';
import { paths } from '../../shared/routes.js';
import { workerVariables } from '../../scripts/environment.js';

const handle = workerVariables().ATPROTO_HANDLE;

/** Assert actual image delivery, including CSP and no-JS browser loading.
 * @param {import('@playwright/test').Locator} image */
async function loaded(image) {
	await image.scrollIntoViewIfNeeded();
	await expect(image).toBeVisible();
	await expect.poll(() => {return image.evaluate((element) => {return element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0})}).toBe(true);
}

test('About shows my Bluesky identity, avatar, and readable posts', async ({ page }) => {
	await page.goto(paths.about);
	const profile = page.getByRole('complementary', { name: 'Bluesky profile' });
	await expect(profile.getByRole('link', { name: `@${handle}`, exact: true })).toHaveAttribute('href', `https://bsky.app/profile/${handle}`);
	await loaded(page.getByRole('img', { name: 'Bluesky avatar', exact: true }));
	const posts = page.getByRole('region', { name: 'Latest from Bluesky' });
	const links = posts.getByRole('link', { name: 'Read and reply on Bluesky', exact: true });
	await expect(links.first()).toBeVisible();
	await expect(links.first()).toHaveAttribute('href', /^https:\/\/bsky\.app\/profile\/did%3Aplc%3A[^/]+\/post\/[a-z0-9]+$/);
	await expect(posts.getByRole('listitem').first()).not.toHaveText('');
});

test('About shows RPG Actor sprite and character sheets', async ({ page }) => {
	await page.goto(paths.about);
	await expect(page.getByRole('heading', { name: 'My RPG Actor', exact: true })).toBeVisible();
	await loaded(page.getByRole('img', { name: 'My RPG Actor character sprite', exact: true }));
	await expect(page.getByRole('heading', { name: 'Dungeons & Dragons', exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Dungeon Crawl Classics', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'View my character on RPG Actor' })).toHaveAttribute('href', `https://rpg.actor/${handle}`);
});

test('Giving away has linked offers and working listing photos', async ({ page }) => {
	await page.goto(paths.home);
	await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Giving away', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Giving away', exact: true })).toBeVisible();
	const listings = page.getByRole('main').getByRole('listitem');
	await expect(listings.first()).toBeVisible();
	await expect(listings.first().getByRole('link', { name: 'View on GiftHood', exact: true })).toHaveAttribute('href', /^https:\/\/gifthood\.community\/listing\/did%3Aplc%3A/);
	for (const more of await page.getByText(/^More photos \(/).all()) {
		// Expand sequentially: browser clicks share one pointer and layout.
		// eslint-disable-next-line no-await-in-loop
		await more.click();
	}
	await Promise.all((await page.getByRole('main').getByRole('img').all()).map(loaded));
});

test('site-wide Bluesky link resolves to my public profile', async ({ page }) => {
	await page.goto(paths.apps);
	const footer = page.getByRole('contentinfo');
	await expect(footer.getByRole('link', { name: /Bluesky/ })).toBeVisible();
	const response = await page.request.get(paths.bluesky, { maxRedirects: 0 });
	expect(response.status()).toBe(302);
	expect(response.headers().location).toBe(`https://bsky.app/profile/${handle}`);
});

test('a fragment request shows the same content and normal navigation restores the full page', async ({ page }) => {
	await page.setExtraHTTPHeaders({ 'X-Fragment': 'true' });
	await page.goto(paths.giving);
	await expect(page.getByRole('heading', { name: 'Giving away', exact: true })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
	await page.setExtraHTTPHeaders({});
	await page.reload();
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Giving away', exact: true })).toBeVisible();
});
