import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const PublishingContext = createContext(null);

export const PublishingProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const dismissTimerRef = useRef(null);

  const startPublishing = useCallback((details) => {
    window.clearTimeout(dismissTimerRef.current);
    setStatus({ visible: true, expanded: false, stage: 'preparing', progress: null, ...details });
  }, []);
  const updatePublishing = useCallback((updates) => {
    setStatus((current) => current ? { ...current, ...updates, visible: true } : current);
  }, []);
  const completePublishing = useCallback(() => {
    setStatus((current) => current ? { ...current, stage: 'published', progress: 100, message: 'Your post is live.', retry: null, visible: true } : current);
    window.clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = window.setTimeout(() => setStatus((current) => current?.stage === 'published' ? null : current), 7000);
  }, []);
  const failPublishing = useCallback((message, retry) => {
    window.clearTimeout(dismissTimerRef.current);
    setStatus((current) => current ? { ...current, stage: 'failed', message, retry, visible: true } : current);
  }, []);
  const dismissPublishing = useCallback(() => setStatus((current) => current ? { ...current, visible: false } : current), []);
  const toggleExpanded = useCallback(() => setStatus((current) => current ? { ...current, expanded: !current.expanded } : current), []);

  useEffect(() => () => window.clearTimeout(dismissTimerRef.current), []);

  return (
    <PublishingContext.Provider value={{ status, startPublishing, updatePublishing, completePublishing, failPublishing, dismissPublishing, toggleExpanded }}>
      {children}
    </PublishingContext.Provider>
  );
};

export const usePublishing = () => {
  const context = useContext(PublishingContext);
  if (!context) throw new Error('usePublishing must be used within a PublishingProvider');
  return context;
};
