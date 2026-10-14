import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Box, Stack, Chip, Typography, Button, CircularProgress, Alert, LinearProgress, Fab, Menu, MenuItem } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import PostCard from '../components/PostCard';
import { PostSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { connectionAPI, postAPI } from '../services/api';
import { feedConnectionStatus } from '../utils/connectionState';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import RightWidgets from '../components/RightWidgets';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import MovieCreationRoundedIcon from '@mui/icons-material/MovieCreationRounded';
import { useAuth } from '../context/AuthContext';

const FILTER_TOPICS = ['All', 'designsystems', 'ai', 'distributedsystems', 'startups', 'leadership'];
const homeFeedCache = new Map();

const HomePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cachedFeed = homeFeedCache.get(String(user?._id));
  const [posts, setPosts] = useState(() => cachedFeed?.posts || []);
  const [loading, setLoading] = useState(() => !cachedFeed);
  const [error, setError] = useState(null);
  const [selectedTag, setSelectedTag] = useState(() => cachedFeed?.selectedTag || 'All');
  const [page, setPage] = useState(() => cachedFeed?.page || 1);
  const [hasMore, setHasMore] = useState(() => cachedFeed?.hasMore ?? true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedHasLoaded, setFeedHasLoaded] = useState(() => Boolean(cachedFeed));
  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const [resolvedConnections, setResolvedConnections] = useState([]);
  const hasLoadedFeed = useRef(Boolean(cachedFeed));
  const resolvedViewer = useMemo(() => ({ ...user, connections: resolvedConnections }), [resolvedConnections, user]);

  useEffect(() => {
    let active = true;
    if (!user?._id) { setResolvedConnections([]); return undefined; }
    connectionAPI.getConnections()
      .then((response) => { if (active) setResolvedConnections(response.data?.connections || []); })
      .catch(() => { if (active) setResolvedConnections(user.connections || []); });
    return () => { active = false; };
  }, [user?._id]);

  const fetchFeed = useCallback(async (tag = selectedTag, pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !hasLoadedFeed.current) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      const params = { page: pageNum, limit: 10, ...(tag !== 'All' && { tag }) };
      const res = await postAPI.getFeed(params);
      if (res.data.success) {
        const newPosts = res.data.posts || [];
        setPosts((prev) => (append ? [...prev, ...newPosts] : newPosts));
        setHasMore(pageNum < (res.data.totalPages || 1));
        if (pageNum === 1) {
          hasLoadedFeed.current = true;
          setFeedHasLoaded(true);
        }
      }
    } catch (err) {
      console.error('[Feed Error]', err.message);
      if (!hasLoadedFeed.current || pageNum !== 1) setError('Unable to load feed discussions. Please check your network connection.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    if (hasLoadedFeed.current) return;
    fetchFeed(selectedTag, 1, false);
  }, [fetchFeed, selectedTag]);

  useEffect(() => {
    if (!user?._id || !feedHasLoaded) return;
    homeFeedCache.set(String(user._id), { posts, page, hasMore, selectedTag });
  }, [feedHasLoaded, hasMore, page, posts, selectedTag, user?._id]);

  useEffect(() => {
    const handleCreated = (event) => {
      if (event.detail) setPosts((prev) => [event.detail, ...prev.filter((post) => String(post._id) !== String(event.detail._id))]);
    };
    window.addEventListener('nexora:post-created', handleCreated);
    return () => window.removeEventListener('nexora:post-created', handleCreated);
  }, []);

  useEffect(() => {
    const restoreY = location.state?.restoreHomeScrollY;
    if (Number.isFinite(restoreY) && feedHasLoaded) {
      requestAnimationFrame(() => window.scrollTo(0, restoreY));
      navigate(location.pathname, { replace: true, state: null });
    }
    return undefined;
  }, [feedHasLoaded, location.pathname, location.state, navigate]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFeed(selectedTag, nextPage, true);
    }
  };

  const openComposer = () => window.dispatchEvent(new Event('nexora:create-post'));
  const openCreateFlow = (reelMode) => {
    setCreateMenuAnchor(null);
    window.dispatchEvent(new CustomEvent('nexora:create-post', { detail: { reelMode } }));
  };

  return (
    <Container maxWidth="xl" sx={{ width: '100%', minWidth: 0 }}>
      <Fab
        color="primary"
        aria-label="Create post or Reel"
        aria-haspopup="menu"
        aria-expanded={Boolean(createMenuAnchor)}
        onClick={(event) => setCreateMenuAnchor(event.currentTarget)}
        sx={{ position: 'fixed', left: 'max(16px, env(safe-area-inset-left))', bottom: 'calc(78px + env(safe-area-inset-bottom))', zIndex: 1050, width: 52, height: 52, boxShadow: 5, '&:active': { transform: 'scale(.96)' } }}
      ><AddRoundedIcon /></Fab>
      <Menu anchorEl={createMenuAnchor} open={Boolean(createMenuAnchor)} onClose={() => setCreateMenuAnchor(null)}>
        <MenuItem onClick={() => openCreateFlow(false)}><ArticleOutlinedIcon fontSize="small" sx={{ mr: 1.25 }} />Create post</MenuItem>
        <MenuItem onClick={() => openCreateFlow(true)}><MovieCreationRoundedIcon fontSize="small" sx={{ mr: 1.25 }} />Create Reel</MenuItem>
      </Menu>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 780px) minmax(260px, 300px)' },
          justifyContent: 'center',
          alignItems: 'start',
          gap: { xs: 0, lg: 3 },
          width: '100%',
          minWidth: 0,
        }}
      >
      <Box component="section" aria-label="Your feed" sx={{ width: '100%', minWidth: 0 }}>
      <Box component="nav" sx={{ mb: 2.5, py: 0.5, minWidth: 0, width: '100%' }} aria-label="Filter posts by topic">
        <Stack
          direction="row"
          spacing={1}
          sx={{
            width: '100%',
            minWidth: 0,
            flexWrap: 'nowrap',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            '& .MuiChip-root': { flexShrink: 0 },
          }}
        >
          {FILTER_TOPICS.map((tag) => (
            <Chip
              key={tag}
              label={tag === 'All' ? 'All updates' : `#${tag}`}
              clickable
              onClick={() => {
                setSelectedTag(tag);
                setPage(1);
              }}
              color={selectedTag === tag ? 'primary' : 'default'}
              variant={selectedTag === tag ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, borderRadius: 3, px: 0.5 }}
            />
          ))}
        </Stack>
      </Box>

      {loading && feedHasLoaded && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} aria-label="Refreshing feed" />}
      {error && posts.length > 0 && <Alert severity="warning" sx={{ mb: 1.5 }}>{error}</Alert>}
      {loading && !feedHasLoaded ? (
        <Stack spacing={2}><PostSkeleton /><PostSkeleton /><PostSkeleton /></Stack>
      ) : error && posts.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchFeed(selectedTag, 1, false)} />
      ) : posts.length > 0 ? (
        <Stack spacing={0} sx={{ minWidth: 0, width: '100%' }}>
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={{ ...post, connectionStatus: feedConnectionStatus(post, resolvedViewer) }}
              onPostDeleted={(postId) => setPosts((prev) => prev.filter((item) => item._id !== postId))}
              onPostUpdated={(updatedPost) => setPosts((prev) => prev.map((item) => item._id === updatedPost._id ? updatedPost : item))}
            />
          ))}
          {hasMore && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Button variant="outlined" onClick={handleLoadMore} disabled={loadingMore} sx={{ px: 4, py: 1 }}>
                {loadingMore ? <CircularProgress size={20} /> : 'Load More Posts'}
              </Button>
            </Box>
          )}
        </Stack>
      ) : (
        <EmptyState
          icon={DynamicFeedIcon}
          title="Your feed is ready for its first post"
          description="Share a project, an idea, or a question with your network."
          actionText="Create a post"
          onAction={openComposer}
        />
      )}
      <Typography component="span" sx={{ display: 'none' }} aria-live="polite">
        {posts.length} posts loaded
      </Typography>
      </Box>
      <Box
        component="aside"
        aria-label="People and trending topics"
        sx={{ display: { xs: 'none', lg: 'block' }, width: '100%', minWidth: 0, position: 'sticky', top: 94 }}
      >
        <RightWidgets />
      </Box>
      </Box>
    </Container>
  );
};

export default HomePage;
