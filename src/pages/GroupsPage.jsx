import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { connectionAPI, groupAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function GroupsPage() {
  const { user: currentUser } = useAuth();
  const [groups, setGroups] = useState([]); const [invites, setInvites] = useState([]); const [connections, setConnections] = useState([]);
  const [selectedId, setSelectedId] = useState(''); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState(false); const [edit, setEdit] = useState(false); const [name, setName] = useState(''); const [about, setAbout] = useState(''); const [image, setImage] = useState(null);
  const selected = useMemo(() => groups.find((group) => group._id === selectedId), [groups, selectedId]);
  const refresh = async () => {
    setLoading(true); setError('');
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
      const group = response.data.group; setDialog(false); await refresh(); setSelectedId(group._id); setNotice(edit ? 'Group profile updated.' : 'Group created.');
    } catch (e) { setError(e.message || 'Could not save this group.'); }
    finally { setSaving(false); }
  };
  const respond = async (groupId, action) => { try { await groupAPI.respond(groupId, action); await refresh(); setNotice(action === 'accept' ? 'Invitation accepted.' : 'Invitation declined.'); } catch (e) { setError(e.message); } };
  const invite = async (userId) => { try { await groupAPI.invite(selectedId, userId); await refresh(); setNotice('Invitation sent.'); } catch (e) { setError(e.message); } };
  const setRole = async (userId, role) => { try { await groupAPI.setRole(selectedId, userId, role); await refresh(); } catch (e) { setError(e.message); } };
  const remove = async (userId) => { try { await groupAPI.remove(selectedId, userId); await refresh(); if (userId === selected?.owner) setSelectedId(''); } catch (e) { setError(e.message); } };
  const myRole = selected?.members?.find((member) => String(member.user?._id || member.user) === String(currentUser?._id))?.role;

  return <Box sx={{ maxWidth: 1120, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: 3 }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2.5}>
      <Stack direction="row" alignItems="center" spacing={1.5}><GroupsOutlinedIcon color="primary" /><Box><Typography variant="h4" fontWeight={800}>Groups</Typography><Typography color="text.secondary">Build a community with your accepted connections.</Typography></Box></Stack>
      <Button variant="contained" onClick={startCreate}>Create group</Button>
    </Stack>
    {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}{notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
    {invites.length > 0 && <Card sx={{ mb: 2.5 }}><CardContent><Typography variant="h6" fontWeight={700} mb={1}>Invitations</Typography><Stack spacing={1}>{invites.map((group) => <Stack key={group._id} direction="row" alignItems="center" spacing={1.5}><Avatar src={group.photo}>{group.name?.[0]}</Avatar><Typography sx={{ flex: 1 }}>{group.name}</Typography><Button onClick={() => respond(group._id, 'decline')}>Decline</Button><Button variant="contained" onClick={() => respond(group._id, 'accept')}>Accept</Button></Stack>)}</Stack></CardContent></Card>}
    {loading ? <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box> : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, .75fr) minmax(0, 1.6fr)' }, gap: 2 }}>
      <Stack spacing={1}>{groups.length === 0 ? <Card><CardContent><Typography color="text.secondary">You haven’t joined any groups yet.</Typography></CardContent></Card> : groups.map((group) => <Card key={group._id} variant={selectedId === group._id ? 'elevation' : 'outlined'} onClick={() => setSelectedId(group._id)} sx={{ cursor: 'pointer', borderColor: selectedId === group._id ? 'primary.main' : undefined }}><CardContent><Stack direction="row" alignItems="center" spacing={1.5}><Avatar src={group.photo}>{group.name?.[0]}</Avatar><Box sx={{ minWidth: 0 }}><Typography fontWeight={700} noWrap>{group.name}</Typography><Typography variant="caption" color="text.secondary">{group.members?.length || 0} members</Typography></Box></Stack></CardContent></Card>)}</Stack>
      {selected ? <Card><CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center"><Avatar src={selected.photo} sx={{ width: 56, height: 56 }}>{selected.name?.[0]}</Avatar><Box sx={{ flex: 1 }}><Typography variant="h5" fontWeight={800}>{selected.name}</Typography><Typography color="text.secondary">{selected.about || 'No group description yet.'}</Typography></Box>{['owner', 'admin'].includes(myRole) && <Button onClick={startEdit}>Edit</Button>}</Stack>
        <Divider sx={{ my: 2 }} /><Typography variant="h6" fontWeight={700} mb={1}>Members</Typography>
        <Stack spacing={1}>{selected.members?.map((member) => { const person = member.user; const id = person?._id || person; const isOwner = String(id) === String(selected.owner); return <Stack key={id} direction="row" spacing={1.25} alignItems="center"><Avatar src={person?.profilePicture}>{person?.name?.[0] || '?'}</Avatar><Box sx={{ flex: 1 }}><Typography fontWeight={600}>{person?.name || 'Member'}</Typography><Typography variant="caption" color="text.secondary">{isOwner ? 'Owner' : member.role}</Typography></Box>{!isOwner && <>{myRole === 'owner' && <Button size="small" onClick={() => setRole(id, member.role === 'admin' ? 'member' : 'admin')}>{member.role === 'admin' ? 'Remove admin' : 'Make admin'}</Button>}{(myRole === 'owner' || myRole === 'admin' || String(id) === String(currentUser?._id)) && <IconButton aria-label="Remove member" onClick={() => remove(id)}>×</IconButton>}</>}</Stack>; })}</Stack>
        {['owner', 'admin'].includes(myRole) && <><Divider sx={{ my: 2 }} /><Typography variant="subtitle1" fontWeight={700}>Invite an accepted connection</Typography><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" mt={1}>{connections.filter((person) => !selected.members?.some((member) => String(member.user?._id || member.user) === String(person._id))).map((person) => <Button key={person._id} size="small" variant="outlined" onClick={() => invite(person._id)}>{person.name} · Invite</Button>)}</Stack></>}
      </CardContent></Card> : <Card><CardContent sx={{ py: 6, textAlign: 'center' }}><Typography color="text.secondary">Choose a group to see its details and members.</Typography></CardContent></Card>}
    </Box>}
    <Dialog open={dialog} onClose={() => !saving && setDialog(false)} fullWidth maxWidth="sm"><Box component="form" onSubmit={save}><DialogTitle>{edit ? 'Edit group profile' : 'Create a group'}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField label="Group name" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }} /><TextField label="About" multiline minRows={3} value={about} onChange={(e) => setAbout(e.target.value)} inputProps={{ maxLength: 1000 }} /><Button component="label" startIcon={<AddPhotoAlternateOutlinedIcon />} variant="outlined">{image ? image.name : 'Choose group photo'}<input hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setImage(e.target.files?.[0] || null)} /></Button></Stack></DialogContent><DialogActions><Button onClick={() => setDialog(false)} disabled={saving}>Cancel</Button><Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : edit ? 'Save changes' : 'Create group'}</Button></DialogActions></Box></Dialog>
  </Box>;
}
