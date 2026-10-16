import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  InputBase,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  CircularProgress,
  Divider,
  ClickAwayListener
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { getBrandedHeadline } from '../utils/brandCopy';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../services/api';
import { truncateText } from '../utils/formatters';

const SearchBar = ({ placeholder = 'Search professionals, skills, insights...', sx = {} }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ users: [], posts: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await userAPI.search(query);
        if (res.data.success) {
          setResults({
            users: res.data.users || [],
            posts: res.data.posts || []
          });
          setIsOpen(true);
        }
      } catch (err) {
        console.error('[Search] Error:', err);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectUser = (userId) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/profile/${userId}`);
  };

  const hasResults = results.users.length > 0 || results.posts.length > 0;

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, minWidth: 0, ...sx }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: 3,
            bgcolor: (theme) => theme.palette.action.hover,
            border: (theme) => `1px solid ${theme.palette.divider}`,
            transition: 'all 0.2s ease',
            '&:focus-within': {
              bgcolor: (theme) => theme.palette.background.paper,
              borderColor: 'primary.main',
              boxShadow: (theme) => `0 0 0 3px ${theme.palette.action.focus}`,
            },
          }}
        >
          <SearchRoundedIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            fullWidth
            sx={{
              minWidth: 0,
              fontSize: '0.9rem',
              '& input': { minWidth: 0, py: 0.75 }
            }}
          />
          {loading && <CircularProgress size={16} sx={{ mr: 1, color: 'text.secondary' }} />}
          {query && !loading && (
            <IconButton size="small" aria-label="Clear search" onClick={() => { setQuery(''); setResults({ users: [], posts: [] }); }}>
              <ClearRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Paper>

        {/* Dropdown Live Preview */}
        {isOpen && query.trim().length >= 2 && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              zIndex: 1400,
              borderRadius: 3,
              overflow: 'hidden',
              border: (theme) => `1px solid ${theme.palette.divider}`,
              maxHeight: 380,
              overflowY: 'auto'
            }}
          >
            {hasResults ? (
              <List disablePadding>
                {results.users.length > 0 && (
                  <>
                    <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                        Professionals ({results.users.length})
                      </Typography>
                    </Box>
                    {results.users.map((u) => (
                      <ListItem
                        key={u._id}
                        button
                        onClick={() => handleSelectUser(u._id)}
                        sx={{
                          py: 1,
                          '&:hover': { bgcolor: 'action.selected' }
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar src={u.profilePicture} alt={u.name} sx={{ width: 36, height: 36 }}>
                            {u.name[0]}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {u.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" noWrap display="block">
                              {getBrandedHeadline(u.headline) || u.jobTitle || 'Professional at Vuprise'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </>
                )}

                {results.posts.length > 0 && (
                  <>
                    <Divider />
                    <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
                        Discussions & Insights ({results.posts.length})
                      </Typography>
                    </Box>
                    {results.posts.map((p) => (
                      <ListItem
                        key={p._id}
                        button
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/search?q=${encodeURIComponent(query)}`);
                        }}
                        sx={{ py: 1 }}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.selected', color: 'text.primary' }}>
                            <ArticleOutlinedIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap>
                              {truncateText(p.content, 60)}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              By {p.author?.name || 'Anonymous'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </>
                )}

                <Divider />
                <ListItem
                  button
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                  }}
                  sx={{ py: 1.25, justifyContent: 'center', bgcolor: 'action.hover' }}
                >
                  <Typography variant="body2" color="primary" fontWeight={600}>
                    View all results for "{query}" →
                  </Typography>
                </ListItem>
              </List>
            ) : !loading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No matches found for "{query}". Press Enter to view global results.
                </Typography>
              </Box>
            ) : null}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};

export default SearchBar;
