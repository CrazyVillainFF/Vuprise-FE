import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Stack
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

const ImageUploadModal = ({
  open,
  onClose,
  onUpload,
  title = 'Upload Image',
  aspectRatio = '1/1', // '1/1' for avatar, '3/1' for cover banner
  helperText = 'Supports JPG, PNG, WEBP up to 10MB'
}) => {
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size cannot exceed 10MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setError(null);
      await onUpload(selectedFile);
      handleReset();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={uploading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3.5, p: 1 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
        <IconButton onClick={onClose} disabled={uploading} size="small">
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ my: 1 }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/jpg,image/gif"
          style={{ display: 'none' }}
        />

        {!preview ? (
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 5,
              border: (theme) => `2px dashed ${theme.palette.divider}`,
              borderRadius: 3,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: 'action.hover',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.selected',
              },
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                p: 2,
                borderRadius: '50%',
                bgcolor: 'background.paper',
                color: 'primary.main',
                mb: 1.5,
                boxShadow: 1
              }}
            >
              <CloudUploadOutlinedIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Click to browse or drag and drop image
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ position: 'relative', textAlign: 'center' }}>
            <Box
              component="img"
              src={preview}
              alt="Preview"
              sx={{
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                borderRadius: 2.5,
                border: (theme) => `1px solid ${theme.palette.divider}`,
              }}
            />
            <IconButton
              onClick={handleReset}
              disabled={uploading}
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                bgcolor: 'rgba(0,0,0,0.65)',
                color: 'error.light',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.9)', color: 'error.main' },
              }}
            >
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Box>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1.5, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={uploading} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirmUpload}
          disabled={!selectedFile || uploading}
          variant="contained"
          color="primary"
          startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {uploading ? 'Uploading...' : 'Save & Update'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageUploadModal;
