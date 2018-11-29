const Lab = require('lab');
const lab = (exports.lab = Lab.script());
const {describe, it} = lab;
const Code = require('code');
const expect = Code.expect;
const httpMocks = require('node-mocks-http');
const events = require('events');

// this loads the secrets from now-secrets.json into process.env
require('now-env');

// this is the module we're testing
const share = require('../save');

describe('post-handler', () => {
	it('handles a post request from the share.html form', async () => {
		const TEST_TITLE = 'foo';
		const TEST_URL = 'https://bar.com';
		const TEST_TEXT = 'baz';
		const mockReq = httpMocks.createRequest({
			method: 'POST',
			url: `test.com/index.html?title=${TEST_TITLE}&url=${TEST_URL}&text=${TEST_TEXT}`,
		});
		const mockRes = httpMocks.createResponse();
		const finalRes = await share(mockReq, mockRes);
		const {title, url, text} = JSON.parse(finalRes._getData());
		expect(title).equals(TEST_TITLE);
		expect(url).equals(TEST_URL);
		expect(text).equals(TEST_TEXT);
	});
});
