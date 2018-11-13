console.log('Welcome to my website!');

// registering the SW after DOM Load to protect the page load from the SW
window.addEventListener('load', () => {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('sw.js')
			.then((reg) => {
				console.log('Registration successful, scope is:', reg.scope);
				reg.onupdatefound = (ev) => console.log('sw update found', ev);
			})
			.catch((er) => {
				console.log('Service worker registration failed, error:', er);
			});
	} else {
		console.info("The current browser doesn't support service workers");
	}
});
