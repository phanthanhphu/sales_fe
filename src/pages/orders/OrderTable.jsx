import { Chip, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { Delete, Edit, OpenInNew } from '@mui/icons-material';
import { formatDateTime, statusSx } from './orderUi';

export default function OrderTable({ rows, loading, onOpen, onEdit, onDelete, actionsDisabled = false }) {
  const blockedMessage = 'Sales permission is required to modify orders.';

  return (
    <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 620 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['Order No', 'Style', 'Customer', 'Season', 'Status', 'Updated At', 'Actions'].map((head) => (
                <TableCell key={head} sx={{ fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>{head}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={7}><Typography sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>Loading orders...</Typography></TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={7}><Typography sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>No orders found.</Typography></TableCell></TableRow>}
            {!loading && rows.map((row) => (
              <TableRow hover key={row.id} data-order-row-id={row.id} sx={{ scrollMarginTop: 96, '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontWeight: 800, color: '#103B5C' }}>{row.orderNo}</TableCell>
                <TableCell>{row.style}</TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>{row.season}</TableCell>
                <TableCell><Chip label={String(row.status || 'DRAFT').replaceAll('_', ' ')} sx={statusSx(row.status)} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.updatedAt)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="Open order"><IconButton color="primary" onClick={() => onOpen(row)}><OpenInNew fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={actionsDisabled ? blockedMessage : 'Edit'}>
                    <span><IconButton disabled={actionsDisabled} onClick={() => onEdit(row)}><Edit fontSize="small" /></IconButton></span>
                  </Tooltip>
                  <Tooltip title={actionsDisabled ? blockedMessage : 'Delete'}>
                    <span><IconButton color="error" disabled={actionsDisabled} onClick={() => onDelete(row)}><Delete fontSize="small" /></IconButton></span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
