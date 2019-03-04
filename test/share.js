const Lab = require('lab');
const lab = (exports.lab = Lab.script());
const {describe, it} = lab;

const Code = require('code');
const expect = Code.expect;

const lgtm = require('../lgtm');

const url = 'http://localhost:1234/share';

describe('the share page', () => {
	it('looks good on mobile', async () => {
		const looksGood = await lgtm('share', url, 'mobile');
		expect(looksGood, 'share looks wrong on mobile').to.be.true();
	});

	it('looks good on desktop', async () => {
		const looksGood = await lgtm('share', url, 'desktop');
		expect(looksGood, 'share looks wrong on desktop').to.be.true();
	});
});
