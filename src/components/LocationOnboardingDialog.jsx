import React, { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import CountryRegionSelector from './CountryRegionSelector';

const emptyLocation = { country: '', countryCode: '', region: '', regionCode: '' };

const LocationOnboardingDialog = () => {
  const { user, isAuthenticated, loading: authLoading, updateUser, welcomeMessage } = useAuth();
  const [selection, setSelection] = useState(emptyLocation);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const open = Boolean(!authLoading && !welcomeMessage && isAuthenticated && user && (!user.locationCountryCode || !user.locationRegion));

  useEffect(() => {
    if (open) {
      setSelection(emptyLocation);
      setError('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!selection.countryCode || !selection.region.trim() || saving) return;
    try {
      setSaving(true);
      setError('');
      const response = await userAPI.updateProfile({
        locationCountry: selection.country,
        locationCountryCode: selection.countryCode,
        locationRegion: selection.region,
        locationRegionCode: selection.regionCode,
      });
      if (!response.data.success) throw new Error('Your location could not be saved. Please try again.');
      updateUser(response.data.user);
    } catch (requestError) {
      setError(requestError.message || 'Your location could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      aria-labelledby="location-onboarding-title"
      aria-describedby="location-onboarding-description"
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { sx: { borderRadius: 3, mx: 2, maxHeight: 'calc(100dvh - 32px)' } } }}
    >
      <DialogTitle id="location-onboarding-title" sx={{ fontWeight: 800, pb: 0.5 }}>
        Complete Your Profile
      </DialogTitle>
      <DialogContent sx={{ pt: '12px !important' }}>
        <Typography id="location-onboarding-description" variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Select your country and state to personalize your Vuprise experience.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <CountryRegionSelector value={selection} onChange={setSelection} disabled={saving} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          variant="contained"
          fullWidth
          disabled={saving || !selection.countryCode || !selection.region.trim()}
          onClick={handleSave}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {saving ? 'Saving…' : 'Save & Continue'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationOnboardingDialog;
