/** @type {import('@enhance/types').EnhanceHeadFn} */
export default function Head(state) {
	const { req } = state;
	const { path } = req;

	return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1"
				/>
				<title>www.jessehattabaugh.com/${path}</title>
				<meta
					name="description"
					content="Personal site of Jesse Hattabaugh"
				/>
				<link rel="icon" href="/_public/favicon.ico" />
				<link rel="manifest" href="/_public/manifest.json" />
				<link rel="apple-touch-icon" href="/_public/jesse192.png" />
				<meta name="theme-color" content="#ff0000" />

				<!-- styles -->
				<link rel="stylesheet" href="/_public/main.css" />
				<link
					rel="stylesheet"
					href="/_public/screen.css"
					media="screen"
				/>
				<link
					rel="stylesheet"
					href="/_public/wide.css"
					media="screen and (min-width: 512px)"
				/>
				<link
					rel="stylesheet"
					href="/_public/dark.css"
					media="screen and (prefers-color-scheme: dark)"
				/>
				<link
					rel="stylesheet"
					href="/_public/print.css"
					media="print"
				/>

				<script nomodule>
					console.error('Time to upgrade your browser boomer! 🧓');
				</script>
				<noscript>
					<marquee>Enable JavaScript you weirdo! 🦄</marquee>
				</noscript>
			</head>
		</html>`;
}
