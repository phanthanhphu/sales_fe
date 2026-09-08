import { Box, Chip, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Delete, Edit, OpenInNew, WarningAmber } from '@mui/icons-material';
import { formatDate, formatDateTime, getOrderOverdueDays } from './orderUi';
import StatusBadge from '../../components/StatusBadge';
import EmptyTableState from '../../components/EmptyTableState';
import SortableTableCell from '../../components/SortableTableCell';

export default function OrderTable({ rows, loading, onOpen, onEdit, onDelete, actionsDisabled = false, embedded = false, page = 0, pageSize = 25, sortKey = 'updatedAt', sortDirection = 'desc', onSort }) {
  const blockedMessage = 'Sales permission is required to modify orders.';
  const columns = [
    { label: 'No.', sortable: false },
    { label: 'Order No', key: 'orderNo' },
    { label: 'Order Name', key: 'orderName' },
    { label: 'Start Date', key: 'startDate' },
    { label: 'End Date', key: 'endDate' },
    { label: 'Status', key: 'status' },
    { label: 'Updated At', key: 'updatedAt' },
    { label: 'Actions', sortable: false }
  ];

  return (
    <Box sx={{ border: embedded ? 0 : '1px solid #e5e7eb', borderRadius: embedded ? 0 : 2, overflow: 'hidden', bgcolor: '#FFFFFF' }}>
      <TableContainer sx={{ maxHeight: 620 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <SortableTableCell
                  key={column.label}
                  label={column.label}
                  columnKey={column.key}
                  sortable={column.sortable !== false}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={onSort}
                  sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#40566d', backgroundColor: '#F8FAFC', whiteSpace: 'nowrap' }}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={8}><Typography sx={{ py: 2.5, textAlign: 'center', color: 'text.secondary' }}>Loading orders...</Typography></TableCell></TableRow>}
            {!loading && rows.length === 0 && <EmptyTableState colSpan={8} title="No orders found" description="" />}
            {!loading && rows.map((row, index) => {
              const overdueDays = getOrderOverdueDays(row.endDate, row.status);
              const overdue = overdueDays > 0;
              const overdueMessage = `End Date passed ${overdueDays} day${overdueDays === 1 ? '' : 's'} ago.`;

              return (
                <TableRow
                  hover
                  key={row.id}
                  data-order-row-id={row.id}
                  sx={{
                    scrollMarginTop: 96,
                    bgcolor: overdue ? '#FFF7F7' : undefined,
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover': { bgcolor: overdue ? '#FFF1F2' : '#FAFCFF' }
                  }}
                >
                  <TableCell align="center" sx={{ width: 56, color: '#64748b', fontWeight: 650 }}>{page * pageSize + index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#103B5C', whiteSpace: 'nowrap' }}>{row.orderNo}</TableCell>
                  <TableCell>{row.orderName || '—'}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(row.startDate)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: overdue ? 800 : 400, color: overdue ? '#B91C1C' : 'inherit' }}>
                        {formatDate(row.endDate)}
                      </Typography>
                      {overdue && (
                        <Tooltip title={overdueMessage}>
                          <Chip
                            size="small"
                            icon={<WarningAmber sx={{ fontSize: '14px !important' }} />}
                            label="OVERDUE"
                            sx={{
                              height: 22,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#B91C1C',
                              bgcolor: '#FEE2E2',
                              border: '1px solid #FECACA',
                              '& .MuiChip-icon': { color: '#DC2626' }
                            }}
                          />
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell><StatusBadge status={row.status || 'DRAFT'} label={['MPR_DRAFT', 'MPR_IN_PROGRESS'].includes(row.status) ? 'MPR IN PROGRESS' : undefined} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.updatedAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Open order"><IconButton size="small" color="primary" onClick={() => onOpen(row)}><OpenInNew fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={actionsDisabled ? blockedMessage : 'Edit'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onEdit(row)}><Edit fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title={actionsDisabled ? blockedMessage : 'Delete'}><span><IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(row)}><Delete fontSize="small" /></IconButton></span></Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
