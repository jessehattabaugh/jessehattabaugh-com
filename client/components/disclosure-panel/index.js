import { DisclosurePanel } from './disclosure-panel.js';

// ES module imports are cached. The guard also tolerates another copy on a page;
// the first definition wins, so consumers should load just one package version.
if (!customElements.get('disclosure-panel')) {
	customElements.define('disclosure-panel', DisclosurePanel);
}

export { DisclosurePanel };
