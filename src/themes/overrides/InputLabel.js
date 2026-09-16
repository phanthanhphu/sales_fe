// ==============================|| OVERRIDES - INPUT LABEL ||============================== //

export default function InputLabel(theme) {
  return {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: theme.palette.secondary.main,
          fontSize: '0.82rem',
          fontWeight: 650
        },
        outlined: {
          // Keep the unshrunk label on the same vertical content line as
          // OutlinedInput. OutlinedInput uses 9px vertical padding normally
          // and 6px for size="small" in this project.
          lineHeight: '1.4375em',
          '&[data-shrink="false"]': {
            transform: 'translate(14px, 9px) scale(1)'
          },
          '&.MuiInputLabel-sizeSmall[data-shrink="false"]': {
            transform: 'translate(14px, 6px) scale(1)'
          },
          '&.MuiInputLabel-shrink': {
            background: theme.palette.background.paper,
            padding: '0 8px',
            marginLeft: -6,
            lineHeight: '1.4375em'
          }
        }
      }
    }
  };
}
