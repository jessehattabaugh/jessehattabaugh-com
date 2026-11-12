import { test, expect } from '@playwright/test';

const path = '/components/rpg-actor/';
const imageName = 'My RPG Actor character sprite';

for (const route of ['/', '/about', '/components/', path]) {
	test(`${route} displays the reusable actor with a native fallback`, async ({ page }) => {
		await page.goto(route);
		await expect(page.getByRole('img', { name: imageName, exact: true })).toBeVisible();
		if (route === '/about') {
			await expect(page.getByRole('link', { name: 'rpg.actor', exact: true })).toHaveAttribute('href', 'https://rpg.actor');
		}
	});
}

test('playground controls select a pose with and without JavaScript', async ({ page }) => {
	await page.goto(`${path}?direction=down&animation=idle&paused=on`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect(sprite).toBeVisible();
	const initial = await sprite.screenshot();
	await page.getByLabel('Animation', { exact: true }).selectOption('idle');
	await page.getByLabel('Direction', { exact: true }).selectOption('left');
	await page.getByLabel('Expression', { exact: true }).selectOption('happy');
	await page.getByLabel('Talking', { exact: true }).check();
	await page.getByLabel('Paused', { exact: true }).check();
	await page.getByRole('button', { name: 'Apply sprite state' }).click();
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · left · happy · talking · paused');
	await expect(sprite).toBeVisible();
	await expect.poll(async () => { return initial.equals(await sprite.screenshot()); }).toBe(false);
	await expect(page.getByLabel('Direction', { exact: true })).toHaveValue('left');
	await expect(page.getByLabel('Expression', { exact: true })).toHaveValue('happy');
	await page.getByRole('link', { name: 'Play the showcase', exact: true }).click();
	await expect(page.getByLabel('Direction', { exact: true })).toHaveValue('down');
});

test('walking changes frames and the sprite control pauses and resumes playback', async ({ page, javaScriptEnabled, hasTouch }) => {
	test.skip(!javaScriptEnabled, 'The no-JS contract is a static pose, covered by the form test.');
	await page.goto(`${path}?direction=down&animation=walk`);
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	const pause = page.getByRole('button', { name: 'Pause animation', exact: true });
	const resume = page.getByRole('button', { name: 'Resume animation', exact: true });
	await expect(pause).toBeVisible();
	if (!hasTouch) {
		await expect(pause).toHaveCSS('opacity', '0');
		await sprite.hover();
	}
	await expect(pause).toHaveCSS('opacity', '1');
	const initial = await sprite.screenshot();
	await expect.poll(async () => { return initial.equals(await sprite.screenshot()); }).toBe(false);
	await pause.click();
	await expect(resume).toBeVisible();
	if (!hasTouch) {
		await page.mouse.move(0, 0);
		await expect(resume).toHaveCSS('opacity', '0');
	}
	const paused = await sprite.screenshot();
	// A bounded wait covers several frame intervals; pixels must remain unchanged.
	await page.waitForTimeout(650);
	expect(paused.equals(await sprite.screenshot())).toBe(true);
	if (!hasTouch) { await sprite.hover(); }
	await resume.click();
	if (!hasTouch) { await page.mouse.move(0, 0); }
	// The icon changes on resume. Compare two frames after that change.
	const resumed = await sprite.screenshot();
	await expect.poll(async () => { return resumed.equals(await sprite.screenshot()); }).toBe(false);
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
	const initialEmotes = await sprite.evaluate(el => { return JSON.parse(el.getRootNode().host.getAttribute('emotes') || '{}'); });
	await sprite.evaluate(el => { el.getRootNode().host.setAttribute('emotes', '{}'); });
	await expect.poll(() => { return sprite.evaluate(el => { return el.tagName; }); }).toBe('SPAN', { timeout: 15000 });
	const base = await sprite.evaluate(el => { return el.querySelector('img').currentSrc; });
	await sprite.evaluate(el => {
		const actor = el.getRootNode().host;
		actor.setAttribute('emotes', '{}');
		actor.setAttribute('expression', 'sad');
		actor.setAttribute('talking', '');
		actor.setAttribute('paused', 'false');
	});
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · down · sad · talking · paused');
	await expect(sprite).toBeVisible();
	await expect.poll(() => { return sprite.evaluate(el => { return el.querySelector('img')?.currentSrc; }); }).toBe(base);
	// When an expression has an emoteSheet but no talkSheet, talking keeps the emoteSheet on odd steps.
	if (initialEmotes.happy?.emoteSheet) {
		await sprite.evaluate((el, emoteSheet) => {
			const actor = el.getRootNode().host;
			actor.removeAttribute('paused');
			actor.setAttribute('interval', '50');
			actor.setAttribute('emotes', JSON.stringify({ happy: { emoteSheet } }));
			actor.setAttribute('expression', 'happy');
			actor.setAttribute('talking', '');
		}, initialEmotes.happy.emoteSheet);
		await expect.poll(() => { return sprite.evaluate((el, expected) => { return el.querySelector('img')?.currentSrc.includes(expected); }, initialEmotes.happy.emoteSheet); }, { timeout: 15000 }).toBe(true);
		await page.waitForTimeout(120);
		await expect.poll(() => { return sprite.evaluate((el, expected) => { return el.querySelector('img')?.currentSrc.includes(expected); }, initialEmotes.happy.emoteSheet); }).toBe(true);
	}
	const errorReason = await sprite.evaluate(el => {
		const actor = el.getRootNode().host;
		let reason = '';
		actor.addEventListener('actor-error', (event) => { ({ reason } = event.detail); }, { once: true });
		actor.setAttribute('paused', '');
		actor.setAttribute('emotes', '{broken');
		return reason;
	});
	expect(errorReason).toBe('Invalid emotes JSON');
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
		window.actorEvents = [];
		actor.addEventListener('actor-error', (event) => { window.actorEvents.push({ type: 'error', detail: event.detail }); });
		actor.addEventListener('actor-load', (event) => { window.actorEvents.push({ type: 'load', detail: event.detail }); });
		actor.setAttribute('emotes', '{}');
		actor.setAttribute('src', '/missing-rpg-sprite.png');
	});
	await expect(sprite).toBeVisible();
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('IMG');
	await expect.poll(() => { return page.evaluate(() => { return window.actorEvents.length; }); }).toBe(1);
	await sprite.evaluate((el, src) => {return el.closest('rpg-actor').setAttribute('src', src)}, source);
	await expect.poll(() => {return sprite.evaluate(el => {return el.tagName})}).toBe('SPAN', { timeout: 15000 });
	const events = await page.evaluate(() => { return window.actorEvents; });
	expect(events).toEqual([
		{ type: 'error', detail: { reason: 'Sprite image unavailable', src: expect.stringMatching(/\/missing-rpg-sprite\.png$/) } },
		{ type: 'load', detail: { src: expect.stringContaining(source) } },
	]);
});

test('showcase cycles poses and reconnection resumes without duplicate controls', async ({ page, javaScriptEnabled, hasTouch }) => {
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
	if (!hasTouch) { await page.getByRole('img', { name: imageName, exact: true }).hover(); }
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
	await Promise.all(['index.js', 'rpg-actor.js', 'package.json', 'README.md', 'LICENSE', 'social.png'].map(async (file) => {
		expect((await request.get(`/components/rpg-actor/${file}`)).ok()).toBe(true);
	}));
});

test('fragment negotiation returns the bare playground fragment and normal navigation restores the layout', async ({ page }) => {
	await page.setExtraHTTPHeaders({ 'X-Fragment': 'true' });
	await page.goto(`${path}?direction=left&expression=happy&animation=idle`);
	await expect(page.getByRole('heading', { name: 'rpg-actor', level: 1, exact: true })).toBeVisible();
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · left · happy');
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0);
	await page.setExtraHTTPHeaders({});
	await page.reload();
	await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'rpg-actor', level: 1, exact: true })).toBeVisible();
	await expect(page.getByRole('status', { name: 'Sprite state' })).toHaveText('idle · left · happy');
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

test('home keeps its selected pose while About opts into adjustable showcase playback', async ({ page, javaScriptEnabled, hasTouch }) => {
	test.skip(!javaScriptEnabled, 'Native fallback coverage above checks both pages without JavaScript.');
	await page.goto('/');
	const sprite = page.getByRole('img', { name: imageName, exact: true });
	await expect.poll(() => { return sprite.evaluate(el => { return el.tagName; }); }).toBe('SPAN');
	await expect.poll(() => { return sprite.evaluate(el => { return el.getRootNode().host.hasAttribute('showcase'); }); }).toBe(false);
	if (!hasTouch) { await sprite.hover(); }
	const homePause = page.getByRole('button', { name: 'Pause animation', exact: true });
	await expect(homePause).toHaveCSS('opacity', '1');
	const spriteBounds = await sprite.boundingBox();
	const buttonBounds = await homePause.boundingBox();
	const rightInset = spriteBounds.x + spriteBounds.width - buttonBounds.x - buttonBounds.width;
	const bottomInset = spriteBounds.y + spriteBounds.height - buttonBounds.y - buttonBounds.height;
	expect(rightInset).toBeGreaterThanOrEqual(0);
	expect(rightInset).toBeLessThan(10);
	expect(bottomInset).toBeGreaterThanOrEqual(0);
	expect(bottomInset).toBeLessThan(10);
	await page.goto('/about');
	await expect.poll(() => { return sprite.evaluate(el => { return el.tagName; }); }).toBe('SPAN');
	await page.clock.install();
	await sprite.evaluate(el => {
		const actor = el.getRootNode().host;
		actor.setAttribute('showcase-duration', '3000');
		actor.setAttribute('interval', '150');
	});
	const pose = () => { return sprite.evaluate(el => {
		const actor = el.getRootNode().host;
		return [actor.getAttribute('animation'), actor.getAttribute('direction'), actor.getAttribute('expression'), actor.hasAttribute('talking')];
	}); };
	const initial = await pose();
	await page.clock.runFor(2850);
	expect(await pose()).toEqual(initial);
	await page.clock.runFor(150);
	// First walking pose keeps the face and direction steady.
	expect(await pose()).toEqual(['walk', 'down', 'neutral', false]);
	await page.clock.runFor(3000);
	expect(await pose()).toEqual(['idle', 'down', 'neutral', true]);
	if (!hasTouch) { await sprite.hover(); }
	await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
	const paused = await pose();
	await page.clock.runFor(6000);
	expect(await pose()).toEqual(paused);
	await page.getByRole('button', { name: 'Resume animation', exact: true }).click();
	// Invalid durations fall back to 2400 ms, even after a live attribute change.
	await sprite.evaluate(el => { el.getRootNode().host.setAttribute('showcase-duration', 'invalid'); });
	await page.clock.runFor(2250);
	expect(await pose()).toEqual(paused);
	await page.clock.runFor(150);
	expect(await pose()).not.toEqual(paused);
});
