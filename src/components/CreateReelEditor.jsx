import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, DialogActions, DialogContent, IconButton,
  Slider, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CropFreeRoundedIcon from '@mui/icons-material/CropFreeRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded';
import MicNoneRoundedIcon from '@mui/icons-material/MicNoneRounded';
import ClosedCaptionRoundedIcon from '@mui/icons-material/ClosedCaptionRounded';
import AutoAwesomeMosaicRoundedIcon from '@mui/icons-material/AutoAwesomeMosaicRounded';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';
import ContentCutRoundedIcon from '@mui/icons-material/ContentCutRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';

const MAX_REEL_SECONDS = 35;
const tools = [
  { id: 'audio', label: 'Audio', icon: MusicNoteRoundedIcon, note: 'Only the video’s original audio is published. Adding a separate music track is not available yet.' },
  { id: 'text', label: 'Text', icon: TextFieldsRoundedIcon, note: 'Text overlays are not available yet. Your caption will publish with the Reel.' },
  { id: 'voiceover', label: 'Voice', icon: MicNoneRoundedIcon, note: 'Voiceover recording is not available yet.' },
  { id: 'captions', label: 'Captions', icon: ClosedCaptionRoundedIcon, note: 'Automatic caption generation is not available yet.' },
  { id: 'stickers', label: 'Stickers', icon: AutoAwesomeMosaicRoundedIcon, note: 'Sticker overlays are not available yet.' },
  { id: 'crop', label: 'Crop', icon: CropFreeRoundedIcon },
  { id: 'speed', label: 'Speed', icon: SpeedRoundedIcon, note: 'Playback speed changes are not yet rendered into published video.' },
  { id: 'trim', label: 'Trim', icon: ContentCutRoundedIcon },
];

const timeLabel = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0);
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}.${String(Math.floor((value % 1) * 10))}`;
};

export default function CreateReelEditor({
  videoPreview, videoFile, videoDuration, trimStart, trimEnd, setTrimStart, setTrimEnd,
  coverTime, setCoverTime, cropMode, setCropMode, content, setContent, onVideoMetadata,
  onReplace, onClose, onPublish, onCancel, onBackToEdit, onFinish, onViewReel,
  submitting, uploadProgress, uploadedBytes = 0, totalBytes = videoFile?.size || 0,
  progressStage = 'idle', publishedPost, publishStage, error,
}) {
  const videoRef = useRef(null);
  const coverPreviewRef = useRef(null);
  const [publishScreen, setPublishScreen] = useState(false);
  const [activeTool, setActiveTool] = useState('');
  const [frameStrip, setFrameStrip] = useState({ src: '', frames: [] });
  const frames = frameStrip.src === videoPreview ? frameStrip.frames : [];
  const [playing, setPlaying] = useState(false);
  const [mutedPreview, setMutedPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const statusContent = {
    preparing: ['Preparing your Reel', 'Checking the selected video and preparing a secure upload.'],
    uploading: ['Uploading your Reel', 'Transferring video bytes securely to storage. Keep this screen open.'],
    processing: ['Processing your video', 'Upload complete. Vuprise is checking the stored video before publishing.'],
    publishing: ['Publishing your Reel', 'Saving the verified video and Reel details to Vuprise.'],
    published: ['Reel published successfully', 'Your Reel is live on Vuprise.'],
    failed: ['Reel could not be published', error || 'Your video and caption are still available. Retry when you are ready.'],
  }[progressStage];
  const showProgress = Boolean(statusContent && progressStage !== 'idle');
  const prettyBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!videoPreview || !videoDuration) return undefined;
    let cancelled = false;
    const source = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    source.muted = true;
    source.preload = 'metadata';
    source.src = videoPreview;
    const collectFrames = async () => {
      if (!context || !source.videoWidth || !source.videoHeight) return;
      canvas.width = 76;
      canvas.height = 76;
      const nextFrames = [];
      const count = 12;
      for (let index = 0; index < count && !cancelled; index += 1) {
        const at = source.duration * (index / Math.max(1, count - 1));
        await new Promise((resolve) => {
          const done = () => { source.removeEventListener('seeked', done); resolve(); };
          source.addEventListener('seeked', done, { once: true });
          source.currentTime = Math.min(at, Math.max(0, source.duration - 0.05));
          window.setTimeout(done, 350);
        });
        if (cancelled) break;
        try {
          context.drawImage(source, 0, 0, canvas.width, canvas.height);
          nextFrames.push({ time: at, image: canvas.toDataURL('image/jpeg', 0.58) });
        } catch { /* Some codecs do not expose frame pixels; the trim still works. */ }
      }
      if (!cancelled) setFrameStrip({ src: videoPreview, frames: nextFrames });
    };
    source.addEventListener('loadedmetadata', collectFrames, { once: true });
    source.load();
    return () => { cancelled = true; source.pause(); source.removeAttribute('src'); source.load(); };
  }, [videoPreview, videoDuration]);

  const handleTimeUpdate = useCallback((event) => {
    const video = event.currentTarget;
    setCurrentTime(video.currentTime);
    if (video.currentTime >= trimEnd && trimEnd > trimStart) {
      video.pause();
      video.currentTime = trimStart;
      setPlaying(false);
    }
  }, [trimEnd, trimStart]);

  useEffect(() => {
    if (!publishScreen || !coverPreviewRef.current || !videoDuration) return;
    if (Math.abs(coverPreviewRef.current.currentTime - coverTime) > 0.08) coverPreviewRef.current.currentTime = coverTime;
  }, [publishScreen, videoDuration, coverTime]);

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) videoRef.current.currentTime = trimStart;
      try { await videoRef.current.play(); } catch { setPlaying(false); }
    } else videoRef.current.pause();
  };

  const setRange = (_event, value, activeThumb) => {
    const [start, end] = value;
    if (videoRef.current && (videoRef.current.currentTime < start || videoRef.current.currentTime >= end)) videoRef.current.currentTime = start;
    if (end - start > MAX_REEL_SECONDS) {
      if (activeThumb === 0) {
        const nextStart = Math.max(0, end - MAX_REEL_SECONDS);
        setTrimStart(nextStart);
        setCoverTime((current) => Math.max(nextStart, Math.min(end - 0.05, current)));
      } else {
        const nextEnd = Math.min(videoDuration, start + MAX_REEL_SECONDS);
        setTrimEnd(nextEnd);
        setCoverTime((current) => Math.max(start, Math.min(nextEnd - 0.05, current)));
      }
    } else {
      setTrimStart(start);
      setTrimEnd(end);
      setCoverTime((current) => Math.max(start, Math.min(end - 0.05, current)));
    }
  };

  const handleTool = (tool) => {
    setActiveTool((current) => current === tool.id ? '' : tool.id);
    if (tool.id === 'trim') document.getElementById('reel-trim-control')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return <>
    <DialogContent className="vuprise-reel-editor" sx={{ p: 0, flex: 1, minHeight: 0, overflow: 'hidden', bgcolor: '#08090b', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 1.25, sm: 2.5 }, pt: 'max(8px, env(safe-area-inset-top))', pb: 1.25, flexShrink: 0 }}>
        <IconButton onClick={onClose} disabled={submitting} aria-label="Close Reel editor" sx={{ color: '#fff', width: 44, height: 44 }}><CloseRoundedIcon/></IconButton>
        <Box sx={{ minWidth: 0, textAlign: 'center' }}>
          <Typography fontWeight={800}>{publishScreen ? 'New Reel' : 'Edit Reel'}</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.62)' }}>{videoFile ? videoFile.name : 'Choose a video to get started'}</Typography>
        </Box>
        {publishScreen
          ? <Box sx={{ width: 76, flexShrink: 0 }}/>
          : <Button onClick={() => setPublishScreen(true)} disabled={!videoFile || !videoDuration || submitting} variant="contained" sx={{ minWidth: 76, borderRadius: 5, bgcolor: '#fff', color: '#000', fontWeight: 800, '&:hover': { bgcolor: '#e8e8e8' } }}>Next</Button>}
      </Stack>

      {showProgress ? <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: { xs: 2.5, sm: 4 }, py: 3, textAlign: 'center', gap: 2 }}>
        <Box sx={{ width: 'min(58vw, 240px)', aspectRatio: '9 / 16', maxHeight: '32dvh', borderRadius: 3, overflow: 'hidden', bgcolor: '#16181d', border: '1px solid rgba(255,255,255,.18)', boxShadow: '0 18px 50px rgba(0,0,0,.48)' }}>
          {videoPreview && <Box component="video" src={videoPreview} muted playsInline controls={!submitting} preload="metadata" aria-label="Selected Reel preview" sx={{ width: '100%', height: '100%', objectFit: cropMode === 'cover' ? 'cover' : 'contain', bgcolor: '#000' }} />}
        </Box>
        <Box sx={{ width: 'min(100%, 480px)' }}>
          <Box sx={{ display: 'grid', placeItems: 'center', mb: 1, color: progressStage === 'published' ? '#fff' : progressStage === 'failed' ? '#ff7777' : '#fff' }}>
            {progressStage === 'published' ? <CheckCircleRoundedIcon sx={{ fontSize: 34 }}/> : progressStage === 'failed' ? <ErrorOutlineRoundedIcon sx={{ fontSize: 34 }}/> : <CloudUploadRoundedIcon sx={{ fontSize: 34 }}/>}
          </Box>
          <Typography variant="h5" fontWeight={850} aria-live="polite">{statusContent[0]}</Typography>
          <Typography sx={{ mt: .75, color: 'rgba(255,255,255,.68)', overflowWrap: 'anywhere' }}>{content.trim() || videoFile?.name || 'Your Reel'}</Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255,255,255,.74)' }}>{progressStage === 'uploading' ? `${uploadProgress}% · ${prettyBytes(uploadedBytes)} of ${prettyBytes(totalBytes)}` : statusContent[1]}</Typography>
          {progressStage === 'uploading' && <Box role="progressbar" aria-label="Reel upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress} sx={{ mt: 2, height: 8, borderRadius: 8, overflow: 'hidden', bgcolor: 'rgba(255,255,255,.16)' }}>
            <Box sx={{ height: '100%', width: `${uploadProgress}%`, borderRadius: 8, bgcolor: '#fff', transition: 'width 120ms linear' }}/>
          </Box>}
          {['processing', 'publishing', 'preparing'].includes(progressStage) && <Box sx={{ mt: 2, height: 8, borderRadius: 8, overflow: 'hidden', bgcolor: 'rgba(255,255,255,.16)' }}><Box sx={{ height: '100%', width: '34%', borderRadius: 8, bgcolor: '#fff', animation: 'reel-progress-indeterminate 1.2s ease-in-out infinite alternate', '@keyframes reel-progress-indeterminate': { from: { transform: 'translateX(-20%)' }, to: { transform: 'translateX(210%)' } }, '@media (prefers-reduced-motion: reduce)': { animation: 'none', width: '100%' } }}/></Box>}
          {totalBytes > 0 && ['uploading', 'processing', 'publishing'].includes(progressStage) && <Typography variant="caption" display="block" sx={{ mt: .75, color: 'rgba(255,255,255,.56)' }}>{prettyBytes(uploadedBytes)} / {prettyBytes(totalBytes)}</Typography>}
        </Box>
        {progressStage === 'failed' && <Alert severity="error" sx={{ width: 'min(100%, 480px)', textAlign: 'left' }}>{error || statusContent[1]}</Alert>}
        <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1} sx={{ mt: 1 }}>
          {progressStage === 'uploading' && <Button onClick={onCancel} variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>Cancel upload</Button>}
          {progressStage === 'failed' && <><Button onClick={onPublish} variant="contained" sx={{ bgcolor: '#fff', color: '#000', fontWeight: 800 }}>Retry</Button><Button onClick={onBackToEdit} sx={{ color: '#fff' }}>Back to edit</Button></>}
          {progressStage === 'published' && <><Button onClick={onViewReel} variant="contained" sx={{ bgcolor: '#fff', color: '#000', fontWeight: 800 }}>View Reel</Button><Button onClick={onFinish} sx={{ color: '#fff' }}>Done</Button></>}
        </Stack>
      </Box> : <>
      {error && <Alert severity="error" sx={{ mx: 2, mb: 1, flexShrink: 0 }}>{error}</Alert>}
      {publishStage && <Typography aria-live="polite" variant="caption" sx={{ mx: 2, mb: 1, color: 'rgba(255,255,255,.74)' }}>{publishStage}{uploadProgress > 0 ? ` ${uploadProgress}%` : ''}</Typography>}

      {!publishScreen ? <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateRows: { xs: 'minmax(180px, 1fr) auto auto', lg: 'minmax(0, 1fr) auto' }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(340px, 1.15fr) minmax(320px, .85fr)' }, overflowY: { xs: 'auto', lg: 'hidden' }, overscrollBehavior: 'contain' }}>
        <Box sx={{ px: 1.5, py: 1, display: 'grid', placeItems: 'center', minHeight: 0, gridColumn: { lg: 1 }, gridRow: { lg: '1 / span 2' } }}>
          <Box sx={{ position: 'relative', height: 'min(52dvh, 590px)', maxHeight: '100%', aspectRatio: '9 / 16', width: 'auto', maxWidth: 'min(100%, 360px)', minWidth: { xs: 'min(100%, 210px)', sm: 250 }, overflow: 'hidden', borderRadius: 3, bgcolor: '#111318', boxShadow: '0 18px 50px rgba(0,0,0,.4)' }}>
            {videoPreview ? <video ref={videoRef} src={videoPreview} playsInline preload="metadata" muted={mutedPreview} onTimeUpdate={handleTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedMetadata={(event) => { onVideoMetadata?.(event); if (Number.isFinite(event.currentTarget.duration)) event.currentTarget.currentTime = trimStart; }} onDurationChange={(event) => onVideoMetadata?.(event)} style={{ width: '100%', height: '100%', display: 'block', objectFit: cropMode === 'cover' ? 'cover' : 'contain', background: '#090a0c' }} /> : <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ position: 'absolute', inset: 0, px: 2, textAlign: 'center' }}><Typography fontWeight={750}>Start with a video</Typography><Typography variant="body2" sx={{ color: 'rgba(255,255,255,.62)' }}>Choose MP4, WebM, or MOV up to 250 MB.</Typography><Button variant="outlined" onClick={onReplace} sx={{ mt: 1, color: '#fff', borderColor: 'rgba(255,255,255,.38)', borderRadius: 5 }}>Choose video</Button></Stack>}
            {videoPreview && <Stack direction="row" spacing={1} sx={{ position: 'absolute', left: 10, bottom: 10 }}>
              <IconButton onClick={togglePlay} aria-label={playing ? 'Pause video preview' : 'Play video preview'} sx={{ width: 40, height: 40, color: '#fff', bgcolor: 'rgba(0,0,0,.62)', '&:hover': { bgcolor: 'rgba(0,0,0,.82)' } }}>{playing ? <PauseRoundedIcon/> : <PlayArrowRoundedIcon/>}</IconButton>
              <IconButton onClick={() => setMutedPreview((value) => !value)} aria-label={mutedPreview ? 'Unmute preview' : 'Mute preview'} sx={{ width: 40, height: 40, color: '#fff', bgcolor: 'rgba(0,0,0,.62)', '&:hover': { bgcolor: 'rgba(0,0,0,.82)' } }}>{mutedPreview ? <VolumeOffRoundedIcon/> : <VolumeUpRoundedIcon/>}</IconButton>
            </Stack>}
            {videoFile && <IconButton onClick={onReplace} disabled={submitting} aria-label="Replace video" sx={{ position: 'absolute', top: 10, right: 10, width: 38, height: 38, color: '#fff', bgcolor: 'rgba(0,0,0,.58)' }}><ContentCutRoundedIcon fontSize="small"/></IconButton>}
          </Box>
        </Box>

        <Box id="reel-trim-control" sx={{ px: { xs: 1.5, sm: 3 }, py: 1.25, borderTop: '1px solid rgba(255,255,255,.12)', borderBottom: '1px solid rgba(255,255,255,.12)', gridColumn: { lg: 2 }, gridRow: { lg: 1 }, alignSelf: 'end', width: '100%', boxSizing: 'border-box' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.7)' }}>{timeLabel(currentTime)} / {timeLabel(videoDuration)} ({videoDuration.toFixed(2)}s)</Typography>
            <Typography variant="caption" fontWeight={700}>{timeLabel(trimEnd - trimStart)} selected / 0:35 max</Typography>
          </Stack>
          <Box sx={{ height: 54, display: 'flex', overflowX: 'auto', borderRadius: 1.5, border: '1px solid rgba(255,255,255,.2)', bgcolor: 'rgba(255,255,255,.04)' }}>
            {frames.length ? frames.map((frame, index) => <Box key={`${frame.time}-${index}`} component="button" type="button" onClick={() => { if (videoRef.current) { videoRef.current.currentTime = Math.max(trimStart, Math.min(trimEnd - 0.05, frame.time)); setCurrentTime(videoRef.current.currentTime); } }} aria-label={`Seek video to ${timeLabel(frame.time)}`} sx={{ flex: '1 0 40px', minWidth: 40, border: 0, p: 0, cursor: 'pointer', background: `center / cover no-repeat url(${frame.image})`, opacity: frame.time >= trimStart && frame.time <= trimEnd ? 1 : .38 }}/>) : <Typography variant="caption" sx={{ m: 'auto', color: 'rgba(255,255,255,.56)' }}>{videoDuration ? 'Preparing frame strip…' : 'Video timeline'}</Typography>}
          </Box>
          {videoDuration > 0 && <Slider min={0} max={videoDuration} step={0.05} value={[trimStart, trimEnd]} onChange={setRange} disableSwap valueLabelDisplay="auto" valueLabelFormat={timeLabel} aria-label="Trim Reel clip" sx={{ mt: 1.1, color: '#fff', py: 1.25, '& .MuiSlider-thumb': { width: 22, height: 22, border: '3px solid #090a0c', bgcolor: '#fff' }, '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,.3)' } }}/ >}
        </Box>

        <Box sx={{ flexShrink: 0, pt: 1, pb: 'max(10px, env(safe-area-inset-bottom))', gridColumn: { lg: 2 }, gridRow: { lg: 2 }, alignSelf: 'end', width: '100%', boxSizing: 'border-box' }}>
          {activeTool && <Box sx={{ px: 2, pb: 1.25 }}>
            {activeTool === 'crop' ? <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1} sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,.08)' }}><Box><Typography variant="body2" fontWeight={700}>Portrait framing</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,.66)' }}>This choice is applied to the published video.</Typography></Box><ToggleButtonGroup size="small" exclusive value={cropMode} onChange={(_event, next) => next && setCropMode(next)} sx={{ '& .MuiToggleButton-root': { color: '#fff', borderColor: 'rgba(255,255,255,.25)', px: 1.5, '&.Mui-selected': { bgcolor: '#fff', color: '#000' } } }}><ToggleButton value="cover">Fill</ToggleButton><ToggleButton value="fit">Fit</ToggleButton></ToggleButtonGroup></Stack>
              : activeTool === 'trim' ? <Box sx={{ px: 1.25, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,.08)' }}><Typography variant="body2" fontWeight={700}>Trim selection</Typography><Typography variant="caption" sx={{ color: 'rgba(255,255,255,.66)' }}>{videoFile ? `Drag either end of the timeline selection. The selected ${timeLabel(trimEnd - trimStart)} segment is rendered when you publish.` : 'Choose a video to set the clip range.'}</Typography></Box>
              : <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.12)', '& .MuiAlert-icon': { color: '#fff' } }}>{tools.find((tool) => tool.id === activeTool)?.note || 'Choose a video to edit.'}</Alert>}
          </Box>}
          <Stack direction="row" gap={0.5} sx={{ px: 1, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
            {tools.map((tool) => { const ToolIcon = tool.icon; return <Button key={tool.id} onClick={() => handleTool(tool)} aria-pressed={activeTool === tool.id} sx={{ minWidth: 70, px: 1, py: 1, flexDirection: 'column', gap: .4, color: activeTool === tool.id ? '#fff' : 'rgba(255,255,255,.72)', bgcolor: activeTool === tool.id ? 'rgba(255,255,255,.12)' : 'transparent', borderRadius: 2, textTransform: 'none', '&:active': { transform: 'scale(.97)' } }}><ToolIcon fontSize="small"/><Typography variant="caption">{tool.label}</Typography></Button>; })}
          </Stack>
        </Box>
      </Box> : <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto', p: { xs: 2, sm: 3 }, flex: 1, minHeight: 0, overflowY: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 300px) minmax(260px, 1fr)' }, alignContent: 'start', gap: 3 }}>
        <Stack spacing={1.25}>
          <Typography variant="subtitle2" fontWeight={750}>Cover</Typography>
          <Box sx={{ aspectRatio: '9 / 16', maxHeight: 420, width: 'auto', maxWidth: '100%', mx: 'auto', overflow: 'hidden', borderRadius: 2, bgcolor: '#15171b' }}>
            {videoPreview && <video ref={coverPreviewRef} src={videoPreview} muted playsInline preload="metadata" onLoadedMetadata={(event) => { event.currentTarget.currentTime = coverTime; }} style={{ width: '100%', height: '100%', objectFit: cropMode === 'cover' ? 'cover' : 'contain' }} />}
          </Box>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.64)' }}>Choose a frame from the selected clip.</Typography>
          {videoDuration > 0 && <Slider min={trimStart} max={Math.max(trimStart + 0.05, trimEnd - 0.05)} step={0.05} value={Math.min(Math.max(coverTime, trimStart), Math.max(trimStart, trimEnd - 0.05))} onChange={(_event, value) => setCoverTime(value)} aria-label="Choose Reel cover frame" sx={{ color: '#fff', '& .MuiSlider-thumb': { bgcolor: '#fff' } }} />}
        </Stack>
        <Stack spacing={2}>
          <TextField label="Caption" multiline minRows={5} maxRows={9} value={content} onChange={(event) => setContent(event.target.value.slice(0, 5000))} inputProps={{ maxLength: 5000 }} helperText={`${content.length}/5000 · Add hashtags in your caption`} sx={{ '& .MuiInputBase-root': { color: '#fff' }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,.72)' }, '& .MuiFormHelperText-root': { color: 'rgba(255,255,255,.6)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.24)' } }}/>
          <Box sx={{ p: 1.5, border: '1px solid rgba(255,255,255,.15)', borderRadius: 2 }}><Typography variant="body2" fontWeight={700}>Audience</Typography><Typography variant="body2" sx={{ mt: .35, color: 'rgba(255,255,255,.68)' }}>Public. This is the current default for Vuprise video posts.</Typography></Box>
          <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,.08)', color: '#fff', border: '1px solid rgba(255,255,255,.12)', '& .MuiAlert-icon': { color: '#fff' } }}>Tagging people and per-Reel audience or comment controls are not supported by the current publishing API.</Alert>
          <Chip label={`${videoDuration ? timeLabel(trimEnd - trimStart) : '0:00'} video · ${cropMode === 'cover' ? 'portrait fill' : 'fit original ratio'}`} sx={{ alignSelf: 'flex-start', color: '#fff', border: '1px solid rgba(255,255,255,.22)', bgcolor: 'transparent' }}/>
        </Stack>
      </Box>}
      </>}
    </DialogContent>
    {publishScreen && !showProgress && <DialogActions sx={{ px: 2, pt: 1, pb: 'max(12px, env(safe-area-inset-bottom))', bgcolor: '#08090b', borderTop: '1px solid rgba(255,255,255,.12)' }}>
      <Button onClick={() => setPublishScreen(false)} disabled={submitting} sx={{ color: '#fff' }}>Back to edit</Button>
      <Button onClick={onPublish} disabled={!videoFile || submitting} variant="contained" sx={{ ml: 'auto', minWidth: 112, borderRadius: 5, bgcolor: '#fff', color: '#000', fontWeight: 800, '&:hover': { bgcolor: '#e8e8e8' } }}>{submitting ? `Uploading ${uploadProgress || ''}%` : 'Share Reel'}</Button>
    </DialogActions>}
  </>;
}
