import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../utils/analytics';

// Records SPA navigations as GA4 page views, but only while analytics is both
// configured and consented to (trackPageView is a no-op otherwise).
const AnalyticsRouteTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
};

export default AnalyticsRouteTracker;
