import { SitupDetector, validProfile } from './motion.js';
/** @import { Profile } from './motion.js' */
/** @typedef {{continuous: boolean, interimResults: boolean, lang: string, onresult: ((event: {results: ArrayLike<ArrayLike<{transcript: string}>>}) => void) | null, onerror: (() => void) | null, onend: (() => void) | null, start(): void, abort(): void}} Recognition */
/** @typedef {Window & typeof globalThis & {webkitSpeechRecognition?: new () => Recognition, SpeechRecognition?: new () => Recognition}} SpeechWindow */

const form = /** @type {HTMLFormElement} */ (document.querySelector('[data-workout]'));
const style = /** @type {HTMLSelectElement} */ (form.elements.namedItem('style'));
const reps = /** @type {HTMLInputElement} */ (form.elements.namedItem('reps'));
const id = /** @type {HTMLInputElement} */ (form.elements.namedItem('id'));
const output = /** @type {HTMLOutputElement} */ (document.querySelector('output'));
const status = /** @type {HTMLElement} */ (document.querySelector('[data-motion-status]'));
const calibration = /** @type {HTMLElement} */ (document.querySelector('[data-calibration]'));
const speaking = /** @type {HTMLInputElement} */ (document.querySelector('[data-speaking]'));
const startButton = /** @type {HTMLButtonElement} */ (document.querySelector('[data-start]'));
const teachButton = /** @type {HTMLButtonElement} */ (document.querySelector('[data-calibrate]'));
const pauseButton = /** @type {HTMLButtonElement} */ (document.querySelector('[data-pause]'));
const stopButton = /** @type {HTMLButtonElement} */ (document.querySelector('[data-stop]'));
const listenButton = /** @type {HTMLButtonElement} */ (document.querySelector('[data-listen]'));
const voiceStatus = /** @type {HTMLElement} */ (document.querySelector('[data-voice-status]'));
const cheer = /** @type {HTMLElement} */ (document.querySelector('[data-cheer]'));
/** @type {'idle' | 'requesting' | 'calibrating' | 'working' | 'paused'} */ let state = 'idle';
/** @type {'calibrating' | 'working'} */ let resumeState = 'working';
/** @type {SitupDetector | null} */ let detector = null;
/** @type {Profile | null} */ let profile = null;
/** @type {Recognition | null} */ let recognition = null;
/** @type {WakeLockSentinel | null} */ let wake = null;
let count = 0, generation = 0, lastSample = 0, lastCue = '', lastSpoken = 0;
const DRAFT = 'crunch-time-draft-v1';

/** @param {string} key @returns {unknown} */
function read(key) { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
/** @param {string} key @param {unknown} value */
function store(key, value) {
	try { localStorage.setItem(key, JSON.stringify(value)); } catch {
		const warning = /** @type {HTMLElement} */ (document.querySelector('[data-storage-status]'));
		warning.hidden = false; warning.textContent = 'Device storage is unavailable. Keep this page open and save before leaving; calibration will need repeating next visit.';
	}
}
function persist() { store(DRAFT, { id: id.value, style: style.value, count }); }
function loadProfile() {
	const saved = read(`crunch-time-profile-${style.value}`);
	profile = validProfile(saved, style.value) ? saved : null;
	calibration.textContent = profile ? 'Your 3-example calibration is ready. Retrain whenever your grip or movement changes.' : 'Train Mochi with 3 example situps before automatic counting.';
}
/** @param {string} text */
function say(text) {
	if (!speaking.checked || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { return; }
	try {
		lastSpoken = performance.now();
		speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = 1.05;
		speechSynthesis.speak(utterance);
	} catch { /* Visible cues always remain available. */ }
}
/** @param {string} text */
function cue(text) {
	status.textContent = text;
	if (lastCue !== text) { lastCue = text; say(text); }
}
function controls() {
	const running = state !== 'idle';
	style.disabled = running; reps.readOnly = running;
	startButton.disabled = running; teachButton.disabled = running;
	stopButton.disabled = !running;
	pauseButton.disabled = state === 'idle' || state === 'requesting';
	pauseButton.textContent = state === 'paused' ? 'Resume workout' : 'Pause workout';
	// Avoid saving mid-rep or disabled style controls disappearing from POST.
	const submit = /** @type {HTMLButtonElement} */ (form.querySelector('[type="submit"]'));
	submit.disabled = running;
}
function end() {
	generation += 1;
	state = 'idle'; // The hoisted event handler is the same function registered by begin().
	// eslint-disable-next-line no-use-before-define
	window.removeEventListener('devicemotion', sample);
	detector = null; controls();
	if (wake) { void wake.release().catch(() => {}); wake = null; }
}
function finish() { end(); cue(count ? `Great work! ${count} situps. Review your count and save your workout.` : 'Workout finished. You can enter a manual count below.'); }
function pause() {
	if (state === 'working' || state === 'calibrating') {
		resumeState = state; state = 'paused'; detector?.reset(); controls(); cue('Paused. Recline before you resume.');
	} else if (state === 'paused') { state = resumeState; detector?.reset(); controls(); cue('Recline and hold still for 3 seconds to resume.'); }
}
/** @param {DeviceMotionEvent} event */
function sample(event) {
	const acceleration = event.accelerationIncludingGravity;
	if (!acceleration || ![acceleration.x, acceleration.y, acceleration.z].every((n) => { return typeof n === 'number' && Number.isFinite(n); })) { return; }
	lastSample = performance.now();
	if (state === 'working' || state === 'calibrating') { detector?.sample(event); }
}
/** @param {boolean} calibrating */
async function begin(calibrating) {
	if (state !== 'idle') { return; }
	if (count > 0) { cue('Save your current workout before starting a new one.'); return; }
	if (!calibrating && !profile) { cue('Teach Mochi 3 example situps first.'); return; }
	if (!('DeviceMotionEvent' in window)) { cue('Motion sensing is unavailable. Use the manual count below.'); return; }
	state = 'requesting'; controls();
	const token = ++generation;
	try {
		const api = /** @type {typeof DeviceMotionEvent & {requestPermission?: () => Promise<string>}} */ (DeviceMotionEvent);
		if (api.requestPermission && await api.requestPermission() !== 'granted') { throw new Error('Permission denied'); }
		if (token !== generation) { return; }
		// The generation check above rejects permission results from canceled starts.
		// eslint-disable-next-line require-atomic-updates
		state = calibrating ? 'calibrating' : 'working'; controls();
		lastCue = ''; lastSample = performance.now();
		detector = new SitupDetector({ style: style.value, profile, calibrating, cue, rep: () => {
			count += 1; reps.value = String(count); output.value = String(count); persist();
			const encouragement = count % 5 === 0 ? `${count}! You’re doing amazing!` : String(count);
			cheer.textContent = encouragement; say(encouragement);
			status.textContent = 'Complete repetition counted. Return fully and keep your rhythm.';
			if (count >= 1000) { finish(); }
		}, learned: (learned) => {
			store(`crunch-time-profile-${style.value}`, learned); profile = learned;
			end(); calibration.textContent = 'Your 3-example calibration is ready. Start a workout when you’re ready.';
			cue('I learned your rhythm! These examples are practice. Start a workout to earn points.');
		} });
		window.addEventListener('devicemotion', sample);
		cue('Recline and hold still for 3 seconds.');
		if ('wakeLock' in navigator) {
			try { const lock = await navigator.wakeLock.request('screen'); if (token === generation) { wake = lock; } else { await lock.release(); } } catch { /* Manual screen settings remain available. */ }
		}
	} catch (error) { console.warn('Crunch Time motion startup failed', error); if (token === generation) { end(); cue('Motion access was denied or unavailable. Check your browser settings, or enter a manual count below.'); } }
}

// Restore a retryable, unsaved workout without granting points until the POST.
const draft = /** @type {{id?: string, style?: string, count?: number} | null} */ (read(DRAFT));
const saved = new URL(location.href).searchParams.get('saved');
if (draft?.id && draft.id === saved) { try { localStorage.removeItem(DRAFT); } catch { /* No persistent storage. */ } }
else if (draft && typeof draft.id === 'string' && /^[0-9a-f-]{36}$/i.test(draft.id) && ['standard', 'twist'].includes(draft.style ?? '') && Number.isInteger(draft.count) && Number(draft.count) > 0 && Number(draft.count) <= 1000) {
	id.value = draft.id; style.value = draft.style ?? 'standard'; count = Number(draft.count); reps.value = String(count); output.value = String(count);
	status.textContent = 'Your unfinished workout was restored. Review and save it before starting another.';
}
loadProfile();
/** @type {HTMLElement} */ (document.querySelector('[data-motion-controls]')).hidden = false;
if (!('speechSynthesis' in window)) { speaking.checked = false; speaking.disabled = true; }
controls();
style.addEventListener('change', () => { loadProfile(); if (count > 0) { persist(); } });
startButton.addEventListener('click', () => { void begin(false); });
teachButton.addEventListener('click', () => { void begin(true); });
pauseButton.addEventListener('click', pause);
stopButton.addEventListener('click', finish);
speaking.addEventListener('change', () => { if (!speaking.checked && 'speechSynthesis' in window) { speechSynthesis.cancel(); } });
reps.addEventListener('input', () => {
	const n = Number(reps.value); if (Number.isInteger(n) && n >= 0 && n <= 1000) { count = n; output.value = String(n); persist(); }
});
form.addEventListener('submit', (event) => { if (state !== 'idle') { event.preventDefault(); cue('Finish your workout before saving.'); } });

const SpeechRecognitionApi = /** @type {SpeechWindow} */ (window).SpeechRecognition ?? /** @type {SpeechWindow} */ (window).webkitSpeechRecognition;
if (!SpeechRecognitionApi) { listenButton.disabled = true; voiceStatus.textContent = 'Voice recognition is unavailable in this browser. Use the workout buttons.'; }
listenButton.addEventListener('click', () => {
	if (recognition) { recognition.abort(); recognition = null; listenButton.textContent = 'Enable voice commands'; voiceStatus.textContent = 'Microphone off.'; return; }
	if (!SpeechRecognitionApi) { return; }
	try {
		const listener = new SpeechRecognitionApi(); recognition = listener;
		listener.lang = 'en-US'; listener.continuous = true; listener.interimResults = false;
		listener.onresult = (event) => {
			if (('speechSynthesis' in window && speechSynthesis.speaking) || performance.now() - lastSpoken < 1500) { return; }
			const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase().replace(/[.!?]/g, '');
			if (command === 'pause' && (state === 'working' || state === 'calibrating')) { pause(); }
			if (command === 'resume' && state === 'paused') { pause(); }
			if (command === 'finish' && state !== 'idle') { finish(); }
		};
		listener.onerror = () => { voiceStatus.textContent = 'Speech recognition failed or microphone permission was denied. Use the buttons; try enabling voice again.'; };
		listener.onend = () => { if (recognition === listener) { recognition = null; listenButton.textContent = 'Enable voice commands'; voiceStatus.textContent += ' Microphone stopped.'; } };
		listener.start(); listenButton.textContent = 'Disable voice commands'; voiceStatus.textContent = 'Listening for “pause”, “resume”, or “finish”.';
	} catch { recognition = null; voiceStatus.textContent = 'Microphone unavailable. Use the workout buttons.'; }
});
const watchdog = window.setInterval(() => {
	if ((state === 'working' || state === 'calibrating') && performance.now() - lastSample > 5000) { end(); cue('No motion data arrived. Sensors may be unavailable or blocked; use manual logging or try again.'); }
}, 1000);
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (state !== 'idle') { finish(); } recognition?.abort(); } });
window.addEventListener('pagehide', () => { end(); window.clearInterval(watchdog); recognition?.abort(); if ('speechSynthesis' in window) { speechSynthesis.cancel(); } });
if ('serviceWorker' in navigator) { void navigator.serviceWorker.register(new URL('./sw.js', import.meta.url), { scope: '/apps/crunch-time/', type: 'module' }).catch(() => {}); }
