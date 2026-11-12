import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { rpgActor } from '../shared/templates/pages/rpg-actor.js';
import { home } from '../shared/templates/pages/home.js';
import { about } from '../shared/templates/pages/about.js';
import { colophon } from './templates/colophon.js';
import { apps } from './templates/apps.js';
import { notFound } from './templates/not-found.js';
import { error } from '../shared/templates/error.js';
import { components, disclosurePanel, webCounterPage } from './templates/components.js';

import { games, aetherWing } from './templates/games.js';
import { gameKit, gameKitElement } from './templates/game-kit.js';
import { gameKitElements } from '../shared/routes.js';

/** @import { Declaration } from './templates/game-kit.js' */
const gameKitManifestFile = fileURLToPath(new URL('../client/components/game-kit/custom-elements.json', import.meta.url));
const gameKitManifest = /** @type {{ modules: { declarations?: Declaration[] }[] }} */ (JSON.parse(readFileSync(gameKitManifestFile, 'utf8')));
const gameKitDeclarations = new Map(gameKitManifest.modules.flatMap(({ declarations = [] }) => {
	return declarations.map((declaration) => { return [declaration.tagName, declaration]; });
}));

/** @type {Record<string, (social?: import('../shared/data/atproto.js').Social, query?: URLSearchParams) => import('../shared/html.js').Raw>} */
export const staticPages = {
	home,
	rpgActor,
	about,
	colophon,
	apps,
	components,
	disclosurePanel,
	webCounter: webCounterPage,
	gameKit,
	...Object.fromEntries(gameKitElements.map((tag) => {
		const declaration = gameKitDeclarations.get(tag);
		if (!declaration) { throw new Error(`Game Kit manifest lacks ${tag}`); }
		return [tag, (/** @type {import('../shared/data/atproto.js').Social | undefined} */ social) => { return gameKitElement(tag, declaration, social); }];
	})),
	games,
	aetherWing,
	notFound,
	error: () => { return error(); },
};
