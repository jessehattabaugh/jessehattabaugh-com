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
				<meta name="theme-color" content="#ff0000" />
				<link
					as="font"
					crossorigin="anonymous"
					href="/_public/fonts/comicSans.woff2"
					rel="preload"
					type="font/woff2"
				/>
				<link rel="stylesheet" href="/_public/all.css" media="all" />
				<link rel="stylesheet" href="/_public/screen.css" media="screen" />
				<link rel="stylesheet" href="/_public/print.css" media="print" />
				<script nomodule>
					console.error('Time to upgrade your browser boomer! 🧓');
				</script>
				<script async type="module" src="/_public/browser/async.mjs"></script>
				<script src="https://unpkg.com/htmx.org@1.9.10" integrity="sha384-D1Kt99CQMDuVetoL1lrYwg5t+9QdHe7NLX/SoJYkXDFfX37iInKRy5xLSi8nO7UC" crossorigin="anonymous"></script>
				<script src="https://unpkg.com/htmx.org/dist/ext/head-support.js"></script>

				<!-- the footer of every page contains an hcard, this should inform parsers -->
				<link rel="profile" href="http://microformats.org/profile/hcard" />
			</head>
			<body hx-boost="true" hx-ext="head-support">`;
}
