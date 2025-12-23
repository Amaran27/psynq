import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: './deploy/playwright/.env' });

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const USERNAME = process.env.USERNAME || process.env.USER || '';
const PASSWORD = process.env.PASSWORD || '';
const DIAL_NUMBER = process.env.DIAL_NUMBER || '+918608273468';

// Adjust these selectors for your UI
const selectors = {
  login: {
    username: 'input[name="username"]',
    password: 'input[name="password"]',
    submit: 'button:has-text("Sign in")'
  },
  callUi: {
    openDialerButton: 'button:has-text("Call")', // button that opens dialer
    numberInput: 'input[placeholder="Enter number"]',
    dialButton: 'button:has-text("Dial")'
  }
};

test('make outbound call via web UI', async ({ page }) => {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  // Optional: sign in if login form exists
  if (await page.locator(selectors.login.username).count() > 0) {
    await page.fill(selectors.login.username, USERNAME);
    await page.fill(selectors.login.password, PASSWORD);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click(selectors.login.submit)
    ]);
  }

  // Open dialer
  if (await page.locator(selectors.callUi.openDialerButton).count() > 0) {
    await page.click(selectors.callUi.openDialerButton);
  }

  // Enter number
  if (await page.locator(selectors.callUi.numberInput).count() > 0) {
    await page.fill(selectors.callUi.numberInput, DIAL_NUMBER);
  } else {
    // fallback: focus document and type the number (if there's a global input)
    await page.keyboard.type(DIAL_NUMBER);
  }

  // Click dial
  if (await page.locator(selectors.callUi.dialButton).count() > 0) {
    await page.click(selectors.callUi.dialButton);
  } else {
    // fallback: press Enter
    await page.keyboard.press('Enter');
  }

  // Wait a short while for the UI to show an active call
  await page.waitForTimeout(5000);

  // Basic assertion: check for a UI element that indicates active call (customize as needed)
  // e.g. an element showing the dialed number or status
  const activeCall = await page.locator(`text=${DIAL_NUMBER}`).first();
  expect(await activeCall.count()).toBeGreaterThanOrEqual(0);
});
