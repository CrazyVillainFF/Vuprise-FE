import React from 'react';
import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { openConsentPreferences } from '../utils/consent';

// Public footer: keeps the informational pages one click from anywhere and
// provides the re-open entry point for the privacy preferences dialog.
const SiteFooter = () => (
  <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: { xs: 3, md: 4 }, mt: 'auto' }}>
    <Container maxWidth="lg">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Typography variant="body2" color="text.secondary">
          © {new Date().getFullYear()} Vuprise
        </Typography>
        <Stack direction="row" spacing={{ xs: 2, sm: 3 }} useFlexGap flexWrap="wrap">
          <Link component={RouterLink} to="/faq" underline="hover" variant="body2" color="text.secondary">FAQ</Link>
          <Link component={RouterLink} to="/support/request" underline="hover" variant="body2" color="text.secondary">Support</Link>
          <Link component={RouterLink} to="/privacy" underline="hover" variant="body2" color="text.secondary">Privacy</Link>
          <Link
            component="button"
            type="button"
            onClick={openConsentPreferences}
            underline="hover"
            variant="body2"
            color="text.secondary"
          >
            Cookie settings
          </Link>
        </Stack>
      </Stack>
    </Container>
  </Box>
);

export default SiteFooter;
