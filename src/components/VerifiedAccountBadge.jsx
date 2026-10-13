import React from 'react';
import { Box, Tooltip } from '@mui/material';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';

const badgeColors = {
  black: '#000000',
  blue: '#2587ff',
  gold: '#ffd23f',
};

const badgeLabels = {
  black: 'Verified',
  blue: 'Vuprise Partner',
  gold: 'VIP',
};

export default function VerifiedAccountBadge({ color = 'blue', size = 20, sx = {} }) {
  const selectedColor = badgeColors[color] ? color : 'blue';
  const mark = (
    <VerifiedRoundedIcon
      aria-hidden="true"
      sx={{
        fontSize: size,
        color: badgeColors[selectedColor],
        verticalAlign: 'text-bottom',
        flexShrink: 0,
        // A subtle monochrome edge keeps the black mark visible on dark surfaces
        // without adding a second circular backing around the verification icon.
        filter: selectedColor === 'black' ? 'drop-shadow(0 0 1px rgba(255,255,255,0.8))' : 'none',
        ...sx,
      }}
    />
  );

  return (
    <Tooltip
      title={badgeLabels[selectedColor]}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={1800}
      slotProps={{
        tooltip: {
          sx: {
            px: 1.25,
            py: 0.65,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.96)',
            color: '#000000',
            border: '1px solid rgba(0,0,0,0.14)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.01em',
          },
        },
        arrow: { sx: { color: 'rgba(255,255,255,0.96)' } },
      }}
    >
      <Box
        component="span"
        role="img"
        aria-label={badgeLabels[selectedColor]}
        tabIndex={0}
        sx={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', lineHeight: 0, cursor: 'help' }}
      >
        {mark}
      </Box>
    </Tooltip>
  );
}
