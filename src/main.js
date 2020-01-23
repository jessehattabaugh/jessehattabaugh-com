window.addEventListener('load', () => {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('sw.js')
			.then((reg) => {
				console.debug('Registration successful, scope is:', reg.scope);
				reg.onupdatefound = (ev) =>
					console.debug('sw update found', ev);
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
const darkToggleStylesheetLink = document.getElementById(
	'darkToggleStylesheetLink',
);
const prefersColorSchemeDarkLink = document.getElementById(
	'prefersColorSchemeDarkLink',
);

if (isDark()) {
	darkToggle.checked = true;
	darkToggleStylesheetLink.disabled = false;
	console.debug('enabled dark style 😎');
} else {
	prefersColorSchemeDarkLink.disabled = true;
	console.debug('disabled dark styles 🌒');
}

darkToggle.addEventListener('click', (event) => {
	if (event.target.checked) {
		prefersColorSchemeDarkLink.disabled = false;
		darkToggleStylesheetLink.disabled = false;
		localStorage.setItem('prefersColorScheme', 'dark');
		console.debug('set color scheme to dark 🌑');
	} else {
		prefersColorSchemeDarkLink.disabled = true;
		darkToggleStylesheetLink.disabled = true;
		localStorage.setItem('prefersColorScheme', 'light');
		console.debug('set color scheme to light 🌞');
	}
});

function isDark() {
	const prefersColorScheme = localStorage.getItem('prefersColorScheme');
	const isDarkMedia = window.matchMedia(
		'screen and (prefers-color-scheme: dark)',
	).matches;
	console.debug(`local: ${prefersColorScheme}, media: ${isDarkMedia}`);
	return (
		prefersColorScheme === 'dark' ||
		(prefersColorScheme !== 'light' && isDarkMedia)
	);
}
console.debug('main script evaluated');
