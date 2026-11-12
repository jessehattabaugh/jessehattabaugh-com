import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { paths } from '../shared/routes.js';

/** Catalog metadata. Add a component here, its page/route, and its browser tests. */
export const componentCatalog = [{
	tag: 'disclosure-panel',
	path: '/components/disclosure-panel/',
	module: '/components/disclosure-panel/index.js',
	manifest: '/components/disclosure-panel/custom-elements.json',
	package: '/components/disclosure-panel/package.json',
	source: 'https://github.com/jessehattabaugh/jessehattabaugh-com/tree/main/client/components/disclosure-panel',
	description: 'Native disclosure, coordinated with attributes and events. Useful for help, installation instructions, and expandable documentation.',
}, {
	tag: 'rpg-actor',
	path: '/components/rpg-actor/',
	module: '/components/rpg-actor/index.js',
	manifest: '/components/rpg-actor/custom-elements.json',
	package: '/components/rpg-actor/package.json',
	source: 'https://github.com/jessehattabaugh/jessehattabaugh-com/tree/main/client/components/rpg-actor',
	description: 'A portable pixel character. Four directions, nine expressions, talking, and attribute-driven playback with an HTML fallback.',
}, {
	tag: 'web-counter',
	name: 'Web Counter',
	path: paths.webCounter,
	module: `${paths.webCounter}index.js`,
	stylesheet: `${paths.webCounter}styles.css`,
	manifest: `${paths.webCounter}custom-elements.json`,
	source: 'https://github.com/jessehattabaugh/jessehattabaugh-com/tree/main/client/components/web-counter',
	description: 'Display a supplied page-view total with a traditional counter and a native HTML fallback.',
}];

export const gameKitCatalog = {
	id: 'game-kit',
	name: 'Game Kit',
	path: paths.gameKit,
	module: `${paths.gameKit}index.js`,
	stylesheet: `${paths.gameKit}styles.css`,
	manifest: `${paths.gameKit}custom-elements.json`,
	package: `${paths.gameKit}package.json`,
	source: 'https://github.com/jessehattabaugh/jessehattabaugh-com/tree/main/client/components/game-kit',
	description: 'Build games with screens, layers, sprites, input, and scenes. Follow the Aether Wing tutorial to put them together.',
	dependencies: JSON.parse(readFileSync(fileURLToPath(new URL('../client/components/game-kit/package.json', import.meta.url)), 'utf8')).dependencies,
};

export const kitCatalog = [gameKitCatalog];
export const componentEntries = [...componentCatalog, ...kitCatalog];
