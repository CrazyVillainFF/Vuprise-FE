import { CONSENT_EVENT, readConsent } from './consent';

// GA4 loads only after an explicit analytics opt-in. When no measurement ID is
// configured the whole module is inert and nothing is requested from Google.
export const GA_MEASUREMENT_ID = String(import.meta.env.VITE_GA4_MEASUREMENT_ID || '').trim();

export const isAnalyticsConfigured = () => /^G-[A-Z0-9]{4,}$/i.test(GA_MEASUREMENT_ID)
  && !/^G-X+$/i.test(GA_MEASUREMENT_ID);

let initialized = false;
let lastTrackedPath = null;

const disableKey = () => `ga-disable-${GA_MEASUREMENT_ID}`;

const analyticsAllowed = () => {
  if (!isAnalyticsConfigured()) return false;
  if (typeof window !== 'undefined' && window[disableKey()] === true) return false;
  return readConsent()?.analytics === true;
};

export const initAnalytics = () => {
  if (initialized || !analyticsAllowed()) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.appendChild(script);
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
  initialized = true;
};

export const trackPageView = (path) => {
  if (!initialized || !analyticsAllowed()) return;
  const cleanPath = path || '/';
  if (cleanPath === lastTrackedPath) return;
  lastTrackedPath = cleanPath;
  window.gtag('event', 'page_view', {
    page_path: cleanPath,
    page_location: window.location.href,
    page_title: document.title,
  });
};

export const teardownAnalytics = () => {
  if (!isAnalyticsConfigured()) return;
  // The GA opt-out flag stops any further collection without unloading the
  // script; the page reloads on explicit consent changes elsewhere.
  window[disableKey()] = true;
  lastTrackedPath = null;
};

// Keeps the module in sync with storage changes made in this tab (the consent
// banner dispatches CONSENT_EVENT) so callers only need to import this file.
if (typeof window !== 'undefined') {
  window.addEventListener(CONSENT_EVENT, (event) => {
    if (event.detail?.analytics) {
      window[disableKey()] = false;
      initAnalytics();
      trackPageView(window.location.pathname);
    } else {
      teardownAnalytics();
    }
  });
}
