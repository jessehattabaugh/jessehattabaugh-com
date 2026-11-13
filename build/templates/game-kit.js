import { codeExample } from '../../shared/templates/code-example.js';
import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';
import { gameKitElements, gameKitReference, paths } from '../../shared/routes.js';
import { gameKitCatalog } from '../component-catalog.js';
import { lessons } from './game-kit-examples.js';

/** @import { Raw } from '../../shared/html.js' */
/** @import { Social } from '../../shared/data/atproto.js' */
/** @import { Example } from './game-kit-examples.js' */
/** @typedef {{ name: string, description?: string, type?: { text: string } | string, default?: string }} ApiEntry */
/** @typedef {{ tagName: string, description: string, attributes?: ApiEntry[], events?: ApiEntry[], cssProperties?: ApiEntry[], 'x-listens'?: ApiEntry[], 'x-markup'?: ApiEntry[] }} Declaration */

const head = html`<link rel="stylesheet" href="${gameKitCatalog.stylesheet}">
	<link rel="stylesheet" href="${paths.gameKit}docs/styles.css">
	<link rel="stylesheet" href="/games/aether-wing/styles.css">`;
const scripts = html`<script type="module" src="${paths.gameKit}docs/index.js"></script>`;

/** @param {string} title @param {Raw} markup */
function code(title, markup) {
	return codeExample({ caption: title, language: 'html', source: markup.value.trim() });
}

/** @param {Example} example */
function live(example) {
	return html`<div data-game-demo data-live-example>
		${example.markup}
		${example.controls ?? html``}
	</div>`;
}

/** @param {string} label @param {ApiEntry[]} [entries] */
function apiTable(label, entries) {
	if (!entries?.length) { return html`<h3>${label}</h3><p>None.</p>`; }
	return html`<table>
		<caption>${label}</caption>
		<thead><tr><th scope="col">Name</th><th scope="col">Type or default</th><th scope="col">Behavior</th></tr></thead>
		<tbody>${entries.map(({ name, description = '', type, default: initial }) => {
			const typeText = typeof type === 'string' ? type : type?.text;
			return html`<tr><th scope="row"><code>${name}</code></th>
				<td>${typeText ? html`<code>${typeText}</code>` : html``}
					${initial === undefined ? html`` : html`<span>Default <code>${initial}</code></span>`}</td>
				<td>${description}</td></tr>`;
		})}</tbody>
	</table>`;
}

const imports = html`<link rel="stylesheet" href="./game-kit/styles.css">
<script type="module" src="./game-kit/index.js"></script>`;

/** @param {Social} [social] */
export function gameKit(social) {
	return layout({
		social, head, scripts, title: 'Game Kit', path: paths.gameKit,
		description: 'Build Aether Wing step by step with Game Kit. Try live HTML examples and read the reference for every element.',
		body: html`<article data-components data-game-kit-docs>
			<nav aria-label="Breadcrumb"><a href="${paths.components}#kits">Kits</a></nav>
			<h1>Game Kit</h1>
			<p>Build a one-sector version of Aether Wing from an empty viewport, then add a briefing and a launch menu. Each step introduces an element and shows the HTML alongside its result.</p>
			<nav aria-label="Game Kit resources">
				<a href="${paths.aetherWing}">Play Aether Wing</a>
				<a href="${gameKitCatalog.manifest}">Custom Elements Manifest</a>
				<a href="${gameKitCatalog.package}">Package metadata</a>
				<a href="${gameKitCatalog.source}">Source on GitHub</a>
			</nav>
			<section aria-labelledby="setup">
				<h2 id="setup">Import Game Kit</h2>
				<p>Vendor the Game Kit package beside your HTML file, then load its stylesheet and ES module in the page head. Game Kit has no kit dependencies. The examples use Aether Wing’s game art. Copy the images you need into your project or point the image paths at your own art. The documentation sliders and readouts let you change attributes and inspect events.</p>
				${code('Game Kit imports', imports)}
				<p><a href="${gameKitCatalog.module}">Published ES module</a> · <a href="${gameKitCatalog.stylesheet}">Published stylesheet</a></p>
			</section>
			<nav aria-labelledby="tutorial-steps">
				<h2 id="tutorial-steps">Tutorial steps</h2>
				<ol>${gameKitElements.map((tag) => {
					return html`<li><a href="#${tag.slice(5)}">${lessons[tag].title}</a></li>`;
				})}</ol>
			</nav>
			${gameKitElements.map((tag) => {
				const lesson = lessons[tag];
				const example = lesson.tutorial ?? lesson.examples[0];
				const id = tag.slice(5);
				return html`<section id="${id}" aria-labelledby="${id}-heading">
					<h2 id="${id}-heading">${lesson.title}</h2>
					<p>${lesson.summary}</p>
					<p><a href="${gameKitReference(tag)}"><code>&lt;${tag}&gt;</code> reference</a></p>
					${code(`${example.title} HTML`, example.markup)}
					<p>${example.text}</p>
					${live(example)}
				</section>`;
			})}
			<section aria-labelledby="console-data">
				<h2 id="console-data">Adapt the data for a console</h2>
				<p>Pattern banks, tile indices, palettes, and sprite records can feed a tool targeting a retro console. It would convert the images and scene data to the target’s tile formats and map projection and input to hardware routines. The browser examples use CSS transforms and raster effects.</p>
			</section>
		</article>`,
	});
}

/** @param {typeof gameKitElements[number]} tag @param {Declaration} api @param {Social} [social] */
export function gameKitElement(tag, api, social) {
	const lesson = lessons[tag];
	return layout({
		social, head, scripts, title: tag, path: gameKitReference(tag),
		description: `${tag} reference with live examples, attributes, events, and CSS properties.`,
		body: html`<article data-components data-game-kit-docs>
			<nav aria-label="Breadcrumb"><a href="${paths.components}#kits">Kits</a> / <a href="${paths.gameKit}">Game Kit</a></nav>
			<h1>${tag}</h1>
			<p>${api.description}</p>
			<nav aria-label="On this page"><a href="#examples">Examples</a> <a href="#api">API</a></nav>
			<section aria-labelledby="examples">
				<h2 id="examples">Examples</h2>
				${lesson.examples.map((example, index) => { return html`<section aria-labelledby="example-${index}">
					<h3 id="example-${index}">${example.title}</h3>
					<p>${example.text}</p>
					${code(`${example.title} HTML`, example.markup)}
					${live(example)}
				</section>`; })}
			</section>
			<section aria-labelledby="api">
				<h2 id="api">API</h2>
				${apiTable('Attributes', api.attributes)}
				${apiTable('Emitted events', api.events)}
				${apiTable('Listened-for events', api['x-listens'])}
				${apiTable('CSS custom properties', api.cssProperties)}
				${api['x-markup'] ? apiTable('Markup hooks', api['x-markup']) : html``}
				<p><a href="${gameKitCatalog.manifest}">View the Game Kit manifest</a></p>
			</section>
			<nav aria-label="Game Kit element reference">
				${gameKitElements.map((element) => { return html`<a href="${gameKitReference(element)}"${element === tag ? html` aria-current="page"` : html``}>${element}</a>`; })}
			</nav>
		</article>`,
	});
}
