import { html } from '../../lib/html.js';

/**
 * Hello page GET handler - shows contact form
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get(event) {
	return html`<div class="hello-page">
		<h2>Say Hello!</h2>
		<p>I'd love to hear from you. Send me a message using the form below.</p>

		<form method="post" action="/hello" class="contact-form">
			<div class="form-group">
				<label for="name">Name:</label>
				<input type="text" id="name" name="name" required />
			</div>

			<div class="form-group">
				<label for="email">Email:</label>
				<input type="email" id="email" name="email" required />
			</div>

			<div class="form-group">
				<label for="message">Message:</label>
				<textarea
					id="message"
					name="message"
					rows="5"
					required
					placeholder="Tell me about your project or just say hello!"
				></textarea>
			</div>

			<button type="submit" class="submit-btn">Send Message</button>
		</form>

		<div class="contact-info">
			<h3>Other Ways to Connect</h3>
			<p>You can also find me on various platforms or reach out directly.</p>
		</div>
	</div>`;
}

/**
 * Hello page POST handler - processes form submission
 * @param {Object} event - Lambda event object
 * @returns {Object} Response object with HTML content and custom headers
 */
// Helper function to escape HTML special characters
function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export async function post(event) {
	// Parse form data from the request body
	let formData = {};

	try {
		// Handle URL-encoded form data
		if (
			event.headers &&
			event.headers['content-type']?.includes('application/x-www-form-urlencoded')
		) {
			const body = event.body || '';
			const params = new URLSearchParams(body);
			formData = Object.fromEntries(params.entries());
		} else {
			// Handle JSON data
			formData = JSON.parse(event.body || '{}');
		}
	} catch {
		formData = {};
	}

	const { name, email, message } = formData;

	// Sanitize user input to prevent XSS
	const safeName = escapeHtml(name);
	const safeEmail = escapeHtml(email);
	const safeMessage = escapeHtml(message);

	// Simulate sending the message (e.g., save to database, send email, etc.)
	// Sanitize name, email, and message for header injection and XSS prevention
	function escapeHtml(str) {
		return String(str)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
	const safeName = typeof name === 'string' ? escapeHtml(name.replace(/[\r\n]+/g, ' ')) : '';
	const safeEmail = typeof email === 'string' ? escapeHtml(email.replace(/[\r\n]+/g, ' ')) : '';
	const safeMessage = typeof message === 'string' ? escapeHtml(message) : '';

	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'text/html',
			'X-Message-Status': 'sent',
			'X-Contact-Name': safeName,
			'Cache-Control': 'no-cache',
		},
		body: html`<div class="hello-success">
			<h2>Message Sent!</h2>
			<p>
				Thank you for reaching out, ${safeName}! I've received your message and will get back to
				you soon.
			</p>

			<div class="message-summary">
				<h3>Your Message:</h3>
				<div class="submitted-data">
					<p><strong>Name:</strong> ${safeName}</p>
					<p><strong>Email:</strong> ${safeEmail}</p>
					<p><strong>Message:</strong><br />${safeMessage}</p>
				</div>
			</div>

			<div class="next-steps">
				<a href="/hello" class="secondary-btn">Send Another Message</a>
				<a href="/" class="primary-btn">Return to Home</a>
			</div>
		</div>`,
	};
}
					<p><strong>Email:</strong> ${safeEmail}</p>
					<p><strong>Message:</strong><br />${safeMessage}</p>
				</div>
			</div>

			<div class="next-steps">
				<a href="/hello" class="secondary-btn">Send Another Message</a>
				<a href="/" class="primary-btn">Return to Home</a>
			</div>
		</div>`,
	};
}
		</div>`,
	};
}
