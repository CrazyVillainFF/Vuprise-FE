import React, { useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import { supportAPI } from '../services/api';
import EvidencePhotoPicker from '../components/EvidencePhotoPicker';

const requestTypes = [
  ['temporary_ban_appeal', 'Temporary ban appeal'],
  ['permanent_ban_appeal', 'Permanent ban appeal'],
  ['deleted_account_inquiry', 'Deleted account inquiry'],
  ['general_help', 'General help'], ['report', 'Report'], ['other', 'Other']
];

export default function SupportRequestPage() {
  const [params] = useSearchParams();
  const requestedType = params.get('type');
  const [form, setForm] = useState({ type: requestTypes.some(([value]) => value === requestedType) ? requestedType : 'general_help', email: '', userId: '', subject: '', message: '', category: '', reportedUser: '', reportedPost: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      evidenceFiles.forEach((file) => payload.append('evidence', file));
      await supportAPI.submit(payload); setSent(true);
    }
    catch (e) { setError(e.message || 'Could not send your request. Please try again later.'); }
    finally { setBusy(false); }
  };
  return <Box sx={{ maxWidth: 760, mx: 'auto', px: { xs: 1.5, md: 3 }, py: { xs: 3, md: 6 }, width: '100%' }}>
    <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 4 }}>
      <Typography variant="overline" color="primary.main" fontWeight={800}>VUprise SUPPORT</Typography>
      <Typography variant="h4" fontWeight={850} sx={{ mb: 1 }}>Send a request</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>This form is available even if you can’t sign in. Include the email associated with the account so we can review it.</Typography>
      {sent ? <Stack gap={2}><Alert severity="success">Your request was received. Keep a copy of your request details; support will follow up if contact information is available.</Alert><Button component={Link} to="/signin" variant="contained">Return to sign in</Button></Stack> : <form onSubmit={submit}><Stack gap={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField select label="Request type" value={form.type} onChange={change('type')} required>{requestTypes.map(([value, label]) => <MenuItem value={value} key={value}>{label}</MenuItem>)}</TextField>
        <TextField type="email" label="Email address" value={form.email} onChange={change('email')} required inputProps={{ maxLength: 254 }}/>
        <TextField label="Account user ID (optional)" value={form.userId} onChange={change('userId')} inputProps={{ maxLength: 24 }}/>
        {form.type === 'report' && <><TextField label="Report category" value={form.category} onChange={change('category')} inputProps={{ maxLength: 80 }}/><TextField label="Reported user ID (optional)" value={form.reportedUser} onChange={change('reportedUser')} inputProps={{ maxLength: 24 }}/><TextField label="Reported post ID (optional)" value={form.reportedPost} onChange={change('reportedPost')} inputProps={{ maxLength: 24 }}/><Typography variant="caption" color="text.secondary">Do not include private message or chat content in a report.</Typography></>}
        <TextField label="Subject" value={form.subject} onChange={change('subject')} required inputProps={{ minLength: 3, maxLength: 160 }}/>
        <TextField label="Message" value={form.message} onChange={change('message')} required multiline minRows={5} inputProps={{ minLength: 10, maxLength: 5000 }}/>
        <EvidencePhotoPicker files={evidenceFiles} onChange={setEvidenceFiles} disabled={busy}/>
        <TextField label="Website" value={form.website} onChange={change('website')} autoComplete="off" tabIndex={-1} sx={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} inputProps={{ 'aria-hidden': true }}/>
        <Typography variant="caption" color="text.secondary">Submissions are rate-limited. Deleted accounts cannot be restored through this form.</Typography>
        <Stack direction="row" justifyContent="flex-end" gap={1}><Button component={Link} to="/signin">Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</Button></Stack>
      </Stack></form>}
    </Paper>
  </Box>;
}
