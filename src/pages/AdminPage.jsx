import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Avatar, Box, Button, ButtonBase, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, MenuItem, Pagination, Paper, Stack, Tab, Tabs, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography
} from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import StatusMark from '../components/reactbits/StatusMark';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import VerifiedAccountBadge from '../components/VerifiedAccountBadge';
import { adminAPI } from '../services/api';

const sections = ['Users', 'Requests', 'Reports', 'Help', 'Messages'];
const statusLabels = { active: 'Active', temporary_ban: 'Temporary ban', permanent_ban: 'Permanent ban', deletion_pending: 'Deletion in progress', deleted: 'Deleted' };

function Stat({ label, value }) {
  return <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, minWidth: 0, minHeight: { xs: 76, sm: 88 }, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderColor: 'divider', bgcolor: 'background.paper' }}><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere', lineHeight: 1.25 }}>{label}</Typography><Typography variant="h5" fontWeight={800} aria-label={`${label}: ${value ?? 'not available'}`}>{value ?? '—'}</Typography></Paper>;
}

function BroadcastHistory({ messages, onOpenRecipient }) {
  return <Box sx={{ px: { xs: 1.25, sm: 2 }, minWidth: 0, maxWidth: '100%' }}>
    <Stack divider={<Divider/>}>
      {messages.map((item) => {
        const recipients = item.recipients || (item.recipient ? [item.recipient] : []);
        const visibleRecipients = recipients.length ? recipients : Array.from({ length: Math.min(Number(item.recipientCount) || 1, 1) }, () => null);
        return visibleRecipients.map((recipient, index) => <ButtonBase
          key={`${item._id}-${recipient?._id || index}`}
          onClick={() => onOpenRecipient({ ...item, selectedRecipient: recipient })}
          sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', textAlign: 'left', gap: 1.5, py: 1.25, px: 1, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' } }}
          aria-label={`Open official message sent to ${recipient?.name || 'recipient'}`}
        >
          <Avatar src={recipient?.profilePicture} sx={{ width: 40, height: 40, flexShrink: 0, bgcolor: 'common.black', color: 'common.white' }}>{recipient?.name?.[0] || 'V'}</Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={0.5}>
              <Typography fontWeight={750} noWrap>{recipient?.name || 'Recipient unavailable'}</Typography>
              <Typography variant="caption" color="text.secondary">{new Date(item.createdAt).toLocaleString()}</Typography>
            </Stack>
            {recipients.length > 1 && <Typography variant="caption" color="text.secondary">Official Vuprise message</Typography>}
          </Box>
        </ButtonBase>);
      })}
    </Stack>
  </Box>;
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
  const [reviewDraft, setReviewDraft] = useState({ status: 'pending', priority: 'normal', note: '', resolution: '', outcome: '' });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectAllUsers, setSelectAllUsers] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState('');
  const [verificationTarget, setVerificationTarget] = useState(null);
  const [verificationColor, setVerificationColor] = useState('blue');
  const [verificationError, setVerificationError] = useState('');
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [editingBroadcast, setEditingBroadcast] = useState(false);
  const [broadcastEditDraft, setBroadcastEditDraft] = useState('');

  const loadOverview = useCallback(async () => {
    try { setOverview((await adminAPI.overview()).data.overview); } catch (e) { setError(e.message); }
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (section === 0) {
        const response = await adminAPI.users({ page, limit: 20, search, status: status || undefined });
        setRows(response.data.users); setPages(Math.max(1, response.data.pagination.pages));
      } else if (section === 4) {
        const response = await adminAPI.broadcastMessages({ page, limit: 20 });
        setRows(response.data.messages); setPages(Math.max(1, response.data.pagination.pages));
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

  const openVerification = (user) => {
    setVerificationTarget(user);
    setVerificationColor(user.verificationBadgeColor || 'blue');
    setVerificationError('');
  };

  const saveVerification = async (isVerifiedAccount) => {
    if (!verificationTarget) return;
    setSaving(true); setError(''); setVerificationError('');
    try {
      const response = await adminAPI.setVerification(verificationTarget._id, isVerifiedAccount, verificationColor);
      const savedColor = response.data.verificationBadgeColor;
      if (isVerifiedAccount && savedColor !== verificationColor) {
        throw new Error('The active backend did not confirm the selected badge color. Deploy/restart the latest Vuprise backend, then save the badge again.');
      }
      setRows((current) => current.map((user) => String(user._id) === String(verificationTarget._id)
        ? { ...user, isVerifiedAccount, verificationBadgeColor: savedColor }
        : user));
      setNotice(response.data.message || (isVerifiedAccount ? 'Verified badge updated.' : 'Verified badge removed.'));
      setVerificationTarget(null);
      await loadRows();
    } catch (e) {
      const routeMissing = e.response?.status === 404 && /verification/i.test(e.response?.config?.url || '');
      const message = routeMissing
        ? 'The active backend does not include badge updates yet. Deploy/restart the latest Vuprise backend, then try again.'
        : e.message || 'Could not update the verified badge.';
      setVerificationError(message);
      setError(message);
    }
    finally { setSaving(false); }
  };

  const toggleUserSelection = (userId) => setSelectedUserIds((current) => current.includes(userId)
    ? current.filter((id) => id !== userId)
    : [...current, userId]);
  const allVisibleSelected = selectAllUsers || (rows.length > 0 && rows.every((user) => selectedUserIds.includes(String(user._id))));
  const toggleVisibleSelection = () => setSelectedUserIds((current) => {
    const visibleIds = rows.map((user) => String(user._id));
    return allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])];
  });
  const sendBroadcast = async () => {
    if (!broadcastDraft.trim()) return;
    setSaving(true); setError('');
    try {
      const response = await adminAPI.broadcastMessage({
        text: broadcastDraft.trim(),
        selectAll: selectAllUsers,
        recipientIds: selectAllUsers ? [] : selectedUserIds,
      });
      setNotice(response.data.message || 'Official message sent.');
      setBroadcastOpen(false); setBroadcastDraft(''); setSelectedUserIds([]); setSelectAllUsers(false);
      if (section === 4) await loadRows();
    } catch (e) { setError(e.message || 'Could not send the official message.'); }
    finally { setSaving(false); }
  };

  const openDetail = async (user) => {
    setSelected({ ...user, detailLoading: true });
    try {
      const [detail, posts] = await Promise.all([adminAPI.user(user._id), adminAPI.userPosts(user._id, { page: 1, limit: 8 })]);
      setSelected({ ...user, ...detail.data, posts: posts.data.posts, detailLoading: false });
    } catch (e) { setError(e.message); setSelected(null); }
  };

  const removeWarning = async (warning) => {
    if (!selected?.user?._id || !window.confirm(`Remove this warning?\n\n${warning.reason}`)) return;
    setSaving(true); setError('');
    try {
      const response = await adminAPI.removeWarning(selected.user._id, warning._id);
      setSelected((current) => current ? { ...current, warnings: current.warnings.filter((item) => String(item._id) !== String(warning._id)) } : current);
      setNotice(response.data.message || 'Warning removed.');
    } catch (e) { setError(e.message || 'Could not remove the warning.'); }
    finally { setSaving(false); }
  };

  const openBroadcastMessage = (message) => {
    setSelectedBroadcast(message);
    setBroadcastEditDraft(message.text || '');
    setEditingBroadcast(false);
  };

  const saveBroadcastEdit = async () => {
    if (!selectedBroadcast || !broadcastEditDraft.trim()) return;
    setSaving(true); setError('');
    try {
      const response = await adminAPI.updateBroadcastMessage(selectedBroadcast._id, broadcastEditDraft.trim());
      const text = response.data.text || broadcastEditDraft.trim();
      setRows((current) => current.map((item) => String(item._id) === String(selectedBroadcast._id) ? { ...item, text } : item));
      setSelectedBroadcast((current) => current ? { ...current, text } : current);
      setEditingBroadcast(false);
      setNotice(response.data.message || 'Official message updated.');
    } catch (e) { setError(e.message || 'Could not edit the official message.'); }
    finally { setSaving(false); }
  };

  const openInbox = (item) => {
    setSelected({ ...item, isInbox: true });
    setReviewDraft({ status: item.status || 'pending', priority: item.priority || 'normal', note: '', resolution: '', outcome: item.resolutionOutcome || '' });
  };
  const updateInbox = async (payload) => {
    setSaving(true); setError('');
    try { const response = await adminAPI.updateInbox(selected._id, payload); setNotice(response.data.reply ? (response.data.reply.sent ? 'Ticket saved and reply email accepted by Brevo.' : response.data.reply.reason) : 'Inbox item updated.'); setSelected(null); await loadRows(); await loadOverview(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const renderUserActions = (user) => <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" sx={{ gap: { xs: 0.25, sm: 0.5 }, minWidth: 0 }}><Button size="small" onClick={() => openDetail(user)}>View</Button>{user.moderationStatus !== 'deleted' && <Button size="small" disabled={saving} startIcon={<VerifiedAccountBadge color={user.verificationBadgeColor} size={16}/>} onClick={() => openVerification(user)}>{user.isVerifiedAccount ? 'Badge' : 'Verify'}</Button>}{user.moderationStatus === 'active' && <><Button size="small" onClick={() => openAction(user, 'temporary_ban')}>Temp ban</Button><Button size="small" onClick={() => openAction(user, 'permanent_ban')}>Ban</Button><Button size="small" onClick={() => openAction(user, 'warning')}>Warn</Button></>}{['temporary_ban','permanent_ban'].includes(user.moderationStatus) && <Button size="small" onClick={() => openAction(user, 'lift_ban')}>Lift ban</Button>}{user.moderationStatus !== 'deleted' && <Button size="small" color="error" onClick={() => openAction(user, 'delete')}>Delete</Button>}</Stack>;

  return <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 1.25, sm: 1.5, md: 3 }, py: { xs: 1.5, md: 4 }, width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1.5} sx={{ mb: 2.5 }}>
      <Box sx={{ minWidth: 0 }}><Stack direction="row" gap={1} alignItems="center"><AdminPanelSettingsRoundedIcon color="primary"/><Typography variant="h4" fontSize={{ xs: '1.6rem', sm: '2.125rem' }} fontWeight={850}>Admin console</Typography></Stack><Typography color="text.secondary">User safety and support operations · private chats stay private; official messages are listed separately.</Typography></Box>
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
        </> : section === 4 ? <><Typography variant="h6" fontWeight={750} sx={{ flex: 1 }}>Sent official messages</Typography><Button onClick={loadRows} disabled={loading}>Refresh</Button></> : <><Typography variant="h6" fontWeight={750} sx={{ flex: 1 }}>{sections[section]}</Typography><TextField select size="small" label="Status" value={inboxStatus} onChange={(e) => { setInboxStatus(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}><MenuItem value="">All statuses</MenuItem><MenuItem value="pending">Pending</MenuItem><MenuItem value="under_review">Under review</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="rejected">Rejected</MenuItem><MenuItem value="resolved">Resolved</MenuItem></TextField></>}
      </Stack>
      {section === 0 && <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1} sx={{ px: 2, pb: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={{ sm: 1.5 }}>
          <FormControlLabel control={<Checkbox checked={selectAllUsers} onChange={(event) => { setSelectAllUsers(event.target.checked); if (event.target.checked) setSelectedUserIds([]); }}/>} label="Select all registered users" />
          <Typography variant="body2" color="text.secondary">{selectAllUsers ? 'All eligible accounts except your admin account' : `${selectedUserIds.length} selected across pages`}</Typography>
        </Stack>
        <Button variant="contained" startIcon={<ChatBubbleOutlineRoundedIcon/>} disabled={!selectAllUsers && selectedUserIds.length === 0} onClick={() => setBroadcastOpen(true)}>Message users</Button>
      </Stack>}
      {loading ? <Box sx={{ py: 9, textAlign: 'center', color: 'primary.main' }}><StatusMark status="running" label={`Loading ${sections[section].toLowerCase()}…`} size={22}/></Box> : rows.length === 0 ? <Box sx={{ py: 8, textAlign: 'center' }}><Typography variant="h6" fontWeight={750}>{section === 4 ? 'No official messages sent yet' : 'Nothing to review'}</Typography><Typography color="text.secondary">{section === 4 ? 'Messages sent from the Users tab will appear here.' : 'New items will appear here when submitted.'}</Typography></Box> : section === 0 ? <>
        <Box sx={{ display: { xs: 'block', md: 'none' }, px: 1.25, pb: 1.25 }}><Stack spacing={1}>{rows.map((user) => <Paper key={user._id} variant="outlined" sx={{ p: 1.25, minWidth: 0, overflowWrap: 'anywhere' }}><Stack direction="row" gap={1} alignItems="center"><Checkbox size="small" checked={selectAllUsers || selectedUserIds.includes(String(user._id))} disabled={selectAllUsers} onChange={() => toggleUserSelection(String(user._id))} inputProps={{ 'aria-label': `Select ${user.name}` }}/><Avatar src={user.profilePicture}>{user.name?.[0]}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={750}>{user.name}{user.isVerifiedAccount && <VerifiedAccountBadge color={user.verificationBadgeColor} size={16} sx={{ ml: 0.5 }}/>}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{user.email}</Typography></Box><Chip size="small" color={user.moderationStatus === 'active' ? 'success' : user.moderationStatus === 'deleted' ? 'default' : 'error'} label={statusLabels[user.moderationStatus] || 'Active'} sx={{ maxWidth: '45%' }}/></Stack><Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>ID · {user._id}</Typography><Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Joined {new Date(user.createdAt).toLocaleDateString()}</Typography><Divider sx={{ my: 0.75 }}/>{renderUserActions(user)}</Paper>)}</Stack></Box>
        <Box sx={{ display: { xs: 'none', md: 'block' }, maxWidth: '100%', overflowX: 'auto', overscrollBehaviorX: 'contain' }}><Table size="small" sx={{ minWidth: 820 }}><TableHead><TableRow><TableCell padding="checkbox"><Checkbox size="small" checked={allVisibleSelected} indeterminate={!selectAllUsers && selectedUserIds.some((id) => rows.some((user) => String(user._id) === id)) && !allVisibleSelected} disabled={selectAllUsers} onChange={toggleVisibleSelection} inputProps={{ 'aria-label': 'Select current page of users' }}/></TableCell><TableCell>User</TableCell><TableCell>User ID</TableCell><TableCell>Status</TableCell><TableCell>Joined</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{rows.map((user) => <TableRow key={user._id} hover><TableCell padding="checkbox"><Checkbox size="small" checked={selectAllUsers || selectedUserIds.includes(String(user._id))} disabled={selectAllUsers} onChange={() => toggleUserSelection(String(user._id))} inputProps={{ 'aria-label': `Select ${user.name}` }}/></TableCell><TableCell><Stack direction="row" alignItems="center" gap={1.25}><Avatar src={user.profilePicture}>{user.name?.[0]}</Avatar><Box sx={{ minWidth: 0 }}><Typography fontWeight={750}>{user.name}{user.isVerifiedAccount && <VerifiedAccountBadge color={user.verificationBadgeColor} size={16} sx={{ ml: 0.5 }}/>}</Typography><Typography variant="body2" color="text.secondary">{user.email}</Typography></Box></Stack></TableCell><TableCell><Typography variant="caption">{user._id}</Typography></TableCell><TableCell><Chip size="small" color={user.moderationStatus === 'active' ? 'success' : user.moderationStatus === 'deleted' ? 'default' : 'error'} label={statusLabels[user.moderationStatus] || 'Active'}/>{user.moderationExpiresAt && <Typography display="block" variant="caption">until {new Date(user.moderationExpiresAt).toLocaleString()}</Typography>}</TableCell><TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell><TableCell align="right">{renderUserActions(user)}</TableCell></TableRow>)}</TableBody></Table></Box>
      </> : section === 4 ? <BroadcastHistory messages={rows} onOpenRecipient={openBroadcastMessage}/> : <Box sx={{ px: { xs: 1.25, sm: 2 }, minWidth: 0, maxWidth: '100%' }}><Stack divider={<Divider/>}>{rows.map((item) => <Stack key={item._id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1.5} sx={{ py: 1.5, minWidth: 0 }}><Box sx={{ flex: 1, minWidth: 0 }}><Stack direction="row" gap={1} alignItems="center"><Chip size="small" label={item.status.replace('_', ' ')}/><Typography fontWeight={750} sx={{ overflowWrap: 'anywhere' }}>{item.subject}</Typography></Stack><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{item.email} · {item.type.replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleString()}</Typography><Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{item.message}</Typography></Box><Button variant="outlined" onClick={() => openInbox(item)}>Review</Button></Stack>)}</Stack></Box>}
      {!loading && pages > 1 && <Stack alignItems="center" sx={{ p: 2 }}><Pagination page={page} count={pages} onChange={(_e, value) => setPage(value)} color="primary"/></Stack>}
    </Paper>

    <Dialog open={broadcastOpen} onClose={() => !saving && setBroadcastOpen(false)} fullWidth maxWidth="sm" sx={adminDialogSx}>
      <DialogTitle>Send an official Vuprise message</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          <Alert severity="info">Recipients receive separate private messages from <b>Vuprise</b> with its verified badge. Replies are not enabled for official messages.</Alert>
          <Typography variant="body2" color="text.secondary">Sending to {selectAllUsers ? 'all eligible accounts except your admin account' : `${selectedUserIds.length} selected account${selectedUserIds.length === 1 ? '' : 's'}`}.</Typography>
          <TextField label="Message" value={broadcastDraft} onChange={(event) => setBroadcastDraft(event.target.value.slice(0, 5000))} multiline minRows={4} inputProps={{ maxLength: 5000 }} required autoFocus />
          <Typography variant="caption" color="text.secondary" align="right">{broadcastDraft.length}/5000</Typography>
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={() => setBroadcastOpen(false)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={sendBroadcast} disabled={saving || !broadcastDraft.trim()}>{saving ? 'Sending…' : 'Send official message'}</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(selectedBroadcast)} onClose={() => setSelectedBroadcast(null)} fullWidth maxWidth="sm" sx={adminDialogSx}>
      <DialogTitle>{editingBroadcast ? 'Edit official message' : `Official message · ${selectedBroadcast?.selectedRecipient?.name || 'Recipient'}`}</DialogTitle>
      <DialogContent dividers>
        {selectedBroadcast && <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary">Sent {new Date(selectedBroadcast.createdAt).toLocaleString()}</Typography>
          {editingBroadcast
            ? <TextField label="Message" value={broadcastEditDraft} onChange={(event) => setBroadcastEditDraft(event.target.value.slice(0, 5000))} multiline minRows={4} inputProps={{ maxLength: 5000 }} helperText={`${broadcastEditDraft.length}/5000`}/>
            : <Paper variant="outlined" sx={{ p: 1.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{selectedBroadcast.text || 'Official message'}</Paper>}
        </Stack>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => editingBroadcast ? setEditingBroadcast(false) : setSelectedBroadcast(null)} disabled={saving}>{editingBroadcast ? 'Cancel' : 'Close'}</Button>
        {editingBroadcast
          ? <Button variant="contained" onClick={saveBroadcastEdit} disabled={saving || !broadcastEditDraft.trim()}>{saving ? 'Saving…' : 'Save changes'}</Button>
          : <Button variant="contained" onClick={() => { setBroadcastEditDraft(selectedBroadcast?.text || ''); setEditingBroadcast(true); }}>Edit message</Button>}
      </DialogActions>
    </Dialog>

    <Dialog open={Boolean(verificationTarget)} onClose={() => !saving && setVerificationTarget(null)} fullWidth maxWidth="xs" sx={adminDialogSx}>
      <DialogTitle>{verificationTarget?.isVerifiedAccount ? 'Manage verified badge' : 'Verify this account'}</DialogTitle>
      <DialogContent dividers>
        <Stack gap={2}>
          {verificationError && <Alert severity="error">{verificationError}</Alert>}
          <Typography color="text.secondary">{verificationTarget?.name} · {verificationTarget?.email}</Typography>
          <TextField select label="Badge color" value={verificationColor} onChange={(event) => setVerificationColor(event.target.value)}>
            <MenuItem value="black"><Stack direction="row" alignItems="center" gap={1}><VerifiedAccountBadge color="black"/>Black · Verified</Stack></MenuItem>
            <MenuItem value="blue"><Stack direction="row" alignItems="center" gap={1}><VerifiedAccountBadge color="blue"/>Blue · Vuprise Partner</Stack></MenuItem>
            <MenuItem value="gold"><Stack direction="row" alignItems="center" gap={1}><VerifiedAccountBadge color="gold"/>Gold · VIP</Stack></MenuItem>
          </TextField>
          <Stack direction="row" alignItems="center" gap={1} sx={{ px: 1.25, py: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <VerifiedAccountBadge color={verificationColor} size={22}/>
            <Typography variant="body2" fontWeight={700}>Selected: {verificationColor === 'gold' ? 'Gold · VIP' : verificationColor === 'black' ? 'Black · Verified' : 'Blue · Vuprise Partner'}</Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setVerificationTarget(null)} disabled={saving}>Cancel</Button>
        {verificationTarget?.isVerifiedAccount && <Button color="error" onClick={() => saveVerification(false)} disabled={saving}>Unverify</Button>}
        <Button variant="contained" onClick={() => saveVerification(true)} disabled={saving}>{saving ? 'Saving…' : verificationTarget?.isVerifiedAccount ? `Save ${verificationColor} badge` : `Verify as ${verificationColor}`}</Button>
      </DialogActions>
    </Dialog>

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
      <DialogTitle>{selected?.subject}</DialogTitle><DialogContent dividers sx={{ '& .MuiFormControl-root + .MuiFormControl-root': { mt: 2 } }}>
        {selected && <Stack gap={2}><Typography variant="body2" color="text.secondary">{selected.email} · {selected.type?.replaceAll('_', ' ')} · {new Date(selected.createdAt).toLocaleString()}</Typography>{selected.user?.moderationStatus && <Alert severity={selected.user.moderationStatus === 'active' ? 'info' : 'warning'}>Linked account: {selected.user.name} · {statusLabels[selected.user.moderationStatus] || selected.user.moderationStatus}{selected.user.moderationExpiresAt ? ` until ${new Date(selected.user.moderationExpiresAt).toLocaleString()}` : ''}{selected.user.moderationReason ? ` · ${selected.user.moderationReason}` : ''}</Alert>}<Paper variant="outlined" sx={{ p: 2, whiteSpace: 'pre-wrap' }}>{selected.message}</Paper>{selected.reportedUser && <Typography>Reported account: {selected.reportedUser.name} ({selected.reportedUser._id})</Typography>}{selected.reportedPost && <Typography>Reported post: {selected.reportedPost._id} · {selected.reportedPost.content}</Typography>}{selected.evidenceUrls?.map((url) => <Button key={url} component="a" href={url} target="_blank" rel="noreferrer" variant="outlined">Open submitted evidence</Button>)}{selected.resolution && <Alert severity="info"><b>Previous reply:</b> {selected.resolution} · {selected.replySentAt ? 'email accepted by Brevo' : 'email not yet accepted'} {selected.resolutionOutcome && `· ${selected.resolutionOutcome.replaceAll('_', ' ')}`}</Alert>}{selected.type === 'report' && selected.status === 'pending' && <Alert severity="info">Saving while Pending closes this report and removes it from Unresolved reports. Choose Under review to keep it open.</Alert>}<Typography fontWeight={750}>Internal notes</Typography>{selected.adminNotes?.map((note) => <Paper key={note._id} variant="outlined" sx={{ p: 1.25 }}><Typography variant="body2">{note.text}</Typography><Typography variant="caption" color="text.secondary">{note.admin?.name || 'Admin'} · {new Date(note.createdAt).toLocaleString()}</Typography></Paper>)}<TextField select label="Status" value={reviewDraft.status} onChange={(event) => setReviewDraft((draft) => ({ ...draft, status: event.target.value }))}><MenuItem value="pending">Pending</MenuItem><MenuItem value="under_review">Under review</MenuItem><MenuItem value="approved">Approved</MenuItem><MenuItem value="rejected">Rejected</MenuItem><MenuItem value="resolved">Resolved</MenuItem></TextField><TextField select label="Priority" value={reviewDraft.priority} onChange={(event) => setReviewDraft((draft) => ({ ...draft, priority: event.target.value }))}><MenuItem value="low">Low</MenuItem><MenuItem value="normal">Normal</MenuItem><MenuItem value="high">High</MenuItem><MenuItem value="urgent">Urgent</MenuItem></TextField><TextField label="Internal note (optional)" value={reviewDraft.note} onChange={(event) => setReviewDraft((draft) => ({ ...draft, note: event.target.value }))} multiline minRows={2}/><TextField label="Reply to requester (optional; emailed through Brevo)" value={reviewDraft.resolution} onChange={(event) => setReviewDraft((draft) => ({ ...draft, resolution: event.target.value }))} multiline minRows={2}/>{selected.type?.endsWith('_appeal') && <TextField select label="Approved appeal outcome (required when approved)" value={reviewDraft.outcome} onChange={(event) => setReviewDraft((draft) => ({ ...draft, outcome: event.target.value }))}><MenuItem value="">Select outcome</MenuItem><MenuItem value="lift_temporary_ban">Lift temporary ban</MenuItem><MenuItem value="lift_permanent_ban">Lift permanent ban</MenuItem><MenuItem value="reply_only">Reply only / no account change</MenuItem></TextField>}</Stack>}
      </DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button><Button variant="contained" disabled={saving} onClick={() => {
        updateInbox({ status: reviewDraft.status, priority: reviewDraft.priority, note: reviewDraft.note || undefined, resolution: reviewDraft.resolution, outcome: reviewDraft.outcome || undefined });
      }}>Save review</Button></DialogActions>
    </Dialog>

    <Dialog open={Boolean(selected && !selected.isInbox && action === '')} onClose={() => setSelected(null)} fullWidth maxWidth="md" sx={adminDialogSx}>
      <DialogTitle>User profile review</DialogTitle><DialogContent dividers>{selected?.detailLoading ? <Box sx={{ color: 'primary.main' }}><StatusMark status="running" label="Loading profile…"/></Box> : selected && <Stack gap={2}><Stack direction="row" gap={1.5} alignItems="center"><Avatar src={selected.user?.profilePicture} sx={{ width: 60, height: 60}}/ ><Box><Typography variant="h6" fontWeight={800}>{selected.user?.name}</Typography><Typography color="text.secondary">{selected.user?.email} · {selected.user?._id}</Typography></Box></Stack><Typography>{selected.user?.headline} · {selected.user?.company}</Typography><Typography>{selected.user?.bio}</Typography><Typography variant="body2">Settings: private {String(selected.profileSettings?.privateAccount)} · hidden activity {String(selected.profileSettings?.hideActivity)} · posts {selected.postCount}</Typography><Typography fontWeight={750}>Warnings</Typography>{selected.warnings?.length ? selected.warnings.map((w) => <Stack key={w._id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}><Typography variant="body2" sx={{ flex: 1 }}>{new Date(w.createdAt).toLocaleString()} · {w.reason} {w.acknowledgedAt ? '(acknowledged)' : '(pending)'}</Typography><Button size="small" color="error" disabled={saving} onClick={() => removeWarning(w)}>Remove warning</Button></Stack>) : <Typography color="text.secondary">No warnings.</Typography>}<Typography fontWeight={750}>Recent posts</Typography>{selected.posts?.length ? selected.posts.map((post) => <Paper variant="outlined" key={post._id} sx={{ p: 1.5 }}><Typography variant="caption" color="text.secondary">{new Date(post.createdAt).toLocaleString()} · {post.mediaType}</Typography><Typography>{post.content}</Typography>{post.mediaType === 'video' && post.videoUrl ? <video src={post.videoUrl} controls style={{ maxWidth: '100%', maxHeight: 240 }}/> : post.image && <img src={post.image} alt="User post" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }}/>}</Paper>) : <Typography color="text.secondary">No posts.</Typography>}</Stack>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button></DialogActions>
    </Dialog>
  </Box>;
}
