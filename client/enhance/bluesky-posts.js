/**
 * @typedef {{ $type: string, text: string, createdAt: string, reply?: object }} AtPostRecord
 * @typedef {{ uri: string, cid: string, value: AtPostRecord }} RepoRecord
 * @typedef {{ service?: Array<{ id: string, serviceEndpoint: string }> }} DidDocument
 */

/** @param {string} s @returns {string} */
function escapeHtml(s) {
	return s.replace(/[&<>"']/g, (c) => {
		return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c;
	});
}

/**
 * Resolves a handle or DID string to a DID.
 * For domain handles tries the well-known HTTP method first (no third-party needed).
 * @param {string} actor handle or did:*
 * @returns {Promise<string>}
 */
async function resolveDid(actor) {
	if (actor.startsWith('did:')) {
		return actor;
	}

	// Domain handles: try /.well-known/atproto-did (same-origin when handle === site domain)
	if (actor.includes('.')) {
		try {
			const res = await fetch(`https://${actor}/.well-known/atproto-did`);
			if (res.ok) {
				const did = (await res.text()).trim();
				if (did.startsWith('did:')) {
					return did;
				}
			}
		} catch {
			// fall through to XRPC resolution
		}
	}

	// AT Protocol standard identity resolution — works on any conforming relay/PDS
	const res = await fetch(
		`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`,
	);
	if (!res.ok) {
		throw new Error(`resolveHandle failed: ${res.status}`);
	}
	/** @type {{ did: string }} */
	const { did } = await res.json();
	return did;
}

/**
 * Resolves a DID to its current PDS endpoint by reading the DID document.
 * Handles both did:plc and did:web methods.
 * @param {string} did
 * @returns {Promise<string>}
 */
async function resolvePds(did) {
	/** @type {DidDocument} */
	let doc;

	if (did.startsWith('did:plc:')) {
		const res = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
		if (!res.ok) {
			throw new Error(`DID doc fetch failed: ${res.status}`);
		}
		doc = await res.json();
	} else if (did.startsWith('did:web:')) {
		const domain = did.slice('did:web:'.length);
		const res = await fetch(`https://${domain}/.well-known/did.json`);
		if (!res.ok) {
			throw new Error(`DID doc fetch failed: ${res.status}`);
		}
		doc = await res.json();
	} else {
		throw new Error(`Unsupported DID method: ${did}`);
	}

	const endpoint = doc.service?.find((s) => {
		return s.id === '#atproto_pds';
	})?.serviceEndpoint;
	if (!endpoint) {
		throw new Error('No #atproto_pds service in DID document');
	}
	return endpoint;
}

/**
 * @param {RepoRecord[]} posts
 * @param {string} did
 * @returns {string}
 */
function renderPosts(posts, did) {
	const items = posts.map(({ uri, value }) => {
		const rkey = uri.split('/').at(-1) ?? '';
		const href = `https://bsky.app/profile/${encodeURIComponent(did)}/post/${rkey}`;
		const date = new Date(value.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
		const lines = value.text.split('\n').map(escapeHtml).join('<br>');
		return `<li><article><p>${lines}</p><footer><a href="${escapeHtml(href)}" rel="noopener noreferrer"><time datetime="${escapeHtml(value.createdAt)}">${date}</time></a></footer></article></li>`;
	});
	return `<ul>${items.join('')}</ul>`;
}

class BlueskyPosts extends HTMLElement {
	async connectedCallback() {
		const actor = this.getAttribute('actor') ?? 'jessehattabaugh.com';
		const limit = Math.min(Number(this.getAttribute('limit') ?? '5'), 100);

		try {
			const did = await resolveDid(actor);
			const pds = await resolvePds(did);

			// Fetch more than needed so we can filter out replies client-side
			const url = new URL(`${pds}/xrpc/com.atproto.repo.listRecords`);
			url.searchParams.set('repo', did);
			url.searchParams.set('collection', 'app.bsky.feed.post');
			url.searchParams.set('limit', String(Math.min(limit * 3, 100)));
			url.searchParams.set('reverse', 'true');

			const res = await fetch(url);
			if (!res.ok) {
				throw new Error(`listRecords failed: ${res.status}`);
			}

			/** @type {{ records: RepoRecord[] }} */
			const { records } = await res.json();

			const posts = records.filter((r) => {
				return !r.value.reply;
			}).slice(0, limit);
			if (!posts.length) {
				return;
			}

			this.innerHTML = renderPosts(posts, did);
		} catch {
			// Leave fallback content in place
		}
	}
}

customElements.define('bluesky-posts', BlueskyPosts);
