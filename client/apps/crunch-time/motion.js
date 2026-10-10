/** Chest-mounted portrait phone detector. Gravity supplies tilt independent of
 * screen orientation; the gyroscope's phone-Y rotation estimates torso twist.
 * This is a personal motion heuristic, not a biomechanical form assessment.
 * @typedef {[number, number, number]} Vector
 * @typedef {{range: number, duration: number, twist: number, shape: number[]}} Example
 * @typedef {{version: 1, style: string, examples: Example[]}} Profile
 */
/** @param {number[]} values */
const mean = (values) => { return values.reduce((sum, n) => { return sum + n; }, 0) / values.length; };
/** @param {number[]} samples */
function signature(samples) {
	const maximum = Math.max(...samples, 1);
	return Array.from({ length: 16 }, (_, index) => {
		return samples[Math.round(index * (samples.length - 1) / 15)] / maximum;
	});
}
/** @param {unknown} value @param {string} style @returns {value is Profile} */
export function validProfile(value, style) {
	if (!value || typeof value !== 'object') { return false; }
	const p = /** @type {Profile} */ (value);
	return p.version === 1 && p.style === style && Array.isArray(p.examples) && p.examples.length === 3 && p.examples.every((e) => {
		return Number.isFinite(e.range) && e.range >= 35 && e.range <= 170 && Number.isFinite(e.duration) && e.duration >= 800 && e.duration <= 10000 && Number.isFinite(e.twist) && e.twist >= 0 && e.twist < 720 && e.shape?.length === 16 && e.shape.every((n) => { return Number.isFinite(n) && n >= 0 && n <= 1; });
	});
}

export class SitupDetector {
	/** @param {{style: string, profile: Profile | null, calibrating: boolean, cue: (message: string) => void, rep: () => void, learned: (profile: Profile) => void}} options */
	constructor(options) {
		this.options = options;
		/** @type {Vector | null} */ this.gravity = null;
		/** @type {Vector | null} */ this.rest = null;
		/** @type {number[]} */ this.angles = [];
		/** @type {Example[]} */ this.examples = [];
		this.settling = 0; this.last = 0; this.started = 0; this.peak = 0; this.twist = 0; this.gyroSeen = false; this.cooldown = 0;
	}
	reset() {
		this.gravity = null; this.rest = null; this.settling = 0; this.last = 0;
		this.clearCycle();
	}
	clearCycle() { this.started = 0; this.peak = 0; this.twist = 0; this.angles = []; this.gyroSeen = false; }
	/** @param {DeviceMotionEvent} event */
	sample(event) {
		const raw = event.accelerationIncludingGravity;
		if (!raw || ![raw.x, raw.y, raw.z].every((n) => { return typeof n === 'number' && Number.isFinite(n); })) { return; }
		const now = performance.now();
		const dt = Math.min((now - (this.last || now)) / 1000, .1);
		if (this.last && now - this.last > 500) { this.reset(); this.options.cue('Sensor interrupted. Recline and hold still to reset.'); }
		this.last = now;
		const vector = /** @type {Vector} */ ([raw.x, raw.y, raw.z]);
		const magnitude = Math.hypot(...vector);
		if (magnitude < 6 || magnitude > 15) { this.clearCycle(); return; }
		// Time-based low-pass filtering suppresses acceleration spikes without
		// treating differing browser sensor delivery rates as differing rhythms.
		const weight = 1 - Math.exp(-Math.max(dt, .01) / .15);
		const previous = this.gravity;
		this.gravity = previous ? /** @type {Vector} */ (vector.map((n, i) => { return previous[i] + weight * (n - previous[i]); })) : vector;
		if (!this.rest) {
			if (!this.settling) { this.settling = now; this.options.cue('Recline and hold still for 3 seconds.'); }
			const speed = Math.hypot(event.rotationRate?.alpha ?? 0, event.rotationRate?.beta ?? 0, event.rotationRate?.gamma ?? 0);
			const gravityChange = previous ? Math.hypot(...this.gravity.map((n, i) => { return n - previous[i]; })) / Math.max(dt, .01) : 0;
			if (speed > 8 || gravityChange > 1 || Math.abs(magnitude - 9.81) > 1.2) { this.settling = now; return; }
			if (now - this.settling >= 3000) {
				this.rest = /** @type {Vector} */ ([...this.gravity]);
				this.options.cue(this.options.calibrating ? 'Ready! Do 3 complete situps, returning to this reclined position each time.' : 'Ready! Sit up and return to your starting position.');
			}
			return;
		}
		if (now < this.cooldown) { return; }
		const { rest } = this;
		const dot = this.gravity.reduce((sum, n, i) => { return sum + n * rest[i]; }, 0);
		const angle = Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...this.gravity) * Math.hypot(...this.rest))))) * 180 / Math.PI;
		if (!this.started && angle > 15) { this.started = now; }
		if (!this.started) { return; }
		if (now - this.started > 10000) { this.clearCycle(); this.options.cue('Return to your reclined starting position. That movement was not counted.'); return; }
		this.angles.push(angle); this.peak = Math.max(this.peak, angle);
		if (typeof event.rotationRate?.gamma === 'number' && Number.isFinite(event.rotationRate.gamma)) {
			this.gyroSeen = true;
			// Integrate only the upward half, avoiding cancelation on the return.
			if (angle >= this.peak - 8) { this.twist += Math.abs(event.rotationRate.gamma) * dt; }
		}
		if (angle > 12 || this.angles.length < 4) { return; }
		const example = { range: this.peak, duration: now - this.started, twist: this.twist, shape: signature(this.angles) };
		const { gyroSeen } = this;
		this.clearCycle(); this.cooldown = now + 400;
		if (example.range < 25) { return; } // Small handling movements are ignored.
		if (example.duration < 800) { this.options.cue('That movement was too quick to recognize. Try a controlled repetition.'); return; }
		if (this.options.calibrating) {
			if (example.range < 35) { this.options.cue('That example had very little range. Return fully and try again.'); return; }
			if (this.options.style === 'twist' && (!gyroSeen || example.twist < 12)) { this.options.cue('I could not detect a twist. Keep the phone upright and try again, or choose standard situps.'); return; }
			const ranges = this.examples.map((e) => { return e.range; });
			if (ranges.length && Math.abs(example.range - mean(ranges)) > 25) { this.examples = []; this.options.cue('Examples differed too much. Let’s start the 3 examples again.'); return; }
			this.examples.push(example);
			this.options.cue(`Example ${this.examples.length} of 3 learned. Nice work!`);
			if (this.examples.length === 3) { this.options.learned({ version: 1, style: this.options.style, examples: this.examples }); }
			return;
		}
		const examples = this.options.profile?.examples;
		if (!examples) { return; }
		if (example.range < mean(examples.map((e) => { return e.range; })) * .75) { this.options.cue('Less range than your examples. This rep was not counted.'); return; }
		if (this.options.style === 'twist' && (!gyroSeen || example.twist < mean(examples.map((e) => { return e.twist; })) * .55)) { this.options.cue('Less twist than your examples. This rep was not counted.'); return; }
		const expected = mean(examples.map((e) => { return e.duration; }));
		const shapeError = Math.min(...examples.map((e) => { return mean(e.shape.map((n, i) => { return Math.abs(n - example.shape[i]); })); }));
		if (example.duration < expected * .45 || example.duration > expected * 2.5 || shapeError > .3 || example.range > mean(examples.map((e) => { return e.range; })) * 1.4) { this.options.cue('That movement differed from your examples. Not counted; recalibrate if your style has changed.'); return; }
		this.options.rep();
	}
}
