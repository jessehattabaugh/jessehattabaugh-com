const puppeteer = require('puppeteer');
const looksSame = require('looks-same');
const fs = require('fs-extra');

module.exports = lgtm;

const looksSameOpts = {
	highlightColor: '#00ff00',
	ignoreAntialiasing: true,
	ignoreCaret: true,
	//strict: true,
	tolerance: 2.3,
};

async function lgtm(name, url, env) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	if (env == 'desktop') {
		await page.setViewport({
			deviceScaleFactor: 3,
			hasTouch: false,
			height: 768,
			isLandscape: true,
			isMobile: false,
			width: 1366,
		});
	} else {
		await page.setViewport({
			deviceScaleFactor: 4,
			hasTouch: true,
			height: 640,
			isLandscape: false,
			isMobile: true,
			width: 360,
		});
	}

	await page.goto(url);

	const currPath = `shots/${name}.${env}.curr.png`;
	const refPath = `shots/${name}.${env}.ref.png`;
	const diffPath = `shots/${name}.${env}.diff.png`;

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
		return eql;
	} else {
		console.info('saving current screenshot for next time');
		await fs.move(currPath, refPath);
		return false;
	}
}
