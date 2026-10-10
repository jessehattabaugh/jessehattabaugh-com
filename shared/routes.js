/** The URL vocabulary belongs to the server. Clients follow rendered controls. */
export const paths = {
	home: '/', about: '/about', colophon: '/colophon', apps: '/apps/',
	notFound: '/404/', error: '/500/', contact: '/contact', login: '/login',
	messages: '/apps/messages/', account: '/account', verify: '/verify',
	logout: '/logout', setup: '/account/setup', profile: '/account/email',
	registerBegin: '/auth/passkeys/register/begin',
	registerComplete: '/auth/passkeys/register/complete',
	loginBegin: '/auth/passkeys/login/begin',
	loginComplete: '/auth/passkeys/login/complete',
	messagePush: '/apps/messages/push',
	lightsfinder: '/apps/lightsfinder/',
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

/** Previously sent email links and installed clients keep working. */
/** @type {Record<string, string>} */
export const legacyAuthPaths = {
	'/apps/messages/verify': paths.verify,
	'/apps/messages/logout': paths.logout,
	'/apps/messages/setup': paths.setup,
	'/apps/messages/profile': paths.profile,
	'/apps/messages/api/auth/register/begin': paths.registerBegin,
	'/apps/messages/api/auth/register/complete': paths.registerComplete,
	'/apps/messages/api/auth/login/begin': paths.loginBegin,
	'/apps/messages/api/auth/login/complete': paths.loginComplete,
};

export const dynamicRoutes = [
	{ path: paths.account, methods: ['GET'], handler: 'auth' },
	{ path: paths.lightsfinder, methods: ['GET', 'POST'], handler: 'lightsfinder' },
	{ path: paths.contact, methods: ['GET'], handler: 'contact' },
	{ path: paths.login, methods: ['GET', 'POST'], handler: 'auth' },
	{ path: paths.messages, methods: ['GET', 'POST'], handler: 'messages' },
	{ path: paths.verify, methods: ['GET', 'POST'], handler: 'auth' },
	{ path: paths.logout, methods: ['POST'], handler: 'auth' },
	{ path: paths.setup, methods: ['POST'], handler: 'auth' },
	{ path: paths.profile, methods: ['POST'], handler: 'auth' },
	{ path: paths.messagePush, methods: ['POST'], handler: 'messages' },
	{ path: paths.registerBegin, methods: ['POST'], handler: 'auth' },
	{ path: paths.registerComplete, methods: ['POST'], handler: 'auth' },
	{ path: paths.loginBegin, methods: ['POST'], handler: 'auth' },
	{ path: paths.loginComplete, methods: ['POST'], handler: 'auth' },
	...Object.entries(legacyAuthPaths).map(([path, canonical]) => {return { path, methods: canonical === paths.verify ? ['GET', 'POST'] : ['POST'], handler: 'auth' }}),
	{ path: paths.rainbow, methods: ['GET'], handler: 'rainbow' },
	{ path: paths.rainbowPush, methods: ['POST'], handler: 'rainbow' },
];

/** @param {string} pathname */
export function findDynamicRoute(pathname) {
	return dynamicRoutes.find((route) => {return route.path === pathname});
}
