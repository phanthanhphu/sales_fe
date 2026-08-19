export default function Table() {
  const GRID = '#d8e1ea';
  return {
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
          '& .MuiTableCell-root': {
            borderRight: `1px solid ${GRID}`,
            borderBottom: `1px solid ${GRID}`
          },
          '& .MuiTableRow-root > .MuiTableCell-root:first-of-type': {
            borderLeft: `1px solid ${GRID}`
          },
          '& .MuiTableHead-root .MuiTableRow-root:first-of-type > .MuiTableCell-root': {
            borderTop: `1px solid ${GRID}`
          }
        }
      }
    }
  };
}
