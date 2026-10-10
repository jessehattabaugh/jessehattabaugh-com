import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';
/** @typedef {{ reps: number, meals: number, fed: string, history: { id: string, reps: number, style: string, created_at: string }[], user?: {display_name: string} | null, workoutId: string, mealId: string, values: { reps: string, style: string }, error: string, notice: string }} CrunchData */

/** @param {CrunchData} data */
export function crunchFragment(data) {
	const points = data.reps - data.meals * 10;
	const fullness = data.fed ? Math.max(0, 100 - Math.floor((Date.now() - Date.parse(`${data.fed.replace(' ', 'T')}Z`)) / 3600000) * 4) : 0;
	const mood = data.reps === 0 ? 'Ready to meet you' : 'Happy to be your workout buddy';
	return html`<article aria-label="Crunch Time">
		<header><a href="${paths.apps}">← All apps</a><span>SMALL REPS. BIG FRIENDSHIP.</span><h1>Crunch Time</h1><p>A little stronger. A little happier. Together.</p></header>
		${data.error ? html`<p role="alert">${data.error}</p>` : html``}
		${data.notice ? html`<p role="status">${data.notice}</p>` : html``}
		<div data-dashboard>
			<section aria-labelledby="pet-heading" data-mood="${data.reps > 0 ? 'happy' : 'ready'}">
				<div data-pet-title><h2 id="pet-heading">Meet Mochi</h2><span>YOUR POCKET POWERHOUSE</span></div>
				<div data-pet-stage><span aria-hidden="true">✦</span><img src="/apps/crunch-time/mochi.svg" width="300" height="330" alt="Mochi, a smiling peach-colored kitten with a headband, tiny strong arms, and six-pack abs" /><span aria-hidden="true">✧</span></div>
				<p data-cheer role="status">${data.reps > 0 ? 'You showed up for me. I’m so proud of you!' : 'Hi, I’m Mochi! Let’s get stronger together.'}</p>
				<p>${mood} · Level ${1 + Math.floor(data.reps / 50)}</p>
				<label for="pet-fullness">Snack happiness</label><meter id="pet-fullness" min="0" max="100" value="${fullness}">${fullness}%</meter>
				<p>Snacks keep Mochi satisfied. Your progress never disappears when you rest.</p>
				<dl><div><dt>Lifetime situps</dt><dd>${data.reps}</dd></div><div><dt>Snack points</dt><dd>${points}</dd></div><div><dt>Meals shared</dt><dd>${data.meals}</dd></div></dl>
				${points >= 10 ? html`<form action="${paths.crunch}" method="post" data-no-enhance><input type="hidden" name="action" value="feed" /><input type="hidden" name="id" value="${data.mealId}" /><button>Feed Mochi · 10 points</button></form>` : html`<p>Save ${10 - points} more situps to feed Mochi a snack.</p>`}
			</section>
			<section aria-labelledby="workout-heading">
				<p data-eyebrow>YOUR NEXT LITTLE WIN</p><h2 id="workout-heading">Let’s do some situps.</h2><p>One situp = one snack point. Every effort counts.</p>
				<p data-storage-status role="status" hidden></p>
				<form action="${paths.crunch}" method="post" data-workout data-no-enhance>
					<input type="hidden" name="action" value="workout" /><input type="hidden" name="id" value="${data.workoutId}" />
					<label for="workout-style">Workout style</label><select id="workout-style" name="style"><option value="standard" ${data.values.style === 'standard' ? 'selected' : ''}>Standard situps</option><option value="twist" ${data.values.style === 'twist' ? 'selected' : ''}>Situps with a twist</option></select>
					<div data-motion-controls hidden>
						<p data-calibration>Train Mochi with 3 example situps before automatic counting.</p>
						<button type="button" data-calibrate>Teach Mochi my situp</button><button type="button" data-start>Start workout</button><button type="button" data-pause disabled>Pause workout</button><button type="button" data-stop disabled>Finish workout</button>
						<div data-counter><output aria-label="Situps this workout">0</output><span>SITUPS THIS WORKOUT</span></div>
						<p data-motion-status role="status">Hold your phone upright against your chest, screen facing out. Recline before starting.</p>
						<label><input type="checkbox" data-speaking checked /> Spoken counts and encouragement</label>
						<button type="button" data-listen>Enable voice commands</button><p data-voice-status role="status">Optional microphone: say “pause”, “resume”, or “finish”. Recognition may send audio to your browser’s speech service.</p>
					</div>
					<label for="workout-reps">Situps completed</label><input id="workout-reps" name="reps" type="number" min="1" max="1000" step="1" value="${data.values.reps}" required inputmode="numeric" aria-describedby="manual-help" /><p id="manual-help">Enter or correct your count, then save to earn points. Manual logging always works.</p>
					<button type="submit">Save workout &amp; earn points</button>
				</form>
			</section>
		</div>
		<section aria-labelledby="how-heading"><h2 id="how-heading">Your tiny training partner</h2><ol><li><strong>Get comfortable.</strong> Hold your phone securely against your chest in the same position each time.</li><li><strong>Teach your rhythm.</strong> Recline, hold still, then do 3 comfortable, complete situps. Calibrate standard and twisting styles separately.</li><li><strong>Move together.</strong> Mochi counts full up-and-back movements, notices changes from your examples, and cheers you on. Finish, review your count, and save.</li></ol><p>Motion cues estimate how your phone moves, not your body’s alignment. They cannot certify safe form. Stop if movement hurts.</p></section>
		<section aria-labelledby="history-heading"><h2 id="history-heading">Little wins, adding up</h2>${data.history.length ? html`<ul data-history>${data.history.map((workout) => { return html`<li><strong>${workout.reps} situps</strong><span>${workout.style === 'twist' ? 'With a twist' : 'Standard'}</span><time datetime="${workout.created_at.replace(' ', 'T')}Z">${workout.created_at.slice(0, 10)}</time></li>`; })}</ul><p>Your 20 most recent workouts.</p>` : html`<p>Your first little win belongs right here. You’ve got this!</p>`}</section>
		<details><summary>Install &amp; privacy</summary><button type="button" data-install hidden>Install Crunch Time</button><p>On iPhone, open in Safari and choose Share → Add to Home Screen. On Android, use your browser’s Install app menu.</p><p>Workouts and Mochi belong to this browser’s device cookie, separate from your site account. Use this browser at least every 30 days to keep access; clearing cookies loses access. Calibration and unfinished counts stay on this device. Raw motion samples are never uploaded. Saving and feeding require an internet connection.</p><p>Without motion or speech support, use the count field. Without JavaScript, manual logging, history, and feeding still work.</p></details>
	</article>`;
}
/** @param {CrunchData} data */
export function crunchTime(data) {
	return layout({ title: 'Crunch Time', app: 'crunch-time', user: data.user, path: paths.crunch, description: 'A situp-powered pocket pet. Teach Mochi your rhythm, track your workouts, and turn small reps into big friendship.', viewTransitions: false,
		head: html`<link rel="stylesheet" href="/apps/crunch-time/style.css" /><link rel="manifest" href="/apps/crunch-time/manifest.json" /><link rel="apple-touch-icon" href="/apps/crunch-time/icon-192.png" /><meta name="theme-color" content="#f5ead7" />`,
		body: crunchFragment(data), scripts: html`<script type="module" src="/apps/crunch-time/app.js"></script>` });
}
