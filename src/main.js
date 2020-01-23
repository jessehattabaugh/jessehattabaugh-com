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

// set up the dark mode toggle
const darkToggle = document.getElementById('darkToggle');
if (window.matchMedia('prefers-color-scheme: dark')) {
	darkToggle.checked = true;
}
darkToggle.addEventListener('click', (event) => {
	console.debug('darkToggle clicked', event.target.checked);
	const prefersColorSchemeDarkLink = document.getElementById(
		'prefersColorSchemeDarkLink',
	);
	if (event.target.checked) {
		prefersColorSchemeDarkLink.disabled = false;
		const oldStyle = document.getElementById('darkToggleStylesheetLink');
		if (oldStyle) {
			oldStyle.disabled = false;
			console.debug('existing style enabled');
		} else {
			const newStyle = document.createElement('link');
			newStyle.setAttribute('rel', 'stylesheet');
			newStyle.setAttribute('type', 'text/css');
			newStyle.setAttribute('href', prefersColorSchemeDarkLink.href);
			newStyle.setAttribute('media', 'screen');
			newStyle.setAttribute('id', 'darkToggleStylesheetLink');
			newStyle.setAttribute('class', 'dark-stylesheet-link');
			document.getElementsByTagName('head')[0].appendChild(newStyle);
			console.debug('newStyle appended');
		}
	} else {
		console.debug('removing dark styles');
		[...document.querySelectorAll('.dark-stylesheet-link')].forEach(
			(link) => {
				link.disabled = true;
				console.debug('disabled dark link', link);
			},
		);
	}
});

console.debug('main script evaluated');
