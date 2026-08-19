// ==============================|| OVERRIDES - TAB ||============================== //

export default function Tab(theme) {
  return {
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 40,
          fontSize: '0.78rem',
          fontWeight: 650,
          textTransform: 'none',
          color: theme.palette.text.primary,
          borderRadius: 4,
          '&:hover': {
            color: theme.palette.primary.main
          },
          '&:focus-visible': {
            borderRadius: 4,
            outline: `2px solid ${theme.palette.secondary.dark}`,
            outlineOffset: -3
          },
          '& svg.MuiTab-iconWrapper': {
            width: 18,
            height: 18
          }
        }
      }
    }
  };
}
