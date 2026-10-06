import { home } from './templates/home.js';
import { about } from './templates/about.js';
import { colophon } from './templates/colophon.js';
import { apps } from './templates/apps.js';
import { notFound } from './templates/not-found.js';
import { error } from './templates/error.js';

/** @type {Record<string, () => import('./html.js').Raw>} */
export const staticPages = { home, about, colophon, apps, notFound, error };
