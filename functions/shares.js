const fetch = require('node-fetch');
exports.handler = handleShares;

const { ACCESS_TOKEN } = process.env;
const API_URL = 'https://api.netlify.com/api/v1/';

async function handleShares(event, context, callback) {
	console.debug(`🦄 shares.js`);

	try {
		const formsRes = await fetch(`${API_URL}forms?access_token=${ACCESS_TOKEN}`);
		console.debug(`🌈`, formsRes);
		const formsData = await formsRes.json();
		console.debug(`🔥`, formsData);
		const subsRes = await fetch(`${API_URL}sites/${formsData[0].site_id}/submissions?access_token=${ACCESS_TOKEN}`);
		console.debug(`😈`, subsRes);
		const subsData = await subsRes.json();
		console.debug(`🧜‍♀️`, subsData);
		return {
			statusCode: 200,
			body: JSON.stringify(subsData),
		};
	} catch(error) {
		return {
			statusCode: 500,
			body: error,
		};
	}
}
