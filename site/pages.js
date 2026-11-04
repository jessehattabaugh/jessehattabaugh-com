import { rpgActor } from './templates/rpg-actor.js';
import { home } from './templates/home.js';
import { about } from './templates/about.js';
import { colophon } from './templates/colophon.js';
import { apps } from './templates/apps.js';
import { notFound } from '../shared/templates/not-found.js';
import { error } from '../shared/templates/error.js';
import { giving } from './templates/giving.js';
import { components, disclosurePanel } from './templates/components.js';

/** @type {Record<string, (social?: import('./data/atproto.js').Social) => import('../shared/html.js').Raw>} */
export const staticPages = {
	home,
	rpgActor,
	about,
	giving,
	colophon,
	apps,
	components,
	disclosurePanel,
	notFound,
	error: () => { return error(); },
};
