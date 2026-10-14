import React from 'react';
import { Alert, Box, Button, Collapse, IconButton, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { usePublishing } from '../context/PublishingContext';
import StatusMark from './reactbits/StatusMark';
import Stepper, { Step } from './reactbits/Stepper';

const stageLabel = (stage) => ({
  preparing: 'Preparing post',
  uploading: 'Uploading media',
  processing: 'Processing video',
  publishing: 'Publishing post',
  published: 'Published successfully',
  failed: 'Publishing failed',
}[stage] || 'Publishing');

const PublishingStatusPill = () => {
  const { status, dismissPublishing, toggleExpanded } = usePublishing();
  const theme = useTheme();
  const navigate = useNavigate();
  if (!status?.visible) return null;

  const isActive = ['preparing', 'uploading', 'processing', 'publishing'].includes(status.stage);
  const Icon = status.stage === 'published' ? CheckCircleRoundedIcon : status.stage === 'failed' ? ErrorOutlineRoundedIcon : CloudUploadRoundedIcon;
  const retry = async (event) => {
    event.stopPropagation();
    await status.retry?.();
  };

  return (
    <Paper
      component="section"
      aria-label="Post publishing status"
      aria-live="polite"
      elevation={9}
      sx={{
        position: 'fixed',
        zIndex: (theme) => theme.zIndex.snackbar + 2,
        top: 'calc(env(safe-area-inset-top, 0px) + 76px)',
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: 'calc(100vw - 28px)', sm: 420 },
        maxWidth: 'calc(100vw - 20px)',
        overflow: 'hidden',
        borderRadius: 999,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, .96)' : 'rgba(255,255,255,.97)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 12px 36px rgba(0,0,0,.22)',
        animation: 'publish-pill-in 180ms ease-out',
        '@keyframes publish-pill-in': { from: { opacity: 0, transform: 'translate(-50%, -8px) scale(.98)' }, to: { opacity: 1, transform: 'translate(-50%, 0) scale(1)' } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 56, px: 1.25 }}>
        <Box
          component="button"
          type="button"
          onClick={toggleExpanded}
          aria-expanded={status.expanded}
          aria-label={`${stageLabel(status.stage)}. ${status.progress == null ? '' : `${status.progress}% complete.`} Tap for details`}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.1, minWidth: 0, flex: 1, p: .5, border: 0, bgcolor: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', borderRadius: 999, '&:focus-visible': { outline: '3px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}
        >
          <Box sx={{ width: 34, height: 34, flex: '0 0 34px', borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: status.stage === 'failed' ? 'error.light' : 'action.hover', color: status.stage === 'failed' ? 'error.dark' : 'primary.main' }}>
            {isActive ? <StatusMark status="running" progress={status.stage === 'uploading' && status.progress != null ? status.progress / 100 : undefined} label={stageLabel(status.stage)} size={20} fontSize={0} /> : status.stage === 'published' ? <StatusMark status="done" size={21} /> : status.stage === 'failed' ? <StatusMark status="failed" size={21} /> : <Icon fontSize="small" />}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{stageLabel(status.stage)}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{status.stage === 'failed' ? status.message : status.title || 'Your post is being saved securely'}</Typography>
          </Box>
          {status.progress != null && status.stage === 'uploading' && <Typography variant="caption" fontWeight={700} sx={{ flexShrink: 0 }}>{status.progress}%</Typography>}
        </Box>
          {status.stage === 'published' && status.post?._id && <Button size="small" onClick={(event) => { event.stopPropagation(); navigate(`/post/${status.post._id}`); dismissPublishing(); }} sx={{ flexShrink: 0 }}>View</Button>}
          {status.stage === 'failed' && status.retry && <Button size="small" onClick={retry} sx={{ flexShrink: 0, minWidth: 56 }}>Retry</Button>}
        <IconButton size="small" onClick={dismissPublishing} aria-label="Minimize publishing status" sx={{ width: 34, height: 34, flexShrink: 0 }}><CloseRoundedIcon fontSize="small" /></IconButton>
      </Stack>
      {isActive && status.stage === 'uploading' && (
        <LinearProgress
          variant={status.progress == null ? 'indeterminate' : 'determinate'}
          value={status.progress ?? undefined}
          aria-label={status.progress == null ? 'Uploading media' : `Uploading media ${status.progress}%`}
          sx={{ height: 2 }}
        />
      )}
      <Collapse in={status.expanded}>
        <Box sx={{ px: 2, pb: 1.5, pt: .5 }}>
          {status.stage !== 'failed' && <Stepper step={status.stage === 'preparing' ? 1 : status.stage === 'uploading' ? 2 : status.stage === 'published' ? 4 : 3} accentColor={theme.palette.text.primary} theme={theme.palette.mode} style={{ marginBottom: 8 }}><Step title="Preparing"/><Step title="Uploading"/><Step title="Publishing"/><Step title="Published"/></Stepper>}
          <Stack direction="row" spacing={1.25} alignItems="center">
            {status.previewUrl && <Box component={status.isVideo ? 'video' : 'img'} src={status.previewUrl} muted playsInline aria-label="Selected media preview" sx={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 1.5, bgcolor: 'action.hover' }} />}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700}>{stageLabel(status.stage)}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{status.message || 'We will keep this status updated while your post is processed.'}</Typography>
              {status.bytesTotal > 0 && <Typography variant="caption" color="text.secondary" display="block">{(status.bytesUploaded || 0).toLocaleString()} / {status.bytesTotal.toLocaleString()} bytes</Typography>}
            </Box>
          </Stack>
          {status.stage === 'failed' && status.message && <Alert severity="error" sx={{ mt: 1 }}>{status.message}</Alert>}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default PublishingStatusPill;
