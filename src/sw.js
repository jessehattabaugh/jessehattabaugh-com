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

	// eliminate SW bootup cost
	if (self.registration.navigationPreload) {
		self.registration.navigationPreload.enable();
	}

	console.log('sw activated');
};

onfetch = async (ev) => {
	console.info(`sw fetch event`);

	const ca = await caches.open('v1');

	// load the page from the cache
	const cached = await ca.match(ev.request);

	// see if the browser has preloaded it
	if (ev.preloadResponse) {
		const preloaded = await ev.preloadResponse;

		// store the preloaded page in the cache for next time
		if (preloaded) {
			ca.put(ev.request, preloaded.clone());
		}
	}

	if (cached) {
		console.info('sw cached response');
		ev.respondWith(cached);
	} else if (preloaded) {
		console.info('sw preloaded response');
		ev.respondWith(preloaded);
	} else {
		console.info('sw fetching from network');
		ev.respondWith(fetched);
	}
};

onmessage = (ev) => console.log('sw message', ev);
onnotificationclick = (ev) => console.log('sw notification click', ev);
onnotificationclose = (ev) => console.log('sw notification close', ev);
onpush = (ev) => console.log('sw push:', ev);
onpushsubscriptionchange = (ev) => {
	console.log('sw push subscription change', ev);
};

console.info('sw evaluated');
