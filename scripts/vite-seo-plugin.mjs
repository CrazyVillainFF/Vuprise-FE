import fs from 'node:fs';
import path from 'node:path';
import { FALLBACK_SITE_URL, INDEXABLE_ROUTES, STATIC_ROUTE_PATHS } from '../src/utils/seoRoutes.js';

// Path prefixes that must never be indexed or listed in the sitemap.
export const PRIVATE_PATH_PREFIXES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/thank-you',
  '/home',
  '/reels',
  '/messages',
  '/groups',
  '/people',
  '/search',
  '/notifications',
  '/settings',
  '/admin',
  '/profile',
  '/post',
];

export const resolveSiteUrl = (candidate) => (candidate || FALLBACK_SITE_URL).trim().replace(/\/+$/, '');

export const buildRobotsTxt = (siteUrl) => [
  'User-agent: *',
  'Allow: /',
  ...PRIVATE_PATH_PREFIXES.map((prefix) => `Disallow: ${prefix}`),
  '',
  `Sitemap: ${siteUrl}/sitemap.xml`,
  '',
].join('\n');

export const buildSitemapXml = (siteUrl, lastmod = new Date().toISOString().slice(0, 10)) => {
  const urls = INDEXABLE_ROUTES.map((route) => [
    '  <url>',
    `    <loc>${siteUrl}${route.path === '/' ? '/' : route.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '  </url>',
  ].join('\n')).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
};

const htmlResponse = (res, statusCode, filePath, method) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
};

const sendText = (res, contentType, body, method) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.end(method === 'HEAD' ? undefined : body);
};

// The generated files (robots, sitemap, per-route HTML, 404 HTML) replace the
// previous catch-all rewrite: unknown paths now answer with a real 404 status
// and fixed paths answer with a real 200 without executing the SPA first.
export default function seoPlugin(pluginOptions = {}) {
  let siteUrl = resolveSiteUrl(pluginOptions.siteUrl || process.env.VITE_SITE_URL);
  let outDir = path.resolve(process.cwd(), 'dist');

  const serveGenerated = (req, res, next) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/robots.txt') return sendText(res, 'text/plain; charset=utf-8', buildRobotsTxt(siteUrl), req.method);
    if (url === '/sitemap.xml') return sendText(res, 'application/xml; charset=utf-8', buildSitemapXml(siteUrl), req.method);
    return next();
  };

  const serveBuiltRoutes = (req, res, next) => {
    const url = (req.url || '/').split('?')[0];
    const cleanPath = url.replace(/\/+$/, '') || '/';
    if (cleanPath === '/' || req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (/\.\w{1,8}$/.test(cleanPath)) return next();
    if (cleanPath.startsWith('/api') || cleanPath.startsWith('/uploads') || cleanPath.startsWith('/@')) return next();
    const relative = cleanPath.replace(/^\/+/, '');
    const candidates = [
      path.join(outDir, `${relative}.html`),
      path.join(outDir, relative, 'index.html'),
    ];
    const match = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (match) return htmlResponse(res, 200, match, req.method);
    // Dynamic deep links are SPA-served in production by the scoped rewrites
    // in vercel.json; mirror that here instead of answering 404.
    if (['/post/', '/profile/', '/groups/'].some((prefix) => cleanPath.startsWith(prefix))) return next();
    const notFound = path.join(outDir, '404.html');
    if (fs.existsSync(notFound)) return htmlResponse(res, 404, notFound, req.method);
    return next();
  };

  return {
    name: 'vuprise-seo',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', siteUrl);
    },
    configureServer(server) {
      server.middlewares.use(serveGenerated);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveGenerated);
      server.middlewares.use(serveBuiltRoutes);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobotsTxt(siteUrl) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemapXml(siteUrl) });
    },
    // Route HTML copies are written after the bundle lands on disk. The
    // built index.html is the source of truth because Vite finalizes it
    // after user generateBundle hooks have run.
    closeBundle() {
      const indexPath = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;
      const html = fs.readFileSync(indexPath, 'utf8').replaceAll('__SITE_URL__', siteUrl);
      const writeIfChanged = (filePath) => {
        const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
        if (previous !== html) fs.writeFileSync(filePath, html);
      };
      // Unknown paths are answered by the host with this file and a 404 status.
      writeIfChanged(path.join(outDir, '404.html'));
      for (const routePath of STATIC_ROUTE_PATHS) {
        if (routePath === '/') continue;
        const target = path.join(outDir, `${routePath.replace(/^\/+/, '')}.html`);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        writeIfChanged(target);
      }
    },
  };
}
