import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const publicRoutes = [
  ['/', /Make the right connections/i],
  ['/faq', /Frequently asked questions/i],
  ['/privacy', /Privacy Policy/i],
  ['/signin', /Welcome back to Vuprise/i],
  ['/signup', /Join Vuprise/i],
  ['/forgot-password', /Reset your password/i],
  ['/support/request', /Send a request/i],
  ['/satisfied-games', /Satisfied Games/i],
  ['/thank-you', /your request was received/i],
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

test('a public account receives and replies to messages from non-connected members', async ({ page }) => {
  test.skip(test.info().project.name !== 'edge', 'Run once against the shared isolated E2E database.');
  test.setTimeout(240_000);

  const signIn = async (email) => {
    await page.goto('/signin');
    // ProtectedRoute stores the previous location in history state; a reload
    // would send the next sign-in back there, so clear it for a fresh start.
    await page.evaluate(() => window.history.replaceState({}, '', '/signin'));
    await page.getByRole('textbox', { name: 'Email Address' }).fill(email);
    await page.getByRole('textbox', { name: 'Password' }).fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).not.toHaveURL(/\/signin$/);
    // Sign-in shows a 5s welcome overlay; the location dialog only mounts
    // after it clears and blocks everything behind it, so wait it out first.
    const welcome = page.getByRole('status');
    await expect(welcome).toBeVisible({ timeout: 4000 }).catch(() => {});
    await expect(welcome).toBeHidden({ timeout: 9000 }).catch(() => {});
    const onboarding = page.getByRole('dialog', { name: 'Complete Your Profile' });
    await page.waitForTimeout(400);
    if (await onboarding.isVisible()) {
      await onboarding.getByRole('combobox', { name: 'Country' }).fill('India');
      await page.getByRole('option', { name: 'India', exact: true }).click();
      await onboarding.getByRole('combobox', { name: 'State / Province / Region' }).fill('Tamil Nadu');
      await page.getByRole('option', { name: 'Tamil Nadu', exact: true }).click();
      await onboarding.getByRole('button', { name: 'Save & Continue' }).click();
      await expect(onboarding).toBeHidden();
    }
  };
  const signOut = async () => {
    await page.getByRole('button', { name: 'Open profile menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL(/\/signin$/);
  };
  const setPrivateAccount = async (on) => {
    await page.goto('/settings');
    const privateSwitch = page.getByRole('switch', { name: 'Private Account' });
    await expect(privateSwitch).toBeVisible();
    if ((await privateSwitch.getAttribute('aria-checked')) !== String(on)) {
      await privateSwitch.click();
      await expect(privateSwitch).toHaveAttribute('aria-checked', String(on));
    }
  };

  // Recipient Devon (Private Account OFF) is not connected to sender Anya.
  await signIn('devon@nexora.io');
  await setPrivateAccount(false);
  await signOut();

  await signIn('anya@nexora.io');
  await page.goto('/people');
  await page.getByPlaceholder('Search by name, company, title, or skill...').fill('Devon');
  await page.getByText('Devon Thorne').first().click();
  await expect(page).toHaveURL(/\/profile\//);
  const devonId = page.url().split('/profile/')[1];
  await page.getByRole('button', { name: 'Message' }).click();
  await expect(page).toHaveURL(new RegExp(`/messages\\?contact=${devonId}`));

  const uniqueMessage = `Hello from a non-connected member ${Date.now()}`;
  const composer = page.getByRole('textbox', { name: 'Message' });
  await expect(composer).toBeVisible();
  await composer.fill(uniqueMessage);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(uniqueMessage)).toBeVisible();
  await expect(page.getByText(/Sending/)).toHaveCount(0);

  // The sender may itself be private; the public recipient must still receive
  // and reply to a conversation the sender started.
  await setPrivateAccount(true);
  await signOut();

  await signIn('devon@nexora.io');
  await page.goto('/messages');
  const chatWithSender = page.getByRole('button', { name: 'Open chat with Dr. Anya Sharma' });
  await expect(chatWithSender).toBeVisible();
  await chatWithSender.click();
  await expect(page.getByText(uniqueMessage)).toBeVisible();

  const reply = `Thanks for reaching out ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Message' }).fill(reply);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(reply)).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Open chat with Dr. Anya Sharma' }).click();
  await expect(page.getByText(uniqueMessage)).toBeVisible();
  await expect(page.getByText(reply)).toBeVisible();

  await signOut();
  await signIn('devon@nexora.io');
  await page.goto('/messages');
  await expect(page.getByRole('button', { name: 'Open chat with Dr. Anya Sharma' })).toBeVisible();

  // With Private Account ON, a different non-connected member cannot start a
  // brand-new conversation.
  await setPrivateAccount(true);
  await signOut();
  await signIn('marcus@nexora.io');
  await page.goto(`/messages?contact=${devonId}`);
  await expect(page.getByText(/requires a connection before messaging/i)).toBeVisible();

  // Restore the shared test accounts to their default privacy state.
  await signOut();
  await signIn('devon@nexora.io');
  await setPrivateAccount(false);
  await signOut();
  await signIn('anya@nexora.io');
  await setPrivateAccount(false);
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

test('public pages expose their own titles, canonicals, and robots directives', async ({ page }) => {
  await page.goto('/faq');
  await expect(page).toHaveTitle(/FAQ \| Vuprise/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/faq$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/);

  await page.goto('/signin');
  await expect(page).toHaveTitle(/Sign in \| Vuprise/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

  await page.goto('/this-route-does-not-exist');
  await expect(page).toHaveTitle(/Page not found \| Vuprise/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('footer links reach the FAQ, and its structured data matches what visitors see', async ({ page }) => {
  await page.goto('/');
  // The privacy notice sits above the footer on first visit; dismiss it the
  // way a visitor would before using the footer links.
  const privacyNotice = page.getByRole('region', { name: 'Privacy notice' });
  if (await privacyNotice.isVisible()) {
    await privacyNotice.getByRole('button', { name: 'Reject non-essential' }).click();
  }
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: 'FAQ' })).toBeVisible();
  await footer.getByRole('link', { name: 'FAQ' }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();

  const structured = await page.locator('#faq-structured-data').textContent();
  const parsed = JSON.parse(structured);
  expect(parsed['@type']).toBe('FAQPage');
  expect(parsed.mainEntity.length).toBeGreaterThan(4);
  for (const entry of parsed.mainEntity) {
    expect(entry['@type']).toBe('Question');
    expect(typeof entry.acceptedAnswer.text).toBe('string');
  }
  await expect(page.getByText(parsed.mainEntity[0].name)).toBeVisible();
});

test('privacy banner stores the choice and analytics never loads without consent', async ({ page }) => {
  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Privacy notice' });
  await expect(banner).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);

  await banner.getByRole('button', { name: 'Reject non-essential' }).click();
  await expect(banner).toBeHidden();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('vuprise_consent_v1')));
  expect(stored.analytics).toBe(false);
  await expect(page.locator('script[src*="googletagmanager"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('region', { name: 'Privacy notice' })).toHaveCount(0);
});

test('share-card asset and social metadata are served', async ({ page, request }) => {
  const response = await request.get('/share-card.png');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-type']).toContain('image/png');

  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /share-card\.png$/);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /share-card\.png$/);
});

test('landing and sign-up pages have no serious automated accessibility violations', async ({ page }) => {
  for (const route of ['/', '/signup', '/faq', '/privacy']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = results.violations.filter(({ impact }) => ['critical', 'serious'].includes(impact));
    expect(serious, `${route}: ${serious.map(({ id, help }) => `${id} ${help}`).join('; ')}`).toEqual([]);
  }
});

test('public page layouts have no horizontal overflow at target viewport widths', async ({ page }) => {
  for (const route of ['/', '/signin', '/signup', '/satisfied-games', '/faq', '/privacy', '/thank-you']) {
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
