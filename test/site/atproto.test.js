import { test, expect } from '@playwright/test';
import { paths } from '../../shared/routes.js';
import { workerVariables } from '../../build/shared/environment.js';

const handle = workerVariables().ATPROTO_HANDLE;

/** Assert actual image delivery, including CSP and no-JS browser loading.
 * @param {import('@playwright/test').Locator} image */
async function loaded(image) {
	await image.scrollIntoViewIfNeeded();
	await expect(image).toBeVisible();
	await expect.poll(() => {return image.evaluate((element) => {const img = element instanceof HTMLImageElement ? element : element.querySelector('img'); return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0})}).toBe(true);
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

test('site-wide Bluesky link resolves to my public profile', async ({ page }) => {
	await page.goto(paths.apps);
	const footer = page.getByRole('contentinfo');
	await expect(footer.getByRole('link', { name: 'bluesky', exact: true })).toBeVisible();
	const response = await page.request.get(paths.bluesky, { maxRedirects: 0 });
	expect(response.status()).toBe(302);
	expect(response.headers().location).toBe(`https://bsky.app/profile/${handle}`);
});

test('a fragment request shows the same content and normal navigation restores the full page', async ({ page }) => {
	await page.setExtraHTTPHeaders({ 'X-Fragment': 'true' });
	await page.goto(paths.about);
	await expect(page.getByRole('heading', { name: 'About Me', exact: true })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
	await page.setExtraHTTPHeaders({});
	await page.reload();
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'About Me', exact: true })).toBeVisible();
});
