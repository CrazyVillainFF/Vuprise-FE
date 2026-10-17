import React, { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supportAPI } from '../services/api';
import EvidencePhotoPicker from '../components/EvidencePhotoPicker';

const requestTypes = [
  ['temporary_ban_appeal', 'Temporary ban appeal'],
  ['permanent_ban_appeal', 'Permanent ban appeal'],
  ['deleted_account_inquiry', 'Deleted account inquiry'],
  ['general_help', 'General help'], ['report', 'Report'], ['other', 'Other']
];

export default function SupportRequestPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedType = params.get('type');
  // Appeal links from the ban notice prefill the email so the request can be
  // matched to the banned account (the server still verifies the match).
  const requestedEmail = (params.get('email') || '').trim().slice(0, 254);
  const [form, setForm] = useState({ type: requestTypes.some(([value]) => value === requestedType) ? requestedType : 'general_help', email: requestedEmail, userId: '', subject: '', message: '', category: '', reportedUser: '', reportedPost: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      evidenceFiles.forEach((file) => payload.append('evidence', file));
      // Only after the server confirms the request do we move to the
      // confirmation page; failures keep the form and its data in place.
      await supportAPI.submit(payload);
      navigate('/thank-you');
    }
    catch (e) { setError(e.message || 'Could not send your request. Please try again later.'); }
    finally { setBusy(false); }
  };
  return <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 1.5, md: 3 }, py: { xs: 3, md: 6 }, width: '100%' }}>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4 }}>
      <Typography variant="overline" color="primary.main" fontWeight={800}>VUprise SUPPORT</Typography>
      <Typography variant="h4" fontWeight={850} sx={{ mb: 1 }}>Send a request</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>This form is available even if you can’t sign in. Include the email associated with the account so we can review it.</Typography>
      <form onSubmit={submit}><Stack gap={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select label="Request type" value={form.type} onChange={change('type')} required>{requestTypes.map(([value, label]) => <MenuItem value={value} key={value}>{label}</MenuItem>)}</TextField>
        <TextField type="email" label="Email address" value={form.email} onChange={change('email')} required slotProps={{ htmlInput: { maxLength: 254 } }}/>
        <TextField label="Account user ID or name (optional)" value={form.userId} onChange={change('userId')} slotProps={{ htmlInput: { maxLength: 120 } }}/>
        {form.type === 'report' && <><TextField label="Report category" value={form.category} onChange={change('category')} slotProps={{ htmlInput: { maxLength: 80 } }}/><TextField label="Reported user ID (optional)" value={form.reportedUser} onChange={change('reportedUser')} slotProps={{ htmlInput: { maxLength: 24 } }}/><TextField label="Reported post ID (optional)" value={form.reportedPost} onChange={change('reportedPost')} slotProps={{ htmlInput: { maxLength: 24 } }}/><Typography variant="caption" color="text.secondary">Do not include private message or chat content in a report.</Typography></>}
        <TextField label="Subject" value={form.subject} onChange={change('subject')} required slotProps={{ htmlInput: { minLength: 3, maxLength: 160 } }}/>
        <TextField label="Message" value={form.message} onChange={change('message')} required multiline minRows={5} slotProps={{ htmlInput: { minLength: 10, maxLength: 5000 } }}/>
        <EvidencePhotoPicker files={evidenceFiles} onChange={setEvidenceFiles} disabled={busy}/>
        <TextField label="Website" value={form.website} onChange={change('website')} autoComplete="off" sx={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} slotProps={{ htmlInput: { 'aria-hidden': true, tabIndex: -1 } }}/>
        <Typography variant="caption" color="text.secondary">Submissions are rate-limited. Deleted accounts cannot be restored through this form.</Typography>
        <Stack direction="row" justifyContent="flex-end" gap={1}><Button component={Link} to="/signin">Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button></Stack>
      </Stack></form>
    </Paper>
  </Box>;
}
