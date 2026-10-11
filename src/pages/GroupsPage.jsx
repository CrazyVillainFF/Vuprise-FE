import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { connectionAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function GroupsPage() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]); const [invites, setInvites] = useState([]); const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(false); const [edit, setEdit] = useState(false); const [name, setName] = useState(''); const [about, setAbout] = useState(''); const [image, setImage] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const selected = useMemo(() => groups.find((group) => group._id === selectedId), [groups, selectedId]);
  const refresh = async (options = {}) => {
    if (options?.silent !== true) setLoading(true);
    setError('');
    try { const [g, c] = await Promise.all([groupAPI.list(), connectionAPI.getConnections()]); setGroups(g.data.groups || []); setInvites(g.data.invitations || []); setConnections(c.data.connections || []); }
    catch (e) { setError(e.message || 'Could not load your groups.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  const startCreate = () => { setName(''); setAbout(''); setImage(null); setEdit(false); setDialog(true); };
  const startEdit = () => { setName(selected?.name || ''); setAbout(selected?.about || ''); setImage(null); setEdit(true); setDialog(true); };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const data = new FormData(); data.append('name', name.trim()); data.append('about', about.trim()); if (image) data.append('image', image);
      const response = edit ? await groupAPI.update(selectedId, data) : await groupAPI.create(data);
      const group = response.data.group; setDialog(false); await refresh({ silent: true }); setSelectedId(group._id); setNotice(edit ? 'Group profile updated.' : 'Group created.');
    } catch (e) { setError(e.message || 'Could not save this group.'); }
    finally { setSaving(false); }
  };
  const respond = async (groupId, action) => { try { await groupAPI.respond(groupId, action); await refresh({ silent: true }); setNotice(action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.'); } catch (e) { setError(e.message); } };
  const invite = async (userId) => { try { await groupAPI.invite(selectedId, userId); await refresh({ silent: true }); setNotice('Invitation sent.'); } catch (e) { setError(e.message); } };
  const setRole = async (userId, role) => { try { await groupAPI.setRole(selectedId, userId, role); await refresh({ silent: true }); } catch (e) { setError(e.message); } };
  const performConfirmedAction = async () => {
    if (!confirmAction) return;
    setSaving(true); setError('');
    try {
      if (confirmAction.kind === 'delete-group') {
        await groupAPI.delete(selectedId); setSelectedId(''); await refresh({ silent: true }); setNotice('Group deleted.');
      } else {
        await groupAPI.remove(selectedId, confirmAction.userId); await refresh({ silent: true });
        if (String(confirmAction.userId) === String(currentUser?._id)) setSelectedId('');
        setNotice(String(confirmAction.userId) === String(currentUser?._id) ? 'You left the group.' : 'Member removed.');
      }
      setConfirmAction(null);
    } catch (e) { setError(e.message || 'This group action could not be completed.'); }
    finally { setSaving(false); }
  };
  const myRole = selected?.members?.find((member) => String(member.user?._id || member.user) === String(currentUser?._id))?.role;

  return <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: 3 }}>
    <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={1.5} mb={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}><GroupsOutlinedIcon color="primary" /><Box sx={{ minWidth: 0 }}><Typography variant="h4" fontWeight={800}>Groups</Typography><Typography color="text.secondary" variant="body2">Build a community with your accepted connections.</Typography></Box></Stack>
      <Button variant="contained" size="medium" onClick={startCreate} sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' }, minWidth: 132 }}>Create group</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}{notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
    {invites.length > 0 && <Card sx={{ mb: 2.5 }}><CardContent><Typography variant="h6" fontWeight={700} mb={1}>Invitations</Typography><Stack spacing={1}>{invites.map((group) => <Stack key={group._id} direction="row" alignItems="center" spacing={1.5}><Avatar src={group.photo}>{group.name?.[0]}</Avatar><Typography sx={{ flex: 1 }}>{group.name}</Typography><Button onClick={() => respond(group._id, 'decline')}>Decline</Button><Button variant="contained" onClick={() => respond(group._id, 'accept')}>Accept</Button></Stack>)}</Stack></CardContent></Card>}
    {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .75fr) minmax(0, 1.6fr)' }, gap: 2 }}>
      <Stack spacing={1}>{groups.length === 0 ? <Card><CardContent><Typography color="text.secondary">You haven’t joined any groups yet.</Typography></CardContent></Card> : groups.map((group) => <Card key={group._id} role="button" tabIndex={0} aria-pressed={selectedId === group._id} variant={selectedId === group._id ? 'elevation' : 'outlined'} onClick={() => setSelectedId(group._id)} onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setSelectedId(group._id); } }} sx={{ width: '100%', textAlign: 'left', color: 'text.primary', cursor: 'pointer', borderColor: selectedId === group._id ? 'primary.main' : undefined, '&:hover': { borderColor: 'primary.main' }, '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } }}><CardContent sx={{ py: '12px !important' }}><Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}><Avatar src={group.photo} variant="rounded">{group.name?.[0]}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={700} noWrap>{group.name}</Typography><Typography variant="caption" color="text.secondary">{group.members?.length || 0} members</Typography></Box>{group.lastMessage && <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 104, display: { xs: 'none', sm: 'block' } }}>{group.lastMessage.text}</Typography>}<IconButton size="small" aria-label={`Open ${group.name} chat`} onClick={(event) => { event.stopPropagation(); navigate(`/groups/${group._id}/messages`); }}><ForumOutlinedIcon fontSize="small" /></IconButton></Stack></CardContent></Card>)}</Stack>
      {selected ? <Card><CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}><Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}><Avatar src={selected.photo} variant="rounded" sx={{ width: 52, height: 52, flexShrink: 0 }}>{selected.name?.[0]}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography variant="h5" fontWeight={800} sx={{ overflowWrap: 'anywhere' }}>{selected.name}</Typography><Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{selected.about || 'No group description yet.'}</Typography></Box></Stack><Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ flexShrink: 0 }}><Button variant="contained" startIcon={<ForumOutlinedIcon />} onClick={() => navigate(`/groups/${selectedId}/messages`)}>Message</Button>{['owner', 'admin'].includes(myRole) && <Button onClick={startEdit}>Edit</Button>}{myRole === 'owner' && <IconButton aria-label="Delete group" color="error" onClick={() => setConfirmAction({ kind: 'delete-group' })}><DeleteOutlineRoundedIcon /></IconButton>}</Stack></Stack>
        <Divider sx={{ my: 2 }} /><Typography variant="h6" fontWeight={700} mb={1}>Members</Typography>
        <Stack spacing={1}>{selected.members?.map((member) => { const person = member.user; const id = person?._id || person; const isOwner = String(id) === String(selected.owner); const self = String(id) === String(currentUser?._id); return <Stack key={id} direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, py: 0.5 }}><Avatar src={person?.profilePicture} sx={{ width: 38, height: 38, flexShrink: 0 }}>{person?.name?.[0] || '?'}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={600} noWrap>{person?.name || 'Member'}</Typography><Typography variant="caption" color="text.secondary">{isOwner ? 'Owner' : member.role === 'admin' ? 'Administrator' : 'Member'}</Typography></Box>{!isOwner && <>{myRole === 'owner' && <Button size="small" onClick={() => setRole(id, member.role === 'admin' ? 'member' : 'admin')}>{member.role === 'admin' ? 'Remove admin' : 'Make admin'}</Button>}{(myRole === 'owner' || myRole === 'admin' || self) && <IconButton aria-label={self ? 'Leave group' : `Remove ${person?.name || 'member'} from group`} color="error" onClick={() => setConfirmAction({ kind: 'remove-member', userId: id, self, name: person?.name })}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton>}</>}</Stack>; })}</Stack>
        {['owner', 'admin'].includes(myRole) && <><Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={700}>Invite an accepted connection</Typography><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={1}>{connections.filter((person) => !selected.members?.some((member) => String(member.user?._id || member.user) === String(person._id))).map((person) => <Button key={person._id} size="small" variant="outlined" onClick={() => invite(person._id)}>{person.name} · Invite</Button>)}</Stack></>}
      </CardContent></Card> : <Card><CardContent sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">Choose a group to see its details and members.</Typography></CardContent></Card>}
    </Box>}
    <Dialog open={dialog} onClose={() => !saving && setDialog(false)} fullWidth maxWidth="sm"><Box component="form" onSubmit={save}><DialogTitle>{edit ? 'Edit group profile' : 'Create a group'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Group name" required value={name} onChange={(e) => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 80 } }} /><TextField label="About" multiline minRows={3} value={about} onChange={(e) => setAbout(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} /><Button component="label" startIcon={<AddPhotoAlternateOutlinedIcon />} variant="outlined">{image ? image.name : 'Choose group photo'}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImage(e.target.files?.[0] || null)} /></Button></Stack></DialogContent><DialogActions><Button onClick={() => setDialog(false)} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : edit ? 'Save changes' : 'Create group'}</Button></DialogActions></Box></Dialog>
    <Dialog open={Boolean(confirmAction)} onClose={() => !saving && setConfirmAction(null)} fullWidth maxWidth="xs" aria-labelledby="group-action-title"><DialogTitle id="group-action-title">{confirmAction?.kind === 'delete-group' ? 'Delete this group?' : confirmAction?.self ? 'Leave this group?' : 'Remove this member?'}</DialogTitle><DialogContent><Typography color="text.secondary">{confirmAction?.kind === 'delete-group' ? 'This permanently removes the group and its message history for all members.' : confirmAction?.self ? 'You will lose access to this group and its conversation.' : `Remove ${confirmAction?.name || 'this member'} from the group?`}</Typography></DialogContent><DialogActions><Button onClick={() => setConfirmAction(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={performConfirmedAction} disabled={saving}>{saving ? <CircularProgress size={19} color="inherit" /> : confirmAction?.kind === 'delete-group' ? 'Delete group' : confirmAction?.self ? 'Leave group' : 'Remove member'}</Button></DialogActions></Dialog>
  </Box>;
}
