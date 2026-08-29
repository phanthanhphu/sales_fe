import { Box, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Delete, Edit, OpenInNew } from '@mui/icons-material';
import { formatDateTime } from './orderUi';
import StatusBadge from '../../components/StatusBadge';
import EmptyTableState from '../../components/EmptyTableState';
import SortableTableCell from '../../components/SortableTableCell';

export default function OrderTable({ rows, loading, onOpen, onEdit, onDelete, actionsDisabled = false, embedded = false, page = 0, pageSize = 25, sortKey = 'updatedAt', sortDirection = 'desc', onSort }) {
  const blockedMessage = 'Sales permission is required to modify orders.';
  const columns = [
    { label: 'No.', sortable: false },
    { label: 'Order No', key: 'orderNo' },
    { label: 'Style', key: 'style' },
    { label: 'Customer', key: 'customer' },
    { label: 'Season', key: 'season' },
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
            {!loading && rows.map((row, index) => (
              <TableRow hover key={row.id} data-order-row-id={row.id} sx={{ scrollMarginTop: 96, '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#FAFCFF' } }}>
                <TableCell align="center" sx={{ width: 56, color: '#64748b', fontWeight: 650 }}>{page * pageSize + index + 1}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#103B5C', whiteSpace: 'nowrap' }}>{row.orderNo}</TableCell>
                <TableCell>{row.style}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.season}</TableCell>
                <TableCell><StatusBadge status={row.status || 'DRAFT'} label={['MPR_DRAFT', 'MPR_IN_PROGRESS'].includes(row.status) ? 'MPR IN PROGRESS' : undefined} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.updatedAt)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Open order"><IconButton size="small" color="primary" onClick={() => onOpen(row)}><OpenInNew fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={actionsDisabled ? blockedMessage : 'Edit'}><span><IconButton size="small" disabled={actionsDisabled} onClick={() => onEdit(row)}><Edit fontSize="small" /></IconButton></span></Tooltip>
                  <Tooltip title={actionsDisabled ? blockedMessage : 'Delete'}><span><IconButton size="small" color="error" disabled={actionsDisabled} onClick={() => onDelete(row)}><Delete fontSize="small" /></IconButton></span></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
