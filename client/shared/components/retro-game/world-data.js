/** Shared numeric rules keep authored attributes bounded across simulation and CSS coordinate updates.
 * @param {Element} element @param {string} name @param {number} fallback
 * @param {number} [minimum] @param {number} [maximum]
 */
export function value(element, name, fallback, minimum = -10000, maximum = 10000) {
	const raw = element.getAttribute(name)?.trim();
	const parsed = raw ? Number(raw) : fallback;
	return Math.min(maximum, Math.max(minimum, Number.isFinite(parsed) ? parsed : fallback));
}

/** @param {number} number @param {number} minimum @param {number} maximum */
export function clamp(number, minimum, maximum) {
	return Math.min(maximum, Math.max(minimum, number));
}

/** @param {Element} source @param {string} name @param {object} detail */
export function report(source, name, detail) {
	source.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
}

/** @typedef {{ image: HTMLImageElement, frames: number, columns: number, tileWidth: number, tileHeight: number }} Bitmap */
/** @typedef {{ element: HTMLElement, x: number, y: number, z: number, age: number,
 * originX: number, originY: number, nextShot: number, health: number }} Enemy */
/** @typedef {{ x: number, y: number, z: number, vx: number, vy: number, speed: number }} Bullet */
/** @typedef {{ x: number, y: number, fire: boolean, command?: string, source: string }} Control */
/** @typedef {{ player: { x: number, y: number, health: number, immune: number },
 * camera: { x: number, y: number }, distance: number, time: number, bank: number,
 * enemies: Enemy[], shots: Bullet[], bullets: Bullet[],
 * explosions: Array<{ x: number, y: number, z: number, age: number }>,
 * stage: HTMLElement, playerElement: HTMLElement, score: number }} World */
