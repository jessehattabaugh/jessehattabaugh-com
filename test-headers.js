#!/usr/bin/env node

// Test header escaping functionality
import { pageHandler } from './infrastructure/handlers.js';

console.log('🔒🧪 Testing header security...');

async function testHeaderSecurity() {
	console.log('\n1. Testing normal input:');
	const normalEvent = {
		httpMethod: 'POST',
		body: 'name=John Smith&email=john@example.com&message=Hello World!',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
	};

	process.env.PAGE_MODULE_PATH = '/home/jesse/jessehattabaugh-com/pages/hello/index.js';

	const normalResult = await pageHandler(normalEvent, {});
	console.log('Status:', normalResult.statusCode);
	console.log('X-Contact-Name:', JSON.stringify(normalResult.headers['X-Contact-Name']));
	console.log('X-Message-Status:', normalResult.headers['X-Message-Status']);

	console.log('\n2. Testing malicious input with CRLF injection:');
	const maliciousEvent = {
		httpMethod: 'POST',
		body: 'name=John%0D%0AX-Injected-Header:%20malicious&email=john@example.com&message=Hello!',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
	};

	const maliciousResult = await pageHandler(maliciousEvent, {});
	console.log('Status:', maliciousResult.statusCode);
	console.log('X-Contact-Name:', JSON.stringify(maliciousResult.headers['X-Contact-Name']));
	console.log('All headers:', Object.keys(maliciousResult.headers));

	// Check if malicious header was injected
	const hasInjectedHeader = Object.keys(maliciousResult.headers).some((h) =>
		h.includes('Injected')
	);
	console.log('Injection prevented:', hasInjectedHeader ? '❌' : '✅');

	console.log('\n3. Testing tab and other whitespace:');
	const tabEvent = {
		httpMethod: 'POST',
		body: 'name=John%09Tab%20Space&email=john@example.com&message=Hello!',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
	};

	const tabResult = await pageHandler(tabEvent, {});
	console.log('Status:', tabResult.statusCode);
	console.log('X-Contact-Name:', JSON.stringify(tabResult.headers['X-Contact-Name']));
}

testHeaderSecurity().catch(console.error);
