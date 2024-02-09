/** @type {import('@enhance/types').EnhanceHeadFn} */
export default function Head(state) {
	const { req } = state;
	const { path } = req;

	return /*html*/ `<!DOCTYPE html>
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
				<link rel="stylesheet" href="/_public/all.css" />
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
					<bgsound loop="infinite" src="/_public/audio/JessiesGirl.mid"></bgsound>
					<audio controls loop src="/_public/audio/JessiesGirl.mp3"></audio>
				</noscript>
			</body>
		</html>`;
}
