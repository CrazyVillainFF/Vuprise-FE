import React, { useEffect, useState, useRef } from 'react';
import {
  Card,
  Avatar,
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  Slider
} from '@mui/material';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import TagOutlinedIcon from '@mui/icons-material/TagOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../services/api';
import { uploadVideoDirectly } from '../services/cloudinaryVideoUpload';
import { usePublishing } from '../context/PublishingContext';

const POPULAR_TAGS = ['#engineering', '#productdesign', '#ai', '#leadership', '#techtrends'];

const CreatePostCard = ({ onPostCreated, showTrigger = true, open, onOpenChange }) => {
  const { user } = useAuth();
  const { startPublishing, updatePublishing, completePublishing, failPublishing } = usePublishing();
  const [internalOpen, setInternalOpen] = useState(false);
  const openModal = open ?? internalOpen;
  const setOpenModal = onOpenChange ?? setInternalOpen;
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publishStage, setPublishStage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const uploadControllerRef = useRef(null);
  const videoIdempotencyKeyRef = useRef('');
  const submittingRef = useRef(false);
  const retryPublishRef = useRef(null);

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
  }, [imagePreview, videoPreview]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Choose an image or video file.');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    if (file.size > (isVideo ? 250 : 10) * 1024 * 1024) {
      setError(isVideo ? 'Video size exceeds 250MB.' : 'Image size exceeds 10MB.');
      return;
    }

    setError(null);
    setPublishStage('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setImageFile(null); setImagePreview(null); setVideoFile(null);
    if (isVideo) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url); setVideoFile(file);
      videoIdempotencyKeyRef.current = crypto.randomUUID();
      setVideoDuration(0); setTrimStart(0); setTrimEnd(0);
    } else {
      setVideoPreview('');
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setVideoFile(null);
    videoIdempotencyKeyRef.current = '';
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(''); setVideoDuration(0); setTrimStart(0); setTrimEnd(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddTag = (tag) => {
    if (!content.includes(tag)) {
      setContent((prev) => (prev ? `${prev} ${tag}` : tag));
    }
  };

  const handlePublish = async () => {
    if (submittingRef.current) return;
    if (!content.trim() && !imageFile && !videoFile) {
      setError('Please add some text or media to share.');
      return;
    }
    if (videoFile && (!videoDuration || trimEnd <= trimStart || trimEnd - trimStart > 35.0001)) {
      setError('Select a valid video clip that is 35 seconds or shorter.'); return;
    }

    const selectedPreview = videoPreview || imagePreview || '';
    const retryPublish = () => retryPublishRef.current?.();
    retryPublishRef.current = handlePublish;
    startPublishing({
      stage: 'preparing',
      title: videoFile ? 'Preparing trimmed video' : imageFile ? 'Preparing image post' : 'Saving text post',
      previewUrl: selectedPreview,
      isVideo: Boolean(videoFile),
      message: 'Checking your caption and selected media.',
    });
    // Publishing continues in the shared status pill, so dismiss the composer as
    // soon as the user starts. Keep the draft mounted in state for safe recovery.
    setOpenModal(false);
    try {
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      uploadControllerRef.current = new AbortController();

      if (videoFile) {
        setPublishStage('Requesting secure upload…');
        const request = {
          mimeType: videoFile.type,
          fileSize: videoFile.size,
          trimStart,
          trimEnd,
          idempotencyKey: videoIdempotencyKeyRef.current || crypto.randomUUID(),
        };
        videoIdempotencyKeyRef.current = request.idempotencyKey;
        const authorizationResponse = await postAPI.signVideoUpload(request, { signal: uploadControllerRef.current.signal });
        const authorization = authorizationResponse.data;
        if (authorization.alreadyPublished && authorization.post) {
          onPostCreated?.(authorization.post);
          completePublishing();
          setContent(''); handleRemoveImage(); setOpenModal(false);
          return;
        }
        setPublishStage('Uploading directly to secure video storage…');
        updatePublishing({ stage: 'uploading', progress: 0, message: 'Uploading video directly to Cloudinary. Your file does not pass through the API server.' });
        try {
          await uploadVideoDirectly({
            file: videoFile,
            authorization,
            signal: uploadControllerRef.current.signal,
            onProgress: (progress) => {
              setUploadProgress(progress);
              updatePublishing({ progress, stage: 'uploading', message: `Secure video upload: ${progress}% complete.` });
            },
          });
        } catch (uploadError) {
          // If a prior attempt finished uploading but its response was lost, let the server
          // verify the already-stored asset. The server never trusts this client-side hint.
          const providerMessage = uploadError.response?.data?.error?.message || '';
          if (uploadError.response?.status !== 409 && !/already exists|already taken/i.test(providerMessage)) throw uploadError;
        }
        setPublishStage('Verifying the video and publishing your post…');
        updatePublishing({ stage: 'publishing', progress: null, message: 'Cloudinary metadata is being verified and the post is being saved.' });
        const result = await postAPI.completeVideoUpload({
          uploadId: authorization.uploadId,
          content: content.trim(),
        }, { signal: uploadControllerRef.current.signal, timeout: 60000 });
        if (result.data.success && result.data.post) {
          onPostCreated?.(result.data.post);
          completePublishing();
          setContent(''); handleRemoveImage(); setUploadProgress(0); setPublishStage(''); setOpenModal(false);
        } else throw new Error(result.data.message || 'The server did not confirm that your post was published.');
        return;
      }

      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      if (imageFile) formData.append('image', imageFile);

      if (imageFile) updatePublishing({ stage: 'uploading', progress: 0, message: 'Uploading image and post details.' });
      else updatePublishing({ stage: 'publishing', progress: null, message: 'Saving your post.' });
      const res = await postAPI.createPost(formData, {
        signal: uploadControllerRef.current.signal,
        timeout: 120000,
        onUploadProgress: (event) => {
          if (!imageFile) return;
          const progress = Math.min(100, Math.round((event.loaded * 100) / (event.total || event.loaded)));
          setUploadProgress(progress);
          updatePublishing(progress >= 100
            ? { stage: 'publishing', progress: null, message: 'Image received. Waiting for the server to save your post.' }
            : { stage: 'uploading', progress, message: `Image upload: ${progress}% complete.` });
        },
      });
      if (res.data.success && res.data.post) {
        onPostCreated?.(res.data.post);
        completePublishing();
        setContent('');
        handleRemoveImage();
        setUploadProgress(0);
        setPublishStage('');
        setOpenModal(false);
      } else throw new Error(res.data.message || 'The server did not confirm that your post was published.');
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;
      setError(err.code === 'ERR_CANCELED' || err.name === 'AbortError'
        ? 'Upload canceled. Your selected video is still here; press Publish to retry.'
        : status === 413 ? 'This video is too large. Choose a video under 250MB.'
          : status === 415 ? 'This video format is not supported. Choose MP4, WebM, or MOV.'
            : status === 401 ? 'Your session expired. Sign in again before publishing.'
              : status === 429 ? 'Too many upload attempts. Wait a minute, then retry.'
                : status >= 500 || !status ? 'A network or storage issue interrupted publishing. Your video is still selected; retry safely.'
                  : (message || 'Failed to publish post. Please try again.'));
      // If publishing fails, bring the composer back with its selected content so
      // the user can understand the error and retry without rebuilding the draft.
      setOpenModal(true);
      failPublishing(err.response?.data?.message || err.message || 'Publishing failed. Your content is still available to retry.', retryPublish);
    } finally {
      uploadControllerRef.current = null;
      if (!videoFile) setUploadProgress(0);
      setPublishStage('');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      {showTrigger && <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={user?.profilePicture}
            alt={user?.name}
            sx={{ width: 44, height: 44 }}
          >
            {user?.name ? user.name[0] : 'U'}
          </Avatar>
          <Box
            onClick={() => setOpenModal(true)}
            sx={{
              flex: 1,
              py: 1.25,
              px: 2.5,
              borderRadius: 6,
              bgcolor: 'action.hover',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'action.selected',
                borderColor: 'primary.light',
              }
            }}
          >
            <Typography variant="body2" color="text.secondary">
              What breakthrough or insight are you working on, {user?.name?.split(' ')[0] || 'there'}?
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.75 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              startIcon={<ImageOutlinedIcon sx={{ color: '#0EA5E9' }} />}
              onClick={() => {
                setOpenModal(true);
                setTimeout(() => fileInputRef.current?.click(), 200);
              }}
              sx={{ color: 'text.secondary', fontWeight: 500 }}
            >
              Photo / Visual
            </Button>
            <Button
              size="small"
              startIcon={<TagOutlinedIcon sx={{ color: '#8B5CF6' }} />}
              onClick={() => setOpenModal(true)}
              sx={{ color: 'text.secondary', fontWeight: 500 }}
            >
              Topic Tag
            </Button>
          </Stack>

          <Button
            variant="contained"
            size="small"
            onClick={() => setOpenModal(true)}
            sx={{ px: 2.5 }}
          >
            Create Post
          </Button>
        </Stack>
      </Card>}

      {/* Expandable Composer Dialog */}
      <Dialog
        open={openModal}
        onClose={submitting ? undefined : () => setOpenModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            borderRadius: { xs: '20px 20px 0 0', sm: 3 },
            mx: { xs: 0, sm: 2 }, mb: { xs: 0, sm: 2 },
            width: { xs: '100%', sm: 'min(560px, calc(100% - 32px))' }, maxWidth: 'none',
            height: { xs: 'min(88dvh, 780px)', sm: 'auto' }, maxHeight: { xs: 'calc(100dvh - env(safe-area-inset-top, 0px))', sm: 'min(90dvh, 820px)' },
            p: { xs: 0, sm: .5 },
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: '0 24px 80px rgba(0,0,0,.32)',
          }
        }}
        sx={{
          '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } },
          '& .MuiBackdrop-root': { bgcolor: 'rgba(4, 10, 18, .66)', backdropFilter: 'blur(5px)' },
          '@media (prefers-reduced-motion: reduce)': { '& .MuiPaper-root': { transition: 'none' } },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: { xs: 1.25, sm: 1.5 }, px: { xs: 2, sm: 2.25 }, flexShrink: 0 }}>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={user?.profilePicture} alt={user?.name} sx={{ width: 38, height: 38, flexShrink: 0 }}>
              {user?.name ? user.name[0] : 'U'}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap>
                {user?.name || 'Your profile'}
              </Typography>
              <Stack direction="row" spacing={.45} alignItems="center" sx={{ color: 'text.secondary' }}><PublicRoundedIcon sx={{ fontSize: 13 }} /><Typography variant="caption">Public network</Typography></Stack>
            </Box>
          </Stack>
          <IconButton onClick={() => setOpenModal(false)} disabled={submitting} size="small" aria-label="Close post composer" sx={{ width: 36, height: 36 }}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ my: { xs: 0, sm: .5 }, px: { xs: 2, sm: 2.25 }, py: 1.5, flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <TextField
            autoFocus
            multiline
            minRows={2}
            maxRows={6}
            fullWidth
            placeholder="Share an achievement, architectural perspective, or industry question..."
            value={content}
            inputProps={{ maxLength: 5000, 'aria-label': 'Post caption' }}
            onChange={(e) => setContent(e.target.value)}
            variant="standard"
            slotProps={{ input: {
              disableUnderline: true,
              sx: { fontSize: '1.05rem', lineHeight: 1.6 }
            }}}
          />

          {/* Hidden media input. Previews use object URLs instead of reading video bytes into JS memory. */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            style={{ display: 'none' }}
          />

          {/* Image Preview */}
          {imagePreview && (
            <Box sx={{ position: 'relative', mt: 1.75, borderRadius: 2.5, overflow: 'hidden', bgcolor: 'rgba(0,0,0,.16)', display: 'grid', placeItems: 'center', maxHeight: 300 }}>
              <Box
                component="img"
                src={imagePreview}
                alt="Post upload preview"
                sx={{
                  width: '100%',
                  maxHeight: 300,
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
              <IconButton
                onClick={handleRemoveImage}
                disabled={submitting}
                aria-label="Remove selected image"
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  bgcolor: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.9)' }
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {videoPreview && (
            <Box sx={{ position: 'relative', mt: 1.75, borderRadius: 2.5, overflow: 'hidden', bgcolor: '#05070b', border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Box component="video" src={videoPreview} controls playsInline preload="metadata" onPlay={(event) => { if (event.currentTarget.currentTime < trimStart || event.currentTarget.currentTime >= trimEnd) event.currentTarget.currentTime = trimStart; }} onLoadedMetadata={(event) => {
                const duration = event.currentTarget.duration;
                if (!Number.isFinite(duration) || duration <= 0) { setError('This video’s duration could not be verified.'); return; }
                setVideoDuration(duration); setTrimEnd(Math.min(duration, 35));
              }} onTimeUpdate={(event) => { const video = event.currentTarget; if (video.currentTime < trimStart) video.currentTime = trimStart; if (video.currentTime >= trimEnd && trimEnd > trimStart) { video.pause(); video.currentTime = trimStart; } }} sx={{ width: '100%', maxHeight: 280, display: 'block' }} />
              {videoDuration > 0 && <Box sx={{ px: { xs: 2, sm: 2.25 }, pt: 1, pb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Trim clip · selected {(trimEnd - trimStart).toFixed(2)}s / 35s max</Typography>
                <Slider min={0} max={videoDuration} step={0.05} disableSwap value={[trimStart, trimEnd]} onChange={(_, value) => {
                  const [start, end] = value;
                  if (end - start <= 35) { setTrimStart(start); setTrimEnd(end); }
                  else if (start !== trimStart) setTrimStart(Math.max(0, end - 35));
                  else setTrimEnd(Math.min(videoDuration, start + 35));
                }} valueLabelDisplay="auto" valueLabelFormat={(value) => `${Number(value).toFixed(1)}s`} aria-label="Video trim range" sx={{ mt: .5, '& .MuiSlider-thumb': { width: 24, height: 24 } }} />
              </Box>}
              <IconButton onClick={handleRemoveImage} disabled={submitting} aria-label="Remove selected video" sx={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, bgcolor: 'rgba(0,0,0,.68)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,.88)' } }}><CloseRoundedIcon fontSize="small" /></IconButton>
            </Box>
          )}

          {/* Suggested Topic Tags */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 1 }}>
              Suggested Tags:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ width: '100%', minWidth: 0, overflow: 'visible', '& .MuiChip-root': { minHeight: 34, maxWidth: '100%' } }}>
              {POPULAR_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  clickable
                  onClick={() => handleAddTag(tag)}
                  sx={{
                    bgcolor: content.includes(tag) ? 'primary.main' : 'action.hover',
                    color: content.includes(tag) ? '#fff' : 'text.primary',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                />
              ))}
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: { xs: 2, sm: 2.25 }, pt: 1.25, pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)', justifyContent: 'space-between', gap: 1, flexShrink: 0, borderTop: (theme) => `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={1}>
            <IconButton
              color="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
            >
              <ImageOutlinedIcon />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
              {content.length} / 5000
            </Typography>
            {submitting && uploadProgress < 100 && <Button color="inherit" onClick={() => uploadControllerRef.current?.abort()}>Cancel upload</Button>}
            <Button
              variant="contained"
              color="primary"
              onClick={handlePublish}
              disabled={submitting || (!content.trim() && !imageFile && !videoFile)}
              endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendRoundedIcon />}
              sx={{ px: 3 }}
            >
              {submitting ? (videoFile && uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Publishing...') : 'Publish'}
            </Button>
          </Stack>
        </DialogActions>
        {submitting && publishStage && <Typography variant="caption" color="text.secondary" sx={{ px: 2.5, pb: 1.5, textAlign: 'right' }}>{publishStage}</Typography>}
      </Dialog>
    </>
  );
};

export default CreatePostCard;
