import { html } from '../html.js';
import { layout } from './layout.js';
import { paths } from '../routes.js';
import { blobPath } from '../data/atproto.js';
import { freshness } from './social.js';
/** @import { Social } from '../data/atproto.js' */

/** @param {Social | undefined} social */
export function givingFragment(social) {
	return html`<article>
		<h1>Giving away</h1>
		<p>Things I'm passing along to my neighbors through <a href="https://gifthood.community">GiftHood</a>. Everything here is free. Open a listing to check availability and arrange pickup.</p>
		${social?.gifts ? social.gifts.length ? html`<ul data-gifts>${social.gifts.map((gift, index) => {return html`<li><article>
			<h2><a href="${gift.url}">${gift.title}</a></h2>
			<p><strong>${gift.status === 'pending' ? 'Pending pickup' : 'Available'}</strong>${gift.location ? html` · ${gift.location}` : html``}</p>
			${gift.images[0] ? html`<div data-photos><a href="${gift.url}" aria-label="View ${gift.title} on GiftHood"><img src="${blobPath(gift.images[0].cid)}" alt="${gift.images[0].alt}" width="640" height="480" loading="${index === 0 ? 'eager' : 'lazy'}" fetchpriority="${index === 0 ? 'high' : 'auto'}" /></a></div>` : html``}
			${gift.images.length > 1 ? html`<details><summary>More photos (${gift.images.length - 1})</summary><div data-photos>${gift.images.slice(1).map((image) => {return html`<a href="${gift.url}" aria-label="View ${gift.title} on GiftHood"><img src="${blobPath(image.cid)}" alt="${image.alt}" width="640" height="480" loading="lazy" /></a>`})}</div></details>` : html``}
			<p>${gift.description}</p>
			<p><a href="${gift.url}">View on GiftHood</a></p>
		</article></li>`})}</ul>` : html`<p>Nothing to give away right now. Check back soon.</p>` : html`<p>My listings are temporarily unavailable. Please check <a href="https://gifthood.community">GiftHood</a> for current offers.</p>`}
		${freshness(social)}
	</article>`;
}

/** @param {Social} [social] */
export function giving(social) { return layout({ title: 'Giving away', path: paths.giving, description: 'Free things Jesse Hattabaugh is giving away through GiftHood.', viewTransitions: false, social, body: givingFragment(social) }); }
