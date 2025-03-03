/**
 * Audio module for handling sound effects in the Matter.js application
 */

// Audio context
let audioContext = null;

/**
 * Initialize audio context on user interaction
 */
function initAudio() {
	// Create audio context
	audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

/**
 * Plays a sound based on collision force
 * @param {number} intensity - Collision intensity (affects sound parameters)
 */
function playCollisionSound(intensity) {
	if (!audioContext) return;

	// Limit the max intensity to prevent extremely loud sounds
	intensity = Math.min(intensity, 20);

	// Create oscillator
	const oscillator = audioContext.createOscillator();
	const gainNode = audioContext.createGain();

	// Connect nodes: oscillator -> gain -> destination
	oscillator.connect(gainNode);
	gainNode.connect(audioContext.destination);

	// Set sound parameters based on collision intensity
	const baseFrequency = 200 + Math.random() * 300;
	oscillator.frequency.value = baseFrequency;
	oscillator.type = 'sine';

	// Set volume based on intensity but keep it reasonable
	const volume = Math.min(0.05 + intensity / 100, 0.2);
	gainNode.gain.value = volume;

	// Schedule the sound
	const now = audioContext.currentTime;
	oscillator.start(now);

	// Fade out
	const duration = 0.1 + intensity / 100;
	gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
	oscillator.stop(now + duration + 0.05);

	// Clean up
	setTimeout(() => {
		oscillator.disconnect();
		gainNode.disconnect();
	}, (duration + 0.1) * 1000);
}

/**
 * Plays a shattering sound effect when same-color bodies collide
 */
function playShatteringSound() {
	if (!audioContext) return;

	// Create multiple oscillators for a complex shattering effect
	const oscillatorCount = 5 + Math.floor(Math.random() * 5); // 5-9 oscillators
	const now = audioContext.currentTime;

	for (let i = 0; i < oscillatorCount; i++) {
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();

		// Connect the audio nodes
		oscillator.connect(gainNode);
		gainNode.connect(audioContext.destination);

		// Random parameters for each oscillator to create glass-like effect
		const baseFreq = 1000 + Math.random() * 2000;
		oscillator.frequency.value = baseFreq;
		oscillator.type = ['sine', 'triangle', 'sawtooth'][Math.floor(Math.random() * 3)];

		// Set volume
		const volume = 0.05 + Math.random() * 0.05;
		gainNode.gain.value = volume;

		// Randomize the start time slightly
		const startOffset = Math.random() * 0.05;
		oscillator.start(now + startOffset);

		// Quick fade out for shattering effect
		const duration = 0.1 + Math.random() * 0.2;
		gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
		oscillator.stop(now + startOffset + duration + 0.05);

		// Clean up
		setTimeout(() => {
			oscillator.disconnect();
			gainNode.disconnect();
		}, (startOffset + duration + 0.1) * 1000);
	}
}

/**
 * Checks if audio context is initialized
 * @returns {boolean} True if audio context exists
 */
function hasAudioContext() {
	return !!audioContext;
}

export { initAudio, playCollisionSound, playShatteringSound, hasAudioContext };
