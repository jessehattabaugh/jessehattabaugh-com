/** The URL vocabulary belongs to the server. Clients follow rendered controls. */
export const paths = {
	home: '/', about: '/about', colophon: '/colophon', apps: '/apps/',
	giving: '/giving', bluesky: '/bluesky', atAvatar: '/atproto/avatar', atBlob: '/atproto/blob',
	avatar: '/branding/avatar-96.png',
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

export const staticRoutes = [
	{ name: 'home', path: paths.home },
	{ name: 'about', path: paths.about },
	{ name: 'giving', path: paths.giving },
	{ name: 'colophon', path: paths.colophon },
	{ name: 'apps', path: paths.apps },
	{ name: 'notFound', path: paths.notFound },
	{ name: 'error', path: paths.error },
];

export const dynamicRoutes = [
	{ path: '/apps/messages/verify', methods: ['GET', 'POST'], handler: 'legacy-auth' },
	{ path: '/apps/messages/logout', methods: ['POST'], handler: 'legacy-auth' },
	{ path: '/apps/messages/profile', methods: ['POST'], handler: 'legacy-auth' },
	{ path: paths.home, methods: ['GET'], handler: 'social' },
	{ path: paths.about, methods: ['GET'], handler: 'social' },
	{ path: paths.giving, methods: ['GET'], handler: 'social' },
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
