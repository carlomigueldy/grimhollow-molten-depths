import { chromium } from "playwright";

const url = "http://127.0.0.1:5173/?smoke=1";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on("pageerror", (err) => logs.push(`pageerror: ${err.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") logs.push(`console.error: ${msg.text()}`);
});

const state = () => page.evaluate(() => window.__GRIMHOLLOW__.state());
const hold = (code, down) => page.evaluate(([c, d]) => window.__GRIMHOLLOW__.hold(c, d), [code, down]);
const cast = (action) => page.evaluate((a) => window.__GRIMHOLLOW__.cast(a), action);
const teleport = (x, z) => page.evaluate(([x, z]) => window.__GRIMHOLLOW__.teleport(x, z), [x, z]);
const wakeBoss = () => page.evaluate(() => window.__GRIMHOLLOW__.wakeBoss());

await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForFunction(() => document.getElementById("loading")?.classList.contains("is-hidden"), { timeout: 30000 });
await page.waitForTimeout(500);

const report = {};
report.initialState = await state();

// Real-time movement from the entrance down the corridor.
await hold("KeyW", true);
await page.waitForTimeout(1500);
await hold("KeyW", false);
await page.screenshot({ path: "screenshots/02-moving.png" });
report.afterMoveState = await state();

// Approach a spawnling from the south (facing it) and fight it to death.
await teleport(-20, -4);
for (let i = 0; i < 4; i++) {
  await cast("attack");
  await page.waitForTimeout(900);
}
await page.screenshot({ path: "screenshots/03-combat.png" });
report.afterCombatState = await state();

// Enter the boss arena, wake the Colossus, let it close the gap, then fight.
await teleport(0, -24);
await wakeBoss();
await page.waitForTimeout(3500);
for (let i = 0; i < 5; i++) {
  await cast("attack");
  await page.waitForTimeout(900);
}
await page.screenshot({ path: "screenshots/04-boss.png" });
report.bossFightState = await state();

const start = Date.now();
while ((await state()).bossHp > 0 && Date.now() - start < 20000) {
  await cast("attack");
  await page.waitForTimeout(900);
}
await page.screenshot({ path: "screenshots/05-victory.png" });
report.victoryState = await state();
report.victoryOverlayVisible = await page.evaluate(() =>
  document.getElementById("hud-overlay")?.classList.contains("is-visible"),
);

report.errors = await page.evaluate(() => window.__GRIMHOLLOW__.errors);
report.consoleLogs = logs;

console.log(JSON.stringify(report, null, 2));
await browser.close();
