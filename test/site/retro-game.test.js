import { test, expect } from '@playwright/test';

const docs = '/components/retro-game/';

test('the catalog leads to the component demos and their copyable HTML', async ({ page }) => {
	await page.goto('/components/');
	await page.getByRole('region', { name: 'retro-game' }).getByRole('link', { name: 'Documentation and examples' }).click();
	await expect(page.getByRole('heading', { name: 'Retro game components', level: 1 })).toBeVisible();
	await page.getByText('View HTML for Tilemap', { exact: true }).click();
	await expect(page.getByLabel('Tilemap HTML')).toContainText('<retro-tilemap columns="4" rows="2"');
	await expect(page.getByRole('img', { name: 'Two rows of wall and floor tiles' })).toBeVisible();
	expect(await page.getByRole('img', { name: 'Two rows of wall and floor tiles' }).evaluate((map) => {
		const [first, second, , , fifth] = Array.from(map.children, (tile) => { return tile.getBoundingClientRect(); });
		return second.x > first.x && second.y === first.y && fifth.x === first.x && fifth.y > first.y;
	})).toBe(true);
	expect(await page.getByRole('img', { name: '160 by 48 pixel viewport' }).evaluate((screen) => {
		const { width, height } = screen.getBoundingClientRect();
		return width / height;
	})).toBeCloseTo(160 / 48, 2);
	await expect(page.getByRole('heading', { name: 'Observation deck' })).toBeVisible();
});

test('sprite position is visible at rest and the slider enlarges the bitmap from its top-left', async ({ page, javaScriptEnabled }) => {
	await page.goto(docs);
	const sprite = page.getByRole('img', { name: 'Pixel rover' });
	await expect(sprite).toBeVisible();
	const geometry = () => {
		return sprite.evaluate((image) => {
			const frame = image.closest('retro-screen').getBoundingClientRect();
			const bitmap = image.getBoundingClientRect();
			return [(bitmap.x - frame.x) / frame.width, (bitmap.y - frame.y) / frame.width, bitmap.width / frame.width];
		});
	};
	const [x, y, width] = await geometry();
	expect(x).toBeCloseTo(24 / 128, 2);
	expect(y).toBeCloseTo(12 / 128, 2);
	expect(width).toBeCloseTo(32 / 128, 2);
	const scale = page.getByRole('slider', { name: 'Rover scale' });
	if (!javaScriptEnabled) {
		await expect(scale).toBeHidden();
		return;
	}
	await scale.fill('3');
	await expect.poll(async () => { return (await geometry())[2]; }).toBeCloseTo(48 / 128, 2);
});

const effects = [
	['Grid angle', 'Affine rotation', 'Repeating teal grid', '45'],
	['Scanline phase', 'Scanline offsets', 'Repeating teal grid', '90'],
	['Column phase', 'Column offsets', 'Repeating teal grid', '90'],
	['Road bend', 'Perspective road', 'Striped road texture', '90'],
	['Road travel', 'Perspective road', 'Striped road texture', '20'],
];

for (const [control, name, texture, value] of effects) {
	test(`${control} changes the raster image and keeps an authored bitmap as fallback`, async ({ page, javaScriptEnabled }) => {
		await page.goto(docs);
		const region = page.getByRole('region', { name, exact: true });
		const image = region.getByRole('img', { name: texture });
		await expect(image).toBeVisible();
		await expect.poll(() => { return image.evaluate((bitmap) => { return bitmap.naturalWidth; }); }).toBeGreaterThan(0);
		const slider = region.getByRole('slider', { name: control });
		if (!javaScriptEnabled) {
			await expect(slider).toBeHidden();
			return;
		}
		const pixels = () => {
			return image.evaluate((bitmap) => { return bitmap.parentElement.querySelector('canvas:not([hidden])')?.toDataURL() ?? ''; });
		};
		await expect.poll(pixels).not.toBe('');
		const original = await pixels();
		await slider.fill(value);
		await expect.poll(pixels).not.toBe(original);
	});
}

test('camera motion moves both parallax layers at the authored ratio', async ({ page, javaScriptEnabled }) => {
	await page.goto(docs);
	const ridge = page.getByRole('img', { name: 'Distant purple ridge' });
	const trees = page.getByRole('img', { name: 'Foreground pine trees' });
	await expect(ridge).toBeVisible();
	await expect(trees).toBeVisible();
	const camera = page.getByRole('slider', { name: 'Camera position' });
	if (!javaScriptEnabled) {
		await expect(camera).toBeHidden();
		return;
	}
	// At 40 pixels of travel, the ridge moves 10 pixels and the pines move 40.
	async function sample(image, x, y) {
		return image.evaluate((bitmap, [left, top]) => {
			const canvas = bitmap.parentElement.querySelector('canvas:not([hidden])');
			return canvas ? Array.from(canvas.getContext('2d').getImageData(left, top, 1, 1).data) : null;
		}, [x, y]);
	}
	await expect.poll(() => { return sample(ridge, 32, 32); }).toEqual([150, 121, 195, 255]);
	// The second pine is centered at x=48 and its left side is visible at x=47.
	await expect.poll(() => { return sample(trees, 47, 70); }).toEqual([44, 107, 98, 255]);
	await camera.fill('40');
	await expect.poll(() => { return sample(ridge, 22, 32); }).toEqual([150, 121, 195, 255]);
	await expect.poll(() => { return sample(trees, 7, 70); }).toEqual([44, 107, 98, 255]);
	expect(await sample(ridge, 32, 32)).not.toEqual([150, 121, 195, 255]);
	expect(await sample(trees, 47, 70)).not.toEqual([44, 107, 98, 255]);
});

test('fragment scenes support Back, deep links, and invalid destinations', async ({ page, javaScriptEnabled }) => {
	await page.goto(docs);
	const region = page.getByRole('region', { name: 'Scene switching' });
	const dock = region.getByRole('heading', { name: 'Dock', exact: true });
	const bridge = region.getByRole('heading', { name: 'Bridge', exact: true });
	await expect(dock).toBeVisible();
	await expect(bridge).toBeHidden();
	await region.getByRole('link', { name: 'Go to the bridge' }).click();
	await expect(bridge).toBeVisible();
	await expect(dock).toBeHidden();
	if (javaScriptEnabled) {
		await expect(region.getByRole('status')).toContainText('retro-scene-change {"scene":"demo-bridge","previous":"demo-dock"}');
		await bridge.evaluate((heading) => { heading.parentElement.parentElement.setAttribute('scene', 'missing'); });
		await expect(bridge).toBeVisible();
	}
	await page.goBack();
	await expect(dock).toBeVisible();
	await page.goto(`${docs}#demo-bridge`);
	await expect(bridge).toBeVisible();
	await page.goto(`${docs}#unknown-scene`);
	await expect(dock).toBeVisible();
	if (javaScriptEnabled) {
		await dock.evaluate((heading) => { heading.parentElement.parentElement.setAttribute('scene', 'demo-bridge'); });
		await expect(bridge).toBeVisible();
		await expect(page).toHaveURL(/#demo-bridge$/);
	}
});

test('menu links navigate natively, and enhanced menus bubble cancelable actions and handle local keys', async ({ page, javaScriptEnabled }) => {
	await page.goto(docs);
	const menu = page.getByRole('navigation', { name: 'Radio channels' });
	await menu.getByRole('link', { name: 'Weather' }).click();
	await expect(page).toHaveURL(/#demo-weather$/);
	if (!javaScriptEnabled) { return; }

	const status = page.getByRole('region', { name: 'Menu actions' }).getByRole('status');
	await expect(status).toContainText('retro-action {"scene":"demo-weather"}');
	await menu.getByRole('link', { name: 'Weather' }).focus();
	await page.keyboard.press('2');
	await expect(page).toHaveURL(/#demo-signal$/);
	await expect(status).toContainText('retro-action {"scene":"demo-signal"}');
	await menu.evaluate((nav) => {
		nav.addEventListener('retro-action', (action) => { action.preventDefault(); }, { once: true });
	});
	await menu.getByRole('link', { name: 'Weather' }).click();
	await expect(page).toHaveURL(/#demo-signal$/);
});

test('inventory uses native modal focus and close behavior and reflects open changes', async ({ page, javaScriptEnabled }) => {
	await page.goto(docs);
	const opener = page.getByRole('button', { name: 'Open inventory' });
	const dialog = page.getByRole('dialog', { name: 'Inventory' });
	await expect(dialog).toBeHidden();
	await opener.click();
	await expect(dialog).toBeVisible();
	const close = dialog.getByRole('button', { name: 'Close inventory' });
	await expect(close).toBeFocused();
	await close.click();
	await expect(dialog).toBeHidden();
	await expect(opener).toBeFocused();
	await opener.click();
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	if (javaScriptEnabled) {
		const status = page.getByRole('region', { name: 'Modal dialog' }).getByRole('status');
		await expect(status).toContainText('retro-modal-change {"open":false}');
		await opener.evaluate((button) => { button.nextElementSibling.setAttribute('open', ''); });
		await expect(dialog).toBeVisible();
		await expect(status).toContainText('retro-modal-change {"open":true}');
	}
});

test('the portable package publishes a manifest declaration and definition for every element', async ({ request }) => {
	const response = await request.get(`${docs}custom-elements.json`);
	expect(response.ok()).toBe(true);
	const manifest = await response.json();
	const tags = ['retro-screen', 'retro-layer', 'retro-sprite', 'retro-tilemap', 'retro-game', 'retro-scene', 'retro-menu', 'retro-modal', 'retro-world', 'retro-stage', 'retro-palette', 'retro-tileset', 'retro-tile', 'retro-input'];
	expect(manifest.schemaVersion).toBe('1.0.0');
	expect(manifest.modules.flatMap((module) => {
		return module.declarations.map((declaration) => { return declaration.tagName; });
	})).toEqual(tags);
	expect(manifest.modules.flatMap((module) => {
		return module.exports.filter((entry) => { return entry.kind === 'custom-element-definition'; }).map(({ name }) => { return name; });
	})).toEqual(tags);
	await Promise.all(['index.js', 'styles.css', 'package.json', 'README.md', 'LICENSE'].map(async (file) => {
		expect((await request.get(docs + file)).ok(), file).toBe(true);
	}));
});
