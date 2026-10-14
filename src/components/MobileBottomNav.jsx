import React, { useEffect, useState } from 'react';
import { Paper, BottomNavigation, BottomNavigationAction, Badge } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import SlowMotionVideoRoundedIcon from '@mui/icons-material/SlowMotionVideoRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import CreatePostCard from './CreatePostCard';

const MobileBottomNav = ({ isReelsPage = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, unreadMessageCount } = useNotifications();
  const { user, isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [createReelOnOpen, setCreateReelOnOpen] = useState(false);

  useEffect(() => {
    const openComposer = (event) => {
      setCreateReelOnOpen(Boolean(event?.detail?.reelMode));
      setCreateOpen(true);
    };
    window.addEventListener('nexora:create-post', openComposer);
    return () => window.removeEventListener('nexora:create-post', openComposer);
  }, []);

  if (!isAuthenticated) return null;

  const profilePath = user ? `/profile/${user._id}` : '/signin';
  const activeValue = location.pathname.startsWith('/profile/') ? profilePath : location.pathname;

  return (
    <>
      <Paper
        component="nav"
        aria-label="Main navigation"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflowX: 'clip',
          zIndex: 1300,
          // The Reel view becomes a desktop viewer at md and up. Keeping the
          // phone bottom bar there both covers controls and makes the stage
          // feel incorrectly sized on landscape screens.
          display: isReelsPage ? { xs: 'block', md: 'none' } : { xs: 'block', lg: 'none' },
          borderTop: isReelsPage ? '1px solid rgba(255,255,255,.14)' : (theme) => `1px solid ${theme.palette.divider}`,
          backdropFilter: isReelsPage ? 'blur(10px)' : 'blur(12px)',
          bgcolor: isReelsPage ? 'rgba(8, 9, 11, 0.42)' : (theme) => theme.palette.mode === 'light'
            ? 'rgba(255, 255, 255, 0.94)'
            : 'rgba(0, 0, 0, 0.94)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        elevation={8}
      >
        <BottomNavigation
          showLabels
          value={activeValue}
          onChange={(event, value) => navigate(value)}
          sx={{
            height: 62,
            width: '100%',
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': { flex: '1 1 20%', minWidth: 0, maxWidth: 'none', px: 0.125, overflow: 'hidden', color: isReelsPage ? 'rgba(255,255,255,.72)' : undefined },
            '& .MuiBottomNavigationAction-label': { fontSize: { xs: '0.6rem', sm: '0.68rem' }, whiteSpace: 'nowrap' },
            '& .Mui-selected': { color: isReelsPage ? '#fff' : 'primary.main', fontWeight: 700 },
          }}
        >
          <BottomNavigationAction label="Home" value="/home" aria-label="Home" icon={<HomeRoundedIcon />} />
          <BottomNavigationAction
            label="Message"
            value="/messages"
            aria-label={`Messages${unreadMessageCount ? `, ${unreadMessageCount} unread` : ''}`}
            icon={unreadMessageCount > 0
              ? <Badge badgeContent={unreadMessageCount} color="error" max={99}><ChatBubbleOutlineRoundedIcon /></Badge>
              : <ChatBubbleOutlineRoundedIcon />}
          />
          <BottomNavigationAction label="Reels" value="/reels" aria-label="Open Reels" icon={<SlowMotionVideoRoundedIcon />} />
          <BottomNavigationAction
            label="Alerts"
            value="/notifications"
            aria-label={`Alerts${unreadCount ? `, ${unreadCount} unread` : ''}`}
            icon={unreadCount > 0
              ? <Badge badgeContent={unreadCount} color="error"><NotificationsRoundedIcon /></Badge>
              : <NotificationsRoundedIcon />}
          />
          <BottomNavigationAction label="Profile" value={profilePath} aria-label="Profile" icon={<PersonOutlineRoundedIcon />} />
        </BottomNavigation>
      </Paper>
      <CreatePostCard
        showTrigger={false}
        open={createOpen}
        initialReelMode={createReelOnOpen}
        onOpenChange={(nextOpen) => {
          setCreateOpen(nextOpen);
          if (!nextOpen) setCreateReelOnOpen(false);
        }}
        onPostCreated={(post) => window.dispatchEvent(new CustomEvent('nexora:post-created', { detail: post }))}
      />
    </>
  );
};

export default MobileBottomNav;
