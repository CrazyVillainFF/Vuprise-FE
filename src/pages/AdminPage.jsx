import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, MenuItem, Pagination, Paper, Stack, Tab, Tabs, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import BorderGlow from '../components/reactbits/BorderGlow';
import StatusMark from '../components/reactbits/StatusMark';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { adminAPI } from '../services/api';

const sections = ['Users', 'Requests', 'Reports', 'Help'];
const statusLabels = { active: 'Active', temporary_ban: 'Temporary ban', permanent_ban: 'Permanent ban', deletion_pending: 'Deletion in progress', deleted: 'Deleted' };

function Stat({ label, value }) {
  return <BorderGlow glowColor="195 80 70" glowRadius={14} glowIntensity={0.6} borderRadius={12}><Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, minWidth: 0, minHeight: { xs: 76, sm: 88 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', lineHeight: 1.25 }}>{label}</Typography><Typography variant="h5" fontWeight={800}>{value ?? '—'}</Typography></Paper></BorderGlow>;
}

const adminDialogSx = {
  '& .MuiDialog-container': { py: 'max(12px, env(safe-area-inset-top))', pb: 'max(12px, env(safe-area-inset-bottom))' },
  '& .MuiDialog-paper': {
    boxSizing: 'border-box',
    maxHeight: 'calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
    minWidth: 0,
    '@media (max-width: 599px)': { width: 'calc(100vw - 24px)', maxWidth: 'calc(100vw - 24px)', m: 0 },
  },
};

export default function AdminPage() {
  const [section, setSection] = useState(0);
  const [overview, setOverview] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [minimumBanDate] = useState(() => new Date(Date.now() + 60000).toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [inboxStatus, setInboxStatus] = useState('pending');
  const [warningError, setWarningError] = useState('');

  const loadOverview = useCallback(async () => {
    try { setOverview((await adminAPI.overview()).data.overview); } catch (e) { setError(e.message); }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (section === 0) {
        const response = await adminAPI.users({ page, limit: 20, search, status: status || undefined });
        setRows(response.data.users); setPages(Math.max(1, response.data.pagination.pages));
      } else {
        const type = ['requests', 'reports', 'help'][section - 1];
        const response = await adminAPI.inbox(type, { page, limit: 20, status: inboxStatus || undefined });
        setRows(response.data.requests); setPages(Math.max(1, response.data.pagination.pages));
      }
    } catch (e) { setError(e.message || 'Could not load this section.'); }
    finally { setLoading(false); }
  }, [section, page, search, status, inboxStatus]);

  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { const timer = window.setTimeout(loadRows, section === 0 ? 250 : 0); return () => window.clearTimeout(timer); }, [loadRows, section]);

  const openAction = (user, name) => { setSelected(user); setAction(name); setReason(''); setExpiresAt(''); setWarningError(''); };
  const executeAction = async () => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      if (action === 'temporary_ban') await adminAPI.temporaryBan(selected._id, { expiresAt: new Date(expiresAt).toISOString(), reason });
      if (action === 'permanent_ban') await adminAPI.permanentBan(selected._id, { reason });
      if (action === 'lift_ban') await adminAPI.liftBan(selected._id, { reason });
      if (action === 'warning') await adminAPI.warning(selected._id, reason);
      if (action === 'delete') await adminAPI.deleteUser(selected._id);
      setNotice(action === 'warning' ? 'Warning issued successfully.' : action === 'delete' ? 'Account deletion completed.' : 'Moderation action completed.');
      setAction(''); setSelected(null); await loadRows(); await loadOverview();
    } catch (e) { const message = e.message || 'Action failed.'; await loadRows(); if (action === 'warning') setWarningError(message); else setError(message); }
    finally { setSaving(false); }
  };

  const openDetail = async (user) => {
    setSelected({ ...user, detailLoading: true });
    try {
      const [detail, posts] = await Promise.all([adminAPI.user(user._id), adminAPI.userPosts(user._id, { page: 1, limit: 8 })]);
      setSelected({ ...user, ...detail.data, posts: posts.data.posts, detailLoading: false });
    } catch (e) { setError(e.message); setSelected(null); }
  };

  const openInbox = (item) => setSelected({ ...item, isInbox: true });
  const updateInbox = async (payload) => {
    setSaving(true); setError('');
    try { const response = await adminAPI.updateInbox(selected._id, payload); setNotice(response.data.reply ? (response.data.reply.sent ? 'Ticket saved and reply email accepted by Brevo.' : response.data.reply.reason) : 'Inbox item updated.'); setSelected(null); await loadRows(); await loadOverview(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const renderUserActions = (user) => <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" sx={{ gap: { xs: 0.25, sm: 0.5 }, minWidth: 0 }}><Button size="small" onClick={() => openDetail(user)}>View</Button>{user.moderationStatus === 'active' && <><Button size="small" onClick={() => openAction(user, 'temporary_ban')}>Temp ban</Button><Button size="small" onClick={() => openAction(user, 'permanent_ban')}>Ban</Button><Button size="small" onClick={() => openAction(user, 'warning')}>Warn</Button></>}{['temporary_ban','permanent_ban'].includes(user.moderationStatus) && <Button size="small" onClick={() => openAction(user, 'lift_ban')}>Lift ban</Button>}{user.moderationStatus !== 'deleted' && <Button size="small" color="error" onClick={() => openAction(user, 'delete')}>Delete</Button>}</Stack>;

  return <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 1.25, sm: 1.5, md: 3 }, py: { xs: 1.5, md: 4 }, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mb: 2.5 }}>
      <Box sx={{ minWidth: 0 }}><Stack direction="row" gap={1} alignItems="center"><AdminPanelSettingsRoundedIcon color="primary"/><Typography variant="h4" fontSize={{ xs: '1.6rem', sm: '2.125rem' }} fontWeight={850}>Admin console</Typography></Stack><Typography color="text.secondary">User safety and support operations · private conversations are never shown here.</Typography></Box>
      <Chip label="Administrator access" color="primary" variant="outlined"/>
    </Stack>
    {overview && <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))', '@media (max-width:350px)': { gridTemplateColumns: 'minmax(0, 1fr)' } }, gap: { xs: 0.75, sm: 1.25 }, mb: 2.5, minWidth: 0 }}>
      <Stat label="Registered users" value={overview.totalUsers}/><Stat label="Active bans" value={overview.activeBans}/><Stat label="Pending requests" value={overview.pendingRequests}/><Stat label="Unresolved reports" value={overview.unresolvedReports}/><Stat label="Open help tickets" value={overview.openHelp}/>
    </Box>}
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
    <Paper variant="outlined" sx={{ overflow: 'hidden', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      <Tabs value={section} onChange={(_event, value) => { setSection(value); setPage(1); setRows([]); }} variant="scrollable" allowScrollButtonsMobile>
        {sections.map((label) => <Tab key={label} label={label} />)}
      </Tabs>
      <Divider/>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} sx={{ p: 2 }}>
        {section === 0 ? <>
          <TextField size="small" placeholder="Search name, email, or user ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} InputProps={{ startAdornment: <SearchRoundedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }}/> }} sx={{ flex: 1 }}/>
          <TextField select size="small" label="Account status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}><MenuItem value="">All accounts</MenuItem><MenuItem value="active">Active</MenuItem><MenuItem value="temporary_ban">Temporary ban</MenuItem><MenuItem value="permanent_ban">Permanent ban</MenuItem><MenuItem value="deletion_pending">Deletion in progress</MenuItem><MenuItem value="deleted">Deleted</MenuItem></TextField>
        </> : <><Typography variant="h6" fontWeight={750} sx={{ flex: 1 }}>{sections[section]}</Typography><TextField select size="small" label="Status" value={inboxStatus} onChange={(e) => { setInboxStatus(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}><MenuItem value="">All statuses</MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="under_review">Under review</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="rejected">Rejected</MenuItem></TextField></>}
      </Stack>
      {loading ? <Box sx={{ py: 9, textAlign: 'center', color: 'primary.main' }}><StatusMark status="running" label={`Loading ${sections[section].toLowerCase()}…`} size={22}/></Box> : rows.length === 0 ? <Box sx={{ py: 8, textAlign: 'center' }}><Typography variant="h6" fontWeight={750}>Nothing to review</Typography><Typography color="text.secondary">New items will appear here when submitted.</Typography></Box> : section === 0 ? <>
        <Box sx={{ display: { xs: 'block', md: 'none' }, px: 1.25, pb: 1.25 }}><Stack spacing={1}>{rows.map((user) => <Paper key={user._id} variant="outlined" sx={{ p: 1.25, minWidth: 0, overflowWrap: 'anywhere' }}><Stack direction="row" gap={1} alignItems="center"><Avatar src={user.profilePicture}>{user.name?.[0]}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={750}>{user.name}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography></Box><Chip size="small" color={user.moderationStatus === 'active' ? 'success' : user.moderationStatus === 'deleted' ? 'default' : 'error'} label={statusLabels[user.moderationStatus] || 'Active'} sx={{ maxWidth: '45%' }}/></Stack><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>ID · {user._id}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Joined {new Date(user.createdAt).toLocaleDateString()}</Typography><Divider sx={{ my: 0.75 }}/>{renderUserActions(user)}</Paper>)}</Stack></Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '100%', overflowX: 'auto', overscrollBehaviorX: 'contain' }}><Table size="small" sx={{ minWidth: 780 }}><TableHead><TableRow><TableCell>User</TableCell><TableCell>User ID</TableCell><TableCell>Status</TableCell><TableCell>Joined</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{rows.map((user) => <TableRow key={user._id} hover><TableCell><Stack direction="row" alignItems="center" gap={1.25}><Avatar src={user.profilePicture}>{user.name?.[0]}</Avatar><Box sx={{ minWidth: 0 }}><Typography fontWeight={750}>{user.name}</Typography><Typography variant="body2" color="text.secondary">{user.email}</Typography></Box></Stack></TableCell><TableCell><Typography variant="caption">{user._id}</Typography></TableCell><TableCell><Chip size="small" color={user.moderationStatus === 'active' ? 'success' : user.moderationStatus === 'deleted' ? 'default' : 'error'} label={statusLabels[user.moderationStatus] || 'Active'}/>{user.moderationExpiresAt && <Typography display="block" variant="caption">until {new Date(user.moderationExpiresAt).toLocaleString()}</Typography>}</TableCell><TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell><TableCell align="right">{renderUserActions(user)}</TableCell></TableRow>)}</TableBody></Table></Box>
      </> : <Box sx={{ px: { xs: 1.25, sm: 2 }, minWidth: 0, maxWidth: '100%' }}><Stack divider={<Divider/>}>{rows.map((item) => <Stack key={item._id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5} sx={{ py: 1.5, minWidth: 0 }}><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" gap={1} alignItems="center"><Chip size="small" label={item.status.replace('_', ' ')}/><Typography fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{item.subject}</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{item.email} · {item.type.replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleString()}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{item.message}</Typography></Box><Button variant="outlined" onClick={() => openInbox(item)}>Review</Button></Stack>)}</Stack></Box>}
      {!loading && pages > 1 && <Stack alignItems="center" sx={{ p: 2 }}><Pagination page={page} count={pages} onChange={(_e, value) => setPage(value)} color="primary"/></Stack>}
    </Paper>

    <Dialog open={Boolean(action)} onClose={() => !saving && setAction('')} fullWidth maxWidth="sm" sx={adminDialogSx}>
      <DialogTitle>{({ temporary_ban: 'Temporarily ban user', permanent_ban: 'Permanently ban user', lift_ban: 'Lift account ban', warning: 'Issue warning', delete: 'Permanently delete user' })[action]}</DialogTitle>
      <DialogContent sx={{ overflowY: 'auto', minWidth: 0 }}><Typography color="text.secondary" sx={{ mb: 2, overflowWrap: 'anywhere' }}>{selected?.name} · {selected?.email}</Typography>{action === 'warning' && warningError && <Alert severity="error" sx={{ mb: 2 }}>{warningError}</Alert>}
        {action === 'delete' && <Alert severity="error" sx={{ mb: 2 }}>This removes the account profile, authored posts and comments, account media cleanup is best-effort, and invalidates sessions. Messages are not exposed in this console; authored message records are removed as part of account cleanup. This cannot be undone.</Alert>}
        {action === 'temporary_ban' && <TextField type="datetime-local" label="Ban expires" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} fullWidth required sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} inputProps={{ min: minimumBanDate }}/>}
        {['temporary_ban','permanent_ban','warning','lift_ban'].includes(action) && <TextField label={action === 'warning' ? 'Warning reason' : 'Reason (optional)'} value={reason} onChange={(e) => { setReason(e.target.value.slice(0, 1000)); if (action === 'warning') setWarningError(''); }} fullWidth multiline minRows={3} inputProps={{ maxLength: 1000, 'aria-label': action === 'warning' ? 'Warning reason' : 'Reason (optional)' }} />}
        {action === 'permanent_ban' && <Alert severity="warning" sx={{ mt: 2 }}>The account stays restricted until an administrator explicitly lifts the ban.</Alert>}
      </DialogContent><DialogActions><Button onClick={() => setAction('')} disabled={saving}>Cancel</Button><Button variant="contained" color={action === 'delete' || action === 'permanent_ban' ? 'error' : 'primary'} onClick={executeAction} disabled={saving || (action === 'temporary_ban' && (!expiresAt || new Date(expiresAt) <= new Date())) || (action === 'warning' && reason.trim().length < 3)}>{saving ? 'Working…' : action === 'delete' ? 'Permanently delete' : 'Confirm'}</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(selected?.isInbox)} onClose={() => setSelected(null)} fullWidth maxWidth="md" sx={adminDialogSx}>
      <DialogTitle>{selected?.subject}</DialogTitle><DialogContent dividers>
        {selected && <Stack gap={2}><Typography variant="body2" color="text.secondary">{selected.email} · {selected.type?.replaceAll('_', ' ')} · {new Date(selected.createdAt).toLocaleString()}</Typography>{selected.user?.moderationStatus && <Alert severity={selected.user.moderationStatus === 'active' ? 'info' : 'warning'}>Linked account: {selected.user.name} · {statusLabels[selected.user.moderationStatus] || selected.user.moderationStatus}{selected.user.moderationExpiresAt ? ` until ${new Date(selected.user.moderationExpiresAt).toLocaleString()}` : ''}{selected.user.moderationReason ? ` · ${selected.user.moderationReason}` : ''}</Alert>}<Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-wrap' }}>{selected.message}</Paper>{selected.reportedUser && <Typography>Reported account: {selected.reportedUser.name} ({selected.reportedUser._id})</Typography>}{selected.reportedPost && <Typography>Reported post: {selected.reportedPost._id} · {selected.reportedPost.content}</Typography>}{selected.evidenceUrls?.map((url) => <Button key={url} component="a" href={url} target="_blank" rel="noreferrer" variant="outlined">Open submitted evidence</Button>)}{selected.resolution && <Alert severity="info"><b>Previous reply:</b> {selected.resolution} · {selected.replySentAt ? 'email accepted by Brevo' : 'email not yet accepted'} {selected.resolutionOutcome && `· ${selected.resolutionOutcome.replaceAll('_', ' ')}`}</Alert>}<Typography fontWeight={750}>Internal notes</Typography>{selected.adminNotes?.map((note) => <Paper key={note._id} variant="outlined" sx={{ p: 1.25 }}><Typography variant="body2">{note.text}</Typography><Typography variant="caption" color="text.secondary">{note.admin?.name || 'Admin'} · {new Date(note.createdAt).toLocaleString()}</Typography></Paper>)}<TextField select label="Status" defaultValue={selected.status} id="admin-inbox-status"><MenuItem value="pending">Pending</MenuItem><MenuItem value="under_review">Under review</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="rejected">Rejected</MenuItem></TextField><TextField select label="Priority" defaultValue={selected.priority} id="admin-inbox-priority"><MenuItem value="low">Low</MenuItem><MenuItem value="normal">Normal</MenuItem><MenuItem value="high">High</MenuItem><MenuItem value="urgent">Urgent</MenuItem></TextField><TextField label="Internal note (optional)" id="admin-inbox-note" multiline minRows={2}/><TextField label="Reply to requester (optional; emailed through Brevo)" id="admin-inbox-resolution" multiline minRows={2}/>{selected.type?.endsWith('_appeal') && <TextField select label="Approved appeal outcome (required when approved)" id="admin-inbox-outcome" defaultValue={selected.resolutionOutcome || ''}><MenuItem value="">Select outcome</MenuItem><MenuItem value="lift_temporary_ban">Lift temporary ban</MenuItem><MenuItem value="lift_permanent_ban">Lift permanent ban</MenuItem><MenuItem value="reply_only">Reply only / no account change</MenuItem></TextField>}</Stack>}
      </DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button><Button variant="contained" disabled={saving} onClick={() => updateInbox({ status: document.getElementById('admin-inbox-status')?.value, priority: document.getElementById('admin-inbox-priority')?.value, note: document.getElementById('admin-inbox-note')?.value || undefined, resolution: document.getElementById('admin-inbox-resolution')?.value, outcome: document.getElementById('admin-inbox-outcome')?.value || undefined })}>Save review</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(selected && !selected.isInbox && action === '')} onClose={() => setSelected(null)} fullWidth maxWidth="md" sx={adminDialogSx}>
      <DialogTitle>User profile review</DialogTitle><DialogContent dividers>{selected?.detailLoading ? <Box sx={{ color: 'primary.main' }}><StatusMark status="running" label="Loading profile…"/></Box> : selected && <Stack gap={2}><Stack direction="row" gap={1.5} alignItems="center"><Avatar src={selected.user?.profilePicture} sx={{ width: 60, height: 60}}/ ><Box><Typography variant="h6" fontWeight={800}>{selected.user?.name}</Typography><Typography color="text.secondary">{selected.user?.email} · {selected.user?._id}</Typography></Box></Stack><Typography>{selected.user?.headline} · {selected.user?.company}</Typography><Typography>{selected.user?.bio}</Typography><Typography variant="body2">Settings: private {String(selected.profileSettings?.privateAccount)} · hidden activity {String(selected.profileSettings?.hideActivity)} · posts {selected.postCount}</Typography><Typography fontWeight={750}>Warnings</Typography>{selected.warnings?.length ? selected.warnings.map((w) => <Typography key={w._id} variant="body2">{new Date(w.createdAt).toLocaleString()} · {w.reason} {w.acknowledgedAt ? '(acknowledged)' : '(pending)'}</Typography>) : <Typography color="text.secondary">No warnings.</Typography>}<Typography fontWeight={750}>Recent posts</Typography>{selected.posts?.length ? selected.posts.map((post) => <Paper variant="outlined" key={post._id} sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">{new Date(post.createdAt).toLocaleString()} · {post.mediaType}</Typography><Typography>{post.content}</Typography>{post.mediaType === 'video' && post.videoUrl ? <video src={post.videoUrl} controls style={{ maxWidth: '100%', maxHeight: 240 }}/> : post.image && <img src={post.image} alt="User post" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }}/>}</Paper>) : <Typography color="text.secondary">No posts.</Typography>}</Stack>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button></DialogActions>
    </Dialog>
  </Box>;
}
