//pages/_app.js
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
	useEffect(() => {
		if ('serviceWorker' in navigator) {
			window.addEventListener('load', async () => {
				try {
					const { scope } = await navigator.serviceWorker.register(
						'/sw.js',
					);
					console.info(
						'Service Worker registration successful with scope: ',
						scope,
					);
				} catch (err) {
					console.log('Service Worker registration failed: ', err);
				}
			});
		}
	}, []);
	return <Component {...pageProps} />;
}

export default MyApp;
