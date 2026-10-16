import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { NOT_FOUND_META, OG_IMAGE_ALT, OG_IMAGE_PATH, SITE_URL, resolveSeoRoute } from '../utils/seoRoutes';

const upsertMeta = (attribute, key, content) => {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const upsertCanonical = (href) => {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
};

const removeCanonical = () => {
  const link = document.head.querySelector('link[rel="canonical"]');
  if (link) link.remove();
};

// Applies per-route titles, descriptions, canonical URLs, robots directives,
// and social metadata after navigation. Search engines and link preview
// crawlers see the site-level defaults from index.html until this runs.
const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = resolveSeoRoute(pathname) || NOT_FOUND_META;
    const cleanPath = pathname.replace(/\/+$/, '') || '/';
    const pageUrl = `${SITE_URL}${cleanPath === '/' ? '/' : cleanPath}`;
    const imageUrl = `${SITE_URL}${OG_IMAGE_PATH}`;

    document.title = route.title;
    upsertMeta('name', 'description', route.description);

    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', 'Vuprise');
    upsertMeta('property', 'og:title', route.title);
    upsertMeta('property', 'og:description', route.description);
    upsertMeta('property', 'og:url', pageUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', OG_IMAGE_ALT);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', route.title);
    upsertMeta('name', 'twitter:description', route.description);
    upsertMeta('name', 'twitter:image', imageUrl);
    upsertMeta('name', 'twitter:image:alt', OG_IMAGE_ALT);

    if (route.indexable) {
      upsertMeta('name', 'robots', 'index, follow');
      upsertCanonical(pageUrl);
    } else {
      upsertMeta('name', 'robots', 'noindex, nofollow');
      removeCanonical();
    }
  }, [pathname]);

  return null;
};

export default RouteMeta;
