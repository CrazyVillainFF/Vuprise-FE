import { useId, useState } from 'react';
import { Alert, Button, IconButton, Stack, Typography } from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

const MAX_PHOTOS = 5;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function EvidencePhotoPicker({ files, onChange, disabled = false }) {
  const inputId = useId();
  const [error, setError] = useState('');

  const addFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length + selected.length > MAX_PHOTOS) {
      setError(`Attach up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const invalid = selected.find((file) => !ACCEPTED_TYPES.includes(file.type) || file.size > MAX_FILE_BYTES);
    if (invalid) {
      setError(invalid.size > MAX_FILE_BYTES ? 'Each photo must be 5 MB or smaller.' : 'Use a JPG, PNG, WEBP, or GIF photo.');
      return;
    }
    setError('');
    onChange([...files, ...selected]);
  };

  return <Stack spacing={0.75}>
    <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden disabled={disabled} onChange={addFiles}/>
    <Button component="label" htmlFor={inputId} startIcon={<AddPhotoAlternateOutlinedIcon/>} disabled={disabled || files.length >= MAX_PHOTOS} sx={{ alignSelf: 'flex-start' }}>
      Attach photos ({files.length}/{MAX_PHOTOS})
    </Button>
    <Typography variant="caption" color="text.secondary">JPG, PNG, WEBP, or GIF · up to 5 MB each</Typography>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    {files.map((file, index) => <Stack key={`${file.name}-${file.lastModified}`} direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }}>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</Typography>
      <IconButton size="small" color="error" aria-label={`Remove ${file.name}`} disabled={disabled} onClick={() => { setError(''); onChange(files.filter((_item, fileIndex) => fileIndex !== index)); }}>
        <DeleteOutlineRoundedIcon fontSize="small"/>
      </IconButton>
    </Stack>)}
  </Stack>;
}
