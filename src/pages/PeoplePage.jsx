import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Chip,
  Card,
  Avatar,
  Button
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import GroupAddRoundedIcon from '@mui/icons-material/GroupAddRounded';
import MarkEmailUnreadRoundedIcon from '@mui/icons-material/MarkEmailUnreadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useNavigate } from 'react-router-dom';

import { userAPI, connectionAPI } from '../services/api';
import UserCard from '../components/UserCard';
import { UserCardSkeleton } from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { getBrandedHeadline } from '../utils/brandCopy';

const SKILL_FILTERS = ['All', 'Design Systems', 'Distributed Systems', 'Deep Learning', 'Robotics', 'Fintech', 'Go', 'Rust', 'Figma'];

const PeoplePage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadedData = useRef({ explore: false, connections: false });

  const navigate = useNavigate();

  const fetchExploreUsers = useCallback(async (options = {}) => {
    const showLoadingState = options?.silent !== true && !loadedData.current.explore;
    try {
      if (showLoadingState) setLoading(true);
      setError(null);
      const params = {
        limit: 24,
        ...(search && { search }),
        ...(selectedSkill !== 'All' && { skill: selectedSkill })
      };
      const res = await userAPI.getUsers(params);
      if (res.data.success) {
        setUsers(res.data.users || []);
        loadedData.current.explore = true;
      }
    } catch (err) {
      console.error('[Explore Users Error]', err.message);
      if (showLoadingState) setError('Unable to load professionals.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedSkill]);

  const fetchConnectionsData = useCallback(async (options = {}) => {
    const showLoadingState = options?.silent !== true && !loadedData.current.connections;
    try {
      if (showLoadingState) setLoading(true);
      setError(null);
      const res = await connectionAPI.getConnections();
      if (res.data.success) {
        setConnections(res.data.connections || []);
        setPendingIncoming(res.data.pendingIncoming || []);
        setPendingOutgoing(res.data.pendingOutgoing || []);
        loadedData.current.connections = true;
      }
    } catch (err) {
      console.error('[Connections Error]', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tabIndex === 0) {
      fetchExploreUsers();
    } else {
      fetchConnectionsData();
    }
  }, [tabIndex, fetchExploreUsers, fetchConnectionsData]);

  const handleAcceptIncoming = async (requestId) => {
    try {
      const res = await connectionAPI.acceptRequest(requestId);
      if (res.data.success) {
        fetchConnectionsData({ silent: true });
      }
    } catch (err) {
      console.error('[Accept Error]', err.message);
    }
  };

  const handleDeclineIncoming = async (requestId) => {
    try {
      const res = await connectionAPI.rejectOrRemove(requestId);
      if (res.data.success) {
        fetchConnectionsData({ silent: true });
      }
    } catch (err) {
      console.error('[Decline Error]', err.message);
    }
  };

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} letterSpacing="-0.02em" gutterBottom>
          Professional Network & Guilds
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Discover architects, founders, and peers in your domain.
        </Typography>
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              fontWeight: 600,
              py: 2,
              minHeight: 48,
            }
          }}
        >
          <Tab icon={<GroupAddRoundedIcon />} iconPosition="start" label="Grow Network" />
          <Tab
            icon={<PeopleAltRoundedIcon />}
            iconPosition="start"
            label={`My Connections (${connections.length})`}
          />
          <Tab
            icon={<MarkEmailUnreadRoundedIcon />}
            iconPosition="start"
            label={`Invitations (${pendingIncoming.length})`}
          />
        </Tabs>
      </Card>

      {/* TAB 0: Grow Network */}
      {tabIndex === 0 && (
        <Box>
          {/* Filters Bar */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 3 }}
          >
            <TextField
              size="small"
              placeholder="Search by name, company, title, or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}}
              sx={{ maxWidth: { xs: '100%', md: 380 }, bgcolor: 'background.paper', borderRadius: 2 }}
            />

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ py: 0.5, minWidth: 0 }}>
              {SKILL_FILTERS.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  clickable
                  onClick={() => setSelectedSkill(skill)}
                  color={selectedSkill === skill ? 'primary' : 'default'}
                  variant={selectedSkill === skill ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </Stack>

          {/* User Grid */}
          {loading ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                  <UserCardSkeleton />
                </Grid>
              ))}
            </Grid>
          ) : error ? (
            <ErrorState message={error} onRetry={fetchExploreUsers} />
          ) : users.length > 0 ? (
            <Grid container spacing={2.5}>
              {users.map((u) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={u._id}>
                  <UserCard user={u} onConnectionChanged={() => fetchExploreUsers({ silent: true })} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={PeopleAltRoundedIcon}
              title="No professionals matched your criteria"
              description="Try adjusting your search query or skill filter to discover more members."
              actionText="Reset Filters"
              onAction={() => {
                setSearch('');
                setSelectedSkill('All');
              }}
            />
          )}
        </Box>
      )}

      {/* TAB 1: My Connections */}
      {tabIndex === 1 && (
        <Box>
          {loading ? (
            <Grid container spacing={2.5}>
              {[1, 2, 3, 4].map((i) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                  <UserCardSkeleton />
                </Grid>
              ))}
            </Grid>
          ) : connections.length > 0 ? (
            <Grid container spacing={2.5}>
              {connections.map((u) => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={u._id}>
                  <UserCard
                    user={{ ...u, connectionStatus: 'connected' }}
                    onConnectionChanged={() => fetchConnectionsData({ silent: true })}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={PeopleAltRoundedIcon}
              title="No connections yet"
              description="Connect with visionary professionals to see their updates in your personalized feed."
              actionText="Discover People"
              onAction={() => setTabIndex(0)}
            />
          )}
        </Box>
      )}

      {/* TAB 2: Invitations */}
      {tabIndex === 2 && (
        <Stack spacing={4}>
          {/* Incoming Requests */}
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              Received Invitations ({pendingIncoming.length})
            </Typography>

            {pendingIncoming.length > 0 ? (
              <Stack spacing={2}>
                {pendingIncoming.map((req) => {
                  const sender = req.requester || {};
                  return (
                    <Card key={req._id} sx={{ p: 2.5 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={2}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/profile/${sender._id}`)}
                        >
                          <Avatar
                            src={sender.profilePicture}
                            alt={sender.name}
                            sx={{ width: 56, height: 56 }}
                          >
                            {sender.name ? sender.name[0] : 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {sender.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {getBrandedHeadline(sender.headline) || sender.company || 'Professional at Vuprise'}
                            </Typography>
                            {sender.location && (
                              <Typography variant="caption" color="text.secondary">
                                {sender.location}
                              </Typography>
                            )}
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={1.5}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CheckRoundedIcon />}
                            onClick={() => handleAcceptIncoming(req._id)}
                          >
                            Accept
                          </Button>
                        </Stack>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Card sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No pending incoming connection requests.
                </Typography>
              </Card>
            )}
          </Box>

          {/* Outgoing Requests */}
          {pendingOutgoing.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Sent Invitations ({pendingOutgoing.length})
              </Typography>
              <Stack spacing={2}>
                {pendingOutgoing.map((req) => {
                  const recipient = req.recipient || {};
                  return (
                    <Card key={req._id} sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/profile/${recipient._id}`)}
                        >
                          <Avatar src={recipient.profilePicture} alt={recipient.name}>
                            {recipient.name ? recipient.name[0] : 'U'}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {recipient.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {recipient.headline || 'Professional'}
                            </Typography>
                          </Box>
                        </Stack>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => handleDeclineIncoming(req._id)}
                        >
                          Withdraw
                        </Button>
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Container>
  );
};

export default PeoplePage;
