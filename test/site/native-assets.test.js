import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

// Authored source is the public download contract: comments, import statements,
// CSS nesting, JSON and SVG reach the browser without a compiler changing them.
const assets = [
	['client/enhance/index.js', '/enhance/index.js'],
	['client/components/game-kit/world.js', '/components/game-kit/world.js'],
	['client/styles/main.css', '/styles/main.css'],
	['client/apps/rainbow-hour/app.js', '/apps/rainbow-hour/app.js'],
	['client/apps/rainbow-hour/sw.js', '/apps/rainbow-hour/sw.js'],
	['client/apps/rainbow-hour/storage.js', '/apps/rainbow-hour/storage.js'],
	['shared/rainbow-hour/solar.js', '/shared/rainbow-hour/solar.js'],
	['client/apps/rainbow-hour/icon.svg', '/apps/rainbow-hour/icon.svg'],
	['client/apps/rainbow-hour/manifest.webmanifest', '/apps/rainbow-hour/manifest.webmanifest'],
	['client/games/aether-wing/tilemaps.json', '/games/aether-wing/tilemaps.json'],
];

test('public browser assets preserve the authored files exactly', async ({ page }) => {
	await page.goto('/');
	await Promise.all(assets.map(async ([source, path]) => {
		const expected = await readFile(new URL(`../../${source}`, import.meta.url), 'utf8');
		const result = await page.evaluate(async (url) => {
			const response = await fetch(url);
			return { status: response.status, text: await response.text() };
		}, path);
		expect(result.status, path).toBe(200);
		expect(result.text, path).toBe(expected);
	}));
});

test('the browser can import published JSON using native import attributes', async ({ page }) => {
	await page.goto('/games/aether-wing/');
	const expected = JSON.parse(await readFile(new URL('../../client/games/aether-wing/tilemaps.json', import.meta.url), 'utf8'));
	const data = await page.evaluate(async () => {
		const { default: maps } = await import('/games/aether-wing/tilemaps.json', { with: { type: 'json' } });
		return maps;
	});
	expect(data).toEqual(expected);
});
