import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Grid,
  Box,
  Chip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import CountryRegionSelector from '../components/CountryRegionSelector';

import { useAuth } from '../context/AuthContext';
import { getBrandedHeadline } from '../utils/brandCopy';
import { userAPI } from '../services/api';

const EditProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
    website: '',
    company: '',
    jobTitle: '',
  });

  const [skills, setSkills] = useState([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);
  const [locationSelection, setLocationSelection] = useState({ country: '', countryCode: '', region: '', regionCode: '' });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        headline: getBrandedHeadline(user.headline),
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        company: user.company || '',
        jobTitle: user.jobTitle || '',
      });
      setSkills(user.skills || []);
      setExperiences(user.experience || []);
      setEducations(user.education || []);
      setLocationSelection({
        country: user.locationCountry || '',
        countryCode: user.locationCountryCode || '',
        region: user.locationRegion || '',
        regionCode: user.locationRegionCode || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Skills management
  const handleAddSkill = (e) => {
    if ((e.key === 'Enter' || e.type === 'click') && newSkillInput.trim()) {
      e.preventDefault();
      const skillClean = newSkillInput.trim();
      if (!skills.includes(skillClean)) {
        setSkills([...skills, skillClean]);
      }
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  // Experience management
  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      { title: '', company: '', location: '', startDate: '', endDate: '', current: false, description: '' }
    ]);
  };

  const handleExperienceChange = (index, field, value) => {
    const updated = [...experiences];
    updated[index][field] = value;
    setExperiences(updated);
  };

  const handleRemoveExperience = (index) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  // Education management
  const handleAddEducation = () => {
    setEducations([
      ...educations,
      { school: '', degree: '', fieldOfStudy: '', startYear: '', endYear: '' }
    ]);
  };

  const handleEducationChange = (index, field, value) => {
    const updated = [...educations];
    updated[index][field] = value;
    setEducations(updated);
  };

  const handleRemoveEducation = (index) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locationSelection.countryCode && (!locationSelection.region.trim() || !locationSelection.country.trim())) {
      setError('Choose both a country and state or region, or clear the location selection.');
      return;
    }
    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...formData,
        ...(locationSelection.countryCode ? {
          locationCountry: locationSelection.country,
          locationCountryCode: locationSelection.countryCode,
          locationRegion: locationSelection.region,
          locationRegionCode: locationSelection.regionCode,
        } : user.locationCountryCode ? {
          locationCountry: '',
          locationCountryCode: '',
          locationRegion: '',
          locationRegionCode: '',
        } : {}),
        skills,
        experience: experiences.filter((exp) => exp.title.trim() && exp.company.trim()),
        education: educations.filter((edu) => edu.school.trim()),
      };

      const res = await userAPI.updateProfile(payload);
      if (res.data.success) {
        updateUser(res.data.user);
        setToastMessage('Profile updated successfully!');
        setTimeout(() => {
          navigate(`/profile/${user._id}`);
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} color="inherit">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em">
            Edit Your Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Keep your professional headline, experiences, and skills up to date.
          </Typography>
        </Box>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Section 1: Basic Info */}
          <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Core Information
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Full Name"
                  name="name"
                  fullWidth
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Professional Headline"
                  name="headline"
                  placeholder="e.g. Senior Distributed Systems Architect @ Scale | Go & Rust"
                  fullWidth
                  value={formData.headline}
                  onChange={handleInputChange}
                  helperText="Summarize your primary role and domain expertise."
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CountryRegionSelector
                  value={locationSelection}
                  onChange={(next) => {
                    setLocationSelection(next);
                    setFormData((current) => ({ ...current, location: next.region && next.country ? `${next.region}, ${next.country}` : '' }));
                  }}
                  required={false}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Your selected country and region will appear on your profile.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Current Job Title"
                  name="jobTitle"
                  placeholder="e.g. Staff Engineer"
                  fullWidth
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Company / Organization"
                  name="company"
                  placeholder="e.g. Stripe"
                  fullWidth
                  value={formData.company}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Portfolio or Personal Website"
                  name="website"
                  placeholder="https://yourwebsite.com"
                  fullWidth
                  value={formData.website}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Bio & Vision"
                  name="bio"
                  multiline
                  rows={4}
                  placeholder="Tell your professional story, interests, and accomplishments..."
                  fullWidth
                  value={formData.bio}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Section 2: Skills */}
          <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Skills & Expertise
            </Typography>
            <Divider sx={{ mb: 2.5 }} />

            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                label="Add a Skill (press Enter)"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                fullWidth
                size="small"
              />
              <Button variant="outlined" onClick={handleAddSkill} startIcon={<AddRoundedIcon />}>
                Add
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ minHeight: 36 }}>
              {skills.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  onDelete={() => handleRemoveSkill(skill)}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 600, '& .MuiChip-deleteIcon': { color: 'error.main', '&:hover': { color: 'error.dark' } } }}
                />
              ))}
              {skills.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No skills added yet. Type a skill above and press Enter.
                </Typography>
              )}
            </Stack>
          </Card>

          {/* Section 3: Work Experience */}
          <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Work Experience
              </Typography>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={handleAddExperience}>
                Add Role
              </Button>
            </Stack>
            <Divider sx={{ mb: 2.5 }} />

            {experiences.map((exp, index) => (
              <Box
                key={index}
                sx={{
                  p: 2.5,
                  mb: 2.5,
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  position: 'relative'
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleRemoveExperience(index)}
                  sx={{ position: 'absolute', top: 12, right: 12, color: 'error.main' }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Title / Position"
                      size="small"
                      fullWidth
                      value={exp.title}
                      onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Company"
                      size="small"
                      fullWidth
                      value={exp.company}
                      onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Location"
                      size="small"
                      fullWidth
                      value={exp.location}
                      onChange={(e) => handleExperienceChange(index, 'location', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="Start Date"
                      placeholder="e.g. 2021"
                      size="small"
                      fullWidth
                      value={exp.startDate}
                      onChange={(e) => handleExperienceChange(index, 'startDate', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      label="End Date"
                      placeholder="e.g. 2024 or Present"
                      size="small"
                      fullWidth
                      value={exp.endDate}
                      disabled={exp.current}
                      onChange={(e) => handleExperienceChange(index, 'endDate', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exp.current || false}
                          onChange={(e) => handleExperienceChange(index, 'current', e.target.checked)}
                          color="primary"
                        />
                      }
                      label={<Typography variant="body2">I currently work in this role</Typography>}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Description & Highlights"
                      multiline
                      rows={2}
                      size="small"
                      fullWidth
                      value={exp.description}
                      onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}

            {experiences.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No experience entries added. Click "Add Role" above.
              </Typography>
            )}
          </Card>

          {/* Section 4: Education */}
          <Card sx={{ p: { xs: 2.5, sm: 3.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" fontWeight={700}>
                Education
              </Typography>
              <Button size="small" startIcon={<AddRoundedIcon />} onClick={handleAddEducation}>
                Add Education
              </Button>
            </Stack>
            <Divider sx={{ mb: 2.5 }} />

            {educations.map((edu, index) => (
              <Box
                key={index}
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: 2.5,
                  bgcolor: 'action.hover',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  position: 'relative'
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleRemoveEducation(index)}
                  sx={{ position: 'absolute', top: 12, right: 12, color: 'error.main' }}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="School / University"
                      size="small"
                      fullWidth
                      value={edu.school}
                      onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Degree"
                      placeholder="e.g. Master of Science"
                      size="small"
                      fullWidth
                      value={edu.degree}
                      onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Field of Study"
                      placeholder="e.g. Computer Science"
                      size="small"
                      fullWidth
                      value={edu.fieldOfStudy}
                      onChange={(e) => handleEducationChange(index, 'fieldOfStudy', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      label="Start Year"
                      size="small"
                      fullWidth
                      value={edu.startYear}
                      onChange={(e) => handleEducationChange(index, 'startYear', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      label="End Year"
                      size="small"
                      fullWidth
                      value={edu.endYear}
                      onChange={(e) => handleEducationChange(index, 'endYear', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}

            {educations.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No education records added. Click "Add Education" above.
              </Typography>
            )}
          </Card>

          {/* Action Bar */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
            <Button variant="outlined" color="inherit" onClick={() => navigate(-1)} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveRoundedIcon />}
              sx={{ px: 4 }}
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </Stack>
        </Stack>
      </form>

      {/* Success Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={3000}
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

export default EditProfilePage;
