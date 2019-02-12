const Lab = require('lab');
const lab = (exports.lab = Lab.script());
const {describe, it} = lab;

const Code = require('code');
const expect = Code.expect;

const puppeteer = require('puppeteer');
const looksSame = require('looks-same');
const fs = require('fs-extra');

const looksSameOpts = {
	highlightColor: '#ff00ff',
	ignoreAntialiasing: true,
	ignoreCaret: true,
	//strict: true,
	tolerance: 2.3,
};

describe('the home page', () => {
	it('looks right on mobile', async () => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setViewport({
			deviceScaleFactor: 4,
			hasTouch: true,
			height: 640,
			isLandscape: false,
			isMobile: true,
			width: 360,
		});
		await page.goto('http://localhost:1234');
		const currPath = 'shots/home.mobile.curr.png';
		const refPath = 'shots/home.mobile.ref.png';
		const diffPath = 'shots/home.mobile.diff.png';
		await page.screenshot({
			path: currPath,
			fullPage: true,
		});
		const oldFileExists = await fs.pathExists(refPath);
		if (oldFileExists) {
			console.info('comparing to previous screenshot');

			const eql = await new Promise((resolve) => {
				looksSame(currPath, refPath, looksSameOpts, (err, {equal}) => {
					if (err) console.error(err);
					resolve(equal);
				});
			});
			if (!eql) {
				console.info('creating diff image');
				await new Promise((resolve) => {
					looksSame.createDiff(
						Object.assign(
							{
								current: currPath,
								diff: diffPath,
								reference: refPath,
							},
							looksSameOpts,
						),
						(err) => {
							if (err) console.error(err);
							resolve();
						},
					);
				});
			}
			expect(eql, 'return value of looks-same').to.be.true();
		} else {
			console.info('saving current screenshot for next time');
			await fs.move(currPath, refPath);
			expect(
				oldFileExists,
				'a previous screenshot was not found, current screenshot has been saved',
			).to.be.true();
		}
	});

	it('looks right on desktop', async () => {
		const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setViewport({
			deviceScaleFactor: 3,
			hasTouch: false,
			height: 768,
			isLandscape: true,
			isMobile: false,
			width: 1366,
		});
		await page.goto('http://localhost:1234');
		const currPath = 'shots/home.desktop.curr.png';
		const refPath = 'shots/home.desktop.ref.png';
		const diffPath = 'shots/home.desktop.diff.png';
		await page.screenshot({
			path: currPath,
			fullPage: true,
		});
		const oldFileExists = await fs.pathExists(refPath);
		if (oldFileExists) {
			console.info('comparing to previous screenshot');

			const eql = await new Promise((resolve) => {
				looksSame(currPath, refPath, looksSameOpts, (err, {equal}) => {
					if (err) console.error(err);
					resolve(equal);
				});
			});
			if (!eql) {
				console.info('creating diff image');
				await new Promise((resolve) => {
					looksSame.createDiff(
						Object.assign(
							{
								current: currPath,
								diff: diffPath,
								reference: refPath,
							},
							looksSameOpts,
						),
						(err) => {
							if (err) console.error(err);
							resolve();
						},
					);
				});
			}
			expect(eql, 'return value of looks-same').to.be.true();
		} else {
			console.info('saving current screenshot for next time');
			await fs.move(currPath, refPath);
			expect(
				oldFileExists,
				'a previous screenshot was not found, current screenshot has been saved',
			).to.be.true();
		}
	});
});
