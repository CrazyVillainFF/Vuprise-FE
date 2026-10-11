import React, { useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Tooltip, Typography } from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined';
import { connectionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ConnectionButton = ({
  userId,
  userName = 'this user',
  initialStatus = 'none', // 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'self'
  connectionId,
  size = 'medium',
  onStatusChange,
  sx = {}
}) => {
  const { isAuthenticated, user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  // If viewing self, do not show button
  if (status === 'self' || (currentUser && currentUser._id === userId)) {
    return null;
  }

  const handleConnect = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    try {
      setLoading(true);
      setActionError('');
      const res = await connectionAPI.sendRequest(userId);
      if (res.data.success) {
        setStatus('pending_sent');
        window.dispatchEvent(new Event('nexora:notifications-refresh'));
        if (onStatusChange) onStatusChange('pending_sent');
      }
    } catch (err) {
      console.error('[Connection] Error sending request:', err.message);
      setActionError(err.message || 'Connection request could not be sent.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e) => {
    e.stopPropagation();
    try {
      setLoading(true);
      setActionError('');
      const res = await connectionAPI.acceptRequest(connectionId || userId);
      if (res.data.success) {
        setStatus('connected');
        window.dispatchEvent(new Event('nexora:notifications-refresh'));
        if (onStatusChange) onStatusChange('connected');
      }
    } catch (err) {
      console.error('[Connection] Error accepting:', err.message);
      setActionError(err.message || 'Connection request could not be accepted.');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectOrRemove = async (e) => {
    e?.stopPropagation();
    try {
      setLoading(true);
      setActionError('');
      const res = await connectionAPI.rejectOrRemove(connectionId || userId);
      if (res.data.success) {
        setStatus('none');
        window.dispatchEvent(new Event('nexora:notifications-refresh'));
        setDisconnectConfirmOpen(false);
        if (onStatusChange) onStatusChange('none');
      }
    } catch (err) {
      console.error('[Connection] Error rejecting/removing:', err.message);
      setActionError(err.message || 'Connection could not be updated.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && status !== 'connected') {
    return (
      <Button size={size} disabled variant="outlined" sx={{ minWidth: 100, ...sx }}>
        <CircularProgress size={18} />
      </Button>
    );
  }

  if (status === 'pending_received') {
      return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={sx} onClick={(e) => e.stopPropagation()}>
        <Button
          size={size}
          variant="contained"
          color="primary"
          onClick={handleAccept}
          disabled={loading}
          startIcon={<CheckRoundedIcon />}
        >
          Accept
        </Button>
        <Button
          size={size}
          variant="outlined"
          color="inherit"
          onClick={handleRejectOrRemove}
          disabled={loading}
        >
          Decline
        </Button>
        {actionError && <Alert severity="error" sx={{ flexBasis: '100%' }}>{actionError}</Alert>}
      </Stack>
    );
  }

  if (status === 'pending_sent') {
    return (
      <Stack spacing={0.75} sx={{ minWidth: 0 }}>
        <Tooltip title="Click to cancel pending invitation">
          <Button size={size} variant="outlined" color="inherit" onClick={handleRejectOrRemove} startIcon={<HourglassEmptyRoundedIcon />} sx={{ borderColor: 'divider', color: 'text.secondary', '&:hover': { borderColor: 'error.main', color: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.05)' }, ...sx }}>
            Pending
          </Button>
        </Tooltip>
        {actionError && <Alert severity="error" sx={{ maxWidth: 320 }}>{actionError}</Alert>}
      </Stack>
    );
  }

  if (status === 'connected') {
    return (
      <>
        {actionError && <Alert severity="error" sx={{ mb: 1 }}>{actionError}</Alert>}
        <Button
          size={size}
          variant="outlined"
          color={isHovered ? 'error' : 'primary'}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(event) => {
            event.stopPropagation();
            setDisconnectConfirmOpen(true);
          }}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : (isHovered ? <PersonRemoveOutlinedIcon /> : <CheckRoundedIcon />)}
          aria-label={`Disconnect from ${userName}`}
          sx={{
            minWidth: 110,
            transition: 'all 0.2s',
            borderColor: isHovered ? 'error.main' : 'primary.main',
            ...sx
          }}
        >
          {isHovered ? 'Disconnect' : 'Connected'}
        </Button>
        <Dialog
          open={disconnectConfirmOpen}
          onClose={() => !loading && setDisconnectConfirmOpen(false)}
          aria-labelledby="disconnect-confirm-title"
          aria-describedby="disconnect-confirm-description"
          PaperProps={{ sx: { borderRadius: 3, p: 1, width: 'min(100% - 32px, 420px)' } }}
        >
          <DialogTitle id="disconnect-confirm-title" sx={{ fontWeight: 700 }}>
            Disconnect from {userName}?
          </DialogTitle>
          <DialogContent>
            <Typography id="disconnect-confirm-description" variant="body2" color="text.secondary">
              Are you sure you want to disconnect from {userName}? You will both be removed from each other’s connections.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, pb: 2 }}>
            <Button onClick={() => setDisconnectConfirmOpen(false)} disabled={loading} variant="outlined" color="inherit">
              Cancel
            </Button>
            <Button onClick={() => handleRejectOrRemove()} disabled={loading} variant="contained" color="error">
              {loading ? <CircularProgress size={18} color="inherit" /> : 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Default: 'none'
  return (
    <Stack spacing={0.75} sx={{ minWidth: 0 }}>
      <Button size={size} variant="contained" color="primary" onClick={handleConnect} startIcon={<PersonAddOutlinedIcon />} sx={sx}>
        Connect
      </Button>
      {actionError && <Alert severity="error" sx={{ maxWidth: 320 }}>{actionError}</Alert>}
    </Stack>
  );
};

export default ConnectionButton;
