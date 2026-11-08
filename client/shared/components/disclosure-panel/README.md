# disclosure-panel

A dependency-free Custom Element around a native `details` child. MIT licensed.
Source is distributed through GitHub, with no package registry publication.

```html
<script type="module" src="/vendor/disclosure-panel/index.js"></script>
<disclosure-panel>
	<details>
		<summary>Installation help</summary>
		<p>Use your browser’s Add to Home Screen menu.</p>
	</details>
</disclosure-panel>
```

Keep `index.js` and `disclosure-panel.js` together. Serve them from your own
origin as JavaScript. No build, CSS, or shadow root is required.

- `open`: boolean attribute; presence opens, removal closes. `open="false"`
	still opens. Native toggles reflect to the host. For an expanded no-JS
	baseline, put `open` on both the host and `details`.
- Emits `disclosure-change`: `CustomEvent` with `detail: { open: boolean }`,
	bubbling, composed, not cancelable. No initialization or unchanged-state event.
- Listens for `disclosure-request` from descendants, with boolean `detail.open`.
	Use `bubbles: true` and `composed: true` to cross shadow boundaries.
	Malformed/prevented requests are ignored. Nested panels own their requests;
	requests still bubble. See `x-listens` in `custom-elements.json`.

Use exactly one direct `details` child with a first-child `summary`.
Missing children are inert; late insertion is observed. At upgrade/reconnection,
host `open` wins if present, otherwise native state is adopted. Native toggle
events are asynchronous and can coalesce. The native summary works without JS;
hide custom request buttons until their listeners are installed. Style the light
DOM with ordinary selectors. No custom properties, methods, slots, or CSS parts.
Import only in browsers with Custom Elements, MutationObserver, and details;
server rendering should output HTML without importing this module.

## GitHub and bundlers

Clone `https://github.com/jessehattabaugh/jessehattabaugh-com.git`, check out a
reviewed full commit SHA, and copy `client/shared/components/disclosure-panel` into your
project’s `vendor/disclosure-panel`. Commit it with its license and upstream SHA.

```sh
npm install ./vendor/disclosure-panel
# Or: pnpm add ./vendor/disclosure-panel
# Or: yarn add ./vendor/disclosure-panel
```

In a Vite or webpack browser entry:

```js
import '@jessehattabaugh/disclosure-panel';
```

Rollup can use `import './vendor/disclosure-panel/index.js'` from an entry next
to `vendor/`, or its node-resolve plugin for the bare package name. Registration
is marked as a package side effect. Commit vendor files and lockfiles. Do not
install the website’s root GitHub package as this component.

For manual registration, import `DisclosurePanel` from the package’s `/element`
export and call `customElements.define('disclosure-panel', DisclosurePanel)`.
The default entry registers automatically; load one version per page. The first
automatic definition wins.

Full examples and API: https://jessehattabaugh.com/components/disclosure-panel/
