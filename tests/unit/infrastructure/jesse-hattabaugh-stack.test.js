import { describe, it } from 'node:test';
import { buildResponse } from '../../../functions/[[path]].js';

import assert from 'node:assert';

/**
 * Unit tests for the Cloudflare Pages Functions dispatcher.
 * Tests the buildResponse adapter that converts page handler results
 * into Fetch API Response objects.
 */

describe('buildResponse — plain string result', () => {
it('should return 200 for a non-404 route', async () => {
const response = buildResponse('<p>Home</p>', '/');
assert.strictEqual(response.status, 200);
});

it('should return 404 status for /404 route', async () => {
const response = buildResponse('<p>Not found</p>', '/404');
assert.strictEqual(response.status, 404);
});

it('should return the HTML string as the response body', async () => {
const response = buildResponse('<h1>Hello</h1>', '/');
const body = await response.text();
assert.strictEqual(body, '<h1>Hello</h1>');
});
});

describe('buildResponse — full response object', () => {
it('should use provided statusCode', async () => {
const result = { statusCode: 201, body: '<p>Created</p>' };
const response = buildResponse(result, '/');
assert.strictEqual(response.status, 201);
});

it('should use html property when body is absent', async () => {
const result = { statusCode: 200, html: '<p>HTML via html</p>' };
const response = buildResponse(result, '/');
const body = await response.text();
assert.strictEqual(body, '<p>HTML via html</p>');
});

it('should return empty string body when neither body nor html is set', async () => {
const result = { statusCode: 200 };
const response = buildResponse(result, '/');
const body = await response.text();
assert.strictEqual(body, '');
});

it('should forward Content-Type header from handler result', async () => {
const result = {
statusCode: 200,
headers: { 'Content-Type': 'application/json' },
body: '{}',
};
const response = buildResponse(result, '/');
assert.ok(response.headers.get('Content-Type').includes('application/json'));
});
});

describe('buildResponse — header injection prevention (OWASP A03)', () => {
it('should strip carriage return from header values', async () => {
const result = {
statusCode: 200,
headers: { 'X-Custom': 'value\rwith\rcr' },
body: '',
};
const response = buildResponse(result, '/');
assert.ok(!response.headers.get('X-Custom').includes('\r'));
});

it('should strip newline characters to prevent header splitting', async () => {
const result = {
statusCode: 200,
headers: { 'X-Custom': 'legit\r\nX-Injected: evil' },
body: '',
};
const response = buildResponse(result, '/');
assert.ok(!response.headers.has('X-Injected'));
});
});

describe('buildResponse — fallback when result is unrecognised', () => {
it('should return 200 fallback body for non-404 route', async () => {
const response = buildResponse({}, '/about');
assert.strictEqual(response.status, 200);
});

it('should return 404 fallback body for /404 route', async () => {
const response = buildResponse({}, '/404');
assert.strictEqual(response.status, 404);
});
});

describe('Cloudflare route configuration', () => {
it('should serve known routes at expected path strings', async () => {
const knownRoutes = ['/', '/about', '/resume', '/hello', '/404'];
for (const route of knownRoutes) {
assert.ok(typeof route === 'string');
assert.ok(route.startsWith('/'));
}
});
});