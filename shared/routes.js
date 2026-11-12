/** Element names shared by the kit tutorial, reference routes and sitemap. */
export const gameKitElements = /** @type {const} */ ([
	'game-screen', 'game-sprite', 'game-layer', 'game-tilemap', 'game-tile', 'game-tileset',
	'game-palette', 'game-stage', 'game-input', 'game-world', 'game-scene', 'game-menu',
	'game-modal', 'game-flow',
]);

/** The URL vocabulary belongs to the server. Clients follow rendered controls. */
export const paths = {
	home: '/', about: '/about', colophon: '/colophon/', apps: '/apps/',
	components: '/components/', rpgActor: '/components/rpg-actor/', disclosurePanel: '/components/disclosure-panel/',
	gameKit: '/components/game-kit/', games: '/games/', aetherWing: '/games/aether-wing/',
	bluesky: '/bluesky', atAvatar: '/atproto/avatar', atBlob: '/atproto/blob',
	avatar: '/branding/avatar-96.png', analytics: '/admin/analytics/', webCounter: '/components/web-counter/',
	notFound: '/404/', error: '/500/', contact: '/contact', login: '/login',
	messages: '/apps/messages/', verify: '/verify',
	logout: '/logout', setup: '/apps/messages/setup', profile: '/account',
	registerBegin: '/auth/register/begin',
	registerComplete: '/auth/register/complete',
	loginBegin: '/auth/login/begin',
	loginComplete: '/auth/login/complete',
	messagePush: '/apps/messages/push',
	lightsfinder: '/apps/lightsfinder/', crunch: '/apps/crunch-time/',
	rainbow: '/apps/rainbow-hour/', rainbowPush: '/apps/rainbow-hour/push',
};

/** @param {typeof gameKitElements[number]} tag */
export function gameKitReference(tag) {
	return `${paths.gameKit}${tag}/`;
}

export const staticRoutes = [
	{ name: 'home', path: paths.home },
	{ name: 'about', path: paths.about },
	{ name: 'colophon', path: paths.colophon },
	{ name: 'apps', path: paths.apps },
	{ name: 'components', path: paths.components },
	{ name: 'webCounter', path: paths.webCounter },
	{ name: 'rpgActor', path: paths.rpgActor },
	{ name: 'disclosurePanel', path: paths.disclosurePanel },
	{ name: 'gameKit', path: paths.gameKit },
	...gameKitElements.map((name) => { return { name, path: gameKitReference(name) }; }),
	{ name: 'games', path: paths.games },
	{ name: 'aetherWing', path: paths.aetherWing },
	{ name: 'notFound', path: paths.notFound },
	{ name: 'error', path: paths.error },
];

export const dynamicRoutes = [
	{ path: '/components/page-counter/', methods: ['GET'], handler: 'webCounterRedirect' },
	{ path: paths.analytics, methods: ['GET'], handler: 'analytics' },
	{ path: '/components/retro-game/', methods: ['GET'], handler: 'gameKitRedirect' },
	{ path: paths.rpgActor, methods: ['GET'], handler: 'social' },
	{ path: paths.home, methods: ['GET'], handler: 'social' },
	{ path: paths.about, methods: ['GET'], handler: 'social' },
	{ path: paths.bluesky, methods: ['GET'], handler: 'social' },
	{ path: paths.atAvatar, methods: ['GET'], handler: 'social' },
	{ path: paths.atBlob, methods: ['GET'], handler: 'social' },
	{ path: paths.crunch, methods: ['GET', 'POST'], handler: 'crunch' },
	{ path: paths.lightsfinder, methods: ['GET', 'POST'], handler: 'lightsfinder' },
	{ path: paths.contact, methods: ['GET'], handler: 'contact' },
	{ path: paths.login, methods: ['GET', 'POST'], handler: 'auth' },
	{ path: paths.messages, methods: ['GET', 'POST'], handler: 'messages' },
	{ path: paths.verify, methods: ['GET', 'POST'], handler: 'auth' },
	{ path: paths.logout, methods: ['POST'], handler: 'auth' },
	{ path: paths.setup, methods: ['POST'], handler: 'messages' },
	{ path: paths.profile, methods: ['GET', 'POST'], handler: 'auth' },
	{ path: paths.messagePush, methods: ['POST'], handler: 'messages' },
	{ path: paths.registerBegin, methods: ['POST'], handler: 'auth' },
	{ path: paths.registerComplete, methods: ['POST'], handler: 'auth' },
	{ path: paths.loginBegin, methods: ['POST'], handler: 'auth' },
	{ path: paths.loginComplete, methods: ['POST'], handler: 'auth' },
	{ path: paths.rainbow, methods: ['GET'], handler: 'rainbow' },
	{ path: paths.rainbowPush, methods: ['POST'], handler: 'rainbow' },
];

/** @param {string} pathname */
export function findDynamicRoute(pathname) {
	return dynamicRoutes.find((route) => { return route.path === pathname; });
}

/** Canonical public documents with durable URLs, including server-rendered apps.
 * Authentication, private views, errors, query variants and assets are not search entries. */
export const sitemapPaths = [
	...staticRoutes.filter(({ name }) => { return !['notFound', 'error'].includes(name); }).map(({ path }) => { return path; }),
	paths.messages, paths.rainbow, paths.lightsfinder, paths.crunch,
];
