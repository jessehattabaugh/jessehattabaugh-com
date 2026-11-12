import { codeExample } from '../code-example.js';
import { html } from '../../html.js';
import { layout } from '../layout.js';
import { actorSprite } from './social.js';

const expressions = ['neutral', 'blink', 'happy', 'sad', 'angry', 'silly', 'tired', 'bruh', 'pout'];
const directions = ['down', 'left', 'right', 'up'];
/** @param {string} name @param {string[]} values @param {string} selected */
function select(name, values, selected) {
	return html`<label for="actor-${name.toLowerCase()}">${name}</label><select id="actor-${name.toLowerCase()}" name="${name.toLowerCase()}">${values.map((value) => { return html`<option value="${value}" ${selected === value ? html`selected` : html``}>${value}</option>`; })}</select>`;
}
/** @param {import('../../data/atproto.js').Social} [social] @param {URLSearchParams} [query] */
export function rpgActorFragment(social, query = new URLSearchParams()) {
	const direction = query.get('direction') ?? 'down', expression = query.get('expression') ?? 'neutral';
	const state = {
		direction: directions.includes(direction) ? direction : 'down',
		expression: expressions.includes(expression) ? expression : 'neutral',
		animation: query.get('animation') === 'idle' ? 'idle' : 'walk',
		talking: query.has('talking'), paused: query.has('paused'),
		showcase: !['animation', 'direction', 'expression', 'talking', 'paused'].some((name) => { return query.has(name); }),
	};
	const hasEmotes = Object.keys(social?.actor?.sprite?.emotes ?? {}).length > 0;
	return html`<article data-components>
			<p><a href="/components/">Components</a> / rpg-actor</p>
			<h1>rpg-actor</h1>
			<p>Give your website a little character.</p>
			<p>A pixel-sized companion for the open web. Walk in four directions, wear nine expressions, and talk with your whole face. All through HTML attributes.</p>
			<p>Web Component · Zero dependencies · MIT · 1.0.0</p>
			<section aria-label="Sprite playground">
				<div>${actorSprite(social, state)}</div>
				<form action="/components/rpg-actor/" method="get" aria-label="Sprite controls">
					${select('Animation', ['idle', 'walk'], state.animation)}
					${select('Direction', directions, state.direction)}
					${select('Expression', expressions, state.expression)}
					<label><input type="checkbox" name="talking" ${state.talking ? html`checked` : html``} /> Talking</label>
					<label><input type="checkbox" name="paused" ${state.paused ? html`checked` : html``} /> Paused</label>
					<button type="submit" class="btn">Apply sprite state</button>
					<a href="/components/rpg-actor/">Play the showcase</a>
				</form>
			</section>
			<p role="status" aria-label="Sprite state">${state.animation} · ${state.direction} · ${state.expression}${state.talking ? ' · talking' : ''}${state.paused ? ' · paused' : ''}</p>
			${hasEmotes ? html`<p>This actor has published expression sheets. Try an expression with Talking enabled.</p>` : html`<p>This actor has not published emote sheets yet. Expressions gracefully use the original sprite. The owner can sign in at <a href="https://rpg.actor">rpg.actor</a> to upgrade their sprite; the site will pick up the published sheets automatically.</p>`}
			<p>The form works without JavaScript: Apply renders the selected pose on the server. JavaScript adds live playback. Your reduced-motion preference keeps the sprite still.</p>
			<nav aria-label="Component resources"><a href="./custom-elements.json">Custom Elements Manifest</a> · <a href="https://github.com/jessehattabaugh/jessehattabaugh-com/tree/main/client/components/rpg-actor">Source on GitHub</a> · <a href="./README.md">Full documentation</a></nav>
			<section><h2>A character that travels with you</h2>
				<p><a href="https://rpg.actor">rpg.actor</a> stores your character’s sprite and stats in your AT Protocol account, ready for compatible games and websites. This independent component displays those sheets; it does not change your account.</p>
				<p>The <a href="https://rpg.actor/news/getting-emotional">Getting Emotional announcement</a> adds optional expression and talking variants. No extra animation library required.</p>
			</section>
			<section><h2>Start with HTML</h2>
				<p>Copy the component directory from a reviewed GitHub commit into your site’s <code>/vendor/rpg-actor/</code> directory, keeping the license. Serve these ES modules from your own origin.</p>
				${codeExample({ caption: 'A walking character', language: 'html', label: 'HTML example', source: `<script type="module" src="/vendor/rpg-actor/index.js"></script>
<rpg-actor src="/sprites/me.png" animation="walk"
	direction="down" expression="happy" label="My character">
	<img src="/sprites/me-portrait.png" alt="My character" width="144" height="144">
</rpg-actor>` })}
				<p>The child image is your no-JavaScript and failed-image fallback. Use a cropped portrait or your own HTML. The enhanced sprite uses a shadow root and leaves that content intact.</p>
				${codeExample({ caption: 'Expressions, then state changes', language: 'javascript', label: 'JavaScript example', source: `const actor = document.querySelector('rpg-actor');
actor.setAttribute('emotes', JSON.stringify({
	happy: {
		emoteSheet: '/sprites/happy.png',
		talkSheet: '/sprites/happy-talking.png'
	}
}));
actor.setAttribute('expression', 'happy');
actor.setAttribute('talking', '');
actor.setAttribute('direction', 'left');
actor.setAttribute('paused', ''); // remove to resume
actor.addEventListener('actor-change', ({ detail }) => console.log(detail));` })}
			</section>
			<section><h2>The HTML interface</h2>
				<p>Always use the <a href="https://rpg.actor/dev-guide">rpg.actor developer guide</a> as the authoritative reference when integrating or updating this component. Its current sprite, emote, and API contracts take precedence over examples here.</p>
				<table><caption>Sprite attributes</caption><thead><tr><th scope="col">Attribute</th><th scope="col">Values and defaults</th></tr></thead><tbody>
					<tr><th scope="row"><code>src</code></th><td>Base sheet URL. Relative or HTTP(S). No credentials required.</td></tr>
					<tr><th scope="row"><code>emotes</code></th><td>JSON keyed by expression, with <code>emoteSheet</code> and optional <code>talkSheet</code> URLs.</td></tr>
					<tr><th scope="row"><code>expression</code></th><td>neutral (default), blink, happy, sad, angry, silly, tired, bruh, pout.</td></tr>
					<tr><th scope="row"><code>direction</code></th><td>down (default), left, right, up.</td></tr>
					<tr><th scope="row"><code>animation</code></th><td>idle (default) or walk. Walking uses the standard 0, 1, 2, 1 frame order.</td></tr>
					<tr><th scope="row"><code>talking</code></th><td>Boolean presence alternates closed and open mouth sheets.</td></tr>
					<tr><th scope="row"><code>showcase</code></th><td>Boolean presence cycles available expressions, directions, walking, idle, and talking. Each expression keeps its direction through the three poses.</td></tr>
					<tr><th scope="row"><code>showcase-duration</code></th><td>Milliseconds per pose, default 2400; 150–60000, rounded up to the next frame. Invalid values use 2400; values below 150 become 150. For example: <code>showcase showcase-duration="3000"</code>.</td></tr>
					<tr><th scope="row"><code>paused</code></th><td>Boolean presence freezes playback. The built-in pause button reflects this attribute.</td></tr>
					<tr><th scope="row"><code>columns</code>, <code>rows</code></th><td>Base grid, default 3 × 4; 1–16. Emotes always use 3 × 4.</td></tr>
					<tr><th scope="row"><code>interval</code></th><td>Milliseconds per frame, default 150; clamped to a minimum of 50, maximum accepted value 2000.</td></tr>
					<tr><th scope="row"><code>frame</code></th><td>Optional zero-based column override. Remove for automatic playback.</td></tr>
					<tr><th scope="row"><code>label</code></th><td>Accessible image name, default “RPG character”.</td></tr>
				</tbody></table>
				<p>Boolean attributes use presence: <code>paused="false"</code> still pauses. Unknown enum values use defaults. Invalid numbers use defaults; zero dimensions become one. Remove <code>showcase</code> before taking manual control.</p>
			</section>
			<section><h2>Events, styling, and limits</h2>
				<p><code>actor-change</code> reports <code>{ animation, direction, expression, talking, paused }</code> after attribute changes and showcase steps. <code>actor-load</code> reports <code>{ src }</code> for loaded sheets; <code>actor-error</code> reports <code>{ reason, src }</code> for malformed JSON or failed images. Events bubble, cross shadow boundaries, and are not cancelable. No incoming custom events or custom public methods.</p>
				<p>Set <code>--rpg-actor-size: 192px</code> to resize. Style <code>::part(sprite)</code> and <code>::part(controls)</code>. The default slot holds fallback HTML. Images retain crisp pixels.</p>
				<p>Missing or failed variants use the base sprite. Failed base images expose your fallback. Only visited sheets load; images are reused within each instance. Hidden documents and disconnected elements stop playback. Reduced motion disables walking, talking, and showcase progression while preserving manual pose selection.</p>
				<p>Read an actor’s <code>actor.rpg.sprite/self</code> record on your server and resolve its blob references to image URLs. This component accepts URLs, not raw blob objects, and makes no authenticated API requests. Host the sheets yourself or permit their origin in your image CSP. Permit the component’s shadow styles in your style policy. Code is MIT; sprite artwork retains its owner’s license.</p>
				<p>For npm, pnpm, or Yarn, install the vendored local directory and import <code>@jessehattabaugh/rpg-actor</code> from your browser entry. The <code>/element</code> export provides <code>RpgActor</code> for manual registration. Do not import browser classes during server rendering. See the README for commands and the <a href="https://rpg.actor/dev-guide#pc-emotes">official sprite specification</a> for record details.</p>
			</section>
		</article>`;
}

/** @param {import('../../data/atproto.js').Social} [social] @param {URLSearchParams} [query] @param {string} [origin] */
export function rpgActor(social, query = new URLSearchParams(), origin = '') {
	return layout({ title: 'rpg-actor', path: '/components/rpg-actor/', social,
		description: 'Give your website a little character. A tiny, dependency-free Web Component for rpg.actor walking sprites, expressions, and talking.',
		head: html`<meta property="og:type" content="website" /><meta property="og:title" content="rpg-actor — Give your website a little character" /><meta property="og:description" content="A portable Web Component: four directions, nine expressions, talking, and HTML attributes. Zero dependencies." /><meta property="og:image" content="${origin}/components/rpg-actor/social.png" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="rpg-actor: a little character, a whole range of emotions." />`,
		body: rpgActorFragment(social, query), scripts: html`<script type="module" src="/components/rpg-actor/docs/demo.js"></script>` });
}
