import { home } from './templates/home.js';
import { about } from './templates/about.js';
import { colophon } from './templates/colophon.js';
import { apps } from './templates/apps.js';
import { notFound } from '../shared/templates/not-found.js';
import { error } from '../shared/templates/error.js';
import { giving } from './templates/giving.js';

/** @type {Record<string, (social?: import('./data/atproto.js').Social) => import('../shared/html.js').Raw>} */
export const staticPages = {
	home,
	about,
	giving,
	colophon,
	apps,
	notFound,
	error: () => { return error(); },
};
