import React, { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import PasswordTextField from '../components/PasswordTextField';
import CodeSlots from '../components/reactbits/CodeSlots';

const ForgotPasswordPage = () => {
  const theme = useTheme();
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [newPassword, setNewPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request'); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [codeStatus, setCodeStatus] = useState('idle');
  // Hidden anti-automation field; real users never see or fill it (see server honeypot checks).
  const [website, setWebsite] = useState('');
  const honeypotField = <TextField label="Website" value={website} onChange={(event) => setWebsite(event.target.value)} autoComplete="off" sx={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} slotProps={{ htmlInput: { 'aria-hidden': true, tabIndex: -1 } }} />;

  const handleCodeChange = (next) => {
    setCode(next);
    if (codeStatus === 'error') setCodeStatus('idle');
  };

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (step === 'request') {
        await authAPI.requestPasswordReset(email.trim(), { website });
        setStep('code');
      } else {
        const response = await authAPI.completePasswordReset({ email: email.trim(), code, newPassword, confirmPassword, website });
        // Real success: let the CodeSlots success wash play before advancing.
        setCodeStatus('success');
        await new Promise((resolve) => setTimeout(resolve, 900));
        setMessage(response.data.message); setStep('complete');
      }
    } catch (requestError) {
      // Only drain the slots on a real server rejection (invalid/expired code);
      // network failures keep the digits so the user can try again.
      if (step === 'code' && requestError.response) setCodeStatus('error');
      setError(requestError.message || 'Password recovery could not continue.');
    }
    finally { setBusy(false); }
  };

  return <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3.5, boxShadow: 3 }}><CardContent sx={{ p: '0 !important' }}>
    <Typography variant="h5" fontWeight={800} gutterBottom>{step === 'code' ? 'Verify your code' : step === 'complete' ? 'Password updated' : 'Reset your password'}</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>{step === 'code' ? 'If an account matches, a 6-digit code will be sent. Enter that code below; it expires in 10 minutes.' : step === 'request' ? 'Enter your email and we’ll send a password reset code if an account matches.' : ''}</Typography>
    {message && <Alert severity={step === 'complete' ? 'success' : 'info'} sx={{ mb: 2 }}>{message}</Alert>}
    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
    {step === 'request' && <Box component="form" onSubmit={submit}><Stack spacing={2}><TextField label="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required fullWidth autoComplete="email" />{honeypotField}<Button type="submit" variant="contained" disabled={busy}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Send reset code'}</Button></Stack></Box>}
    {step === 'code' && <Box component="form" onSubmit={submit}><Stack spacing={2}><Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.5 }}><CodeSlots length={6} value={code} onChange={handleCodeChange} status={codeStatus} disabled={busy} autoFocus slotSize={40} gap={6} radius={11} ariaLabel="Password reset verification code" accentColor={theme.palette.primary.main} inkColor={theme.palette.text.primary} slotColor={theme.palette.action.hover} digitColor={theme.palette.primary.contrastText} dangerColor={theme.palette.error.main} /></Box><PasswordTextField label="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required fullWidth autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} /><PasswordTextField label="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required fullWidth autoComplete="new-password" slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }} />{honeypotField}<Button type="submit" variant="contained" disabled={busy || code.length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword}>{busy ? <CircularProgress size={22} color="inherit" /> : 'Verify code and reset password'}</Button><Button type="button" variant="text" onClick={() => { setStep('request'); setCode(''); setCodeStatus('idle'); setError(''); setMessage(''); }}>Use a different email</Button></Stack></Box>}
    {step === 'complete' && <Button component={Link} to="/signin" variant="contained" fullWidth>Sign in with new password</Button>}
    {(step === 'request' || step === 'code') && <Box sx={{ mt: 2.5, textAlign: 'center' }}><Typography component={Link} to="/signin" variant="body2" color="primary" sx={{ textDecoration: 'none' }}>Back to sign in</Typography></Box>}
  </CardContent></Card>;
};
export default ForgotPasswordPage;
