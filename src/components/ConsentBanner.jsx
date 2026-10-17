import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Paper, Stack, Switch, Typography } from '@mui/material';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { OPEN_CONSENT_EVENT, readConsent, writeConsent } from '../utils/consent';
import { isAnalyticsConfigured } from '../utils/analytics';

const ConsentBanner = () => {
  const [decided, setDecided] = useState(() => Boolean(readConsent()));
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState(() => readConsent()?.analytics === true);

  useEffect(() => {
    const open = () => {
      setAnalyticsChoice(readConsent()?.analytics === true);
      setPreferencesOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open);
  }, []);

  const decide = (analytics) => {
    writeConsent(analytics);
    setDecided(true);
    setPreferencesOpen(false);
  };

  const savePreferences = (event) => {
    event.preventDefault();
    decide(analyticsChoice);
  };

  return (
    <>
      {!decided && (
        <Paper
          role="region"
          aria-label="Privacy notice"
          elevation={12}
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            // Keep the notice above page chrome but below MUI modals (1300) and
            // snackbars (1400) so dialogs and prompts stay operable.
            zIndex: (theme) => theme.zIndex.modal - 1,
            borderTop: 1,
            borderColor: 'divider',
            borderRadius: 0,
            px: { xs: 2, md: 4 },
            py: 2,
            bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,.97)' : 'rgba(0,0,0,.97)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <CookieOutlinedIcon sx={{ color: 'primary.main', mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>Your privacy</Typography>
                <Typography variant="body2" color="text.secondary">
                  We use essential storage to run Vuprise. With your permission, we also use analytics to understand how the site is used. Read the{' '}
                  <Box component={RouterLink} to="/privacy" sx={{ color: 'primary.main', textDecoration: 'underline' }}>Privacy Policy</Box>.
                </Typography>
              </Box>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexShrink: 0 }}>
              <Button variant="text" color="inherit" onClick={() => setPreferencesOpen(true)}>Preferences</Button>
              <Button variant="outlined" color="inherit" onClick={() => decide(false)}>Reject non-essential</Button>
              <Button variant="contained" onClick={() => decide(true)}>Accept all</Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <Dialog open={preferencesOpen} onClose={() => setPreferencesOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={savePreferences}>
          <DialogTitle fontWeight={800}>Privacy preferences</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Box>
                <FormControlLabel
                  control={<Switch checked disabled slotProps={{ input: { 'aria-label': 'Essential storage, always on' } }} />}
                  label={<Typography fontWeight={700}>Essential</Typography>}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mt: -1 }}>
                  Required for sign-in, security, and remembering your settings. Always on.
                </Typography>
              </Box>
              <Box>
                <FormControlLabel
                  control={<Switch checked={analyticsChoice} onChange={(event) => setAnalyticsChoice(event.target.checked)} slotProps={{ input: { 'aria-label': 'Analytics' } }} />}
                  label={<Typography fontWeight={700}>Analytics</Typography>}
                />
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 6, mt: -1 }}>
                  {isAnalyticsConfigured()
                    ? 'Anonymous usage measurements that help us improve Vuprise.'
                    : 'No analytics service is currently active on this deployment; your choice is stored and applied if one is enabled.'}
                </Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setPreferencesOpen(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained">Save choices</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default ConsentBanner;
