import React from 'react';
import { Card, CardContent, Typography, Box, Button } from '@mui/material';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

const ErrorState = ({
  title = 'Unable to load content',
  message = 'A network error occurred while retrieving data. Please try again.',
  onRetry,
  sx = {}
}) => {
  return (
    <Card sx={{ textAlign: 'center', py: 5, px: 3, border: (theme) => `1px dashed ${theme.palette.divider}`, ...sx }}>
      <CardContent>
        <Box
          sx={{
            display: 'inline-flex',
            p: 2,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'text.primary',
            mb: 2,
          }}
        >
          <ErrorOutlineRoundedIcon sx={{ fontSize: 40 }} />
        </Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mb: onRetry ? 3 : 0 }}>
          {message}
        </Typography>
        {onRetry && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RefreshRoundedIcon />}
            onClick={onRetry}
            sx={{ px: 3 }}
          >
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ErrorState;
