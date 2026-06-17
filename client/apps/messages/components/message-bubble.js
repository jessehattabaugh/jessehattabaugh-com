/**
 * <message-bubble> — Renders a single chat message.
 * Usage: element.setData({ content, sentByMe, senderName, timestamp })
 */
export class MessageBubble extends HTMLElement {
	/** @param {{ content: string, sentByMe: boolean, senderName?: string, timestamp: string }} data */
	setData({ content, sentByMe, senderName, timestamp }) {
		this.dataset.sent = String(sentByMe);
		this.className = `bubble ${sentByMe ? 'bubble--sent' : 'bubble--received'}`;

		const text = document.createElement('p');
		text.className = 'bubble__text';
		text.textContent = content;

		const meta = document.createElement('div');
		meta.className = 'bubble__meta';

		if (!sentByMe && senderName) {
			const name = document.createElement('span');
			name.className = 'bubble__sender';
			name.textContent = senderName;
			meta.append(name);
		}

		const time = document.createElement('time');
		time.className = 'bubble__time';
		time.dateTime = timestamp;
		time.textContent = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(timestamp));
		meta.append(time);

		this.replaceChildren(text, meta);

		// View transition name for smooth animation
		this.style.viewTransitionName = `msg-${this.dataset.msgId ?? 'new'}`;
	}
}

customElements.define('message-bubble', MessageBubble);
