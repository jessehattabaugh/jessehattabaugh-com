import { actorSprite } from '../../shared/templates/pages/social.js';
import { html } from '../../shared/html.js';
import { layout } from '../../shared/templates/layout.js';
import { componentCatalog, kitCatalog } from '../component-catalog.js';

/** @param {string} label @param {string} language @param {string} source */
function code(label, language, source) {
	return html`<figure data-code><figcaption>${label} · ${language}</figcaption><pre tabindex="0" aria-label="${label}"><code>${source}</code></pre></figure>`;
}

/** @param {string} [summary] */
function demo(summary = 'Try the disclosure') {
	return html`<disclosure-panel id="demo-panel"><details>
		<summary>${summary}</summary>
		<p>This content is ordinary HTML. Open it with a pointer, or focus the summary and press Enter or Space.</p>
		<button type="button" data-close-panel hidden>Close from inside</button>
	</details></disclosure-panel>`;
}

/** Component-specific showcases; add a renderer alongside each new catalog entry.
 * @type {Map<string, (social?: import('../../shared/data/atproto.js').Social) => import('../../shared/html.js').Raw>} */
const showcases = new Map([
	['disclosure-panel', () => { return demo(); }],
	['rpg-actor', actorSprite],
]);

/** @param {import('../../shared/data/atproto.js').Social} [social] */
export function components(social) {
	return layout({ social, title: 'Components', path: '/components/',
		description: 'Reusable Custom Elements by Jesse Hattabaugh. Native HTML, ES modules, attributes down and events up.',
		body: html`<article data-components>
			<h1>Components</h1>
			<p>Little HTML building blocks. Native elements do the work; Custom Elements make them easier to compose. No framework, no runtime dependencies.</p>
			<p>Send state down with attributes. Send data up with events. Keep useful HTML underneath.</p>
			${componentCatalog.map((component) => { return html`<section aria-label="${component.tag}">
				<h2><a href="${component.path}">${component.tag}</a></h2>
				<p>${component.description}</p>
				${showcases.get(component.tag)?.(social) ?? html``}
				<p><a href="${component.path}">Documentation and examples</a> · <a href="${component.source}">Source on GitHub</a> · <a href="${component.manifest}">Custom Elements Manifest</a></p>
			</section>`; })}
			<section aria-labelledby="kits">
				<h2 id="kits">Kits</h2>
				${kitCatalog.map((kit) => { return html`<section aria-label="${kit.name}">
					<h3><a href="${kit.path}">${kit.name}</a></h3>
					<p>${kit.description}</p>
					<p><a href="${kit.path}">Tutorial and element reference</a> · <a href="${kit.manifest}">Custom Elements Manifest</a> · <a href="${kit.module}">ES module</a> · <a href="${kit.stylesheet}">Stylesheet</a></p>
				</section>`; })}
			</section>
			<h2>Package metadata</h2>
			<p>Each component and kit ships an ES module, an MIT license, package metadata, and a Custom Elements Manifest. The catalog includes artifact URLs and kit dependencies. See the <a href="/components/catalog.json">component catalog JSON</a>.</p>
			<p>Vendor a package from GitHub or import the published module and stylesheet from its catalog entry.</p>
		</article>`, scripts: html`<script type="module" src="/components/demo.js"></script>` });
}

/** @param {import('../../shared/data/atproto.js').Social} [social] */
export function disclosurePanel(social) {
	const [component] = componentCatalog;
	return layout({ social, title: 'disclosure-panel', path: component.path,
		description: 'Documentation, live examples, attributes, events, and GitHub installation for the disclosure-panel Custom Element.',
		body: html`<article data-components>
			<p><a href="/components/">All components</a> / Disclosure</p>
			<h1>disclosure-panel</h1>
			<p>${component.description}</p>
			<p>Version 1.0.0 · MIT · Light DOM · Zero dependencies</p>
			<p><a href="${component.source.replace('/tree/', '/blob/')}/disclosure-panel.js">Element module on GitHub</a> · <a href="${component.source.replace('/tree/', '/blob/')}/index.js">Registration module on GitHub</a> · <a href="${component.manifest}">Custom Elements Manifest</a> · <a href="${component.source.replace('/tree/', '/blob/')}/LICENSE">License</a></p>
			<nav aria-label="On this page"><a href="#demo">Demo</a> · <a href="#usage">Usage</a> · <a href="#api">API</a> · <a href="#installation">Installation</a> · <a href="#limits">Behavior and limits</a></nav>
			<section id="demo" aria-labelledby="demo-heading"><h2 id="demo-heading">Live example</h2>
				${demo()}
				<p role="status" aria-label="Disclosure state">Use the summary to open or close the panel.</p>
				<p data-demo-controls hidden><button type="button" data-open-panel>Open via attribute</button> <button type="button" data-remove-open>Close via attribute</button></p>
				<p>The outer controls change the attribute. The inner button sends a bubbling request; the status listens for the outgoing change event. The summary works without JavaScript.</p>
			</section>
			<section id="usage"><h2>Start with HTML</h2>
				${code('Minimal HTML', 'HTML', `<script type="module" src="/vendor/disclosure-panel/index.js"></script>
<disclosure-panel>
	<details>
		<summary>Installation help</summary>
		<p>Use your browser’s Add to Home Screen menu.</p>
	</details>
</disclosure-panel>`)}
				<p>Keep <code>index.js</code> beside <code>disclosure-panel.js</code>. No stylesheet, build step, or shadow root is required. Put initial <code>open</code> on the native details too if it should start expanded without JavaScript.</p>
				${code('Initially expanded markup', 'HTML', '<disclosure-panel open>\n\t<details open>\n\t\t<summary>Help</summary>\n\t\t<p>Visible before and after upgrade.</p>\n\t</details>\n</disclosure-panel>')}
			</section>
			<section id="api"><h2>Attributes and events</h2>
				<table><caption>Attribute contract</caption><thead><tr><th scope="col">Attribute</th><th scope="col">Meaning</th></tr></thead><tbody><tr><th scope="row"><code>open</code></th><td>Boolean presence opens the details. Remove to close. <code>open="false"</code> is still present and opens it. Native changes reflect back to the host.</td></tr></tbody></table>
				<table><caption>Event contract</caption><thead><tr><th scope="col">Event</th><th scope="col">Direction and payload</th></tr></thead><tbody>
					<tr><th scope="row"><code>disclosure-change</code></th><td>Emitted up after state changes: <code>detail: { open: boolean }</code>. Bubbles, composed, not cancelable. No event for initialization or unchanged state.</td></tr>
					<tr><th scope="row"><code>disclosure-request</code></th><td>Listened for from children: <code>detail: { open: boolean }</code>. Dispatch with <code>bubbles: true</code>; add <code>composed: true</code> to cross a shadow root. Requests must reach the nearest panel.</td></tr>
				</tbody></table>
				${code('State down, data up', 'JavaScript', `const panel = document.querySelector('disclosure-panel');
panel.addEventListener('disclosure-change', (event) => {
	console.log('Open:', event.detail.open);
});
panel.setAttribute('open', '');
panel.removeAttribute('open');

// From a button inside the panel; no parent selector required.
button.addEventListener('click', () => {
	button.dispatchEvent(new CustomEvent('disclosure-request', {
		detail: { open: false }, bubbles: true, composed: true,
	}));
});`)}
				<p>Here <code>button</code> is a reference to your child button. Hide enhancement-only controls until their listeners are installed, as the live demo does. Do not announce content twice: the component preserves native disclosure semantics and adds no ARIA.</p>
				<p>The <a href="${component.manifest}">manifest</a> uses the <a href="https://github.com/webcomponents/custom-elements-manifest">Custom Elements Manifest schema</a>. Incoming events use the documented <code>x-listens</code> extension because the standard <code>events</code> field describes emitted events. There are no custom public methods, properties, slots, CSS parts, or CSS custom properties.</p>
			</section>
			<section id="installation"><h2>Install from GitHub</h2>
				<p>There is no npm registry publication. Clone the GitHub repository, check out a reviewed commit, and vendor the component directory into your project. Replace <code>COMMIT_SHA</code> with that commit’s full SHA.</p>
				${code('Vendor a pinned GitHub revision', 'Shell', `git clone https://github.com/jessehattabaugh/jessehattabaugh-com.git component-source
git -C component-source checkout COMMIT_SHA
mkdir -p vendor
cp -R component-source/client/components/disclosure-panel vendor/disclosure-panel`)}
				<p>Commit the vendored files, including the license, and record the upstream SHA when updating. GitHub raw-file URLs are source downloads; serve vendored modules from your own origin with a JavaScript MIME type.</p>
				${code('Choose one package manager', 'Shell', `npm install ./vendor/disclosure-panel
# Or:
pnpm add ./vendor/disclosure-panel
# Or:
yarn add ./vendor/disclosure-panel`)}
				<p>Keep the vendor directory and package lockfile in version control. These commands install a local ES module package, without publishing to another repository. Do not install this whole GitHub repository as the component package: its root package belongs to the website.</p>
				${code('Vite or webpack application entry', 'JavaScript', "import '@jessehattabaugh/disclosure-panel';")}
				<p>Import once from your browser entry. <a href="https://vite.dev/guide/features">Vite</a> and <a href="https://webpack.js.org/guides/package-exports/">webpack</a> resolve the package export. The registration entry is marked as a side effect so production builds keep it.</p>
				${code('Rollup without a package-resolution plugin', 'JavaScript', "// In your browser entry; Rollup follows these relative ES module imports.\nimport '../../shared/templates/pages/vendor/disclosure-panel/index.js';")}
				<p>For bare package imports in <a href="https://rollupjs.org/tutorial/#using-plugins">Rollup</a>, use its node-resolve plugin. The relative import needs no plugin. All three approaches register the same element; no framework-specific wrapper is needed.</p>
				${code('Manual registration', 'JavaScript', `import { DisclosurePanel } from '@jessehattabaugh/disclosure-panel/element';
customElements.define('disclosure-panel', DisclosurePanel);`)}
				<p>The <code>/element</code> export has no registration side effect. Choose manual registration or the default auto-registration entry. Load one version per document; with automatic registration the first definition wins. For server rendering, output the HTML on the server and import the module only in the browser: <code>HTMLElement</code> is a browser API.</p>
				${code('Optional local tarball', 'Shell', 'npm pack ./vendor/disclosure-panel --ignore-scripts\nnpm install ./jessehattabaugh-disclosure-panel-1.0.0.tgz')}
				<p>A tarball is optional for local distribution or a future GitHub release asset. No GitHub release is required by these instructions. See the <a href="https://docs.npmjs.com/cli/commands/npm-install">npm install reference</a>.</p>
			</section>
			<section id="limits"><h2>Behavior and limits</h2>
				<ul>
					<li>Use one direct <code>details</code> child with a first-child <code>summary</code>. Additional details are left alone. Missing details is inert; direct children inserted later are discovered.</li>
					<li>At upgrade or reconnection, host <code>open</code> wins when present; otherwise the native state is adopted. Initialization emits no change event.</li>
					<li>Native toggle notifications are asynchronous and can coalesce rapid changes. Attribute requests report changes immediately; do not rely on one event per rapid native toggle.</li>
					<li>Malformed requests, prevented requests, and requests without a details child are ignored. Nested panels handle their own requests; request events still bubble for other listeners.</li>
					<li>No JavaScript, failed module loading, or unsupported Custom Elements leaves an ordinary keyboard-accessible details element. Only state coordination requires JavaScript.</li>
					<li>Use current browsers with Custom Elements, MutationObserver, and native details support. Style <code>disclosure-panel</code>, <code>details</code>, and <code>summary</code> in your own CSS; the wrapper is unstyled and inline by default.</li>
				</ul>
				<p>This component also wraps the site’s app-install instructions. It makes no network requests and stores no data.</p>
			</section>
		</article>`, scripts: html`<script type="module" src="/components/demo.js"></script>` });
}
