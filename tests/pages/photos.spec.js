import { expect, test } from '@playwright/test';

const baseURL = process.env.TEST_URL || 'https://staging.jessehattabaugh.com';

test.describe('GET /photos', () => {
	test('should have site title', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		await expect(page).toHaveTitle(/Jesse Hattabaugh/);
	});

	test('should show Photo Albums heading', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		await expect(page.getByRole('heading', { level: 1 })).toContainText('Photo Albums');
	});

	test('should highlight Photos in the navigation', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		await expect(
			page.getByRole('navigation').getByRole('link', { name: 'Photos' }),
		).toBeVisible();
	});

	test('should show the album grid', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		const albumGrid = page.locator('.photo-album-grid');
		await expect(albumGrid).toBeVisible();
	});

	test('should show album cards with titles', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		const firstCard = page.locator('.photo-album-card').first();
		await expect(firstCard).toBeVisible();
		await expect(firstCard.getByRole('heading')).toBeVisible();
	});

	test('should show photo count on each album card', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		const firstCard = page.locator('.photo-album-card').first();
		await expect(firstCard).toContainText(/\d+ photos/);
	});

	test('should show a cover image on each album card', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		const firstCardImage = page.locator('.photo-album-card img').first();
		await expect(firstCardImage).toBeVisible();
	});

	test('should navigate to album detail page when album card is clicked', async ({ page }) => {
		await page.goto(`${baseURL}/photos`);

		const firstAlbumLink = page.locator('.photo-album-link').first();
		const albumName = await firstAlbumLink.getByRole('heading').textContent();
		await firstAlbumLink.click();

		await expect(page).toHaveURL(/\/photos\/[a-z0-9-]+$/);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(
			albumName?.trim() ?? '',
		);
	});
});

test.describe('GET /photos/:slug', () => {
	test('should show the album title as heading', async ({ page }) => {
		await page.goto(`${baseURL}/photos/flowers`);

		await expect(page.getByRole('heading', { level: 1 })).toContainText('Flowers');
	});

	test('should show a link back to all albums', async ({ page }) => {
		await page.goto(`${baseURL}/photos/flowers`);

		await expect(page.getByRole('link', { name: 'All albums' })).toBeVisible();
	});

	test('should show a link to the original Google Photos source', async ({ page }) => {
		await page.goto(`${baseURL}/photos/flowers`);

		await expect(page.getByRole('link', { name: 'Google Photos' })).toBeVisible();
	});

	test('should open original Google Photos source in a new tab', async ({ page, context }) => {
		await page.goto(`${baseURL}/photos/flowers`);

		const [newPage] = await Promise.all([
			context.waitForEvent('page'),
			page.getByRole('link', { name: 'Google Photos' }).click(),
		]);

		await expect(newPage).toHaveURL(/photos\.app\.goo\.gl|photos\.google\.com/);
	});

	tawaett('should so?page.goto(`${baseURL}/photos/flowers`);:hasPhotos = (await page.locator('.photo-card').count()) > 0;)f (hasPhotos) {
			await expect(page.locator('.photo-grid')).toBeVisible();
		} else {
			await expect(page.getByText('no photos in the local backup')).toBeVisible();
		}
	});

	test('should show Original link for each photo when photos are present', async ({ page }) => {
		await page.goto(`${baseURL}/photos/flowers`);

		const photoCount = await page.locator('.photo-card').count();
		if (photoCount > 0) {
			await expect(
				page.locator('.photo-card').first().getByRole('link', { name: 'Original' }),
			).toBeVisible();
		}
	});

	test('should navigate back to album index when All albums is clicked', async ({ page }) => {
		await page.goto(`${baseURL}/photos/flowers`);

		await page.getByRole('link', { name: 'All albums' }).click();

		await expect(page).toHaveURL(`${baseURL}/photos`);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Photo Albums');
	});
});

test.describe('GET /photos/unknown-slug', () => {
	test('should show Album Not Found heading', async ({ page }) => {
		await page.goto(`${baseURL}/photos/this-slug-does-not-exist`);

		await expect(page.getByRole('heading', { level: 1 })).toContainText('Album Not Found');
	});

	test('should mention the requested slug in the error message', async ({ page }) => {
		await page.goto(`${baseURL}/photos/this-slug-does-not-exist`);

		await expect(page.locator('.photos-page')).toContainText('this-slug-does-not-exist');
	});

	test('should show a Back to albums link', async ({ page }) => {
		await page.goto(`${baseURL}/photos/this-slug-does-not-exist`);

		await expect(page.getByRole('link', { name: 'Back to albums' })).toBeVisible();
	});

	test('should navigate to album index when Back to albums is clicked', async ({ page }) => {
		await page.goto(`${baseURL}/photos/this-slug-does-not-exist`);

		await page.getByRole('link', { name: 'Back to albums' }).click();

		await expect(page).toHaveURL(`${baseURL}/photos`);
		await expect(page.getByRole('heading', { level: 1 })).toContainText('Photo Albums');
	});
});
