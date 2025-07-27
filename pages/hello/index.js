import page from '../../lib/templates/page.marko';

export async function get(event) {
	const html = await page.render({
		title: 'Hello Page',
		content: `
			<div class="hello-content">
				<section class="greeting">
					<h2>Hello there! 👋</h2>
					<p>Thanks for stopping by my hello page!</p>
				</section>

				<section class="contact-form">
					<h3>Send me a message</h3>
					<form method="post" action="/hello">
						<div class="form-group">
							<label for="name">Your Name:</label>
							<input type="text" id="name" name="name" required/>
						</div>
						<div class="form-group">
							<label for="email">Your Email:</label>
							<input type="email" id="email" name="email" required/>
						</div>
						<div class="form-group">
							<label for="message">Message:</label>
							<textarea id="message" name="message" rows="4" required></textarea>
						</div>
						<button type="submit">Send Message</button>
					</form>
				</section>

				<section class="social-links">
					<h3>Connect with me</h3>
					<p>Find me on various platforms:</p>
					<div class="social-list">
						<a href="#" class="social-link">GitHub</a>
						<a href="#" class="social-link">LinkedIn</a>
						<a href="#" class="social-link">Twitter</a>
					</div>
				</section>
			</div>
		`,
	});
	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
	};
}

export async function post(event) {
	// Example POST handler
	let body;
	try {
		body = JSON.parse(event.body || '{}');
	} catch {
		body = {};
	}

	const html = await page.render({
		title: 'Hello Page - Message Sent!',
		content: `
			<div class="hello-response">
				<section class="thank-you">
					<h2>Message Received! 🎉</h2>
					<p>Thank you for reaching out! I appreciate your message.</p>
				</section>

				<section class="message-details">
					<h3>What you sent:</h3>
					<div class="message-preview">
						<p><strong>Name:</strong> ${body.name || 'Not provided'}</p>
						<p><strong>Email:</strong> ${body.email || 'Not provided'}</p>
						<p><strong>Message:</strong></p>
						<blockquote>${body.message || 'No message content'}</blockquote>
					</div>
				</section>

				<section class="next-steps">
					<h3>What's next?</h3>
					<p>I'll review your message and get back to you as soon as possible.</p>
					<a href="/hello" class="cta-button">Send Another Message</a>
					<a href="/" class="cta-button secondary">Back to Home</a>
				</section>
			</div>
		`,
	});

	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
	};
}

// Optional: implement other HTTP methods as needed
export async function put(event) {
	return {
		statusCode: 405,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ error: 'PUT method not implemented for this page' }),
	};
}

export async function del(event) {
	return {
		statusCode: 405,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ error: 'DELETE method not implemented for this page' }),
	};
}
