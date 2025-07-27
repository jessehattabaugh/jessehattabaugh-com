import page from '../../lib/templates/page.marko';

export async function get(event) {
	const html = await page.render({
		title: 'Hello Page',
		content: 'This is the Hello Page!',
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
		title: 'Hello Page - Posted!',
		content: `Thank you for your POST request! Data received: ${JSON.stringify(body)}`,
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
