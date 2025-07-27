import page from '../lib/templates/page.marko';

export async function get() {
	const html = await page.render({
		title: '404 - Page Not Found',
		content: 'Sorry, the page you are looking for could not be found.',
	});
	return {
		statusCode: 404,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
	};
}

// Return 404 for all methods
export async function post() {
	return get();
}
export async function put() {
	return get();
}
export async function del() {
	return get();
}
