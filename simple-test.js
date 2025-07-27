import { pageHandler } from './infrastructure/handlers.js';

console.log('Testing handler with home page...');

const event = {
	httpMethod: 'GET',
	body: null,
};

process.env.PAGE_MODULE_PATH = '/home/jesse/jessehattabaugh-com/pages/index.js';

try {
	const result = await pageHandler(event, {});
	console.log('Status:', result.statusCode);
	console.log('Content-Type:', result.headers?.['Content-Type']);
	console.log('Body length:', result.body?.length);
	console.log('Has title:', result.body?.includes('<title>'));
	console.log('First 200 chars:', result.body?.slice(0, 200));
} catch (error) {
	console.error('Error:', error);
}
