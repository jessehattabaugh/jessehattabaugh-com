import { test, expect } from '@playwright/test';
import { paths } from '../../shared/routes.js';
import { expectHighlightedCode } from '../shared/code-highlighting.js';

test('the catalog links to Code Block and its examples have visible syntax colors', async ({ page }) => {
	await page.goto(paths.components);
	const entry = page.getByRole('region', { name: 'code-block', exact: true });
	await entry.getByRole('link', { name: 'Code Block', exact: true }).click();
	await expect(page).toHaveURL(paths.codeBlock);
	const examples = page.getByRole('region', { name: 'Examples', exact: true });
	await Promise.all([
		['HTML source', '<button type="button" class="save">Save</button>'],
		['CSS source', 'button.save { color: #173760; }'],
		['JavaScript source', "const label = 'Save';"],
		['Shell source', "printf '%s' Ready"],
	].map(async ([label, source]) => {
		const sample = examples.getByLabel(label, { exact: true });
		await expect(sample).toBeVisible();
		await expect(sample).toHaveText(source);
	}));
	await expectHighlightedCode(examples.getByLabel('HTML source'));
	await expectHighlightedCode(examples.getByLabel('CSS source'));
	await expectHighlightedCode(examples.getByLabel('JavaScript source'));
	await expectHighlightedCode(examples.getByLabel('Shell source'));
});

test('the catalog publishes the Code Block artifacts', async ({ request }) => {
	const catalog = await request.get('/components/catalog.json');
	expect(catalog.ok()).toBe(true);
	const { components } = await catalog.json();
	const component = components.find(({ tag }) => { return tag === 'code-block'; });
	expect(component).toMatchObject({
		path: paths.codeBlock,
		module: `${paths.codeBlock}index.js`,
		stylesheet: `${paths.codeBlock}styles.css`,
		manifest: `${paths.codeBlock}custom-elements.json`,
	});
	const manifest = await request.get(component.manifest);
	expect(manifest.ok()).toBe(true);
	expect((await manifest.json()).modules.flatMap(({ declarations = [] }) => { return declarations; }))
		.toContainEqual(expect.objectContaining({ tagName: 'code-block' }));
	const files = [component.module, component.stylesheet, `${paths.codeBlock}README.md`, `${paths.codeBlock}LICENSE`];
	const responses = await Promise.all(files.map((file) => { return request.get(file); }));
	for (const response of responses) { expect(response.ok()).toBe(true); }
});
