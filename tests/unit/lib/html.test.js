import { describe, it } from 'node:test';
import { html, raw } from '../../../lib/html.js';

import assert from 'node:assert';

/**
 * Unit tests for the HTML template literal function
 */
describe('html template function', () => {
	it('should create a complete HTML document with basic content', () => {
		const result = html`<h1>Hello World</h1>`;

		assert.ok(result.includes('<!DOCTYPE html>'));
		assert.ok(result.includes('<html lang="en">'));
		assert.match(result, /<title>.*<\/title>/);
		assert.ok(result.includes('<h1>Hello World</h1>'));
		assert.ok(result.includes('<nav>'));
		assert.ok(result.includes('<footer>'));
	});

	it('should escape HTML characters in template values', () => {
		const userInput = '<script>alert("xss")</script>';
		const result = html`<p>${userInput}</p>`;

		assert.ok(result.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
		assert.ok(!result.includes('<script>alert("xss")</script>'));
	});

	it('should escape ampersands correctly', () => {
		const userInput = 'Tom & Jerry';
		const result = html`<p>${userInput}</p>`;

		assert.ok(result.includes('Tom &amp; Jerry'));
	});

	it('should escape quotes correctly', () => {
		const userInput = 'She said "Hello" and he said \'Hi\'';
		const result = html`<p>${userInput}</p>`;

		assert.ok(result.includes('She said &quot;Hello&quot; and he said &#39;Hi&#39;'));
	});

	it('should handle multiple template values', () => {
		const name = 'John <script>';
		const message = 'Hello & goodbye';
		const result = html`<h1>${name}</h1>
			<p>${message}</p>`;

		assert.ok(result.includes('John &lt;script&gt;'));
		assert.ok(result.includes('Hello &amp; goodbye'));
	});

	it('should convert non-string values to strings before escaping', () => {
		const number = 42;
		const boolean = true;
		const undefinedValue = undefined;

		const result = html`<p>${number} ${boolean} ${undefinedValue}</p>`;

		assert.ok(result.includes('42 true undefined'));
	});

	it('should include navigation links', () => {
		const result = html`<p>Test content</p>`;

		assert.ok(result.includes('<a href="/">Home</a>'));
		assert.ok(result.includes('<a href="/contact">Contact</a>'));
		assert.ok(result.includes('<a href="/about">About</a>'));
	});

	it('should include CSS link', () => {
		const result = html`<p>Test content</p>`;

		assert.ok(result.includes('<link rel="stylesheet" href="/static/styles/all.css">'));
	});

	it('should include copyright footer', () => {
		const result = html`<p>Test content</p>`;

		const currentYear = new Date().getFullYear();
		assert.ok(result.includes(`&copy; ${currentYear} Jesse Hattabaugh`));
	});

	it('should handle empty template', () => {
		const result = html``;

		assert.ok(result.includes('<!DOCTYPE html>'));
		assert.ok(result.includes('<main>'));
		assert.ok(result.includes('</main>'));
	});
});

describe('raw function', () => {
	it('should mark HTML as trusted and not escape it', () => {
		const trustedHtml = '<strong>Bold text</strong>';
		const rawValue = raw(trustedHtml);
		const result = html`<p>${rawValue}</p>`;

		assert.ok(result.includes('<strong>Bold text</strong>'));
		assert.ok(!result.includes('&lt;strong&gt;'));
	});

	it('should convert non-string values to strings', () => {
		const number = 123;
		const rawValue = raw(number);
		const result = html`<p>${rawValue}</p>`;

		assert.ok(result.includes('123'));
	});

	it('should return object with __html property', () => {
		const htmlString = '<em>Italic</em>';
		const rawValue = raw(htmlString);

		assert.strictEqual(typeof rawValue, 'object');
		assert.strictEqual(rawValue.__html, htmlString);
	});

	it('should work with complex HTML structures', () => {
		const complexHtml = '<div class="card"><h2>Title</h2><p>Content</p></div>';
		const rawValue = raw(complexHtml);
		const result = html`<section>${rawValue}</section>`;

		assert.ok(result.includes('<div class="card"><h2>Title</h2><p>Content</p></div>'));
	});
});
