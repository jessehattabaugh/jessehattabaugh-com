import { test, expect } from '@playwright/test';
import { gameKitElements, gameKitReference, paths } from '../../shared/routes.js';
import { expectHighlightedCode } from '../shared/code-highlighting.js';

const docs = paths.gameKit;

test('Kits links to a tutorial with highlighted HTML and live results', async ({ page }) => {
	await page.goto('/components/');
	const kits = page.getByRole('region', { name: 'Kits', exact: true });
	await kits.getByRole('link', { name: 'Game Kit', exact: true }).click();
	await expect(page).toHaveURL('/components/game-kit/');
	await expect(page.getByRole('heading', { name: 'Game Kit', level: 1 })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Tutorial steps' }).getByRole('link')).toHaveCount(gameKitElements.length);
	const viewport = page.getByRole('region', { name: 'Set the flight viewport' });
	const sample = viewport.getByLabel('Aether Wing viewport HTML');
	await expect(sample).toBeVisible();
	await expect(sample).toHaveText('<game-screen width="320" height="200" role="img" aria-label="320 by 200 pixel viewport"></game-screen>');
	await expectHighlightedCode(sample);
	await expect(viewport.getByRole('img', { name: '320 by 200 pixel viewport' })).toBeVisible();
	await viewport.getByRole('link', { name: '<game-screen> reference' }).click();
	await expect(page.getByRole('heading', { name: 'game-screen', level: 1 })).toBeVisible();
	await Promise.all([[160, 48], [96, 96], [80, 128]].map(async ([width, height]) => {
		const frame = page.getByRole('img', { name: `${width} by ${height} pixel viewport` });
		await expect(frame).toBeVisible();
		expect(await frame.evaluate((element) => {
			const { width, height } = element.getBoundingClientRect();
			return width / height;
		})).toBeCloseTo(width / height, 2);
	}));
	await expect(page.getByRole('table', { name: 'Attributes' })).toContainText('camera-x');
	await expect(page.getByRole('table', { name: 'CSS custom properties' })).toContainText('--game-screen-width');
});

test('the tilemap reference shows rows and columns in their authored order', async ({ page }) => {
	await page.goto(gameKitReference('game-tilemap'));
	await expect(page.getByLabel('Tilemap HTML')).toBeVisible();
	const tilemap = page.getByRole('img', { name: 'Two rows of wall and floor tiles' });
	expect(await tilemap.evaluate((map) => {
		const [first, second, , , fifth] = Array.from(map.children, (tile) => { return tile.getBoundingClientRect(); });
		return second.x > first.x && second.y === first.y && fifth.x === first.x && fifth.y > first.y;
	})).toBe(true);
});

test('sprite priority controls which image is painted at an overlap', async ({ page, javaScriptEnabled }) => {
	await page.goto(gameKitReference('game-sprite'));
	const moth = page.getByRole('img', { name: 'Priority moth' });
	const screen = page.getByRole('group', { name: 'Sprite drawing order' });
	const topSprite = () => {
		return moth.evaluate((image) => {
			const frame = image.closest('game-screen').getBoundingClientRect();
			const hit = document.elementFromPoint(frame.x + frame.width * 60 / 128, frame.y + frame.height * 30 / 64);
			return hit?.getAttribute('alt');
		});
	};
	await screen.scrollIntoViewIfNeeded();
	await expect.poll(topSprite).toBe('Priority moth');
	if (!javaScriptEnabled) { return; }
	await page.getByRole('slider', { name: 'Moth priority' }).fill('0');
	await screen.scrollIntoViewIfNeeded();
	await expect.poll(topSprite).toBe('Mirrored pine');
});

test('sprite position is visible at rest and the slider enlarges the bitmap from its top-left', async ({ page, javaScriptEnabled }) => {
	await page.goto(gameKitReference('game-sprite'));
	const sprite = page.getByRole('img', { name: 'Emerald Reach pine' });
	await expect(sprite).toBeVisible();
	const geometry = () => {
		return sprite.evaluate((image) => {
			const frame = image.closest('game-screen').getBoundingClientRect();
			const bitmap = image.getBoundingClientRect();
			return [(bitmap.x - frame.x) / frame.width, (bitmap.y - frame.y) / frame.width, bitmap.width / frame.width];
		});
	};
	const [x, y, width] = await geometry();
	expect(x).toBeCloseTo(24 / 128, 2);
	expect(y).toBeCloseTo(12 / 128, 2);
	expect(width).toBeCloseTo(32 / 128, 2);
	const scale = page.getByRole('slider', { name: 'Pine scale' });
	if (!javaScriptEnabled) {
		await expect(scale).toBeHidden();
		return;
	}
	await scale.fill('3');
	await expect.poll(async () => { return (await geometry())[2]; }).toBeCloseTo(48 / 128, 2);
});

const effects = [
	['Texture angle', 'Affine rotation', '45'],
	['Scanline phase', 'Scanline offsets', '90'],
	['Column phase', 'Column offsets', '90'],
	['Road bend', 'Perspective road', '90'],
	['Road travel', 'Perspective road', '20'],
];

for (const [control, name, value] of effects) {
	test(`${control} changes the raster image and keeps an authored bitmap as fallback`, async ({ page, javaScriptEnabled }) => {
		await page.goto(gameKitReference('game-layer'));
		const region = page.getByRole('region', { name, exact: true });
		const image = region.getByRole('img', { name: 'Violet Citadel runway texture' });
		await expect(image).toBeVisible();
		await expect(image).toHaveAttribute('src', /\/games\/aether-wing\/citadel-runway\.png$/);
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
	await page.goto(gameKitReference('game-layer'));
	const ridge = page.getByRole('img', { name: 'Emerald Reach mountains', exact: true });
	const trees = page.getByRole('img', { name: 'Emerald Reach forest', exact: true });
	await expect(ridge).toBeVisible();
	await expect(trees).toBeVisible();
	const camera = page.getByRole('slider', { name: 'Camera position' });
	if (!javaScriptEnabled) {
		await expect(camera).toBeHidden();
		return;
	}
	// Measure rendered positions in logical pixels at either viewport size.
	function offset(map) {
		return map.evaluate((element) => {
			const frame = element.closest('game-screen').getBoundingClientRect();
			return (element.getBoundingClientRect().left - frame.left) * 128 / frame.width;
		});
	}
	expect(await offset(ridge)).toBeCloseTo(0);
	expect(await offset(trees)).toBeCloseTo(0);
	await camera.fill('40');
	await expect.poll(() => { return offset(ridge); }).toBeCloseTo(-10);
	await expect.poll(() => { return offset(trees); }).toBeCloseTo(-40);
});

test('fragment scenes support Back, deep links, and invalid destinations', async ({ page, javaScriptEnabled }) => {
	const flow = gameKitReference('game-flow');
	await page.goto(flow);
	const region = page.getByRole('region', { name: 'Scene switching' });
	const dock = region.getByRole('heading', { name: 'Dock', exact: true });
	const bridge = region.getByRole('heading', { name: 'Bridge', exact: true });
	await expect(dock).toBeVisible();
	await expect(bridge).toBeHidden();
	await region.getByRole('link', { name: 'Go to the bridge' }).click();
	await expect(bridge).toBeVisible();
	await expect(dock).toBeHidden();
	if (javaScriptEnabled) {
		await expect(region.getByRole('status')).toContainText('game-scene-change {"scene":"demo-bridge","previous":"demo-dock"}');
		await bridge.evaluate((heading) => { heading.parentElement.parentElement.setAttribute('scene', 'missing'); });
		await expect(bridge).toBeVisible();
	}
	await page.goBack();
	await expect(dock).toBeVisible();
	await page.goto(`${flow}#demo-bridge`);
	await expect(bridge).toBeVisible();
	await page.goto(`${flow}#unknown-scene`);
	await expect(dock).toBeVisible();
	if (javaScriptEnabled) {
		await dock.evaluate((heading) => { heading.parentElement.parentElement.setAttribute('scene', 'demo-bridge'); });
		await expect(bridge).toBeVisible();
		await expect(page).toHaveURL(/#demo-bridge$/);
	}
});

test('menu links navigate natively, and enhanced menus bubble cancelable actions and handle local keys', async ({ page, javaScriptEnabled }) => {
	await page.goto(gameKitReference('game-menu'));
	const menu = page.getByRole('navigation', { name: 'Radio channels' });
	await menu.getByRole('link', { name: 'Weather' }).click();
	await expect(page).toHaveURL(/#demo-weather$/);
	if (!javaScriptEnabled) { return; }

	const status = page.getByRole('region', { name: 'Menu actions' }).getByRole('status');
	await expect(status).toContainText('game-action {"scene":"demo-weather"}');
	await menu.getByRole('link', { name: 'Weather' }).focus();
	await page.keyboard.press('2');
	await expect(page).toHaveURL(/#demo-signal$/);
	await expect(status).toContainText('game-action {"scene":"demo-signal"}');
	await menu.evaluate((nav) => {
		nav.addEventListener('game-action', (action) => { action.preventDefault(); }, { once: true });
	});
	await menu.getByRole('link', { name: 'Weather' }).click();
	await expect(page).toHaveURL(/#demo-signal$/);
});

test('inventory uses native modal focus and close behavior and reflects open changes', async ({ page, javaScriptEnabled }) => {
	await page.goto(gameKitReference('game-modal'));
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
		await expect(status).toContainText('game-modal-change {"open":false}');
		await opener.evaluate((button) => { button.nextElementSibling.setAttribute('open', ''); });
		await expect(dialog).toBeVisible();
		await expect(status).toContainText('game-modal-change {"open":true}');
	}
});

test('the stage reference reports entry into the next sector', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Stage events are emitted by the running world.');
	await page.goto(gameKitReference('game-stage'));
	await page.getByRole('button', { name: 'Launch', exact: true }).click();
	await expect(page.getByRole('status', { name: 'game-stage-change event' })).toContainText('Training dunes', { timeout: 10000 });
	await expect(page.getByLabel('Sector', { exact: true })).toHaveText('Training dunes');
});

test('the portable package publishes a manifest declaration and definition for every element', async ({ request }) => {
	const catalog = await (await request.get('/components/catalog.json')).json();
	expect(catalog.components.map(({ tag }) => { return tag; })).not.toContain('game-kit');
	const kit = catalog.kits.find(({ id }) => { return id === 'game-kit'; });
	expect(kit).toMatchObject({ name: 'Game Kit', path: docs, dependencies: {} });
	const metadata = await (await request.get(kit.package)).json();
	expect(metadata.dependencies).toEqual(kit.dependencies);
	const response = await request.get(kit.manifest);
	expect(response.ok()).toBe(true);
	const manifest = await response.json();
	const tags = ['game-screen', 'game-layer', 'game-sprite', 'game-tilemap', 'game-flow', 'game-scene', 'game-menu', 'game-modal', 'game-world', 'game-stage', 'game-palette', 'game-tileset', 'game-tile', 'game-input'];
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
