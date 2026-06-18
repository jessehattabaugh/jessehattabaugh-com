const template = document.createElement('template');
template.innerHTML = `
	<p class="bubble__text"></p>
	<div class="bubble__meta">
		<span class="bubble__sender"></span>
		<time class="bubble__time"></time>
	</div>
`;

/**
 * <message-bubble> — Renders a single chat message.
 * Usage: element.setData({ content, sentByMe, senderName, timestamp })
 */
export class MessageBubble extends HTMLElement {
	/** @param {{ content: string, sentByMe: boolean, senderName?: string, timestamp: string }} data */
	setData({ content, sentByMe, senderName, timestamp }) {
		this.dataset.sent = String(sentByMe);
		this.className = `bubble ${sentByMe ? 'bubble--sent' : 'bubble--received'}`;
		this.replaceChildren(template.content.cloneNode(true));

		/** @type {HTMLParagraphElement} */ (this.querySelector('.bubble__text')).textContent =
			content;

		const senderEl = /** @type {HTMLSpanElement} */ (this.querySelector('.bubble__sender'));
		if (!sentByMe && senderName) {
			senderEl.textContent = senderName;
		} else {
			senderEl.remove();
		}

		const time = /** @type {HTMLTimeElement} */ (this.querySelector('.bubble__time'));
		time.dateTime = timestamp;
		time.textContent = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
			new Date(timestamp),
		);

		// View transition name for smooth animation
		this.style.viewTransitionName = `msg-${this.dataset.msgId ?? 'new'}`;
	}
}

customElements.define('message-bubble', MessageBubble);
