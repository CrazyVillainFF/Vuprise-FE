// Single source of truth for per-route SEO metadata. Shared by the runtime
// RouteMeta component (client) and the build-time SEO plugin (Node), so the
// sitemap, static route files, and browser metadata can never drift apart.

export const FALLBACK_SITE_URL = 'https://nexora-lac-three.vercel.app';

const readViteSiteUrl = () => {
  try {
    return (import.meta && import.meta.env && import.meta.env.VITE_SITE_URL) || '';
  } catch {
    return '';
  }
};

export const SITE_URL = (readViteSiteUrl() || FALLBACK_SITE_URL).replace(/\/+$/, '');

export const SITE_NAME = 'Vuprise';
export const DEFAULT_DESCRIPTION = 'Vuprise is a professional network to share what you’re building, find your people, and make meaningful connections.';
export const OG_IMAGE_PATH = '/share-card.png';
export const OG_IMAGE_ALT = 'Vuprise wordmark and tagline on a dark gradient background';

// Titles stay under ~60 characters and descriptions under ~160 where possible.
// indexable: true entries are allowed in robots.txt/sitemap and receive a
// self-referencing canonical. Everything else is noindex and excluded.
export const SEO_ROUTES = [
  {
    path: '/',
    title: 'Vuprise | A network for what’s next',
    description: DEFAULT_DESCRIPTION,
    indexable: true,
  },
  {
    path: '/faq',
    title: 'FAQ | Vuprise',
    description: 'Answers about Vuprise accounts, privacy, messaging, reporting, and account deletion.',
    indexable: true,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | Vuprise',
    description: 'What Vuprise collects, how it is used and shared, and the choices you have over your data.',
    indexable: true,
  },
  {
    path: '/support/request',
    title: 'Request Support | Vuprise',
    description: 'Report a problem, appeal a restriction, or ask the Vuprise team for help. No sign-in required.',
    indexable: true,
  },
  {
    path: '/satisfied-games',
    title: 'Satisfied Games | Vuprise',
    description: 'A small Vuprise experiment: a quick, playful break for people who build things on the internet.',
    indexable: true,
  },
  { path: '/signin', title: 'Sign in | Vuprise', description: 'Sign in to your Vuprise account.', indexable: false },
  { path: '/signup', title: 'Join Vuprise', description: 'Create a Vuprise account.', indexable: false },
  { path: '/forgot-password', title: 'Reset your password | Vuprise', description: 'Request a password reset code for your Vuprise account.', indexable: false },
  { path: '/thank-you', title: 'Request received | Vuprise', description: 'Your message to the Vuprise team has been received.', indexable: false },
  { path: '/home', title: 'Home | Vuprise', description: 'Your Vuprise feed.', indexable: false },
  { path: '/reels', title: 'Reels | Vuprise', description: 'Short videos on Vuprise.', indexable: false },
  { path: '/messages', title: 'Messages | Vuprise', description: 'Your Vuprise conversations.', indexable: false },
  { path: '/groups', title: 'Groups | Vuprise', description: 'Your Vuprise groups.', indexable: false },
  { path: '/post/:id', title: 'Post | Vuprise', description: 'A post on Vuprise.', indexable: false },
  { path: '/profile/edit', title: 'Edit profile | Vuprise', description: 'Edit your Vuprise profile.', indexable: false },
  { path: '/profile/:id', title: 'Profile | Vuprise', description: 'A member profile on Vuprise.', indexable: false },
  { path: '/people', title: 'People | Vuprise', description: 'Discover people on Vuprise.', indexable: false },
  { path: '/search', title: 'Search | Vuprise', description: 'Search Vuprise.', indexable: false },
  { path: '/notifications', title: 'Notifications | Vuprise', description: 'Your Vuprise notifications.', indexable: false },
  { path: '/settings', title: 'Settings | Vuprise', description: 'Manage your Vuprise account settings.', indexable: false },
  { path: '/admin', title: 'Admin | Vuprise', description: 'Vuprise administration.', indexable: false },
];

export const NOT_FOUND_META = {
  path: '/404',
  title: 'Page not found | Vuprise',
  description: 'The page you requested could not be found on Vuprise.',
  indexable: false,
};

export const INDEXABLE_ROUTES = SEO_ROUTES.filter((route) => route.indexable);

// Fixed paths (no parameters) get their own HTML file at build time so the
// deployment can answer them directly with a 200 instead of a catch-all rewrite.
export const STATIC_ROUTE_PATHS = SEO_ROUTES
  .filter((route) => !route.path.includes(':'))
  .map((route) => route.path);

const segmentMatch = (pattern, pathname) => {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) return false;
  return patternSegments.every((segment, index) => segment.startsWith(':') || segment.toLowerCase() === pathSegments[index].toLowerCase());
};

export const resolveSeoRoute = (pathname = '/') => {
  const clean = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  return SEO_ROUTES.find((route) => route.path === clean)
    || SEO_ROUTES.find((route) => segmentMatch(route.path, clean))
    || null;
};
