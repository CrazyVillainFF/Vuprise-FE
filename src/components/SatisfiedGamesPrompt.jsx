import React, { useEffect, useState } from 'react';
import { Button, IconButton, Paper, Slide, Snackbar, Stack } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STORAGE_KEY = 'vuprise.satisfied-games.prompt-seen.v1';

const SatisfiedGamesPrompt = () => {
  const { loading, welcomeMessage, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isAuthPage = ['/signin', '/signup', '/forgot-password'].includes(location.pathname);
    if (loading || welcomeMessage || location.pathname === '/satisfied-games' || (isAuthPage && !isAuthenticated)) return undefined;
    try { if (localStorage.getItem(STORAGE_KEY)) return undefined; } catch { /* show once for this mounted session */ }
    const timeout = window.setTimeout(() => {
      setOpen(true);
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* state still keeps this mount one-shot */ }
    }, 850);
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated, loading, location.pathname, welcomeMessage]);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* no-op */ }
  };

  const explore = () => {
    close();
    navigate('/satisfied-games');
  };

  return (
    <Snackbar
      open={open}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      slots={{ transition: Slide }}
      slotProps={{ transition: { direction: 'up' } }}
      sx={{
        bottom: { xs: isAuthenticated ? '88px !important' : '20px !important', sm: '24px !important' },
        right: { xs: '12px !important', sm: '24px !important' },
        left: { xs: '12px !important', sm: 'auto !important' },
        '& .MuiSnackbarContent-root': { width: '100%' },
      }}
    >
      <Paper
        role="status"
        aria-live="polite"
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: { xs: '100%', sm: 'auto' },
          maxWidth: 340,
          p: 0.75,
          borderRadius: 999,
          color: 'text.primary',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 10px 32px rgba(0, 0, 0, 0.22)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.25}>
          <Button
            onClick={explore}
            endIcon={<ArrowForwardRoundedIcon />}
            aria-label="Explore Satisfied Games"
            sx={{
              minHeight: 44,
              px: 2,
              borderRadius: 999,
              color: 'primary.main',
              fontWeight: 750,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Explore Satisfied Games
          </Button>
          <IconButton onClick={close} aria-label="Dismiss game notification" size="small" sx={{ ml: 0.25 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>
    </Snackbar>
  );
};

export default SatisfiedGamesPrompt;
