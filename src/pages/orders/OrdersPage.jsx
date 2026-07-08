import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Pagination, Snackbar, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { createOrder, deleteOrder, getApiError, listOrders, updateOrder } from '../../services/orderBomMprService';
import { canManageSales } from 'utils/accessControl';
import OrderFormDialog from './OrderFormDialog';
import OrderSearch from './OrderSearch';
import OrderTable from './OrderTable';

const emptyFilters = { keyword: '', season: '', status: '' };
const SALES_WRITE_MESSAGE = 'Sales permission is required to create, edit, or delete orders.';

export default function OrdersPage() {
  const navigate = useNavigate();
  const canWrite = canManageSales();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formRecord, setFormRecord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOrders({ ...applied, page, size: 25 });
      setRows(Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []);
      setTotalPages(Math.max(1, data?.totalPages || 1));
      setTotal(data?.totalElements || (Array.isArray(data) ? data.length : 0));
    } catch (error) {
      notify(getApiError(error, 'Unable to load orders.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    if (!canWrite) {
      notify(SALES_WRITE_MESSAGE, 'warning');
      return;
    }
    setFormRecord(null);
    setFormOpen(true);
  };

  const openEdit = (record) => {
    if (!canWrite) {
      notify(SALES_WRITE_MESSAGE, 'warning');
      return;
    }
    setFormRecord(record);
    setFormOpen(true);
  };

  const requestDelete = (record) => {
    if (!canWrite) {
      notify(SALES_WRITE_MESSAGE, 'warning');
      return;
    }
    setDeleteTarget(record);
  };

  const save = async (payload) => {
    if (!canWrite) {
      notify(SALES_WRITE_MESSAGE, 'warning');
      return;
    }

    setSaving(true);
    try {
      if (formRecord?.id) await updateOrder(formRecord.id, payload);
      else await createOrder(payload);
      setFormOpen(false);
      setFormRecord(null);
      notify('Order saved successfully.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to save order.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!canWrite || !deleteTarget?.id) return;
    try {
      await deleteOrder(deleteTarget.id);
      setDeleteTarget(null);
      notify('Order deleted successfully.');
      if (rows.length === 1 && page > 0) setPage((current) => current - 1);
      else await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete order.'), 'error');
    }
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 950, color: '#103B5C' }}>Order Management</Typography>
        <Typography sx={{ mt: 0.35, color: 'text.secondary' }}>Create orders, then open an order to manage BOM and Sales / MPR.</Typography>
      </Box>

      <OrderSearch
        filters={filters}
        loading={loading}
        actionsDisabled={!canWrite}
        onChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))}
        onSearch={() => { setApplied(filters); setPage(0); }}
        onReset={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(0); }}
        onAdd={openAdd}
      />

      <OrderTable
        rows={rows}
        loading={loading}
        actionsDisabled={!canWrite}
        onOpen={(row) => navigate(`/orders/${row.id}`)}
        onEdit={openEdit}
        onDelete={requestDelete}
      />

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Total: {total}</Typography>
        <Pagination page={page + 1} count={totalPages} onChange={(_, next) => setPage(next - 1)} />
      </Stack>

      <OrderFormDialog
        open={canWrite && formOpen}
        record={formRecord}
        saving={saving}
        onClose={() => { setFormOpen(false); setFormRecord(null); }}
        onSave={save}
      />

      <Dialog open={canWrite && Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Order?</DialogTitle>
        <DialogContent>
          <Typography>Delete <strong>{deleteTarget?.orderNo}</strong>? This only works when there is no BOM or MPR linked to the order.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} sx={{ textTransform: 'none' }}>Delete</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={3500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
