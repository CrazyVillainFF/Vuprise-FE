import React, { useEffect, useState } from 'react';
import { Paper, BottomNavigation, BottomNavigationAction, Badge, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import CreatePostCard from './CreatePostCard';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount, unreadMessageCount } = useNotifications();
  const { user, isAuthenticated } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const openComposer = () => setCreateOpen(true);
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
          display: { xs: 'block', lg: 'none' },
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(12px)',
          bgcolor: (theme) => theme.palette.mode === 'light'
            ? 'rgba(255, 255, 255, 0.94)'
            : 'rgba(0, 0, 0, 0.94)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        elevation={8}
      >
        <BottomNavigation
          showLabels
          value={activeValue}
          onChange={(event, value) => {
            if (value === 'create') {
              setCreateOpen(true);
              return;
            }
            navigate(value);
          }}
          sx={{
            height: 62,
            width: '100%',
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': { flex: '1 1 20%', minWidth: 0, maxWidth: 'none', px: 0.125, overflow: 'hidden' },
            '& .MuiBottomNavigationAction-label': { fontSize: { xs: '0.6rem', sm: '0.68rem' }, whiteSpace: 'nowrap' },
            '& .Mui-selected': { color: 'primary.main', fontWeight: 700 },
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
          <BottomNavigationAction
            label=""
            value="create"
            aria-label="Create post"
            icon={(
              <Box aria-hidden="true" sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', boxShadow: 2 }}>
                <AddRoundedIcon />
              </Box>
            )}
          />
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
        onOpenChange={setCreateOpen}
        onPostCreated={(post) => window.dispatchEvent(new CustomEvent('nexora:post-created', { detail: post }))}
      />
    </>
  );
};

export default MobileBottomNav;
