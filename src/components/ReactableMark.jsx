import React from 'react';
import { Box, useMediaQuery } from '@mui/material';
import ElectricLogo from './reactbits/ElectricLogo';
import { useThemeMode } from '../theme/ThemeContext';

const ReactableMark = ({ size = 38, electric = false, interactive = false, symbolOnly = false }) => {
  const { mode } = useThemeMode();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return (
    <Box
      role="img"
      aria-label="Vuprise"
      sx={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        borderRadius: '22%',
        background: '#000000',
      }}
    >
      <Box
        component="img"
        src="/reactable-network-white.png"
        alt=""
        draggable={false}
        sx={{ position: 'absolute', inset: 0, m: 'auto', zIndex: 2, width: symbolOnly ? '68%' : '76%', height: symbolOnly ? '68%' : '76%', objectFit: 'contain' }}
      />
      {electric && !reduceMotion && <ElectricLogo
        src="/reactable-network-white.png"
        color={mode === 'light' ? '#000000' : '#FFFFFF'}
        glowColor={mode === 'light' ? '#000000' : '#FFFFFF'}
        theme={mode}
        scale={0.64}
        intensity={interactive ? 0.8 : 0.35}
        glow={interactive ? 0.55 : 0.2}
        thickness={interactive ? 1.15 : 0.8}
        strands={interactive ? 3 : 1}
        bend={interactive ? 0.38 : 0.12}
        crackle={interactive ? 0.85 : 0.12}
        arcs={interactive ? 5 : 0}
        flicker={interactive ? 0.28 : 0}
        fill={0}
        speed={interactive ? 0.85 : 0.3}
        cursorIntensity={interactive ? 1.15 : 0.75}
        cursorRadius={interactive ? 112 : 100}
        interactive={interactive}
        className={`reactable-mark__electric${interactive ? ' reactable-mark__electric--interactive' : ''}`}
      />}
    </Box>
  );
};

export default ReactableMark;
