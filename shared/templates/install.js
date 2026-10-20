import { html } from '../html.js';

/** @param {string} name @param {string} [label] */
export function installControls(name, label = `Install ${name}`) {
	return html`<details><summary>${label}</summary>
		<p>Use your browser's install menu or “Add to Home Screen” to keep this app on your device.</p>
		<button type="button" class="btn btn--outline" data-install hidden>Install app</button>
	</details>`;
}
