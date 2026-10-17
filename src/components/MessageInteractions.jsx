import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Popover, Stack, TextField, Tooltip, Typography } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { groupAPI, messageAPI, supportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EvidencePhotoPicker from './EvidencePhotoPicker';

const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
export default function MessageInteractions({ message, scope, threadId, onReactions, canReport = false }) {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const closeReport = () => {
    if (busy) return;
    setReportOpen(false);
    setReason('');
    setEvidenceFiles([]);
    setError('');
  };
  const list = Array.isArray(message.reactions) ? message.reactions : [];
  const chooseReaction = async (emoji) => {
    setAnchor(null); setBusy(true); setError('');
    try {
      const response = scope === 'group'
        ? await groupAPI.toggleReaction(threadId, message._id, emoji)
        : await messageAPI.toggleReaction(threadId, message._id, emoji);
      onReactions?.(message._id, response.data.reactions || []);
    } catch (err) {
      const message = err.response?.data?.message || '';
      const missingReactionRoute = err.response?.status === 404 && /Resource not found.*\/reactions/i.test(message);
      setError(missingReactionRoute
        ? 'The active backend does not have the reaction route yet. Redeploy the latest Vuprise backend, then reload this chat.'
        : message || 'Could not save this reaction.');
    }
    finally { setBusy(false); }
  };
  const submitReport = async () => {
    const clean = reason.trim();
    if (clean.length < 10 || !user?.email) return;
    setBusy(true); setError('');
    try {
      const payload = new FormData();
      Object.entries({ type: 'report', email: user.email, subject: 'Reported message', category: `${scope}_message`, message: clean, reportedMessage: message._id, reportedMessageScope: scope, reportedThreadId: threadId }).forEach(([key, value]) => payload.append(key, value));
      evidenceFiles.forEach((file) => payload.append('evidence', file));
      await supportAPI.submit(payload);
      setSent(true); setReportOpen(false); setReason(''); setEvidenceFiles([]);
    } catch (err) { setError(err.response?.data?.message || 'Could not submit this report. Please try again.'); }
    finally { setBusy(false); }
  };
  return <>
    <Stack direction="row" spacing={0.15} alignItems="center">
      <Tooltip title="React to message"><span><IconButton size="small" disabled={busy} onClick={(event) => setAnchor(event.currentTarget)} aria-label="React to message" sx={{ p: 0.35 }}><AddReactionOutlinedIcon sx={{ fontSize: 16 }} /></IconButton></span></Tooltip>
      {reactions.map((emoji) => { const count = list.filter((item) => item.emoji === emoji).length; const mine = list.some((item) => item.emoji === emoji && String(item.user?._id || item.user) === String(user?._id)); return count > 0 ? <Button key={emoji} size="small" onClick={() => chooseReaction(emoji)} disabled={busy} aria-label={`${emoji}, ${count} reactions`} sx={{ minWidth: 0, minHeight: 22, px: 0.5, py: 0, gap: 0.35, lineHeight: 1, borderRadius: 999, fontSize: '0.7rem', bgcolor: mine ? 'action.selected' : 'transparent', '& .message-reaction-emoji': { fontSize: '0.78rem', lineHeight: 1 }, '& .message-reaction-count': { fontSize: '0.68rem', lineHeight: 1 } }}><span className="message-reaction-emoji">{emoji}</span><span className="message-reaction-count">{count}</span></Button> : null; })}
      {canReport && <Tooltip title="Report message"><span><IconButton size="small" disabled={busy || sent} onClick={() => { setError(''); setReportOpen(true); }} aria-label="Report message" sx={{ p: 0.35, color: 'warning.main' }}><FlagOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></span></Tooltip>}
    </Stack>
    {!!error && <Typography role="alert" variant="caption" color="error.main" sx={{ display: 'block' }}>{error}</Typography>}
    {sent && <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>Report sent</Typography>}
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}><Stack direction="row" spacing={0.25} sx={{ p: 0.5 }}>{reactions.map((emoji) => <IconButton key={emoji} onClick={() => chooseReaction(emoji)} disabled={busy} aria-label={`React with ${emoji}`} sx={{ fontSize: 20 }}>{emoji}</IconButton>)}</Stack></Popover>
    <Dialog open={reportOpen} onClose={closeReport} fullWidth maxWidth="xs"><DialogTitle>Report message</DialogTitle><DialogContent><Alert severity="info" sx={{ mb: 1.5 }}>Only moderators can review this report. Message content is not copied into the report.</Alert><TextField autoFocus fullWidth multiline minRows={3} label="Why are you reporting this?" value={reason} onChange={(event) => setReason(event.target.value.slice(0, 1000))} slotProps={{ htmlInput: { maxLength: 1000 } }} /><EvidencePhotoPicker files={evidenceFiles} onChange={setEvidenceFiles} disabled={busy}/></DialogContent><DialogActions><Button onClick={closeReport} disabled={busy}>Cancel</Button><Button color="warning" variant="contained" onClick={submitReport} disabled={busy || reason.trim().length < 10}>{busy ? 'Sending…' : 'Send report'}</Button></DialogActions></Dialog>
  </>;
}
