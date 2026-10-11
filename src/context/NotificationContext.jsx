import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { messageAPI, notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesByConversation, setUnreadMessagesByConversation] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedNotifications = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      hasLoadedNotifications.current = false;
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      setError('');
      return;
    }

    try {
      if (!hasLoadedNotifications.current) setLoading(true);
      const res = await notificationAPI.getNotifications();
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
        setError('');
        hasLoadedNotifications.current = true;
      }
    } catch (err) {
      console.error('[Notifications] Failed to load:', err.message);
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchUnreadMessages = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadMessagesByConversation({});
      return;
    }
    try {
      const response = await messageAPI.getConversations();
      const unread = Object.fromEntries((response.data.conversations || [])
        .filter((conversation) => conversation.unreadCount > 0)
        .map((conversation) => [String(conversation._id), conversation.unreadCount]));
      setUnreadMessagesByConversation(unread);
    } catch (err) {
      console.error('[Messages] Failed to load unread count:', err.message);
    }
  }, [isAuthenticated]);

  const markConversationMessagesRead = useCallback((conversationId) => {
    setUnreadMessagesByConversation((current) => {
      const id = String(conversationId);
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll every 30 seconds if authenticated
    if (isAuthenticated) {
      const interval = setInterval(fetchNotifications, 15000);
      const refreshOnFocus = () => { if (document.visibilityState === 'visible') fetchNotifications(); };
      const refreshOnRequest = () => fetchNotifications();
      document.addEventListener('visibilitychange', refreshOnFocus);
      window.addEventListener('nexora:notifications-refresh', refreshOnRequest);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', refreshOnFocus);
        window.removeEventListener('nexora:notifications-refresh', refreshOnRequest);
      };
    }
  }, [fetchNotifications, isAuthenticated]);

  useEffect(() => {
    fetchUnreadMessages();
    if (isAuthenticated) {
      const interval = setInterval(fetchUnreadMessages, 15000);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadMessages, isAuthenticated]);

  const unreadMessageCount = Object.values(unreadMessagesByConversation)
    .reduce((total, count) => total + count, 0);

  const markAsRead = async (id) => {
    try {
      const res = await notificationAPI.markAsRead(id);
      if (res.data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        setUnreadCount(res.data.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('[Notification] Error marking as read:', err.message);
      setError(err.message || 'Could not update this notification.');
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await notificationAPI.markAllAsRead();
      if (res.data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(res.data.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('[Notification] Error marking all as read:', err.message);
      setError(err.message || 'Could not mark notifications as read.');
    }
  };

  const deleteNotification = async (id) => {
    try {
      const res = await notificationAPI.deleteNotification(id);
      if (res.data.success) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setUnreadCount(res.data.unreadCount ?? 0);
      }
    } catch (err) {
      console.error('[Notification] Error deleting notification:', err.message);
      setError(err.message || 'Could not remove this notification.');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        unreadMessageCount,
        loading,
        error,
        clearError: () => setError(''),
        fetchNotifications,
        fetchUnreadMessages,
        markConversationMessagesRead,
        markAsRead,
        markAllAsRead,
        deleteNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
