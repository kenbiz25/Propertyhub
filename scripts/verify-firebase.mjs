import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const consoleErrors = [];
const firebaseLogs = [];

page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error") consoleErrors.push(text);
  if (/firebase|firestore|auth|permission|denied/i.test(text)) {
    firebaseLogs.push({ type: msg.type(), text });
  }
});

// ── Load home page ──────────────────────────────────────────────────────────
await page.goto("http://localhost:5175/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForTimeout(5000);   // allow Firestore reads to settle

const title = await page.title();

// ── Verify Firebase app ID appears in the page source ──────────────────────
const pageSource = await page.content();
const appIdPresent = pageSource.includes("626373468176");
const projectIdPresent = pageSource.includes("househunter-6bf27");

// ── Check adsbygoogle only loads on content pages (our AdSense fix) ────────
const adsenseLoaded = pageSource.includes("adsbygoogle");

// ── Count meaningful content on the page ───────────────────────────────────
const headings = await page.locator("h1, h2, h3").allInnerTexts();
const cardCount = await page.locator("[class*='card'], [class*='listing'], [class*='property']").count();

// ── Screenshot ─────────────────────────────────────────────────────────────
await page.screenshot({ path: "C:/temp/firebase-verify.png", fullPage: false });
console.log("Screenshot saved to C:/temp/firebase-verify.png");

// ── Also check /listings page ──────────────────────────────────────────────
await page.goto("http://localhost:5175/listings", { waitUntil: "domcontentloaded", timeout: 20000 });
await page.waitForTimeout(2000);
const listingsCardCount = await page.locator("[class*='card'], article, [class*='listing']").count();
const listingsErrors = consoleErrors.filter(e => /firestore|permission|failed/i.test(e));

await browser.close();

// ── Report ──────────────────────────────────────────────────────────────────
console.log("\n=== FIREBASE CONFIG READ ===");
console.log("App ID (626373468176) in source:", appIdPresent ? "YES ✓" : "NO ✗");
console.log("Project ID (househunter-6bf27) in source:", projectIdPresent ? "YES ✓" : "NO ✗");

console.log("\n=== HOME PAGE ===");
console.log("Title:", title);
console.log("Headings found:", headings.slice(0, 5));
console.log("Card-like elements:", cardCount);
console.log("AdSense loaded on /:", adsenseLoaded ? "YES ✓" : "NO ✗");

console.log("\n=== LISTINGS PAGE ===");
console.log("Card-like elements on /listings:", listingsCardCount);
console.log("Firestore errors on /listings:", listingsErrors.length === 0 ? "none ✓" : listingsErrors);

console.log("\n=== ALL CONSOLE ERRORS ===");
if (consoleErrors.length === 0) {
  console.log("None ✓");
} else {
  consoleErrors.forEach(e => console.log(" ✗", e));
}

console.log("\n=== FIREBASE-RELATED LOGS ===");
if (firebaseLogs.length === 0) {
  console.log("None ✓");
} else {
  firebaseLogs.forEach(l => console.log(" [" + l.type + "]", l.text));
}
