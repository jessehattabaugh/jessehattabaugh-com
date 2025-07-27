export async function get(event) {
	return {
		// Context data for the template (currently empty for hello page)
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

	const {name, email, message} = body;

	return {
		name,
		email,
		message,
	};
}

