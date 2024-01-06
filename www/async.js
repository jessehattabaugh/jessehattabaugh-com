if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			await navigator.serviceWorker.register(new URL('sw.js', import.meta.url), {
				scope: '/',
			});
			console.debug('👨‍🏭® service worker registered');
		} catch (exception) {
			console.error('👨‍🏭⚠ service worker failed', exception);
		}
	});
}

console.debug('🦥 async scripts loaded');
