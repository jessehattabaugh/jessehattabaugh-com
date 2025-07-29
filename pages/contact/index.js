import { html } from '../../lib/html.js';

/**
 * Contact page GET handler - shows contact form and information
 * @param {Object} event - Lambda event object
 * @returns {string} Complete HTML page
 */
export async function get() {
	return html`<article>
		<header>
			<h2>Get In Touch</h2>
			<p>I'd love to hear from you! Whether you have a project idea, want to collaborate, or just want to say hello, feel free to reach out.</p>
		</header>

		<section>
			<h3>Send me a message</h3>
			<form method="post" action="/contact">
				<fieldset>
					<label for="name">Name:</label>
					<input type="text" id="name" name="name" required />
				</fieldset>

				<fieldset>
					<label for="email">Email:</label>
					<input type="email" id="email" name="email" required />
				</fieldset>

				<fieldset>
					<label for="message">Message:</label>
					<textarea
						id="message"
						name="message"
						rows="5"
						required
						placeholder="Tell me about your project or just say hello!"
					></textarea>
				</fieldset>

				<button type="submit">Send Message</button>
			</form>
		</section>

		<aside>
			<h3>Other Ways to Connect</h3>
			<address class="h-card">
				<ul>
					<li>
						<h4>📧 Email</h4>
						<a href="mailto:jesse@jessehattabaugh.com" class="u-email">jesse@jessehattabaugh.com</a>
					</li>
					
					<li>
						<h4>💼 Professional</h4>
						<a href="https://linkedin.com/in/jessehattabaugh" target="_blank" rel="noopener" class="u-url">LinkedIn</a>
					</li>
					
					<li>
						<h4>💻 Code</h4>
						<a href="https://github.com/jessehattabaugh" target="_blank" rel="noopener" class="u-url">GitHub</a>
					</li>
					
					<li>
						<h4>🐦 Social</h4>
						<a href="https://twitter.com/jessehattabaugh" target="_blank" rel="noopener" class="u-url">Twitter</a>
					</li>
				</ul>
				
				<p><strong>Response Time:</strong> I typically respond to messages within 24-48 hours during business days.</p>
			</address>
		</aside>
	</article>`;
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
			body: html`<article>
				<h2>Please Fill All Fields</h2>
				<p>All fields are required to send a message.</p>
				<a href="/contact">Try Again</a>
			</article>`,
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
		body: html`<article>
			<h2>Message Sent!</h2>
			<p>
				Thank you for reaching out, ${name}! I've received your message and will get back to
				you soon.
			</p>

			<section>
				<h3>Your Message:</h3>
				<dl>
					<dt>Name:</dt>
					<dd>${name}</dd>
					<dt>Email:</dt>
					<dd>${email}</dd>
					<dt>Message:</dt>
					<dd>${message}</dd>
				</dl>
			</section>

			<nav>
				<a href="/contact">Send Another Message</a>
				<a href="/">Return to Home</a>
			</nav>
		</article>`,
	};
}
