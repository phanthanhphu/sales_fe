import { alpha, darken, lighten } from '@mui/material/styles';
import Default from './default';
import { DEFAULT_LAYOUT_COLOR_ID, getLayoutColorPreset } from 'utils/layoutColor';

export default function LayoutAccent(presetColor, mode) {
  const base = Default(mode);
  const preset = getLayoutColorPreset(presetColor);

  if (preset.id === DEFAULT_LAYOUT_COLOR_ID) return base;

  const main = preset.primaryMain;
  base.primary = {
    lighter: alpha(main, 0.1),
    100: alpha(main, 0.2),
    200: alpha(main, 0.35),
    light: lighten(main, 0.22),
    400: lighten(main, 0.08),
    main,
    dark: darken(main, 0.08),
    700: darken(main, 0.15),
    darker: darken(main, 0.22),
    900: darken(main, 0.3),
    contrastText: '#fff'
  };

  return base;
}
