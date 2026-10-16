import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRobotsTxt, buildSitemapXml, PRIVATE_PATH_PREFIXES, resolveSiteUrl } from './scripts/vite-seo-plugin.mjs';
import { INDEXABLE_ROUTES, NOT_FOUND_META, SEO_ROUTES, STATIC_ROUTE_PATHS, resolveSeoRoute } from './src/utils/seoRoutes.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const siteUrl = 'https://example.test';

test('vercel.json answers fixed paths directly and never rewrites everything', () => {
  const config = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));
  assert.equal(config.cleanUrls, true);
  assert.ok(Array.isArray(config.rewrites) && config.rewrites.length > 0);
  for (const rewrite of config.rewrites) {
    assert.equal(rewrite.destination, '/index');
    assert.notEqual(rewrite.source, '/(.*)');
  }
  const sources = config.rewrites.map((rewrite) => rewrite.source).join(' ');
  assert.match(sources, /\/post\//);
  assert.match(sources, /\/profile\//);
  assert.match(sources, /\/groups\//);
});

test('robots.txt disallows private areas, allows public ones, and points to the sitemap', () => {
  const robots = buildRobotsTxt(siteUrl);
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, new RegExp(`Sitemap: ${siteUrl}/sitemap\\.xml`));
  for (const prefix of PRIVATE_PATH_PREFIXES) {
    assert.ok(robots.includes(`Disallow: ${prefix}`), `robots.txt must disallow ${prefix}`);
  }
  assert.ok(!robots.includes('Disallow: /\n'), 'robots.txt must not block the whole site');
  for (const route of INDEXABLE_ROUTES) {
    if (route.path === '/') continue;
    assert.ok(!PRIVATE_PATH_PREFIXES.some((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`)), `indexable route ${route.path} must not be disallowed`);
  }
});

test('sitemap lists exactly the indexable routes under the configured site URL', () => {
  const sitemap = buildSitemapXml(siteUrl, '2026-10-16');
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, INDEXABLE_ROUTES.map((route) => `${siteUrl}${route.path === '/' ? '/' : route.path}`));
  for (const privatePrefix of PRIVATE_PATH_PREFIXES) {
    assert.ok(!sitemap.includes(`${siteUrl}${privatePrefix}`), `sitemap must not contain ${privatePrefix}`);
  }
});

test('every emitted static route file has a known route with metadata', () => {
  for (const routePath of STATIC_ROUTE_PATHS) {
    const route = resolveSeoRoute(routePath);
    assert.ok(route, `no metadata for static route ${routePath}`);
    assert.ok(route.title.length > 0 && route.description.length > 0);
  }
});

test('dynamic routes keep working while private routes stay noindex', () => {
  assert.equal(resolveSeoRoute('/profile/edit').path, '/profile/edit');
  assert.equal(resolveSeoRoute('/profile/edit').indexable, false);
  assert.equal(resolveSeoRoute('/profile/507f1f77bcf86cd799439011').path, '/profile/:id');
  assert.equal(resolveSeoRoute('/profile/507f1f77bcf86cd799439011').indexable, false);
  assert.equal(resolveSeoRoute('/post/507f1f77bcf86cd799439011').path, '/post/:id');
  assert.equal(resolveSeoRoute('/somewhere-else'), null);
  assert.equal(NOT_FOUND_META.indexable, false);
  for (const route of SEO_ROUTES) {
    if (route.indexable) continue;
    assert.ok(route.path !== '/', 'the landing page must stay indexable');
  }
});

test('index.html ships complete social metadata with the site URL placeholder', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  for (const marker of [
    'property="og:type"',
    'property="og:url"',
    'property="og:image"',
    'property="og:image:width" content="1200"',
    'property="og:image:height" content="630"',
    'name="twitter:card" content="summary_large_image"',
    'name="twitter:image"',
  ]) {
    assert.ok(html.includes(marker), `index.html is missing ${marker}`);
  }
  assert.ok(html.includes('__SITE_URL__/share-card.png'), 'index.html must reference the generated share card');
  assert.ok(fs.existsSync(path.join(rootDir, 'public', 'share-card.png')), 'public/share-card.png must exist');
});

test('site URL normalization strips trailing slashes', () => {
  assert.equal(resolveSiteUrl('https://example.test/'), 'https://example.test');
  assert.equal(resolveSiteUrl(''), 'https://nexora-lac-three.vercel.app');
});
