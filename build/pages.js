import { rpgActor } from '../shared/templates/pages/rpg-actor.js';
import { home } from '../shared/templates/pages/home.js';
import { about } from '../shared/templates/pages/about.js';
import { colophon } from './templates/colophon.js';
import { apps } from './templates/apps.js';
import { notFound } from './templates/not-found.js';
import { error } from '../shared/templates/error.js';
import { components, disclosurePanel } from './templates/components.js';

import { games, aetherWing } from './templates/games.js';
import { retroGame } from './templates/retro-game.js';

/** @type {Record<string, (social?: import('../shared/data/atproto.js').Social, query?: URLSearchParams) => import('../shared/html.js').Raw>} */
export const staticPages = {
	home,
	rpgActor,
	about,
	colophon,
	apps,
	components,
	disclosurePanel,
	retroGame,
	games,
	aetherWing,
	notFound,
	error: () => { return error(); },
};
