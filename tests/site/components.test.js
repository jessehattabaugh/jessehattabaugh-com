import { test, expect } from '@playwright/test';

test('catalog showcases a disclosure and links to its documentation', async ({ page }) => {
	await page.goto('/components/');
	await page.getByText('Try the disclosure', { exact: true }).click();
	await expect(page.getByText(/This content is ordinary HTML/)).toBeVisible();
	await page.getByRole('link', { name: 'Documentation and examples' }).click();
	await expect(page.getByRole('heading', { name: 'disclosure-panel', level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Element module on GitHub' })).toHaveAttribute('href', /github.com.*disclosure-panel.js$/);
});

test('native disclosure works with pointer and keyboard, including without JavaScript', async ({ page }) => {
	await page.goto('/components/disclosure-panel/');
	const summary = page.getByText('Try the disclosure', { exact: true });
	const content = page.getByText(/This content is ordinary HTML/);
	await expect(content).toBeHidden();
	await summary.click();
	await expect(content).toBeVisible();
	await summary.focus();
	await page.keyboard.press('Space');
	await expect(content).toBeHidden();
	await page.keyboard.press('Enter');
	await expect(content).toBeVisible();
});

test('attributes control state and a child request reports state back up', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Attribute/event integration enhances the native disclosure.');
	await page.goto('/components/disclosure-panel/');
	const content = page.getByText(/This content is ordinary HTML/);
	const status = page.getByRole('status', { name: 'Disclosure state' });
	await page.getByRole('button', { name: 'Open via attribute' }).click();
	await expect(content).toBeVisible();
	await expect(status).toHaveText('Panel opened (disclosure-change).');
	await page.getByRole('button', { name: 'Close from inside' }).click();
	await expect(content).toBeHidden();
	await expect(status).toHaveText('Panel closed (disclosure-change).');
	await expect(page.getByText('Try the disclosure', { exact: true })).toBeFocused();
	await page.getByRole('button', { name: 'Open via attribute' }).click();
	await page.getByRole('button', { name: 'Close via attribute' }).click();
	await expect(content).toBeHidden();
});

test('boolean presence, invalid requests, reconnects, and nested requests preserve panel ownership', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Browser integration API requires Custom Elements.');
	await page.goto('/components/disclosure-panel/');
	await page.getByRole('button', { name: 'Open via attribute' }).waitFor();
	const summary = page.getByText('Try the disclosure', { exact: true });
	const content = page.getByText(/This content is ordinary HTML/);
	await summary.evaluate((element) => {
		const panel = element.parentElement.parentElement;
		panel.setAttribute('open', 'false');
	});
	await expect(content).toBeVisible();
	await summary.evaluate((element) => {
		for (const detail of [{ open: 'false' }, {}, null]) {
			element.dispatchEvent(new CustomEvent('disclosure-request', { detail, bubbles: true }));
		}
		const prevented = new CustomEvent('disclosure-request', { detail: { open: false }, bubbles: true, cancelable: true });
		prevented.preventDefault();
		element.dispatchEvent(prevented);
	});
	await expect(content).toBeVisible();
	await summary.evaluate((element) => {
		const panel = element.parentElement.parentElement;
		const parent = panel.parentElement;
		panel.remove();
		parent.append(panel);
		const nested = document.createElement('disclosure-panel');
		const details = document.createElement('details');
		details.open = true;
		const childSummary = document.createElement('summary');
		childSummary.textContent = 'Nested help';
		const paragraph = document.createElement('p');
		paragraph.textContent = 'Nested content';
		details.append(childSummary, paragraph);
		nested.append(details);
		element.parentElement.append(nested);
	});
	await expect(page.getByText('Nested content', { exact: true })).toBeVisible();
	await page.getByText('Nested help', { exact: true }).evaluate((element) => {
		element.dispatchEvent(new CustomEvent('disclosure-request', { detail: { open: false }, bubbles: true }));
	});
	await expect(page.getByText('Nested content', { exact: true })).toBeHidden();
	await expect(content).toBeVisible();
	await summary.click();
	await expect(content).toBeHidden();
});

test('late children upgrade and expanded native markup remains expanded', async ({ page, javaScriptEnabled }) => {
	test.skip(!javaScriptEnabled, 'Exercises consumer markup inserted after registration.');
	await page.goto('/components/disclosure-panel/');
	await page.getByRole('button', { name: 'Open via attribute' }).waitFor();
	await page.getByRole('main').evaluate((main) => {
		const panel = document.createElement('disclosure-panel');
		main.append(panel);
		const details = document.createElement('details');
		details.open = true;
		const summary = document.createElement('summary');
		summary.textContent = 'Late help';
		const content = document.createElement('p');
		content.textContent = 'Late help content';
		details.append(summary, content);
		panel.append(details);
	});
	await expect(page.getByText('Late help content', { exact: true })).toBeVisible();
	await page.getByText('Late help', { exact: true }).evaluate((summary) => {
		summary.dispatchEvent(new CustomEvent('disclosure-request', { detail: { open: false }, bubbles: true }));
	});
	await expect(page.getByText('Late help content', { exact: true })).toBeHidden();
});

test('documentation code is escaped, keyboard reachable, and fits the viewport', async ({ page }) => {
	await page.goto('/components/disclosure-panel/');
	const code = page.getByLabel('Minimal HTML', { exact: true });
	await expect(code).toContainText('<disclosure-panel>');
	await code.focus();
	await expect(code).toBeFocused();
	expect(await page.getByRole('main').evaluate(() => {
		return document.documentElement.scrollWidth <= window.innerWidth;
	})).toBe(true);
});

test('component ships its manifest, license, and portable module entry', async ({ request }) => {
	const catalog = await request.get('/components/catalog.json');
	expect(catalog.ok()).toBe(true);
	expect((await catalog.json()).components).toContainEqual(expect.objectContaining({
		tag: 'disclosure-panel', manifest: '/components/disclosure-panel/custom-elements.json',
	}));
	const response = await request.get('/components/disclosure-panel/custom-elements.json');
	expect(response.ok()).toBe(true);
	const manifest = await response.json();
	const [declaration] = manifest.modules[0].declarations;
	expect(declaration.attributes.map((attribute) => { return attribute.name; })).toEqual(['open']);
	expect(declaration.events[0].name).toBe('disclosure-change');
	expect(declaration['x-listens'][0].name).toBe('disclosure-request');
	await Promise.all(['index.js', 'disclosure-panel.js', 'package.json', 'README.md', 'LICENSE'].map(async (file) => {
		const asset = await request.get(`/components/disclosure-panel/${file}`);
		expect(asset.ok(), file).toBe(true);
	}));
});
