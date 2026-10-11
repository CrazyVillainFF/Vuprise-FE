import React, { Suspense, lazy, useState } from 'react';
import { CircularProgress, IconButton, Popover, Tooltip, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SentimentSatisfiedAltRoundedIcon from '@mui/icons-material/SentimentSatisfiedAltRounded';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const EmojiPickerControl = ({ onSelect, disabled = false, label = 'Add emoji' }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleEmojiClick = ({ emoji }) => {
    onSelect?.(emoji);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Add emoji">
        <span>
          <IconButton
            type="button"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={Boolean(anchorEl)}
            disabled={disabled}
            onClick={(event) => setAnchorEl(event.currentTarget)}
            size="small"
            color="primary"
          >
            <SentimentSatisfiedAltRoundedIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { overflow: 'hidden', borderRadius: 2 } } }}
      >
        {anchorEl && (
          <Suspense fallback={<CircularProgress size={24} sx={{ display: 'block', m: 4 }} />}>
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              width={isSmallScreen ? Math.min(window.innerWidth - 24, 350) : 350}
              height={400}
              lazyLoadEmojis
              searchPlaceHolder="Search all emojis"
            />
          </Suspense>
        )}
      </Popover>
    </>
  );
};

export default EmojiPickerControl;
