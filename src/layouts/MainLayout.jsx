import React, { useEffect } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import SiteBackdrop from '../components/SiteBackdrop';
import LocationOnboardingDialog from '../components/LocationOnboardingDialog';
import WelcomeMoment from '../components/WelcomeMoment';

const MainLayout = () => {
  const { welcomeMessage, clearWelcomeMessage } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileMessages = location.pathname === '/messages' && isMobile;

  useEffect(() => {
    if (!welcomeMessage) return undefined;
    const timeout = window.setTimeout(clearWelcomeMessage, 5000);
    return () => window.clearTimeout(timeout);
  }, [welcomeMessage, clearWelcomeMessage]);

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
      <SiteBackdrop />
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
      <MobileBottomNav />
      <WelcomeMoment message={welcomeMessage} />
      <LocationOnboardingDialog />
    </Box>
  );
};

export default MainLayout;
