import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  Stack,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';

import { userAPI } from '../services/api';
import UserCard from '../components/UserCard';
import PostCard from '../components/PostCard';
import EmptyState from '../components/EmptyState';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async (searchStr) => {
    if (!searchStr.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    try {
      setLoading(true);
      const res = await userAPI.search(searchStr);
      if (res.data.success) {
        setUsers(res.data.users || []);
        setPosts(res.data.posts || []);
      }
    } catch (err) {
      console.error('[Search Error]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      performSearch(query.trim());
    }
  };

  const totalResults = users.length + posts.length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
          Global Search Results
        </Typography>
        {query && (
          <Typography variant="body1" color="text.secondary">
            Showing results for <strong>"{query}"</strong> ({totalResults} total matches)
          </Typography>
        )}
      </Box>

      {/* Refine Search Input */}
      <Card sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            placeholder="Search people by name, skill, company, or search post discussions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            slotProps={{ input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 2.5 }
            }}}
          />
        </form>
      </Card>

      {loading && totalResults > 0 && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} aria-label="Updating search results" />}

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          sx={{
            px: 2,
            '& .MuiTab-root': { fontWeight: 600, py: 1.75 }
          }}
        >
          <Tab icon={<LayersOutlinedIcon />} iconPosition="start" label={`All (${totalResults})`} />
          <Tab icon={<PeopleAltRoundedIcon />} iconPosition="start" label={`People (${users.length})`} />
          <Tab icon={<ArticleOutlinedIcon />} iconPosition="start" label={`Insights & Posts (${posts.length})`} />
        </Tabs>
      </Card>

      {loading && totalResults === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={44} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Scanning global network and discussions...
          </Typography>
        </Box>
      ) : totalResults === 0 ? (
        <EmptyState
          icon={SearchRoundedIcon}
          title="No results found"
          description={`We couldn't find any professionals or discussions matching "${query}". Try searching for broader terms like "engineer", "AI", or "design".`}
        />
      ) : (
        <Stack spacing={4}>
          {/* TAB 0: ALL RESULTS */}
          {tabIndex === 0 && (
            <>
              {users.length > 0 && (
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Professionals ({users.length})
                  </Typography>
                  <Grid container spacing={2.5}>
                    {users.slice(0, 4).map((u) => (
                      <Grid size={{ xs: 12, sm: 6, md: 3 }} key={u._id}>
                        <UserCard user={u} />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {posts.length > 0 && (
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                    Posts & Insights ({posts.length})
                  </Typography>
                  <Stack spacing={0}>
                    {posts.map((p) => (
                      <PostCard key={p._id} post={p} />
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}

          {/* TAB 1: PEOPLE ONLY */}
          {tabIndex === 1 && (
            <Grid container spacing={2.5}>
              {users.map((u) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={u._id}>
                  <UserCard user={u} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* TAB 2: POSTS ONLY */}
          {tabIndex === 2 && (
            <Stack spacing={0} sx={{ maxWidth: 720, mx: 'auto' }}>
              {posts.map((p) => (
                <PostCard key={p._id} post={p} />
              ))}
            </Stack>
          )}
        </Stack>
      )}
    </Container>
  );
};

export default SearchPage;
