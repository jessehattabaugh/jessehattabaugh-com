import { html } from '../../html.js';
import { paths } from '../../routes.js';
import { blobPath, object, httpsUrl } from '../../data/atproto.js';
/** @import { Social } from '../../data/atproto.js' */

/** @param {string} value */
export function date(value) { return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Los_Angeles' }); }

/** @param {Social | undefined} social */
export function profileSummary(social) {
	if (!social) { return html`<p><a href="${paths.bluesky}" rel="me">Find me on Bluesky</a></p>`; }
	return html`<aside aria-label="Bluesky profile">
		<p><a href="${social.profileUrl}" rel="me">@${social.handle}</a>${social.profile?.displayName ? html` · ${social.profile.displayName}` : html``}</p>
		${social.profile?.description ? html`<p>${social.profile.description}</p>` : html``}
		${social.profile ? html`<p>${social.profile.followers} followers · ${social.profile.following} following · ${social.profile.posts} posts</p>` : html`<p>My profile is temporarily unavailable. You can still visit me on Bluesky.</p>`}
	</aside>`;
}

/** Render UTF-8 facet offsets without ever trusting upstream HTML or URL schemes.
 * @param {string} text @param {unknown[]} facets */
function richText(text, facets) {
	const bytes = new TextEncoder().encode(text); const decoder = new TextDecoder(); let end = 0;
	const parts = [];
	for (const facet of facets.map(object).sort((a, b) => {return Number(object(a.index).byteStart) - Number(object(b.index).byteStart)})) {
		const index = object(facet.index); const start = Number(index.byteStart), stop = Number(index.byteEnd);
		if (!Number.isInteger(start) || !Number.isInteger(stop) || start < end || stop <= start || stop > bytes.length) { continue; }
		const features = Array.isArray(facet.features) ? facet.features.map(object) : [];
		const feature = features.find((item) => {return item.$type === 'app.bsky.richtext.facet#link' || item.$type === 'app.bsky.richtext.facet#mention'});
		const href = feature?.$type === 'app.bsky.richtext.facet#mention' && typeof feature.did === 'string' && /^did:[a-z]+:[a-zA-Z0-9:._%-]+$/.test(feature.did)
			? `https://bsky.app/profile/${feature.did}` : httpsUrl(feature?.uri);
		if (!href) { continue; }
		parts.push(decoder.decode(bytes.slice(end, start)), html`<a href="${href}">${decoder.decode(bytes.slice(start, stop))}</a>`); end = stop;
	}
	parts.push(decoder.decode(bytes.slice(end))); return html`${parts}`;
}

/** @param {Social | undefined} social */
export function freshness(social) {
	return social?.updatedAt ? html`<p><small>${social.stale ? 'Showing saved data from' : 'Updated'} <time datetime="${social.updatedAt}">${date(social.updatedAt)}</time>. Availability and profile details can change.</small></p>` : html``;
}

/** @param {Social | undefined} social */
export function postsFragment(social) {
	let postsMarkup;
	if (social?.posts) {
		if (social.posts.length) {
			postsMarkup = html`<ol>${social.posts.map((post) => {return html`<li><article>
				<p><a href="${post.url}"><time datetime="${post.createdAt}">${date(post.createdAt)}</time></a></p>
				<p>${richText(post.text, post.facets)}</p>
				${post.images.length ? html`<div data-photos>${post.images.map((image) => {return html`<a href="${post.url}" aria-label="View post on Bluesky"><img src="${blobPath(image.cid)}" alt="${image.alt}" width="640" height="480" loading="lazy" /></a>`})}</div>` : html``}
				${post.external.url ? html`<p><a href="${post.external.url}">${post.external.title || post.external.url}</a></p>` : html``}
				<p><a href="${post.url}">Read and reply on Bluesky</a></p>
			</article></li>`})}</ol>`;
		} else {
			postsMarkup = html`<p>No recent posts to display.</p>`;
		}
	} else {
		postsMarkup = html`<p>Posts are temporarily unavailable. <a href="${social?.profileUrl ?? paths.bluesky}">Read my posts on Bluesky</a>.</p>`;
	}
	return html`<section aria-labelledby="bluesky-heading">
		<h2 id="bluesky-heading">Latest from Bluesky</h2>
		<p><a href="${social?.profileUrl ?? paths.bluesky}" rel="me">${social ? `@${social.handle}` : 'My Bluesky profile'}</a> · Thoughts, projects, and things I notice.</p>
		${postsMarkup}
		${freshness(social)}
	</section>`;
}

const actorPackage = '/components/rpg-actor/';
const genericActor = `${actorPackage}generic.svg`;

/** @param {Social | undefined} social
 * @param {{ direction?: string, expression?: string, animation?: string, talking?: boolean, paused?: boolean, showcase?: boolean, handle?: string, label?: string }} [state] */
export function actorSprite(social, state = {}) {
	const sprite = state.handle ? null : social?.actor?.sprite;
	const emotes = Object.fromEntries(Object.entries(sprite?.emotes ?? {}).map(([name, variant]) => {
		return [name, { emoteSheet: variant.emoteSheet ? blobPath(variant.emoteSheet) : '', talkSheet: variant.talkSheet ? blobPath(variant.talkSheet) : '' }];
	}));
	const direction = state.direction ?? 'down', expression = state.expression ?? 'neutral';
	const variant = sprite?.emotes?.[expression];
	const selected = (state.talking && variant?.talkSheet) || variant?.emoteSheet;
	const columns = selected ? 3 : sprite?.columns ?? 3, rows = selected ? 4 : sprite?.rows ?? 4;
	const row = Math.max(0, Math.min(['down', 'left', 'right', 'up'].indexOf(direction), rows - 1));
	const column = Math.min(1, columns - 1);
	const label = state.label ?? 'My RPG Actor character sprite';
	const { handle } = state;
	const fallbackCid = selected || sprite?.cid;
	// The parser creates the shadow root before the module runs. The slotted
	// portrait can paint before the shadow stylesheet and works without scripting.
	return html`<rpg-actor ${handle ? html`handle="${handle}"` : html``} ${sprite ? html`src="${blobPath(sprite.cid)}" columns="${sprite.columns}" rows="${sprite.rows}" emotes="${JSON.stringify(emotes)}"` : html``} animation="${state.animation ?? 'walk'}" direction="${direction}" expression="${expression}" ${state.showcase === true ? html`showcase` : html``} ${state.talking ? html`talking` : html``} ${state.paused ? html`paused` : html``} label="${label}">
		<template shadowrootmode="open">
			<link rel="stylesheet" href="${actorPackage}styles.css">
			<slot></slot>
			<div>
				<span role="img" part="sprite" hidden></span>
				<button type="button" part="controls" hidden></button>
			</div>
		</template>
		<figure data-sprite>
			<div style="width:var(--rpg-actor-size, 144px);aspect-ratio:1;overflow:hidden;position:relative">
				<img src="${fallbackCid ? blobPath(fallbackCid) : genericActor}" alt="${label}" loading="lazy" style="position:absolute;inset:0 auto auto 0;display:block;max-width:none;width:calc(100% * ${columns});height:calc(100% * ${rows});transform:translate(${(-column * 100) / columns}%,${(-row * 100) / rows}%)" />
			</div>
			${!state.handle ? html`<figcaption>My rpg.actor sprite</figcaption>` : html``}
		</figure>
	</rpg-actor>`;
}

/** @param {Social | undefined} social */
export function actorFragment(social, showcase = false) {
	const actor = social?.actor;
	return html`<section aria-labelledby="actor-heading">
		<h2 id="actor-heading">My RPG Actor</h2>
		<p>A little roleplaying version of me. <a href="https://rpg.actor">rpg.actor</a> is a portable RPG character registry: sprites and character sheets live in your own AT Protocol account and travel between compatible games.</p>
		<div data-actor-body>
			${actorSprite(social, { showcase })}
			<div data-actor-stats>
				${actor ? actor.systems.map((system) => {return html`<h3>${system.name}</h3><dl>${system.stats.map((stat) => {return html`<div><dt>${stat.label}</dt><dd>${stat.value}</dd></div>`})}</dl>`}) : html`<p>My character is temporarily unavailable.</p>`}
			</div>
		</div>
		<p><a href="https://rpg.actor/${encodeURIComponent(social?.handle ?? '')}">View my character on RPG Actor</a></p>
	</section>`;
}
