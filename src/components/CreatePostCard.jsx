import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import MovieCreationRoundedIcon from '@mui/icons-material/MovieCreationRounded';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../services/api';
import { uploadVideoDirectly } from '../services/cloudinaryVideoUpload';
import { usePublishing } from '../context/PublishingContext';
import CreateReelEditor from './CreateReelEditor';
import { clampTrimEndToDuration, normalizeTrimRange, readFiniteVideoDuration, updateTrimEndForDuration } from '../utils/videoDuration';

const POPULAR_TAGS = ['#engineering', '#productdesign', '#ai', '#leadership', '#techtrends'];

const CreatePostCard = ({ onPostCreated, showTrigger = true, open, onOpenChange }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [trimStart, setTrimStartState] = useState(0);
  const [trimEnd, setTrimEndState] = useState(0);
  const [reelMode, setReelMode] = useState(false);
  const [reelCropMode, setReelCropMode] = useState('cover');
  const [reelCoverTime, setReelCoverTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [progressStage, setProgressStage] = useState('idle');
  const [publishedPost, setPublishedPost] = useState(null);
  const [publishStage, setPublishStage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const uploadControllerRef = useRef(null);
  const videoIdempotencyKeyRef = useRef('');
  const videoUploadSignatureRef = useRef('');
  const videoDurationRef = useRef(0);
  const trimStartRef = useRef(0);
  const trimEndRef = useRef(0);
  const submittingRef = useRef(false);
  const retryPublishRef = useRef(null);

  const setTrimStart = (value) => {
    const next = typeof value === 'function' ? value(trimStartRef.current) : value;
    trimStartRef.current = next;
    setTrimStartState(next);
  };
  const setTrimEnd = (value) => {
    const next = typeof value === 'function' ? value(trimEndRef.current) : value;
    trimEndRef.current = next;
    setTrimEndState(next);
  };
  const updateDurationMetadata = (duration, video) => {
    if (!duration) return;
    const previousDuration = videoDurationRef.current;
    const previousEnd = trimEndRef.current;
    const previousStart = trimStartRef.current;
    const nextStart = Math.min(previousStart, Math.max(0, duration - 0.05));
    const nextEnd = updateTrimEndForDuration(previousEnd, previousDuration, duration, nextStart);
    videoDurationRef.current = duration;
    trimStartRef.current = nextStart;
    trimEndRef.current = nextEnd;
    setVideoDuration(duration);
    setTrimStartState(nextStart);
    setTrimEndState(nextEnd);
    if (video) console.info('[reel-duration] browser-metadata', JSON.stringify({ durationSeconds: duration, previousDurationSeconds: previousDuration || null, previousTrimEndSeconds: previousEnd || null, trimEndSeconds: nextEnd, readyState: video.readyState, durationState: Number.isFinite(video.duration) ? 'finite' : String(video.duration) }));
  };

  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
  }, [imagePreview, videoPreview]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (reelMode && !file.type.startsWith('video/')) {
      setError('A Reel needs a video file. Choose MP4, WebM, or MOV.');
      e.target.value = '';
      return;
    }

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
    setProgressStage('idle'); setPublishedPost(null); setUploadedBytes(0); setUploadProgress(0);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setImageFile(null); setImagePreview(null); setVideoFile(null);
    if (isVideo) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url); setVideoFile(file);
      videoIdempotencyKeyRef.current = crypto.randomUUID();
      videoUploadSignatureRef.current = '';
      videoDurationRef.current = 0;
      trimStartRef.current = 0;
      trimEndRef.current = 0;
      setVideoDuration(0); setTrimStart(0); setTrimEnd(0);
      setReelCoverTime(0);
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
    videoUploadSignatureRef.current = '';
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(''); videoDurationRef.current = 0; trimStartRef.current = 0; trimEndRef.current = 0; setVideoDuration(0); setTrimStartState(0); setTrimEndState(0);
    setReelCoverTime(0);
    setUploadedBytes(0);
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
    const detectedDuration = reelMode ? videoDurationRef.current : videoDurationRef.current || videoDuration;
    const selectedTrimStart = trimStartRef.current;
    const selectedTrimEnd = reelMode ? trimEndRef.current : trimEndRef.current || trimEnd;
    let safeTrimEnd = clampTrimEndToDuration(selectedTrimEnd, detectedDuration);
    if (videoFile && reelMode && (!Number.isFinite(detectedDuration) || detectedDuration <= 0)) {
      setError('The video duration is still loading. Wait for the preview and trim timeline, then publish again. Your video and caption are still selected.');
      return;
    }
    if (videoFile && reelMode) {
      const normalizedRange = normalizeTrimRange(selectedTrimStart, selectedTrimEnd, detectedDuration);
      if (!normalizedRange) {
        setError('The selected trim range is outside the detected video duration. Adjust the trim handles and retry. Your video and caption are still selected.');
        return;
      }
      safeTrimEnd = normalizedRange.end;
      if (safeTrimEnd !== selectedTrimEnd) setTrimEnd(safeTrimEnd);
    }
    if (videoFile && (!detectedDuration || safeTrimEnd === null || safeTrimEnd <= selectedTrimStart || safeTrimEnd - selectedTrimStart > 35.0001)) {
      setError(safeTrimEnd === null
        ? 'The trim end is later than the latest detected video duration. Adjust the trim and retry.'
        : 'Select a valid video clip that is 35 seconds or shorter.');
      return;
    }

    const selectedPreview = videoPreview || imagePreview || '';
    setPublishedPost(null);
    setProgressStage('preparing');
    setUploadProgress(0);
    setUploadedBytes(0);
    const retryPublish = () => retryPublishRef.current?.();
    retryPublishRef.current = handlePublish;
    startPublishing({
      stage: 'preparing',
      title: videoFile ? 'Preparing trimmed video' : imageFile ? 'Preparing image post' : 'Saving text post',
      previewUrl: selectedPreview,
      isVideo: Boolean(videoFile),
      isReel: reelMode,
      bytesUploaded: 0,
      bytesTotal: videoFile?.size || 0,
      message: 'Checking your caption and selected media.',
    });
    // Publishing continues in the shared status pill, so dismiss the composer as
    // soon as the user starts. Keep the draft mounted in state for safe recovery.
    if (!reelMode) setOpenModal(false);
    try {
      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      uploadControllerRef.current = new AbortController();

      if (videoFile) {
        setPublishStage('Requesting secure upload…');
        const requestSignature = JSON.stringify([videoFile.name, videoFile.size, videoFile.lastModified, selectedTrimStart, safeTrimEnd, reelMode, reelCropMode, reelCoverTime]);
        if (!videoIdempotencyKeyRef.current || videoUploadSignatureRef.current !== requestSignature) {
          videoIdempotencyKeyRef.current = crypto.randomUUID();
          videoUploadSignatureRef.current = requestSignature;
        }
        const request = {
          mimeType: videoFile.type,
          fileSize: videoFile.size,
          trimStart: selectedTrimStart,
          trimEnd: safeTrimEnd,
          clientVideoDuration: detectedDuration,
          presentation: reelMode ? 'reel' : 'post',
          cropMode: reelMode ? reelCropMode : 'cover',
          coverTime: reelMode ? Math.min(Math.max(reelCoverTime, selectedTrimStart), safeTrimEnd) : selectedTrimStart,
          idempotencyKey: videoIdempotencyKeyRef.current,
        };
        console.info('[reel-duration] publish-request', JSON.stringify({ videoDurationSeconds: detectedDuration, trimStartSeconds: selectedTrimStart, trimEndSeconds: safeTrimEnd, fileBytes: videoFile.size, uploadIsFullSource: true }));
        videoIdempotencyKeyRef.current = request.idempotencyKey;
        const authorizationResponse = await postAPI.signVideoUpload(request, { signal: uploadControllerRef.current.signal });
        const authorization = authorizationResponse.data;
        if (authorization.alreadyPublished && authorization.post) {
          onPostCreated?.(authorization.post);
          if (!authorization.post._id || !authorization.post.videoUrl) throw new Error('Vuprise confirmed the upload but did not return a playable published video. Retry safely.');
          if (reelMode) {
            setPublishedPost(authorization.post);
            setProgressStage('published');
            completePublishing(authorization.post);
          } else {
            completePublishing(authorization.post);
            setContent(''); handleRemoveImage(); setOpenModal(false); setReelMode(false);
          }
          return;
        }
        setPublishStage('Uploading directly to secure video storage…');
        setProgressStage('uploading');
        updatePublishing({ stage: 'uploading', progress: 0, bytesUploaded: 0, bytesTotal: videoFile.size, message: 'Uploading video directly to Cloudinary. Your file does not pass through the API server.' });
        try {
          const uploadedAsset = await uploadVideoDirectly({
            file: videoFile,
            authorization,
            signal: uploadControllerRef.current.signal,
            onProgress: (progress, bytes = {}) => {
              setUploadProgress(progress);
              setUploadedBytes(bytes.loaded || 0);
              updatePublishing({ progress, stage: 'uploading', bytesUploaded: bytes.loaded || 0, bytesTotal: bytes.total || videoFile.size, message: `Secure video upload: ${progress}% complete.` });
            },
          });
          console.info('[reel-duration] cloudinary-upload-response', JSON.stringify({ browserDurationSeconds: detectedDuration, cloudinaryUploadDurationSeconds: Number(uploadedAsset?.duration), resourceType: uploadedAsset?.resource_type, publicIdMatches: uploadedAsset?.public_id === authorization.publicId }));
          if (uploadedAsset?.resource_type !== 'video' || !uploadedAsset?.secure_url || uploadedAsset.public_id !== authorization.publicId) {
            throw new Error('Cloud storage returned incomplete video details. Your upload is safe to retry; press Retry.');
          }
        } catch (uploadError) {
          // If a prior attempt finished uploading but its response was lost, let the server
          // verify the already-stored asset. The server never trusts this client-side hint.
          const providerMessage = uploadError.response?.data?.error?.message || '';
          if (uploadError.response?.status !== 409 && !/already exists|already taken/i.test(providerMessage)) throw uploadError;
        }
        setProgressStage('processing');
        updatePublishing({ stage: 'processing', progress: null, bytesUploaded: videoFile.size, bytesTotal: videoFile.size, message: 'Upload complete. Vuprise is verifying the stored video.' });
        setPublishStage('Verifying the video and publishing your post…');
        setProgressStage('publishing');
        updatePublishing({ stage: 'publishing', progress: null, message: 'Cloudinary metadata is being verified and the post is being saved.' });
        const result = await postAPI.completeVideoUpload({
          uploadId: authorization.uploadId,
          content: content.trim(),
          clientVideoDuration: detectedDuration,
        }, { signal: uploadControllerRef.current.signal, timeout: 60000 });
        if (result.data.success && result.data.post?._id && result.data.post?.videoUrl) {
          onPostCreated?.(result.data.post);
          if (reelMode) {
            setPublishedPost(result.data.post);
            setProgressStage('published');
            completePublishing(result.data.post);
          } else {
            completePublishing(result.data.post);
            setContent(''); handleRemoveImage(); setUploadProgress(0); setPublishStage(''); setOpenModal(false); setReelMode(false);
          }
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
        setReelMode(false);
      } else throw new Error(res.data.message || 'The server did not confirm that your post was published.');
    } catch (err) {
      const status = err.response?.status;
      const failureCode = err.response?.data?.code;
      const message = err.response?.data?.message || err.message;
      // A provider-validation failure marks the old upload session rejected
      // and removes that invalid asset. A retry must start a fresh idempotent
      // upload session while keeping the selected file and caption in place.
      if (['video_validation_failed', 'upload_rejected'].includes(failureCode)) {
        videoIdempotencyKeyRef.current = crypto.randomUUID();
        videoUploadSignatureRef.current = '';
      }
      setError(err.code === 'ERR_CANCELED' || err.name === 'AbortError'
        ? 'Upload canceled. Your selected video is still here; press Publish to retry.'
        : status === 413 ? 'This video is too large. Choose a video under 250MB.'
          : status === 415 ? 'This video format is not supported. Choose MP4, WebM, or MOV.'
            : status === 401 ? 'Your session expired. Sign in again before publishing.'
              : status === 429 ? 'Too many upload attempts. Wait a minute, then retry.'
                : err.code === 'ECONNABORTED' ? 'The upload timed out. Your video is still selected; retry safely on a steadier connection.'
                  : err.code === 'ERR_NETWORK' || err.message === 'Network Error' ? 'The network disconnected during upload. Your video is still selected; reconnect and retry safely.'
                    : status >= 500 ? 'A storage or server issue interrupted publishing. Your video is still selected; retry safely.'
                : failureCode === 'video_validation_failed'
                  ? `${message || 'Cloud storage could not verify this clip.'} Your video and caption are still selected; retry to start a fresh upload.`
                  : (message || 'Failed to publish post. Please try again.'));
      // If publishing fails, bring the composer back with its selected content so
      // the user can understand the error and retry without rebuilding the draft.
      setProgressStage(reelMode ? 'failed' : 'idle');
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
              startIcon={<ImageOutlinedIcon sx={{ color: 'text.primary' }} />}
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
              startIcon={<TagOutlinedIcon sx={{ color: 'text.primary' }} />}
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
        onClose={submitting ? undefined : () => { setOpenModal(false); setReelMode(false); }}
        maxWidth="sm"
        fullWidth
        fullScreen={reelMode}
        PaperProps={{
          sx: {
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            borderRadius: reelMode ? 0 : { xs: '20px 20px 0 0', sm: 3 },
            mx: { xs: 0, sm: 2 }, mb: { xs: 0, sm: 2 },
            width: reelMode ? '100vw' : { xs: '100%', sm: 'min(560px, calc(100% - 32px))' }, maxWidth: reelMode ? '100vw' : 'none',
            height: reelMode ? '100dvh' : { xs: 'min(88dvh, 780px)', sm: 'auto' }, maxHeight: reelMode ? '100dvh' : { xs: 'calc(100dvh - env(safe-area-inset-top, 0px))', sm: 'min(90dvh, 820px)' },
            p: { xs: 0, sm: .5 },
            border: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: '0 24px 80px rgba(0,0,0,.32)',
          }
        }}
        sx={{
          '& .MuiDialog-container': { alignItems: { xs: 'flex-end', sm: 'center' } },
          '& .MuiBackdrop-root': { bgcolor: reelMode ? '#08090b' : 'rgba(4, 10, 18, .66)', backdropFilter: reelMode ? 'none' : 'blur(5px)' },
          '@media (prefers-reduced-motion: reduce)': { '& .MuiPaper-root': { transition: 'none' } },
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageSelect}
          accept={reelMode ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime'}
          style={{ display: 'none' }}
        />
        {reelMode ? <CreateReelEditor
          videoPreview={videoPreview}
          videoFile={videoFile}
          videoDuration={videoDuration}
          trimStart={trimStart}
          trimEnd={trimEnd}
          setTrimStart={setTrimStart}
          setTrimEnd={setTrimEnd}
          coverTime={reelCoverTime}
          setCoverTime={setReelCoverTime}
          cropMode={reelCropMode}
          setCropMode={setReelCropMode}
          content={content}
          setContent={setContent}
          onVideoMetadata={(event) => {
            const duration = readFiniteVideoDuration(event.currentTarget);
            if (!duration) return;
            updateDurationMetadata(duration, event.currentTarget);
          }}
          onReplace={() => { if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); } }}
          onClose={() => { if (!submitting) { if (progressStage === 'published') { setContent(''); handleRemoveImage(); } setProgressStage('idle'); setPublishedPost(null); setReelMode(false); setOpenModal(false); } }}
          onCancel={() => uploadControllerRef.current?.abort()}
          onBackToEdit={() => { setProgressStage('idle'); setError(null); setPublishStage(''); }}
          onFinish={() => { setContent(''); handleRemoveImage(); setPublishedPost(null); setProgressStage('idle'); setReelMode(false); setOpenModal(false); }}
          onViewReel={() => { if (publishedPost?._id) { const postId = publishedPost._id; setContent(''); handleRemoveImage(); setProgressStage('idle'); setPublishedPost(null); setReelMode(false); setOpenModal(false); navigate(`/post/${postId}`); } }}
          onPublish={handlePublish}
          submitting={submitting}
          uploadProgress={uploadProgress}
          uploadedBytes={uploadedBytes}
          totalBytes={videoFile?.size || 0}
          progressStage={progressStage}
          publishedPost={publishedPost}
          publishStage={publishStage}
          error={error}
        /> : <>
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

          <Button
            fullWidth
            variant="outlined"
            startIcon={<MovieCreationRoundedIcon/>}
            onClick={() => {
              setError(null);
              setReelMode(true);
              if (videoFile) { setReelCoverTime(trimStart); return; }
              window.setTimeout(() => fileInputRef.current?.click(), 100);
            }}
            disabled={submitting}
            sx={{ mb: 1.5, minHeight: 46, borderRadius: 2.5, justifyContent: 'flex-start', px: 1.5 }}
          >Create a Reel</Button>

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
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' }
                }}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {videoPreview && (
            <Box sx={{ position: 'relative', mt: 1.75, borderRadius: 2.5, overflow: 'hidden', bgcolor: 'background.default', border: (theme) => `1px solid ${theme.palette.divider}` }}>
              <Box component="video" src={videoPreview} controls playsInline preload="metadata" onPlay={(event) => { if (event.currentTarget.currentTime < trimStart || event.currentTarget.currentTime >= trimEnd) event.currentTarget.currentTime = trimStart; }} onLoadedMetadata={(event) => {
                const duration = readFiniteVideoDuration(event.currentTarget);
                if (!duration) { setError('Waiting for the selected video duration. If it does not load, choose the video again.'); return; }
                updateDurationMetadata(duration, event.currentTarget);
              }} onDurationChange={(event) => {
                const duration = readFiniteVideoDuration(event.currentTarget);
                if (duration) updateDurationMetadata(duration, event.currentTarget);
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
        </>}
      </Dialog>
    </>
  );
};

export default CreatePostCard;
