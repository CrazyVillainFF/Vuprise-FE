import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { groupAPI, messageAPI, notificationAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessagesByConversation, setUnreadMessagesByConversation] = useState({});
  const [incomingToast, setIncomingToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedNotifications = useRef(false);
  const notificationSnapshot = useRef(null);
  const unreadMessageSnapshot = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      hasLoadedNotifications.current = false;
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      setIncomingToast(null);
      notificationSnapshot.current = null;
      setError('');
      return;
    }

    try {
      if (!hasLoadedNotifications.current) setLoading(true);
      const res = await notificationAPI.getNotifications();
      if (res.data.success) {
        const nextNotifications = res.data.notifications || [];
        const previousIds = notificationSnapshot.current;
        if (previousIds) {
          const newest = nextNotifications.find((item) => !item.read && !previousIds.has(String(item._id)));
          if (newest) {
            setIncomingToast({
              id: `alert-${newest._id}`,
              kind: 'alert',
              title: newest.sender?.name || 'Vuprise',
              body: newest.message || 'You have a new notification.',
              avatar: newest.sender?.profilePicture || '',
            });
          }
        }
        notificationSnapshot.current = new Set(nextNotifications.map((item) => String(item._id)));
        setNotifications(nextNotifications);
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
      unreadMessageSnapshot.current = null;
      return;
    }
    try {
      const [response, groupResponse] = await Promise.all([
        messageAPI.getConversations(),
        groupAPI.list().catch(() => ({ data: { groups: [] } })),
      ]);
      const conversations = response.data.conversations || [];
      const groups = groupResponse.data.groups || [];
      const unread = Object.fromEntries([
        ...conversations.map((conversation) => [String(conversation._id), conversation.unreadCount || 0]),
        ...groups.map((group) => [`group:${group._id}`, group.unreadCount || 0]),
      ]);
      const previous = unreadMessageSnapshot.current;
      if (previous) {
        const incoming = [
          ...conversations.filter((conversation) => (
            conversation.unreadCount > (previous[String(conversation._id)] || 0) &&
            String(conversation.lastMessage?.sender?._id || conversation.lastMessage?.sender || '') !== String(user?._id || '')
          )).map((conversation) => ({
            ...conversation,
            senderName: conversation.peer?.name || 'New message',
            toastTitle: conversation.peer?.name || 'New message',
            toastBody: 'Sent you a message',
          })),
          ...groups.filter((group) => (
            group.unreadCount > (previous[`group:${group._id}`] || 0) &&
            String(group.lastMessage?.sender?._id || group.lastMessage?.sender || '') !== String(user?._id || '')
          )).map((group) => ({
            ...group,
            _id: `group:${group._id}`,
            toastTitle: group.lastMessage?.sender?.name || group.name || 'New group message',
            toastBody: `New message in ${group.name || 'a group'}`,
            toastAvatar: group.lastMessage?.sender?.profilePicture || group.photo || '',
          })),
        ]
          .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
        if (incoming.length) {
          const newest = incoming[0];
          const addedCount = incoming.reduce((total, conversation) => (
            total + conversation.unreadCount - (previous[String(conversation._id)] || 0)
          ), 0);
          setIncomingToast({
            id: `message-${newest._id}-${newest.lastMessage?._id || Date.now()}`,
            kind: 'message',
            title: newest.toastTitle,
            body: addedCount > 1 ? `You have ${addedCount} new messages` : newest.toastBody,
            avatar: newest.toastAvatar || newest.peer?.profilePicture || '',
          });
        }
      }
      unreadMessageSnapshot.current = unread;
      setUnreadMessagesByConversation(unread);
    } catch (err) {
      console.error('[Messages] Failed to load unread count:', err.message);
    }
  }, [isAuthenticated, user?._id]);

  const markConversationMessagesRead = useCallback((conversationId) => {
    setUnreadMessagesByConversation((current) => {
      const id = String(conversationId);
      if (!current[id]) return current;
      return { ...current, [id]: 0 };
    });
  }, []);

  const markGroupMessagesRead = useCallback((groupId) => {
    setUnreadMessagesByConversation((current) => ({ ...current, [`group:${groupId}`]: 0 }));
  }, []);

  const dismissIncomingToast = useCallback(() => setIncomingToast(null), []);

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
        unreadMessagesByConversation,
        incomingToast,
        dismissIncomingToast,
        loading,
        error,
        clearError: () => setError(''),
        fetchNotifications,
        fetchUnreadMessages,
        markConversationMessagesRead,
        markGroupMessagesRead,
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
