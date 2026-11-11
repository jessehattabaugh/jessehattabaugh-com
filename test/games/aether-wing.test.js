import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

const game = '/games/aether-wing/';
const docs = '/components/retro-game/';

/** @param {import('@playwright/test').Page} page @param {string} url */
async function openWorld(page, url = game) {
	await page.goto(url);
	const viewport = page.getByRole('group', { name: url === docs ? 'Training world viewport' : 'Aether Wing world viewport', exact: true });
	await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeEnabled();
	return viewport;
}

test('the games showcase and component documentation link to Aether Wing', async ({ page, request }) => {
	await page.goto('/games/');
	await expect(page.getByRole('heading', { name: 'Games', exact: true, level: 1 })).toBeVisible();
	await page.getByRole('heading', { name: 'Aether Wing' }).getByRole('link').click();
	await expect(page.getByRole('heading', { name: 'Aether Wing', exact: true, level: 1 })).toBeVisible();
	await page.goto(docs);
	await page.getByRole('link', { name: 'Play Aether Wing', exact: true }).click();
	await expect(page).toHaveURL(new RegExp(game));
	expect((await request.get('/components/retro-game/relay/')).status()).toBe(404);
});

test('CSS projection, steering, targeting and sector completion work without scripting', async ({ page, javaScriptEnabled }) => {
	test.skip(javaScriptEnabled, 'Exercises native HTML controls and CSS animation.');
	await page.goto(game);
	const viewport = page.getByRole('group', { name: 'Aether Wing world viewport' });
	await expect(viewport).toBeVisible();
	const player = () => { return viewport.evaluate((screen) => {
		const bounds = screen.querySelector('retro-sprite[actor="player"]').getBoundingClientRect();
		return { x: bounds.x, y: bounds.y, width: bounds.width };
	}); };
	const initial = await player();
	await page.getByRole('radio', { name: 'Left', exact: true }).check();
	await expect.poll(async () => { return (await player()).x; }).toBeLessThan(initial.x);
	const paletteColor = () => { return viewport.evaluate((screen) => {
		const ground = screen.querySelector('retro-stage:first-of-type retro-layer[mode="perspective"] > retro-tilemap');
		return getComputedStyle(ground).getPropertyValue('--grid-color');
	}); };
	const initialColor = await paletteColor();
	await page.getByRole('checkbox', { name: 'Run course' }).check();
	await expect.poll(paletteColor).not.toBe(initialColor);
	await page.getByRole('checkbox', { name: 'Pause motion' }).check();
	await page.getByRole('checkbox', { name: 'Shoot moth', exact: true }).check();
	await expect(viewport.getByText(/Sector cleared/).filter({ visible: true })).toBeVisible();
	await page.getByRole('radio', { name: 'Amber Expanse', exact: true }).check();
	await page.getByRole('checkbox', { name: 'Shoot scarab', exact: true }).check();
	await page.getByRole('checkbox', { name: 'Shoot moth', exact: true }).check();
	await page.getByRole('radio', { name: 'Violet Citadel', exact: true }).check();
	await page.getByRole('checkbox', { name: 'Shoot sentinel', exact: true }).check();
	await page.getByRole('checkbox', { name: 'Shoot scarab', exact: true }).check();
	await expect(page.getByRole('status').filter({ hasText: 'All sectors cleared.' })).toBeVisible();
	await page.getByRole('button', { name: 'Reset course' }).click();
	await expect(page.getByRole('radio', { name: 'Emerald Reach', exact: true })).toBeChecked();
	await expect(page.getByRole('checkbox', { name: 'Shoot moth', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Launch', exact: true })).toBeHidden();
	expect(await page.getByRole('main').evaluate(() => { return document.documentElement.scrollWidth <= innerWidth; })).toBe(true);
});

test('forward motion, palette cycling and player movement animate the projected world', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Real-time simulation requires scripting.');
	const viewport = await openWorld(page);
	const pixels = async () => { return createHash('sha256').update(await viewport.screenshot({ animations: 'allow' })).digest('hex'); };
	const initial = await pixels();
	await page.getByRole('button', { name: 'Launch', exact: true }).click();
	await expect.poll(pixels).not.toBe(initial);
	await expect(page.getByLabel('Route progress', { exact: true })).not.toHaveText('0%');
	const position = () => { return viewport.evaluate((screen) => {
		const player = screen.closest('retro-world').querySelector('retro-sprite[actor="player"]');
		return { x: Number(player.getAttribute('position-x')), y: Number(player.getAttribute('position-y')) };
	}); };
	await viewport.focus();
	await page.keyboard.down('ArrowRight');
	await expect.poll(async () => { return (await position()).x; }).toBeGreaterThan(0.2);
	await page.keyboard.up('ArrowRight');
	await page.keyboard.down('ArrowUp');
	await expect.poll(async () => { return (await position()).y; }).toBeGreaterThan(1.2);
	await page.keyboard.up('ArrowUp');
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	await expect(page.getByRole('status', { name: 'Flight status' })).toContainText('Paused');
	const paused = await pixels();
	await page.waitForTimeout(300);
	expect(await pixels()).toBe(paused);
	await page.getByRole('button', { name: 'Resume', exact: true }).click();
	await expect.poll(pixels).not.toBe(paused);
});

test('held fire destroys real enemies and awards score in the documented training world', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Real-time combat requires scripting.');
	const viewport = await openWorld(page, docs);
	await page.getByRole('button', { name: 'Launch', exact: true }).click();
	await viewport.focus();
	await page.keyboard.down('Space');
	await expect(page.getByLabel('Score', { exact: true })).not.toHaveText('000000', { timeout: 8000 });
	await page.keyboard.up('Space');
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
	await expect(page.getByLabel('Shield', { exact: true })).toHaveText('3');
});

test('projectiles and enemy contact drain shield and restart restores the player', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Real-time combat requires scripting.');
	const viewport = await openWorld(page, docs);
	// This is an authoring use case. Tune the live HTML definition before launch.
	await viewport.evaluate((canvas) => {
		const world = canvas.closest('retro-world');
		world.querySelector('retro-sprite[actor="player"]').setAttribute('max-health', '1');
		world.addEventListener('retro-player-hit', (event) => { canvas.dataset.hitSource = event.detail.source; });
	});
	await page.getByRole('button', { name: 'Restart flight' }).click();
	await expect(page.getByRole('status', { name: 'Flight status' })).toContainText('Ship lost', { timeout: 10000 });
	await expect(page.getByLabel('Shield', { exact: true })).toHaveText('0');
	await expect(viewport).toHaveAttribute('data-hit-source', 'projectile');
	await viewport.evaluate((screen) => {
		const enemy = screen.querySelector('retro-sprite[actor="enemy"]:not([data-instance])');
		enemy.setAttribute('fire-rate', '0');
		enemy.setAttribute('z', '8');
	});
	await page.getByRole('button', { name: 'Fly again', exact: true }).click();
	await expect(page.getByLabel('Shield', { exact: true })).toHaveText('1');
	await expect(page.getByRole('status', { name: 'Flight status' })).toContainText('Ship lost', { timeout: 10000 });
	await expect(viewport).toHaveAttribute('data-hit-source', 'enemy');
});

test('authored stage lengths advance through distinct scenery and culminate in a replayable win', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Real-time stage progression requires scripting.');
	const viewport = await openWorld(page);
	await viewport.evaluate((canvas) => {
		const world = canvas.closest('retro-world');
		for (const stage of world.querySelectorAll('retro-stage')) {
			stage.setAttribute('length', '18');
			stage.setAttribute('speed', '12');
			for (const wave of stage.querySelectorAll('retro-sprite[actor="enemy"]:not([data-instance])')) { wave.setAttribute('count', '0'); }
		}
	});
	await page.getByRole('button', { name: 'Launch', exact: true }).click();
	await expect(page.getByLabel('Sector', { exact: true })).toHaveText('Amber Expanse', { timeout: 6000 });
	await expect(page.getByLabel('Sector', { exact: true })).toHaveText('Violet Citadel', { timeout: 6000 });
	await expect(page.getByRole('status', { name: 'Flight status' })).toHaveText('Flight complete. All sectors cleared.', { timeout: 6000 });
	await page.getByRole('button', { name: 'Fly again', exact: true }).click();
	await expect(page.getByLabel('Sector', { exact: true })).toHaveText('Emerald Reach');
	await expect(page.getByLabel('Score', { exact: true })).toHaveText('000000');
});

test('native direction and fire buttons support touch and keyboard activation', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Real-time controls require scripting.');
	const viewport = await openWorld(page);
	await page.getByRole('button', { name: 'Launch', exact: true }).click();
	await page.getByRole('button', { name: 'Fly left', exact: true }).click();
	await page.getByRole('button', { name: 'Fly up', exact: true }).click();
	await expect.poll(() => {
		return viewport.evaluate((canvas) => { return Number(canvas.closest('retro-world').querySelector('retro-sprite[actor="player"]').getAttribute('position-x')); });
	}).toBeLessThan(0);
	await page.getByRole('button', { name: 'Fire', exact: true }).press('Enter');
	await viewport.press('p');
	await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('equal player bounds constrain movement and malformed tuning uses safe defaults', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Exercises the live authoring API.');
	const viewport = await openWorld(page, docs);
	await viewport.evaluate((canvas) => {
		const player = canvas.closest('retro-world').querySelector('retro-sprite[actor="player"]');
		player.setAttribute('min-y', '1.1');
		player.setAttribute('max-y', '1.1');
		player.setAttribute('speed', 'not-a-number');
	});
	await page.getByRole('button', { name: 'Launch', exact: true }).click();
	await viewport.press('ArrowUp', { delay: 200 });
	await expect.poll(() => {
		return viewport.evaluate((canvas) => { return canvas.closest('retro-world').querySelector('retro-sprite[actor="player"]').getAttribute('position-y'); });
	}).toBe('1.100');
	await page.getByRole('button', { name: 'Pause', exact: true }).click();
});
