import React from 'react';
import { Card, CardContent, CardHeader, Skeleton, Stack, Box } from '@mui/material';

export const PostSkeleton = () => (
  <Card sx={{ mb: 2.5, p: 1 }}>
    <CardHeader
      avatar={<Skeleton variant="circular" width={48} height={48} />}
      title={<Skeleton variant="text" width="45%" height={24} />}
      subheader={<Skeleton variant="text" width="30%" height={18} />}
    />
    <CardContent sx={{ pt: 0 }}>
      <Skeleton variant="text" width="95%" height={20} />
      <Skeleton variant="text" width="85%" height={20} />
      <Skeleton variant="text" width="60%" height={20} />
      <Skeleton variant="rounded" width="100%" height={220} sx={{ mt: 2, borderRadius: 2 }} />
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </Stack>
    </CardContent>
  </Card>
);

export const ProfileHeaderSkeleton = () => (
  <Card sx={{ mb: 3, overflow: 'hidden' }}>
    <Skeleton variant="rectangular" width="100%" height={200} />
    <Box sx={{ p: 3, position: 'relative' }}>
      <Skeleton
        variant="circular"
        width={120}
        height={120}
        sx={{
          position: 'absolute',
          top: -60,
          border: (theme) => `4px solid ${theme.palette.background.paper}`,
        }}
      />
      <Box sx={{ mt: 7 }}>
        <Skeleton variant="text" width="40%" height={36} />
        <Skeleton variant="text" width="60%" height={24} />
        <Skeleton variant="text" width="30%" height={20} sx={{ mb: 2 }} />
        <Stack direction="row" spacing={2}>
          <Skeleton variant="rounded" width={120} height={40} />
          <Skeleton variant="rounded" width={120} height={40} />
        </Stack>
      </Box>
    </Box>
  </Card>
);

export const UserCardSkeleton = () => (
  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
    <Stack alignItems="center" spacing={1.5} sx={{ my: 1 }}>
      <Skeleton variant="circular" width={72} height={72} />
      <Skeleton variant="text" width="70%" height={24} />
      <Skeleton variant="text" width="90%" height={18} />
      <Skeleton variant="text" width="50%" height={16} />
      <Skeleton variant="rounded" width="80%" height={36} sx={{ mt: 1 }} />
    </Stack>
  </Card>
);
