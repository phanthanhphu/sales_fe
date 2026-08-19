import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';

import { createTheme, ThemeProvider, StyledEngineProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import Palette from './palette';
import Typography from './typography';
import CustomShadows from './shadows';
import componentsOverride from './overrides';

import { HEADER_HEIGHT } from 'config';
import { getLayoutColorPreset, getSavedLayoutColorId } from 'utils/layoutColor';

export default function ThemeCustomization({ children }) {
  const [layoutColorId, setLayoutColorId] = useState(getSavedLayoutColorId);

  useEffect(() => {
    const handleLayoutColorChanged = (event) => setLayoutColorId(event?.detail?.id || getSavedLayoutColorId());
    window.addEventListener('layout-color:changed', handleLayoutColorChanged);
    return () => window.removeEventListener('layout-color:changed', handleLayoutColorChanged);
  }, []);

  const theme = useMemo(() => Palette('light', layoutColorId), [layoutColorId]);
  const layoutColor = useMemo(() => getLayoutColorPreset(layoutColorId), [layoutColorId]);
  const themeTypography = useMemo(
    () => Typography('Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'),
    []
  );
  const themeCustomShadows = useMemo(() => CustomShadows(theme), [theme]);

  const themeOptions = useMemo(
    () => ({
      breakpoints: {
        values: {
          xs: 0,
          sm: 768,
          md: 1024,
          lg: 1266,
          xl: 1440
        }
      },
      direction: 'ltr',
      mixins: {
        toolbar: {
          minHeight: HEADER_HEIGHT,
          paddingTop: 8,
          paddingBottom: 8
        }
      },
      palette: theme.palette,
      shape: {
        borderRadius: 8
      },
      customShadows: themeCustomShadows,
      typography: themeTypography,
      layoutColor
    }),
    [theme, themeTypography, themeCustomShadows, layoutColor]
  );

  const themes = useMemo(() => {
    const nextTheme = createTheme(themeOptions);
    nextTheme.components = componentsOverride(nextTheme);
    return nextTheme;
  }, [themeOptions]);

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themes}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

ThemeCustomization.propTypes = { children: PropTypes.node };
