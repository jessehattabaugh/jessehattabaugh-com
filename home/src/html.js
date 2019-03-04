import React from 'react';

export default ({
	body,
	bodyAttributes,
	headComponents,
	htmlAttributes,
	postBodyComponents,
	preBodyComponents,
}) => (
	<html {...htmlAttributes}>
		<head>
			<meta charSet="utf-8" />
			<meta
				name="viewport"
				content="width=device-width, initial-scale=1"
			/>
			{headComponents}
			<link rel="manifest" href="site.webmanifest" />

			<title>Jesse Hattabaugh</title>
			<meta
				name="description"
				content="personal website of Jesse Hattabaugh"
			/>

			<link rel="shortcut icon" href="favicon.ico" type="image/x-icon" />

			<meta name="theme-color" content="#F00" />

			<style />

			<link rel="preload" href="print.css" as="style" />
			<link rel="preload" href="screen.css" as="style" />
			<link rel="preload" href="wide.css" as="style" />

			<link rel="stylesheet" href="print.css" media="print" />
			<link rel="stylesheet" href="screen.css" media="screen" />
			<link
				rel="stylesheet"
				href="wide.css"
				media="screen and (min-width: 512px)"
			/>

			<script
				async
				src="//www.googletagmanager.com/gtag/js?id=UA-125406508-1"
			/>
			<script
				dangerouslySetInnerHTML={{
					__html: `
window.dataLayer = window.dataLayer || [];
const gtag = (...args) => dataLayer.push(args);
gtag('js', new Date());
gtag('config', 'UA-125406508-1');
				`,
				}}
			/>
		</head>

		<body {...bodyAttributes}>
			{preBodyComponents}
			<main
				key={`body`}
				id="___gatsby"
				dangerouslySetInnerHTML={{__html: body}}
			/>

			<marquee behavior="alternate" style={{display: 'none'}}>
				<blink>I just don't give a fuck!</blink>
			</marquee>

			{postBodyComponents}
		</body>
	</html>
);

console.log('Welcome to my website!');
