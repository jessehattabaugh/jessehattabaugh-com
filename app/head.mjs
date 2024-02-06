/** @type {import('@enhance/types').EnhanceHeadFn} */
export default function Head(state) {
	const { req } = state;
	const { path } = req;

	return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>JesseHattabaugh.com${path}</title>
				<meta name="description" content="Personal site of Jesse Hattabaugh" />
				<link rel="icon" href="/_public/favicon.ico" />
				<link rel="manifest" href="/_public/manifest.json" />
				<link rel="apple-touch-icon" href="/_public/jesse192.png" />
				<meta name="theme-color" content="#000000" />
				<link
					as="font"
					crossorigin="anonymous"
					href="/_public/fonts/comicSans.woff2"
					rel="preload"
					type="font/woff2"
				/>
				<!-- styles for all display mediums -->
				<style>
					/* styles for any display medium */
					@font-face {
						font-display: swap;
						font-family: 'comicSans';
						src: url('/_public/fonts/comicSans.woff2') format('woff2'),
							url('/_public/fonts/comicSans.woff') format('woff'),
							url('/_public/fonts/comicSans.ttf') format('truetype'),
							url('/_public/fonts/comicSans.eot') format('embedded-opentype'),
							url('/_public/fonts/comicSans.svg') format('svg');
					}

					html {
						--color-error: Red;
						--rgb-black: 0, 0, 0;
						--rgb-white: 255, 255, 255;
						--unit-half: calc(var(--unit) / 2);
						--unit: 1em;
						box-sizing: border-box;
						height: 100%;
					}

					*,
					*::before,
					*::after {
						appearance: unset;
						box-sizing: inherit;
						line-height: calc(var(--unit) + var(--unit) / 2);
						margin: 0;
						padding: 0;
					}

					body {
						flex-direction: column;
						font-family: Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans',
							Arial, sans-serif;
					}

					body > * {
						margin: 0 auto;
						max-width: calc(var(--unit) * 50);
					}

					main {
						padding: var(--unit);
					}

					a:active,
					a:focus,
					a:link,
					a:visited {
						text-decoration: none;
					}

					a:hover {
						text-decoration: underline;
					}

					h1,
					h2,
					h3,
					h4,
					h5,
					h6 {
						font-family: comicSans, 'Comic Sans MS', 'Chalkboard SE', 'Segoe Print',
							'Bradley Hand', Chilanka, TSCu_Comic, casual, cursive;
						margin-bottom: calc(var(--unit) / 2);
						text-wrap: balance;
					}

					h2 {
						margin-top: calc(var(--unit) * 2);
					}

					p,
					ol,
					ul {
						margin-bottom: var(--unit);
					}

					dd,
					ol,
					ul {
						margin-left: var(--unit);
					}

					code {
						font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
					}

					summary > * {
						display: inline;
					}

					.error {
						color: var(--color-error);
					}
				</style>
				<link rel="stylesheet" href="/_public/screen.css" media="screen" />
				<link rel="stylesheet" href="/_public/print.css" media="print" />

				<script nomodule>
					console.error('Time to upgrade your browser boomer! 🧓');
				</script>

				<!-- script that runs for before load -->
				<script>
					// on load set the --color-one from localStorage
					const root = document.documentElement;
					const storedColor = localStorage.getItem('color-one');
					if (storedColor) {
						root.style.setProperty('--color-one', storedColor);
					}
					// on unload store the --color-one in localStorage
					window.addEventListener('unload', () => {
						const color = getComputedStyle(root).getPropertyValue('--color-one');
						localStorage.setItem('color-one', color);
					});
				</script>

				<!-- script that runs after load -->
				<script defer>
					if ('serviceWorker' in navigator) {
						window.addEventListener('load', async () => {
							try {
								await navigator.serviceWorker.register('/sw', {
									scope: '/',
								});
								console.debug('👨‍🏭® service worker registered');
							} catch (exception) {
								console.error('👨‍🏭⚠ service worker failed', exception);
							}
						});
					}
				</script>

				<!-- the footer of every page contains an hcard, this should inform parsers -->
				<link rel="profile" href="http://microformats.org/profile/hcard" />
			</head>
			<body>
				<noscript>
					<marquee behavior="alternate">
						<blink>🤡Enable JavaScript you weirdo!🤡</blink>
					</marquee>
				</noscript>
			</body>
		</html>`;
}
