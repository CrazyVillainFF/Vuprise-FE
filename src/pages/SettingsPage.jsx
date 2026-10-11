import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Card,
  Typography,
  Grid,
  Stack,
  Box,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../theme/ThemeContext';
import { authAPI, messageAPI, userAPI } from '../services/api';
import { getDeviceKeyPair, saveDeviceKeyPair } from '../utils/e2ee';
import { createEncryptedKeyBackup, restoreEncryptedKeyBackup } from '../utils/keyBackup';
import PasswordTextField from '../components/PasswordTextField';
import { isVerifiedAccount } from '../utils/verification';

const SettingsPage = () => {
  const { user, logout, updateUser } = useAuth();
  const { mode, setThemeMode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const accountId = user?._id;

  // Password update form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingHideActivity, setSavingHideActivity] = useState(false);
  const [privacyError, setPrivacyError] = useState(null);
  const [keyBackup, setKeyBackup] = useState({ loading: true, pair: null, remoteKey: null, backups: [], error: '' });
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [savingBackup, setSavingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [backupError, setBackupError] = useState('');

  const loadKeyBackup = useCallback(async () => {
    if (!accountId) return;
    setKeyBackup((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [localPair, keyResponse, backupResponse] = await Promise.all([
        getDeviceKeyPair(accountId), messageAPI.getOwnKey(), messageAPI.getOwnKeyBackups(),
      ]);
      setKeyBackup({
        loading: false,
        pair: localPair || null,
        remoteKey: keyResponse.data || null,
        backups: backupResponse.data.backups || [],
        error: '',
      });
    } catch (error) {
      setKeyBackup((current) => ({ ...current, loading: false, error: error.message || 'Could not load recovery backup status.' }));
    }
  }, [accountId]);

  useEffect(() => { loadKeyBackup(); }, [loadKeyBackup]);
  useEffect(() => {
    if (location.hash === '#message-backup') {
      requestAnimationFrame(() => document.getElementById('message-backup')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [location.hash]);

  const handleCreateKeyBackup = async (event) => {
    event.preventDefault();
    try {
      setSavingBackup(true);
      setBackupError('');
      if (!keyBackup.pair) throw new Error('This device does not have the original private key to back up.');
      const backup = await createEncryptedKeyBackup(keyBackup.pair, user._id, backupPassphrase);
      await messageAPI.saveOwnKeyBackup(backup);
      setBackupPassphrase('');
      setToastMessage('Encrypted recovery backup saved. Keep your passphrase somewhere safe.');
      await loadKeyBackup();
    } catch (error) {
      setBackupError(error.message || 'Could not create the recovery backup.');
    } finally {
      setSavingBackup(false);
    }
  };

  const handleRestoreKeyBackup = async (backup) => {
    try {
      setRestoringBackup(true);
      setBackupError('');
      const { publicKey, signingPublicKey } = keyBackup.remoteKey || {};
      if (!publicKey || !signingPublicKey) throw new Error('This account has no registered legacy message key to restore.');
      const restoredPair = await restoreEncryptedKeyBackup(backup, user._id, restorePassphrase, publicKey, signingPublicKey);
      await saveDeviceKeyPair(user._id, restoredPair);
      setRestorePassphrase('');
      setToastMessage('Recovery key restored on this device. Reload Messages to view legacy history.');
      await loadKeyBackup();
    } catch (error) {
      setBackupError(error.message || 'Could not restore this recovery backup.');
    } finally {
      setRestoringBackup(false);
    }
  };

  const handlePrivateAccountChange = async (event) => {
    const privateAccount = event.target.checked;
    try {
      setSavingPrivacy(true);
      setPrivacyError(null);
      const response = await userAPI.updateSettings({ privateAccount });
      updateUser(response.data.user);
      setToastMessage(privateAccount ? 'Private Account is on.' : 'Private Account is off.');
    } catch (err) {
      setPrivacyError(err.message || 'Could not update your privacy setting.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleHideActivityChange = async (event) => {
    const hideActivity = event.target.checked;
    try {
      setSavingHideActivity(true);
      setPrivacyError(null);
      const response = await userAPI.updateSettings({ hideActivity });
      updateUser(response.data.user);
      setToastMessage(hideActivity ? 'Your online and offline status is hidden.' : 'Your online and offline status is visible.');
    } catch (err) {
      setPrivacyError(err.message || 'Could not update Hide Activity.');
    } finally {
      setSavingHideActivity(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Please fill in both current and new password.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      setPasswordError(null);
      await authAPI.updatePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToastMessage('Password updated successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
          Account & App Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your interface appearance, security credentials, and preferences.
        </Typography>
      </Box>

      <Stack spacing={3.5}>
        <Card id="message-backup" sx={{ p: 3, scrollMarginTop: 24 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
            <SecurityRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>Message recovery backup</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This is only for older encrypted message history. New messages sync with your account and do not need a backup. Your recovery passphrase encrypts the key on this device; Vuprise never receives it.
          </Typography>
          {backupError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBackupError('')}>{backupError}</Alert>}
          {keyBackup.loading ? <CircularProgress size={22} /> : keyBackup.error ? (
            <Alert severity="warning">{keyBackup.error}</Alert>
          ) : (
            <Stack spacing={2}>
              {keyBackup.backups.length > 0 && (
                <Alert severity="success">{keyBackup.backups.length} encrypted recovery {keyBackup.backups.length === 1 ? 'backup is' : 'backups are'} available for this account.</Alert>
              )}
              {keyBackup.pair?.privateKey?.extractable && keyBackup.pair?.signingPrivateKey?.extractable && keyBackup.backups.length < 5 ? (
                <Box component="form" onSubmit={handleCreateKeyBackup}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Save a recovery backup</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Use a unique passphrase with at least 16 characters. You’ll need it to restore this key on another device.
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <PasswordTextField label="Recovery passphrase (min. 16 characters)" size="small" value={backupPassphrase} onChange={(event) => setBackupPassphrase(event.target.value)} slotProps={{ htmlInput: { minLength: 16 } }} required fullWidth />
                    <Button type="submit" variant="contained" disabled={savingBackup || backupPassphrase.length < 16} sx={{ flexShrink: 0 }}>
                      {savingBackup ? <CircularProgress size={18} color="inherit" /> : 'Save backup'}
                    </Button>
                  </Stack>
                </Box>
              ) : null}
              {keyBackup.backups.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Restore on this device</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Enter the passphrase used when the backup was created.</Typography>
                  <Stack spacing={1.5}>
                    <PasswordTextField label="Recovery passphrase" size="small" value={restorePassphrase} onChange={(event) => setRestorePassphrase(event.target.value)} fullWidth />
                    {keyBackup.backups.map((backup, index) => (
                      <Stack key={backup._id || `${backup.createdAt}-${index}`} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Typography variant="body2">Backup {index + 1} · {backup.createdAt ? new Date(backup.createdAt).toLocaleDateString() : 'Saved'}</Typography>
                        <Button variant="outlined" disabled={restoringBackup || restorePassphrase.length < 16} onClick={() => handleRestoreKeyBackup(backup)}>
                          {restoringBackup ? <CircularProgress size={18} /> : 'Restore this backup'}
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
              {!keyBackup.pair && keyBackup.backups.length === 0 && keyBackup.remoteKey?.publicKey && (
                <Alert severity="info">No legacy key backup is available. Open Messages on the original device to save one here. New chats still work on this device; old encrypted history cannot be recovered without that original key.</Alert>
              )}
              {keyBackup.pair && !keyBackup.pair.privateKey?.extractable && keyBackup.backups.length === 0 && (
                <Alert severity="info">This device’s legacy key is in a format that cannot be backed up. Keep using this device for old encrypted history. New chats sync normally.</Alert>
              )}
              {!keyBackup.remoteKey?.publicKey && !keyBackup.pair && keyBackup.backups.length === 0 && (
                <Alert severity="info">There is no legacy encryption key to back up for this account. New chats work without a recovery backup.</Alert>
              )}
              {keyBackup.backups.length >= 5 && <Alert severity="info">You have reached the five-backup limit for this account.</Alert>}
            </Stack>
          )}
        </Card>

        {/* SECTION 1: Appearance & Theme */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <PaletteOutlinedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>
              Interface Appearance
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Select your preferred color mode for the Vuprise interface.
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                onClick={() => setThemeMode('light')}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: (theme) =>
                    `2px solid ${mode === 'light' ? theme.palette.primary.main : theme.palette.divider}`,
                  bgcolor: mode === 'light' ? 'action.selected' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <LightModeOutlinedIcon sx={{ color: mode === 'light' ? 'primary.main' : 'text.secondary' }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Light Mode
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Crisp, high-contrast light slate surfaces
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                onClick={() => setThemeMode('dark')}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: (theme) =>
                    `2px solid ${mode === 'dark' ? theme.palette.primary.main : theme.palette.divider}`,
                  bgcolor: mode === 'dark' ? 'action.selected' : 'background.paper',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <DarkModeOutlinedIcon sx={{ color: mode === 'dark' ? 'primary.main' : 'text.secondary' }} />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      Dark Mode
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Deep obsidian tones tailored for late sessions
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Grid>
          </Grid>
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700}>Private Account</Typography>
              <Typography variant="body2" color="text.secondary">
                Only your accepted connections can see your posts.
              </Typography>
            </Box>
            <FormControlLabel
              label={user?.privateAccount ? 'On' : 'Off'}
              control={<Switch checked={Boolean(user?.privateAccount)} onChange={handlePrivateAccountChange} disabled={savingPrivacy} inputProps={{ 'aria-label': 'Private Account' }} />}
              sx={{ m: 0, flexShrink: 0 }}
            />
          </Stack>
          {privacyError && <Alert severity="error" sx={{ mt: 2 }}>{privacyError}</Alert>}
        </Card>

        <Card sx={{ p: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700}>Hide Activity</Typography>
              <Typography variant="body2" color="text.secondary">Hide your online and offline status from other users.</Typography>
            </Box>
            <FormControlLabel
              label={user?.hideActivity ? 'On' : 'Off'}
              control={<Switch checked={Boolean(user?.hideActivity)} onChange={handleHideActivityChange} disabled={savingHideActivity} inputProps={{ 'aria-label': 'Hide Activity' }} />}
              sx={{ m: 0, flexShrink: 0 }}
            />
          </Stack>
          {privacyError && <Alert severity="error" sx={{ mt: 2 }}>{privacyError}</Alert>}
        </Card>

        {/* SECTION 2: Security & Password */}
        <Card sx={{ p: 3 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <SecurityRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={700}>
              Security & Password
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Update your account password to ensure your profile remains secure.
          </Typography>

          {passwordError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setPasswordError(null)}>
              {passwordError}
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <Stack spacing={2} sx={{ maxWidth: 460 }}>
              <PasswordTextField
                label="Current Password"
                size="small"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                required
              />
              <PasswordTextField
                label="New Password (min. 6 chars)"
                size="small"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
              <PasswordTextField
                label="Confirm New Password"
                size="small"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />

              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={changingPassword}
                sx={{ alignSelf: 'flex-start', px: 3, mt: 1 }}
              >
                {changingPassword ? <CircularProgress size={18} color="inherit" /> : 'Update Password'}
              </Button>
            </Stack>
          </form>
        </Card>

        {/* SECTION 3: Account Information */}
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            Account Details
          </Typography>
          <Divider sx={{ mb: 2.5 }} />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Registered Email
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {user?.email}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Account Status
              </Typography>
              <Typography variant="body1" fontWeight={600} color={isVerifiedAccount(user) ? 'success.main' : 'text.primary'}>
                {isVerifiedAccount(user) ? 'Verified Member' : 'Active Member'}
              </Typography>
            </Grid>
          </Grid>
        </Card>

        {/* SECTION 4: Sign Out / Danger Zone */}
        <Card sx={{ p: 3, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="error.main">
                Sign Out of Current Session
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You will need to sign back in with your credentials to access protected features.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutRoundedIcon />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </Stack>
        </Card>
      </Stack>

      {/* Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;
