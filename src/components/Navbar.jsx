import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Container,
  Box,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Button,
  Stack,
  Tooltip,
  Divider,
  useMediaQuery
} from '@mui/material';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { getBrandedHeadline } from '../utils/brandCopy';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';

import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useThemeMode } from '../theme/ThemeContext';
import SearchBar from './SearchBar';
import ReactableMark from './ReactableMark';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount, unreadMessageCount } = useNotifications();
  const { mode, toggleTheme } = useThemeMode();
  const compactHeader = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = () => {
    handleCloseMenu();
    logout();
    navigate('/signin');
  };

  const navItems = [
    { label: 'Feed', path: '/home', icon: HomeRoundedIcon },
    { label: 'Message', path: '/messages', icon: ChatBubbleOutlineRoundedIcon, badge: unreadMessageCount },
    { label: 'Network', path: '/people', icon: PeopleAltRoundedIcon },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: NotificationsRoundedIcon,
      badge: unreadCount,
    },
  ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: (theme) =>
          theme.palette.mode === 'light'
            ? 'rgba(255, 255, 255, 0.85)'
            : 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
        zIndex: 1200,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 60, md: 70 }, gap: { xs: 0.75, sm: 2 }, width: '100%', minWidth: 0, flexWrap: 'nowrap' }}>
          {/* Brand Logo */}
          <Stack
            component={NavLink}
            to={isAuthenticated ? '/home' : '/'}
            direction="row"
            spacing={1.25}
            aria-label="Vuprise home"
            sx={{ alignItems: 'center', cursor: 'pointer', flexShrink: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <ReactableMark size={38} />
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                letterSpacing: '-0.03em',
                color: 'text.primary',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              Vuprise
            </Typography>
          </Stack>

          {/* Global Search Bar */}
          <Box sx={{ flex: 1, minWidth: 0, maxWidth: { xs: '100%', sm: 380, md: 420, lg: 280, xl: 380 }, mx: { xs: 0, sm: 2 } }}>
            <SearchBar placeholder={compactHeader ? 'Search' : undefined} />
          </Box>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', lg: 'block' }, minWidth: 0 }} />

          {/* Desktop Nav Items */}
          {isAuthenticated ? (
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', display: { xs: 'none', lg: 'flex' }, flexShrink: 0 }}>
              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={() => window.dispatchEvent(new Event('nexora:create-post'))}
                aria-label="Create post"
                sx={{ borderRadius: 2.5, whiteSpace: 'nowrap' }}
              >
                <Box component="span" sx={{ display: { lg: 'none', xl: 'inline' } }}>Create post</Box>
              </Button>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Button
                    key={item.path}
                    component={NavLink}
                    to={item.path}
                  aria-label={item.label}
                    startIcon={
                      item.badge > 0 ? (
                        <Badge badgeContent={item.badge} color="error" max={99}>
                          <Icon sx={{ fontSize: 20 }} />
                        </Badge>
                      ) : (
                        <Icon sx={{ fontSize: 20 }} />
                      )
                    }
                    sx={{
                      color: isActive ? 'primary.main' : 'text.secondary',
                      bgcolor: isActive ? 'action.selected' : 'transparent',
                      px: { lg: 1, xl: 1.5 },
                      py: 1,
                      minWidth: { lg: 42, xl: 'auto' },
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: 2.5,
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: 'primary.main',
                      },
                    }}
                  >
                    <Box component="span" sx={{ display: { lg: 'none', xl: 'inline' } }}>{item.label}</Box>
                  </Button>
                );
              })}
            </Stack>
          ) : (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', display: { xs: 'none', sm: 'flex' } }}>
              <Button component={NavLink} to="/signin" variant="outlined" color="inherit">
                Sign In
              </Button>
              <Button component={NavLink} to="/signup" variant="contained" color="primary">
                Get started
              </Button>
            </Stack>
          )}

          {/* Theme Switcher */}
          <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            <IconButton onClick={toggleTheme} color="inherit" sx={{ ml: { xs: 0, sm: 0.5 }, flexShrink: 0 }}>
              {mode === 'light' ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* User Profile Avatar / Menu */}
          {isAuthenticated && (
            <Box sx={{ ml: { xs: 0, sm: 1 }, flexShrink: 0 }}>
              <IconButton
                onClick={handleOpenMenu}
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={Boolean(anchorEl)}
                sx={{ p: 0.25, width: 44, height: 44 }}
              >
                <Avatar
                  src={user?.profilePicture}
                  alt={user?.name}
                  sx={{
                    width: 38,
                    height: 38,
                    border: (theme) => `2px solid ${theme.palette.primary.main}`,
                  }}
                >
                  {user?.name ? user.name[0] : 'U'}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                marginThreshold={12}
                slotProps={{
                  list: { 'aria-label': 'Profile menu' },
                  paper: {
                    sx: {
                      mt: 1.5,
                      width: 'min(280px, calc(100vw - 24px))',
                      minWidth: 'min(220px, calc(100vw - 24px))',
                      maxHeight: 'calc(100dvh - 24px)',
                      borderRadius: 3,
                      boxShadow: 4,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                  },
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {user?.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {getBrandedHeadline(user?.headline) || user?.email}
                  </Typography>
                </Box>
                <Divider />

                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    navigate(`/profile/${user?._id}`);
                  }}
                >
                  <PersonOutlineRoundedIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  View Profile
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    navigate('/profile/edit');
                  }}
                >
                  <EditOutlinedIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  Edit Profile
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    navigate('/settings');
                  }}
                >
                  <SettingsOutlinedIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  Account Settings
                </MenuItem>

                <Divider />

                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  <LogoutRoundedIcon fontSize="small" sx={{ mr: 1.5 }} />
                  Sign Out
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
