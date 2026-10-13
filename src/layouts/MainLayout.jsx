import React, { useEffect } from 'react';
import { Avatar, Box, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import SiteBackdrop from '../components/SiteBackdrop';
import LocationOnboardingDialog from '../components/LocationOnboardingDialog';
import WelcomeMoment from '../components/WelcomeMoment';

const MainLayout = () => {
  const { welcomeMessage, clearWelcomeMessage } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileMessages = location.pathname === '/messages' && isMobile;
  const isLandingPage = location.pathname === '/';
  const { incomingToast, dismissIncomingToast } = useNotifications();

  useEffect(() => {
    if (!welcomeMessage) return undefined;
    const timeout = window.setTimeout(clearWelcomeMessage, 5000);
    return () => window.clearTimeout(timeout);
  }, [welcomeMessage, clearWelcomeMessage]);

  useEffect(() => {
    if (!incomingToast) return undefined;
    const timeout = window.setTimeout(dismissIncomingToast, 5500);
    return () => window.clearTimeout(timeout);
  }, [incomingToast, dismissIncomingToast]);

  const openIncomingToast = () => {
    const destination = incomingToast?.kind === 'message' ? '/messages' : '/notifications';
    dismissIncomingToast();
    navigate(destination);
  };

  return (
    <Box sx={{
      minHeight: isMobileMessages ? 0 : '100dvh',
      height: isMobileMessages ? '100dvh' : undefined,
      overflow: isMobileMessages ? 'hidden' : undefined,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      isolation: 'isolate',
      zIndex: 1,
    }}>
      {!isLandingPage && <SiteBackdrop />}
      <Navbar />
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: isMobileMessages ? 0 : undefined,
          display: isMobileMessages ? 'flex' : undefined,
          flexDirection: isMobileMessages ? 'column' : undefined,
          overflow: isMobileMessages ? 'hidden' : undefined,
          width: '100%',
          minWidth: 0,
          position: 'relative',
          zIndex: 1,
          py: isMobileMessages ? 1.5 : { xs: 2.5, md: 4 },
          pb: isMobileMessages ? 'calc(62px + env(safe-area-inset-bottom))' : { xs: 'calc(62px + env(safe-area-inset-bottom) + 24px)', lg: 5 },
        }}
      >
        <Outlet />
      </Box>
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 68px)',
          left: 0,
          right: 0,
          zIndex: 1500,
          px: 1.5,
          display: incomingToast ? 'flex' : 'none',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        {incomingToast && (
          <Paper
            key={incomingToast.id}
            role="button"
            onClick={openIncomingToast}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openIncomingToast();
              }
            }}
            tabIndex={0}
            elevation={10}
            sx={{
              width: '100%',
              maxWidth: 520,
              minHeight: 68,
              px: 1.5,
              py: 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              border: 1,
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: (currentTheme) => currentTheme.palette.mode === 'light' ? 'rgba(255,255,255,.96)' : 'rgba(0,0,0,.96)',
              backdropFilter: 'blur(18px)',
              boxShadow: '0 12px 36px rgba(0,0,0,.3)',
              cursor: 'pointer',
              pointerEvents: 'auto',
              animation: 'inbox-toast-enter 220ms cubic-bezier(.2,.8,.2,1)',
              '@keyframes inbox-toast-enter': {
                from: { opacity: 0, transform: 'translateY(-12px) scale(.98)' },
                to: { opacity: 1, transform: 'translateY(0) scale(1)' },
              },
            }}
          >
            <Avatar src={incomingToast.avatar || undefined} sx={{ width: 42, height: 42, flexShrink: 0, bgcolor: 'primary.main' }}>
              {incomingToast.kind === 'message' ? <ChatBubbleRoundedIcon fontSize="small" /> : <NotificationsActiveRoundedIcon fontSize="small" />}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" gap={1}>
                <Typography variant="subtitle2" fontWeight={750} noWrap>{incomingToast.title}</Typography>
                <Typography variant="caption" color="text.secondary" flexShrink={0}>now</Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" noWrap>{incomingToast.body}</Typography>
            </Box>
            <Typography variant="caption" color="primary.main" fontWeight={750} sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}>Open</Typography>
          </Paper>
        )}
      </Box>
      <MobileBottomNav />
      <WelcomeMoment message={welcomeMessage} />
      <LocationOnboardingDialog />
    </Box>
  );
};

export default MainLayout;
