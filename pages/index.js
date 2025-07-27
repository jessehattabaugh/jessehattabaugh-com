import page from '../lib/templates/page.marko';

export async function get(event) {
	const html = await page.render({
		title: 'Jesse Hattabaugh',
		content: 'Welcome to my personal website!',
	});
	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
	};
}
