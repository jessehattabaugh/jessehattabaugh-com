/** The URL vocabulary belongs to the server. Clients follow rendered controls. */
export const paths = {
	home: '/', about: '/about', colophon: '/colophon', apps: '/apps/',
	notFound: '/404/', error: '/500/', contact: '/contact', login: '/login',
	messages: '/apps/messages/', verify: '/apps/messages/verify',
	logout: '/apps/messages/logout', setup: '/apps/messages/setup', profile: '/apps/messages/profile',
	registerBegin: '/apps/messages/api/auth/register/begin',
	registerComplete: '/apps/messages/api/auth/register/complete',
	loginBegin: '/apps/messages/api/auth/login/begin',
	loginComplete: '/apps/messages/api/auth/login/complete',
	messagePush: '/apps/messages/push',
	rainbow: '/apps/rainbow-hour/', rainbowPush: '/apps/rainbow-hour/push',
};

export const staticRoutes = [
	{ name: 'home', path: paths.home },
	{ name: 'about', path: paths.about },
	{ name: 'colophon', path: paths.colophon },
	{ name: 'apps', path: paths.apps },
	{ name: 'notFound', path: paths.notFound },
	{ name: 'error', path: paths.error },
];

export const dynamicRoutes = [
	{ path: paths.contact, methods: ['GET'], handler: 'contact' },
	{ path: paths.login, methods: ['GET', 'POST'], handler: 'messages' },
	{ path: paths.messages, methods: ['GET', 'POST'], handler: 'messages' },
	{ path: paths.verify, methods: ['GET', 'POST'], handler: 'messages' },
	{ path: paths.logout, methods: ['POST'], handler: 'messages' },
	{ path: paths.setup, methods: ['POST'], handler: 'messages' },
	{ path: paths.profile, methods: ['POST'], handler: 'messages' },
	{ path: paths.messagePush, methods: ['POST'], handler: 'messages' },
	{ path: paths.registerBegin, methods: ['POST'], handler: 'messages' },
	{ path: paths.registerComplete, methods: ['POST'], handler: 'messages' },
	{ path: paths.loginBegin, methods: ['POST'], handler: 'messages' },
	{ path: paths.loginComplete, methods: ['POST'], handler: 'messages' },
	{ path: paths.rainbow, methods: ['GET'], handler: 'rainbow' },
	{ path: paths.rainbowPush, methods: ['POST'], handler: 'rainbow' },
];

/** @param {string} pathname */
export function findDynamicRoute(pathname) {
	return dynamicRoutes.find((route) => route.path === pathname);
}
