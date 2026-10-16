import { test, expect } from '@playwright/test';

const viewer = {
  _id: '000000000000000000000001',
  name: 'Test Viewer',
  headline: 'Vuprise member',
  profilePicture: '',
  locationCountryCode: 'IN',
  locationRegion: 'Tamil Nadu',
};

const author = (id, name) => ({ _id: id, name, headline: 'Product designer', profilePicture: '' });

const reelNone = { _id: '000000000000000000000021', author: author('000000000000000000000002', 'Alice Connect'), mediaType: 'video', videoPresentation: 'reel', videoUrl: 'https://media.test/reel-none.mp4', content: 'Connect state', connectionStatus: 'none', likeCount: 0, commentCount: 0 };
const reelConnected = { _id: '000000000000000000000022', author: author('000000000000000000000003', 'Bob Connected'), mediaType: 'video', videoPresentation: 'reel', videoUrl: 'https://media.test/reel-connected.mp4', content: 'Connected state', connectionStatus: 'connected', likeCount: 0, commentCount: 0 };
const reelPendingReceived = { _id: '000000000000000000000023', author: author('000000000000000000000004', 'Cara Incoming'), mediaType: 'video', videoPresentation: 'reel', videoUrl: 'https://media.test/reel-pending.mp4', content: 'Connect back state', connectionStatus: 'pending_received', likeCount: 0, commentCount: 0 };
const reelPendingSent = { _id: '000000000000000000000024', author: author('000000000000000000000005', 'Dan Outgoing'), mediaType: 'video', videoPresentation: 'reel', videoUrl: 'https://media.test/reel-sent.mp4', content: 'Pending sent state', connectionStatus: 'pending_sent', likeCount: 0, commentCount: 0 };

test('reels connection buttons are compact', async ({ page }) => {
  test.skip(test.info().project.name !== 'edge', 'edge only');
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((user) => {
    localStorage.setItem('nexora_token', 'e2e-only-token');
    localStorage.setItem('nexora_user', JSON.stringify(user));
    HTMLMediaElement.prototype.play = function playForReelsTest() { return Promise.resolve(); };
    HTMLMediaElement.prototype.pause = function pauseForReelsTest() {};
  }, viewer);

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: { success: true, user: viewer, pendingWarnings: [] } });
    } else if (pathname.endsWith('/posts/feed')) {
      await route.fulfill({ json: { success: true, posts: [reelNone, reelConnected, reelPendingReceived, reelPendingSent], totalPages: 1, currentPage: 1 } });
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
  await page.route('https://media.test/**', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: '' }));

  await page.goto('/reels');
  const feed = page.getByRole('main', { name: 'Reels feed' });
  await expect(page.locator('.vuprise-reel-slide')).toHaveCount(4);

  const measure = async (index, name) => {
    await feed.evaluate((element, i) => element.scrollTo({ top: element.clientHeight * i, behavior: 'instant' }), index);
    await page.waitForTimeout(350);
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible({ timeout: 10000 });
    const box = await button.boundingBox();
    expect(box.height).toBeLessThanOrEqual(30);
    expect(box.width).toBeLessThanOrEqual(130);
  };
  await measure(0, 'Connect');
  await measure(1, /^Disconnect from Bob Connected$/);
  await measure(2, 'Connect back');
  await measure(3, /^You connected with this member/);

  await expect(page.getByRole('button', { name: 'Decline', includeHidden: true })).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 700 });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => Math.max(
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
    document.body.scrollWidth - document.body.clientWidth
  ));
  expect(overflow).toBeLessThanOrEqual(0);
});
