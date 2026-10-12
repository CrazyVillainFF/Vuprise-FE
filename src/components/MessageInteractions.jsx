import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Popover, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { groupAPI, messageAPI, supportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
export default function MessageInteractions({ message, scope, threadId, onReactions, canReport = false }) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const list = Array.isArray(message.reactions) ? message.reactions : [];
  const chooseReaction = async (emoji) => {
    setAnchor(null); setBusy(true); setError('');
    try {
      const response = scope === 'group'
        ? await groupAPI.toggleReaction(threadId, message._id, emoji)
        : await messageAPI.toggleReaction(threadId, message._id, emoji);
      onReactions?.(message._id, response.data.reactions || []);
    } catch (err) { setError(err.response?.data?.message || 'Could not save this reaction.'); }
    finally { setBusy(false); }
  };
  const submitReport = async () => {
    const clean = reason.trim();
    if (clean.length < 10 || !user?.email) return;
    setBusy(true); setError('');
    try {
      await supportAPI.submit({ type: 'report', email: user.email, subject: 'Reported message', category: `${scope}_message`, message: clean, reportedMessage: message._id, reportedMessageScope: scope, reportedThreadId: threadId });
      setSent(true); setReportOpen(false); setReason('');
    } catch (err) { setError(err.response?.data?.message || 'Could not submit this report. Please try again.'); }
    finally { setBusy(false); }
  };
  return <>
    <Stack direction="row" spacing={0.15} alignItems="center">
      <Tooltip title="React to message"><span><IconButton size="small" disabled={busy} onClick={(event) => setAnchor(event.currentTarget)} aria-label="React to message" sx={{ p: 0.35 }}><AddReactionOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
      {reactions.map((emoji) => { const count = list.filter((item) => item.emoji === emoji).length; const mine = list.some((item) => item.emoji === emoji && String(item.user?._id || item.user) === String(user?._id)); return count > 0 ? <Button key={emoji} size="small" onClick={() => chooseReaction(emoji)} disabled={busy} aria-label={`${emoji}, ${count} reactions`} sx={{ minWidth: 0, px: 0.65, py: 0.1, lineHeight: 1.2, borderRadius: 3, bgcolor: mine ? 'action.selected' : 'transparent' }}>{emoji} {count}</Button> : null; })}
      {canReport && <Tooltip title="Report message"><span><IconButton size="small" disabled={busy || sent} onClick={() => { setError(''); setReportOpen(true); }} aria-label="Report message" sx={{ p: 0.35, color: 'warning.main' }}><FlagOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>}
    </Stack>
    {!!error && <Typography role="alert" variant="caption" color="error.main" sx={{ display: 'block' }}>{error}</Typography>}
    {sent && <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>Report sent</Typography>}
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Stack direction="row" spacing={0.25} sx={{ p: 0.5 }}>{reactions.map((emoji) => <IconButton key={emoji} onClick={() => chooseReaction(emoji)} disabled={busy} aria-label={`React with ${emoji}`} sx={{ fontSize: 20 }}>{emoji}</IconButton>)}</Stack></Popover>
    <Dialog open={reportOpen} onClose={() => !busy && setReportOpen(false)} fullWidth maxWidth="xs"><DialogTitle>Report message</DialogTitle><DialogContent><Alert severity="info" sx={{ mb: 1.5 }}>Only moderators can review this report. Message content is not copied into the report.</Alert><TextField autoFocus fullWidth multiline minRows={3} label="Why are you reporting this?" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 1000))} inputProps={{ maxLength: 1000 }} /></DialogContent><DialogActions><Button onClick={() => setReportOpen(false)} disabled={busy}>Cancel</Button><Button color="warning" variant="contained" onClick={submitReport} disabled={busy || reason.trim().length < 10}>{busy ? 'Sending…' : 'Send report'}</Button></DialogActions></Dialog>
  </>;
}
