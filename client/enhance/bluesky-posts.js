/**
 * @typedef {{ post: { uri: string, record: { text: string, createdAt: string }, author: { handle: string } } }} BlueskyFeedItem
 */

/**
 * @param {string} s
 * @returns {string}
 */
function escapeHtml(s) {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

class BlueskyPosts extends HTMLElement {
	async connectedCallback() {
		const actor = this.getAttribute('actor') ?? 'jessehattabaugh.com';
		const limit = this.getAttribute('limit') ?? '5';

		try {
			const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed');
			url.searchParams.set('actor', actor);
			url.searchParams.set('limit', limit);
			url.searchParams.set('filter', 'posts_no_replies');

			const res = await fetch(url);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			/** @type {{ feed: BlueskyFeedItem[] }} */
			const { feed } = await res.json();
			if (!feed?.length) return;

			this.innerHTML = renderFeed(feed);
		} catch {
			// Leave fallback content in place
		}
	}
}

/**
 * @param {BlueskyFeedItem[]} feed
 * @returns {string}
 */
function renderFeed(feed) {
	const items = feed.map(({ post }) => {
		const rkey = post.uri.split('/').at(-1) ?? '';
		const href = `https://bsky.app/profile/${encodeURIComponent(post.author.handle)}/post/${rkey}`;
		const date = new Date(post.record.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
		const lines = post.record.text.split('\n').map(escapeHtml).join('<br>');
		return `<li><article><p>${lines}</p><footer><a href="${escapeHtml(href)}" rel="noopener noreferrer"><time datetime="${escapeHtml(post.record.createdAt)}">${date}</time></a></footer></article></li>`;
	});
	return `<ul>${items.join('')}</ul>`;
}

customElements.define('bluesky-posts', BlueskyPosts);
