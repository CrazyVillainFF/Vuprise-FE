import React from 'react';
import { Card, Box, Avatar, Typography, LinearProgress, Button, Stack, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import VerifiedAccountBadge from './VerifiedAccountBadge';
import PeopleOutlineRoundedIcon from '@mui/icons-material/PeopleOutlineRounded';
import { isVerifiedAccount } from '../utils/verification';
import { getBrandedHeadline } from '../utils/brandCopy';

const ProfileMiniCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const completion = user.profileCompletion || 65;
  const connectionsCount = user.connections ? user.connections.length : 0;

  return (
    <Card sx={{ overflow: 'hidden', mb: 3 }}>
      {/* Mini Cover Banner */}
      <Box
        sx={{
          height: 72,
          backgroundImage: user.coverImage
            ? `url(${user.coverImage})`
            : 'linear-gradient(135deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.18) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      />

      <Box sx={{ px: 2.5, pb: 2.5, pt: 0, textAlign: 'center', position: 'relative' }}>
        <Avatar
          src={user.profilePicture}
          alt={user.name}
          sx={{
            width: 72,
            height: 72,
            mx: 'auto',
            mt: -4.5,
            border: (theme) => `3px solid ${theme.palette.background.paper}`,
            boxShadow: 2,
            cursor: 'pointer'
          }}
          onClick={() => navigate(`/profile/${user._id}`)}
        >
          {user.name ? user.name[0] : 'U'}
        </Avatar>

        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5} sx={{ mt: 1.5 }}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
            onClick={() => navigate(`/profile/${user._id}`)}
          >
            {user.name}
          </Typography>
          {isVerifiedAccount(user) && <VerifiedAccountBadge color={user.verificationBadgeColor} size={16} />}
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', mt: 0.5 }} noWrap>
          {getBrandedHeadline(user.headline) || 'Professional at Vuprise'}
        </Typography>

        {user.location && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
            {user.location}
          </Typography>
        )}

        {/* Profile Completion Bar */}
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'left' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              Profile Strength
            </Typography>
            <Typography variant="caption" fontWeight={700} color="primary.main">
              {completion}%
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={completion}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'action.selected',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'primary.main',
              }
            }}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Connection Stats */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            py: 0.5,
            px: 1,
            cursor: 'pointer',
            borderRadius: 1.5,
            '&:hover': { bgcolor: 'action.hover' }
          }}
          onClick={() => navigate('/people')}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <PeopleOutlineRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Connections
            </Typography>
          </Stack>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main">
            {connectionsCount}
          </Typography>
        </Stack>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={() => navigate(`/profile/${user._id}`)}
          sx={{ mt: 2 }}
        >
          View Full Profile
        </Button>
      </Box>
    </Card>
  );
};

export default ProfileMiniCard;
