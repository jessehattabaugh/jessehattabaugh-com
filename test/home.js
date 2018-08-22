const Lab = require('lab');
const lab = exports.lab = Lab.script();
const { describe, it, before, after } = lab;

const Code = require('code');
const expect = Code.expect;

const puppeteer = require('puppeteer');

const looksSame = require('looks-same');

let browser;
let page;

describe('the home page', () => {

    before(async () => {
        browser = await puppeteer.launch({
            headless: false,
            executablePath: 'chrome.exe'
        });
        page = await browser.newPage();
    });

    it('looks right on mobile', async () => {
        await page.goto('http://localhost:1234');
        await page.screenshot({ path: 'shots/home.png' });
        await new Promise((resolve) => {
            looksSame('shots/home.png', 'shots/home.png', (err, eql) => {
                expect(eql, 'return value of looks-same').to.be.true();
                resolve();
            });
        });
    });

    after(async () => browser.close());

});

