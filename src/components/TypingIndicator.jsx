import React from 'react';
import { Box, Typography } from '@mui/material';

export default function TypingIndicator({ label = 'Typing…', compact = false, sx }) {
  return (
    <Box role="status" aria-label={label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, color: 'primary.main', minHeight: compact ? 18 : 22, ...sx }}>
      {!compact && <Typography component="span" variant="caption" color="text.secondary" noWrap>{label}</Typography>}
      <Box aria-hidden="true" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
        {[0, 1, 2].map((index) => <Box key={index} component="span" sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'currentColor', animation: 'vupriseTyping 1s ease-in-out infinite', animationDelay: `${index * 0.14}s`, '@keyframes vupriseTyping': { '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.5 }, '30%': { transform: 'translateY(-4px)', opacity: 1 } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none', opacity: 0.75 } }} />)}
      </Box>
      {compact && <Typography component="span" variant="caption" color="primary.main">{label}</Typography>}
    </Box>
  );
}
