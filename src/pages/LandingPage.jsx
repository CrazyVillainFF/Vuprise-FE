import React from 'react';
import { Box, Button, Container, Grid, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import ReactableMark from '../components/ReactableMark';
import ParticleText from '../components/reactbits/ParticleText';
import SpecularButton from '../components/reactbits/SpecularButton';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../theme/ThemeContext';

const principles = [
  { icon: GroupsRoundedIcon, title: 'Built for peers', body: 'Meet people doing thoughtful work across technology and design.' },
  { icon: InsightsRoundedIcon, title: 'A useful feed', body: 'Find conversations and expertise without the unnecessary noise.' },
  { icon: SecurityRoundedIcon, title: 'Your profile, your control', body: 'Share your work and manage your professional presence with confidence.' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { mode } = useThemeMode();
  const dark = mode === 'dark';
  const primaryDestination = isAuthenticated ? '/home' : '/signup';

  return (
    <Box sx={{ minWidth: 0, width: '100%', position: 'relative' }}>
      <Container maxWidth="xl" sx={{ pt: { xs: 3, md: 7 }, pb: { xs: 7, md: 10 }, position: 'relative' }}>
        <Grid container spacing={{ xs: 2, md: 6 }} sx={{ alignItems: 'center', minHeight: { md: 'min(690px, calc(100dvh - 100px))' } }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box sx={{ maxWidth: 720 }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2, color: 'primary.main' }}>
                <ReactableMark size={32} />
                <Typography variant="overline" sx={{ letterSpacing: '.14em', fontWeight: 700 }}>A network for what’s next</Typography>
              </Stack>
              <Box component="h1" sx={{ p: 0, m: 0, font: 'inherit', lineHeight: 1 }}>
                <ParticleText
                  text="Vuprise"
                  color={dark ? '#FFFFFF' : '#000000'}
                  highlightColor={dark ? '#FFFFFF' : '#000000'}
                  particleSize={2.2}
                  density={3.2}
                  scatter={80}
                  gatherDuration={1100}
                  stagger={180}
                  pointerRepel={12}
                  repelRadius={78}
                  idleDrift={0.12}
                  trigger="mount"
                  fontSize="clamp(3.5rem, 10vw, 7.4rem)"
                  fontWeight={780}
                  glow
                  className="reactable-hero-wordmark"
                />
              </Box>
              <Typography variant="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, lineHeight: 1.18, maxWidth: 650, mt: 1.5, mb: 2.25 }}>
                Make the right connections. Do more meaningful work.
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.12rem' }, lineHeight: 1.75, maxWidth: 570, mb: 3.5 }}>
                A professional network for engineers, designers, founders, and researchers to share what they’re building and find the people who can move it forward.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                <SpecularButton
                  size="md"
                  radius={12}
                  tint={dark ? '#FFFFFF' : '#000000'}
                  tintOpacity={1}
                  textColor={dark ? '#000000' : '#FFFFFF'}
                  lineColor={dark ? '#FFFFFF' : '#000000'}
                  baseColor={dark ? '#FFFFFF' : '#000000'}
                  intensity={0.9}
                  shineSize={10}
                  shineFade={22}
                  thickness={1.3}
                  speed={0.75}
                  followMouse
                  autoAnimate
                  onClick={() => navigate(primaryDestination)}
                >
                  {isAuthenticated ? 'Open your feed' : 'Get started'}
                  <ArrowForwardRoundedIcon sx={{ ml: 1, fontSize: 19 }} />
                </SpecularButton>
                <Button variant="outlined" size="large" onClick={() => navigate(isAuthenticated ? '/people' : '/signin')} sx={{ minHeight: 48, borderRadius: 3 }}>
                  {isAuthenticated ? 'Explore the network' : 'Sign in'}
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.25 }}>
                Thoughtful introductions start with the right context.
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ minHeight: { xs: 230, sm: 320, md: 440 }, position: 'relative', display: 'grid', placeItems: 'center', '&::before': { content: '""', position: 'absolute', inset: '12%', borderRadius: '50%', background: dark ? 'radial-gradient(circle, rgba(255,255,255,.18), rgba(255,255,255,.055) 34%, transparent 70%)' : 'radial-gradient(circle, rgba(0,0,0,.12), rgba(0,0,0,.035) 34%, transparent 70%)', filter: 'blur(18px)', pointerEvents: 'none' } }}>
              <Box sx={{ width: { xs: 184, sm: 220, md: 260 }, height: { xs: 184, sm: 220, md: 260 }, borderRadius: '24%', position: 'relative', zIndex: 1, filter: dark ? 'drop-shadow(0 0 24px rgba(255,255,255,.34))' : 'drop-shadow(0 0 20px rgba(0,0,0,.18))' }}>
                <ReactableMark size="100%" electric interactive symbolOnly transparentBackground />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', position: 'relative' }}>
        <Container maxWidth="xl" sx={{ py: { xs: 4, md: 5 } }}>
          <Grid container spacing={{ xs: 3, md: 0 }}>
            {principles.map(({ icon: Icon, title, body }, index) => (
              <Grid size={{ xs: 12, md: 4 }} key={title}>
                <Box sx={{ px: { md: index === 0 ? 0 : 4 }, borderLeft: { md: index === 0 ? 0 : 1 }, borderColor: 'divider' }}>
                  <Icon sx={{ color: 'primary.main', mb: 1.25 }} />
                  <Typography variant="h6" sx={{ mb: .75 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 310, lineHeight: 1.65 }}>{body}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: { xs: 6, md: 9 } }}>
        <Grid container spacing={4} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing=".12em">Make discovery matter</Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.14, maxWidth: 570, my: 1.5 }}>A clearer path from good work to great collaborators.</Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 520, lineHeight: 1.8 }}>Share your experience, discover people with complementary expertise, and make introductions that lead somewhere.</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              {[
                ['01', 'Show your work', 'Give people a clear view of what you do and what you care about.'],
                ['02', 'Find your people', 'Search a community shaped by real skills and shared interests.'],
                ['03', 'Start a conversation', 'Turn the right introduction into a useful exchange.'],
                ['04', 'Keep growing', 'Build a network that develops with your work.'],
              ].map(([number, title, copy]) => (
                <Box key={number} sx={{ p: 2.25, border: 1, borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper' }}>
                  <Typography variant="overline" color="primary.main" fontWeight={700}>{number}</Typography>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mt: .5, mb: .6 }}>{title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{copy}</Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Reviews stay empty until real members share words we have permission
          to publish; no placeholder quotes are invented. */}
      <Container maxWidth="xl" sx={{ pb: { xs: 4, md: 6 } }}>
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 4, p: { xs: 3, md: 5 }, bgcolor: 'background.paper' }}>
          <Typography variant="overline" color="primary.main" fontWeight={700} letterSpacing=".12em">Member reviews</Typography>
          <Typography variant="h2" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, lineHeight: 1.2, my: 1.25, maxWidth: 640 }}>
            Real words from real members — coming soon.
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 620, lineHeight: 1.8 }}>
            Vuprise only publishes reviews that members share with permission. There are none to show yet; when members send theirs, they will appear here exactly as written.
          </Typography>
        </Box>
      </Container>

      <Container maxWidth="xl" sx={{ pb: { xs: 6, md: 8 } }}>
        <Grid container spacing={1.5}>
          {[
            { title: 'Frequently asked questions', copy: 'How messaging privacy, password resets, reports, and appeals work.', to: '/faq' },
            { title: 'Privacy Policy', copy: 'What Vuprise stores, how it is protected, and the choices you have.', to: '/privacy' },
            { title: 'Support', copy: 'Report a problem or appeal a restriction — no sign-in required.', to: '/support/request' },
            { title: 'Satisfied Games', copy: 'A small interactive experiment from the Vuprise team.', to: '/satisfied-games' },
          ].map(({ title, copy, to }) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={to}>
              <Box
                component={RouterLink}
                to={to}
                sx={{
                  display: 'block',
                  height: '100%',
                  p: 2.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 160ms ease, transform 160ms ease',
                  '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' },
                }}
              >
                <Typography variant="subtitle1" fontWeight={750} sx={{ mb: .5 }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.65 }}>{copy}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default LandingPage;
