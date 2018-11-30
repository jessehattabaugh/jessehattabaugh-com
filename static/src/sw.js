import 'babel-polyfill';

oninstall = (ev) => {
	console.info('sw installing');
	ev.waitUntil(warmCache());
};

onactivate = (ev) => {
	console.info('sw activating');

	// enable navigation preload if it's available
	if (self.registration.navigationPreload) {
		console.info('sw enabling navigation preload');
		self.registration.navigationPreload.enable();
	}

	// todo: remove old caches
	//clients.claim();
};

onfetch = (ev) => {
	console.info('sw fetching', ev.request.url);
	ev.respondWith(cacheOrNetwork(ev));
};

onmessage = (ev) => console.log('sw message', ev);
onnotificationclick = (ev) => console.log('sw notification click', ev);
onnotificationclose = (ev) => console.log('sw notification close', ev);
onpush = (ev) => console.log('sw push:', ev);
//onpushsubscriptionchange = (ev) => console.log('sw push subscription change', ev);

async function getCache() {
	console.info('sw getting cache');
	return caches.open('v1');
}

async function warmCache() {
	console.info('sw warming cache');
	const cache = await getCache();
	return cache.addAll(['/']);
}

async function cacheOrNetwork(ev) {
	console.info('sw fetching from cache or network');
	// first attempt to load from the cache
	const cache = await getCache();
	const cached = await cache.match(ev.request);
	if (cached) {
		console.info('sw found request in cache', ev.request.url);
		// refresh the cache from the network
		ev.waitUntil(fetchAndCache(ev));
		return cached;
	}

	// nothing in the cache, try the network
	const network = await fetchPreload(ev);
	ev.waitUntil(cacheResponse(ev, network));
	return network;
}

async function fetchAndCache(ev) {
	console.info('sw fetching the page and caching the response');
	const response = await fetchPreload(ev);
	return cacheResponse(ev, response);
}

async function fetchPreload(ev) {
	console.info('sw fetching from network', ev.request.url);

	// attempt to fetch from the network
	const requests = [fetch(ev.request)];

	// if the browser supports navigation prefetch use that too
	if (ev.preloadResponse) requests.push(ev.preloadResponse);

	// return whichever response resolves first
	return await raceToSuccess(requests);
}

async function cacheResponse(ev, res) {
	console.info('sw cacheing response', ev.request.url);
	const cache = await getCache();
	if (res) return cache.put(ev.request, res.clone());
	else console.warn(`sw can't cache`, ev.request.url);
}

function raceToSuccess(requests) {
	return Promise.all(
		requests.map((req) => {
			// If a request fails, count that as a resolution so it will keep
			// waiting for other possible successes. If a request succeeds,
			// treat it as a rejection so Promise.all immediately bails out.
			return req.then(
				(response) => {
					if (response) Promise.reject(response);
					else Promise.resolve('invalid response');
				},
				(err) => Promise.resolve(err),
			);
		}),
	).then(
		// If '.all' resolved, we've just got an array of errors.
		(errors) => Promise.reject(errors),
		// If '.all' rejected, we've got the result we wanted.
		(response) => Promise.resolve(response),
	);
}

console.info('sw evaluated');
