const { red, green } = require("ansi-colors");

const puppeteer = require("puppeteer");

try {
	(async () => {
		const browser = await puppeteer.launch({
			headless: false,
			executablePath: "chrome.exe"
		});
		console.log(green("browser started"));

		const page = await browser.newPage();
		console.log(green("page created"));

		await page.goto("http://localhost:1234");
		console.log(green("navigation complete"));

		await page.screenshot({ path: "example.png" });
		console.log(green("screenshot taken"));
		
		await browser.close();
		console.log(green("browser closed"));
	})();
} catch (ex) {
	console.error(red(ex));
}

console.log("testing started");
