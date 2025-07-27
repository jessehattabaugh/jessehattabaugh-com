export async function get() {
	return {
		// Context data for the template (currently empty for 404 page)
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
