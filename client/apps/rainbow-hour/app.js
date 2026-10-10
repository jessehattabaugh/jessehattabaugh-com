/** Location and alerts enhance the server's coordinate form and sky report. */
import { saveLocation, clearLocation } from './storage.js';
import { sunPosition } from '../../../shared/solar.js';
import { setupPushForm } from '../../enhance/push.js';

const script = document.querySelector('script[data-service-worker]');
const workerUrl = script?.getAttribute('data-service-worker');
const scope = script?.getAttribute('data-scope');
const registration = workerUrl && scope && 'serviceWorker' in navigator
	? navigator.serviceWorker.register(workerUrl, { scope, type: 'module' }).catch(() => {return null})
	: Promise.resolve(null);

function coordinates() {
	const lat = document.getElementById('lat');
	const lon = document.getElementById('lon');
	if (!(lat instanceof HTMLInputElement) || !(lon instanceof HTMLInputElement) || !lat.value || !lon.value || !lat.checkValidity() || !lon.checkValidity()) { return null; }
	return { latitude: Math.round(Number(lat.value) * 100) / 100, longitude: Math.round(Number(lon.value) * 100) / 100, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
}

function readout() {
	const coords = coordinates();
	const status = document.querySelector('[data-sun]');
	if (status) { status.textContent = coords ? `Sun ${Math.round(sunPosition(Date.now(), coords.latitude, coords.longitude).altitudeDeg)}° above the horizon.` : ''; }
}

function initialize() {
	const locate = document.querySelector('[data-locate]');
	if (locate instanceof HTMLButtonElement && 'geolocation' in navigator) {
		locate.hidden = false;
		locate.addEventListener('click', () => {
			const status = document.querySelector('[data-location]');
			if (status) { status.textContent = 'Finding your location…'; }
			navigator.geolocation.getCurrentPosition((position) => {
				const lat = document.getElementById('lat');
				const lon = document.getElementById('lon');
				if (lat instanceof HTMLInputElement && lon instanceof HTMLInputElement) {
					lat.value = String(Math.round(position.coords.latitude * 100) / 100);
					lon.value = String(Math.round(position.coords.longitude * 100) / 100);
				}
				if (status) { status.textContent = 'Location ready. Choose a sky check or rainbow windows.'; }
				readout();
			}, () => { if (status) { status.textContent = 'Location unavailable — enter coordinates instead.'; } }, { enableHighAccuracy: false, timeout: 10000 });
		});
	}
	for (const form of document.querySelectorAll('form[data-push]')) {
		if (!(form instanceof HTMLFormElement)) { continue; }
		setupPushForm(form, registration, async () => {
			const coords = coordinates();
			if (!coords) { throw new Error('Enter valid coordinates before enabling alerts.'); }
			await saveLocation(coords);
			return { latitude: String(coords.latitude), longitude: String(coords.longitude), timezone: coords.timezone };
		}, clearLocation);
	}
	readout();
}
initialize();
document.addEventListener('fragment-loaded', initialize);
document.addEventListener('input', readout);
setInterval(readout, 60000);
