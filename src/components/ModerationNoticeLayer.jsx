import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function useRemaining(expiresAt) {
  const [remaining, setRemaining] = useState(() => expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const update = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer);
  }, [expiresAt]);
  const seconds = Math.floor(remaining / 1000);
  const d = Math.floor(seconds / 86400); const h = Math.floor((seconds % 86400) / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
  return `${String(d).padStart(2, '0')} days, ${String(h).padStart(2, '0')} hours, ${String(m).padStart(2, '0')} minutes, ${String(s).padStart(2, '0')} seconds`;
}

export default function ModerationNoticeLayer() {
  const { restriction, dismissRestriction, pendingWarnings, acknowledgeWarning } = useAuth();
  const [warningBusy, setWarningBusy] = useState(false);
  const [warningError, setWarningError] = useState('');
  const navigate = useNavigate();
  const pending = pendingWarnings[0];
  const remaining = useRemaining(restriction?.expiresAt);
  useEffect(() => {
    if (restriction?.status === 'temporary_ban' && remaining.startsWith('00 days, 00 hours, 00 minutes, 00 seconds')) {
      dismissRestriction();
      navigate('/signin', { replace: true });
    }
  }, [restriction, remaining, dismissRestriction, navigate]);
  const sendAppeal = () => {
    const type = restriction?.status === 'temporary_ban' ? 'temporary_ban_appeal' : restriction?.status === 'deletion_pending' ? 'deleted_account_inquiry' : 'permanent_ban_appeal';
    dismissRestriction(); navigate(`/support/request?type=${type}`);
  };
  const restrictionTitle = restriction?.status === 'temporary_ban' ? 'You Got Temporarily Banned' : restriction?.status === 'deletion_pending' ? 'Account deletion in progress' : 'You Got Banned';
  const acknowledge = async () => {
    setWarningBusy(true); setWarningError('');
    try { await acknowledgeWarning(pending._id); } catch (e) { setWarningError(e.message || 'Could not acknowledge this warning.'); }
    finally { setWarningBusy(false); }
  };
  return <>
    <Dialog open={Boolean(restriction)} onClose={dismissRestriction} fullWidth maxWidth="xs" aria-labelledby="restriction-title">
      <DialogTitle id="restriction-title">{restrictionTitle}</DialogTitle>
      <DialogContent><Stack gap={1.5}><Typography>{restriction?.status === 'temporary_ban' ? 'Your account is temporarily restricted until the displayed expiration time.' : restriction?.status === 'deletion_pending' ? 'Sign-in is paused while the administrator finishes deleting your account.' : 'Your account has been permanently restricted from accessing Vuprise. You may submit a request for review.'}</Typography>{restriction?.status === 'temporary_ban' && <Alert severity="warning">Time remaining: {remaining}<br/>Ends: {restriction.expiresAt ? new Date(restriction.expiresAt).toLocaleString() : 'Not specified'}</Alert>}{restriction?.reason && <Typography color="text.secondary">Reason: {restriction.reason}</Typography>}</Stack></DialogContent>
      <DialogActions><Button onClick={() => { dismissRestriction(); navigate('/signin', { replace: true }); }}>{restriction?.status === 'temporary_ban' ? 'Come Later' : 'OK'}</Button><Button variant="contained" onClick={sendAppeal}>Send Request</Button></DialogActions>
    </Dialog>
    <Dialog open={!restriction && Boolean(pending)} fullWidth maxWidth="xs" aria-labelledby="warning-title">
      <DialogTitle id="warning-title">You Got a Warning</DialogTitle><DialogContent>{warningError && <Alert severity="error" sx={{ mb: 1 }}>{warningError}</Alert>}<Typography>{pending?.reason}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Issued {pending?.createdAt ? new Date(pending.createdAt).toLocaleString() : ''}. Please review Vuprise’s community guidelines.</Typography></DialogContent><DialogActions><Button variant="contained" disabled={warningBusy} onClick={acknowledge}>{warningBusy ? 'Saving…' : 'OK'}</Button></DialogActions>
    </Dialog>
  </>;
}
