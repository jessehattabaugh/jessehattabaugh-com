/**
 * Tiny IndexedDB key/value store shared by the page and the service worker.
 *
 * Web Push payloads must stay tiny and can't be customized per device after
 * the fact, so the page parks the subscriber's coarse location here and the
 * service worker reads it when a wake push arrives.
 */

const DB_NAME = 'rainbow-hour';
const DB_VERSION = 1;
const STORE = 'state';
const LOCATION_KEY = 'location';

/** @typedef {{ latitude: number, longitude: number, timezone: string }} StoredLocation */

/** @returns {Promise<IDBDatabase>} */
function openDb() {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(STORE)) {
				req.result.createObjectStore(STORE);
			}
		};
		req.onsuccess = () => {
			resolve(req.result);
		};
		req.onerror = () => {
			reject(req.error ?? new Error('IndexedDB open failed'));
		};
	});
}

/**
 * @param {string} key
 * @returns {Promise<unknown>}
 */
async function readKey(key) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readonly');
		const req = tx.objectStore(STORE).get(key);
		req.onsuccess = () => {
			resolve(req.result ?? null);
		};
		req.onerror = () => {
			reject(req.error ?? new Error('IndexedDB read failed'));
		};
	});
}

/**
 * @param {string} key
 * @param {unknown} value
 */
async function writeKey(key, value) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).put(value, key);
		tx.oncomplete = () => {
			resolve(undefined);
		};
		tx.onerror = () => {
			reject(tx.error ?? new Error('IndexedDB write failed'));
		};
	});
}

/** @param {string} key */
async function deleteKey(key) {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE, 'readwrite');
		tx.objectStore(STORE).delete(key);
		tx.oncomplete = () => {
			resolve(undefined);
		};
		tx.onerror = () => {
			reject(tx.error ?? new Error('IndexedDB delete failed'));
		};
	});
}

/** @param {StoredLocation} location */
export function saveLocation(location) {
	return writeKey(LOCATION_KEY, location);
}

/** @returns {Promise<StoredLocation | null>} */
export function loadLocation() {
	return /** @type {Promise<StoredLocation | null>} */ (/** @type {unknown} */ (readKey(LOCATION_KEY)));
}

export function clearLocation() {
	return deleteKey(LOCATION_KEY);
}
