// Consent state for non-essential scripts (currently only analytics).
// Essential storage (session token, theme, drafts) does not need consent and
// is intentionally not controlled here.

export const CONSENT_STORAGE_KEY = 'vuprise_consent_v1';
export const CONSENT_EVENT = 'vuprise-consent-changed';
export const OPEN_CONSENT_EVENT = 'vuprise-open-consent';

export const readConsent = () => {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.analytics !== 'boolean') return null;
    return { version: 1, essential: true, analytics: parsed.analytics, updatedAt: parsed.updatedAt || null };
  } catch {
    return null;
  }
};

export const writeConsent = (analytics) => {
  const consent = { version: 1, essential: true, analytics: Boolean(analytics), updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  } catch {
    // Storage unavailable (private mode); the choice applies for this page view only.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: consent }));
  return consent;
};

export const openConsentPreferences = () => {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
};
