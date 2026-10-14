import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { commentAPI, connectionAPI, postAPI } from '../services/api';
import { composeReelFeed, mergeReelFeedPosts } from '../utils/reelsFeed';
import { feedConnectionStatus } from '../utils/connectionState';
import VerifiedAccountBadge from '../components/VerifiedAccountBadge';
import ConnectionButton from '../components/ConnectionButton';
import ReportDialog from '../components/ReportDialog';
import { isVerifiedAccount } from '../utils/verification';

const PAGE_SIZE = 20;

const ReelAction = ({ label, count, active = false, onClick, children }) => (
  <Stack spacing={0.35} sx={{ alignItems: 'center' }}>
    <IconButton
      aria-label={label}
      onClick={onClick}
      sx={{
        width: 48,
        height: 48,
        color: active ? '#ff4057' : '#fff',
        bgcolor: 'rgba(8,9,11,.3)',
        backdropFilter: 'blur(8px)',
        '&:active': { transform: 'scale(.93)' },
      }}
    >{children}</IconButton>
    {count != null && <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, textShadow: '0 1px 8px #000' }}>{count}</Typography>}
  </Stack>
);

const ReelSlide = ({
  post,
  index,
  setSlideRef,
  setVideoRef,
  setBackdropVideoRef,
  isActive,
  isMuted,
  playing,
  liked,
  likeCount,
  commentCount,
  onTogglePlayback,
  onToggleLike,
  onDoubleTapLike,
  onSpeedHoldChange,
  onToggleMute,
  onOpenComments,
  onShare,
  onOpenProfile,
  onBack,
  viewerId,
  viewer,
}) => {
  const author = typeof post.author === 'object' && post.author ? post.author : {};
  const authorId = author._id;
  const isOwnPost = String(authorId || '') === String(viewerId || '');
  const connectionStatus = feedConnectionStatus(post, viewer);
  const tapStartRef = useRef(null);
  const pendingTapRef = useRef(null);
  const tapTimerRef = useRef(null);
  const heartTimerRef = useRef(null);
  const speedPressTimerRef = useRef(null);
  const speedPressStartRef = useRef(null);
  const speedHoldActiveRef = useRef(false);
  const speedHoldChangeRef = useRef(onSpeedHoldChange);
  const heartSequenceRef = useRef(0);
  const [doubleTapHeart, setDoubleTapHeart] = useState({ visible: false, x: 50, y: 50, sequence: 0 });
  const [isSpeedBoosting, setIsSpeedBoosting] = useState(false);

  useEffect(() => {
    speedHoldChangeRef.current = onSpeedHoldChange;
  }, [onSpeedHoldChange]);

  useEffect(() => () => {
    window.clearTimeout(tapTimerRef.current);
    window.clearTimeout(heartTimerRef.current);
    window.clearTimeout(speedPressTimerRef.current);
    if (speedHoldActiveRef.current) speedHoldChangeRef.current(false);
  }, []);

  const showHeart = (position) => {
    window.clearTimeout(heartTimerRef.current);
    heartSequenceRef.current += 1;
    setDoubleTapHeart({ visible: true, x: position.x, y: position.y, sequence: heartSequenceRef.current });
    heartTimerRef.current = window.setTimeout(() => {
      setDoubleTapHeart((current) => ({ ...current, visible: false }));
    }, 720);
  };

  const handleVideoPointerDown = (event) => {
    if (!event.isPrimary) return;
    tapStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleVideoPointerUp = (event) => {
    if (!event.isPrimary || !tapStartRef.current) return;
    const distance = Math.hypot(event.clientX - tapStartRef.current.x, event.clientY - tapStartRef.current.y);
    tapStartRef.current = null;
    if (distance > 22) return;

    const now = Date.now();
    const previousTap = pendingTapRef.current;
    const isDoubleTap = previousTap
      && now - previousTap.time < 290
      && Math.hypot(event.clientX - previousTap.x, event.clientY - previousTap.y) < 44;

    if (isDoubleTap) {
      window.clearTimeout(tapTimerRef.current);
      pendingTapRef.current = null;
      const bounds = event.currentTarget.getBoundingClientRect();
      showHeart({
        x: Math.min(92, Math.max(8, ((event.clientX - bounds.left) / bounds.width) * 100)),
        y: Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100)),
      });
      onDoubleTapLike();
      return;
    }

    pendingTapRef.current = { time: now, x: event.clientX, y: event.clientY };
    window.clearTimeout(tapTimerRef.current);
    tapTimerRef.current = window.setTimeout(() => {
      pendingTapRef.current = null;
      onTogglePlayback();
    }, 290);
  };

  const stopSpeedHold = () => {
    window.clearTimeout(speedPressTimerRef.current);
    speedPressStartRef.current = null;
    if (!speedHoldActiveRef.current) return;
    speedHoldActiveRef.current = false;
    setIsSpeedBoosting(false);
    onSpeedHoldChange(false);
  };

  const handleSpeedPointerDown = (event) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    speedPressStartRef.current = { x: event.clientX, y: event.clientY };
    window.clearTimeout(speedPressTimerRef.current);
    speedPressTimerRef.current = window.setTimeout(() => {
      if (!isActive || !speedPressStartRef.current) return;
      speedHoldActiveRef.current = true;
      setIsSpeedBoosting(true);
      onSpeedHoldChange(true);
    }, 260);
  };

  const handleSpeedPointerMove = (event) => {
    const start = speedPressStartRef.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 18) stopSpeedHold();
  };

  return (
    <Box
      ref={(node) => setSlideRef(post._id, node)}
      className="vuprise-reel-slide"
      data-reel-index={index}
      sx={{
        position: 'relative',
        // Reels stay edge-to-edge on phones. On a desktop canvas they are
        // intentionally constrained to a phone-shaped stage instead of
        // stretching a landscape upload across the entire browser.
        width: { xs: '100%', md: 'min(100%, calc(100dvh * 0.5625))' },
        maxWidth: { md: 'calc(100dvh * 0.5625)' },
        mx: 'auto',
        height: '100dvh',
        minHeight: '100dvh',
        flex: '0 0 100dvh',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        bgcolor: '#08090b',
        isolation: 'isolate',
        borderLeft: { md: '1px solid rgba(255,255,255,.1)' },
        borderRight: { md: '1px solid rgba(255,255,255,.1)' },
        boxShadow: { md: '0 0 64px rgba(0,0,0,.72)' },
      }}
    >
      <Box
        component="video"
        ref={(node) => setBackdropVideoRef(post._id, node)}
        aria-hidden="true"
        tabIndex={-1}
        src={post.videoUrl}
        poster={post.videoThumbnail || undefined}
        playsInline
        muted
        loop
        preload={isActive ? 'auto' : 'none'}
        sx={{
          position: 'absolute',
          inset: -18,
          zIndex: 0,
          display: 'block',
          width: 'calc(100% + 36px)',
          height: 'calc(100% + 36px)',
          objectFit: 'cover',
          filter: 'blur(18px) brightness(.48) saturate(.82)',
          transform: 'scale(1.04)',
          pointerEvents: 'none',
        }}
      />
      <Box
        component="video"
        ref={(node) => setVideoRef(post._id, node)}
        src={post.videoUrl}
        poster={post.videoThumbnail || undefined}
        playsInline
        muted={isMuted}
        loop
        preload={isActive ? 'auto' : 'none'}
        autoPlay={isActive}
        aria-label={`Video by ${author.name || 'Vuprise member'}`}
        onPointerDown={handleVideoPointerDown}
        onPointerUp={handleVideoPointerUp}
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'block',
          width: '100%',
          height: '100%',
          // Keep every edge of landscape source videos visible. The matching
          // blurred layer behind it fills the vertical Reel frame.
          objectFit: 'contain',
          bgcolor: 'transparent',
          cursor: 'pointer',
        }}
      />

      {doubleTapHeart.visible && (
        <Box
          key={doubleTapHeart.sequence}
          aria-hidden="true"
          data-testid="reel-double-tap-heart"
          sx={{
            position: 'absolute',
            zIndex: 4,
            top: `${doubleTapHeart.y}%`,
            left: `${doubleTapHeart.x}%`,
            display: 'grid',
            placeItems: 'center',
            width: 86,
            height: 86,
            transform: 'translate(-50%, -50%)',
            color: '#ff4057',
            pointerEvents: 'none',
            animation: 'reel-double-tap-heart 720ms cubic-bezier(.16,.8,.25,1) both',
            '@keyframes reel-double-tap-heart': {
              '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(.45)' },
              '24%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.12)' },
              '70%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
              '100%': { opacity: 0, transform: 'translate(-50%, -56%) scale(.9)' },
            },
            '@media (prefers-reduced-motion: reduce)': { animationDuration: '1ms' },
          }}
        ><FavoriteRoundedIcon sx={{ fontSize: 62, filter: 'drop-shadow(0 5px 12px rgba(0,0,0,.55))' }} /></Box>
      )}

      <Box
        aria-label="Hold for 2x playback"
        data-testid="reel-speed-zone-left"
        onPointerDown={handleSpeedPointerDown}
        onPointerMove={handleSpeedPointerMove}
        onPointerUp={stopSpeedHold}
        onPointerCancel={stopSpeedHold}
        onPointerLeave={stopSpeedHold}
        sx={{ position: 'absolute', zIndex: 2, top: 0, bottom: 0, left: 0, width: { xs: '20%', md: '18%' }, touchAction: 'pan-y' }}
      />
      <Box
        aria-label="Hold for 2x playback"
        data-testid="reel-speed-zone-right"
        onPointerDown={handleSpeedPointerDown}
        onPointerMove={handleSpeedPointerMove}
        onPointerUp={stopSpeedHold}
        onPointerCancel={stopSpeedHold}
        onPointerLeave={stopSpeedHold}
        sx={{ position: 'absolute', zIndex: 2, top: 0, bottom: 0, right: 0, width: { xs: '20%', md: '18%' }, touchAction: 'pan-y' }}
      />

      {isSpeedBoosting && (
        <Box role="status" aria-live="polite" sx={{ position: 'absolute', zIndex: 4, top: 'calc(max(12px, env(safe-area-inset-top)) + 52px)', left: '50%', transform: 'translateX(-50%)', px: 1.4, py: 0.55, borderRadius: 99, bgcolor: 'rgba(8,9,11,.7)', color: '#fff', border: '1px solid rgba(255,255,255,.2)', backdropFilter: 'blur(10px)', fontSize: '.8rem', fontWeight: 800, letterSpacing: '.04em', pointerEvents: 'none' }}>2× speed</Box>
      )}

      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: '35% 0 0',
          pointerEvents: 'none',
          zIndex: 2,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.12) 28%, rgba(0,0,0,.76) 100%)',
        }}
      />

      <IconButton
        aria-label="Back to Home"
        onClick={onBack}
        sx={{
          position: 'absolute',
          zIndex: 3,
          top: 'max(12px, env(safe-area-inset-top))',
          left: 'max(12px, env(safe-area-inset-left))',
          color: '#fff',
          bgcolor: 'rgba(8,9,11,.32)',
          backdropFilter: 'blur(8px)',
          '&:hover': { bgcolor: 'rgba(8,9,11,.55)' },
        }}
      ><ArrowBackRoundedIcon /></IconButton>

      <IconButton
        aria-label={isMuted ? 'Turn sound on' : 'Mute sound'}
        onClick={onToggleMute}
        sx={{
          position: 'absolute',
          zIndex: 3,
          top: 'max(12px, env(safe-area-inset-top))',
          right: 'max(12px, env(safe-area-inset-right))',
          color: '#fff',
          bgcolor: 'rgba(8,9,11,.38)',
          backdropFilter: 'blur(8px)',
          '&:hover': { bgcolor: 'rgba(8,9,11,.58)' },
        }}
      >{isMuted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}</IconButton>

      {!playing && isActive && (
        <IconButton
          aria-label="Play Reel"
          onClick={onTogglePlayback}
          sx={{ position: 'absolute', zIndex: 3, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 68, height: 68, color: '#fff', bgcolor: 'rgba(0,0,0,.42)', backdropFilter: 'blur(8px)', '&:hover': { bgcolor: 'rgba(0,0,0,.62)' } }}
        ><PlayArrowRoundedIcon sx={{ fontSize: 40 }} /></IconButton>
      )}
      {playing && isActive && (
        <IconButton aria-label="Pause Reel" onClick={onTogglePlayback} sx={{ position: 'absolute', zIndex: 3, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 64, height: 64, color: '#fff', bgcolor: 'rgba(0,0,0,.2)', opacity: 0, transition: 'opacity .18s ease', '&:hover, &:focus-visible': { opacity: 1, bgcolor: 'rgba(0,0,0,.45)' } }}>
          <PauseRoundedIcon sx={{ fontSize: 34 }} />
        </IconButton>
      )}

      <Stack
        aria-label="Reel actions"
        spacing={1.2}
        sx={{
          position: 'absolute',
          right: 'max(10px, env(safe-area-inset-right))',
          bottom: { xs: 'calc(92px + env(safe-area-inset-bottom))', md: 'max(22px, calc(env(safe-area-inset-bottom) + 14px))' },
          zIndex: 3,
          alignItems: 'center',
        }}
      >
        <ReelAction label={liked ? 'Unlike Reel' : 'Like Reel'} count={likeCount} active={liked} onClick={onToggleLike}>
          {liked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
        </ReelAction>
        <ReelAction label="Comment on Reel" count={commentCount} onClick={onOpenComments}><ChatBubbleOutlineRoundedIcon /></ReelAction>
        <ReelAction label="Share Reel" onClick={onShare}><ShareRoundedIcon /></ReelAction>
      </Stack>

      <Stack
        spacing={1}
        sx={{
          position: 'absolute',
          left: 'max(16px, env(safe-area-inset-left))',
          right: 88,
          bottom: { xs: 'calc(88px + env(safe-area-inset-bottom))', md: 'max(22px, calc(env(safe-area-inset-bottom) + 14px))' },
          zIndex: 2,
          color: '#fff',
          textShadow: '0 1px 10px rgba(0,0,0,.7)',
          pointerEvents: 'none',
        }}
      >
        <Stack direction="row" spacing={1.1} sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
          <Avatar src={author.profilePicture || undefined} alt={author.name || 'Vuprise member'} sx={{ width: 42, height: 42, border: '1px solid rgba(255,255,255,.75)' }}>
            {author.name?.[0] || 'V'}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography onClick={() => authorId && onOpenProfile(authorId)} variant="subtitle2" fontWeight={800} noWrap sx={{ cursor: authorId ? 'pointer' : 'default' }}>{author.name || 'Vuprise member'}</Typography>
              {isVerifiedAccount(author) && <VerifiedAccountBadge color={author.verificationBadgeColor} size={16} />}
            </Stack>
            {(author.headline || author.jobTitle) && <Typography variant="caption" noWrap sx={{ display: 'block', color: 'rgba(255,255,255,.8)' }}>{author.headline || author.jobTitle}</Typography>}
          </Box>
          {!isOwnPost && authorId && (
            <ConnectionButton
              key={`${authorId}-${connectionStatus}`}
              userId={authorId}
              userName={author.name}
              initialStatus={connectionStatus}
              size="small"
              connectSx={{ minWidth: 82, height: 32, px: 1.25, borderRadius: 5, color: '#fff', bgcolor: 'rgba(8,9,11,.3)', border: '1px solid rgba(255,255,255,.72)', textTransform: 'none', fontWeight: 750, textShadow: 'none', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.14)' } }}
              connectedSx={{ minWidth: 108, height: 32, px: 1.25, borderRadius: 5, color: '#fff', borderColor: 'rgba(255,255,255,.9)', textTransform: 'none', fontWeight: 750, textShadow: 'none', '&:hover': { borderColor: '#ff8993', bgcolor: 'rgba(255,255,255,.14)' } }}
            />
          )}
        </Stack>
        {post.content && <Typography variant="body2" sx={{ pointerEvents: 'auto', whiteSpace: 'pre-line', overflowWrap: 'anywhere', maxWidth: 560 }}>{post.content}</Typography>}
      </Stack>
    </Box>
  );
};

const ReelsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('videoId') || '';
  const { user } = useAuth();
  const [resolvedConnections, setResolvedConnections] = useState([]);
  const resolvedViewer = useMemo(() => ({ ...user, connections: resolvedConnections }), [resolvedConnections, user]);
  const [sourcePosts, setSourcePosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [playingId, setPlayingId] = useState('');
  const [likeState, setLikeState] = useState({});
  const [commentCounts, setCommentCounts] = useState({});
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentMenuAnchor, setCommentMenuAnchor] = useState(null);
  const [menuComment, setMenuComment] = useState(null);
  const [reportComment, setReportComment] = useState(null);
  const [notice, setNotice] = useState('');
  const [failedPage, setFailedPage] = useState(null);
  const feedRef = useRef(null);
  const slideRefs = useRef(new Map());
  const videoRefs = useRef(new Map());
  const backdropVideoRefs = useRef(new Map());
  const activeVideoIdRef = useRef('');
  const requestLock = useRef(false);
  const firstPageReady = useRef(false);

  useEffect(() => {
    let active = true;
    if (!user?._id) { setResolvedConnections([]); return undefined; }
    connectionAPI.getConnections()
      .then((response) => { if (active) setResolvedConnections(response.data?.connections || []); })
      .catch(() => { if (active) setResolvedConnections(user.connections || []); });
    return () => { active = false; };
  }, [user?._id]);

  const posts = useMemo(() => composeReelFeed(sourcePosts, selectedPost, selectedId), [sourcePosts, selectedPost, selectedId]);
  const activePost = posts[activeIndex];

  const loadFeedPage = useCallback(async (page, append) => {
    if (requestLock.current) return;
    requestLock.current = true;
    setError('');
    setFailedPage(null);
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await postAPI.getFeed({ page, limit: PAGE_SIZE });
      if (!response.data?.success) throw new Error('The video feed could not be loaded.');
      const pagePosts = response.data.posts || [];
      setSourcePosts((current) => append ? mergeReelFeedPosts(current, pagePosts) : pagePosts);
      setHasMore(page < (response.data.totalPages || 1));
      setNextPage(page + 1);
      if (page === 1) firstPageReady.current = true;
    } catch (loadError) {
      setFailedPage(page);
      setError(loadError.response?.data?.message || loadError.message || 'The video feed could not be loaded. Check your connection and retry.');
    } finally {
      requestLock.current = false;
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setSourcePosts([]);
    setSelectedPost(null);
    setActiveIndex(0);
    setHasMore(true);
    setNextPage(1);
    firstPageReady.current = false;
    loadFeedPage(1, false);
  }, [loadFeedPage, selectedId]);

  useEffect(() => {
    if (!selectedId) return undefined;
    let cancelled = false;
    postAPI.getPostById(selectedId)
      .then((response) => {
        if (!cancelled && response.data?.post) setSelectedPost(response.data.post);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.response?.data?.message || 'The selected video is unavailable or you do not have permission to view it.');
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  useEffect(() => {
    setActiveIndex(0);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [selectedId]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root || !posts.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number(visible.target.dataset.reelIndex);
      if (Number.isInteger(index)) setActiveIndex(index);
    }, { root, threshold: [0.5, 0.65, 0.8] });
    slideRefs.current.forEach((element) => element && observer.observe(element));
    return () => observer.disconnect();
  }, [posts.length]);

  useEffect(() => {
    const activeId = activePost?._id;
    const activeIdString = String(activeId || '');
    const videos = videoRefs.current;
    const backdropVideos = backdropVideoRefs.current;
    activeVideoIdRef.current = activeIdString;
    videos.forEach((video, id) => {
      if (!video) return;
      video.playbackRate = 1;
      if (id !== activeIdString) {
        video.pause();
        return;
      }
      video.muted = isMuted;
      video.play().then(() => {
        if (activeVideoIdRef.current === activeIdString) setPlayingId(activeIdString);
      }).catch(() => {
        if (activeVideoIdRef.current === activeIdString) setPlayingId('');
      });
    });
    backdropVideos.forEach((video, id) => {
      if (!video) return;
      video.playbackRate = 1;
      if (id !== activeIdString) {
        video.pause();
        return;
      }
      video.play().catch(() => {});
    });
    return () => {
      videos.forEach((video) => video?.pause());
      backdropVideos.forEach((video) => video?.pause());
    };
  }, [activePost?._id, isMuted, posts.length]);

  useEffect(() => {
    if (firstPageReady.current && hasMore && !loadingMore && failedPage !== nextPage && ((!posts.length) || activeIndex >= posts.length - 3)) {
      loadFeedPage(nextPage, true);
    }
  }, [activeIndex, failedPage, hasMore, loadFeedPage, loadingMore, nextPage, posts.length]);

  const setSlideRef = (id, node) => {
    if (node) slideRefs.current.set(String(id), node);
    else slideRefs.current.delete(String(id));
  };
  const setVideoRef = (id, node) => {
    if (node) videoRefs.current.set(String(id), node);
    else videoRefs.current.delete(String(id));
  };
  const setBackdropVideoRef = (id, node) => {
    if (node) backdropVideoRefs.current.set(String(id), node);
    else backdropVideoRefs.current.delete(String(id));
  };

  const togglePlayback = useCallback((id) => {
    const video = videoRefs.current.get(String(id));
    if (!video) return;
    if (video.paused) video.play().then(() => {
      if (activeVideoIdRef.current === String(id)) setPlayingId(String(id));
    }).catch(() => setPlayingId(''));
    else { video.pause(); setPlayingId(''); }
  }, []);

  const changePlaybackSpeed = useCallback((id, isSpeedBoosting) => {
    const rate = isSpeedBoosting ? 2 : 1;
    const foreground = videoRefs.current.get(String(id));
    const backdrop = backdropVideoRefs.current.get(String(id));
    [foreground, backdrop].forEach((video) => {
      if (video) video.playbackRate = rate;
    });
    if (isSpeedBoosting && foreground?.paused) {
      foreground.play().then(() => {
        if (activeVideoIdRef.current === String(id)) setPlayingId(String(id));
      }).catch(() => {});
    }
    if (isSpeedBoosting && backdrop?.paused) backdrop.play().catch(() => {});
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((muted) => {
      const next = !muted;
      const video = videoRefs.current.get(String(activePost?._id));
      if (video) video.muted = next;
      return next;
    });
  }, [activePost?._id]);

  const toggleLike = useCallback(async (post, forceLike = false) => {
    const id = String(post._id);
    const current = likeState[id] || { liked: Boolean(post.isLiked), count: Number(post.likeCount) || 0 };
    if (forceLike && current.liked) return true;
    const nextLiked = forceLike || !current.liked;
    const optimistic = { liked: nextLiked, count: Math.max(0, current.count + (nextLiked ? 1 : -1)) };
    setLikeState((state) => ({ ...state, [id]: optimistic }));
    try {
      const response = await postAPI.toggleLike(id);
      const result = response.data || {};
      setLikeState((state) => ({ ...state, [id]: { liked: Boolean(result.liked ?? optimistic.liked), count: Number(result.likeCount ?? optimistic.count) } }));
      return Boolean(result.liked ?? optimistic.liked);
    } catch (likeError) {
      setLikeState((state) => ({ ...state, [id]: current }));
      setNotice(likeError.message || 'Your like could not be saved. Try again.');
      return false;
    }
  }, [likeState]);

  const openComments = useCallback(async (post) => {
    setCommentPost(post);
    setCommentDrawerOpen(true);
    setCommentsLoading(true);
    try {
      const response = await commentAPI.getPostComments(post._id);
      setComments(response.data?.comments || []);
    } catch (commentError) {
      setComments(post.comments || []);
      setNotice(commentError.message || 'Comments could not be loaded.');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const sendComment = async (event) => {
    event.preventDefault();
    if (!commentPost || !commentText.trim() || commentSending) return;
    setCommentSending(true);
    try {
      const response = await commentAPI.addComment(commentPost._id, { content: commentText.trim() });
      const saved = response.data?.comment;
      if (!saved) throw new Error('The comment was not confirmed by Vuprise.');
      setComments((current) => [...current, saved]);
      setCommentCounts((current) => ({ ...current, [String(commentPost._id)]: (current[String(commentPost._id)] ?? commentPost.commentCount ?? 0) + 1 }));
      setCommentText('');
    } catch (commentError) {
      setNotice(commentError.message || 'Your comment could not be sent. Try again.');
    } finally {
      setCommentSending(false);
    }
  };

  const updateComment = (id, changes) => setComments((current) => current.map((comment) => comment._id === id ? { ...comment, ...changes } : comment));
  const toggleCommentLike = async (comment) => {
    if (!user?._id) return navigate('/signin');
    const previous = { isLiked: Boolean(comment.isLiked), likeCount: Number(comment.likeCount || 0) };
    updateComment(comment._id, { isLiked: !previous.isLiked, likeCount: Math.max(0, previous.likeCount + (previous.isLiked ? -1 : 1)) });
    try {
      const response = await commentAPI.toggleLike(comment._id);
      updateComment(comment._id, { isLiked: response.data.liked, likeCount: response.data.likeCount });
    } catch (commentError) {
      updateComment(comment._id, previous);
      setNotice(commentError.message || 'Your comment like could not be saved.');
    }
  };
  const toggleCommentPin = async () => {
    if (!menuComment) return;
    try {
      const response = await commentAPI.togglePin(menuComment._id);
      if (response.data?.success) setComments((current) => current.map((comment) => ({ ...comment, pinned: comment._id === menuComment._id ? response.data.pinned : response.data.pinned ? false : comment.pinned })));
    } catch (commentError) { setNotice(commentError.message || 'The pinned comment could not be updated.'); }
    finally { setCommentMenuAnchor(null); setMenuComment(null); }
  };

  const sharePost = async (post) => {
    const url = `${window.location.origin}/reels?videoId=${encodeURIComponent(post._id)}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Vuprise Reel', url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setNotice('Reel link copied.');
      } else setNotice(url);
    } catch (shareError) {
      if (shareError.name !== 'AbortError') setNotice('This device could not share the Reel.');
    }
  };

  const goBack = () => {
    if (Number.isFinite(location.state?.homeScrollY)) {
      navigate('/home', { state: { restoreHomeScrollY: location.state.homeScrollY } });
      return;
    }
    navigate('/home');
  };

  return (
    <Box
      ref={feedRef}
      component="main"
      aria-label="Reels feed"
      sx={{
        position: 'relative',
        width: '100%',
        height: '100dvh',
        minHeight: 0,
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        overscrollBehaviorY: 'contain',
        scrollSnapType: 'y mandatory',
        WebkitOverflowScrolling: 'touch',
        bgcolor: '#050608',
        backgroundImage: {
          xs: 'none',
          md: 'radial-gradient(circle at 50% 25%, rgba(255,255,255,.065), transparent 38%)',
        },
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        '@media (prefers-reduced-motion: reduce)': { scrollBehavior: 'auto' },
      }}
    >
      {loading && posts.length === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '100dvh', color: '#fff' }}>
          <CircularProgress size={28} sx={{ color: '#fff' }} />
          <Typography variant="body2" color="rgba(255,255,255,.72)">Loading Reels</Typography>
        </Stack>
      )}
      {!loading && error && posts.length === 0 && (
        <Stack spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '100dvh', px: 3, color: '#fff', textAlign: 'center' }}>
          <ErrorOutlineRoundedIcon sx={{ fontSize: 38, color: '#ff7a87' }} />
          <Typography variant="h6" fontWeight={800}>Reels could not load</Typography>
          <Typography variant="body2" color="rgba(255,255,255,.72)">{error}</Typography>
          <Button variant="outlined" onClick={() => loadFeedPage(1, false)} sx={{ mt: 1, color: '#fff', borderColor: 'rgba(255,255,255,.55)' }}>Try again</Button>
          <IconButton aria-label="Back to Home" onClick={goBack} sx={{ color: '#fff' }}><ArrowBackRoundedIcon /></IconButton>
        </Stack>
      )}
      {!loading && !error && posts.length === 0 && (
        <Stack spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '100dvh', px: 3, color: '#fff', textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={800}>No Reels yet</Typography>
          <Typography variant="body2" color="rgba(255,255,255,.72)">Create a Reel or come back when your network shares one.</Typography>
          <Button onClick={() => navigate('/home')} sx={{ color: '#fff' }}>Back to Home</Button>
        </Stack>
      )}

      {posts.map((post, index) => {
        const id = String(post._id);
        const likes = likeState[id] || { liked: Boolean(post.isLiked), count: Number(post.likeCount) || 0 };
        const isActive = index === activeIndex;
        const isPlaying = playingId === id && isActive;
        return (
          <ReelSlide
            key={id}
            post={post}
            index={index}
            setSlideRef={setSlideRef}
            setVideoRef={setVideoRef}
            setBackdropVideoRef={setBackdropVideoRef}
            isActive={isActive}
            isMuted={isMuted}
            playing={isPlaying}
            liked={likes.liked}
            likeCount={likes.count}
            commentCount={commentCounts[id] ?? (Number(post.commentCount) || 0)}
            onTogglePlayback={() => togglePlayback(id)}
            onToggleLike={() => toggleLike(post)}
            onDoubleTapLike={() => toggleLike(post, true)}
            onSpeedHoldChange={(isSpeedBoosting) => changePlaybackSpeed(id, isSpeedBoosting)}
            onToggleMute={toggleMute}
            onOpenComments={() => openComments(post)}
            onShare={() => sharePost(post)}
            onOpenProfile={(authorId) => navigate(`/profile/${authorId}`)}
            onBack={goBack}
            viewerId={user?._id}
            viewer={resolvedViewer}
          />
        );
      })}
      {loadingMore && <LinearProgress aria-label="Loading more Reels" sx={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4 }} />}
      {error && posts.length > 0 && <Alert severity="warning" onClose={() => setError('')} action={failedPage != null ? <Button color="inherit" size="small" onClick={() => loadFeedPage(failedPage, failedPage > 1)}>Retry</Button> : undefined} sx={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 64, right: 64, zIndex: 6 }}>{error}</Alert>}
      {notice && <Alert severity="info" onClose={() => setNotice('')} sx={{ position: 'fixed', top: 'max(12px, env(safe-area-inset-top))', left: 64, right: 64, zIndex: 6 }}>{notice}</Alert>}

      <Drawer anchor="bottom" open={commentDrawerOpen} onClose={() => setCommentDrawerOpen(false)} PaperProps={{ sx: { maxHeight: '78dvh', height: 'min(620px, 78dvh)', borderRadius: '18px 18px 0 0', bgcolor: '#111214', color: '#fff', pb: 'env(safe-area-inset-bottom)' } }}>
        <Stack sx={{ height: '100%', minHeight: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,.12)' }}>
            <Typography variant="subtitle1" fontWeight={800}>{commentCounts[String(commentPost?._id)] ?? commentPost?.commentCount ?? 0} comments</Typography>
            <IconButton aria-label="Close comments" onClick={() => setCommentDrawerOpen(false)} sx={{ color: '#fff' }}><CloseRoundedIcon /></IconButton>
          </Stack>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 1.5 }}>
            {commentsLoading ? <Stack sx={{ alignItems: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: '#fff' }} /></Stack> : comments.length ? (
              <Stack spacing={1.75}>
                {comments.map((comment) => {
                  const author = typeof comment.author === 'object' ? comment.author : {};
                  const canPin = String(commentPost?.author?._id || commentPost?.author) === String(user?._id);
                  const isCommentAuthor = String(author._id || comment.author) === String(user?._id);
                  return <Stack key={comment._id} direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}><Avatar src={author.profilePicture || undefined} sx={{ width: 34, height: 34 }}>{author.name?.[0] || 'V'}</Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" justifyContent="space-between"><Typography variant="body2" fontWeight={750}>{author.name || 'Vuprise member'} {comment.pinned && <Box component="span" sx={{ color: '#7db6ff', fontSize: 11 }}>· Pinned</Box>}</Typography><IconButton size="small" aria-label="Comment options" onClick={(event) => { setCommentMenuAnchor(event.currentTarget); setMenuComment({ ...comment, canPin, isCommentAuthor }); }} sx={{ color: 'rgba(255,255,255,.75)', mt: -0.75 }}><MoreVertRoundedIcon fontSize="small" /></IconButton></Stack><Typography variant="body2" sx={{ color: 'rgba(255,255,255,.82)', overflowWrap: 'anywhere' }}>{comment.content}</Typography><Button size="small" startIcon={<ThumbUpAltOutlinedIcon sx={{ fontSize: 14 }} />} onClick={() => toggleCommentLike(comment)} sx={{ minWidth: 0, px: 0, mt: .25, color: comment.isLiked ? '#ff6b7a' : 'rgba(255,255,255,.7)' }}>{comment.likeCount ? `${comment.likeCount} ${comment.likeCount === 1 ? 'like' : 'likes'}` : 'Like'}</Button></Box></Stack>;
                })}
              </Stack>
            ) : <Typography color="rgba(255,255,255,.7)" textAlign="center" py={4}>Be the first to comment.</Typography>}
          </Box>
          <Box component="form" onSubmit={sendComment} sx={{ display: 'flex', gap: 1, px: 1.5, py: 1.25, borderTop: '1px solid rgba(255,255,255,.12)' }}>
            <Avatar src={user?.profilePicture || undefined} sx={{ width: 36, height: 36, alignSelf: 'center' }}>{user?.name?.[0] || 'V'}</Avatar>
            <TextField value={commentText} onChange={(event) => setCommentText(event.target.value)} size="small" fullWidth placeholder="Add a comment..." slotProps={{ htmlInput: { 'aria-label': 'Add a comment', maxLength: 2000 } }} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', borderRadius: 5, bgcolor: 'rgba(255,255,255,.06)' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.2)' }, '& input::placeholder': { color: 'rgba(255,255,255,.55)', opacity: 1 } }} />
            <IconButton type="submit" aria-label="Send comment" disabled={!commentText.trim() || commentSending} sx={{ color: '#fff' }}>{commentSending ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon />}</IconButton>
          </Box>
        </Stack>
      </Drawer>
      <Menu anchorEl={commentMenuAnchor} open={Boolean(commentMenuAnchor)} onClose={() => { setCommentMenuAnchor(null); setMenuComment(null); }}>
        {menuComment?.canPin && <MenuItem onClick={toggleCommentPin}><ListItemIcon><PushPinOutlinedIcon fontSize="small" /></ListItemIcon>{menuComment.pinned ? 'Unpin comment' : 'Pin comment'}</MenuItem>}
        {!menuComment?.isCommentAuthor && <MenuItem onClick={() => { setReportComment(menuComment); setCommentMenuAnchor(null); setMenuComment(null); }} sx={{ color: 'warning.dark' }}><ListItemIcon><FlagOutlinedIcon fontSize="small" color="warning" /></ListItemIcon>Report comment</MenuItem>}
      </Menu>
      <ReportDialog open={Boolean(reportComment)} onClose={() => setReportComment(null)} reportedComment={reportComment?._id} subject="Comment report" onSubmitted={() => setNotice('Comment report submitted for review.')} />
    </Box>
  );
};

export default ReelsPage;
