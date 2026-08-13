// ==============================|| OVERRIDES - CARD CONTENT ||============================== //

export default function CardContent() {
  return {
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 16,
          '&:last-child': {
            paddingBottom: 16
          }
        }
      }
    }
  };
}
