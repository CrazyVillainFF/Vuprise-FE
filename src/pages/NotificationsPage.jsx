import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Container,
  Card,
  Typography,
  Box,
  Stack,
  Avatar,
  IconButton,
  Button,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import VerifiedAccountBadge from '../components/VerifiedAccountBadge';
import { connectionAPI, groupAPI } from '../services/api';

import { useNotifications } from '../context/NotificationContext';
import { formatTimeAgo } from '../utils/formatters';
import EmptyState from '../components/EmptyState';

const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading, error, clearError, fetchNotifications } = useNotifications();
  const [tabIndex, setTabIndex] = useState(0);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [loadingRequestId, setLoadingRequestId] = useState('');
  const [actionError, setActionError] = useState('');
  const navigate = useNavigate();

  const loadPendingRequests = useCallback(async () => {
    try {
      const response = await connectionAPI.getConnections();
      setPendingIncoming(response.data.pendingIncoming || []);
    } catch (requestError) {
      setActionError(requestError.message || 'Could not check pending connection requests.');
    }
  }, []);

  useEffect(() => {
    loadPendingRequests();
    const interval = setInterval(loadPendingRequests, 30000);
    return () => clearInterval(interval);
  }, [loadPendingRequests]);

  const latestRequestNotificationBySender = useMemo(() => {
    const latest = new Map();
    notifications.forEach((item) => {
      const senderId = item.sender?._id || item.sender;
      if (item.type === 'connection_request' && senderId && !latest.has(String(senderId))) {
        latest.set(String(senderId), item._id);
      }
    });
    return latest;
  }, [notifications]);

  const filteredNotifications = notifications.filter((n) => {
    if (tabIndex === 1) return !n.read;
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'post_like':
        return <FavoriteRoundedIcon sx={{ fontSize: 16, color: '#E11D48' }} />;
      case 'post_comment':
        return <ChatBubbleRoundedIcon sx={{ fontSize: 16, color: 'text.primary' }} />;
      case 'connection_request':
        return <PersonAddRoundedIcon sx={{ fontSize: 16, color: 'text.primary' }} />;
      case 'connection_accepted':
        return <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'text.primary' }} />;
      case 'group_invitation':
        return <GroupsRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
      case 'official_message':
        return <ChatBubbleRoundedIcon sx={{ fontSize: 16, color: '#d4a017' }} />;
      default:
        return <NotificationsActiveOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />;
    }
  };

  const handleNotificationClick = (item) => {
    if (item.type === 'group_invitation') return;
    if (!item.read) {
      markAsRead(item._id);
    }
    if (item.type === 'official_message') {
      const conversationId = item.conversation?._id || item.conversation;
      if (conversationId) navigate(`/messages?official=${encodeURIComponent(conversationId)}`);
    } else if (item.type === 'connection_request' || item.type === 'connection_accepted') {
      if (item.type === 'connection_request') {
        navigate('/people');
      } else {
        navigate(`/profile/${item.sender?._id || item.sender}`);
      }
    } else if (item.post) {
      navigate(item.post?._id ? `/post/${item.post._id}` : '/home');
    }
  };

  const handleGroupInvitation = async (event, item, action) => {
    event.stopPropagation();
    const groupId = item.group?._id || item.group;
    if (!groupId || loadingRequestId) return;
    try {
      setLoadingRequestId(item._id);
      setActionError('');
      await groupAPI.respond(groupId, action);
      await Promise.all([markAsRead(item._id), fetchNotifications()]);
      if (action === 'accept') navigate(`/messages?group=${encodeURIComponent(groupId)}`);
    } catch (requestError) {
      setActionError(requestError.message || 'This group invitation could not be updated.');
      await fetchNotifications();
    } finally {
      setLoadingRequestId('');
    }
  };

  const handleConnectionRequest = async (event, item, requestId, action) => {
    event.stopPropagation();
    if (!requestId || loadingRequestId) return;
    try {
      setLoadingRequestId(item._id);
      setActionError('');
      if (action === 'accept') await connectionAPI.acceptRequest(requestId);
      else await connectionAPI.rejectOrRemove(requestId);
      await Promise.all([markAsRead(item._id), fetchNotifications(), loadPendingRequests()]);
    } catch (requestError) {
      setActionError(requestError.message || 'This connection request could not be updated.');
      await Promise.all([fetchNotifications(), loadPendingRequests()]);
    } finally {
      setLoadingRequestId('');
    }
  };

  return (
    <Container maxWidth="md">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            Activity & Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stay updated with your connections, interactions, and mentions.
          </Typography>
        </Box>

        {unreadCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DoneAllRoundedIcon />}
            onClick={markAllAsRead}
          >
            Mark all read
          </Button>
        )}
      </Stack>

      {(error || actionError) && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => { clearError(); setActionError(''); }}>
          {actionError || error}
        </Alert>
      )}

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          sx={{ px: 2, '& .MuiTab-root': { fontWeight: 600, py: 1.5 } }}
        >
          <Tab label={`All Notifications (${notifications.length})`} />
          <Tab label={`Unread (${unreadCount})`} />
        </Tabs>
      </Card>

      {/* Notifications List */}
      {loading && notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress size={36} />
        </Box>
      ) : filteredNotifications.length > 0 ? (
        <Card sx={{ overflow: 'hidden' }}>
          {filteredNotifications.map((item, index) => {
            const sender = item.type === 'official_message'
              ? { name: 'Vuprise', profilePicture: '/vuprise-gold-profile.png' }
              : item.sender || {};
            return (
              <Box key={item._id}>
                  <Box
                  role="group"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleNotificationClick(item);
                    }
                  }}
                  onClick={() => handleNotificationClick(item)}
                  sx={{
                    p: { xs: 1.5, sm: 2 },
                    display: 'flex',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    cursor: 'pointer',
                    bgcolor: item.read ? 'transparent' : 'action.selected',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
                  }}
                >
                    <Stack direction="row" spacing={{ xs: 1.25, sm: 2 }} alignItems="center" sx={{ flex: 1, minWidth: 0, pr: { xs: 0, sm: 2 } }}>
                    {/* Avatar with Type Icon Badge */}
                    <Box sx={{ position: 'relative' }}>
                      <Avatar
                        src={sender.profilePicture}
                        alt={sender.name}
                        sx={{ width: 48, height: 48 }}
                      >
                        {sender.name ? sender.name[0] : 'U'}
                      </Avatar>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          bgcolor: 'background.paper',
                          borderRadius: '50%',
                          p: 0.35,
                          display: 'flex',
                          boxShadow: 1
                        }}
                      >
                        {getNotificationIcon(item.type)}
                      </Box>
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: item.read ? 500 : 700, overflowWrap: 'anywhere' }}>
                        {item.message}
                        {item.type === 'official_message' && <VerifiedAccountBadge color="gold" size={16} sx={{ ml: 0.6, verticalAlign: 'middle' }} />}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(item.createdAt)}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Actions */}
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ ml: { xs: 'auto', sm: 0 }, pl: { xs: 1, sm: 0 }, flexShrink: 0 }}>
                    {item.type === 'connection_request' && (() => {
                      const senderId = String(item.sender?._id || item.sender || '');
                      const linkedRequest = item.connection && typeof item.connection === 'object' ? item.connection : null;
                      const liveRequest = linkedRequest
                        ? pendingIncoming.find((request) => String(request._id) === String(linkedRequest._id))
                        : pendingIncoming.find((request) => String(request.requester?._id || request.requester) === senderId);
                      const isLatest = latestRequestNotificationBySender.get(senderId) === item._id;
                      const requestId = liveRequest?._id;
                      if (!requestId || !isLatest) return null;
                      const pending = loadingRequestId === item._id;
                      return (
                        <React.Fragment key={`request-actions-${item._id}`}>
                          <Button size="small" variant="contained" disabled={pending || Boolean(loadingRequestId)} onClick={(event) => handleConnectionRequest(event, item, requestId, 'accept')} aria-label={`Accept connection request from ${sender.name || 'member'}`}>
                            {pending ? <CircularProgress size={16} color="inherit" /> : 'Connect back'}
                          </Button>
                          <Button size="small" variant="outlined" color="inherit" disabled={pending || Boolean(loadingRequestId)} onClick={(event) => handleConnectionRequest(event, item, requestId, 'decline')} aria-label={`Decline connection request from ${sender.name || 'member'}`}>
                            Decline
                          </Button>
                        </React.Fragment>
                      );
                    })()}
                    {item.sender?._id && ['connection_request', 'connection_accepted'].includes(item.type) && (
                      <Button size="small" variant="text" color="inherit" onClick={() => navigate(`/messages?contact=${item.sender._id}`)}>
                        Message
                      </Button>
                    )}
                    {item.sender?._id && item.type !== 'official_message' && (
                      <Button size="small" variant="text" color="inherit" onClick={() => navigate(`/profile/${item.sender._id}`)}>
                        View profile
                      </Button>
                    )}
                    {item.type === 'group_invitation' && (() => {
                      const groupId = item.group?._id || item.group;
                      if (!groupId || item.read) return null;
                      const pending = loadingRequestId === item._id;
                      return (
                        <React.Fragment key={`group-invite-actions-${item._id}`}>
                          <Button size="small" variant="contained" disabled={pending || Boolean(loadingRequestId)} onClick={(event) => handleGroupInvitation(event, item, 'accept')} aria-label={`Accept invitation to ${item.group?.name || 'group'}`}>
                            {pending ? <CircularProgress size={16} color="inherit" /> : 'Accept'}
                          </Button>
                          <Button size="small" variant="outlined" color="inherit" disabled={pending || Boolean(loadingRequestId)} onClick={(event) => handleGroupInvitation(event, item, 'decline')} aria-label={`Decline invitation to ${item.group?.name || 'group'}`}>
                            Decline
                          </Button>
                        </React.Fragment>
                      );
                    })()}
                    {!item.read && (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          mr: 1
                        }}
                      />
                    )}
                    <Tooltip title="Delete notification">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(item._id);
                        }}
                        sx={{ color: 'error.main', '&:hover': { color: 'error.dark' } }}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>
                {index < filteredNotifications.length - 1 && <Divider />}
              </Box>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          icon={NotificationsActiveOutlinedIcon}
          title={tabIndex === 1 ? 'No unread notifications' : 'You are all caught up!'}
          description="When members like your posts, comment on discussions, or connect with you, notifications will appear here."
        />
      )}
    </Container>
  );
};

export default NotificationsPage;
