import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import PasswordTextField from '../components/PasswordTextField';

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || '';
  const [email, setEmail] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(resetToken ? 'password' : 'request'); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (step === 'request') {
        const response = await authAPI.requestPasswordReset(email.trim());
        setMessage(response.data.message); setStep('sent');
      } else {
        if (!resetToken) throw new Error('This reset link is invalid or expired. Request a new link.');
        const response = await authAPI.completePasswordReset({ resetToken, newPassword, confirmPassword });
        setMessage(response.data.message); setStep('complete');
      }
    } catch (requestError) { setError(requestError.message || 'Password recovery could not continue.'); }
    finally { setBusy(false); }
  };

  return <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3.5, boxShadow: 3 }}><CardContent sx={{ p: '0 !important' }}>
    <Typography variant="h5" fontWeight={800} gutterBottom>{step === 'password' ? 'Choose a new password' : 'Reset your password'}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{step === 'password' ? 'Your reset link is single-use and expires after 10 minutes.' : 'Enter your email. If it matches an account and Resend accepts the message, a secure reset link will be sent.'}</Typography>
    {message && <Alert severity={step === 'complete' ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {step === 'request' && <Box component="form" onSubmit={submit}><Stack spacing={2}><TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth autoComplete="email" /><Button type="submit" variant="contained" disabled={busy}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Send reset link'}</Button></Stack></Box>}
    {step === 'password' && <Box component="form" onSubmit={submit}><Stack spacing={2}><PasswordTextField label="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required fullWidth autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} /><PasswordTextField label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required fullWidth autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} /><Button type="submit" variant="contained" disabled={busy || newPassword.length < 8 || newPassword !== confirmPassword}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Save new password'}</Button></Stack></Box>}
    {step === 'sent' && <><Alert severity="info" sx={{ mb: 2 }}>If this email belongs to an account and Resend accepts delivery to this address, a reset link will arrive. Check spam and, for testing, confirm this recipient is permitted by your Resend account.</Alert><Button component={Link} to="/signin" variant="contained" fullWidth>Return to sign in</Button></>}
    {step === 'complete' && <Button component={Link} to="/signin" variant="contained" fullWidth>Sign in with new password</Button>}
    {(step === 'request' || step === 'password') && <Box sx={{ mt: 2.5, textAlign: 'center' }}><Typography component={Link} to="/signin" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>Back to sign in</Typography></Box>}
  </CardContent></Card>;
};
export default ForgotPasswordPage;
