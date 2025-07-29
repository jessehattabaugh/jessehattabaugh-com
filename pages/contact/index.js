import { html } from '../../lib/html.js';

/**
 * Contact page GET handler - shows contact form and information
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<div class="contact-page">
		<h2>Get In Touch</h2>
		<p>I'd love to hear from you! Whether you have a project idea, want to collaborate, or just want to say hello, feel free to reach out.</p>

		<div class="contact-content">
			<div class="contact-form-section">
				<h3>Send me a message</h3>
				<form method="post" action="/contact" class="contact-form">
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
			</div>

			<div class="contact-info">
				<h3>Other Ways to Connect</h3>
				<div class="contact-methods">
					<div class="contact-method">
						<h4>📧 Email</h4>
						<p><a href="mailto:jesse@jessehattabaugh.com">jesse@jessehattabaugh.com</a></p>
					</div>
					
					<div class="contact-method">
						<h4>💼 Professional</h4>
						<p><a href="https://linkedin.com/in/jessehattabaugh" target="_blank" rel="noopener">LinkedIn</a></p>
					</div>
					
					<div class="contact-method">
						<h4>💻 Code</h4>
						<p><a href="https://github.com/jessehattabaugh" target="_blank" rel="noopener">GitHub</a></p>
					</div>
					
					<div class="contact-method">
						<h4>🐦 Social</h4>
						<p><a href="https://twitter.com/jessehattabaugh" target="_blank" rel="noopener">Twitter</a></p>
					</div>
				</div>
				
				<div class="response-time">
					<p><strong>Response Time:</strong> I typically respond to messages within 24-48 hours during business days.</p>
				</div>
			</div>
		</div>
	</div>`;
}

/**
 * Contact page POST handler - processes form submission
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
			body: html`<div class="contact-error">
				<h2>Please Fill All Fields</h2>
				<p>All fields are required to send a message.</p>
				<a href="/contact" class="secondary-btn">Try Again</a>
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
		body: html`<div class="contact-success">
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
				<a href="/contact" class="secondary-btn">Send Another Message</a>
				<a href="/" class="primary-btn">Return to Home</a>
			</div>
		</div>`,
	};
}
