import { test, expect } from '@playwright/test';

const viewer = {
  _id: '000000000000000000000001',
  name: 'Test Viewer',
  headline: 'Vuprise member',
  profilePicture: '',
  locationCountryCode: 'IN',
  locationRegion: 'Tamil Nadu',
};
const author = {
  _id: '000000000000000000000002',
  name: 'Reel Creator',
  headline: 'Product designer',
  profilePicture: '',
};
const homeVideo = {
  _id: '000000000000000000000011',
  author,
  mediaType: 'video',
  videoPresentation: 'post',
  videoUrl: 'https://media.test/home-video.mp4',
  content: 'A landscape video from Home',
  likeCount: 0,
  commentCount: 0,
};
const reelA = {
  _id: '000000000000000000000012',
  author,
  mediaType: 'video',
  videoPresentation: 'reel',
  videoUrl: 'https://media.test/reel-a.mp4',
  content: 'First Reel',
  likeCount: 2,
  commentCount: 0,
};
const reelB = {
  _id: '000000000000000000000013',
  author,
  mediaType: 'video',
  videoPresentation: 'reel',
  videoUrl: 'https://media.test/reel-b.mp4',
  content: 'Next Reel',
  likeCount: 1,
  commentCount: 0,
};

test('Home video opens as the exact active Reel, snaps to next, and keeps playback exclusive', async ({ page }) => {
  let likeRequests = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((user) => {
    localStorage.setItem('nexora_token', 'e2e-only-token');
    localStorage.setItem('nexora_user', JSON.stringify(user));
    HTMLMediaElement.prototype.play = function playForReelsTest() {
      this.dataset.e2ePlaying = 'true';
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pauseForReelsTest() {
      this.dataset.e2ePlaying = 'false';
    };
  }, viewer);

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith('/auth/me')) {
      await route.fulfill({ json: { success: true, user: viewer, pendingWarnings: [] } });
    } else if (pathname.endsWith('/posts/feed')) {
      await route.fulfill({ json: { success: true, posts: [homeVideo, reelA, reelB], totalPages: 1, currentPage: 1 } });
    } else if (pathname.endsWith(`/posts/${homeVideo._id}`)) {
      await route.fulfill({ json: { success: true, post: homeVideo } });
    } else if (pathname.endsWith(`/posts/${homeVideo._id}/like`)) {
      likeRequests += 1;
      await route.fulfill({ json: { success: true, liked: true, likeCount: 1 } });
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

  await page.goto('/home');
  await page.getByRole('button', { name: 'Open Reels' }).click();
  await expect(page).toHaveURL(/\/reels$/);
  await expect(page.locator('.vuprise-reel-slide')).toHaveCount(2);
  await page.getByRole('button', { name: 'Back to Home' }).first().click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole('button', { name: 'Create post or Reel' }).click();
  await expect(page.getByRole('menuitem', { name: 'Create post' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Create Reel' })).toBeVisible();
  await page.keyboard.press('Escape');

  const homePreview = page.getByRole('button', { name: 'Open video in Reels' }).first();
  await expect(homePreview).toBeVisible();
  await homePreview.click();
  await expect(page).toHaveURL(new RegExp(`/reels\\?videoId=${homeVideo._id}$`));

  const feed = page.getByRole('main', { name: 'Reels feed' });
  const slides = page.locator('.vuprise-reel-slide');
  await expect(slides).toHaveCount(3);
  await expect(slides.first()).toHaveAttribute('data-reel-index', '0');
  const firstVideo = slides.nth(0).locator('video:not([aria-hidden="true"])');
  const secondVideo = slides.nth(1).locator('video:not([aria-hidden="true"])');
  await expect.poll(() => firstVideo.getAttribute('data-e2e-playing')).toBe('true');
  await expect(firstVideo).toHaveJSProperty('controls', false);

  await slides.first().getByRole('button', { name: 'Turn sound on' }).click();
  await expect(firstVideo).toHaveJSProperty('muted', false);

  await firstVideo.dblclick({ position: { x: 160, y: 270 } });
  const tapHeart = slides.first().getByTestId('reel-double-tap-heart');
  await expect(tapHeart).toBeVisible();
  const [videoBox, heartBox] = await Promise.all([firstVideo.boundingBox(), tapHeart.boundingBox()]);
  expect(Math.abs((heartBox?.x || 0) + (heartBox?.width || 0) / 2 - ((videoBox?.x || 0) + 160))).toBeLessThan(3);
  expect(Math.abs((heartBox?.y || 0) + (heartBox?.height || 0) / 2 - ((videoBox?.y || 0) + 270))).toBeLessThan(3);
  await expect(tapHeart).toHaveCSS('color', 'rgb(255, 64, 87)');
  await expect.poll(() => likeRequests).toBe(1);
  await expect(slides.first().getByRole('button', { name: 'Unlike Reel' })).toBeVisible();

  const speedZoneBox = await slides.first().getByTestId('reel-speed-zone-left').boundingBox();
  await page.mouse.move((speedZoneBox?.x || 0) + 30, (speedZoneBox?.y || 0) + 300);
  await page.mouse.down();
  await expect.poll(() => firstVideo.evaluate((video) => video.playbackRate)).toBe(2);
  await expect(page.getByText('2× speed')).toBeVisible();
  await page.mouse.up();
  await expect.poll(() => firstVideo.evaluate((video) => video.playbackRate)).toBe(1);

  await feed.evaluate((element) => element.scrollTo({ top: window.innerHeight, behavior: 'instant' }));
  await expect.poll(() => secondVideo.getAttribute('data-e2e-playing')).toBe('true');
  await expect.poll(() => firstVideo.getAttribute('data-e2e-playing')).toBe('false');

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileVideoBox = await secondVideo.boundingBox();
  expect(mobileVideoBox?.width).toBeGreaterThanOrEqual(389);
  expect(mobileVideoBox?.height).toBeGreaterThanOrEqual(843);

  await page.setViewportSize({ width: 1366, height: 900 });
  const desktopVideoBox = await secondVideo.boundingBox();
  expect(desktopVideoBox?.height).toBeGreaterThanOrEqual(899);
  expect(desktopVideoBox?.width).toBeGreaterThanOrEqual(500);
  expect(desktopVideoBox?.width).toBeLessThan(510);
});
