import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import {
  ArrowDownward,
  ArrowUpward,
  Delete,
  Edit,
  Inbox as InboxIcon,
  Refresh
} from '@mui/icons-material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const compareValue = (row, column) => {
  const value = column.sortValue ? column.sortValue(row) : row?.[column.key];
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();

  const stringValue = String(value).trim();
  const date = new Date(stringValue);
  if (column.isDate && !Number.isNaN(date.getTime())) return date.getTime();

  return stringValue.toLocaleLowerCase();
};

export const SortIndicator = ({ active, direction }) => {
  if (!active) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.25, lineHeight: 0 }}>
        <ArrowUpward sx={{ fontSize: '0.7rem', color: '#9ca3af' }} />
        <ArrowDownward sx={{ fontSize: '0.7rem', color: '#9ca3af', mt: '-4px' }} />
      </Box>
    );
  }

  return direction === 'asc' ? (
    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.25, lineHeight: 0 }}>
      <ArrowUpward sx={{ fontSize: '0.85rem', color: '#4b5563' }} />
      <ArrowDownward sx={{ fontSize: '0.7rem', color: '#d1d5db', mt: '-4px' }} />
    </Box>
  ) : (
    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 0.25, lineHeight: 0 }}>
      <ArrowUpward sx={{ fontSize: '0.7rem', color: '#d1d5db' }} />
      <ArrowDownward sx={{ fontSize: '0.85rem', color: '#4b5563', mt: '-4px' }} />
    </Box>
  );
};

export function PaginationBar({ count, page, rowsPerPage, loading, onPageChange, onRowsPerPageChange }) {
  const totalPages = Math.max(1, Math.ceil((count || 0) / Math.max(rowsPerPage || 1, 1)));
  const from = count === 0 ? 0 : page * rowsPerPage + 1;
  const to = Math.min(count || 0, (page + 1) * rowsPerPage);

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 1,
        px: 1.25,
        py: 0.9,
        borderRadius: 1.5,
        border: '1px solid #e5e7eb',
        backgroundColor: '#fff'
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
      >
        <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
          Showing <span style={{ color: '#111827' }}>{from}</span>–<span style={{ color: '#111827' }}>{to}</span> of{' '}
          <span style={{ color: '#111827' }}>{count || 0}</span>
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
          <Button
            variant="text"
            startIcon={<ChevronLeftIcon fontSize="small" />}
            disabled={loading || page <= 0}
            onClick={() => onPageChange(page - 1)}
            sx={{ textTransform: 'none', fontWeight: 400 }}
          >
            Prev
          </Button>
          <Pagination
            size="small"
            page={page + 1}
            count={totalPages}
            onChange={(_, nextPage) => onPageChange(nextPage - 1)}
            disabled={loading}
            siblingCount={1}
            boundaryCount={1}
            sx={{ '& .MuiPaginationItem-root': { fontSize: '0.8rem', minWidth: 32, height: 32 } }}
          />
          <Button
            variant="text"
            endIcon={<ChevronRightIcon fontSize="small" />}
            disabled={loading || page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            sx={{ textTransform: 'none', fontWeight: 400 }}
          >
            Next
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>Page size</Typography>
          <Select
            size="small"
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            disabled={loading}
            sx={{ height: 32, minWidth: 110, borderRadius: 1.2, '& .MuiSelect-select': { fontSize: '0.8rem' } }}
          >
            {[10, 25, 50, 100].map((number) => (
              <MenuItem key={number} value={number} sx={{ fontSize: '0.8rem' }}>
                {number} / page
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Stack>
    </Paper>
  );
}

export default function MasterDataTable({
  config,
  rows = [],
  loading,
  page,
  rowsPerPage,
  totalElements,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onRefresh,
  actionsDisabled = false
}) {
  const [sort, setSort] = useState({ key: '', direction: '' });
  const columns = config.columns || [];

  const sortedRows = useMemo(() => {
    if (!sort.key || !sort.direction) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;

    const direction = sort.direction === 'desc' ? -1 : 1;

    return rows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const a = compareValue(left.row, column);
        const b = compareValue(right.row, column);

        let result;
        if (typeof a === 'number' && typeof b === 'number') {
          result = a - b;
        } else {
          result = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
        }

        return result === 0 ? left.index - right.index : result * direction;
      })
      .map((item) => item.row);
  }, [columns, rows, sort]);

  const changeSort = (column) => {
    if (column.sortable === false || column.key === 'actions' || column.key === 'no') return;

    setSort((current) => {
      if (current.key !== column.key) return { key: column.key, direction: 'asc' };
      if (current.direction === 'asc') return { key: column.key, direction: 'desc' };
      return { key: '', direction: '' };
    });
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid #e5e7eb', overflow: 'hidden', backgroundColor: '#fff' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={{ px: 1.5, py: 1.15, borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}
      >
        <Box>
          <Typography sx={{ fontWeight: 650, fontSize: '0.98rem' }}>{config.menuTitle} List</Typography>
          <Typography sx={{ mt: 0.1, fontSize: '0.75rem', color: 'text.secondary' }}>
            {loading ? 'Loading records…' : `${totalElements || 0} record(s)`}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={loading ? <CircularProgress size={14} /> : <Refresh fontSize="small" />}
          disabled={loading}
          onClick={onRefresh}
          sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, textTransform: 'none', borderRadius: 1.2 }}
        >
          Refresh
        </Button>
      </Stack>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 370px)', minHeight: 290 }}>
        <Table stickyHeader size="small" sx={{ minWidth: config.minTableWidth || 980 }}>
          <TableHead>
            <TableRow>
              <TableCell
                align="center"
                sx={{ width: 54, px: 0.7, py: 0.8, fontWeight: 800, fontSize: '0.75rem', backgroundColor: '#f9fafb', color: '#374151', borderBottom: '1px solid #e5e7eb' }}
              >
                No
              </TableCell>
              {columns.map((column) => {
                const active = sort.key === column.key;
                return (
                  <TableCell
                    key={column.key}
                    align={column.align || 'left'}
                    onClick={() => changeSort(column)}
                    sx={{
                      minWidth: column.minWidth || 130,
                      px: 0.75,
                      py: 0.8,
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      backgroundColor: '#f9fafb',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      cursor: column.sortable === false ? 'default' : 'pointer',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      display: column.hideOnSmall ? { xs: 'none', md: 'table-cell' } : 'table-cell'
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent={column.align === 'center' ? 'center' : 'flex-start'}>
                      <span>{column.label}</span>
                      {column.sortable !== false && <SortIndicator active={active} direction={sort.direction} />}
                    </Stack>
                  </TableCell>
                );
              })}
              <TableCell
                align="center"
                sx={{ minWidth: 96, px: 0.75, py: 0.8, fontWeight: 800, fontSize: '0.75rem', backgroundColor: '#f9fafb', color: '#374151', borderBottom: '1px solid #e5e7eb' }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 2} sx={{ py: 5 }}>
                  <Stack alignItems="center" spacing={1}>
                    <CircularProgress size={28} />
                    <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary' }}>Loading {config.menuTitle}…</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ) : sortedRows.length > 0 ? (
              sortedRows.map((row, index) => (
                <TableRow key={row?.id || `${config.type}-${index}`} hover data-master-row-id={row?.id || ''} sx={{ scrollMarginTop: 96 }}>
                  <TableCell align="center" sx={{ py: 0.6, px: 0.7, color: '#6b7280', fontSize: '0.75rem' }}>
                    {page * rowsPerPage + index + 1}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                      sx={{
                        py: 0.6,
                        px: 0.75,
                        color: '#374151',
                        fontSize: '0.78rem',
                        verticalAlign: 'top',
                        maxWidth: column.maxWidth,
                        display: column.hideOnSmall ? { xs: 'none', md: 'table-cell' } : 'table-cell'
                      }}
                    >
                      {column.render ? column.render(row) : (row?.[column.key] ?? '-')}
                    </TableCell>
                  ))}
                  <TableCell align="center" sx={{ py: 0.45, px: 0.7 }}>
                    {(() => {
                      const locked = typeof config.isRecordLocked === 'function' && config.isRecordLocked(row);
                      const lockMessage = locked && typeof config.recordLockMessage === 'function'
                        ? config.recordLockMessage(row)
                        : '';
                      const actionLocked = locked || actionsDisabled;
                      const reason = actionsDisabled
                        ? 'Sales permission is required to modify master data.'
                        : (lockMessage || 'This record is locked.');
                      return (
                        <Stack direction="row" spacing={0.4} justifyContent="center">
                          <Tooltip title={actionLocked ? reason : `Edit ${config.singular}`} arrow>
                            <span>
                              <IconButton
                                color="primary"
                                size="small"
                                disabled={actionLocked}
                                sx={{ p: 0.25 }}
                                onClick={() => onEdit?.(row)}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={actionLocked ? reason : `Delete ${config.singular}`} arrow>
                            <span>
                              <IconButton
                                color="error"
                                size="small"
                                disabled={actionLocked}
                                sx={{ p: 0.25 }}
                                onClick={() => onDelete?.(row)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + 2} sx={{ py: 5 }}>
                  <Stack direction="column" alignItems="center" spacing={0.5} sx={{ color: 'text.secondary' }}>
                    <InboxIcon sx={{ fontSize: 32, opacity: 0.55 }} />
                    <Typography sx={{ fontSize: '0.85rem' }}>No {config.menuTitle} Found</Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider />
      <Box sx={{ p: 1, backgroundColor: '#fff' }}>
        <PaginationBar
          count={totalElements}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={loading}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      </Box>
    </Paper>
  );
}
