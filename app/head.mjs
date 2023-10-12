/** @type {import('@enhance/types').EnhanceHeadFn} */
export default function Head(state) {
	const { req } = state;
	const { path } = req;

	return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<title>JesseHattabaugh.com${path}</title>

				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="description" content="Personal site of Jesse Hattabaugh" />
				<meta name="theme-color" content="#ff0000" />

				<link rel="icon" href="/_public/favicon.ico" />
				<link rel="manifest" href="/_public/manifest.json" />
				<link rel="apple-touch-icon" href="/_public/jesse192.png" />
				<!-- this doesn't work, likely due to enhance fingerprinting the filename
				<link
					as="font"
					crossorigin="anonymous"
					href="/_public/fonts/comicSans.woff2"
					rel="preload"
					type="font/woff2"
				/>-->
				<link rel="stylesheet" href="/_public/all.css" media="all" />
				<link rel="stylesheet" href="/_public/screen.css" media="screen" />
				<link rel="stylesheet" href="/_public/print.css" media="print" />
				<!-- the footer of every page contains an hcard, this should inform parsers -->
				<link rel="profile" href="http://microformats.org/profile/hcard" />

				<script nomodule>
					console.error('Time to upgrade your browser boomer! 🧓');
				</script>

				<script async type="module" src="/_public/browser/async.mjs"></script>
				<script
					src="https://unpkg.com/htmx.org@1.9.6"
					integrity="sha384-FhXw7b6AlE/jyjlZH5iHa/tTe9EpJ1Y55RjcgPbjeWMskSxZt1v9qkxLJWNJaGni"
					crossorigin="anonymous"
				></script>
				<!-- disabled because htmx copies this into the DOM after navigations
				<noscript>
					<marquee>Enable JavaScript you weirdo! 🦄</marquee>
				</noscript>
				--></head>
		</html>`;
}
