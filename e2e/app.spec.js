import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  ['/', /Make the right connections/i],
  ['/signin', /Welcome back to Vuprise/i],
  ['/signup', /Join Vuprise/i],
  ['/forgot-password', /Reset your password/i],
  ['/satisfied-games', /Satisfied Games/i],
];

test('public routes render without uncaught errors or failed local assets', async ({ page }) => {
  const errors = [];
  const failedLocalRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => {
    if (request.url().startsWith('http://127.0.0.1:5173/')) failedLocalRequests.push(request.url());
  });

  for (const [route, heading] of publicRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(heading).first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Internal Server Error');
  }

  expect(errors).toEqual([]);
  expect(failedLocalRequests).toEqual([]);
});

test('satisfied games invitation is a compact dismissible notification', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('vuprise.satisfied-games.prompt-seen.v1'));
  await page.reload();

  const explore = page.getByRole('button', { name: 'Explore Satisfied Games' });
  await expect(explore).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Dismiss game notification' })).toBeVisible();
  await expect(page.getByText('Try Satisfied Games')).toHaveCount(0);

  await explore.click();
  await expect(page).toHaveURL(/\/satisfied-games$/);
  await expect(page.getByRole('heading', { name: 'Satisfied Games' })).toBeVisible();
});

test('sign-in validates empty submission and password visibility works', async ({ page }) => {
  await page.goto('/signin');
  const email = page.getByRole('textbox', { name: 'Email Address' });
  const password = page.getByRole('textbox', { name: 'Password' });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  expect(await email.evaluate((element) => element.validity.valueMissing)).toBe(true);
  await expect(email).toBeFocused();
});

test('registration reveals both passwords and switches account-specific fields', async ({ page }) => {
  await page.goto('/signup');
  const password = page.locator('input[name="password"]');
  const confirm = page.locator('input[name="confirmPassword"]');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Show confirm password' }).click();
  await expect(confirm).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Student' }).click();
  await expect(page.getByLabel('College or School Name')).toBeVisible();
  await page.getByRole('button', { name: 'Workplace' }).click();
  await expect(page.getByLabel('Work Role or Job Title')).toBeVisible();
  await expect(page.getByLabel('Company or Organization')).toBeVisible();
});

test('protected deep links send visitors to sign-in and unknown routes show a 404', async ({ page }) => {
  for (const route of ['/home', '/reels', '/messages', '/people', '/notifications', '/settings']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/signin$/);
  }
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByText('Page Not Found')).toBeVisible();
});

test('satisfied games page switches between all three interactive previews', async ({ page }) => {
  await page.goto('/satisfied-games');
  await expect(page.getByRole('heading', { name: 'Satisfied Games' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Binary Orbits/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('slider', { name: 'Spiral arms' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('slider', { name: 'Pointer response' })).toBeVisible();
  await expect(page.locator('[aria-label="Interactive tilted spiral galaxy preview"]')).toBeVisible();
  const galaxyCanvas = page.locator('canvas[aria-label="Touch and drag to swirl existing stars through their orbits"]');
  await expect(galaxyCanvas).toBeVisible();
  await expect.poll(async () => Number(await galaxyCanvas.getAttribute('data-orbit-stars'))).toBeGreaterThan(2000);
  await galaxyCanvas.evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + rect.width * 0.28; const y = rect.top + rect.height * 0.5;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: x, clientY: y, bubbles: true }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', pointerId: 1, buttons: 1, clientX: rect.left + rect.width * 0.4, clientY: y, bubbles: true }));
  });
  await page.waitForTimeout(80);
  await expect.poll(async () => Number(await galaxyCanvas.getAttribute('data-reacted-stars'))).toBeGreaterThan(0);
  await expect(galaxyCanvas).toHaveAttribute('data-pointer-active', 'true');
  await galaxyCanvas.evaluate((canvas) => canvas.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true })));
  await page.getByRole('tab', { name: /Shatter Type/ }).click();
  await expect(page.getByRole('button', { name: 'Shatter headline' })).toBeVisible();
  await page.getByRole('button', { name: 'Shatter headline' }).click();
  await expect(page.getByRole('button', { name: 'Reassemble headline' })).toBeVisible();
  await page.getByRole('button', { name: 'Reassemble headline' }).click();
  await expect(page.getByRole('button', { name: 'Shatter headline' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Headline' }).fill('Interactive test');
  await expect(page.locator('canvas[aria-label="Interactive glass-shard headline: Interactive test"]')).toBeVisible();
  await expect(page.locator('.satisfied-shatter__full-text')).toHaveText('Interactive test');
  await page.getByRole('tab', { name: /Stardust Cursor/ }).click();
  await expect(page.getByRole('heading', { name: 'Stardust Cursor' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Wake softness' })).toBeVisible();
  await expect(page.getByText(/soft, flowing dust wake/i)).toBeVisible();
});

test('isolated seeded account can sign in and protected pages survive direct loads and refreshes', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/signin');
  await page.getByRole('textbox', { name: 'Email Address' }).fill('elena@nexora.io');
  await page.getByRole('textbox', { name: 'Password' }).fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.locator('main')).toBeVisible();

  const country = page.getByRole('combobox', { name: 'Country' });
  await expect(country).toBeVisible({ timeout: 5000 }).catch(() => {});
  if (await country.isVisible()) {
    await expect(country).toBeEnabled();
    await country.fill('India');
    await page.getByRole('option', { name: 'India', exact: true }).click();
    const region = page.getByRole('combobox', { name: 'State / Province / Region' });
    await expect(region).toBeEnabled();
    await region.fill('Tamil Nadu');
    await page.getByRole('option', { name: 'Tamil Nadu', exact: true }).click();
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(country).toBeHidden();
  }

  // Exercise the animated Like control once in the shared isolated test database.
  // Keeping the toggle paired restores the seed post for later projects/runs.
  if (test.info().project.name === 'edge') {
    const like = page.locator('.post-like-heart').first();
    await expect(like).toBeVisible();
    await expect(like.locator('.pulse-heart__sr')).toHaveText('Like');
    await expect.poll(() => like.evaluate((button) => getComputedStyle(button.querySelector('.pulse-heart__pill'), '::after').content)).toBe('"Like"');
    const originalLiked = await like.getAttribute('aria-pressed');
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', originalLiked === 'true' ? 'false' : 'true');
    await page.waitForTimeout(600);
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', originalLiked);
  }

  for (const route of ['/home', '/messages', '/people', '/search?q=design', '/notifications', '/settings', '/profile/edit']) {
    await page.goto(route);
    await expect(page).not.toHaveURL(/\/signin$/);
    await expect(page.locator('main')).toBeVisible();
    await page.reload();
    await expect(page).not.toHaveURL(/\/signin$/);
    await expect(page.locator('main')).toBeVisible();
  }

  if (test.info().project.name === 'edge') {
    await page.goto('/messages');
    await page.getByRole('button', { name: 'Create group' }).click();
    await expect(page.getByRole('dialog', { name: 'Create a group' })).toBeVisible();
    const groupName = `Inbox group ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Group name' }).fill(groupName);
    await expect(page.getByRole('button', { name: 'Create group', exact: true })).toBeDisabled();
    const inviteCheckboxes = page.getByRole('checkbox', { name: /^Add .+ to group$/ });
    await expect(inviteCheckboxes).toHaveCount(3);
    await inviteCheckboxes.nth(0).check();
    await inviteCheckboxes.nth(1).check();
    await inviteCheckboxes.nth(2).check();
    await page.getByRole('button', { name: 'Create group', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const groupChatItem = page.getByRole('button', { name: `Open group chat ${groupName}` });
    await expect(groupChatItem).toBeVisible();
    await groupChatItem.click();
    await expect(page).toHaveURL(/\/messages\?group=/);
    await expect(page.getByText(groupName).first()).toBeVisible();
    await expect(groupChatItem).toBeVisible();

    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await page.getByRole('textbox', { name: 'Email Address' }).fill('marcus@nexora.io');
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/messages$/);
    const inviteeCountry = page.getByRole('combobox', { name: 'Country' });
    await page.goto('/home');
    await expect(inviteeCountry).toBeVisible({ timeout: 10_000 });
    await inviteeCountry.fill('India');
    await page.getByRole('option', { name: 'India', exact: true }).click();
    const inviteeRegion = page.getByRole('combobox', { name: 'State / Province / Region' });
    await inviteeRegion.fill('Tamil Nadu');
    await page.getByRole('option', { name: 'Tamil Nadu', exact: true }).click();
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await expect(inviteeCountry).toBeHidden();
    await page.goto('/notifications');
    const groupInvitation = page.getByRole('button', { name: `Accept invitation to ${groupName}` });
    await expect(groupInvitation).toBeVisible();
    await groupInvitation.click();
    await expect(page).toHaveURL(/\/messages\?group=/);
    await expect(page.getByText(groupName).first()).toBeVisible();
    await expect(page.getByRole('button', { name: `Open group chat ${groupName}` })).toBeVisible();
  }
});

test('successful registration shows the centered welcome moment for 4.5 seconds', async ({ page }) => {
  test.skip(test.info().project.name !== 'edge', 'Run once against the shared isolated E2E database.');
  test.setTimeout(90_000);

  await page.goto('/signup');
  await page.getByRole('textbox', { name: 'Full Name' }).fill('Welcome Test User');
  await page.getByRole('textbox', { name: 'Work or Personal Email' }).fill(`welcome-${Date.now()}@example.test`);
  await page.getByRole('button', { name: 'Student' }).click();
  await page.getByRole('textbox', { name: 'College or School Name' }).fill('Vuprise Test College');
  await page.getByRole('textbox', { name: 'Course or Field of Study' }).fill('Software Engineering');
  await page.getByRole('spinbutton', { name: 'Course Start Year' }).fill('2025');
  await page.locator('input[name="password"]').fill('welcome-test-password');
  await page.locator('input[name="confirmPassword"]').fill('welcome-test-password');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL(/\/home$/);
  const welcome = page.getByRole('status');
  await expect(welcome).toContainText('Welcome to Vuprise');
  await expect(welcome).toBeVisible();
  await page.waitForTimeout(3600);
  await expect(welcome).toBeVisible();
  await expect(welcome).toBeHidden({ timeout: 6000 });
});

test('landing and sign-up pages have no serious automated accessibility violations', async ({ page }) => {
  for (const route of ['/', '/signup']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact));
    expect(serious, `${route}: ${serious.map(({ id, help }) => `${id} ${help}`).join('; ')}`).toEqual([]);
  }
});

test('public page layouts have no horizontal overflow at target viewport widths', async ({ page }) => {
  for (const route of ['/', '/signin', '/signup', '/satisfied-games']) {
    await page.goto(route);
    for (const width of [320, 375, 390, 768, 1024, 1366, 1920]) {
      await page.setViewportSize({ width, height: width < 500 ? 812 : 900 });
      const { viewport, content } = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(content, `${route} overflows at ${width}px`).toBeLessThanOrEqual(viewport + 1);
    }
  }
});
