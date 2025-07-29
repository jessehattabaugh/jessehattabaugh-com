import { html } from '../../lib/html.js';

/**
 * Hello page GET handler - shows contact form
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
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
			const parameters = new URLSearchParams(body);
			formData = Object.fromEntries(parameters.entries());
		} else {
			// Handle JSON data
			formData = JSON.parse(event.body || '{}');
		}
	} catch {
		formData = {};
	}

	const { name, email, message } = formData;

	// Validate required fields
	if (!name || !email || !message) {
		return {
			statusCode: 400,
			headers: {
				'Content-Type': 'text/html',
				'X-Form-Error': 'Missing required fields',
			},
			body: html`<div class="hello-error">
				<h2>Please Fill All Fields</h2>
				<p>All fields are required to send a message.</p>
				<a href="/hello" class="secondary-btn">Try Again</a>
			</div>`,
		};
	}

	// Simulate sending the message (e.g., save to database, send email, etc.)
	return {
		statusCode: 200,
		headers: {
			'Content-Type': 'text/html',
			'X-Message-Status': 'sent',
			'Cache-Control': 'no-cache',
		},
		body: html`<div class="hello-success">
			<h2>Message Sent!</h2>
			<p>
				Thank you for reaching out, ${name}! I've received your message and will get back to
				you soon.
			</p>

			<div class="message-summary">
				<h3>Your Message:</h3>
				<div class="submitted-data">
					<p><strong>Name:</strong> ${name}</p>
					<p><strong>Email:</strong> ${email}</p>
					<p><strong>Message:</strong><br />${message}</p>
				</div>
			</div>

			<div class="next-steps">
				<a href="/hello" class="secondary-btn">Send Another Message</a>
				<a href="/" class="primary-btn">Return to Home</a>
			</div>
		</div>`,
	};
}
