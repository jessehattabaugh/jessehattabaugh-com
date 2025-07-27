import page from '../lib/templates/page.marko';

export async function get() {
	const html = await page.render({
		title: 'About Jesse',
		content: 'This is the about page where you can learn more about Jesse Hattabaugh.',
	});
	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
	};
}

// Optional: implement other HTTP methods as needed
// Remove unused POST, PUT, and DELETE handlers for cleaner code.
