export default function TableCell() {
  return {
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '6px 8px',
          borderColor: '#d8e1ea',
          // Cell grid lines are completed by the MuiTable override so every table has clear all-borders.
        },
        sizeSmall: {
          padding: '5px 7px'
        },
        head: {
          paddingTop: 6,
          paddingBottom: 6,
          fontSize: '0.72rem',
          letterSpacing: '0.01em',
          fontWeight: 700,
          color: '#334155',
          backgroundColor: '#f8fafc'
        }
      }
    }
  };
}
