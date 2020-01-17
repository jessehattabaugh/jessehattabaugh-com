window.addEventListener('load', () => {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('sw.js')
			.then((reg) => {
				console.debug('Registration successful, scope is:', reg.scope);
				reg.onupdatefound = (ev) => console.log('sw update found', ev);
			})
			.catch((er) => {
				console.error('Service worker registration failed, error:', er);
			});
	} else {
		console.warn("The current browser doesn't support service workers");
	}
});

console.debug('💀main script evaluated');