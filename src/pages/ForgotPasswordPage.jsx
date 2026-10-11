import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import PasswordTextField from '../components/PasswordTextField';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request'); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (step === 'request') {
        await authAPI.requestPasswordReset(email.trim());
        setStep('code');
      } else {
        const response = await authAPI.completePasswordReset({ email: email.trim(), code, newPassword, confirmPassword });
        setMessage(response.data.message); setStep('complete');
      }
    } catch (requestError) { setError(requestError.message || 'Password recovery could not continue.'); }
    finally { setBusy(false); }
  };

  return <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3.5, boxShadow: 3 }}><CardContent sx={{ p: '0 !important' }}>
    <Typography variant="h5" fontWeight={800} gutterBottom>{step === 'code' ? 'Verify your code' : step === 'complete' ? 'Password updated' : 'Reset your password'}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{step === 'code' ? 'If an account matches, a 6-digit code will be sent. Enter that code below; it expires in 10 minutes.' : step === 'request' ? 'Enter your email and we’ll send a password reset code if an account matches.' : ''}</Typography>
    {message && <Alert severity={step === 'complete' ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {step === 'request' && <Box component="form" onSubmit={submit}><Stack spacing={2}><TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth autoComplete="email" /><Button type="submit" variant="contained" disabled={busy}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Send reset code'}</Button></Stack></Box>}
    {step === 'code' && <Box component="form" onSubmit={submit}><Stack spacing={2}><TextField label="6-digit code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required fullWidth autoComplete="one-time-code" inputProps={{ inputMode: 'numeric', pattern: '[0-9]{6}', maxLength: 6 }} /><PasswordTextField label="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required fullWidth autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} /><PasswordTextField label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required fullWidth autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} /><Button type="submit" variant="contained" disabled={busy || code.length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Verify code and reset password'}</Button><Button type="button" variant="text" onClick={() => { setStep('request'); setCode(''); setError(''); setMessage(''); }}>Use a different email</Button></Stack></Box>}
    {step === 'complete' && <Button component={Link} to="/signin" variant="contained" fullWidth>Sign in with new password</Button>}
    {(step === 'request' || step === 'code') && <Box sx={{ mt: 2.5, textAlign: 'center' }}><Typography component={Link} to="/signin" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>Back to sign in</Typography></Box>}
  </CardContent></Card>;
};
export default ForgotPasswordPage;
