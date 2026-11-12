/** One URL catalog for Worker dispatch, static rendering, navigation and browser coverage.
 * Template module paths are relative to the repository root. Only the Node build
 * loads them; browsers and Workers never import build-only template modules.
 * A new page needs its template plus one entry here, not a second renderer map.
 * @typedef {object} Route
 * @property {string} path
 * @property {string[]} [methods] Defaults to GET (and HEAD).
 * @property {string} [handler] Server feature handler, bound once in server/index.js.
 * @property {[string, string]} [template] Module and named template export.
 * @property {string} [heading] Public heading used by the deployed browser suite.
 * @property {boolean} [sitemap] Include this canonical page in the sitemap.
 * @property {string} [navigation] Label in the site's primary navigation.
 * @property {number} [navigationOrder] Primary navigation order.
 * @property {string} [redirect] Named destination route for a permanent redirect.
 */

export const gameKitElements = /** @type {const} */ ([
	'game-screen',
	'game-sprite',
	'game-layer',
	'game-tilemap',
	'game-tile',
	'game-tileset',
	'game-palette',
	'game-stage',
	'game-input',
	'game-world',
	'game-scene',
	'game-menu',
	'game-modal',
	'game-flow',
]);

/** @satisfies {Record<string, Route>} */
export const routes = {
	// Main site.
	home: {
		path: '/',
		template: ['shared/templates/pages/home.js', 'home'],
		handler: 'social',
		heading: 'Useful tools and web experiments',
		sitemap: true,
	},
	about: {
		path: '/about',
		template: ['shared/templates/pages/about.js', 'about'],
		handler: 'social',
		heading: 'About Me',
		sitemap: true,
		navigation: 'About',
		navigationOrder: 1,
	},
	colophon: {
		path: '/colophon/',
		template: ['build/templates/colophon.js', 'colophon'],
		heading: 'How this site is built',
		sitemap: true,
	},

	// Apps.
	apps: {
		path: '/apps/',
		template: ['build/templates/apps.js', 'apps'],
		heading: 'Apps',
		sitemap: true,
		navigation: 'Apps',
		navigationOrder: 2,
	},
	messages: {
		path: '/apps/messages/',
		handler: 'messages',
		methods: ['GET', 'POST'],
		heading: 'Jessages',
		sitemap: true,
		navigation: 'Contact',
		navigationOrder: 4,
	},
	setup: { path: '/apps/messages/setup', handler: 'messages', methods: ['POST'] },
	messagePush: { path: '/apps/messages/push', handler: 'messages', methods: ['POST'] },
	rainbow: {
		path: '/apps/rainbow-hour/',
		handler: 'rainbow',
		heading: 'Rainbow Hour',
		sitemap: true,
	},
	rainbowPush: { path: '/apps/rainbow-hour/push', handler: 'rainbow', methods: ['POST'] },
	lightsfinder: {
		path: '/apps/lightsfinder/',
		handler: 'lightsfinder',
		methods: ['GET', 'POST'],
		sitemap: true,
	},
	crunch: {
		path: '/apps/crunch-time/',
		handler: 'crunch',
		methods: ['GET', 'POST'],
		heading: 'Crunch Time',
		sitemap: true,
	},

	// Games.
	games: {
		path: '/games/',
		template: ['build/templates/games.js', 'games'],
		heading: 'Games',
		sitemap: true,
		navigation: 'Games',
		navigationOrder: 3,
	},
	aetherWing: {
		path: '/games/aether-wing/',
		template: ['build/templates/games.js', 'aetherWing'],
		heading: 'Aether Wing',
		sitemap: true,
	},

	// Reusable components.
	components: {
		path: '/components/',
		template: ['build/templates/components.js', 'components'],
		heading: 'Components',
		sitemap: true,
		navigation: 'Components',
		navigationOrder: 5,
	},
	rpgActor: {
		path: '/components/rpg-actor/',
		template: ['shared/templates/pages/rpg-actor.js', 'rpgActor'],
		handler: 'social',
		heading: 'rpg-actor',
		sitemap: true,
	},
	disclosurePanel: {
		path: '/components/disclosure-panel/',
		template: ['build/templates/components.js', 'disclosurePanel'],
		heading: 'disclosure-panel',
		sitemap: true,
	},
	gameKit: {
		path: '/components/game-kit/',
		template: ['build/templates/game-kit.js', 'gameKit'],
		heading: 'Game Kit',
		sitemap: true,
	},
	webCounter: {
		path: '/components/web-counter/',
		template: ['build/templates/components.js', 'webCounterPage'],
		heading: 'Web Counter',
		sitemap: true,
	},

	// Identity and administration.
	login: { path: '/login', handler: 'auth', methods: ['GET', 'POST'], heading: 'Sign in' },
	verify: { path: '/verify', handler: 'auth', methods: ['GET', 'POST'] },
	logout: { path: '/logout', handler: 'auth', methods: ['POST'] },
	profile: { path: '/account', handler: 'auth', methods: ['GET', 'POST'] },
	registerBegin: { path: '/auth/register/begin', handler: 'auth', methods: ['POST'] },
	registerComplete: { path: '/auth/register/complete', handler: 'auth', methods: ['POST'] },
	loginBegin: { path: '/auth/login/begin', handler: 'auth', methods: ['POST'] },
	loginComplete: { path: '/auth/login/complete', handler: 'auth', methods: ['POST'] },
	analytics: { path: '/admin/analytics/', handler: 'analytics' },

	// Public identity services.
	bluesky: { path: '/bluesky', handler: 'social' },
	atAvatar: { path: '/atproto/avatar', handler: 'social' },
	atBlob: { path: '/atproto/blob', handler: 'social' },
	avatar: { path: '/branding/avatar-96.png' },

	// Errors and redirects.
	notFound: { path: '/404/', template: ['build/templates/not-found.js', 'notFound'] },
	error: { path: '/500/', template: ['shared/templates/error.js', 'error'] },
	contact: { path: '/contact', redirect: 'messages' },
};

/** Derived compatibility vocabulary for templates; never maintain URLs twice. */
export const paths = /** @type {{ [K in keyof typeof routes]: string }} */ (
	Object.fromEntries(
		Object.entries(routes).map(([name, route]) => {
			return [name, route.path];
		}),
	)
);

/** @param {typeof gameKitElements[number]} tag */
export function gameKitReference(tag) {
	return `${paths.gameKit}${tag}/`;
}

/** @type {Array<Route & { name: string }>} */
export const routeCatalog = [
	...Object.entries(routes).map(([name, route]) => {
		return { name, ...route };
	}),
	...gameKitElements.map((tag) => {
		return {
			name: tag,
			path: gameKitReference(tag),
			heading: tag,
			sitemap: true,
			template: /** @type {[string, string]} */ ([
				'build/game-kit-reference.js',
				'reference',
			]),
		};
	}),
];

export const staticRoutes = routeCatalog.filter((route) => {
	return route.template;
});
export const dynamicRoutes = routeCatalog.filter((route) => {
	return route.handler || route.redirect;
});
export const sitemapPaths = routeCatalog
	.filter((route) => {
		return route.sitemap;
	})
	.map((route) => {
		return route.path;
	});
export const navigationRoutes = routeCatalog
	.filter((route) => {
		return route.navigation;
	})
	.sort((a, b) => {
		return (a.navigationOrder ?? 100) - (b.navigationOrder ?? 100);
	});
