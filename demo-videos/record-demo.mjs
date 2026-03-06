import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const baseUrl = "http://127.0.0.1:5173/";
const outputDir = "/workspace/demo-videos";
const tempDir = path.join(outputDir, "tmp");
const chromePath = "/usr/local/bin/google-chrome";

async function ensureCleanDirectory(directory) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

async function moveRecordedVideo(sourceDirectory, destinationPath) {
  const files = (await fs.readdir(sourceDirectory)).filter((file) =>
    file.endsWith(".webm"),
  );

  if (!files.length) {
    throw new Error(`No video was recorded in ${sourceDirectory}`);
  }

  await fs.rename(path.join(sourceDirectory, files[0]), destinationPath);
}

async function waitForResults(page) {
  await page.waitForSelector(".results-count", { timeout: 30000 });
  await page.waitForTimeout(1200);
}

async function recordDesktop(browser) {
  const videoDirectory = path.join(tempDir, "desktop");
  await fs.mkdir(videoDirectory, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    recordVideo: {
      dir: videoDirectory,
      size: { width: 1440, height: 1200 },
    },
  });

  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await waitForResults(page);

  const desktopQueryInput = page.locator("#query");
  await desktopQueryInput.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await desktopQueryInput.focus();
  await desktopQueryInput.pressSequentially("gpt-4", { delay: 100 });
  await page.waitForTimeout(900);

  await page.locator(".dropdown-trigger").click();
  await page.locator(".dropdown-menu .search-input").fill("openai");
  await page.waitForTimeout(600);
  await page.getByRole("option", { name: /openai/i }).first().click();
  await page.waitForTimeout(900);

  const desktopRowToggle = page.locator(".desktop-results tbody .row-toggle").first();
  await desktopRowToggle.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await desktopRowToggle.evaluate((element) => {
    element.click();
  });
  await page.waitForSelector(".desktop-results .expanded-content", { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.locator(".desktop-results .expanded-content .code-tab", { hasText: "AI Gateway" }).first().click({ force: true });
  await page.waitForTimeout(600);
  await page.locator(".desktop-results .copy-code-btn").first().click();
  await page.waitForTimeout(900);

  await desktopQueryInput.fill("enterprise-unknown-model-123");
  await page.waitForTimeout(1400);

  const suggestion = page.locator(".suggestion-card").first();
  if (await suggestion.count()) {
    await suggestion.click();
    await page.waitForTimeout(1200);
  } else {
    await page.waitForTimeout(1200);
  }

  await context.close();
  await moveRecordedVideo(
    videoDirectory,
    path.join(outputDir, "desktop-workspace-demo.webm"),
  );
}

async function recordMobile(browser) {
  const videoDirectory = path.join(tempDir, "mobile");
  await fs.mkdir(videoDirectory, { recursive: true });

  const context = await browser.newContext({
    ...devices["iPhone 13"],
    recordVideo: {
      dir: videoDirectory,
      size: { width: 390, height: 844 },
    },
  });

  const page = await context.newPage();

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await waitForResults(page);

  const mobileQueryInput = page.locator("#query");
  await mobileQueryInput.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await mobileQueryInput.focus();
  await mobileQueryInput.pressSequentially("claude", { delay: 90 });
  await page.waitForTimeout(900);
  await page.locator(".card-expand-btn").first().click({ force: true });
  await page.waitForTimeout(1200);
  await page.locator(".model-card-detail .copy-code-btn").first().click();
  await page.waitForTimeout(900);

  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  await page.locator(".mobile-menu-btn").click({ force: true });
  await page.waitForSelector(".mobile-menu", { timeout: 30000 });
  await page.locator(".mobile-request-button").click({ force: true });
  await page.waitForSelector(".modal-content", { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.locator(".type-button", { hasText: "Model" }).click();
  await page.locator("#request").fill("Support a model with a 1M token context window and enterprise SLA visibility.");
  await page.locator("#email").fill("demo@example.com");
  await page.waitForTimeout(1500);

  await context.close();
  await moveRecordedVideo(
    videoDirectory,
    path.join(outputDir, "mobile-workspace-and-modal-demo.webm"),
  );
}

async function main() {
  await ensureCleanDirectory(tempDir);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    await recordDesktop(browser);
    await recordMobile(browser);
  } finally {
    await browser.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
