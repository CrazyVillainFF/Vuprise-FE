import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Avatar,
  Box,
  Divider,
  Button,
  Chip,
  Skeleton
} from '@mui/material';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import ConnectionButton from './ConnectionButton';

const TRENDING_TOPICS = [
  { tag: 'designsystems', label: '#designsystems', posts: '4.2k discussions' },
  { tag: 'ai', label: '#ai & multimodal models', posts: '18.9k discussions' },
  { tag: 'distributedsystems', label: '#distributedsystems', posts: '2.8k discussions' },
  { tag: 'startups', label: '#startups & venture', posts: '8.1k discussions' },
  { tag: 'leadership', label: '#engineering leadership', posts: '5.5k discussions' },
];

const RightWidgets = () => {
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await userAPI.getSuggested();
        if (res.data.success) {
          setSuggested(res.data.users || []);
        }
      } catch (err) {
        console.error('[Suggested Error]', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggested();
  }, []);

  return (
    <Stack spacing={3}>
      {/* Suggested Connections Widget */}
      <Card>
        <CardHeader
          title={
            <Typography variant="subtitle1" fontWeight={700}>
              People You May Know
            </Typography>
          }
          subheader={
            <Typography variant="caption" color="text.secondary">
              Based on your industry & network
            </Typography>
          }
          sx={{ pb: 1 }}
        />
        <Divider />
        <CardContent sx={{ pt: 1.5, pb: '16px !important' }}>
          {loading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="90%" height={16} />
                  </Box>
                </Stack>
              ))}
            </Stack>
          ) : suggested.length > 0 ? (
            <Stack spacing={2}>
              {suggested.slice(0, 4).map((user) => (
                <Stack key={user._id} direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={user.profilePicture}
                    alt={user.name}
                    sx={{ width: 42, height: 42, cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${user._id}`)}
                  >
                    {user.name[0]}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      noWrap
                      sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
                      onClick={() => navigate(`/profile/${user._id}`)}
                    >
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {user.headline || user.company || 'Professional'}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      <ConnectionButton userId={user._id} userName={user.name} initialStatus="none" size="small" />
                    </Box>
                  </Box>
                </Stack>
              ))}
              <Divider sx={{ pt: 1 }} />
              <Button
                fullWidth
                size="small"
                onClick={() => navigate('/people')}
                sx={{ fontWeight: 600, color: 'primary.main' }}
              >
                Discover more professionals →
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
              You are connected with all top suggestions!
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Trending Topics Widget */}
      <Card>
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: 'action.hover', color: 'text.primary', width: 32, height: 32 }}>
              <TrendingUpRoundedIcon sx={{ fontSize: 18 }} />
            </Avatar>
          }
          title={
            <Typography variant="subtitle1" fontWeight={700}>
              Trending Insights
            </Typography>
          }
          sx={{ pb: 1 }}
        />
        <Divider />
        <CardContent sx={{ pt: 1, pb: '16px !important' }}>
          <Stack spacing={1.5}>
            {TRENDING_TOPICS.map((item, index) => (
              <Box
                key={index}
                onClick={() => navigate(`/search?q=${item.tag}`)}
                sx={{
                  p: 1,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {item.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.posts}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Vuprise Pro Banner */}
      <Card
        sx={{
          background: (theme) =>
            theme.palette.mode === 'light'
              ? '#000000'
              : '#FFFFFF',
          color: (theme) => theme.palette.mode === 'light' ? '#FFFFFF' : '#000000',
          p: 2.5
        }}
      >
        <Stack spacing={1.5} alignItems="flex-start">
          <Chip
            icon={<AutoAwesomeRoundedIcon sx={{ fontSize: '14px !important', color: 'inherit !important' }} />}
            label="VUPRISE EXECUTIVE"
            size="small"
            sx={{ bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)', color: 'inherit', fontWeight: 700, fontSize: '0.7rem' }}
          />
          <Typography variant="h6" fontWeight={800} sx={{ color: 'inherit', lineHeight: 1.2 }}>
            Accelerate your executive presence
          </Typography>
          <Typography variant="caption" sx={{ color: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.72)', lineHeight: 1.5 }}>
            Access curated founder networks, verified leadership roundtables, and priority placement.
          </Typography>
          <Button
            variant="contained"
            size="small"
            sx={{
              bgcolor: (theme) => theme.palette.mode === 'light' ? '#FFFFFF' : '#000000',
              color: (theme) => theme.palette.mode === 'light' ? '#000000' : '#FFFFFF',
              fontWeight: 700,
              '&:hover': { bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,.82)' : 'rgba(0,0,0,.82)' }
            }}
            onClick={() => navigate('/settings')}
          >
            Explore Benefits
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
};

export default RightWidgets;
