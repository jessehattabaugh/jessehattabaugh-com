/** Malformed input is a client error; data-layer exceptions remain server errors. */
export class RequestBodyError extends Error {
	/** @param {number} status */
	constructor(status) { super('Invalid request body'); this.status = status; }
}

/** @param {Request} request */
export async function readForm(request) {
	const type = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
	if (type !== 'application/x-www-form-urlencoded' && type !== 'multipart/form-data') { throw new RequestBodyError(415); }
	try { return await request.formData(); } catch { throw new RequestBodyError(400); }
}

/** @param {Request} request */
export async function readJson(request) {
	if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') { throw new RequestBodyError(415); }
	try { return await request.json(); } catch { throw new RequestBodyError(400); }
}
