import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Menu, MenuItem, Paper, Skeleton, Stack, TextField,
  Typography
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import EmojiPickerControl from '../components/EmojiPickerControl';
import { buildGroupMessagePayload } from '../utils/groupMessagePayload';
import { useAuth } from '../context/AuthContext';
import { connectionAPI, groupAPI } from '../services/api';
import TypingIndicator from '../components/TypingIndicator';
import { sendTyping, subscribeRealtime } from '../services/realtime';

const PAGE_SIZE = 50;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const newClientMessageId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
};
const memberId = (member) => String(member?.user?._id || member?.user || '');

export default function GroupChatPage({ groupId, onBack, showBackButton = false, onGroupUpdate, onGroupRemoved }) {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [connections, setConnections] = useState([]);
  const [settingsName, setSettingsName] = useState('');
  const [settingsAbout, setSettingsAbout] = useState('');
  const [settingsPhoto, setSettingsPhoto] = useState(null);
  const [settingsPhotoPreview, setSettingsPhotoPreview] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [messageEditDraft, setMessageEditDraft] = useState('');
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [typingMembers, setTypingMembers] = useState({});
  const messagesRef = useRef([]);
  const scrollRef = useRef(null);
  const pollLock = useRef(false);
  const draftRef = useRef(null);
  const imageInputRef = useRef(null);
  const localTyping = useRef(false);
  const typingTimer = useRef(null);

  const stopGroupTyping = () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    if (localTyping.current) sendTyping('group', groupId, false);
    localTyping.current = false;
  };

  const changeDraft = (text) => {
    setDraft(text);
    draftRef.current = text.trim() || imageFile ? { ...(draftRef.current || {}), text, clientMessageId: draftRef.current?.clientMessageId || newClientMessageId() } : null;
    if (!text.trim()) { stopGroupTyping(); return; }
    if (!localTyping.current) { localTyping.current = true; sendTyping('group', groupId, true); }
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(stopGroupTyping, 1400);
  };

  useEffect(() => subscribeRealtime((event) => {
    if (event.type !== 'typing' || event.scopeType !== 'group' || String(event.scopeId) !== String(groupId)) return;
    setTypingMembers((current) => {
      const next = { ...current };
      if (event.active) next[event.userId] = event.name || 'A member';
      else delete next[event.userId];
      return next;
    });
  }), [groupId]);

  useEffect(() => () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    if (localTyping.current) sendTyping('group', groupId, false);
    localTyping.current = false;
  }, [groupId]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    if (!settingsPhoto) { setSettingsPhotoPreview(''); return undefined; }
    const objectUrl = URL.createObjectURL(settingsPhoto);
    setSettingsPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [settingsPhoto]);

  const publishGroup = useCallback((nextGroup) => {
    setGroup(nextGroup);
    onGroupUpdate?.(nextGroup);
  }, [onGroupUpdate]);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupResponse, messageResponse] = await Promise.all([
        groupAPI.get(groupId),
        groupAPI.getMessages(groupId, { limit: PAGE_SIZE })
      ]);
      publishGroup(groupResponse.data.group);
      setMessages(messageResponse.data.messages || []);
      setHasOlder((messageResponse.data.messages || []).length === PAGE_SIZE);
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
    } catch (loadError) {
      setError(loadError.message || 'Could not load this group conversation.');
    } finally { setLoading(false); }
  }, [groupId, publishGroup]);

  useEffect(() => { loadConversation(); }, [loadConversation]);

  const pollNewMessages = useCallback(async () => {
    if (pollLock.current || document.visibilityState !== 'visible') return;
    pollLock.current = true;
    try {
      const response = await groupAPI.getMessages(groupId, { limit: PAGE_SIZE });
      const incoming = response.data.messages || [];
      const incomingIds = new Set(incoming.map((message) => String(message._id)));
      setMessages((current) => {
        const older = current.length > PAGE_SIZE ? current.slice(0, current.length - PAGE_SIZE) : [];
        const pending = current.filter((message) => message.pending);
        return [...older, ...incoming, ...pending.filter((message) => !incomingIds.has(String(message._id)))];
      });
      setError('');
    } catch (pollError) {
      if (pollError.response?.status === 403 || pollError.response?.status === 404) {
        setGroup(null); setMessages([]); messagesRef.current = [];
        setError('You no longer have access to this group conversation.');
      } else setError('Could not refresh messages. We’ll try again shortly.');
    } finally { pollLock.current = false; }
  }, [groupId]);

  useEffect(() => {
    if (loading || !group) return undefined;
    const interval = window.setInterval(pollNewMessages, 12000);
    const onVisibility = () => { if (document.visibilityState === 'visible') pollNewMessages(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', onVisibility); };
  }, [group, loading, pollNewMessages]);

  const loadOlder = async () => {
    const firstId = messagesRef.current[0]?._id;
    if (!firstId || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    const container = scrollRef.current;
    const oldHeight = container?.scrollHeight || 0;
    try {
      const response = await groupAPI.getMessages(groupId, { before: firstId, limit: PAGE_SIZE });
      const older = response.data.messages || [];
      setMessages((current) => [...older, ...current]);
      setHasOlder(older.length === PAGE_SIZE);
      requestAnimationFrame(() => { if (container) container.scrollTop = container.scrollHeight - oldHeight; });
    } catch (loadError) { setError(loadError.message || 'Could not load older messages.'); }
    finally { setLoadingOlder(false); }
  };

  const submitMessage = async (event, retry = false) => {
    event?.preventDefault();
    if (sending) return;
    const submission = retry ? {
      ...failed,
      text: (failed?.text || draftRef.current?.text || draft).trim(),
      file: failed?.file || imageFile,
      clientMessageId: failed?.clientMessageId || draftRef.current?.clientMessageId || newClientMessageId(),
    } : {
      text: (draftRef.current?.text ?? draft).trim(),
      clientMessageId: draftRef.current?.clientMessageId || newClientMessageId(),
      file: imageFile,
    };
    if ((!submission?.text?.trim() && !submission?.file) || !group) return;
    stopGroupTyping();
    setSending(true); setError('');
    const tempId = `pending-${submission.clientMessageId}`;
    const optimistic = {
      _id: tempId, clientMessageId: submission.clientMessageId, group: groupId,
      sender: { _id: user?._id, name: user?.name, profilePicture: user?.profilePicture },
      text: submission.text, imageUrl: submission.file ? imagePreview : '',
      createdAt: new Date().toISOString(), pending: true,
    };
    setMessages((current) => [...current.filter((message) => message.clientMessageId !== submission.clientMessageId), optimistic]);
    try {
      const payload = buildGroupMessagePayload(submission);
      const response = await groupAPI.sendMessage(groupId, payload);
      const saved = response.data.message;
      setMessages((current) => current.map((message) => message._id === tempId || String(message._id) === String(saved._id) ? saved : message));
      messagesRef.current = messagesRef.current.map((message) => message._id === tempId || String(message._id) === String(saved._id) ? saved : message);
      setDraft(''); draftRef.current = null; setImageFile(null); setFailed(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      publishGroup({ ...group, lastMessage: saved, lastMessageAt: saved.createdAt });
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
    } catch (sendError) {
      setMessages((current) => current.filter((message) => message._id !== tempId));
      setFailed(submission);
      setImageFile(submission.file || null);
      setError(sendError.message || 'Message could not be sent. Retry when you’re back online.');
    } finally { setSending(false); }
  };

  const onComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault(); submitMessage();
    }
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('Choose a JPEG, PNG, WEBP, or GIF image.'); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError('Images must be 10 MB or smaller.'); return; }
    setError(''); setImageFile(file);
    draftRef.current = { ...(draftRef.current || {}), text: draft, clientMessageId: draftRef.current?.clientMessageId || newClientMessageId() };
  };

  const openSettings = async () => {
    setMenuAnchor(null); setSettingsName(group?.name || ''); setSettingsAbout(group?.about || ''); setSettingsPhoto(null); setSettingsError(''); setSettingsNotice(''); setSettingsOpen(true);
    try { const response = await connectionAPI.getConnections(); setConnections(response.data.connections || []); }
    catch (requestError) { setSettingsError(requestError.message || 'Could not load your connections.'); }
  };

  const saveGroup = async (event) => {
    event.preventDefault(); if (!group) return;
    setSettingsSaving(true); setError('');
    try {
      const payload = new FormData(); payload.append('name', settingsName.trim()); payload.append('about', settingsAbout.trim());
      if (settingsPhoto) payload.append('image', settingsPhoto);
      const response = await groupAPI.update(groupId, payload);
      publishGroup(response.data.group); setSettingsPhoto(null);
    } catch (saveError) { setError(saveError.message || 'Could not update group details.'); }
    finally { setSettingsSaving(false); }
  };

  const invitePerson = async (personId) => {
    setActionBusy(true); setSettingsError(''); setSettingsNotice('');
    try {
      const response = await groupAPI.invite(groupId, personId);
      publishGroup(response.data.group);
      const invitedPerson = connections.find((person) => String(person._id) === String(personId));
      setSettingsNotice(`Invitation sent to ${invitedPerson?.name || 'your connection'}. They will join after accepting it.`);
      return true;
    } catch (inviteError) { setSettingsError(inviteError.message || 'Could not send this group invitation.'); return false; }
    finally { setActionBusy(false); }
  };

  const changeRole = async (personId, role) => {
    setActionBusy(true); setError('');
    try { const response = await groupAPI.setRole(groupId, personId, role); publishGroup(response.data.group); }
    catch (roleError) { setError(roleError.message || 'Could not update this member’s role.'); }
    finally { setActionBusy(false); }
  };

  const confirmGroupAction = async () => {
    if (!confirm) return;
    setActionBusy(true); setError('');
    try {
      if (confirm.kind === 'delete-group') {
        await groupAPI.delete(groupId); onGroupRemoved?.(groupId); onBack?.();
      } else {
        const targetId = confirm.kind === 'leave-group' ? user?._id : confirm.userId;
        const response = await groupAPI.remove(groupId, targetId);
        if (confirm.kind === 'leave-group') { onGroupRemoved?.(groupId); onBack?.(); }
        else publishGroup(response.data.group);
      }
      setConfirm(null); setSettingsOpen(false);
    } catch (actionError) { setError(actionError.message || 'This group action could not be completed.'); }
    finally { setActionBusy(false); }
  };

  const saveMessageEdit = async () => {
    if (!messageToEdit || !messageEditDraft.trim()) return;
    try {
      const response = await groupAPI.updateMessage(groupId, messageToEdit._id, messageEditDraft.trim());
      setMessages((current) => current.map((message) => String(message._id) === String(messageToEdit._id) ? response.data.message : message));
      setMessageToEdit(null); setMessageEditDraft('');
      if (String(group?.lastMessage?._id) === String(messageToEdit._id)) publishGroup({ ...group, lastMessage: response.data.message });
    } catch (editError) { setError(editError.message || 'Could not edit this message.'); }
  };

  const deleteSelectedMessage = async (scope) => {
    if (!messageToDelete) return;
    try {
      const response = await groupAPI.deleteMessage(groupId, messageToDelete._id, scope);
      if (scope === 'me') setMessages((current) => current.filter((message) => String(message._id) !== String(messageToDelete._id)));
      else setMessages((current) => current.map((message) => String(message._id) === String(messageToDelete._id) ? response.data.message : message));
      if (scope === 'everyone' && String(group?.lastMessage?._id) === String(messageToDelete._id)) publishGroup({ ...group, lastMessage: response.data.message });
      setMessageToDelete(null);
    } catch (deleteError) { setError(deleteError.message || 'Could not delete this message.'); }
  };

  const myRole = group?.members?.find((member) => memberId(member) === String(user?._id))?.role;
  const canEditGroup = myRole === 'owner' || myRole === 'admin';
  const canManageAdmins = myRole === 'owner';
  const availableConnections = connections.filter((person) => !group?.members?.some((member) => memberId(member) === String(person._id)) && !group?.invitations?.some((invite) => String(invite.user?._id || invite.user) === String(person._id) && invite.status === 'pending'));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0, height: '100%', bgcolor: 'background.paper' }}>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: { xs: 1, sm: 2 }, py: 1.4, borderBottom: 1, borderColor: 'divider', minWidth: 0 }}>
        {showBackButton && <IconButton aria-label="Back to chats" onClick={onBack}><ArrowBackRoundedIcon /></IconButton>}
        <Avatar src={group?.photo} alt="" variant="rounded" sx={{ width: 42, height: 42, flexShrink: 0 }}>{group?.name?.[0] || <GroupsRoundedIcon />}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={750} noWrap>{group?.name || 'Group conversation'}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{group ? `${group.members?.length || 0} members` : 'Messages are visible to group members'}</Typography>
        </Box>
        <IconButton aria-label="Group settings" onClick={(event) => setMenuAnchor(event.currentTarget)}><MoreHorizRoundedIcon /></IconButton>
      </Stack>
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={openSettings}>Group info & settings</MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setConfirm({ kind: 'leave-group' }); }}>Leave group</MenuItem>
        {myRole === 'owner' && <MenuItem sx={{ color: 'error.main' }} onClick={() => { setMenuAnchor(null); setConfirm({ kind: 'delete-group' }); }}>Delete group</MenuItem>}
      </Menu>

      {error && <Alert severity="error" sx={{ mx: 1.5, mt: 1.25 }} onClose={() => setError('')} action={error.includes('no longer have access') && onBack ? <Button color="inherit" size="small" onClick={onBack}>Chats</Button> : undefined}>{error}</Alert>}
      <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.2, px: { xs: 1.25, sm: 2.5 }, py: 1.5, bgcolor: 'background.default' }} aria-live="polite" aria-label="Group messages">
        {hasOlder && !loading && <Button size="small" onClick={loadOlder} disabled={loadingOlder} sx={{ alignSelf: 'center' }}>{loadingOlder ? <CircularProgress size={18} /> : 'Load older messages'}</Button>}
        {loading && <Stack spacing={1.25} sx={{ width: 'min(90%, 440px)', alignSelf: 'center', mt: 3 }}><Skeleton variant="rounded" width="60%" height={44} /><Skeleton variant="rounded" width="74%" height={44} sx={{ alignSelf: 'flex-end' }} /><Skeleton variant="rounded" width="48%" height={44} /></Stack>}
        {!loading && messages.length === 0 && <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 5, textAlign: 'center' }}><Avatar src={group?.photo} alt="" variant="rounded" sx={{ width: 68, height: 68, mb: 1.5 }}>{group?.name?.[0] || <GroupsRoundedIcon />}</Avatar><Typography variant="h6" fontWeight={750}>{group?.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Start the conversation with your group.</Typography></Stack>}
        {messages.map((message) => {
          const senderId = message.sender?._id || message.sender;
          const own = String(senderId) === String(user?._id);
          const removed = message.deletedForEveryone;
          return <Box key={message._id || message.clientMessageId} sx={{ alignSelf: own ? 'flex-end' : 'flex-start', display: 'flex', alignItems: 'flex-end', gap: 0.8, maxWidth: 'min(92%, 620px)', minWidth: 0, flexDirection: own ? 'row-reverse' : 'row' }}>
            {!own && <Avatar src={message.sender?.profilePicture} alt="" sx={{ width: 30, height: 30, flexShrink: 0, mb: 2 }}>{message.sender?.name?.[0] || '?'}</Avatar>}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, px: 0.6, textAlign: own ? 'right' : 'left', fontSize: '0.7rem' }}>{message.sender?.name || (own ? 'You' : 'Group member')}</Typography>
              <Paper elevation={0} sx={{ px: 1.5, py: 1.1, borderRadius: 2.5, bgcolor: own ? 'primary.main' : 'action.hover', color: own ? 'primary.contrastText' : 'text.primary', overflowWrap: 'anywhere' }}>
                {removed ? <Typography variant="body2" fontStyle="italic" color="text.secondary">This message was deleted</Typography> : <>
                  {message.imageUrl && <Box component="img" src={message.imageUrl} alt="Image shared in group" loading="lazy" sx={{ display: 'block', width: 'min(100%, 360px)', maxHeight: 360, objectFit: 'contain', borderRadius: 1.5, mb: message.text ? 0.8 : 0 }} />}
                  {message.text && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography>}
                </>}
              </Paper>
              <Stack direction="row" spacing={0.1} alignItems="center" justifyContent={own ? 'flex-end' : 'flex-start'} sx={{ mt: 0.15 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.67rem' }}>{formatTime(message.createdAt)}{message.editedAt ? ' · Edited' : ''}{message.pending ? ' · Sending' : ''}</Typography>
                {!message.pending && !removed && own && message.text && <IconButton size="small" aria-label="Edit group message" onClick={() => { setMessageToEdit(message); setMessageEditDraft(message.text || ''); }} sx={{ p: 0.35 }}><EditRoundedIcon sx={{ fontSize: 15 }} /></IconButton>}
                {!message.pending && <IconButton size="small" aria-label={own ? 'Delete group message' : 'Delete group message for me'} onClick={() => setMessageToDelete(message)} sx={{ p: 0.35, color: 'text.secondary' }}><DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} /></IconButton>}
              </Stack>
            </Box>
          </Box>;
        })}
      </Box>
      {imageFile && <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider' }}><Box component="img" src={imagePreview} alt="Image preview" sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1 }} /><Typography variant="caption" noWrap sx={{ flex: 1 }}>{imageFile.name}</Typography><Button size="small" onClick={() => { setImageFile(null); if (imageInputRef.current) imageInputRef.current.value = ''; }}>Remove</Button></Stack>}
      {Object.keys(typingMembers).length > 0 && <Box sx={{ px: 2, py: 0.15, minHeight: 22 }}><TypingIndicator label={`${Object.values(typingMembers).join(', ')} typing`} /></Box>}
      <Box component="form" onSubmit={submitMessage} sx={{ p: { xs: 1, sm: 1.5 }, pb: 'max(12px, env(safe-area-inset-bottom))', borderTop: imageFile ? 0 : 1, borderColor: 'divider', display: 'flex', gap: 0.5, alignItems: 'flex-end', bgcolor: 'background.paper' }}>
        <input ref={imageInputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseImage} aria-label="Attach an image" />
        <IconButton aria-label="Attach image" onClick={() => imageInputRef.current?.click()} disabled={sending || loading || Boolean(failed)}><AttachFileRoundedIcon /></IconButton>
        <EmojiPickerControl disabled={sending || loading || Boolean(failed)} onSelect={(emoji) => changeDraft(`${draftRef.current?.text ?? draft}${emoji}`.slice(0, 5000))} />
        <TextField fullWidth multiline maxRows={5} size="small" label="Message group" value={draft} disabled={sending || loading || !group || Boolean(failed)} onChange={(event) => changeDraft(event.target.value.slice(0, 5000))} onKeyDown={onComposerKeyDown} slotProps={{ htmlInput: { maxLength: 5000, 'aria-label': 'Message group' } }} placeholder="Write to the group…" />
        <Button type="submit" variant="contained" aria-label="Send group message" disabled={sending || loading || (!draft.trim() && !imageFile) || Boolean(failed)} sx={{ minWidth: 48, width: 48, height: 40, px: 0 }}>{sending ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}</Button>
      </Box>
      {failed && <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, pb: 1 }}><Typography variant="caption" color="error.main">Unsent message kept here for retry.</Typography><Stack direction="row" spacing={0.5}><Button size="small" onClick={() => { setFailed(null); setDraft(''); setImageFile(null); draftRef.current = null; }}>Discard</Button><Button size="small" startIcon={<ReplayRoundedIcon />} disabled={sending} onClick={() => submitMessage(null, true)}>Retry</Button></Stack></Stack>}

      <Dialog open={settingsOpen} onClose={() => !settingsSaving && setSettingsOpen(false)} fullWidth maxWidth="sm" aria-labelledby="group-settings-title">
        <Box component="form" onSubmit={saveGroup}>
          <DialogTitle id="group-settings-title">Group info & settings</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              {settingsError && <Alert severity="error" onClose={() => setSettingsError('')}>{settingsError}</Alert>}
              {settingsNotice && <Alert severity="success" onClose={() => setSettingsNotice('')}>{settingsNotice}</Alert>}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={settingsPhotoPreview || group?.photo} variant="rounded" sx={{ width: 58, height: 58 }}>{group?.name?.[0] || <GroupsRoundedIcon />}</Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={700}>{group?.name}</Typography><Typography variant="caption" color="text.secondary">{group?.members?.length || 0} members · {myRole || 'Member'}</Typography></Box>
                {canEditGroup && <Button component="label" size="small">Edit icon<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setSettingsPhoto(event.target.files?.[0] || null)} /></Button>}
              </Stack>
              {canEditGroup ? <><TextField fullWidth label="Group name" required value={settingsName} onChange={(event) => setSettingsName(event.target.value.slice(0, 80))} slotProps={{ htmlInput: { minLength: 2, maxLength: 80 } }} /><TextField fullWidth multiline minRows={2} label="About group" value={settingsAbout} onChange={(event) => setSettingsAbout(event.target.value.slice(0, 1000))} slotProps={{ htmlInput: { maxLength: 1000 } }} /></> : <Box><Typography variant="subtitle2" color="text.secondary">About group</Typography><Typography>{group?.about || 'No group description yet.'}</Typography></Box>}
              <Typography variant="subtitle1" fontWeight={750}>People</Typography>
              {group?.members?.map((member) => {
                const person = member.user || {};
                const id = memberId(member);
                const isOwner = member.role === 'owner';
                const isSelf = id === String(user?._id);
                return <Stack key={id} direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <Avatar src={person.profilePicture} sx={{ width: 36, height: 36 }}>{person.name?.[0] || '?'}</Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="body2" fontWeight={650} noWrap>{person.name || (isSelf ? user?.name : 'Member')}{isSelf ? ' (you)' : ''}</Typography><Typography variant="caption" color="text.secondary">{isOwner ? 'Owner' : member.role === 'admin' ? 'Admin' : 'Member'}</Typography></Box>
                  {canManageAdmins && !isOwner && <Button size="small" disabled={actionBusy} onClick={() => changeRole(id, member.role === 'admin' ? 'member' : 'admin')}>{member.role === 'admin' ? 'Remove admin' : 'Make admin'}</Button>}
                  {canEditGroup && !isOwner && !isSelf && (myRole === 'owner' || member.role === 'member') && <Button size="small" color="error" disabled={actionBusy} onClick={() => setConfirm({ kind: 'remove-member', userId: id, name: person.name })}>Remove</Button>}
                </Stack>;
              })}
              {canEditGroup && <Box><Typography variant="subtitle2" fontWeight={700}>Add people</Typography><Typography variant="caption" color="text.secondary">Click Invite to send a request. They become a member after accepting it.</Typography><Stack spacing={0.25} sx={{ mt: 0.75, maxHeight: 180, overflowY: 'auto' }}>
                {availableConnections.map((person) => <Stack key={person._id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}><Avatar src={person.profilePicture} sx={{ width: 28, height: 28 }}>{person.name?.[0] || '?'}</Avatar><Typography variant="body2" sx={{ flex: 1 }}>{person.name}</Typography><Button size="small" variant="outlined" disabled={actionBusy} onClick={() => invitePerson(person._id)}>{actionBusy ? <CircularProgress size={16} /> : 'Invite'}</Button></Stack>)}
                {!availableConnections.length && <Typography variant="body2" color="text.secondary">No new connected people to add.</Typography>}
              </Stack></Box>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setSettingsOpen(false)} disabled={settingsSaving}>Close</Button>{canEditGroup && <Button type="submit" variant="contained" disabled={settingsSaving || settingsName.trim().length < 2}>{settingsSaving ? <CircularProgress size={18} color="inherit" /> : 'Save changes'}</Button>}</DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(confirm)} onClose={() => !actionBusy && setConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{confirm?.kind === 'delete-group' ? 'Delete this group?' : confirm?.kind === 'leave-group' ? 'Leave this group?' : 'Remove this person?'}</DialogTitle>
        <DialogContent><Typography color="text.secondary">{confirm?.kind === 'delete-group' ? 'This deletes the group and its message history for everyone.' : confirm?.kind === 'leave-group' ? 'You will leave this group. If you own it, ownership will pass to another member.' : `Remove ${confirm?.name || 'this person'} from the group?`}</Typography></DialogContent>
        <DialogActions><Button onClick={() => setConfirm(null)} disabled={actionBusy}>Cancel</Button><Button color="error" variant="contained" onClick={confirmGroupAction} disabled={actionBusy}>{actionBusy ? <CircularProgress size={18} color="inherit" /> : confirm?.kind === 'delete-group' ? 'Delete group' : confirm?.kind === 'leave-group' ? 'Leave group' : 'Remove person'}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(messageToEdit)} onClose={() => setMessageToEdit(null)} fullWidth maxWidth="xs"><DialogTitle>Edit message</DialogTitle><DialogContent><TextField autoFocus fullWidth multiline maxRows={6} label="Message" value={messageEditDraft} onChange={(event) => setMessageEditDraft(event.target.value.slice(0, 5000))} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button onClick={() => setMessageToEdit(null)}>Cancel</Button><Button onClick={saveMessageEdit} disabled={!messageEditDraft.trim()}>Save</Button></DialogActions></Dialog>
      <Dialog open={Boolean(messageToDelete)} onClose={() => setMessageToDelete(null)} fullWidth maxWidth="xs"><DialogTitle>Delete message?</DialogTitle><DialogContent><Typography color="text.secondary">Choose who should no longer see this message.</Typography></DialogContent><DialogActions sx={{ flexWrap: 'wrap' }}><Button onClick={() => setMessageToDelete(null)}>Cancel</Button><Button onClick={() => deleteSelectedMessage('me')}>Delete for me</Button>{String(messageToDelete?.sender?._id || messageToDelete?.sender) === String(user?._id) && <Button color="error" onClick={() => deleteSelectedMessage('everyone')}>Delete for everyone</Button>}</DialogActions></Dialog>
    </Box>
  );
}
