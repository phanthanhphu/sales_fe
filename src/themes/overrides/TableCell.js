export default function TableCell() {
  return {
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 12px'
        },
        sizeSmall: {
          padding: '8px 10px'
        },
        head: {
          paddingTop: 8,
          paddingBottom: 8,
          fontWeight: 800
        }
      }
    }
  };
}
