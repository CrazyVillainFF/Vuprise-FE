import React from 'react';
import AeroShards from './reactbits/AeroShards';
import { useThemeMode } from '../theme/ThemeContext';
import './reactbits/SiteBackdrop.css';

const SiteBackdrop = () => {
  const { mode } = useThemeMode();
  const dark = mode === 'dark';

  return (
    <AeroShards
      className="site-backdrop"
      backgroundColor={dark ? '#000000' : '#FFFFFF'}
      shardColor={dark ? '#FFFFFF' : '#000000'}
      accentColor={dark ? '#FFFFFF' : '#000000'}
      placement="right"
      flow="stream"
      material="pearl"
      detail="bold"
      quality="low"
      interaction="none"
      density={0.6}
      speed={0.22}
      spin={0.12}
      glow={0.2}
      chromaticAberration={0}
      spread={0.82}
      paused={false}
    />
  );
};

export default SiteBackdrop;
