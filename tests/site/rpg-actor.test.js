import { test, expect } from '@playwright/test';

const path = '/components/rpg-actor/';
const imageName = 'My RPG Actor character sprite';

for (const route of ['/', '/about', path]) {
	test(`${route} displays the reusable actor with a native fallback`, async ({ page }) => {
		await page.goto(route);
		await expect(page.getByRole('img', { name: imageName, exact: true })).toBeVisible();
		if (route === '/about') {
			await expect(page.getByRole('link', { name: 'rpg.actor', exact: true })).toHaveAttribute('href', 'https://rpg.actor');
		}
	});
}

test('playground controls select a pose with and without JavaScript', async ({ page }) => {
	await page.goto(path);
	await page.getByLabel('Animation', { exact: true }).selectOption('idle');
	await page.getByLabel('Direction', { exact: true }).selectOption('left');
	await page.getByLabel('Expression', { exact: true }).selectOption('happy');
	await page.getByLabel('Talking', { exact: true }).check();
	await page.getByLabel('Paused', { exact: true }).check();
	await page.getByRole('button', { name: 'Apply sprite state' }).click();
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · left · happy · talking · paused');
	await expect(page.getByRole('img', { name: imageName, exact: true })).toBeVisible();
	await expect(page.getByLabel('Direction', { exact: true })).toHaveValue('left');
	await expect(page.getByLabel('Expression', { exact: true })).toHaveValue('happy');
});

test('walking changes the visible frame; pause freezes it and resume restarts it', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'The no-JS contract is a static pose, covered by the form test.');
	await page.goto(`${path}?direction=down&animation=walk`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toBeVisible();
	const initial = await sprite.screenshot();
	await expect.poll(async () => { return initial.equals(await sprite.screenshot()); }).toBe(false);
	await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
	const paused = await sprite.screenshot();
	await expect(page.getByRole('button', { name: 'Resume animation', exact: true })).toBeVisible();
	// A bounded wait covers several frame intervals; pixels must remain unchanged.
	await page.waitForTimeout(650);
	expect(paused.equals(await sprite.screenshot())).toBe(true);
	await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
	await expect.poll(async () => { return paused.equals(await sprite.screenshot()); }).toBe(false);
});

test('DOM attributes control direction and explicit frames; invalid values recover', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'DOM attribute mutation requires JavaScript.');
	await page.goto(`${path}?direction=down&animation=idle`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect(sprite).toBeVisible();
	// Wait for enhancement so the screenshots compare cropped sprite viewports.
	await page.evaluate(() => {return customElements.whenDefined('rpg-actor')});
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('SPAN', { timeout: 15000 });
	const down = await sprite.screenshot();
	await sprite.evaluate(el => {return el.getRootNode().host.setAttribute('direction', 'up')});
	expect(down.equals(await sprite.screenshot())).toBe(false);
	await sprite.evaluate(el => {return el.getRootNode().host.setAttribute('direction', 'invalid')});
	expect(down.equals(await sprite.screenshot())).toBe(true);
	await sprite.evaluate(el => {return el.getRootNode().host.setAttribute('frame', '0')});
	expect(down.equals(await sprite.screenshot())).toBe(false);
	await sprite.evaluate(el => {return el.getRootNode().host.setAttribute('frame', '999')});
	expect(down.equals(await sprite.screenshot())).toBe(true);
});

test('reduced motion keeps the showcase still but allows manual poses', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'No-JS already renders a still image.');
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto(path);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('SPAN', { timeout: 15000 });
	const still = await sprite.screenshot();
	await page.waitForTimeout(2600);
	expect(still.equals(await sprite.screenshot())).toBe(true);
	await expect(page.getByRole('button', { name: 'Pause animation' })).toHaveCount(0);
	await page.getByLabel('Direction', { exact: true }).selectOption('right');
	await page.getByRole('button', { name: 'Apply sprite state' }).click();
	expect(still.equals(await sprite.screenshot())).toBe(false);
});

test('missing expressions and malformed metadata retain the base sprite', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Enhanced error recovery requires JavaScript.');
	await page.goto(`${path}?direction=down&animation=idle`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('SPAN', { timeout: 15000 });
	await sprite.evaluate(el => { el.getRootNode().host.setAttribute('emotes', '{}'); });
	await expect.poll(() => { return sprite.evaluate(el => { return el.tagName; }); }).toBe('SPAN', { timeout: 15000 });
	const base = await sprite.evaluate(el => { return el.querySelector('img').currentSrc; });
	await sprite.evaluate(el => {
		const actor = el.getRootNode().host;
		actor.setAttribute('emotes', '{}');
		actor.setAttribute('expression', 'sad');
		actor.setAttribute('talking', '');
		actor.setAttribute('paused', '');
	});
	await expect(sprite).toBeVisible();
	await expect.poll(() => { return sprite.evaluate(el => { return el.querySelector('img')?.currentSrc; }); }).toBe(base);
	await sprite.evaluate(el => {return el.getRootNode().host.setAttribute('emotes', '{broken')});
	await expect(sprite).toBeVisible();
	await expect.poll(() => { return sprite.evaluate(el => { return el.querySelector('img')?.currentSrc; }); }).toBe(base);
});

test('failed base URL preserves fallback and changing src recovers', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'The native fallback is covered in every render test.');
	await page.goto(`${path}?direction=down&animation=idle`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('SPAN', { timeout: 15000 });
	const source = await sprite.evaluate(el => {return el.getRootNode().host.getAttribute('src')});
	await sprite.evaluate(el => {
		const actor = el.getRootNode().host;
		actor.setAttribute('emotes', '{}');
		actor.setAttribute('src', '/missing-rpg-sprite.png');
	});
	await expect(sprite).toBeVisible();
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('IMG');
	await sprite.evaluate((el, src) => {return el.closest('rpg-actor').setAttribute('src', src)}, source);
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('SPAN', { timeout: 15000 });
});

test('showcase cycles poses and reconnection resumes without duplicate controls', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Showcase is an optional animation.');
	await page.goto(path);
	const status = page.getByRole('status', { name: 'Sprite state' });
	await expect(status).not.toHaveText('walk · down · neutral', { timeout: 6000 });
	await page.getByRole('img', { name: imageName, exact: true }).evaluate(el => {
		const actor = el.getRootNode().host;
		const parent = actor.parentElement;
		actor.remove(); parent.append(actor);
	});
	await expect(page.getByRole('button', { name: 'Pause animation', exact: true })).toHaveCount(1);
	await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Resume animation', exact: true })).toHaveCount(1);
});

test('registry distributes the portable package and machine-readable interface', async ({ request }) => {
	const catalog = await request.get('/components/catalog.json');
	expect((await catalog.json()).components).toContainEqual(expect.objectContaining({ tag: 'rpg-actor', manifest: '/components/rpg-actor/custom-elements.json' }));
	const manifest = await request.get('/components/rpg-actor/custom-elements.json');
	const [declaration] = (await manifest.json()).modules[0].declarations;
	expect(declaration.tagName).toBe('rpg-actor');
	expect(declaration.attributes.map(attr => {return attr.name})).toEqual(expect.arrayContaining(['src', 'emotes', 'expression', 'talking', 'animation', 'direction', 'paused', 'showcase', 'frame']));
	await Promise.all(['index.js', 'rpg-actor.js', 'package.json', 'README.md', 'LICENSE'].map(async (file) => {
		expect((await request.get(`/components/rpg-actor/${file}`)).ok()).toBe(true);
	}));
});

test('published expressions render distinct faces and talking alternates mouth sheets', async ({ page, request, javaScriptEnabled }) => {
	const snapshot = await (await request.get('/atproto/snapshot.json')).json();
	const {emotes} = snapshot.actor.sprite;
	const loadedSheet = async (cid) => {
		await expect.poll(() => { return page.getByRole('img', { name: imageName, exact: true }).evaluate((el, expected) => {
			const image = el instanceof HTMLImageElement ? el : el.querySelector('img');
			return image?.complete && image.naturalWidth > 0 && image.currentSrc.includes(expected);
		}, cid); }, { timeout: 15000 }).toBe(true);
	};
	await page.goto(`${path}?direction=down&animation=idle`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect(page.getByText('This actor has published expression sheets. Try an expression with Talking enabled.')).toBeVisible();
	if (javaScriptEnabled) {
		await expect.poll(() => { return sprite.evaluate(el => { return el.tagName; }); }).toBe('SPAN', { timeout: 15000 });
	}
	await page.getByLabel('Expression', { exact: true }).selectOption('happy');
	await page.getByRole('button', { name: 'Apply sprite state' }).click();
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · down · happy');
	await expect.poll(() => { return sprite.evaluate(el => {
		const image = el instanceof HTMLImageElement ? el : el.querySelector('img');
		return image?.complete && image.naturalWidth > 0;
	}); }).toBe(true);
	await loadedSheet(emotes.happy.emoteSheet);
	const happy = await sprite.screenshot();
	await page.getByLabel('Expression', { exact: true }).selectOption('angry');
	await page.getByRole('button', { name: 'Apply sprite state' }).click();
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · down · angry');
	await loadedSheet(emotes.angry.emoteSheet);
	await expect.poll(async () => { return happy.equals(await sprite.screenshot()); }).toBe(false);
	if (javaScriptEnabled) {
		await page.getByLabel('Talking', { exact: true }).check();
		await page.getByRole('button', { name: 'Apply sprite state' }).click();
		await loadedSheet(emotes.angry.talkSheet);
		const closed = await sprite.screenshot();
		await expect.poll(async () => { return closed.equals(await sprite.screenshot()); }, { timeout: 15000 }).toBe(false);
	}
});
