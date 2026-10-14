import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { supportAPI } from '../services/api';
import EvidencePhotoPicker from './EvidencePhotoPicker';

export default function ReportDialog({ open, onClose, reportedUser, reportedPost, reportedComment, subject, onSubmitted }) {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);

  const close = () => {
    if (busy) return;
    setReason('');
    setEvidenceFiles([]);
    setError('');
    onClose?.();
  };

  const submit = async (event) => {
    event.preventDefault();
    const clean = reason.trim();
    if (clean.length < 10 || !user?.email || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = new FormData();
      Object.entries({
        type: 'report', email: user.email, userId: user._id, subject,
        category: reportedComment ? 'comment' : reportedUser ? 'profile' : 'post', message: clean,
        ...(reportedComment ? { reportedComment } : reportedUser ? { reportedUser } : { reportedPost }),
      }).forEach(([key, value]) => payload.append(key, value));
      evidenceFiles.forEach((file) => payload.append('evidence', file));
      await supportAPI.submit(payload);
      setReason('');
      setEvidenceFiles([]);
      onSubmitted?.();
      onClose?.();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not submit this report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="report-dialog-title">
      <form onSubmit={submit}>
        <DialogTitle id="report-dialog-title">Report {reportedComment ? 'comment' : reportedUser ? 'profile' : 'post'}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Moderators will review this report. Please don’t include private information.
          </Alert>
          {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Why are you reporting this?"
            value={reason}
            onChange={(event) => setReason(event.target.value.slice(0, 1000))}
            inputProps={{ maxLength: 1000, minLength: 10 }}
            helperText={`${reason.trim().length}/1000 · at least 10 characters`}
          />
          <EvidencePhotoPicker files={evidenceFiles} onChange={setEvidenceFiles} disabled={busy}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={busy}>Cancel</Button>
          <Button type="submit" color="warning" variant="contained" disabled={busy || reason.trim().length < 10}>
            {busy ? 'Sending…' : 'Send report'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
