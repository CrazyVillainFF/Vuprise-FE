import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Server timestamps are the source of truth. An invalid or missing expiration
// is never converted into an invented unban time.
const parseExpiry = (expiresAt) => {
  const parsed = expiresAt ? new Date(expiresAt).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

function useCountdown(expiresAt) {
  const target = parseExpiry(expiresAt);
  const [remaining, setRemaining] = useState(() => target === null ? null : Math.max(0, target - Date.now()));
  useEffect(() => {
    if (target === null) { setRemaining(null); return undefined; }
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  if (target === null || remaining === null) return null;
  const seconds = Math.floor(remaining / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return { expired: seconds <= 0, label: `${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` };
}

export default function ModerationNoticeLayer() {
  const { restriction, dismissRestriction, pendingWarnings, acknowledgeWarning, user } = useAuth();
  const [warningBusy, setWarningBusy] = useState(false);
  const [warningError, setWarningError] = useState('');
  const navigate = useNavigate();
  const pending = pendingWarnings[0];
  const countdown = useCountdown(restriction?.status === 'temporary_ban' ? restriction.expiresAt : null);
  const expiredOnArrival = restriction?.status === 'temporary_ban' && parseExpiry(restriction?.expiresAt) !== null && countdown?.expired;

  // The countdown reaching zero never grants access by itself: it only returns
  // the member to sign-in, where the backend re-checks the ban before issuing a
  // session. A missing/invalid expiration keeps the notice visible instead.
  useEffect(() => {
    if (expiredOnArrival) {
      dismissRestriction();
      navigate('/signin', { replace: true });
    }
  }, [expiredOnArrival, dismissRestriction, navigate]);

  const appealType = restriction?.status === 'temporary_ban' ? 'temporary_ban_appeal' : restriction?.status === 'deletion_pending' ? 'deleted_account_inquiry' : 'permanent_ban_appeal';
  const appealEmail = restriction?.email || user?.email || '';
  const sendAppeal = () => {
    dismissRestriction();
    navigate(`/support/request?type=${appealType}${appealEmail ? `&email=${encodeURIComponent(appealEmail)}` : ''}`);
  };
  const closeNotice = () => {
    dismissRestriction();
    navigate('/signin', { replace: true });
  };
  const restrictionTitle = restriction?.status === 'temporary_ban'
    ? 'Your account is temporarily suspended'
    : restriction?.status === 'deletion_pending' ? 'Account deletion in progress' : 'Your account has been permanently banned';
  const acknowledge = async () => {
    setWarningBusy(true); setWarningError('');
    try { await acknowledgeWarning(pending._id); } catch (e) { setWarningError(e.message || 'Could not acknowledge this warning.'); }
    finally { setWarningBusy(false); }
  };
  return <>
    <Dialog open={Boolean(restriction)} onClose={dismissRestriction} fullWidth maxWidth="xs" aria-labelledby="restriction-title" sx={{ '& .MuiDialog-paper': { mx: 2, width: '100%' } }}>
      <DialogTitle id="restriction-title">{restrictionTitle}</DialogTitle>
      <DialogContent>
        <Stack gap={1.5}>
          {restriction?.status === 'temporary_ban' && <>
            <Typography>Your Vuprise account is temporarily banned, so sign-in is paused until the suspension ends.</Typography>
            {countdown && !countdown.expired
              ? <Alert severity="warning">Time remaining: {countdown.label}<br/>Ends: {new Date(restriction.expiresAt).toLocaleString()}</Alert>
              : parseExpiry(restriction?.expiresAt) !== null
                ? <Alert severity="info">This suspension has reached its scheduled end time. Try signing in again — access is restored only after the server confirms the ban has expired.</Alert>
                : <Alert severity="info">No scheduled unban time is available for this suspension. Access is restored only when the server clears it.</Alert>}
          </>}
          {restriction?.status === 'permanent_ban' && <Typography>Your Vuprise account has been permanently banned. There is no scheduled automatic unban time. You may request a review of this decision.</Typography>}
          {restriction?.status === 'deletion_pending' && <Typography>Sign-in is paused while the administrator finishes deleting your account.</Typography>}
          {restriction?.reason && <Typography color="text.secondary">Reason: {restriction.reason}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeNotice}>Close</Button>
        <Button variant="contained" onClick={sendAppeal}>Request Appeal</Button>
      </DialogActions>
    </Dialog>
    <Dialog open={!restriction && Boolean(pending)} fullWidth maxWidth="xs" aria-labelledby="warning-title">
      <DialogTitle id="warning-title">You Got a Warning</DialogTitle><DialogContent>{warningError && <Alert severity="error" sx={{ mb: 1 }}>{warningError}</Alert>}<Typography>{pending?.reason}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Issued {pending?.createdAt ? new Date(pending.createdAt).toLocaleString() : ''}. Please review Vuprise’s community guidelines.</Typography></DialogContent><DialogActions><Button variant="contained" disabled={warningBusy} onClick={acknowledge}>{warningBusy ? 'Saving…' : 'OK'}</Button></DialogActions>
    </Dialog>
  </>;
}
