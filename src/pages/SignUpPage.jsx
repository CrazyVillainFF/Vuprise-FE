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
  Divider,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { useAuth } from '../context/AuthContext';
import StatusMark from '../components/reactbits/StatusMark';

const MAX_COURSE_START_YEAR = new Date().getFullYear() + 10;

const SignUpPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accountType: '',
    jobTitle: '',
    company: '',
    schoolName: '',
    course: '',
    courseStartYear: '',
    password: '',
    confirmPassword: '',
    // Hidden anti-automation field; real users never see or fill it (server honeypot).
    website: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAccountTypeChange = (_event, accountType) => {
    if (!accountType) return;
    setFormData((current) => ({
      ...current,
      accountType,
      jobTitle: '',
      company: '',
      schoolName: '',
      course: '',
      courseStartYear: ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword, accountType, jobTitle, company, schoolName, course, courseStartYear } = formData;

    if (!name.trim() || !email.trim() || !password || !accountType) {
      setError('Please fill in all required fields.');
      return;
    }

    if (accountType === 'student' && (!schoolName.trim() || !course.trim() || !courseStartYear)) {
      setError('Please add your school or college, course, and course start year.');
      return;
    }

    if (accountType === 'workplace' && (!jobTitle.trim() || !company.trim())) {
      setError('Please add your work role and company or organization.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        accountType,
        jobTitle: accountType === 'workplace' ? jobTitle.trim() : 'Student',
        company: accountType === 'workplace' ? company.trim() : schoolName.trim(),
        schoolName: accountType === 'student' ? schoolName.trim() : '',
        course: accountType === 'student' ? course.trim() : '',
        courseStartYear: accountType === 'student' ? courseStartYear : '',
        headline: accountType === 'student'
          ? `${course.trim()} student at ${schoolName.trim()}`
          : `${jobTitle.trim()} at ${company.trim()}`,
        website: formData.website
      });
      navigate('/home');
    } catch (err) {
      setError(err.message || 'Unable to complete registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card sx={{ p: { xs: 2.5, sm: 3.5 }, borderRadius: 3.5, boxShadow: 3 }}>
      <CardContent sx={{ p: '0 !important' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Join Vuprise
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Connect with leading founders, architects, and designers worldwide.
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            label="Website"
            name="website"
            value={formData.website}
            onChange={handleChange}
            autoComplete="off"
            sx={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            slotProps={{ htmlInput: { 'aria-hidden': true, tabIndex: -1 } }}
          />
          <Stack spacing={2}>
            <TextField
              label="Full Name"
              name="name"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              required
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}}
            />

            <TextField
              label="Work or Personal Email"
              name="email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={handleChange}
              required
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}}
            />

            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Which best describes you?</Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={formData.accountType}
                onChange={handleAccountTypeChange}
                aria-label="Choose student or workplace account"
                color="primary"
                sx={{ '& .MuiToggleButton-root': { py: 1.1, textTransform: 'none', fontWeight: 700 } }}
              >
                <ToggleButton value="student">Student</ToggleButton>
                <ToggleButton value="workplace">Workplace</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {formData.accountType === 'student' && (
              <Stack spacing={2}>
                <TextField
                  label="College or School Name"
                  name="schoolName"
                  fullWidth
                  value={formData.schoolName}
                  onChange={handleChange}
                  required
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
                <TextField
                  label="Course or Field of Study"
                  name="course"
                  fullWidth
                  value={formData.course}
                  onChange={handleChange}
                  required
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                />
                <TextField
                  label="Course Start Year"
                  name="courseStartYear"
                  type="number"
                  fullWidth
                  value={formData.courseStartYear}
                  onChange={handleChange}
                  required
                  slotProps={{ htmlInput: { min: 1900, max: MAX_COURSE_START_YEAR, step: 1 } }}
                />
              </Stack>
            )}

            {formData.accountType === 'workplace' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Work Role or Job Title"
                name="jobTitle"
                fullWidth
                value={formData.jobTitle}
                onChange={handleChange}
                required
                slotProps={{ htmlInput: { maxLength: 120 }, input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessCenterOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}}
              />
              <TextField
                label="Company or Organization"
                name="company"
                fullWidth
                value={formData.company}
                onChange={handleChange}
                required
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />
              </Stack>
            )}

            <TextField
              label="Password (min. 8 characters)"
              name="password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={formData.password}
              onChange={handleChange}
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

            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              fullWidth
              value={formData.confirmPassword}
              onChange={handleChange}
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
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      edge="end"
                      size="small"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              color="primary"
              fullWidth
              disabled={submitting}
              sx={{ py: 1.25, fontSize: '0.95rem', mt: 1 }}
            >
              {submitting ? <StatusMark status="running" label="Creating account…" color="inherit" size={18} fontSize={14} /> : 'Create Account'}
            </Button>
          </Stack>
        </form>

        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.secondary">
            ALREADY REGISTERED?
          </Typography>
        </Divider>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Typography
              component={Link}
              to="/signin"
              variant="body2"
              color="primary"
              fontWeight={700}
              sx={{ textDecoration: 'underline', textUnderlineOffset: '0.15em' }}
            >
              Sign In
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Need help?{' '}
            <Typography component={Link} to="/support/request?type=general_help" variant="body2" color="primary" fontWeight={700} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
              Contact Vuprise Support
            </Typography>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SignUpPage;
