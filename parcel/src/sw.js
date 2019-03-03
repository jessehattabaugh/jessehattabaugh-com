import 'babel-polyfill';

oninstall = (ev) => {
	// set up cache
	ev.waitUntil(
		caches.open('v1').then((cache) => {
			console.info('sw opened cache');
			return cache.addAll(['/']);
		}),
	);
	console.info('sw installed');
};

onactivate = (ev) => {
	// todo: remove old caches
	//clients.claim();
	console.log('sw activated');
};

onfetch = (ev) => {
	ev.respondWith(
		caches.match(ev.request).then((response) => {
			if (response) {
				console.info('sw file found in cache');
				return response;
			}
			return fetch(ev.request);
		}),
	);
	//console.info("sw fetched");
};

onmessage = (ev) => console.log('sw message', ev);
onnotificationclick = (ev) => console.log('sw notification click', ev);
onnotificationclose = (ev) => console.log('sw notification close', ev);
onpush = (ev) => console.log('sw push:', ev);
//onpushsubscriptionchange = (ev) => console.log('sw push subscription change', ev);

console.info('sw evaluated');
