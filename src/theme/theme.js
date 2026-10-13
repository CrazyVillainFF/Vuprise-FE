import { alpha, createTheme } from '@mui/material/styles';

/** Vuprise monochrome palette: semantic states use contrast and labels, never hue. */
export const getDesignTokens = (mode) => {
  const light = mode === 'light';
  const foreground = light ? '#000000' : '#FFFFFF';
  const background = light ? '#FFFFFF' : '#000000';
  const border = alpha(foreground, light ? 0.16 : 0.2);
  const shadow = light ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.08)';

  return {
    palette: {
      mode,
      primary: { main: foreground, light: alpha(foreground, 0.72), dark: foreground, contrastText: background },
      secondary: { main: foreground, light: alpha(foreground, 0.72), dark: foreground, contrastText: background },
      success: { main: foreground },
      error: { main: light ? '#B3261E' : '#FF6B6B', light: light ? '#D44A42' : '#FF9999', dark: light ? '#8C1D18' : '#D93D46', contrastText: '#FFFFFF' },
      warning: { main: light ? '#C85A00' : '#FF9D42', light: light ? '#E87516' : '#FFB66E', dark: light ? '#914000' : '#D9791D', contrastText: '#000000' },
      info: { main: foreground },
      background: { default: background, paper: background, subtle: alpha(foreground, 0.035), elevated: background },
      text: { primary: foreground, secondary: alpha(foreground, 0.68), disabled: alpha(foreground, 0.38) },
      divider: border,
      action: {
        active: alpha(foreground, 0.72),
        hover: alpha(foreground, 0.055),
        selected: alpha(foreground, 0.1),
        focus: alpha(foreground, 0.18),
        disabled: alpha(foreground, 0.3),
        disabledBackground: alpha(foreground, 0.12),
      },
    },
    typography: {
      fontFamily: '"Aptos", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      h1: { fontWeight: 750, letterSpacing: '-0.045em', lineHeight: 1.04 }, h2: { fontWeight: 740, letterSpacing: '-0.035em', lineHeight: 1.12 }, h3: { fontWeight: 720, letterSpacing: '-0.03em', lineHeight: 1.18 }, h4: { fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.22 }, h5: { fontWeight: 700, letterSpacing: '-0.018em', lineHeight: 1.28 }, h6: { fontWeight: 700, letterSpacing: '-0.012em', lineHeight: 1.34 },
      subtitle1: { fontWeight: 650 }, subtitle2: { fontWeight: 650 }, body1: { fontSize: '0.975rem', lineHeight: 1.62 }, body2: { fontSize: '0.875rem', lineHeight: 1.56 }, button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0' }, caption: { lineHeight: 1.45 },
    },
    shape: { borderRadius: 10 },
    shadows: ['none', `0 1px 2px ${shadow}`, `0 3px 10px ${shadow}`, `0 12px 30px ${shadow}`, ...Array(21).fill(`0 16px 38px ${shadow}`)],
    components: {
      MuiCssBaseline: { styleOverrides: {
        '*': { boxSizing: 'border-box' }, html: { scrollBehavior: 'smooth', colorScheme: mode },
        body: { margin: 0, color: foreground, backgroundColor: background, scrollbarColor: `${alpha(foreground, 0.24)} transparent`, '&::-webkit-scrollbar, & *::-webkit-scrollbar': { width: 8, height: 8 }, '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': { borderRadius: 8, backgroundColor: alpha(foreground, 0.24) } },
        '::selection': { color: background, backgroundColor: foreground },
        '@media (prefers-reduced-motion: reduce)': { '*, *::before, *::after': { scrollBehavior: 'auto !important', transitionDuration: '0.01ms !important', animationDuration: '0.01ms !important' } },
      } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
        root: { minHeight: 40, borderRadius: 8, padding: '8px 16px', transition: 'background-color .18s ease, border-color .18s ease, transform .18s ease', '&:active': { transform: 'translateY(1px)' }, '&:focus-visible': { outline: `2px solid ${foreground}`, outlineOffset: 2 } },
        sizeLarge: { minHeight: 48, padding: '11px 20px' },
        containedPrimary: { color: background, backgroundColor: foreground, '&:hover': { color: background, backgroundColor: alpha(foreground, 0.82) } },
        outlined: { borderColor: border, '&:hover': { borderColor: foreground, backgroundColor: alpha(foreground, 0.05) } },
      } },
      MuiCard: { styleOverrides: { root: { borderRadius: 12, border: `1px solid ${border}`, backgroundColor: background, backgroundImage: 'none', boxShadow: `0 1px 2px ${shadow}`, transition: 'border-color .2s ease, box-shadow .2s ease, transform .2s ease' } } },
      MuiPaper: { styleOverrides: { root: { color: foreground, backgroundColor: background, backgroundImage: 'none' } } },
      MuiTextField: { styleOverrides: { root: { '& .MuiInputLabel-root': { fontWeight: 600 }, '& .MuiOutlinedInput-root': { color: foreground, borderRadius: 8, backgroundColor: background, transition: 'box-shadow .18s ease, border-color .18s ease', '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(foreground, 0.5) }, '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(foreground, 0.16)}` }, '& .MuiOutlinedInput-notchedOutline': { borderColor: border } } } } },
      MuiTabs: { styleOverrides: { indicator: { height: 3, borderRadius: 3, backgroundColor: foreground }, root: { minHeight: 52 }, flexContainer: { gap: 8 } } },
      MuiTab: { styleOverrides: { root: { color: alpha(foreground, 0.65), minHeight: 52, borderRadius: 7, minWidth: 'auto', paddingInline: 14, '&.Mui-selected': { color: foreground, fontWeight: 750 } } } },
      MuiChip: { styleOverrides: { root: { color: foreground, borderRadius: 6, fontWeight: 650, border: `1px solid ${border}`, backgroundColor: alpha(foreground, 0.06) }, filledPrimary: { color: background, borderColor: 'transparent', backgroundColor: foreground } } },
      MuiDialog: { styleOverrides: { paper: { color: foreground, backgroundColor: background, backgroundImage: 'none', borderRadius: 14, border: `1px solid ${border}` } } },
      MuiMenu: { styleOverrides: { paper: { color: foreground, backgroundColor: background, borderRadius: 10, border: `1px solid ${border}`, boxShadow: `0 14px 34px ${shadow}` } } },
      MuiAlert: { styleOverrides: { root: { color: foreground, backgroundColor: alpha(foreground, 0.07), border: `1px solid ${border}`, borderRadius: 8, alignItems: 'center' }, icon: { color: foreground } } },
    },
  };
};

export const createAppTheme = (mode) => createTheme(getDesignTokens(mode));
