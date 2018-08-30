const Lab = require('lab');
const lab = (exports.lab = Lab.script());
const {describe, it, before, after} = lab;

const Code = require('code');
const expect = Code.expect;

const puppeteer = require('puppeteer');
const looksSame = require('looks-same');
const fs = require('fs-extra');

let browser;
let page;

describe('the home page', () => {
	before(async () => {
		browser = await puppeteer.launch({
			executablePath: 'chrome.exe',
			headless: true,
			//ignoreHTTPSErrors: true,
			//dumpio: true,
		});
	});

	it('looks right on mobile', async () => {
		page = await browser.newPage();
		await page.setViewport({
			width: 360,
			height: 640,
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
			isLandscape: false,
		});
		await page.goto('http://localhost:1234');
		const currPath = 'shots/home.curr.png';
		const refPath = 'shots/home.ref.png';
		const diffPath = 'shots/home.diff.png';
		await page.screenshot({
			path: currPath,
			fullPage: true,
		});
		const oldFileExists = await fs.pathExists(refPath);
		if (oldFileExists) {
			console.info("comparing to previous screenshot");
			const looksSameOpts = {
				current: currPath,
				diff: diffPath,
				highlightColor: '#ff00ff',
				ignoreAntialiasing: true,
				ignoreCaret: true,
				reference: refPath,
				//strict: true,
				tolerance: 2.3,
			};
			const eql = await new Promise((resolve) => {
				looksSame(currPath, refPath, looksSameOpts, (err, eql) => {
					if (err) console.error(err);
					resolve(eql);
				});
			});
			if (!eql) {
				console.info("creating diff image");
				await new Promise((resolve) => {
					looksSame.createDiff(looksSameOpts, (err) => {
						if (err) console.error(err);
						resolve();
					});
				});
			}
			expect(eql, 'return value of looks-same').to.be.true();
		} else {
			console.info("saving current screenshot for next time");
			await fs.move(currPath, refPath);
			expect(
				oldFileExists,
				'a previous screenshot was not found, current screenshot has been saved',
			).to.be.true();
		}
	});

	after(async () => browser.close());
});
