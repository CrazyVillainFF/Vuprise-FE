import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Box,
  Avatar,
  Typography,
  Stack,
  Button,
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
  MenuItem
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
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

import { useAuth } from '../context/AuthContext';
import { userAPI, postAPI } from '../services/api';
import ConnectionButton from '../components/ConnectionButton';
import PostCard from '../components/PostCard';
import ImageUploadModal from '../components/ImageUploadModal';
import { ProfileHeaderSkeleton, PostSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { subscribeRealtime, watchPresence } from '../services/realtime';

const ProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const [error, setError] = useState(null);
  const [presence, setPresence] = useState('unknown');

  // Upload modals
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastSeverity, setToastSeverity] = useState('success');
  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockActionLoading, setBlockActionLoading] = useState(false);

  const profileUserId = id || (currentUser ? currentUser._id : null);
  const isOwnProfile = currentUser && profileUserId === currentUser._id;

  useEffect(() => {
    setPresence('unknown');
    watchPresence(profileUserId ? [profileUserId] : []);
    return subscribeRealtime((event) => {
      if (event.type === 'presence' && String(event.userId) === String(profileUserId)) setPresence(event.state);
    });
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await userAPI.getUserById(profileUserId);
        if (res.data.success) {
          setProfile(res.data.user);
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
  }, [profileUserId]);

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

  return (
    <Container maxWidth="lg">
      {/* Cover and Main Profile Card */}
      <Card sx={{ mb: 3, overflow: 'hidden', position: 'relative' }}>
        {/* Cover Banner */}
        <Box
          sx={{
            height: { xs: 140, sm: 220, md: 260 },
            backgroundImage: profile.coverImage
              ? `url(${profile.coverImage})`
              : 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {isOwnProfile && (
            <Tooltip title="Update Cover Banner">
              <IconButton
                onClick={() => setCoverModalOpen(true)}
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
        <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: 3, pt: 0, position: 'relative' }}>
          {/* Avatar with absolute positioning */}
          <Box sx={{ position: 'relative', display: 'inline-block', mt: { xs: -6, sm: -8 } }}>
            <Avatar
              src={profile.profilePicture}
              alt={profile.name}
              sx={{
                width: { xs: 96, sm: 130, md: 140 },
                height: { xs: 96, sm: 130, md: 140 },
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
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    bgcolor: 'primary.main',
                    color: '#fff',
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
              top: { sm: 20 },
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
                />
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
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
                {profile.name}
              </Typography>
              {isVerifiedAccount(profile) && <VerifiedRoundedIcon sx={{ fontSize: 24, color: 'primary.main' }} />}
            </Stack>

            <Typography variant="h6" color="text.secondary" fontWeight={500} sx={{ mt: 0.5, maxWidth: 720 }}>
              {getBrandedHeadline(profile.headline) || 'Professional at Vuprise'}
            </Typography>
            {!isOwnProfile && (presence === 'online' || presence === 'offline') && <Stack direction="row" spacing={0.5} alignItems="center" role="status" sx={{ mt: 0.5 }}>
              {presence === 'online' && <FiberManualRecordRoundedIcon sx={{ fontSize: 10, color: 'success.main' }} />}
              <Typography variant="caption" color={presence === 'online' ? 'success.main' : 'text.secondary'}>{presence === 'online' ? 'Online' : 'Offline'}</Typography>
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
            <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mt: 1.5 }}>
              {profile.connections ? profile.connections.length : 0} {profile.connections?.length === 1 ? 'connection' : 'connections'} • {profile.postCount ?? posts.length} {(profile.postCount ?? posts.length) === 1 ? 'contribution' : 'contributions'}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Main Grid: Details on Left, Side Details on Right */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
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

          {/* Published Posts Stream */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Activity & Discussions ({posts.length})
            </Typography>
            {loadingPosts ? (
              <Stack spacing={2}>
                <PostSkeleton />
                <PostSkeleton />
              </Stack>
            ) : postsError ? (
              <ErrorState title="Activity unavailable" message={postsError} onRetry={() => {
                setLoadingPosts(true);
                postAPI.getUserPosts(profileUserId).then((res) => setPosts(res.data.posts || [])).catch(() => setPostsError('Unable to load this member’s activity. Please try again.')).finally(() => setLoadingPosts(false));
              }} />
            ) : posts.length > 0 ? (
              <Stack spacing={0}>
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onPostDeleted={(pId) => setPosts((prev) => prev.filter((p) => p._id !== pId))}
                  />
                ))}
              </Stack>
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
        </Grid>

        {/* Sidebar Info (Skills, Education) */}
        <Grid size={{ xs: 12, md: 4 }}>
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
        </Grid>
      </Grid>

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
