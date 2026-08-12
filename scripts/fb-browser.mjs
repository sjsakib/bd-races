import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..');
export const PROFILE_DIR = path.join(ROOT, '.playwright-fb-profile');

export async function launchFbContext() {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
  });
}

export async function waitForEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

/** Returns false if Facebook login is required. */
export async function ensureLoggedIn(context) {
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  const onLoginPage = page.url().includes('/login')
    || await page.locator('input[name="email"], #email').first()
      .isVisible({ timeout: 2000 }).catch(() => false);

  if (onLoginPage) return false;

  const hasNav = await page.locator('[role="navigation"], [aria-label="Facebook"]').first()
    .isVisible({ timeout: 3000 }).catch(() => false);
  return hasNav || !onLoginPage;
}

export async function loginSetup() {
  console.error('Opening Facebook login browser...');
  console.error(`Profile saved to ${PROFILE_DIR}`);
  const context = await launchFbContext();
  const page = context.pages()[0] ?? await context.newPage();
  await page.goto('https://www.facebook.com/login', { waitUntil: 'domcontentloaded' });
  await waitForEnter('\nLog in to Facebook in the browser, then press Enter here... ');
  const ok = await ensureLoggedIn(context);
  await context.close();
  if (!ok) {
    console.error('Login not detected. Try again.');
    process.exit(1);
  }
  console.error('Login saved. You can now run: pnpm fb:run');
}
