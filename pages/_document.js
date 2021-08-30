import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
	render() {
		return (
			<Html lang="en-us">
				<Head>
					<meta name="theme-color" content="#ff0000" />
					<meta
						name="apple-mobile-web-app-status-bar"
						content="#ff0000"
					/>
					<link rel="apple-touch-icon" href="/icon-96.png" />
					<link rel="icon" href="/favicon.ico" sizes="any" />
					<link rel="manifest" href="/manifest.json" />
				</Head>
				<body>
					<Main />
					<NextScript />
				</body>
			</Html>
		);
	}
}

export default MyDocument;
