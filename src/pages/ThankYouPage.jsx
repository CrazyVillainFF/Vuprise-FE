import React from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Link as RouterLink } from 'react-router-dom';

export default function ThankYouPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
      <Box sx={{ color: 'success.main', mb: 2 }}>
        <CheckCircleRoundedIcon sx={{ fontSize: 72 }} />
      </Box>
      <Typography variant="h4" component="h1" fontWeight={850} gutterBottom>
        Thanks — your request was received
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 460, mx: 'auto' }}>
        The Vuprise team reviews requests in the order they arrive. If a reply is needed, we will respond to the email address you provided. Keep a copy of your request details for reference.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="center">
        <Button component={RouterLink} to="/" variant="contained">Back to Vuprise</Button>
        <Button component={RouterLink} to="/faq" variant="outlined" color="inherit">Read the FAQ</Button>
      </Stack>
    </Container>
  );
}
