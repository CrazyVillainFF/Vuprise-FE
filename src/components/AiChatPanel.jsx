import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, ListItemText, Menu, MenuItem, Paper, Stack, Typography, useTheme } from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Attachment01Icon } from '@hugeicons/core-free-icons';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReactableMark from './ReactableMark';
import PromptBar from './reactbits/PromptBar';
import ThoughtLine from './reactbits/ThoughtLine';
import SwipeToast from './reactbits/SwipeToast';
import RefineFrame from './reactbits/RefineFrame';
import {
  AI_CHAT_SUGGESTIONS,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_COUNT,
  MAX_AI_MESSAGE_LENGTH,
  isSendableMessage,
  looksLikeImageRequest,
  normalizeChatMessage,
  validateAttachmentFile,
} from '../utils/aiChat';
import './AiChatPanel.css';

const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

// The backend runs a fixed model with no selectable alternatives and no
// effort parameter, so the picker and slider are display-only preferences.
const AI_MODELS = [{ key: 'vups-v1-fixed', name: 'Vups v1.0', tag: 'Fixed' }];
const AI_EFFORTS = ['Low', 'Medium', 'High', 'Extra', 'Max'];
const AI_SOURCES = [{ key: 'files', name: 'Photos & files', description: 'Upload from this device', icon: Attachment01Icon, attach: true }];
const AI_COMMANDS = [];
const THINKING_STEPS = ['Preparing your message', 'Waiting for Vuprise AI'];

// Cloudinary URLs can force a real download via the fl_attachment flag; other
// hosts fall back to the browser's regular download behavior.
const downloadUrlFor = (url) => {
  if (!url) return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) return url.replace('/upload/', '/upload/fl_attachment/');
  return url;
};

const isAbortError = (error) => error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

const Bubble = ({ children, tone = 'assistant' }) => {
  const isUser = tone === 'user';
  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.75, py: 1.25,
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        bgcolor: isUser ? 'primary.main' : 'background.subtle',
        color: isUser ? 'primary.contrastText' : 'text.primary',
        border: isUser ? 'none' : 1, borderColor: 'divider',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', fontSize: '0.95rem', lineHeight: 1.6,
      }}
    >
      {children}
    </Paper>
  );
};

// Self-contained Vuprise AI panel rendered inside the existing Messages layout.
// One input handles everything: the backend classifies intent and generates
// images automatically. AI messages are plaintext and stored separately from
// encrypted user-to-user conversations, so none of the E2EE flow is touched.
const AiChatPanel = ({ showBackButton = false, onBack = null }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, tone: 'success', title: '', description: '' });
  const [thoughtVisible, setThoughtVisible] = useState(false);
  const [historyAnchor, setHistoryAnchor] = useState(null);
  const [imageQuota, setImageQuota] = useState(null);
  const sendingRef = useRef(false);
  const listRef = useRef(null);
  const followBottomRef = useRef(true);
  const requestRef = useRef(null);
  const activeIdRef = useRef(null);
  const fileInputRef = useRef(null);
  const pickedFilesRef = useRef([]);

  const openConversation = useCallback(async (id) => {
    requestRef.current?.controller.abort();
    activeIdRef.current = id;
    followBottomRef.current = true;
    setLoadingThread(true);
    setError('');
    setSendError(null);
    try {
      const res = await aiAPI.getConversation(id);
      setActiveId(id);
      setMessages(res.data?.conversation?.messages || []);
    } catch (err) {
      setError(err.message || 'Could not open this conversation.');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    aiAPI.listConversations()
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.conversations || [];
        setConversations(list);
        if (list.length) openConversation(list[0].id);
      })
      .catch(() => { if (!cancelled) setConversations([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [openConversation]);

  useEffect(() => () => { requestRef.current?.controller.abort(); }, []);

  useEffect(() => {
    let cancelled = false;
    aiAPI.status()
      .then((res) => { if (!cancelled && res.data?.imageQuota) setImageQuota(res.data.imageQuota); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Keep the ThoughtLine mounted for a beat after the request settles so its
  // settle animation ("Thought for Xs") is visible, then drop it.
  useEffect(() => {
    if (sending) {
      setThoughtVisible(true);
      return undefined;
    }
    if (!thoughtVisible) return undefined;
    const timer = setTimeout(() => setThoughtVisible(false), 1600);
    return () => clearTimeout(timer);
  }, [sending, thoughtVisible]);

  const handleListScroll = () => {
    const el = listRef.current;
    if (el) followBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const handleGeneratedImageLoad = () => {
    if (!followBottomRef.current) return;
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const lastMessage = messages[messages.length - 1];
    const lastIsOwn = lastMessage?.role === 'user';
    if (followBottomRef.current || lastIsOwn) el.scrollTop = el.scrollHeight;
  }, [messages, sending, generating, sendError, error, thoughtVisible]);

  const ensureConversation = useCallback(async () => {
    if (activeId) return activeId;
    const res = await aiAPI.createConversation();
    const conversation = res.data?.conversation;
    if (!conversation?.id) throw new Error('Could not start a new chat.');
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    activeIdRef.current = conversation.id;
    setMessages([]);
    return conversation.id;
  }, [activeId]);

  const deliver = useCallback(async (conversationId, text, attachmentUrls, controller) => {
    sendingRef.current = true;
    followBottomRef.current = true;
    setSending(true);
    setError('');
    setSendError(null);
    setGenerating(looksLikeImageRequest(text));
    try {
      const res = await aiAPI.sendMessage(conversationId, text, attachmentUrls, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const { userMessage, assistantMessage, title, imageQuota: quota } = res.data || {};
      if (activeIdRef.current === conversationId) {
        if (userMessage) setMessages((current) => [...current, userMessage]);
        if (assistantMessage) setMessages((current) => [...current, assistantMessage]);
      }
      if (quota) setImageQuota(quota);
      setConversations((current) => current.map((conversation) => (conversation.id === conversationId
        ? { ...conversation, title: title || conversation.title, preview: assistantMessage?.imageUrl ? 'Generated image' : assistantMessage?.text || conversation.preview, lastMessageAt: assistantMessage?.createdAt || conversation.lastMessageAt }
        : conversation)));
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      const limitData = err.response?.data;
      if (limitData?.code === 'AI_IMAGE_QUOTA_EXCEEDED') {
        setImageQuota({ remaining: limitData.remaining ?? 0, limit: limitData.limit ?? 5 });
      }
      setSendError({ text, attachmentUrls, message: err.message || 'Vuprise AI could not answer right now. Please try again.' });
    } finally {
      if (requestRef.current?.controller === controller) requestRef.current = null;
      setGenerating(false);
      sendingRef.current = false;
      setSending(false);
    }
  }, []);

  const startNewChat = async () => {
    if (sendingRef.current) return;
    requestRef.current?.controller.abort();
    setError('');
    setSendError(null);
    try {
      const res = await aiAPI.createConversation();
      const conversation = res.data?.conversation;
      if (conversation) {
        setConversations((current) => [conversation, ...current]);
        setActiveId(conversation.id);
        activeIdRef.current = conversation.id;
        setMessages([]);
      }
    } catch (err) {
      setError(err.message || 'Could not start a new chat.');
    }
  };

  const showAttachToast = (next) => setToast({ open: true, ...next });

  // Validates the picked files against the existing rules, remembers the real
  // File objects, and returns the filenames the PromptBar renders as chips.
  const acceptFiles = (files) => {
    const accepted = [];
    let problem = '';
    for (const file of files) {
      if (pickedFilesRef.current.length + accepted.length >= ATTACHMENT_MAX_COUNT) {
        problem = `Attach up to ${ATTACHMENT_MAX_COUNT} images per message.`;
        break;
      }
      const invalid = validateAttachmentFile(file);
      if (invalid) { problem = invalid; continue; }
      accepted.push({ name: file.name, file });
    }
    pickedFilesRef.current = [...pickedFilesRef.current, ...accepted];
    if (accepted.length && !problem) {
      showAttachToast({
        tone: 'success',
        title: accepted.length === 1 ? 'Image attached' : `${accepted.length} images attached`,
        description: accepted.length === 1 ? 'Your image is ready to send.' : 'They are ready to send.',
      });
    } else if (accepted.length && problem) {
      showAttachToast({
        tone: 'success',
        title: accepted.length === 1 ? 'Image attached' : `${accepted.length} images attached`,
        description: problem,
      });
    } else if (problem) {
      showAttachToast({ tone: 'error', title: 'Image not attached', description: problem });
    }
    return accepted.map((item) => item.name);
  };

  const pickFiles = () => new Promise((resolve) => {
    const input = fileInputRef.current;
    if (!input) {
      resolve([]);
      return;
    }
    const onPicked = () => {
      input.removeEventListener('change', onPicked);
      const files = Array.from(input.files || []);
      input.value = '';
      resolve(acceptFiles(files));
    };
    input.addEventListener('change', onPicked);
    input.click();
  });

  // Maps the chip filenames back to the real File objects captured at pick
  // time; the store is cleared because the PromptBar clears its chips on send.
  const resolvePickedFiles = (names) => {
    const pool = [...pickedFilesRef.current];
    const picked = [];
    for (const name of names) {
      const index = pool.findIndex((entry) => entry.name === name);
      if (index === -1) continue;
      picked.push(pool.splice(index, 1)[0]);
    }
    pickedFilesRef.current = [];
    return picked;
  };

  const handlePromptSend = async (text, meta = {}) => {
    if (sendingRef.current) return;
    const message = normalizeChatMessage(text);
    if (!isSendableMessage(message)) {
      setError(`Messages can be up to ${MAX_AI_MESSAGE_LENGTH} characters. Your draft was cleared — please send a shorter message.`);
      return;
    }
    const files = resolvePickedFiles(meta.attachments || []);
    setError('');
    let conversationId = activeId;
    try {
      conversationId = await ensureConversation();
    } catch (err) {
      setError(err.message || 'Could not start a new chat.');
      return;
    }
    const controller = new AbortController();
    requestRef.current = { controller };
    sendingRef.current = true;
    followBottomRef.current = true;
    setSending(true);
    setGenerating(looksLikeImageRequest(message));
    try {
      let attachmentUrls = [];
      if (files.length) {
        const form = new FormData();
        files.forEach((item) => form.append('images', item.file));
        const uploaded = await aiAPI.uploadAttachments(conversationId, form, { signal: controller.signal });
        attachmentUrls = (uploaded.data?.attachments || []).map((item) => item.url);
      }
      await deliver(conversationId, message, attachmentUrls, controller);
    } catch (err) {
      if (requestRef.current?.controller === controller) requestRef.current = null;
      if (isAbortError(err)) {
        setGenerating(false);
        sendingRef.current = false;
        setSending(false);
        return;
      }
      setSendError({ text: message, attachmentUrls: [], message: err.message || 'The attachments could not be uploaded. Please try again.' });
      setGenerating(false);
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleRetry = async () => {
    if (!sendError || sendingRef.current) return;
    const attempt = sendError;
    setSendError(null);
    let conversationId = activeId;
    try {
      conversationId = await ensureConversation();
    } catch (err) {
      setSendError({ ...attempt, message: err.message || 'Could not start a new chat.' });
      return;
    }
    const controller = new AbortController();
    requestRef.current = { controller };
    await deliver(conversationId, attempt.text, attempt.attachmentUrls || [], controller);
  };

  const handleStop = () => {
    requestRef.current?.controller.abort();
  };

  const firstName = (user?.name || '').split(' ')[0];
  const promptBackground = theme.palette.background.subtle || theme.palette.action.hover;
  const frameBackground = theme.palette.background.subtle || theme.palette.action.hover;
  const frameColor = theme.palette.text.primary;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ px: { xs: 1, sm: 2 }, py: 1.2, borderBottom: 1, borderColor: 'divider', minWidth: 0, alignItems: 'center' }}>
        {showBackButton && <IconButton aria-label="Back to chats" onClick={onBack} size="small"><ArrowBackRoundedIcon /></IconButton>}
        <ReactableMark size={42} symbolOnly transparentBackground />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={750} noWrap>Vuprise AI</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            Ask anything, attach an image, or describe a picture to generate.
          </Typography>
        </Box>
        <IconButton aria-label="Previous AI conversations" onClick={(event) => setHistoryAnchor(event.currentTarget)} size="small"><HistoryRoundedIcon /></IconButton>
        <IconButton aria-label="Start a new AI chat" onClick={startNewChat} size="small" disabled={sending}><RestartAltRoundedIcon /></IconButton>
      </Stack>

      <Menu anchorEl={historyAnchor} open={Boolean(historyAnchor)} onClose={() => setHistoryAnchor(null)} slotProps={{ paper: { sx: { maxWidth: 360, maxHeight: 420 } } }}>
        {conversations.length === 0 && <MenuItem disabled>No previous AI conversations</MenuItem>}
        {conversations.map((conversation) => (
          <MenuItem
            key={conversation.id}
            selected={conversation.id === activeId}
            onClick={() => { setHistoryAnchor(null); openConversation(conversation.id); }}
            sx={{ maxWidth: 340 }}
          >
            <ListItemText
              primary={conversation.title || 'New chat'}
              secondary={conversation.preview || 'No messages yet'}
              slotProps={{ primary: { noWrap: true, fontWeight: 650 }, secondary: { noWrap: true, fontSize: '0.75rem' } }}
            />
          </MenuItem>
        ))}
      </Menu>

      <Box ref={listRef} onScroll={handleListScroll} role="log" aria-live="polite" aria-label="Vuprise AI messages" sx={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', px: { xs: 1.25, sm: 2 }, py: 2, minHeight: 0 }}>
        {loading && <Stack sx={{ py: 4, alignItems: 'center' }}><CircularProgress size={26} /></Stack>}
        {!loading && loadingThread && <Stack sx={{ py: 4, alignItems: 'center' }}><CircularProgress size={26} /></Stack>}
        {!loading && !loadingThread && messages.length === 0 && !sendError && (
          <Stack sx={{ pt: { xs: 2, sm: 4 }, px: 1, alignItems: 'center', textAlign: 'center' }}>
            <ReactableMark size={52} symbolOnly transparentBackground />
            <Typography variant="h6" sx={{ mt: 1.5 }}>{firstName ? `Hi ${firstName}, how can I help?` : 'How can I help?'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420 }}>
              Ask for outreach drafts, profile headlines, post ideas — or describe an image and Vuprise AI will generate it.
            </Typography>
            <Stack direction="row" gap={1} sx={{ flexWrap: 'wrap', justifyContent: 'center', mt: 2.5 }}>
              {AI_CHAT_SUGGESTIONS.map((suggestion) => (
                <Button key={suggestion} size="small" variant="outlined" onClick={() => handlePromptSend(suggestion)} disabled={sending} sx={{ textTransform: 'none', minHeight: 32 }}>
                  {suggestion}
                </Button>
              ))}
            </Stack>
          </Stack>
        )}
        <Stack gap={1.5}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            const attachments = Array.isArray(message.imageUrls) ? message.imageUrls : [];
            return (
              <Stack key={message.id} direction="row" spacing={1} sx={{ justifyContent: isUser ? 'flex-end' : 'flex-start', alignItems: 'flex-end' }}>
                {!isUser && <Box sx={{ flexShrink: 0, mb: 2.25 }}><ReactableMark size={26} symbolOnly transparentBackground /></Box>}
                <Box sx={{ maxWidth: { xs: '86%', sm: '74%' }, minWidth: 0 }}>
                  <Bubble tone={isUser ? 'user' : 'assistant'}>
                    {message.text}
                    {isUser && attachments.length > 0 && (
                      <Stack direction="row" gap={0.75} sx={{ mt: message.text ? 1 : 0, flexWrap: 'wrap' }}>
                        {attachments.map((url) => (
                          <Box key={url} component="img" src={url} alt="Attached image" loading="lazy" sx={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 1.5, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }} />
                        ))}
                      </Stack>
                    )}
                    {message.imageUrl && (
                      <>
                        <Box sx={{ mt: 0.5 }}>
                          <RefineFrame
                            status="complete"
                            aspectRatio="1 / 1"
                            width={420}
                            radius={12}
                            background={frameBackground}
                            color={frameColor}
                            stageDuration={400}
                            sweep
                            showStatus
                            hideAfter={1200}
                            labels={{ complete: 'Ready' }}
                            className="ai-generated-frame"
                          >
                            <Box component="img" src={message.imageUrl} alt={message.text || 'Generated image'} loading="lazy" onLoad={handleGeneratedImageLoad} />
                          </RefineFrame>
                        </Box>
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                          <Button
                            size="small"
                            component="a"
                            href={downloadUrlFor(message.imageUrl)}
                            download
                            target="_blank"
                            rel="noreferrer"
                            startIcon={<DownloadRoundedIcon sx={{ fontSize: 16 }} />}
                            sx={{ textTransform: 'none', minHeight: 30, color: 'inherit' }}
                          >
                            Download
                          </Button>
                          <Button
                            size="small"
                            component="a"
                            href={message.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            startIcon={<OpenInNewRoundedIcon sx={{ fontSize: 16 }} />}
                            sx={{ textTransform: 'none', minHeight: 30, color: 'inherit' }}
                          >
                            Open full size
                          </Button>
                        </Stack>
                      </>
                    )}
                  </Bubble>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, textAlign: isUser ? 'right' : 'left', fontSize: '0.68rem' }}>
                    {formatTime(message.createdAt)}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
          {generating && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', minHeight: 24 }}>
              <Box sx={{ flexShrink: 0, mt: 0.5 }}><ReactableMark size={20} symbolOnly transparentBackground /></Box>
              <RefineFrame
                status="generating"
                aspectRatio="1 / 1"
                width={260}
                radius={12}
                background={frameBackground}
                color={frameColor}
                stageDuration={400}
                sweep
                showStatus
                labels={{ generating: 'Generating image' }}
                className="ai-generated-frame"
              />
            </Stack>
          )}
          {!generating && thoughtVisible && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minHeight: 24 }}>
              <ReactableMark size={20} symbolOnly transparentBackground />
              <ThoughtLine
                working={sending}
                label="Vuprise AI is thinking…"
                doneLabel="Thought for"
                glyph="sparkle"
                steps={THINKING_STEPS}
                fontSize={12}
                breathPeriod={1.6}
                breathDepth={0.35}
                settleDuration={300}
                settleBlur={1}
                collapsible
                collapseOnSettle
                showTimer
                color={theme.palette.text.secondary}
              />
            </Stack>
          )}
          {sendError && !generating && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
              <Box sx={{ flexShrink: 0, mb: 1 }}><ReactableMark size={26} symbolOnly transparentBackground /></Box>
              <Bubble>
                <Typography variant="body2">{sendError.message}</Typography>
                <Button
                  size="small"
                  startIcon={<RefreshRoundedIcon sx={{ fontSize: 16 }} />}
                  onClick={handleRetry}
                  disabled={sending}
                  sx={{ mt: 0.75, textTransform: 'none', minHeight: 30 }}
                >
                  Retry
                </Button>
              </Bubble>
            </Stack>
          )}
        </Stack>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', px: { xs: 1.25, sm: 2 }, pt: 1.25, pb: { xs: 'calc(10px + env(safe-area-inset-bottom))', sm: 1.25 } }}>
        {error && <Alert severity="error" sx={{ mb: 1.25 }} onClose={() => setError('')}>{error}</Alert>}
        <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} multiple hidden onChange={() => {}} />
        <PromptBar
          placeholder="Ask Vuprise AI anything..."
          sources={AI_SOURCES}
          commands={AI_COMMANDS}
          models={AI_MODELS}
          defaultModel="vups-v1-fixed"
          efforts={AI_EFFORTS}
          defaultEffort="High"
          busy={sending}
          onSend={handlePromptSend}
          onStop={handleStop}
          onAttach={pickFiles}
          background={promptBackground}
          color={theme.palette.text.primary}
          menuBackground={theme.palette.background.paper}
          sparkColor={theme.palette.primary.main}
          sparkBoost={1}
          width={800}
          radius={18}
          maxRows={5}
          className="ai-prompt-bar"
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          AI replies can be inaccurate — double-check important details. Attachments: JPG, PNG, or WebP up to 5MB.
        </Typography>
        {imageQuota && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            AI images: {imageQuota.remaining} of {imageQuota.limit} remaining in the last 24 hours.
          </Typography>
        )}
      </Box>

      <SwipeToast
        open={toast.open}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
        title={toast.title}
        description={toast.description}
        duration={3000}
        fuse="bottom"
        pauseOnHover
        closeButton={false}
        background={theme.palette.background.paper}
        color={theme.palette.text.primary}
        fuseColor={toast.tone === 'error' ? theme.palette.error.main : theme.palette.primary.main}
        width={330}
        className="ai-attach-toast"
      />
    </Box>
  );
};

export default AiChatPanel;
