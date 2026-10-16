import { test, expect } from '@playwright/test';

const profileUser = {
  _id: '000000000000000000000002',
  name: 'Grid Tester',
  headline: 'Design systems lead',
  location: 'Chennai, India',
  company: 'Vuprise',
  bio: 'Testing the unified media grid.',
  profilePicture: '',
  coverImage: '',
  connectsCount: 12,
  connectionsCount: 9,
  postCount: 5,
  connectionStatus: 'connected',
  skills: ['Design systems'],
  education: [],
  experience: [],
};

const viewer = {
  _id: '000000000000000000000001',
  name: 'Test Viewer',
  headline: 'Vuprise member',
  profilePicture: '',
  locationCountryCode: 'IN',
  locationRegion: 'Tamil Nadu',
};

const posts = [
  { _id: 'p1', content: 'Image post one', image: 'https://media.test/one.jpg', likeCount: 3, commentCount: 1, createdAt: '2026-10-15T10:00:00.000Z' },
  { _id: 'p2', content: 'My Reel with thumb', mediaType: 'video', videoUrl: 'https://media.test/r.mp4', videoPresentation: 'reel', videoThumbnail: 'https://media.test/thumb.jpg', likeCount: 2, commentCount: 0, createdAt: '2026-10-14T10:00:00.000Z' },
  { _id: 'p3', content: 'Reel without thumb', mediaType: 'video', videoUrl: 'https://media.test/r2.mp4', videoPresentation: 'reel', likeCount: 1, commentCount: 0, createdAt: '2026-10-13T10:00:00.000Z' },
  { _id: 'p4', content: 'Landscape video', mediaType: 'video', videoUrl: 'https://media.test/v.mp4', videoPresentation: 'post', videoThumbnail: 'https://media.test/thumb2.jpg', likeCount: 0, commentCount: 0, createdAt: '2026-10-12T10:00:00.000Z' },
  { _id: 'p5', content: 'A text only post about design systems and responsive layouts', likeCount: 0, commentCount: 0, createdAt: '2026-10-11T10:00:00.000Z' },
];

const pixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const installMocks = async (page, me) => {
  await page.addInitScript((user) => {
    localStorage.setItem('nexora_token', 'e2e-only-token');
    localStorage.setItem('nexora_user', JSON.stringify(user));
  }, me);
  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: { success: true, user: me, pendingWarnings: [] } });
    } else if (/^\/api\/users\/[^/]+$/.test(pathname)) {
      await route.fulfill({ json: { success: true, user: { ...profileUser, connectionsCount: profileUser.connectionsCount } } });
    } else if (pathname.startsWith('/api/posts/user/')) {
      await route.fulfill({ json: { success: true, posts } });
    } else if (/^\/api\/posts\/[^/]+$/.test(pathname)) {
      await route.fulfill({ json: { success: true, post: posts[0] } });
    } else if (pathname.endsWith('/connections')) {
      await route.fulfill({ json: { success: true, count: 0, connections: [], pendingIncoming: [], pendingOutgoing: [] } });
    } else if (pathname.endsWith('/notifications')) {
      await route.fulfill({ json: { success: true, notifications: [], unreadCount: 0 } });
    } else if (pathname.endsWith('/messages/conversations')) {
      await route.fulfill({ json: { success: true, conversations: [] } });
    } else if (pathname.endsWith('/groups')) {
      await route.fulfill({ json: { success: true, groups: [] } });
    } else {
      await route.fulfill({ json: { success: true } });
    }
  });
  await page.route('https://media.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: pixelPng }));
};

test('profile media grid is responsive and opens the right viewers', async ({ page }) => {
  test.skip(test.info().project.name !== 'edge', 'edge only');
  test.setTimeout(180_000);
  await installMocks(page, viewer);
  await page.goto(`/profile/${profileUser._id}`);
  await page.getByRole('button', { name: 'Reject non-essential' }).click().catch(() => {});
  const tiles = page.getByRole('button', { name: /^Open (Reel|post):/ });
  await expect(tiles).toHaveCount(5);

  const expectations = [
    [320, 3], [375, 3], [430, 3], [768, 3], [1024, 4], [1366, 5], [1920, 5],
  ];
  for (const [width, expectedColumns] of expectations) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(250);
    const boxes = [];
    for (let i = 0; i < 5; i += 1) boxes.push(await tiles.nth(i).boundingBox());
    const firstY = Math.round(boxes[0].y);
    const columns = boxes.filter((box) => Math.abs(Math.round(box.y) - firstY) <= 2).length;
    const square = Math.abs(boxes[0].width - boxes[0].height) <= 2;
    const overflow = await page.evaluate(() => Math.max(
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
      document.body.scrollWidth - document.body.clientWidth
    ));
    console.log(`GRID w=${width} cols=${columns} tile=${Math.round(boxes[0].width)}x${Math.round(boxes[0].height)} overflow=${overflow}`);
    expect(columns).toBe(expectedColumns);
    expect(square).toBe(true);
    expect(overflow).toBeLessThanOrEqual(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await tiles.nth(1).click();
  await expect(page).toHaveURL(/\/reels\?videoId=p2$/);
  await page.goto(`/profile/${profileUser._id}`);
  await tiles.nth(0).click();
  await expect(page).toHaveURL(/\/post\/p1$/);
});

test('own profile header is compact with no overflow', async ({ page }) => {
  test.skip(test.info().project.name !== 'edge', 'edge only');
  test.setTimeout(120_000);
  await installMocks(page, { ...viewer, _id: profileUser._id });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`/profile/${profileUser._id}`);
  await page.getByRole('button', { name: 'Reject non-essential' }).click().catch(() => {});
  await expect(page.getByRole('button', { name: 'Edit Profile' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  const header = await page.getByRole('heading', { name: 'Grid Tester' }).boundingBox();
  const overflow = await page.evaluate(() => Math.max(
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.body.clientWidth
  ));
  console.log(`OWN-HEADER nameY=${Math.round(header.y)} overflow=${overflow}`);
  expect(header.y).toBeLessThanOrEqual(360);
  expect(overflow).toBeLessThanOrEqual(0);
});
