import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, ButtonBase, Checkbox, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment, List,
  ListItem, ListItemButton, ListItemAvatar, ListItemText, Menu, MenuItem, Paper, Skeleton, Stack, TextField,
  Typography, useMediaQuery
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import EmojiPickerControl from '../components/EmojiPickerControl';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { groupAPI, messageAPI } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import { decryptMessage, getDeviceKeyPair } from '../utils/e2ee';
import { sortContactsByRecentConversations } from '../utils/messageInbox';
import { getBrandedHeadline } from '../utils/brandCopy';
import Badge from '@mui/material/Badge';
import TypingIndicator from '../components/TypingIndicator';
import { sendTyping, subscribeRealtime, watchPresence } from '../services/realtime';
import GroupChatPanel from './GroupChatPage';

const formatTimestamp = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
const formatConversationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

const MessagesPage = () => {
  const { user } = useAuth();
  const { markConversationMessagesRead } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = user?._id;
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('New Group');
  const [groupAboutDraft, setGroupAboutDraft] = useState('Welcome Everyone');
  const [groupIconFile, setGroupIconFile] = useState(null);
  const [groupIconPreview, setGroupIconPreview] = useState('');
  const [groupDialogError, setGroupDialogError] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [active, setActive] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState('');
  const [privateKey, setPrivateKey] = useState(null);
  const [ownSigningPublicKey, setOwnSigningPublicKey] = useState('');
  const [backupPrompt, setBackupPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [chatMenu, setChatMenu] = useState(null);
  const [chatToEdit, setChatToEdit] = useState(null);
  const [chatNameDraft, setChatNameDraft] = useState('');
  const [chatToDelete, setChatToDelete] = useState(null);
  const [chatActionLoading, setChatActionLoading] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [messageEditDraft, setMessageEditDraft] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [messageActionLoading, setMessageActionLoading] = useState(false);
  const [presenceByUser, setPresenceByUser] = useState({});
  const [typingByScope, setTypingByScope] = useState({});
  const bottomRef = useRef(null);
  const searchRef = useRef(null);
  const composerInputRef = useRef(null);
  const legacySyncsRef = useRef(new Set());
  const legacyTextCacheRef = useRef(new Map());
  const legacyDecryptPromisesRef = useRef(new Map());
  const selectedConversationId = useRef(null);
  const messageRequestId = useRef(0);
  const openRequestId = useRef(0);
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);
  const groupSelectionHandled = useRef('');
  const imageInputRef = useRef(null);
  const groupIconInputRef = useRef(null);
  const typingRef = useRef({ scopeId: '', timer: null });

  const stopTyping = useCallback(() => {
    const typing = typingRef.current;
    if (typing.timer) window.clearTimeout(typing.timer);
    if (typing.scopeId) sendTyping('conversation', typing.scopeId, false);
    typingRef.current = { scopeId: '', timer: null };
  }, []);

  const updateDraft = useCallback((text) => {
    setDraft(text);
    const scopeId = active?._id;
    if (!scopeId || !text.trim()) { stopTyping(); return; }
    if (typingRef.current.scopeId !== scopeId) {
      stopTyping();
      typingRef.current.scopeId = scopeId;
      sendTyping('conversation', scopeId, true);
    }
    if (typingRef.current.timer) window.clearTimeout(typingRef.current.timer);
    typingRef.current.timer = window.setTimeout(stopTyping, 1400);
  }, [active?._id, stopTyping]);

  useEffect(() => () => stopTyping(), [stopTyping]);

  useEffect(() => subscribeRealtime((event) => {
    if (event.type === 'presence') setPresenceByUser((current) => ({ ...current, [event.userId]: event.state }));
    if (event.type === 'typing') setTypingByScope((current) => {
      const key = `${event.scopeType}:${event.scopeId}`;
      const next = { ...(current[key] || {}) };
      if (event.active) next[event.userId] = { name: event.name };
      else delete next[event.userId];
      return { ...current, [key]: next };
    });
  }), []);

  const presenceTargets = useMemo(() => [
    ...contacts.map((contact) => contact._id),
    ...conversations.map((conversation) => conversation.peer?._id),
    ...groups.flatMap((group) => (group.members || []).map((member) => member.user?._id || member.user)),
  ].filter(Boolean), [contacts, conversations, groups]);
  useEffect(() => { watchPresence(presenceTargets); }, [presenceTargets]);

  useEffect(() => {
    if (!attachment) { setAttachmentPreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(attachment);
    setAttachmentPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [attachment]);

  useEffect(() => {
    if (!groupIconFile) { setGroupIconPreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(groupIconFile);
    setGroupIconPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [groupIconFile]);

  useEffect(() => {
    const requestedGroupId = searchParams.get('group');
    if (!requestedGroupId || loading || !groups.length) return;
    if (groupSelectionHandled.current === requestedGroupId) return;
    const matchingGroup = groups.find((group) => String(group._id) === String(requestedGroupId));
    if (matchingGroup) {
      groupSelectionHandled.current = requestedGroupId;
      setActive(null);
      setActiveGroup(matchingGroup);
      selectedConversationId.current = null;
      setMessages([]);
    }
  }, [groups, loading, searchParams]);

  const openChatActions = (contact, conversation, anchorEl, anchorPosition) => {
    if (!conversation) return;
    setChatMenu({ contact, conversation, anchorEl, anchorPosition });
  };
  const clearLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };
  const beginLongPress = (event, contact, conversation) => {
    if (!conversation) return;
    clearLongPress();
    longPressTriggered.current = false;
    const touch = event.touches?.[0];
    if (!touch) return;
    const anchorPosition = { top: touch.clientY, left: touch.clientX };
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      openChatActions(contact, conversation, null, anchorPosition);
    }, 550);
  };

  const saveChatName = async () => {
    if (!chatToEdit) return;
    setChatActionLoading(true);
    try {
      const { data } = await messageAPI.updateConversationName(chatToEdit._id, chatNameDraft.trim());
      setConversations((existing) => existing.map((conversation) => (
        String(conversation._id) === String(chatToEdit._id) ? { ...conversation, displayName: data.displayName } : conversation
      )));
      setActive((current) => current && String(current._id) === String(chatToEdit._id)
        ? { ...current, displayName: data.displayName }
        : current);
      setChatToEdit(null);
    } catch (actionError) {
      setError(actionError.message || 'Could not update this chat name.');
    } finally {
      setChatActionLoading(false);
    }
  };

  const deleteChat = async () => {
    if (!chatToDelete) return;
    setChatActionLoading(true);
    try {
      await messageAPI.deleteConversation(chatToDelete._id);
      setConversations((existing) => existing.filter((conversation) => String(conversation._id) !== String(chatToDelete._id)));
      if (String(active?._id) === String(chatToDelete._id)) {
        selectedConversationId.current = null;
        setActive(null);
        setMessages([]);
      }
      setChatToDelete(null);
    } catch (actionError) {
      setError(actionError.message || 'Could not delete this chat.');
    } finally {
      setChatActionLoading(false);
    }
  };

  const closeGroupDialog = () => {
    if (creatingGroup) return;
    setGroupDialogOpen(false);
    setGroupNameDraft('New Group');
    setGroupAboutDraft('Welcome Everyone');
    setGroupIconFile(null);
    setGroupDialogError('');
    setSelectedGroupMembers([]);
  };

  const selectGroupIcon = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setGroupDialogError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'].includes(file.type)) {
      setGroupDialogError('Choose a JPEG, PNG, WEBP, or GIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setGroupDialogError('Group icons must be 10 MB or smaller.');
      return;
    }
    setGroupIconFile(file);
  };

  const createGroup = async (event) => {
    event.preventDefault();
    const name = groupNameDraft.trim() || 'New Group';
    const about = groupAboutDraft.trim() || 'Welcome Everyone';
    if (name.length < 2 || name.length > 80) {
      setGroupDialogError('Group name must be between 2 and 80 characters.');
      return;
    }
    setCreatingGroup(true);
    setGroupDialogError('');
    try {
      let payload = { name, about, memberIds: selectedGroupMembers };
      if (groupIconFile) {
        payload = new FormData();
        payload.append('name', name);
        payload.append('about', about);
        selectedGroupMembers.forEach((memberId) => payload.append('memberIds', memberId));
        payload.append('image', groupIconFile);
      }
      const response = await groupAPI.create(payload);
      const createdGroup = response.data.group;
      setGroups((existing) => [createdGroup, ...existing.filter((group) => String(group._id) !== String(createdGroup._id))]);
      setNotice(selectedGroupMembers.length
        ? 'Group created. Invitations were sent to the selected connections.'
        : 'Group created. You can invite accepted connections from group settings later.');
      setGroupDialogOpen(false);
      setGroupNameDraft('New Group');
      setGroupAboutDraft('Welcome Everyone');
      setGroupIconFile(null);
      setGroupDialogError('');
      setSelectedGroupMembers([]);
    } catch (createError) {
      setGroupDialogError(createError.message || 'Could not create the group. Please try again.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const editMessage = async () => {
    if (!active || !messageToEdit || !messageEditDraft.trim()) return;
    const conversationId = active._id;
    const messageId = messageToEdit._id;
    setMessageActionLoading(true);
    try {
      const { data } = await messageAPI.updateMessage(conversationId, messageId, messageEditDraft.trim());
      setMessages((existing) => existing.map((message) => (
        String(message._id) === String(messageId)
          ? { ...message, text: data.message.text, updatedAt: data.message.updatedAt, editedAt: data.message.editedAt }
          : message
      )));
      setMessageToEdit(null);
      setMessageEditDraft('');
      try {
        const response = await messageAPI.getConversations();
        setConversations(response.data.conversations || []);
      } catch {
        // Keep the edited bubble visible if inbox previews cannot refresh.
      }
    } catch (actionError) {
      setError(actionError.message || 'Could not edit this message.');
    } finally {
      setMessageActionLoading(false);
    }
  };

  const deleteMessage = async (scope) => {
    if (!active || !messageToDelete) return;
    const conversationId = active._id;
    const messageId = messageToDelete._id;
    setMessageActionLoading(true);
    try {
      const response = await messageAPI.deleteMessage(conversationId, messageId, scope);
      if (scope === 'me') setMessages((existing) => existing.filter((message) => String(message._id) !== String(messageId)));
      else setMessages((existing) => existing.map((message) => String(message._id) === String(messageId) ? response.data.message : message));
      setMessageToDelete(null);
      try {
        const response = await messageAPI.getConversations();
        setConversations(response.data.conversations || []);
      } catch {
        // Keep the message deleted locally even if inbox previews cannot refresh.
      }
    } catch (actionError) {
      setError(actionError.message || 'Could not delete this message.');
    } finally {
      setMessageActionLoading(false);
    }
  };

  const loadMessages = useCallback(async (conversationId, key, peerSigningPublicKey) => {
    if (!userId) return;
    const requestId = ++messageRequestId.current;
    try {
      const response = await messageAPI.getMessages(conversationId);
      const fetchedMessages = response.data.messages || [];
      if (requestId !== messageRequestId.current || selectedConversationId.current !== conversationId) return;
      markConversationMessagesRead(conversationId);
      const legacyMessages = fetchedMessages.filter((message) => (
        typeof message.text !== 'string' && !legacyTextCacheRef.current.has(String(message._id))
      ));
      setMessages(fetchedMessages.map((message) => (
        typeof message.text === 'string'
          ? { ...message, decryptError: false }
          : legacyTextCacheRef.current.has(String(message._id))
            ? { ...message, text: legacyTextCacheRef.current.get(String(message._id)), decryptError: false }
          : { ...message, text: key ? 'Decrypting older message…' : 'This older encrypted message is only available on the device where it was created.', decryptError: !key, pendingDecryption: Boolean(key) }
      )));
      setLoadingMessages(false);
      if (!key || legacyMessages.length === 0) return;

      const legacyToSync = [];
      const decryptedLegacy = await Promise.all(legacyMessages.map(async (message) => {
        const messageId = String(message._id);
        let decryptPromise = legacyDecryptPromisesRef.current.get(messageId);
        if (!decryptPromise) {
          const senderSigningKey = message.sender.toString() === userId.toString()
            ? ownSigningPublicKey
            : peerSigningPublicKey;
          decryptPromise = decryptMessage(message, userId, key, senderSigningKey)
            .then((text) => {
              legacyTextCacheRef.current.set(messageId, text);
              return { text, decryptError: false };
            })
            .catch(() => ({ text: 'Unable to decrypt on this device.', decryptError: true }))
            .finally(() => legacyDecryptPromisesRef.current.delete(messageId));
          legacyDecryptPromisesRef.current.set(messageId, decryptPromise);
        }
        const result = await decryptPromise;
        if (!result.decryptError) legacyToSync.push({ id: message._id, text: result.text });
        return { id: message._id, ...result, pendingDecryption: false };
      }));
      if (requestId !== messageRequestId.current || selectedConversationId.current !== conversationId) return;
      const decryptedById = new Map(decryptedLegacy.map((message) => [String(message.id), message]));
      setMessages((existing) => existing.map((message) => {
        const decryptedMessage = decryptedById.get(String(message._id));
        return decryptedMessage ? { ...message, ...decryptedMessage } : message;
      }));
      const unsynced = legacyToSync.filter(({ id }) => !legacySyncsRef.current.has(String(id)));
      if (unsynced.length) {
        unsynced.forEach(({ id }) => legacySyncsRef.current.add(String(id)));
        messageAPI.syncLegacyMessages(conversationId, unsynced).catch(() => {
          unsynced.forEach(({ id }) => legacySyncsRef.current.delete(String(id)));
        });
      }
    } catch (requestError) {
      if (requestId !== messageRequestId.current || selectedConversationId.current !== conversationId) return;
      setError(requestError.message || 'Unable to load this conversation.');
      setLoadingMessages(false);
    }
  }, [userId, ownSigningPublicKey, markConversationMessagesRead]);

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      try {
        setLoading(true);
        setError('');
        const [contactResponse, conversationResponse, groupResponse] = await Promise.all([
          messageAPI.getContacts(),
          messageAPI.getConversations(),
          groupAPI.list().catch(() => ({ data: { groups: [] } }))
        ]);
        if (cancelled) return;
        const nextContacts = contactResponse.data.contacts || [];
        setContacts(nextContacts);
        setConversations(conversationResponse.data.conversations || []);
        setGroups(groupResponse.data.groups || []);

        // Try the old local key only to display legacy encrypted history. New chats do not use it.
        let devicePairForPrompt = null;
        try {
          const devicePair = await getDeviceKeyPair(user._id);
          devicePairForPrompt = devicePair;
          if (!cancelled && devicePair) {
            setPrivateKey(devicePair.privateKey);
            setOwnSigningPublicKey(devicePair.serializedSigningPublicKey);
          }
        } catch {
          // Account-synced chats remain usable even when this browser has no local legacy key store.
        }
        try {
          const backupResponse = await messageAPI.getOwnKeyBackups();
          if (!cancelled) {
            const hasBackup = (backupResponse.data.backups || []).length > 0;
            const canCreateBackup = Boolean(devicePairForPrompt?.privateKey?.extractable && devicePairForPrompt?.signingPrivateKey?.extractable);
            setBackupPrompt(hasBackup && !devicePairForPrompt ? 'restore' : canCreateBackup && !hasBackup ? 'save' : '');
          }
        } catch {
          // The chat remains available even if backup status cannot be checked.
        }
      } catch (initializationError) {
        if (!cancelled) {
          const message = initializationError.message || 'Messages could not be loaded.';
          if (/not authorized|please sign in|session has expired|invalid authorization token/i.test(message)) {
            navigate('/signin', { replace: true, state: { from: { pathname: '/messages' } } });
            return;
          }
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (user?._id) initialize();
    return () => { cancelled = true; };
  }, [user?._id, navigate]);

  useEffect(() => {
    const selectedConversation = active;
    if (!selectedConversation) return undefined;
    loadMessages(selectedConversation._id, privateKey, selectedConversation.peer.encryptionSigningPublicKey);
    const interval = window.setInterval(async () => {
      loadMessages(selectedConversation._id, privateKey, selectedConversation.peer.encryptionSigningPublicKey);
      try {
        const response = await messageAPI.getConversations();
        if (selectedConversationId.current === selectedConversation._id) {
          setConversations(response.data.conversations || []);
        }
      } catch {
        // The open conversation remains usable if refreshing the inbox list fails.
      }
    }, 6000);
    return () => {
      window.clearInterval(interval);
      messageRequestId.current += 1;
    };
  }, [active, privateKey, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length]);

  const openConversation = useCallback(async (contact) => {
    stopTyping();
    setActiveGroup(null);
    groupSelectionHandled.current = '';
    setAttachment(null);
    if (searchParams.has('group')) setSearchParams({}, { replace: true });
    const requestId = ++openRequestId.current;
    const cachedConversation = conversations.find((conversation) => String(conversation.peer?._id) === String(contact._id));
    if (cachedConversation) {
      if (String(active?._id) === String(cachedConversation._id)) return;
      setError('');
      messageRequestId.current += 1;
      selectedConversationId.current = cachedConversation._id;
      setMessages([]);
      setLoadingMessages(true);
      setActive({ ...cachedConversation, peer: { ...contact, ...cachedConversation.peer } });
      return;
    }
    try {
      setError('');
      selectedConversationId.current = null;
      messageRequestId.current += 1;
      setActive(null);
      setMessages([]);
      setLoadingMessages(true);
      const response = await messageAPI.openConversation(contact._id);
      if (requestId !== openRequestId.current) return;
      setMessages([]);
      setLoadingMessages(true);
      const conversation = { ...response.data.conversation, peer: { ...contact, ...response.data.conversation.peer } };
      selectedConversationId.current = conversation._id;
      setActive(conversation);
    } catch (openError) {
      if (requestId !== openRequestId.current) return;
      setError(openError.message || 'Could not open this conversation.');
    }
  }, [active?._id, conversations, searchParams, setSearchParams, stopTyping]);

  const openGroupConversation = (group) => {
    stopTyping();
    setError('');
    setAttachment(null);
    setActive(null);
    setMessages([]);
    selectedConversationId.current = null;
    setActiveGroup(group);
    groupSelectionHandled.current = String(group._id);
    setSearchParams({ group: String(group._id) });
  };

  const closeGroupConversation = () => {
    stopTyping();
    setActiveGroup(null);
    groupSelectionHandled.current = '';
    setSearchParams({}, { replace: true });
  };

  const updateGroupInInbox = useCallback((nextGroup) => {
    setGroups((current) => current.map((group) => String(group._id) === String(nextGroup._id) ? nextGroup : group));
  }, []);

  const removeGroupFromInbox = useCallback((removedGroupId) => {
    setGroups((current) => current.filter((group) => String(group._id) !== String(removedGroupId)));
  }, []);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = (composerInputRef.current?.value ?? draft).trim();
    if ((!text && !attachment) || !active || sending) return;
    stopTyping();
    const activeConversation = active;
    const previousConversation = conversations.find((conversation) => conversation._id === activeConversation._id);
    const temporaryId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const sentAt = new Date().toISOString();
    const optimisticMessage = {
      _id: temporaryId,
      conversation: activeConversation._id,
      sender: user._id,
      text,
      imageUrl: attachmentPreview,
      createdAt: sentAt,
      readBy: [user._id],
      pending: true,
    };

    // Render immediately; confirm or roll back the bubble after the server responds.
    if (selectedConversationId.current === activeConversation._id) {
      setMessages((existing) => [...existing, optimisticMessage]);
    }
    setDraft('');
    if (composerInputRef.current) composerInputRef.current.value = '';
    setConversations((existing) => [
      { _id: activeConversation._id, peer: activeConversation.peer, lastMessageAt: sentAt, lastMessage: { sender: user._id, text: text || (attachment ? 'Photo' : ''), imageUrl: attachment ? attachmentPreview : '', createdAt: sentAt } },
      ...existing.filter((conversation) => conversation._id !== activeConversation._id)
    ]);
    try {
      setSending(true);
      setError('');
      let payload = { text };
      if (attachment) {
        payload = new FormData();
        payload.append('text', text);
        payload.append('image', attachment);
      }
      const response = await messageAPI.sendMessage(activeConversation._id, payload);
      const savedMessage = response.data.message;
      if (selectedConversationId.current === activeConversation._id) setMessages((existing) => {
        const withoutPendingOrDuplicate = existing.filter((message) => (
          message._id !== temporaryId && String(message._id) !== String(savedMessage._id)
        ));
        return [...withoutPendingOrDuplicate, savedMessage];
      });
      setAttachment(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    } catch (sendError) {
      if (selectedConversationId.current === activeConversation._id) {
        setMessages((existing) => existing.filter((message) => message._id !== temporaryId));
      }
      setConversations((existing) => previousConversation
        ? [previousConversation, ...existing.filter((conversation) => conversation._id !== activeConversation._id)]
        : existing.filter((conversation) => conversation._id !== activeConversation._id));
      setDraft((current) => current ? `${text}\n${current}`.slice(0, 5000) : text);
      setAttachment(attachment || null);
      setError(sendError.message || 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const orderedContacts = useMemo(() => {
    return sortContactsByRecentConversations(contacts, conversations);
  }, [contacts, conversations]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return orderedContacts;
    return orderedContacts.filter((contact) => `${contact.name || ''} ${contact.headline || ''}`.toLocaleLowerCase().includes(query));
  }, [orderedContacts, search]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matching = query
      ? groups.filter((group) => `${group.name || ''} ${group.about || ''}`.toLocaleLowerCase().includes(query))
      : groups;
    return matching.map((group, index) => ({ group, index }))
      .sort((a, b) => {
        const aTime = new Date(a.group.lastMessageAt || a.group.updatedAt || 0).getTime();
        const bTime = new Date(b.group.lastMessageAt || b.group.updatedAt || 0).getTime();
        return bTime - aTime || a.index - b.index;
      })
      .map(({ group }) => group);
  }, [groups, search]);

  const chatItems = useMemo(() => {
    const privateItems = filteredContacts.map((contact, index) => {
      const conversation = conversations.find((item) => String(item.peer?._id) === String(contact._id));
      return { type: 'private', contact, conversation, index, activity: conversation?.lastMessageAt || conversation?.lastMessage?.createdAt || null };
    });
    const groupItems = filteredGroups.map((group, index) => ({
      type: 'group', group, index,
      activity: group.lastMessageAt || group.lastMessage?.createdAt || group.updatedAt || null,
    }));
    return [...privateItems, ...groupItems].sort((a, b) => {
      if (!a.activity && !b.activity) return a.type === b.type ? a.index - b.index : a.type === 'group' ? -1 : 1;
      if (!a.activity) return 1;
      if (!b.activity) return -1;
      return new Date(b.activity).getTime() - new Date(a.activity).getTime();
    });
  }, [conversations, filteredContacts, filteredGroups]);

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleMessageImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Choose a JPEG, PNG, WEBP, or GIF image.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Images must be 10 MB or smaller.');
      event.target.value = '';
      return;
    }
    setError('');
    setAttachment(file);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper variant="outlined" sx={{ flex: 1, minHeight: { xs: 400, md: 520 }, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '360px minmax(0, 1fr)' }, overflow: 'hidden' }}>
          <Box sx={{ p: 2, borderRight: { md: 1 }, borderColor: 'divider' }}>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="rounded" height={42} sx={{ my: 2 }} />
            {[0, 1, 2, 3].map((item) => <Stack key={item} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.25 }}><Skeleton variant="circular" width={48} height={48} /><Box sx={{ flex: 1 }}><Skeleton variant="text" width="55%" /><Skeleton variant="text" width="80%" /></Box></Stack>)}
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'grid' }, placeItems: 'center' }}><Skeleton variant="circular" width={48} height={48} /></Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
      {backupPrompt && (
        <Alert
          severity="info"
          sx={{ mb: 1.5, py: 0, alignItems: 'center', '& .MuiAlert-message': { py: 0.75 } }}
          action={<Button color="inherit" size="small" onClick={() => navigate('/settings#message-backup')}>Setup</Button>}
        >{backupPrompt === 'restore' ? 'Restore your saved recovery backup for older encrypted messages in Settings.' : 'Save a recovery backup for older encrypted messages in Settings.'}</Alert>
      )}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: mobile && (active || activeGroup) ? 'minmax(0, 1fr)' : { xs: 'minmax(0, 1fr)', md: '360px minmax(0, 1fr)' },
          height: '100%',
          minHeight: { xs: 400, md: 520 },
          overflow: 'hidden',
          borderRadius: 3,
          bgcolor: 'background.paper',
        }}
      >
        {(!mobile || (!active && !activeGroup)) && (
          <Box sx={{ borderRight: { md: 1 }, borderColor: 'divider', minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, py: 1.75 }}>
              <Avatar src={user?.profilePicture} alt="" sx={{ width: 38, height: 38 }}>{user?.name?.[0] || 'N'}</Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography fontWeight={750} noWrap>{user?.name || 'Vuprise'}</Typography>
                <Typography variant="caption" color="text.secondary">Messages</Typography>
              </Box>
              <IconButton aria-label="Find a connection to message" onClick={() => searchRef.current?.focus()}>
                <EditNoteRoundedIcon />
              </IconButton>
              <IconButton aria-label="Create group" onClick={() => { setError(''); setGroupDialogError(''); setGroupNameDraft('New Group'); setGroupAboutDraft('Welcome Everyone'); setGroupIconFile(null); setGroupDialogOpen(true); }}>
                <GroupsRoundedIcon />
              </IconButton>
            </Stack>
            <Box sx={{ px: 1.5, pb: 1.25 }}>
              <TextField
                inputRef={searchRef}
                fullWidth
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats"
                slotProps={{ htmlInput: { 'aria-label': 'Search accepted connections' }, input: {
                  startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" color="action" /></InputAdornment>,
                }}}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5, bgcolor: 'action.hover' } }}
              />
            </Box>
            <Divider />
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={750}>Chats</Typography>
              <Typography variant="caption" color="text.secondary">{chatItems.length} {chatItems.length === 1 ? 'chat' : 'chats'}</Typography>
            </Stack>
            <Box sx={{ minHeight: 0, overflowY: 'auto', flex: 1 }}>
              {chatItems.length ? (
                <List disablePadding>
                  {chatItems.map((item) => {
                    if (item.type === 'group') {
                      const { group } = item;
                      const lastMessage = group.lastMessage;
                      const senderId = String(lastMessage?.sender?._id || lastMessage?.sender || '');
                      const senderName = senderId === String(user?._id) ? 'You' : lastMessage?.sender?.name || 'Member';
                      const groupSnippet = lastMessage?.deletedForEveryone ? 'This message was deleted' : lastMessage?.text || (lastMessage?.imageUrl ? 'Photo' : '');
                      const isGroupTyping = Object.keys(typingByScope[`group:${group._id}`] || {}).length > 0;
                      const groupPreview = isGroupTyping ? 'Typing…' : groupSnippet ? `${senderName}: ${groupSnippet}` : `${group.members?.length || 0} members`;
                      return (
                        <ListItem key={`group-${group._id}`} disablePadding>
                          <ListItemButton
                            selected={String(activeGroup?._id) === String(group._id)}
                            onClick={() => openGroupConversation(group)}
                            aria-label={`Open group chat ${group.name}`}
                            sx={{ minWidth: 0, minHeight: 76, px: 1.75, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' } }}
                          >
                            <ListItemAvatar sx={{ minWidth: 62 }}>
                              <Avatar src={group.photo || undefined} alt="" sx={{ width: 50, height: 50, borderRadius: 2 }}>{group.name?.[0] || <GroupsRoundedIcon />}</Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={group.name || 'Group chat'}
                              secondary={isGroupTyping ? <TypingIndicator label="Typing…" compact /> : groupPreview}
                              primaryTypographyProps={{ noWrap: true, fontWeight: 650 }}
                              secondaryTypographyProps={{ noWrap: true, fontSize: '0.78rem', color: 'text.secondary' }}
                            />
                            <Stack alignItems="flex-end" sx={{ pl: 1, pr: 1, minWidth: 0 }}>
                              {item.activity && <Typography variant="caption" color="text.secondary" noWrap>{formatConversationTime(item.activity)}</Typography>}
                            </Stack>
                          </ListItemButton>
                        </ListItem>
                      );
                    }
                    const { contact, conversation } = item;
                    const hasMessages = Boolean(conversation?.lastMessage);
                    const isOwnLastMessage = String(conversation?.lastMessage?.sender) === String(user?._id);
                    const preview = hasMessages
                      ? (conversation.lastMessage.deletedForEveryone ? 'This message was deleted' : conversation.lastMessage.text || (conversation.lastMessage.imageUrl ? 'Photo' : (isOwnLastMessage ? 'You sent a message' : 'Message')))
                      : (getBrandedHeadline(contact.headline) || 'Start a conversation');
                    return (
                      <ListItem
                      key={`contact-${contact._id}`}
                        disablePadding
                        secondaryAction={conversation ? (
                          <IconButton
                            aria-label={`Chat options for ${contact.name || 'connection'}`}
                            edge="end"
                            onClick={(event) => openChatActions(contact, conversation, event.currentTarget, null)}
                            sx={{ mr: 0.5 }}
                          ><MoreHorizRoundedIcon /></IconButton>
                        ) : null}
                        onTouchStart={(event) => beginLongPress(event, contact, conversation)}
                        onTouchMove={clearLongPress}
                        onTouchEnd={clearLongPress}
                        onTouchCancel={clearLongPress}
                        onContextMenu={(event) => {
                          if (!conversation) return;
                          event.preventDefault();
                          openChatActions(contact, conversation, null, { top: event.clientY, left: event.clientX });
                        }}
                      >
                      <ListItemButton
                        selected={String(active?.peer?._id) === String(contact._id)}
                        onClick={() => {
                          if (longPressTriggered.current) { longPressTriggered.current = false; return; }
                          openConversation(contact);
                        }}
                        aria-label={`Open chat with ${contact.name || 'connection'}`}
                        sx={{
                          minWidth: 0,
                          minHeight: 76,
                          px: 1.75,
                          '&.Mui-selected': { bgcolor: 'action.selected' },
                          '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 62 }}><Badge overlap="circular" variant="dot" color="success" invisible={presenceByUser[contact._id] !== 'online'} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Avatar src={contact.profilePicture} alt="" sx={{ width: 50, height: 50 }}>{contact.name?.[0] || 'N'}</Avatar></Badge></ListItemAvatar>
                        <ListItemText
                          primary={conversation?.displayName || contact.name || 'Vuprise member'}
                          secondary={Object.keys(typingByScope[`conversation:${conversation?._id}`] || {}).length
                            ? <TypingIndicator label="Typing…" compact />
                            : preview}
                          primaryTypographyProps={{ noWrap: true, fontWeight: 650 }}
                          secondaryTypographyProps={{ noWrap: true, fontSize: '0.78rem', color: 'text.secondary' }}
                        />
                        <Stack alignItems="flex-end" sx={{ pl: 1, pr: 1, minWidth: 0 }}>
                          {['online', 'offline'].includes(presenceByUser[contact._id]) && <Typography variant="caption" color={presenceByUser[contact._id] === 'online' ? 'success.main' : 'text.secondary'} noWrap>{presenceByUser[contact._id] === 'online' ? 'Online' : 'Offline'}</Typography>}
                          {hasMessages && <Typography variant="caption" color="text.secondary" noWrap>{formatConversationTime(conversation.lastMessageAt || conversation.lastMessage.createdAt)}</Typography>}
                        </Stack>
                      </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ px: 3, py: 5, textAlign: 'center' }}>
                  <Typography fontWeight={700}>{contacts.length ? 'No matches' : 'No chats yet'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {contacts.length || groups.length ? 'Try a different name.' : 'Accepted connections and group chats will appear here.'}
                  </Typography>
                </Stack>
              )}
            </Box>
          </Box>
        )}

        {(!mobile || active || activeGroup) && (
          <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
            {activeGroup ? (
              <GroupChatPanel
                key={activeGroup._id}
                groupId={activeGroup._id}
                showBackButton={mobile}
                onBack={closeGroupConversation}
                onGroupUpdate={updateGroupInInbox}
                onGroupRemoved={removeGroupFromInbox}
              />
            ) : active ? (
              <>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: { xs: 1, sm: 2 }, py: 1.4, borderBottom: 1, borderColor: 'divider', minWidth: 0 }}>
                  {mobile && <IconButton aria-label="Back to chats" onClick={() => { stopTyping(); selectedConversationId.current = null; setActive(null); setMessages([]); }} size="small"><ArrowBackRoundedIcon /></IconButton>}
                  <ButtonBase
                    onClick={() => navigate(`/profile/${active.peer._id}`)}
                    aria-label={`View ${active.peer.name || 'user'}'s profile`}
                    sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1.25, minWidth: 0, flex: 1, borderRadius: 2, textAlign: 'left', p: 0.5, ml: -0.5, '&:hover': { bgcolor: 'action.hover' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' } }}
                  >
                    <Badge overlap="circular" variant="dot" color="success" invisible={presenceByUser[active.peer._id] !== 'online'} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Avatar src={active.peer.profilePicture} alt="" sx={{ width: 42, height: 42 }}>{active.peer.name?.[0] || 'N'}</Avatar></Badge>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>{active.displayName || active.peer.name}</Typography>
                      <Typography variant="caption" color={presenceByUser[active.peer._id] === 'online' ? 'success.main' : 'text.secondary'} noWrap>{presenceByUser[active.peer._id] === 'online' ? 'Online' : presenceByUser[active.peer._id] === 'offline' ? 'Offline' : getBrandedHeadline(active.peer.headline) || 'Vuprise connection'}</Typography>
                    </Box>
                  </ButtonBase>
                </Stack>
                <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: { xs: 1.5, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 1.25, bgcolor: 'background.default' }} aria-live="polite" aria-label={`Conversation with ${active.peer.name}`}>
                  {loadingMessages && !messages.length ? <Stack spacing={1.25} sx={{ width: 'min(90%, 440px)', alignSelf: 'center', mt: 3 }}><Skeleton variant="rounded" width="62%" height={42} /><Skeleton variant="rounded" width="74%" height={42} sx={{ alignSelf: 'flex-end' }} /><Skeleton variant="rounded" width="55%" height={42} /></Stack> : null}
                  {messages.map((message) => {
                    const ownMessage = message.sender.toString() === user._id.toString();
                    const readByPeer = message.readBy?.some((id) => id.toString() === active.peer._id.toString());
                    const removedForEveryone = message.deletedForEveryone;
                    return (
                      <Box key={message._id} sx={{ alignSelf: ownMessage ? 'flex-end' : 'flex-start', maxWidth: 'min(90%, 560px)', minWidth: 0 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: ownMessage ? 'flex-end' : 'flex-start' }}>
                          <Paper elevation={0} sx={{ px: 1.5, py: 1.1, borderRadius: 2.5, bgcolor: ownMessage ? 'primary.main' : 'action.hover', color: ownMessage ? 'primary.contrastText' : 'text.primary', overflowWrap: 'anywhere' }}>
                            {removedForEveryone ? <Typography variant="body2" fontStyle="italic" color="text.secondary">This message was deleted</Typography> : <>
                              {message.imageUrl && <Box component="img" src={message.imageUrl} alt="Image shared in chat" loading="lazy" sx={{ display: 'block', width: 'min(100%, 360px)', maxHeight: 360, objectFit: 'contain', borderRadius: 1.5, mb: message.text ? 0.8 : 0 }} />}
                              {message.text && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography>}
                            </>}
                          </Paper>
                        </Box>
                        <Stack direction="row" spacing={0.25} alignItems="center" justifyContent={ownMessage ? 'flex-end' : 'flex-start'} sx={{ mt: 0.25 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimestamp(message.createdAt)}{message.editedAt ? ' · Edited' : ''}{ownMessage ? ` · ${message.pending ? 'Sending…' : readByPeer ? 'Read' : 'Sent'}` : ''}
                          </Typography>
                          {!message.pending && (
                            <>
                              {ownMessage && !removedForEveryone && !message.ciphertext && typeof message.text === 'string' && Boolean(message.text) && <IconButton size="small" aria-label="Edit message" onClick={() => { setMessageToEdit(message); setMessageEditDraft(message.text || ''); }} sx={{ p: 0.35 }}><EditRoundedIcon sx={{ fontSize: 17 }} /></IconButton>}
                              <IconButton size="small" aria-label="Delete message" onClick={() => setMessageToDelete(message)} sx={{ p: 0.35, color: 'error.light' }}><DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} /></IconButton>
                            </>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                  {Object.keys(typingByScope[`conversation:${active._id}`] || {}).length > 0 && <TypingIndicator label={`${Object.values(typingByScope[`conversation:${active._id}`]).map((entry) => entry.name).join(', ')} typing`} sx={{ alignSelf: 'flex-start', minHeight: 22 }} />}
                  <div ref={bottomRef} />
                </Box>
                {attachment && <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}><Box component="img" src={attachmentPreview} alt="Image preview" sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }} /><Typography variant="caption" noWrap sx={{ flex: 1 }}>{attachment.name}</Typography><Button size="small" onClick={() => { setAttachment(null); if (imageInputRef.current) imageInputRef.current.value = ''; }}>Remove</Button></Stack>}
                <Box component="form" onSubmit={sendMessage} sx={{ p: { xs: 1, sm: 1.5 }, pb: 'max(12px, env(safe-area-inset-bottom))', borderTop: attachment ? 0 : 1, borderColor: 'divider', display: 'flex', gap: 0.5, alignItems: 'flex-end', bgcolor: 'background.paper' }}>
                  <input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleMessageImageSelect} aria-label="Attach an image" />
                  <IconButton aria-label="Attach image" onClick={() => imageInputRef.current?.click()} disabled={sending}><AttachFileRoundedIcon /></IconButton>
                  <EmojiPickerControl
                    disabled={sending}
                    onSelect={(emoji) => updateDraft(`${draft}${emoji}`.slice(0, 5000))}
                  />
                  <TextField
                    fullWidth multiline maxRows={4} size="small" label="Message" value={draft}
                    sx={{ flex: 1, minWidth: 0 }}
                    inputRef={composerInputRef}
                    onChange={(event) => updateDraft(event.target.value.slice(0, 5000))}
                    onInput={(event) => updateDraft(event.currentTarget.value.slice(0, 5000))}
                    onFocus={(event) => updateDraft(event.currentTarget.value.slice(0, 5000))}
                    onKeyDown={handleComposerKeyDown}
                    slotProps={{ htmlInput: { maxLength: 5000, name: 'message' } }}
                    placeholder="Write a message..."
                  />
                  <Button type="submit" variant="contained" aria-label="Send message" disabled={sending || (!draft.trim() && !attachment)} sx={{ minWidth: 48, width: 48, height: 40, px: 0 }}>
                    {sending ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}
                  </Button>
                </Box>
              </>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, minHeight: 0, p: 4, textAlign: 'center' }}>
                <ChatBubbleOutlineRoundedIcon color="primary" sx={{ fontSize: 42, mb: 1.5 }} />
                <Typography variant="h6" fontWeight={700}>Your messages</Typography>
              </Stack>
            )}
          </Box>
        )}
      </Paper>
      <Menu
        open={Boolean(chatMenu)}
        onClose={() => setChatMenu(null)}
        anchorEl={chatMenu?.anchorEl || undefined}
        anchorReference={chatMenu?.anchorPosition ? 'anchorPosition' : 'anchorEl'}
        anchorPosition={chatMenu?.anchorPosition || undefined}
      >
        <MenuItem onClick={() => {
          setChatNameDraft(chatMenu?.conversation.displayName || '');
          setChatToEdit(chatMenu?.conversation || null);
          setChatMenu(null);
        }}>Edit chat name</MenuItem>
        <MenuItem sx={{ color: 'error.main' }} onClick={() => {
          setChatToDelete(chatMenu?.conversation || null);
          setChatMenu(null);
        }}>Delete chat</MenuItem>
      </Menu>
      <Dialog open={Boolean(chatToEdit)} onClose={() => !chatActionLoading && setChatToEdit(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit chat name</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth label="Chat name" value={chatNameDraft} onChange={(event) => setChatNameDraft(event.target.value.slice(0, 80))} slotProps={{ htmlInput: { maxLength: 80 } }} helperText="Leave blank to use the person’s profile name." sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatToEdit(null)} disabled={chatActionLoading}>Cancel</Button>
          <Button onClick={saveChatName} disabled={chatActionLoading}>{chatActionLoading ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(chatToDelete)} onClose={() => !chatActionLoading && setChatToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete this chat?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">This removes the chat from your inbox only. Your connection and the other person’s chat stay unchanged. You can open this person’s chat again from your connections later.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChatToDelete(null)} disabled={chatActionLoading}>Cancel</Button>
          <Button color="error" onClick={deleteChat} disabled={chatActionLoading}>{chatActionLoading ? 'Deleting…' : 'Delete chat'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(messageToEdit)} onClose={() => !messageActionLoading && setMessageToEdit(null)} fullWidth maxWidth="xs">
        <DialogTitle>Edit message</DialogTitle>
        <DialogContent>
          <TextField autoFocus fullWidth multiline maxRows={6} label="Message" value={messageEditDraft} onChange={(event) => setMessageEditDraft(event.target.value.slice(0, 5000))} slotProps={{ htmlInput: { maxLength: 5000 } }} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageToEdit(null)} disabled={messageActionLoading}>Cancel</Button>
          <Button onClick={editMessage} disabled={messageActionLoading || !messageEditDraft.trim()}>{messageActionLoading ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(messageToDelete)} onClose={() => !messageActionLoading && setMessageToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete this message?</DialogTitle>
        <DialogContent><Typography color="text.secondary">Choose who should no longer see this message.</Typography></DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap' }}>
          <Button onClick={() => setMessageToDelete(null)} disabled={messageActionLoading}>Cancel</Button>
          <Button onClick={() => deleteMessage('me')} disabled={messageActionLoading}>{messageActionLoading ? 'Deleting…' : 'Delete for me'}</Button>
          {String(messageToDelete?.sender?._id || messageToDelete?.sender) === String(user?._id) && <Button color="error" onClick={() => deleteMessage('everyone')} disabled={messageActionLoading}>Delete for everyone</Button>}
        </DialogActions>
      </Dialog>
      <Dialog open={groupDialogOpen} onClose={closeGroupDialog} fullWidth maxWidth="sm" aria-labelledby="create-group-title">
        <Box component="form" onSubmit={createGroup}>
          <DialogTitle id="create-group-title">Create a group</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {groupDialogError && <Alert severity="error" onClose={() => setGroupDialogError('')}>{groupDialogError}</Alert>}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <input ref={groupIconInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={selectGroupIcon} aria-label="Choose a group icon" />
                <Avatar src={groupIconPreview || undefined} alt="Group icon preview" variant="rounded" sx={{ width: 56, height: 56, borderRadius: 2 }}>{groupIconFile ? null : <GroupsRoundedIcon />}</Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={750}>Group icon</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => groupIconInputRef.current?.click()} disabled={creatingGroup}>Choose image</Button>
                    {groupIconFile && <Button size="small" color="inherit" onClick={() => setGroupIconFile(null)} disabled={creatingGroup}>Remove</Button>}
                  </Stack>
                </Box>
              </Stack>
              <TextField
                autoFocus
                fullWidth
                label="Group name"
                value={groupNameDraft}
                onChange={(event) => setGroupNameDraft(event.target.value.slice(0, 80))}
                helperText="Optional — leave the default name or enter your own."
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="About group"
                value={groupAboutDraft}
                onChange={(event) => setGroupAboutDraft(event.target.value.slice(0, 1000))}
                helperText="Optional — defaults to Welcome Everyone."
                slotProps={{ htmlInput: { maxLength: 1000 } }}
              />
              <Box>
                <Typography variant="subtitle2" fontWeight={750}>Add connected people</Typography>
                <Typography variant="caption" color="text.secondary">You can create a group just for yourself and invite accepted connections later.</Typography>
                <Paper variant="outlined" sx={{ mt: 1, maxHeight: 280, overflowY: 'auto', borderRadius: 2 }}>
                  {contacts.length ? contacts.map((person) => {
                    const selected = selectedGroupMembers.includes(String(person._id));
                    return (
                      <Box key={person._id} sx={{ px: 1.25, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                        <FormControlLabel
                          sx={{ m: 0, width: '100%', minHeight: 58 }}
                          control={(
                            <Checkbox
                              checked={selected}
                              onChange={(event) => setSelectedGroupMembers((current) => (
                                event.target.checked
                                  ? [...current, String(person._id)]
                                  : current.filter((id) => id !== String(person._id))
                              ))}
                              slotProps={{ input: { 'aria-label': `Add ${person.name} to group` } }}
                            />
                          )}
                          label={(
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <Avatar src={person.profilePicture} alt="" sx={{ width: 34, height: 34 }}>{person.name?.[0] || '?'}</Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={650} noWrap>{person.name || 'Vuprise member'}</Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>{getBrandedHeadline(person.headline) || 'Connected'}</Typography>
                              </Box>
                            </Stack>
                          )}
                        />
                      </Box>
                    );
                  }) : (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>No connections yet. You can create the group and invite people later.</Typography>
                  )}
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  {selectedGroupMembers.length} invited. You will be the first member.
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={closeGroupDialog} disabled={creatingGroup}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={creatingGroup}>
              {creatingGroup ? <CircularProgress size={18} color="inherit" /> : 'Create group'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
};

export default MessagesPage;
