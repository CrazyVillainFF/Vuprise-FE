import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Box,
  InputAdornment,
  IconButton,
  Alert,
  Divider
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext';
import StatusMark from '../components/reactbits/StatusMark';

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/home';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3.5, boxShadow: 3 }}>
      <CardContent sx={{ p: '0 !important' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Welcome back to Vuprise
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to access your professional feed and network.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
            {error} <Link to="/support/request" style={{ color: 'inherit', fontWeight: 700 }}>Need account help?</Link>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
              <Typography component={Link} to="/forgot-password" variant="body2" color="primary" sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                Forgot password?
              </Typography>
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              color="primary"
              fullWidth
              disabled={submitting}
              sx={{ py: 1.25, fontSize: '0.95rem' }}
            >
              {submitting ? <StatusMark status="running" label="Signing in…" color="inherit" size={18} fontSize={14} /> : 'Sign In'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">
            NEW TO VUPRISE?
          </Typography>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Typography
              component={Link}
              to="/signup"
              variant="body2"
              color="primary"
              fontWeight={700}
              sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Join the Network
            </Typography>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SignInPage;
