if ('serviceWorker' in navigator) {
	window.addEventListener('load', async () => {
		try {
			await navigator.serviceWorker.register('sw.js', {
				scope: '/',
			});
			console.debug('👨‍🏭® service worker registered');
		} catch (exception) {
			console.error('👨‍🏭⚠ service worker failed', exception);
		}
	});
}

export {};

console.debug('🦥 async scripts loaded');
