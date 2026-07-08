import { chromium } from "playwright";

const url = process.argv[2] ?? "http://127.0.0.1:5173/?smoke=1";
const out = process.argv[3] ?? "screenshots/final.png";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (msg) => logs.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`pageerror: ${err.message}`));
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector("canvas", { timeout: 30000 });
await page.waitForFunction(() => document.getElementById("loading")?.classList.contains("is-hidden"), { timeout: 30000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });
const state = await page.evaluate(() => window.__GRIMHOLLOW__?.state?.());
console.log(JSON.stringify({ out, state, logs }, null, 2));
await browser.close();
