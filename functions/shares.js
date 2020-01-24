const fetch = require('node-fetch');
exports.handler = handleShares;

async function handleShares(event, context, callback) {
	console.debug(`shares.js`);
	const res = await fetch('https://catfact.ninja/breeds?limit=10');
	const { data } = await res.json();
	return {
		statusCode: 200,
		body: JSON.stringify(data),
	};
}
