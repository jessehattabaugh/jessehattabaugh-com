import { home } from './templates/home.js';
import { about } from './templates/about.js';
import { colophon } from './templates/colophon.js';
import { apps } from './templates/apps.js';
import { notFound } from './templates/not-found.js';
import { error } from './templates/error.js';
import { giving } from './templates/giving.js';

/** @type {Record<string, (social?: import('./data/atproto.js').Social) => import('./html.js').Raw>} */
export const staticPages = { home, about, giving, colophon, apps, notFound, error: () => error() };
