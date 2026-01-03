// @ts-nocheck
import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';

// Load local env overrides (do not commit secrets)
dotenv.config({ path: './deploy/playwright/.env' });

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const USERNAME = process.env.USERNAME || process.env.USER || '';
const PASSWORD = process.env.PASSWORD || '';

/**
 * Hard gate: we want zero console warnings/errors and zero failed API calls.
 * This test fails fast if the page emits console.warn/error or if any fetch/xhr gets 4xx/5xx.
 */
test('console + network gate (no warnings/errors, no 4xx/5xx)', async ({ page }) => {
  test.setTimeout(120_000);
  const consoleProblems: string[] = [];
  const networkProblems: string[] = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'warning' || type === 'error') {
      // Include location when possible for fast triage
      const loc = msg.location();
      const where = loc?.url ? ` (${loc.url}:${loc.lineNumber ?? 0}:${loc.columnNumber ?? 0})` : '';
      consoleProblems.push(`[console.${type}] ${msg.text()}${where}`);
    }
  });

  page.on('pageerror', (err) => {
    consoleProblems.push(`[pageerror] ${err.message}`);
  });

  page.on('requestfailed', (req) => {
    // Resource failures can be noisy (fonts, images). Only fail on likely-app traffic.
    const rt = req.resourceType();
    if (rt === 'xhr' || rt === 'fetch' || rt === 'document') {
      networkProblems.push(`[requestfailed] ${rt} ${req.method()} ${req.url()} -> ${req.failure()?.errorText ?? 'unknown error'}`);
    }
  });

  page.on('response', (res) => {
    const req = res.request();
    const rt = req.resourceType();
    const status = res.status();

    // Gate only on app-critical traffic. (Static assets can be handled separately.)
    if ((rt === 'xhr' || rt === 'fetch' || rt === 'document') && status >= 400) {
      networkProblems.push(`[response] ${rt} ${req.method()} ${res.url()} -> ${status}`);
    }
  });

  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  const psynqConsole = page.locator('text=Psynq Console');
  const loginHeader = page.locator('text=Login to Psynq');

  // Login if the login form is present
  // Client-only rendering can briefly show a Loading state; wait for either login or main UI.
  await Promise.race([
    psynqConsole.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => null),
    loginHeader.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => null),
  ]);

  // If we're on the login screen, wait for inputs to appear (some environments render header first).
  const loginVisibleEarly = await loginHeader.isVisible().catch(() => false);
  if (loginVisibleEarly) {
    await page
      .waitForFunction(() => document.querySelectorAll('input').length >= 2, null, { timeout: 30_000 })
      .catch(() => null);
  }

  const inputs = page.locator('input');

  const usernameByLabel = page.locator('label:has-text("Username")').locator('..').locator('input');
  const passwordByLabel = page.locator('label:has-text("Password")').locator('..').locator('input');

  const usernameInput = (await usernameByLabel.count()) > 0 ? usernameByLabel.first() : inputs.nth(0);
  const passwordInput = (await passwordByLabel.count()) > 0 ? passwordByLabel.first() : inputs.nth(1);
  const loginButton = page.locator('button[type="submit"]').first();

  const hasLoginForm = (await inputs.count()) >= 2 && (await loginButton.count()) > 0;

  if (hasLoginForm) {
    if (!USERNAME || !PASSWORD) {
      throw new Error('USERNAME/PASSWORD not set (required for console gate login)');
    }

    await usernameInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);
    await loginButton.click();
  }

  // Wait for the main UI (client-only rendering + adapter initialization can take a bit.)
  // If we remain on the login screen, we'll report it with useful diagnostics.
  await psynqConsole.waitFor({ state: 'visible', timeout: 90_000 }).catch(() => null);

  // Allow background subscriptions to settle
  await page.waitForTimeout(2_000);

  // Assert we're on the main UI
  if (!(await psynqConsole.isVisible())) {
    const loginVisible = await loginHeader.isVisible().catch(() => false);
    const loginErrorText = (await page.locator('p.text-red-500').first().textContent().catch(() => null))?.trim();
    const title = await page.title().catch(() => '');
    const url = page.url();
    const bodyText = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const bodySnippet = bodyText ? bodyText.slice(0, 400) : '';

    const details = [
      `Did not reach main UI (Psynq Console not visible).`,
      `URL: ${url}`,
      title ? `Title: ${title}` : null,
      `Login screen visible: ${loginVisible}`,
      `Login form detected: ${hasLoginForm}`,
      loginErrorText ? `Login error: ${loginErrorText}` : null,
      bodySnippet ? `Body snippet: ${bodySnippet}` : null,
      consoleProblems.length ? `Console problems so far (count=${consoleProblems.length}):\n- ${consoleProblems.join('\n- ')}` : null,
      networkProblems.length ? `Network problems so far (count=${networkProblems.length}):\n- ${networkProblems.join('\n- ')}` : null,
    ].filter(Boolean).join('\n');

    throw new Error(details);
  }

  // Final gate
  if (consoleProblems.length || networkProblems.length) {
    const details = [
      consoleProblems.length ? `Console problems (count=${consoleProblems.length}):\n- ${consoleProblems.join('\n- ')}` : null,
      networkProblems.length ? `Network problems (count=${networkProblems.length}):\n- ${networkProblems.join('\n- ')}` : null,
    ].filter(Boolean).join('\n\n');

    throw new Error(`Console/network gate failed\n\n${details}`);
  }
});
