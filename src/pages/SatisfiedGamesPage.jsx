import React, { lazy, Suspense, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Container, Slider, Stack, TextField, Typography, useMediaQuery,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useNavigate } from 'react-router-dom';
const BinaryOrbits = lazy(() => import('../components/games/BinaryOrbits'));
import ShatterType from '../components/games/ShatterType';
import StardustCursor from '../components/games/StardustCursor';
import GameArtwork from '../components/games/GameArtwork';
import { useThemeMode } from '../theme/ThemeContext';
import './SatisfiedGamesPage.css';

const GAMES = [
  { id: 'binary-orbits', name: 'Binary Orbits', detail: 'A tilted spiral galaxy of stars streaming through its arms.' },
  { id: 'shatter-type', name: 'Shatter Type', detail: 'A headline cut into glass shards that respond to your touch.' },
  { id: 'stardust-cursor', name: 'Stardust Cursor', detail: 'Fine dust carried on a fluid wake, with a puff on click.' },
];

const DEFAULTS = {
  'binary-orbits': { arms: 3, speed: 0.75, density: 1, color: '#FFFFFF', core: '#FFFFFF', starSize: 1.7, intensity: 1, starShape: 'round', tilt: 62, twist: 3.5, armStrength: 0.5, sparkle: 0.5, dust: 0.5, coreSize: 0.14, innerVoid: 0, roll: -8, scale: 1, pointerStrength: 1 },
  'shatter-type': { text: 'Make your mark', frontColor: '#FFFFFF', shardColor: '#FFFFFF', speed: 1, size: 68, intensity: 0.8, shardSize: 22 },
  'stardust-cursor': { color: '#FFFFFF', secondColor: '#FFFFFF', speed: 1, density: 1, size: 2.4, intensity: 1, trailLength: 50, puffSize: 1 },
};

const readSettings = () => {
  try { return JSON.parse(localStorage.getItem('vuprise.satisfied-games.settings.v1')) || {}; } catch { return {}; }
};

const FieldSlider = ({ label, value, min, max, step, onChange }) => (
  <Box className="satisfied-control">
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" fontWeight={650}>{label}</Typography>
      <Typography variant="caption" color="text.secondary">{value}</Typography>
    </Stack>
    <Slider size="small" value={value} min={min} max={max} step={step} onChange={(_, next) => onChange(next)} aria-label={label} />
  </Box>
);

const SatisfiedGamesPage = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [activeGame, setActiveGame] = useState('binary-orbits');
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(readSettings);
  const game = GAMES.find(({ id }) => id === activeGame) || GAMES[0];
  const settings = useMemo(() => {
    const adjustments = { ...(saved[activeGame] || {}) };
    ['color', 'colors', 'core', 'frontColor', 'shardColor', 'secondColor'].forEach((key) => delete adjustments[key]);
    return { ...DEFAULTS[activeGame], ...adjustments };
  }, [activeGame, saved]);

  const update = (key, value) => setSaved((previous) => {
    const next = { ...previous, [activeGame]: { ...DEFAULTS[activeGame], ...(previous[activeGame] || {}), [key]: value } };
    try { localStorage.setItem('vuprise.satisfied-games.settings.v1', JSON.stringify(next)); } catch { /* settings still work for this visit */ }
    return next;
  });
  const reset = () => setSaved((previous) => {
    const next = { ...previous, [activeGame]: { ...DEFAULTS[activeGame] } };
    try { localStorage.setItem('vuprise.satisfied-games.settings.v1', JSON.stringify(next)); } catch { /* settings still work for this visit */ }
    return next;
  });

  return (
    <Container maxWidth="xl" className="satisfied-games-page">
      <Stack className="satisfied-games-heading" direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2}>
        <Box>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)} color="inherit" sx={{ mb: 1 }}>Back</Button>
          <Typography variant="h3" component="h1" fontWeight={800}>Satisfied Games</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>A small collection of interactive visual experiments by Vuprise.</Typography>
        </Box>
      </Stack>

      <Box className="satisfied-game-picker" role="tablist" aria-label="Choose a visual experience">
        {GAMES.map((item) => (
          <button key={item.id} className={`satisfied-game-card ${activeGame === item.id ? 'is-active' : ''}`} type="button" role="tab" aria-selected={activeGame === item.id} onClick={() => setActiveGame(item.id)}>
            <GameArtwork game={item.id} compact />
            <span className="satisfied-game-card__copy"><strong>{item.name}</strong><small>{item.detail}</small></span>
          </button>
        ))}
      </Box>

      <Box className={`satisfied-workbench ${editing ? 'is-editing' : ''}`}>
        <Box className="satisfied-stage" role="tabpanel" aria-label={`${game.name} preview`}>
          <span className="satisfied-stage__eyebrow"><AutoAwesomeRoundedIcon fontSize="small" /> LIVE PREVIEW</span>
          <Button className="satisfied-edit-toggle" variant="outlined" size="small" startIcon={editing ? <CloseRoundedIcon /> : <EditRoundedIcon />} onClick={() => setEditing((value) => !value)} aria-expanded={editing} aria-controls="satisfied-game-editor">{editing ? 'Done' : 'Edit'}</Button>
          {activeGame === 'binary-orbits' && <Suspense fallback={null}><BinaryOrbits {...settings} color={mode === 'dark' ? '#FFFFFF' : '#000000'} core={mode === 'dark' ? '#FFFFFF' : '#000000'} backgroundColor={mode === 'dark' ? '#000000' : '#FFFFFF'} reducedMotion={reducedMotion} /></Suspense>}
          {activeGame === 'shatter-type' && <ShatterType key={JSON.stringify(settings)} {...settings} frontColor={mode === 'dark' ? '#FFFFFF' : '#000000'} shardColor={mode === 'dark' ? '#FFFFFF' : '#000000'} reducedMotion={reducedMotion} />}
          {activeGame === 'stardust-cursor' && <StardustCursor {...settings} color={mode === 'dark' ? '#FFFFFF' : '#000000'} secondColor={mode === 'dark' ? '#FFFFFF' : '#000000'} reducedMotion={reducedMotion} />}
        </Box>

        {editing && <Box className="satisfied-controls" id="satisfied-game-editor">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="h5" component="h2" fontWeight={750}>Edit {game.name}</Typography>
            <Button size="small" onClick={reset}>Reset</Button>
          </Stack>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>{game.detail}</Typography>
          {activeGame === 'binary-orbits' && <Stack spacing={1.5}>
            <FieldSlider label="Spiral arms" value={settings.arms} min={2} max={6} step={1} onChange={(v) => update('arms', v)} />
            <FieldSlider label="Rotation speed" value={settings.speed} min={0} max={1.5} step={0.05} onChange={(v) => update('speed', v)} />
            <FieldSlider label="Star density" value={settings.density} min={0.4} max={1.8} step={0.1} onChange={(v) => update('density', v)} />
            <FieldSlider label="Star size" value={settings.starSize} min={0.5} max={3} step={0.1} onChange={(v) => update('starSize', v)} />
            <FieldSlider label="Arm twist" value={settings.twist} min={1} max={7} step={0.1} onChange={(v) => update('twist', v)} />
            <FieldSlider label="Arm definition" value={settings.armStrength} min={0} max={1} step={0.05} onChange={(v) => update('armStrength', v)} />
            <FieldSlider label="Bright star sparkle" value={settings.sparkle} min={0} max={1} step={0.05} onChange={(v) => update('sparkle', v)} />
            <FieldSlider label="Dust lanes" value={settings.dust} min={0} max={1} step={0.05} onChange={(v) => update('dust', v)} />
            <FieldSlider label="Core size" value={settings.coreSize} min={0.02} max={0.2} step={0.01} onChange={(v) => update('coreSize', v)} />
            <FieldSlider label="Inner void" value={settings.innerVoid} min={0} max={0.6} step={0.02} onChange={(v) => update('innerVoid', v)} />
            <FieldSlider label="Glow intensity" value={settings.intensity} min={0.2} max={2} step={0.1} onChange={(v) => update('intensity', v)} />
            <FieldSlider label="Galaxy tilt" value={settings.tilt} min={25} max={90} step={1} onChange={(v) => update('tilt', v)} />
            <FieldSlider label="Galaxy roll" value={settings.roll} min={-45} max={45} step={1} onChange={(v) => update('roll', v)} />
            <FieldSlider label="Galaxy scale" value={settings.scale} min={0.5} max={1.5} step={0.05} onChange={(v) => update('scale', v)} />
            <FieldSlider label="Pointer response" value={settings.pointerStrength ?? 1} min={0.2} max={2} step={0.1} onChange={(v) => update('pointerStrength', v)} />
            <label className="satisfied-select">Star shape<select value={settings.starShape} onChange={(e) => update('starShape', e.target.value)}><option value="round">Round</option><option value="diamond">Diamond</option><option value="square">Square</option><option value="cross">Cross</option></select></label>
          </Stack>}
          {activeGame === 'shatter-type' && <Stack spacing={1.5}>
            <TextField size="small" label="Headline" value={settings.text} slotProps={{ htmlInput: { maxLength: 28 } }} onChange={(e) => update('text', e.target.value)} />
            <FieldSlider label="Text size" value={settings.size} min={32} max={96} step={2} onChange={(v) => update('size', v)} />
            <FieldSlider label="Shatter speed" value={settings.speed} min={0.5} max={2} step={0.1} onChange={(v) => update('speed', v)} />
            <FieldSlider label="Shard size" value={settings.shardSize} min={12} max={38} step={1} onChange={(v) => update('shardSize', v)} />
            <FieldSlider label="Effect intensity" value={settings.intensity} min={0.2} max={1.8} step={0.1} onChange={(v) => update('intensity', v)} />
          </Stack>}
          {activeGame === 'stardust-cursor' && <Stack spacing={1.5}>
            <FieldSlider label="Trail length" value={settings.trailLength} min={12} max={110} step={2} onChange={(v) => update('trailLength', v)} />
            <FieldSlider label="Dust density" value={settings.density} min={0.3} max={2.5} step={0.1} onChange={(v) => update('density', v)} />
            <FieldSlider label="Particle size" value={settings.size} min={0.6} max={5} step={0.2} onChange={(v) => update('size', v)} />
            <FieldSlider label="Motion speed" value={settings.speed} min={0.2} max={2.5} step={0.1} onChange={(v) => update('speed', v)} />
            <FieldSlider label="Click puff size" value={settings.puffSize} min={0.4} max={2.5} step={0.1} onChange={(v) => update('puffSize', v)} />
            <FieldSlider label="Glow intensity" value={settings.intensity} min={0.2} max={2} step={0.1} onChange={(v) => update('intensity', v)} />
            <FieldSlider label="Wake softness" value={settings.softness ?? 0.7} min={0.2} max={1} step={0.05} onChange={(v) => update('softness', v)} />
            <FieldSlider label="Air drift" value={settings.drift ?? 0.5} min={0} max={1.5} step={0.1} onChange={(v) => update('drift', v)} />
          </Stack>}
          {reducedMotion && <Alert severity="info" sx={{ mt: 2 }}>Reduced motion is enabled. The preview stays still; controls remain available.</Alert>}
        </Box>}
      </Box>
    </Container>
  );
};

export default SatisfiedGamesPage;
