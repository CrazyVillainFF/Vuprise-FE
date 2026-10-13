import React from 'react';
import { Container, Typography, Box, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ExploreOutlinedIcon from '@mui/icons-material/ExploreOutlined';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
      <Typography
        variant="h1"
        fontWeight={900}
        sx={{
          fontSize: { xs: '6rem', sm: '8rem' },
          background: (theme) => `linear-gradient(135deg, ${theme.palette.text.primary} 0%, ${theme.palette.text.secondary} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          mb: 1
        }}
      >
        404
      </Typography>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 440, mx: 'auto' }}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </Typography>
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          color="primary"
          startIcon={<HomeRoundedIcon />}
          onClick={() => navigate('/home')}
        >
          Return Home
        </Button>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<ExploreOutlinedIcon />}
          onClick={() => navigate('/people')}
        >
          Explore Network
        </Button>
      </Stack>
    </Container>
  );
};

export default NotFoundPage;
