import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, Paper, Select, Snackbar, Stack, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { createOrder, deleteOrder, getApiError, listOrders, updateOrder } from '../../services/orderBomMprService';
import { canManageSales } from 'utils/accessControl';
import { buyerPath, getBuyerDefinition, normalizeBuyerKey } from 'utils/buyerContext';
import OrderFormDialog from './OrderFormDialog';
import OrderSearch from './OrderSearch';
import OrderTable from './OrderTable';

const emptyFilters = { keyword: '', season: '', status: '' };
const SALES_WRITE_MESSAGE = 'Sales permission is required to create, edit, or delete orders.';
const PAGE_SIZE_OPTIONS = [10, 25, 50];

const cssAttributeEscape = (value) => (
  typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(String(value || ''))
    : String(value || '').replace(/["\\]/g, '\\$&')
);

const responseRecordId = (response) => {
  const candidates = [response, response?.data, response?.item, response?.result, response?.record].filter((item) => item && typeof item === 'object');
  for (const item of candidates) {
    if (item?.id) return String(item.id);
  }
  return '';
};

const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
const lastOf = (items = []) => items[items.length - 1];

const resolveCreatedOrderId = (created, rows = [], payload = {}) => {
  const directId = responseRecordId(created);
  if (directId) return directId;
  const matches = rows.filter((row) => (
    normalizeText(row?.orderNo) === normalizeText(payload.orderNo)
    && normalizeText(row?.style) === normalizeText(payload.style)
    && normalizeText(row?.customer) === normalizeText(payload.customer)
  ));
  return String((lastOf(matches) || lastOf(rows) || {})?.id || '');
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { buyerKey: routeBuyerKey } = useParams();
  const buyerKey = normalizeBuyerKey(routeBuyerKey);
  const buyer = getBuyerDefinition(buyerKey);
  const canWrite = canManageSales();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [formRecord, setFormRecord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const scrollTargetRef = useRef('');

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message });
  const load = useCallback(async (options = {}) => {
    const requestedPage = Number.isInteger(options.page) ? Math.max(0, options.page) : page;
    const requestedSize = Number.isInteger(options.size) ? options.size : pageSize;
    setLoading(true);
    try {
      const data = await listOrders({ ...applied, buyerKey, page: requestedPage, size: requestedSize, sortBy, sortDir: sortDirection });
      const nextRows = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
      setRows(nextRows);
      setTotalPages(Math.max(1, data?.totalPages || 1));
      setTotal(data?.totalElements || (Array.isArray(data) ? data.length : 0));
      return nextRows;
    } catch (error) {
      notify(getApiError(error, 'Unable to load orders.'), 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [applied, buyerKey, page, pageSize, sortBy, sortDirection]);

  useEffect(() => { load(); }, [load]);

  const scrollToCreatedOrder = useCallback((id) => {
    if (id) scrollTargetRef.current = `[data-order-row-id="${cssAttributeEscape(id)}"]`;
  }, []);

  useEffect(() => {
    if (loading || !scrollTargetRef.current || typeof document === 'undefined') return;
    const selector = scrollTargetRef.current;
    scrollTargetRef.current = '';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        const previousBoxShadow = element.style.boxShadow;
        const previousTransition = element.style.transition;
        element.style.transition = 'box-shadow 180ms ease';
        element.style.boxShadow = '0 0 0 3px rgba(16, 59, 92, 0.28)';
        window.setTimeout(() => {
          element.style.boxShadow = previousBoxShadow;
          element.style.transition = previousTransition;
        }, 1600);
      });
    });
  }, [loading, rows]);

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

    const isCreate = !formRecord?.id;

    setSaving(true);
    try {
      let savedOrder = null;
      const scopedPayload = isCreate ? { ...payload, orderNo: '', buyerKey } : { ...payload, buyerKey };
      if (isCreate) savedOrder = await createOrder(scopedPayload);
      else await updateOrder(formRecord.id, scopedPayload);
      setFormOpen(false);
      setFormRecord(null);
      notify('Order saved successfully.');
      const targetPage = isCreate ? 0 : page;
      if (isCreate && page !== 0) setPage(0);
      const nextRows = await load({ page: targetPage, size: pageSize });
      if (isCreate) {
        scrollToCreatedOrder(resolveCreatedOrderId(savedOrder, nextRows, scopedPayload));
      }
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

  const handleSort = useCallback((key) => {
    if (!key) return;
    setPage(0);
    if (sortBy === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortBy(key);
    setSortDirection('asc');
  }, [sortBy]);

  const pageStart = total === 0 ? 0 : page * pageSize + 1;
  const pageEnd = Math.min(total, (page + 1) * pageSize);

  return (
    <Box sx={{ p: { xs: 0.55, sm: 0.7, md: 0.85 } }}>
      <Paper elevation={0} sx={{ border: '1px solid #dfe6ee', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
        <OrderSearch
          embedded
          filters={filters}
          loading={loading}
          actionsDisabled={!canWrite}
          onChange={(name, value) => setFilters((current) => ({ ...current, [name]: value }))}
          onSearch={() => { setApplied(filters); setPage(0); }}
          onReset={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(0); }}
          onAdd={openAdd}
        />

        <OrderTable
          embedded
          rows={rows}
          loading={loading}
          page={page}
          pageSize={pageSize}
          actionsDisabled={!canWrite}
          sortKey={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          onOpen={(row) => navigate(buyerPath(buyerKey, `orders/${row.id}`))}
          onEdit={openEdit}
          onDelete={requestDelete}
        />

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.0}
          sx={{ p: 0.7, borderTop: '1px solid #E5E7EB', bgcolor: '#fbfcfe' }}
        >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Typography sx={{ fontSize: '0.84rem', color: 'text.secondary', fontWeight: 600 }}>
            Showing {pageStart}-{pageEnd} of {total} orders
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Rows per page</Typography>
            <Select
              size="small"
              value={pageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value || 25);
                setPageSize(nextSize);
                setPage(0);
              }}
              sx={{ minWidth: 88, height: 34 }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </Stack>
        </Stack>

        <Pagination
          page={page + 1}
          count={totalPages}
          color="primary"
          shape="rounded"
          onChange={(_, next) => setPage(next - 1)}
        />
        </Stack>
      </Paper>

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
