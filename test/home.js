const Lab = require("lab");
const lab = (exports.lab = Lab.script());
const { describe, it, before, after } = lab;

const Code = require("code");
const expect = Code.expect;

const puppeteer = require("puppeteer");

const looksSame = require("looks-same");

const fs = require("fs-extra");

let browser;
let page;

describe("the home page", () => {
	before(async () => {
		browser = await puppeteer.launch({
			executablePath: "chrome.exe",
			headless: false
			//ignoreHTTPSErrors: true,
			//dumpio: true,
		});
	});

	it("looks right on mobile", async () => {
		page = await browser.newPage();
		page.setViewport({
			width: 360,
			height: 640,
			deviceScaleFactor: 1,
			isMobile: true,
			hasTouch: true,
			isLandscape: false
		});
		await page.goto("http://localhost:1234");

		const newPath = "shots/home.new.png";
		const oldPath = "shots/home.old.png";
		const diffPath = "shots/home.diff.png";

		await page.screenshot({
			path: newPath,
			fullscreen: true
		});

		const oldFileExists = await fs.pathExists(oldPath);

		if (oldFileExists) {
			const looksSameOpts = {
				current: newPath,
				diff: diffPath,
				highlightColor: "#ff00ff",
				ignoreAntialiasing: true,
				ignoreCaret: true,
				reference: oldPath,
				//strict: true,
				tolerance: 2.3,
			};
			const eql = await new Promise(resolve => {
				looksSame(newPath, oldPath, looksSameOpts, (err, eql) => {
					if (err) throw err;
					resolve(eql);
				});
			});
			if (!eql) {
				await new Promise(resolve => {
					looksSame.createDiff(looksSameOpts, err => {
						if (err) throw err;
						resolve();
					});
				});
			}
			expect(eql, "return value of looks-same").to.be.true();
		} else {
			await fs.move(newPath, oldPath);
			expect(
				oldFileExists,
				"a previous screenshot was not found, current screenshot has been saved"
			).to.be.true();
		}
	});

	after(async () => browser.close());
});
