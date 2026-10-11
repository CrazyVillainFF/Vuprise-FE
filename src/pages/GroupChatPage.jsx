import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Avatar, Box, Button, CircularProgress, IconButton, Paper,
  Skeleton, Stack, TextField, Typography
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import { useAuth } from '../context/AuthContext';
import { groupAPI } from '../services/api';

const PAGE_SIZE = 50;
const newClientMessageId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
const formatTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
};

export default function GroupChatPage({ groupId, onBack, showBackButton = false }) {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(null);
  const messagesRef = useRef([]);
  const scrollRef = useRef(null);
  const pollLock = useRef(false);
  const draftRef = useRef(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupResponse, messageResponse] = await Promise.all([
        groupAPI.get(groupId),
        groupAPI.getMessages(groupId, { limit: PAGE_SIZE })
      ]);
      setGroup(groupResponse.data.group);
      setMessages(messageResponse.data.messages || []);
      setHasOlder((messageResponse.data.messages || []).length === PAGE_SIZE);
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
    } catch (loadError) {
      setError(loadError.message || 'Could not load this group conversation.');
    } finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { loadConversation(); }, [loadConversation]);

  const pollNewMessages = useCallback(async () => {
    const last = messagesRef.current.at(-1);
    if (!last?._id || pollLock.current || document.visibilityState !== 'visible') return;
    pollLock.current = true;
    try {
      const response = await groupAPI.getMessages(groupId, { after: last._id, limit: PAGE_SIZE });
      const incoming = response.data.messages || [];
      if (incoming.length) {
        const existing = new Set(messagesRef.current.map((message) => String(message._id)));
        const fresh = incoming.filter((message) => !existing.has(String(message._id)));
        if (fresh.length) setMessages((current) => [...current, ...fresh]);
        setError('');
      }
    } catch (pollError) {
      if (pollError.response?.status === 403 || pollError.response?.status === 404) {
        setGroup(null);
        setMessages([]);
        messagesRef.current = [];
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
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight - oldHeight;
      });
    } catch (loadError) { setError(loadError.message || 'Could not load older messages.'); }
    finally { setLoadingOlder(false); }
  };

  const submitMessage = async (event, retry = false) => {
    event?.preventDefault();
    if (sending) return;
    const submission = retry ? failed : draftRef.current;
    if (!submission?.text?.trim()) return;
    setSending(true);
    setError('');
    try {
      const response = await groupAPI.sendMessage(groupId, submission);
      const saved = response.data.message;
      setMessages((current) => {
        const next = current.filter((message) => message.clientMessageId !== submission.clientMessageId);
        return [...next, saved].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || String(a._id).localeCompare(String(b._id)));
      });
      messagesRef.current = [...messagesRef.current.filter((message) => message.clientMessageId !== submission.clientMessageId), saved];
      if (draftRef.current?.clientMessageId === submission.clientMessageId) { setDraft(''); draftRef.current = null; }
      setFailed(null);
      requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
    } catch (sendError) {
      if (sendError.response?.status === 403 || sendError.response?.status === 404) {
        setGroup(null); setMessages([]); messagesRef.current = []; setFailed(null);
      } else setFailed(submission);
      setError(sendError.message || 'Message could not be sent. Retry when you’re back online.');
    } finally { setSending(false); }
  };

  const onComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitMessage();
    }
  };

  return (
      <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, minHeight: 0, height: '100%', bgcolor: 'background.paper' }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: { xs: 1, sm: 2 }, py: 1.4, borderBottom: 1, borderColor: 'divider', minWidth: 0 }}>
          {showBackButton && <IconButton aria-label="Back to chats" onClick={onBack}><ArrowBackRoundedIcon /></IconButton>}
          <Avatar src={group?.photo} alt="" variant="rounded" sx={{ width: 42, height: 42, flexShrink: 0 }}>{group?.name?.[0] || <GroupsRoundedIcon />}</Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={750} noWrap>{group?.name || 'Group conversation'}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{group ? `${group.members?.length || 0} members` : 'Messages are visible to group members'}</Typography>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ mx: 1.5, mt: 1.25 }} action={error.includes('no longer have access') && onBack ? <Button color="inherit" size="small" onClick={onBack}>Chats</Button> : undefined}>{error}</Alert>}

        <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.2, px: { xs: 1.25, sm: 2.5 }, py: 1.5, bgcolor: 'background.default' }} aria-live="polite" aria-label="Group messages">
          {hasOlder && !loading && <Button size="small" onClick={loadOlder} disabled={loadingOlder} sx={{ alignSelf: 'center' }}>{loadingOlder ? <CircularProgress size={18} /> : 'Load older messages'}</Button>}
          {loading && <Stack spacing={1.25} sx={{ width: 'min(90%, 440px)', alignSelf: 'center', mt: 3 }}><Skeleton variant="rounded" width="60%" height={44} /><Skeleton variant="rounded" width="74%" height={44} sx={{ alignSelf: 'flex-end' }} /><Skeleton variant="rounded" width="48%" height={44} /></Stack>}
          {!loading && messages.length === 0 && <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, py: 5, textAlign: 'center' }}><Avatar src={group?.photo} alt="" variant="rounded" sx={{ width: 68, height: 68, mb: 1.5 }}>{group?.name?.[0] || <GroupsRoundedIcon />}</Avatar><Typography variant="h6" fontWeight={750}>{group?.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Start the conversation with your group.</Typography></Stack>}
          {messages.map((message) => {
            const senderId = message.sender?._id || message.sender;
            const own = String(senderId) === String(user?._id);
            return <Box key={message._id || message.clientMessageId} sx={{ alignSelf: own ? 'flex-end' : 'flex-start', display: 'flex', alignItems: 'flex-end', gap: 0.8, maxWidth: 'min(92%, 620px)', minWidth: 0, flexDirection: own ? 'row-reverse' : 'row' }}>
              {!own && <Avatar src={message.sender?.profilePicture} alt="" sx={{ width: 30, height: 30, flexShrink: 0, mb: 2 }}>{message.sender?.name?.[0] || '?'}</Avatar>}
              <Box sx={{ minWidth: 0 }}>
                {!own && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25, pl: 0.6 }}>{message.sender?.name || 'Group member'}</Typography>}
                <Paper elevation={0} sx={{ px: 1.5, py: 1.1, borderRadius: 2.5, bgcolor: own ? 'primary.main' : 'action.hover', color: own ? 'primary.contrastText' : 'text.primary', overflowWrap: 'anywhere' }}><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{message.text}</Typography></Paper>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2, textAlign: own ? 'right' : 'left' }}>{formatTime(message.createdAt)}{message.pending ? ' · Sending' : ''}</Typography>
              </Box>
            </Box>;
          })}
        </Box>

        <Box component="form" onSubmit={submitMessage} sx={{ p: { xs: 1, sm: 1.5 }, pb: 'max(12px, env(safe-area-inset-bottom))', borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1, alignItems: 'flex-end', bgcolor: 'background.paper' }}>
          <TextField fullWidth multiline maxRows={5} size="small" label="Message group" value={draft} disabled={sending || loading || !group || Boolean(failed)} onChange={(event) => { const text = event.target.value.slice(0, 5000); const previous = draftRef.current; setDraft(text); draftRef.current = text.trim() ? { text, clientMessageId: previous?.text === text ? previous.clientMessageId : newClientMessageId() } : null; }} onKeyDown={onComposerKeyDown} slotProps={{ htmlInput: { maxLength: 5000, 'aria-label': 'Message group' } }} placeholder="Write to the group…" />
          <Button type="submit" variant="contained" aria-label="Send group message" disabled={sending || loading || !draft.trim() || Boolean(failed)} sx={{ minWidth: 48, width: 48, height: 40, px: 0 }}>{sending ? <CircularProgress size={18} color="inherit" /> : <SendRoundedIcon />}</Button>
        </Box>
        {failed && <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, pb: 1 }}><Typography variant="caption" color="error.main">Unsent message kept here for retry.</Typography><Stack direction="row" spacing={0.5}><Button size="small" onClick={() => { setFailed(null); setDraft(''); draftRef.current = null; }}>Discard</Button><Button size="small" startIcon={<ReplayRoundedIcon />} disabled={sending} onClick={() => submitMessage(null, true)}>Retry</Button></Stack></Stack>}
      </Box>
  );
}
