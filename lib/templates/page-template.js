import page from '../../lib/templates/page.marko';

export async function get(event) {
	const html = await page.render({
		title: 'Page Title',
		content: 'Page content goes here.',
	});
	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
	};
}

// Optional: implement other HTTP methods as needed
export async function post(event) {
	// Handle POST requests
	let body;
	try {
		body = JSON.parse(event.body || '{}');
	} catch (err) {
		body = {};
	}

	const html = await page.render({
		title: 'Page Title - Posted!',
		content: `POST request received with data: ${JSON.stringify(body)}`,
	});

	return {
		statusCode: 200,
		headers: { 'Content-Type': 'text/html' },
		body: html.toString(),
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
