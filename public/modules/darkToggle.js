export default darkToggle;

function darkToggle() {
    // component stuff here
}

// set up the dark mode toggle
const darkCheckbox = document.querySelector('#darkToggle input');
const darkToggleStylesheetLink = document.getElementById(
	'darkToggleStylesheetLink',
);
const prefersColorSchemeDarkLink = document.getElementById(
	'prefersColorSchemeDarkLink',
);

if (isDark()) {
	darkCheckbox.checked = true;
	darkToggleStylesheetLink.disabled = false;
	console.debug('enabled dark style 😎');
} else {
	prefersColorSchemeDarkLink.disabled = true;
	console.debug('disabled dark styles 🌒');
}

darkCheckbox.addEventListener('click', (event) => {
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