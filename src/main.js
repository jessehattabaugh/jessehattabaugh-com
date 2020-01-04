window.addEventListener('load', () => {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('sw.js')
			.then((reg) => {
				console.info('Registration successful, scope is:', reg.scope);
				reg.onupdatefound = (ev) => console.log('sw update found', ev);
			})
			.catch((er) => {
				console.error('Service worker registration failed, error:', er);
			});
	} else {
		console.warn("The current browser doesn't support service workers");
	}
});

console.info('main script evaluated');