import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Box,
  Avatar,
  Typography,
  Stack,
  Button,
  ButtonBase,
  Grid,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import VerifiedAccountBadge from '../components/VerifiedAccountBadge';
import { isVerifiedAccount } from '../utils/verification';
import { getBrandedHeadline } from '../utils/brandCopy';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';

import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../theme/ThemeContext';
import { userAPI, postAPI, connectionAPI } from '../services/api';
import ConnectionButton from '../components/ConnectionButton';
import ImageUploadModal from '../components/ImageUploadModal';
import { ProfileHeaderSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { subscribeRealtime, watchPresence, unwatchPresence } from '../services/realtime';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import ReportDialog from '../components/ReportDialog';
import { formatLastSeen } from '../utils/presenceTime';

const MEDIA_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: {
    xs: 'repeat(3, minmax(0, 1fr))',
    sm: 'repeat(3, minmax(0, 1fr))',
    md: 'repeat(4, minmax(0, 1fr))',
    lg: 'repeat(5, minmax(0, 1fr))'
  },
  gap: { xs: 0.5, sm: 0.75, md: 1 }
};

const ProfileMediaTile = ({ post, onOpen }) => {
  const isVideo = post.mediaType === 'video' && Boolean(post.videoUrl);
  const isReel = isVideo && post.videoPresentation === 'reel';
  const thumbnail = post.videoThumbnail || (isVideo ? '' : post.image || '');
  const label = (post.content || '').replace(/\s+/g, ' ').trim();
  return (
    <ButtonBase
      onClick={() => onOpen(post)}
      aria-label={`Open ${isReel ? 'Reel' : 'post'}: ${(label || (isVideo ? 'video' : 'image')).slice(0, 80)}`}
      sx={{
        position: 'relative',
        display: 'block',
        width: '100%',
        aspectRatio: '1 / 1',
        overflow: 'hidden',
        borderRadius: 2,
        bgcolor: 'action.hover',
        border: 1,
        borderColor: 'divider',
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
      }}
    >
      {thumbnail ? (
        <Box
          component="img"
          src={thumbnail}
          alt=""
          loading="lazy"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 1.25,
            textAlign: 'center',
            background: (theme) => theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.02))'
              : 'linear-gradient(135deg, rgba(0,0,0,.06), rgba(0,0,0,.02))'
          }}
        >
          {isVideo ? (
            <PlayArrowRoundedIcon sx={{ fontSize: 44, color: 'text.secondary' }} />
          ) : (
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}
            >
              {label || 'Post'}
            </Typography>
          )}
        </Box>
      )}
      {isVideo && Boolean(thumbnail) && (
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: 'rgba(0,0,0,.55)',
            color: '#fff'
          }}
        >
          <PlayArrowRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      )}
    </ButtonBase>
  );
};

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser, isAuthenticated } = useAuth();
  const { mode } = useThemeMode();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [error, setError] = useState(null);
  const [presence, setPresence] = useState({ state: 'unknown', lastSeenAt: null });
  const [presenceNow, setPresenceNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setPresenceNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  // Upload modals
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastSeverity, setToastSeverity] = useState('success');
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [relationshipDialog, setRelationshipDialog] = useState('');
  const [relationshipUsers, setRelationshipUsers] = useState([]);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [relationshipError, setRelationshipError] = useState('');

  const profileUserId = id || (currentUser ? currentUser._id : null);
  const isOwnProfile = currentUser && profileUserId === currentUser._id;

  useEffect(() => {
    setPresence({ state: 'unknown', lastSeenAt: null });
    watchPresence(profileUserId ? [profileUserId] : [], 'profile');
    const unsubscribe = subscribeRealtime((event) => {
      if (event.type === 'presence' && String(event.userId) === String(profileUserId)) {
        setPresence((current) => ({ state: event.state, lastSeenAt: event.state === 'hidden' ? null : event.lastSeenAt || current.lastSeenAt || null }));
      }
    });
    return () => { unsubscribe(); unwatchPresence('profile'); };
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await userAPI.getUserById(profileUserId);
        if (res.data.success) {
          const nextProfile = res.data.user;
          // Keep the already-deployed API usable while the new relationship
          // summary endpoint rolls out. The owner-only connections endpoint is
          // authoritative for the current account; legacy profile data is only
          // a display fallback for another member's public profile.
          if (isOwnProfile) {
            try {
              const relationshipResponse = await connectionAPI.getConnections();
              const relationshipData = relationshipResponse.data || {};
              const mutualConnections = relationshipData.connections || [];
              const incomingRequests = relationshipData.pendingIncoming || [];
              nextProfile.connectsCount = mutualConnections.length + incomingRequests.length;
              nextProfile.connectionsCount = mutualConnections.length;
            } catch {
              nextProfile.connectsCount = nextProfile.connectsCount ?? 0;
              nextProfile.connectionsCount = nextProfile.connectionsCount ?? nextProfile.connections?.length ?? 0;
            }
          } else {
            nextProfile.connectsCount = nextProfile.connectsCount ?? nextProfile.connections?.length ?? 0;
            nextProfile.connectionsCount = nextProfile.connectionsCount ?? nextProfile.connections?.length ?? 0;
          }
          setProfile(nextProfile);
        }
      } catch (err) {
        console.error('[Profile Fetch Error]', err.message);
        setError('Unable to load user profile. The user may not exist.');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserPosts = async () => {
      try {
        setLoadingPosts(true);
        setPostsError(null);
        const res = await postAPI.getUserPosts(profileUserId);
        if (res.data.success) {
          setPosts(res.data.posts || []);
        }
      } catch (err) {
        console.error('[User Posts Fetch Error]', err.message);
        setPostsError('Unable to load this member’s activity. Please try again.');
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchProfile();
    fetchUserPosts();
  }, [profileUserId, isOwnProfile]);

  const handleAvatarUpload = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await userAPI.uploadAvatar(formData);
    if (res.data.success) {
      setProfile((prev) => ({ ...prev, profilePicture: res.data.profilePicture }));
      if (isOwnProfile) {
        updateUser({ profilePicture: res.data.profilePicture });
      }
        setToastSeverity('success');
        setToastMessage('Profile picture updated successfully.');
    }
  };

  const handleCoverUpload = async (file) => {
    const formData = new FormData();
    formData.append('cover', file);
    const res = await userAPI.uploadCover(formData);
    if (res.data.success) {
      setProfile((prev) => ({ ...prev, coverImage: res.data.coverImage }));
      if (isOwnProfile) {
        updateUser({ coverImage: res.data.coverImage });
      }
        setToastSeverity('success');
        setToastMessage('Cover banner updated successfully.');
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profile/${profile?._id || profileUserId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.name} on Vuprise`, url });
        setToastSeverity('success');
        setToastMessage('Profile link shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setToastSeverity('success');
        setToastMessage('Profile link copied to clipboard.');
      } else {
        throw new Error('Sharing is not available in this browser. Copy the profile URL from the address bar.');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setToastSeverity('error');
        setToastMessage(error.message || 'Could not share this profile.');
      }
    }
  };

  const openRelationshipList = async (kind) => {
    if (!profile || (profile.privateAccount && !isOwnProfile)) return;
    setRelationshipDialog(kind);
    setRelationshipLoading(true);
    setRelationshipError('');
    try {
      const response = await userAPI.getRelationshipList(profile._id, kind);
      setRelationshipUsers(response.data.users || []);
    } catch (requestError) {
      if (requestError.response?.status === 404 && isOwnProfile) {
        try {
          const response = await connectionAPI.getConnections();
          const connectionData = response.data || {};
          const mutualConnections = connectionData.connections || [];
          const incomingRequests = (connectionData.pendingIncoming || []).map((request) => ({
            ...(request.requester || {}),
            connectionId: request._id,
            relationshipStatus: 'pending'
          }));
          const fallbackUsers = kind === 'connects'
            ? [...incomingRequests, ...mutualConnections]
            : mutualConnections;
          setRelationshipUsers(fallbackUsers);
        } catch (fallbackError) {
          setRelationshipError(fallbackError.message || 'Could not load this relationship list.');
          setRelationshipUsers([]);
        }
      } else if (requestError.response?.status === 404 && Array.isArray(profile.connections)) {
        // Older servers expose the legacy public connection array. It cannot
        // reveal incoming private requests, but it is still a useful, safe
        // fallback for both public counters instead of surfacing a raw 404.
        setRelationshipUsers(profile.connections);
      } else if (requestError.response?.status === 404) {
        setRelationshipError('The relationship list is being updated on Vuprise. Refresh after the server update completes.');
        setRelationshipUsers([]);
      } else {
        setRelationshipError(requestError.message || 'Could not load this relationship list.');
        setRelationshipUsers([]);
      }
    } finally {
      setRelationshipLoading(false);
    }
  };

  const handleRelationshipStatusChange = (memberId, status) => {
    if (relationshipDialog === 'connects' && status === 'connected') {
      setRelationshipUsers((current) => current.filter((member) => String(member._id) !== String(memberId)));
      // Accepting turns a pending request into an accepted connection; the
      // "Connects" metric counts both, so only "Connections" grows here.
      setProfile((current) => current ? {
        ...current,
        connectionsCount: (current.connectionsCount || 0) + 1
      } : current);
    }
  };

  const handleProfileConnectionStatusChange = (status) => {
    setProfile((current) => {
      if (!current) return current;
      const previous = current.connectionStatus;
      if (status === previous) return current;
      const next = { ...current, connectionStatus: status };
      if (status === 'connected') {
        // A new accepted connection counts toward both metrics.
        next.connectsCount = (current.connectsCount || 0) + 1;
        next.connectionsCount = (current.connectionsCount || 0) + 1;
      } else if (previous === 'connected') {
        // Disconnecting removes an accepted connection from both metrics.
        next.connectsCount = Math.max(0, (current.connectsCount || 0) - 1);
        next.connectionsCount = Math.max(0, (current.connectionsCount || 0) - 1);
      }
      return next;
    });
  };

  const handleBlockAccount = async () => {
    if (!profile?._id || blockActionLoading) return;
    setBlockActionLoading(true);
    try {
      await userAPI.blockUser(profile._id);
      setProfile((current) => ({ ...current, isBlockedByViewer: true }));
      setPosts([]);
      setPostsError(null);
      setBlockDialogOpen(false);
      setToastSeverity('success');
      setToastMessage(`${profile.name || 'Account'} blocked. Their posts are now hidden from you.`);
    } catch (requestError) {
      setToastSeverity('error');
      setToastMessage(requestError.message || 'Could not block this account. Please try again.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleUnblockAccount = async () => {
    if (!profile?._id || blockActionLoading) return;
    setAccountMenuAnchor(null);
    setBlockActionLoading(true);
    try {
      await userAPI.unblockUser(profile._id);
      setProfile((current) => ({ ...current, isBlockedByViewer: false }));
      setToastSeverity('success');
      setToastMessage(`${profile.name || 'Account'} unblocked.`);
      try {
        const response = await postAPI.getUserPosts(profile._id);
        setPosts(response.data.posts || []);
        setPostsError(null);
      } catch (requestError) {
        setPostsError(requestError.message || 'The account was unblocked, but its posts could not be refreshed.');
      }
    } catch (requestError) {
      setToastSeverity('error');
      setToastMessage(requestError.message || 'Could not unblock this account. Please try again.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <ProfileHeaderSkeleton />
      </Container>
    );
  }

  if (error || !profile) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <ErrorState
          title="Profile Not Found"
          message={error || 'We could not locate this profile on Vuprise.'}
          onRetry={() => navigate('/home')}
        />
      </Container>
    );
  }

  const hasSidebar = Boolean(
    (profile.skills && profile.skills.length > 0) || (profile.education && profile.education.length > 0)
  );

  return (
    <Container maxWidth="lg">
      {/* Cover and Main Profile Card */}
      <SpotlightCard theme={mode} spotlightColor={mode === 'dark' ? '255,255,255' : '0,0,0'} intensity={0.1} spotlightSize={280} borderGlow={0.7} proximity={0} smoothing={0.18} style={{ '--spotlight-card-surface': mode === 'dark' ? '#000000' : '#FFFFFF', '--spotlight-card-border': mode === 'dark' ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.16)', padding: 0, borderRadius: 16, marginBottom: 24 }}>
      <Card sx={{ mb: 0, overflow: 'hidden', position: 'relative', bgcolor: 'transparent', boxShadow: 'none' }}>
        {/* Cover Banner */}
        <Box
          sx={{
            height: { xs: 104, sm: 132, md: 152 },
            backgroundImage: profile.coverImage
              ? `url(${profile.coverImage})`
              : 'linear-gradient(135deg, rgba(0,0,0,.88) 0%, rgba(0,0,0,.24) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {isOwnProfile && (
            <Tooltip title="Update Cover Banner">
              <IconButton
                onClick={() => setCoverModalOpen(true)}
                aria-label="Update cover banner"
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                }}
              >
                <CameraAltOutlinedIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Profile Details Container */}
        <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: 2.5, pt: 0, position: 'relative' }}>
          {/* Avatar with absolute positioning */}
          <Box sx={{ position: 'relative', display: 'inline-block', mt: { xs: -5, sm: -7 } }}>
            <Avatar
              src={profile.profilePicture}
              alt={profile.name}
              sx={{
                width: { xs: 84, sm: 108, md: 116 },
                height: { xs: 84, sm: 108, md: 116 },
                border: (theme) => `4px solid ${theme.palette.background.paper}`,
                boxShadow: 3,
              }}
            >
              {profile.name[0]}
            </Avatar>
            {isOwnProfile && (
              <Tooltip title="Update Profile Picture">
                <IconButton
                  size="small"
                  onClick={() => setAvatarModalOpen(true)}
                  aria-label="Update profile picture"
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: 2,
                    '&:hover': { bgcolor: 'primary.dark' },
                  }}
                >
                  <CameraAltOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Action Buttons Top Right on Desktop */}
          <Stack
            direction="row"
            spacing={1.5}
            sx={{
              flexWrap: 'wrap',
              position: { sm: 'absolute' },
              top: { sm: 16 },
              right: { sm: 32 },
              mt: { xs: 2, sm: 0 },
            }}
          >
            {isOwnProfile ? (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate('/profile/edit')}
                >
                  Edit Profile
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<SportsEsportsRoundedIcon />}
                  onClick={() => navigate('/satisfied-games')}
                >
                  Try Satisfied Games
                </Button>
              </>
            ) : (
              <>
                <ConnectionButton
                  userId={profile._id}
                  userName={profile.name}
                  initialStatus={profile.connectionStatus}
                  connectionId={profile.connectionId}
                  onStatusChange={handleProfileConnectionStatusChange}
                />
                {isAuthenticated && (
                  <Button variant="outlined" color="inherit" onClick={() => navigate(`/messages?contact=${profile._id}`)}>
                    Message
                  </Button>
                )}
                {isAuthenticated && <IconButton
                  aria-label={`More actions for ${profile.name}`}
                  aria-expanded={Boolean(accountMenuAnchor)}
                  onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
                ><MoreHorizRoundedIcon /></IconButton>}
              </>
            )}
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<ShareOutlinedIcon />}
              onClick={handleShareProfile}
            >
              Share
            </Button>
          </Stack>

          {/* Name & Headline */}
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                {profile.name}
              </Typography>
              {isVerifiedAccount(profile) && <VerifiedAccountBadge color={profile.verificationBadgeColor} size={24} />}
            </Stack>

            <Typography variant="h6" color="text.secondary" fontWeight={500} sx={{ mt: 0.5, maxWidth: 720 }}>
              {getBrandedHeadline(profile.headline) || 'Professional at Vuprise'}
            </Typography>
            {!isOwnProfile && (presence.state === 'online' || presence.state === 'offline') && <Stack direction="row" spacing={0.5} alignItems="center" role="status" sx={{ mt: 0.5 }}>
              {presence.state === 'online' && <FiberManualRecordRoundedIcon sx={{ fontSize: 10, color: '#22c55e' }} />}
              <Typography variant="caption" color="text.secondary">{presence.state === 'online' ? 'Online' : formatLastSeen(presence.lastSeenAt, presenceNow) || 'Offline'}</Typography>
            </Stack>}

            {/* Metadata Chips: Location, Company, Website */}
            <Stack direction="row" spacing={2.5} flexWrap="wrap" sx={{ mt: 1.5, color: 'text.secondary' }}>
              {profile.location && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <PlaceOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2">{profile.location}</Typography>
                </Stack>
              )}
              {profile.company && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <BusinessCenterOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography variant="body2">{profile.company}</Typography>
                </Stack>
              )}
              {profile.website && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <LanguageOutlinedIcon sx={{ fontSize: 18 }} />
                  <Typography
                    variant="body2"
                    component="a"
                    href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    color="primary"
                    sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </Typography>
                </Stack>
              )}
            </Stack>

            {/* Connection Counters */}
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.25, height: 20 }}>
              <Button size="small" color="inherit" onClick={() => openRelationshipList('connects')} disabled={profile.privateAccount && !isOwnProfile} sx={{ fontSize: '0.875rem', fontWeight: 700, px: 0, py: 0, minWidth: 0, minHeight: 20, height: 20, lineHeight: '20px', textTransform: 'none' }}>
                {profile.connectsCount ?? 0} Connects
              </Button>
              <Typography component="span" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: '20px' }}>•</Typography>
              <Button size="small" color="inherit" onClick={() => openRelationshipList('connections')} disabled={profile.privateAccount && !isOwnProfile} sx={{ fontSize: '0.875rem', fontWeight: 700, px: 0, py: 0, minWidth: 0, minHeight: 20, height: 20, lineHeight: '20px', textTransform: 'none' }}>
                {profile.connectionsCount ?? 0} Connections
              </Button>
              <Typography component="span" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: '20px' }}>•</Typography>
              <Typography component="span" fontWeight={700} sx={{ fontSize: '0.875rem', lineHeight: '20px' }}>{profile.postCount ?? posts.length} {(profile.postCount ?? posts.length) === 1 ? 'contribution' : 'contributions'}</Typography>
            </Stack>
          </Box>
        </Box>
      </Card>
      </SpotlightCard>

      {/* Main Grid: Details on Left, Side Details on Right */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: hasSidebar ? 8 : 12 }}>
          {/* About Section */}
          <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
              About
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
              {profile.bio || 'This professional has not provided an extended bio yet.'}
            </Typography>
          </Card>

          {/* Work Experience Section */}
          {profile.experience && profile.experience.length > 0 && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                <WorkOutlineOutlinedIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>
                  Experience & Leadership
                </Typography>
              </Stack>
              <Stack spacing={3}>
                {profile.experience.map((exp, idx) => (
                  <Box key={exp._id || idx}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {exp.title}
                    </Typography>
                    <Typography variant="body2" color="primary.main" fontWeight={600}>
                      {exp.company} {exp.location ? `• ${exp.location}` : ''}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </Typography>
                    {exp.description && (
                      <Typography variant="body2" color="text.secondary">
                        {exp.description}
                      </Typography>
                    )}
                    {idx < profile.experience.length - 1 && <Divider sx={{ mt: 2.5 }} />}
                  </Box>
                ))}
              </Stack>
            </Card>
          )}

        </Grid>

        {/* Sidebar Info (Skills, Education) */}
        {hasSidebar && <Grid size={{ xs: 12, md: 4 }}>
          {/* Skills Card */}
          {profile.skills && profile.skills.length > 0 && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Skills & Endorsements
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
                {profile.skills.map((skill, index) => (
                  <Chip
                    key={index}
                    label={skill}
                    sx={{
                      fontWeight: 600,
                      bgcolor: 'action.hover',
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                    }}
                  />
                ))}
              </Stack>
            </Card>
          )}

          {/* Education Card */}
          {profile.education && profile.education.length > 0 && (
            <Card sx={{ p: 3, mb: 3 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <SchoolOutlinedIcon sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={700}>
                  Education
                </Typography>
              </Stack>
              <Stack spacing={2}>
                {profile.education.map((edu, idx) => (
                  <Box key={edu._id || idx}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {edu.school}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                    </Typography>
                    {(edu.startYear || edu.endYear) && (
                      <Typography variant="caption" color="text.secondary">
                        {edu.startYear} – {edu.endYear}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Stack>
            </Card>
          )}
        </Grid>}
      </Grid>

      {/* Media Grid: Posts & Reels */}
      <Box sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <GridViewRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" fontWeight={700}>
            Posts & Reels ({posts.length})
          </Typography>
        </Stack>
        {loadingPosts ? (
          <Box sx={MEDIA_GRID_SX} aria-label="Loading media">
            {Array.from({ length: 9 }).map((_, index) => (
              <Box key={index} sx={{ aspectRatio: '1 / 1', borderRadius: 2, bgcolor: 'action.hover' }} />
            ))}
          </Box>
        ) : postsError ? (
          <ErrorState title="Activity unavailable" message={postsError} onRetry={() => {
            setLoadingPosts(true);
            postAPI.getUserPosts(profileUserId).then((res) => setPosts(res.data.posts || [])).catch(() => setPostsError('Unable to load this member’s activity. Please try again.')).finally(() => setLoadingPosts(false));
          }} />
        ) : posts.length > 0 ? (
          <Box sx={MEDIA_GRID_SX}>
            {posts.map((post) => (
              <ProfileMediaTile
                key={post._id}
                post={post}
                onOpen={(selected) => navigate(
                  selected.mediaType === 'video' && selected.videoPresentation === 'reel'
                    ? `/reels?videoId=${selected._id}`
                    : `/post/${selected._id}`
                )}
              />
            ))}
          </Box>
        ) : profile.privateAccount && profile.connectionStatus !== 'connected' && !isOwnProfile ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            This account is private. Only accepted connections can view its posts.
          </Alert>
        ) : (
          <EmptyState
            title="No posts published yet"
            description={`${profile.name} has not published any discussions yet.`}
          />
        )}
      </Box>

      <Dialog open={Boolean(relationshipDialog)} onClose={() => setRelationshipDialog('')} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>{relationshipDialog === 'connects' ? 'Connects' : 'Connections'}</DialogTitle>
        <DialogContent dividers>
          {relationshipLoading && <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={28} /></Stack>}
          {relationshipError && <Alert severity="error">{relationshipError}</Alert>}
          {!relationshipLoading && !relationshipError && !relationshipUsers.length && <Typography color="text.secondary">No members to show.</Typography>}
          <Stack spacing={1.25}>
            {relationshipUsers.map((member) => <Stack key={member._id} direction="row" spacing={1.25} alignItems="center" sx={{ py: 0.5 }}>
              <Avatar src={member.profilePicture}>{member.name?.[0] || 'V'}</Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} alignItems="center"><Typography fontWeight={700} noWrap>{member.name}</Typography>{isVerifiedAccount(member) && <VerifiedAccountBadge color={member.verificationBadgeColor} size={16} />}</Stack>
                <Typography variant="body2" color="text.secondary" noWrap>{getBrandedHeadline(member.headline)}</Typography>
              </Box>
              <Button size="small" color="inherit" onClick={() => { setRelationshipDialog(''); navigate(`/profile/${member._id}`); }}>View</Button>
              {isOwnProfile && relationshipDialog === 'connects' && <ConnectionButton userId={member._id} userName={member.name} initialStatus="pending_received" connectionId={member.connectionId} size="small" onStatusChange={(status) => handleRelationshipStatusChange(member._id, status)} />}
            </Stack>)}
          </Stack>
        </DialogContent>
        <DialogActions><Button color="inherit" onClick={() => setRelationshipDialog('')}>Close</Button></DialogActions>
      </Dialog>

      {/* Upload Image Modals */}
      <ImageUploadModal
        open={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        onUpload={handleAvatarUpload}
        title="Update Profile Picture"
        helperText="Square image recommended. Max 10MB."
      />

      <ImageUploadModal
        open={coverModalOpen}
        onClose={() => setCoverModalOpen(false)}
        onUpload={handleCoverUpload}
        title="Update Cover Banner"
        helperText="Wide 3:1 banner recommended. Max 10MB."
      />

      {/* Toast Alert */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toastSeverity} sx={{ borderRadius: 2 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
      <Menu anchorEl={accountMenuAnchor} open={Boolean(accountMenuAnchor)} onClose={() => setAccountMenuAnchor(null)}>
        {!isOwnProfile && <MenuItem onClick={() => { setAccountMenuAnchor(null); setReportOpen(true); }} sx={{ color: 'warning.main' }}>Report profile</MenuItem>}
        {profile.isBlockedByViewer
          ? <MenuItem onClick={handleUnblockAccount} disabled={blockActionLoading}>Unblock {profile.name}</MenuItem>
          : <MenuItem
            onClick={() => { setAccountMenuAnchor(null); setBlockDialogOpen(true); }}
            disabled={blockActionLoading}
            sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' } }}
          >
            Block {profile.name}
          </MenuItem>}
      </Menu>
      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reportedUser={profile._id}
        subject="Reported profile"
        onSubmitted={() => { setToastSeverity('success'); setToastMessage('Report submitted for review.'); }}
      />
      <Dialog open={blockDialogOpen} onClose={() => !blockActionLoading && setBlockDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Block “{profile.name}”?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">Their posts will be hidden from your feed and post views. You can unblock this account from this profile later.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlockDialogOpen(false)} disabled={blockActionLoading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleBlockAccount} disabled={blockActionLoading}>
            {blockActionLoading ? 'Blocking…' : 'Block account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage;
