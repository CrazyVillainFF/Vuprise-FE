import React from 'react';
import { Card, Box, Avatar, Typography, Stack, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ConnectionButton from './ConnectionButton';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import { isVerifiedAccount } from '../utils/verification';
import { getBrandedHeadline } from '../utils/brandCopy';

const UserCard = ({ user, onConnectionChanged }) => {
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: 3,
        }
      }}
      onClick={() => navigate(`/profile/${user._id}`)}
    >
      {/* Cover Banner */}
      <Box
        sx={{
          height: 64,
          backgroundImage: user.coverImage
            ? `url(${user.coverImage})`
            : 'linear-gradient(135deg, rgba(0,0,0,.82) 0%, rgba(0,0,0,.18) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <Box sx={{ p: 2, pt: 0, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Avatar */}
        <Avatar
          src={user.profilePicture}
          alt={user.name}
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mt: -4,
            mb: 1,
            border: (theme) => `3px solid ${theme.palette.background.paper}`,
            boxShadow: 2
          }}
        >
          {user.name ? user.name[0] : 'U'}
        </Avatar>

        {/* User Info */}
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {user.name}
          </Typography>
          {isVerifiedAccount(user) && <VerifiedRoundedIcon sx={{ fontSize: 15, color: 'primary.main' }} />}
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: '0.8rem',
            height: 36,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            mt: 0.5,
            mb: 1
          }}
        >
          {getBrandedHeadline(user.headline) || user.jobTitle || 'Professional at Vuprise'}
        </Typography>

        {/* Company & Location Tags */}
        <Stack spacing={0.5} sx={{ mb: 1.5, textAlign: 'left', px: 1 }}>
          {user.company && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <BusinessCenterOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.company}
              </Typography>
            </Stack>
          )}
          {user.location && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <PlaceOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.location}
              </Typography>
            </Stack>
          )}
        </Stack>

        {/* Skills Chips */}
        {user.skills && user.skills.length > 0 && (
          <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap" sx={{ mb: 2, minHeight: 24 }}>
            {user.skills.slice(0, 2).map((skill, index) => (
              <Chip
                key={index}
                label={skill}
                size="small"
                sx={{ fontSize: '0.7rem', height: 20, bgcolor: 'action.hover' }}
              />
            ))}
            {user.skills.length > 2 && (
              <Chip
                label={`+${user.skills.length - 2}`}
                size="small"
                sx={{ fontSize: '0.7rem', height: 20, bgcolor: 'action.hover' }}
              />
            )}
          </Stack>
        )}

        {/* Action Button at bottom */}
        <Box sx={{ mt: 'auto', pt: 1 }} onClick={(e) => e.stopPropagation()}>
          <ConnectionButton
            userId={user._id}
            userName={user.name}
            initialStatus={user.connectionStatus || 'none'}
            size="small"
            onStatusChange={onConnectionChanged}
            sx={{ width: '100%' }}
          />
        </Box>
      </Box>
    </Card>
  );
};

export default UserCard;
