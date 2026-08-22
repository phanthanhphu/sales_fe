import { TableCell, TableSortLabel } from '@mui/material';

export default function SortableTableCell({
  label,
  columnKey,
  sortKey,
  sortDirection = 'asc',
  onSort,
  sortable = true,
  children,
  ...cellProps
}) {
  const active = sortable && sortKey === columnKey;
  const content = children ?? label;

  return (
    <TableCell {...cellProps} sortDirection={active ? sortDirection : false}>
      {sortable ? (
        <TableSortLabel
          active={active}
          direction={active ? sortDirection : 'asc'}
          onClick={() => onSort?.(columnKey)}
          hideSortIcon={false}
          sx={{
            width: '100%',
            cursor: 'pointer',
            color: active ? '#103B5C' : 'inherit',
            fontWeight: active ? 800 : 'inherit',
            '& .MuiTableSortLabel-icon': {
              fontSize: '1rem',
              opacity: active ? 1 : 0.38,
              color: active ? '#103B5C !important' : '#7B8EA3 !important'
            },
            '&:hover': { color: '#103B5C' },
            '&:hover .MuiTableSortLabel-icon': { opacity: 0.85 },
            '&.Mui-active': { color: '#103B5C' }
          }}
        >
          {content}
        </TableSortLabel>
      ) : content}
    </TableCell>
  );
}
