import page from '../../lib/templates/page.marko';

export async function get(event) {
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
export async function post(event) {
	return {
		statusCode: 405,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ error: 'POST method not implemented for this page' }),
	};
}

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
