import { test, expect } from '@playwright/test';

const viewer = {
  _id: '000000000000000000000001',
  name: 'Test Viewer',
  headline: 'Vuprise member',
  profilePicture: '',
  locationCountryCode: 'IN',
  locationRegion: 'Tamil Nadu',
};

const sender = {
  _id: '000000000000000000000002',
  name: 'a deep',
  headline: 'Product designer',
  profilePicture: '',
};

const liker = {
  _id: '000000000000000000000003',
  name: 'Vishnu(Owner)',
  headline: 'Founder',
  profilePicture: '',
};

const notifications = [
  {
    _id: 'notif-1',
    type: 'connection_request',
    message: 'a deep sent you a connection',
    read: false,
    sender,
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'notif-2',
    type: 'post_like',
    message: 'Vishnu(Owner) liked your post.',
    read: true,
    sender: liker,
    post: '000000000000000000000010',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    _id: 'notif-3',
    type: 'group_invitation',
    message: 'You were invited to join Design Ops',
    read: false,
    sender: liker,
    group: { _id: 'grp-1', name: 'Design Ops' },
    createdAt: new Date(Date.now() - 7200 * 1000).toISOString(),
  },
];

const setupRoutes = async (page, calls = []) => {
  await page.addInitScript((user) => {
    localStorage.setItem('nexora_token', 'e2e-only-token');
    localStorage.setItem('nexora_user', JSON.stringify(user));
  }, viewer);

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: { success: true, user: viewer, pendingWarnings: [] } });
    } else if (pathname.endsWith('/notifications')) {
      await route.fulfill({ json: { success: true, notifications, unreadCount: 1 } });
    } else if (pathname.endsWith('/connections')) {
      await route.fulfill({ json: { success: true, pendingIncoming: [{ _id: 'req-1', requester: sender }] } });
    } else if (pathname.endsWith('/messages/conversations')) {
      await route.fulfill({ json: { success: true, conversations: [] } });
    } else if (pathname.endsWith('/groups')) {
      await route.fulfill({ json: { success: true, groups: [] } });
    } else {
      calls.push(`${method} ${pathname}`);
      await route.fulfill({ json: { success: true, unreadCount: 0 } });
    }
  });
};

const overlaps = (first, second) => first && second
  && first.x < second.x + second.width && first.x + first.width > second.x
  && first.y < second.y + second.height && first.y + first.height > second.y;

test('Alerts rows keep messages readable and controls tappable from 320px to desktop', async ({ page }) => {
  await setupRoutes(page);
  await page.goto('/notifications');
  const message = page.getByText('a deep sent you a connection');
  await expect(message).toBeVisible();

  for (const width of [320, 360, 390, 430, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });

    const { documentClientWidth, documentScrollWidth, messageBox } = await page.evaluate(() => {
      const node = [...document.querySelectorAll('*')].find(
        (element) => element.children.length === 0 && element.textContent === 'a deep sent you a connection'
      );
      const rect = node.getBoundingClientRect();
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        messageBox: { width: rect.width, height: rect.height },
      };
    });

    expect(messageBox.width, `message column collapsed at ${width}px`).toBeGreaterThan(120);
    expect(messageBox.height, `message broke per character at ${width}px`).toBeLessThan(80);
    expect(documentScrollWidth, `page overflows horizontally at ${width}px`).toBeLessThanOrEqual(documentClientWidth + 1);

    const avatarBox = await page.locator('[role="group"]').first().locator('.MuiAvatar-root').first().boundingBox();
    const messageRect = await message.boundingBox();
    for (const control of [
      page.getByRole('button', { name: 'Connect back with a deep' }),
      page.getByRole('button', { name: 'Message', exact: true }).first(),
      page.getByRole('button', { name: 'View profile', exact: true }).first(),
      page.getByRole('button', { name: 'Delete notification' }).first(),
    ]) {
      await expect(control).toBeVisible();
      const box = await control.boundingBox();
      expect(box.x, `control clipped at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `control clipped at ${width}px`).toBeLessThanOrEqual(width);
      expect(overlaps(box, avatarBox), `control overlaps the avatar at ${width}px`).toBe(false);
      expect(overlaps(box, messageRect), `control overlaps the message at ${width}px`).toBe(false);
    }
  }
});

test('Alerts group invitation actions stay tappable on small screens', async ({ page }) => {
  const calls = [];
  await setupRoutes(page, calls);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/notifications');

  const accept = page.getByRole('button', { name: 'Accept invitation to Design Ops' });
  const decline = page.getByRole('button', { name: 'Decline invitation to Design Ops' });
  await expect(accept).toBeVisible();
  await expect(decline).toBeVisible();
  for (const control of [accept, decline]) {
    const box = await control.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
  }

  await accept.click();
  await expect.poll(() => calls.includes('POST /api/groups/grp-1/invitations/accept')).toBe(true);
  await expect(page).toHaveURL(/\/messages\?group=grp-1$/);
});

test('Alerts row actions keep their own destinations and controls', async ({ page }) => {
  const calls = [];
  await setupRoutes(page, calls);
  await page.setViewportSize({ width: 360, height: 844 });
  await page.goto('/notifications');

  await page.getByRole('button', { name: 'Connect back with a deep' }).click();
  await expect.poll(() => calls.includes('PUT /api/connections/req-1/accept')).toBe(true);

  await page.getByRole('button', { name: 'Message', exact: true }).first().click();
  await expect(page).toHaveURL(/\/messages\?contact=000000000000000000000002$/);

  await page.goto('/notifications');
  await page.getByRole('button', { name: 'View profile', exact: true }).first().click();
  await expect(page).toHaveURL(/\/profile\/000000000000000000000002$/);

  await page.goto('/notifications');
  await page.getByRole('button', { name: 'Delete notification' }).first().click();
  await expect.poll(() => calls.includes('DELETE /api/notifications/notif-1')).toBe(true);
});
