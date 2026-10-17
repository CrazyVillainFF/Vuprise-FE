import React, { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import BrokenImageRoundedIcon from '@mui/icons-material/BrokenImageRounded';

/**
 * Renders a chat/official-message attachment responsively and swaps to a
 * graceful fallback when the stored image can no longer be loaded.
 */
export default function MessageImage({ src, alt = '', maxWidth = 360, maxHeight = 360, sx, onLoad }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);

  if (!src) return null;

  if (failed) {
    return (
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        role="img"
        aria-label={alt ? `${alt} (image unavailable)` : 'Attached image unavailable'}
        sx={{ px: 1.25, py: 1, borderRadius: 1.5, bgcolor: 'action.hover', color: 'text.secondary', maxWidth: '100%', mb: '0.4rem', ...sx }}
      >
        <BrokenImageRoundedIcon fontSize="small" />
        <Typography variant="caption">Image unavailable</Typography>
      </Stack>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      onLoad={onLoad}
      sx={{ display: 'block', width: `min(100%, ${maxWidth}px)`, maxHeight, objectFit: 'contain', borderRadius: 1.5, ...sx }}
    />
  );
}
