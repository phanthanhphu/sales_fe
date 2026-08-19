// ==============================|| ENTERPRISE TYPOGRAPHY ||============================== //

export default function Typography(fontFamily) {
  return {
    htmlFontSize: 16,
    fontFamily,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.22,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.28,
      letterSpacing: '-0.015em'
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.32,
      letterSpacing: '-0.01em'
    },
    h4: {
      fontWeight: 700,
      fontSize: '1.125rem',
      lineHeight: 1.38
    },
    h5: {
      fontWeight: 700,
      fontSize: '1rem',
      lineHeight: 1.45
    },
    h6: {
      fontWeight: 700,
      fontSize: '0.875rem',
      lineHeight: 1.5
    },
    body1: {
      fontSize: '0.8125rem',
      lineHeight: 1.52,
      fontWeight: 400
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
      fontWeight: 400
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 650,
      lineHeight: 1.45
    },
    subtitle2: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.5
    },
    caption: {
      fontWeight: 400,
      fontSize: '0.6875rem',
      lineHeight: 1.5
    },
    overline: {
      fontWeight: 700,
      fontSize: '0.6875rem',
      lineHeight: 1.45,
      letterSpacing: '0.04em'
    },
    button: {
      fontSize: '0.75rem',
      fontWeight: 650,
      lineHeight: 1.35,
      textTransform: 'none',
      letterSpacing: 0
    }
  };
}
