import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Paper,
  Snackbar,
  Stack,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { Add, Delete, FileUpload, OpenInNew, Publish, Refresh, RestartAlt, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { canManageBom } from 'utils/accessControl';
import {
  createBom,
  deleteBom,
  downloadWithAuth,
  getApiError,
  getBomExportUrl,
  listBoms,
  resubmitBom,
  submitBom
} from '../../services/orderBomMprService';
import { formatDateTime } from '../orders/orderUi';
import StatusBadge from '../../components/StatusBadge';
import EmptyTableState from '../../components/EmptyTableState';
import SortableTableCell from '../../components/SortableTableCell';
import useTableSort from '../../utils/useTableSort';
import { buyerPath, normalizeBuyerKey } from 'utils/buyerContext';
import BomCreateDialog from './BomCreateDialog';

const emptyFilters = {
  keyword: '',
  status: '',
  productColor: '',
  packingKey: ''
};

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();

const downloadDate = () => {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
};

const downloadFilePart = (value, fallback) => {
  const safe = String(value || fallback || '').trim()
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return safe || fallback;
};

const includes = (value, needle) => normalize(value).includes(normalize(needle));

const productColorNames = (bom = {}) => (
  Array.isArray(bom.productColors) && bom.productColors.length
    ? bom.productColors.map((item) => item?.colorName).filter(Boolean)
    : (bom.colors || [])
);

const bomMatchesFilters = (bom, filters) => {
  const keyword = String(filters.keyword || '').trim();
  const productColors = productColorNames(bom);
  const selectedColor = normalize(filters.productColor);
  const selectedPacking = String(filters.packingKey || '');

  if (keyword) {
    const searchable = [
      bom?.bomNo,
      bom?.bomName,
      bom?.sourceFileName,
      bom?.header?.buyer,
      bom?.header?.season,
      bom?.header?.styleNumber,
      bom?.header?.styleName,
      bom?.header?.patternNumber,
      ...productColors,
      ...(bom?.packings || []).map((packing) => packing?.packingName)
    ];
    if (!searchable.some((value) => includes(value, keyword))) return false;
  }

  if (filters.status && normalize(bom?.status) !== normalize(filters.status)) return false;
  if (selectedColor && !productColors.some((color) => normalize(color) === selectedColor)) return false;

  if (selectedPacking) {
    const [expectedBomId, expectedPackingId] = selectedPacking.split('::');
    if (String(bom?.id || '') !== expectedBomId
      || !(bom?.packings || []).some((packing) => String(packing?.id || '') === expectedPackingId)) {
      return false;
    }
  }

  return true;
};

const bomSortValue = (bom, key) => {
  if (key === 'colors') return productColorNames(bom).join(' ');
  if (key === 'packings') return (bom?.packings || []).length;
  return bom?.[key];
};

export default function BomTab({ order, buyerKey: buyerKeyProp }) {
  const buyerKey = normalizeBuyerKey(buyerKeyProp || order?.buyerKey);
  const navigate = useNavigate();
  // MPR completed for this order -> every BOM action is locked until it is reopened.
  const mprLocked = order?.status === 'MPR_COMPLETED';
  const canWrite = canManageBom() && !mprLocked;
  const writeBlockedMessage = mprLocked
    ? 'BOM is locked because the MPR for this order has been completed. Reopen the MPR to make changes.'
    : 'BOM permission is required to modify BOM data.';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message });

  const load = useCallback(async () => {
    if (!order?.id) return;
    setLoading(true);
    try {
      setRows(await listBoms(order.id));
    } catch (error) {
      notify(getApiError(error, 'Unable to load BOM list.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [order?.id]);

  useEffect(() => { load(); }, [load]);

  const productColorOptions = useMemo(() => {
    const values = new Map();
    rows.forEach((bom) => productColorNames(bom).forEach((name) => {
      const key = normalize(name);
      if (key) values.set(key, name);
    }));
    return Array.from(values, ([key, label]) => ({ key, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [rows]);

  const packingOptions = useMemo(() => (
    rows.flatMap((bom) => (bom?.packings || []).map((packing) => ({
      key: `${bom.id}::${packing.id}`,
      label: `${packing.packingName || 'Packing'} — ${bom.bomNo || 'BOM'}`
    }))).sort((left, right) => left.label.localeCompare(right.label))
  ), [rows]);

  const filteredRows = useMemo(
    () => rows.filter((bom) => bomMatchesFilters(bom, appliedFilters)),
    [rows, appliedFilters]
  );
  const { sortedRows: sortedFilteredRows, sortKey, sortDirection, requestSort } = useTableSort(filteredRows, { getValue: bomSortValue });

  const handleBomSort = useCallback((key) => {
    requestSort(key);
    setPage(0);
  }, [requestSort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedFilteredRows.slice(start, start + rowsPerPage);
  }, [sortedFilteredRows, page, rowsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredRows.length / rowsPerPage) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [filteredRows.length, page, rowsPerPage]);

  const create = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    setSaving(true);
    try {
      const bom = await createBom(order.id, payload);
      setAddOpen(false);
      notify('BOM created. Add materials and packings in the BOM detail screen.');
      navigate(buyerPath(buyerKey, `orders/${order.id}/boms/${bom.id}`));
    } catch (error) {
      notify(getApiError(error, 'Unable to create BOM.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (bom) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const returningToDraft = bom.status === 'SUBMITTED';
    try {
      const updated = returningToDraft
        ? await resubmitBom(bom.id)
        : await submitBom(bom.id);
      // Merge the server response immediately. For Resubmit this changes the row
      // from SUBMITTED -> DRAFT, so the next hover becomes "Submit BOM" and the
      // BOM disappears from Sales/MPR sources after that tab reloads.
      setRows((current) => current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
      notify(returningToDraft
        ? 'BOM returned to DRAFT. Update it and Submit again when ready.'
        : 'BOM submitted. Sales can now select it for MPR.');
      await load();
    } catch (error) {
      notify(getApiError(error, returningToDraft ? 'Unable to resubmit BOM.' : 'Unable to submit BOM.'), 'error');
    }
  };

  const remove = async () => {
    if (!canWrite || !deleteTarget?.id) return;
    try {
      await deleteBom(deleteTarget.id);
      setDeleteTarget(null);
      notify('BOM deleted.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to delete BOM.'), 'error');
    }
  };

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const applyFilter = () => { setAppliedFilters({ ...filters }); setPage(0); };
  const resetFilter = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(0);
  };

  return (
    <Box>
      {mprLocked && (
        <Alert severity="warning" sx={{ mx: 0.85, mt: 0.85 }}>
          This order's MPR has been completed, so all BOM actions are locked. Reopen the MPR to make changes.
        </Alert>
      )}
      <Box
        sx={{
          px: 0.85,
          py: 0.7,
          borderBottom: '1px solid #e5e7eb',
          bgcolor: '#fff',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 0.65
        }}
      >
        <TextField
          size="small"
          label="Keyword"
          value={filters.keyword}
          onChange={(event) => updateFilter('keyword', event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && applyFilter()}
          placeholder="BOM No, Style, Product Color..."
          sx={{ minWidth: { xs: '100%', md: 250 }, flex: 1, '& .MuiInputBase-root': { height: 34 } }}
        />
        <TextField size="small" select label="Status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} sx={{ minWidth: 145, '& .MuiInputBase-root': { height: 34 } }}>
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="DRAFT">Draft</MenuItem>
          <MenuItem value="SUBMITTED">Submitted</MenuItem>
        </TextField>
        <TextField size="small" select label="Product Color" value={filters.productColor} onChange={(event) => updateFilter('productColor', event.target.value)} sx={{ minWidth: 170, '& .MuiInputBase-root': { height: 34 } }}>
          <MenuItem value="">All Product Colors</MenuItem>
          {productColorOptions.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
        </TextField>
        <TextField size="small" select label="Packing" value={filters.packingKey} onChange={(event) => updateFilter('packingKey', event.target.value)} sx={{ minWidth: 185, '& .MuiInputBase-root': { height: 34 } }}>
          <MenuItem value="">All Packings</MenuItem>
          {packingOptions.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
        </TextField>
        <Button size="small" variant="contained" startIcon={<Search fontSize="small" />} onClick={applyFilter} disabled={loading} sx={{ textTransform: 'none', backgroundColor: '#103B5C', height: 34, minWidth: 82 }}>Search</Button>
        <Button size="small" variant="text" startIcon={<RestartAlt fontSize="small" />} onClick={resetFilter} disabled={loading} sx={{ textTransform: 'none', height: 34, color: '#52677d' }}>Reset</Button>
        <Box sx={{ flex: { xs: '1 1 100%', xl: 1 } }} />
        <Tooltip title="Refresh">
          <IconButton onClick={load} disabled={loading} size="small" sx={{ border: '1px solid #d8e1ea', borderRadius: 1.2, width: 34, height: 34 }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={!canWrite ? writeBlockedMessage : ''} arrow disableHoverListener={canWrite}>
          <span><Button size="small" variant="contained" startIcon={<Add fontSize="small" />} onClick={() => setAddOpen(true)} disabled={!canWrite} sx={{ textTransform: 'none', backgroundColor: '#103B5C', height: 34 }}>Add BOM</Button></span>
        </Tooltip>
      </Box>

      <TableContainer sx={{ maxHeight: 'calc(100vh - 220px)' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {[
                { label: 'No.', sortable: false },
                { label: 'BOM No', key: 'bomNo' },
                { label: 'BOM Name', key: 'bomName' },
                { label: 'Colors', key: 'colors' },
                { label: 'Packings', key: 'packings' },
                { label: 'Status', key: 'status' },
                { label: 'Submitted At', key: 'submittedAt' },
                { label: 'Updated At', key: 'updatedAt' },
                { label: 'Actions', sortable: false }
              ].map((column) => (
                <SortableTableCell key={column.label} label={column.label} columnKey={column.key} sortable={column.sortable !== false} sortKey={sortKey} sortDirection={sortDirection} onSort={handleBomSort} sx={{ fontWeight: 750, fontSize: '0.75rem', color: '#40566d', backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }} />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={9} sx={{ py: 2.5, textAlign: 'center', color: 'text.secondary' }}>Loading...</TableCell></TableRow>}
            {!loading && filteredRows.length === 0 && (
              <EmptyTableState
                colSpan={9}
                title={rows.length ? 'No BOM matches the current filter' : 'No BOM yet'}
                description=""
                actionLabel={!rows.length && canWrite ? 'Add BOM' : ''}
                onAction={!rows.length && canWrite ? () => setAddOpen(true) : undefined}
              />
            )}
            {pagedRows.map((bom, index) => {
              const productColors = productColorNames(bom);
              return (
                <TableRow hover key={bom.id} sx={{ '&:hover': { bgcolor: '#fbfdff' } }}>
                  <TableCell align="center" sx={{ width: 56, color: '#64748b', fontWeight: 650 }}>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 750, color: '#173b63' }}>{bom.bomNo}</TableCell>
                  <TableCell>{bom.bomName}</TableCell>
                  <TableCell>
                    {productColors.slice(0, 3).map((color, index) => <Chip key={`${color}-${index}`} size="small" label={color} sx={{ mr: .4, mb: .25, height: 22, fontSize: '.68rem' }} />)}
                    {productColors.length > 3 ? `+${productColors.length - 3}` : ''}
                  </TableCell>
                  <TableCell>{(bom.packings || []).length}</TableCell>
                  <TableCell><StatusBadge status={bom.status} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(bom.submittedAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(bom.updatedAt)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Open BOM"><IconButton size="small" color="primary" onClick={() => navigate(buyerPath(buyerKey, `orders/${order.id}/boms/${bom.id}`))}><OpenInNew fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={
                      !canWrite ? writeBlockedMessage
                        : bom.status !== 'SUBMITTED' ? 'Submit BOM'
                        : bom.usedInMpr ? 'This BOM is already used in an MPR generation batch and cannot be resubmitted'
                        : 'Resubmit BOM — return to DRAFT'
                    }><span><IconButton size="small" color="success" disabled={!canWrite || (bom.status === 'SUBMITTED' && bom.usedInMpr)} onClick={() => submit(bom)}><Publish fontSize="small" /></IconButton></span></Tooltip>
                    <Tooltip title="Export"><IconButton size="small" onClick={() => downloadWithAuth(getBomExportUrl(bom.id), `BOM_${downloadFilePart(buyerKey, 'BUYER')}_${downloadFilePart(bom.bomNo, 'BOM')}_${downloadDate()}.xlsx`)}><FileUpload fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete'}><span><IconButton size="small" color="error" disabled={!canWrite} onClick={() => setDeleteTarget(bom)}><Delete fontSize="small" /></IconButton></span></Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'center' }}
        spacing={0.8}
        sx={{ px: 0.9, py: 0.6, borderTop: '1px solid #e5e7eb', bgcolor: '#fbfcfe' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <Typography sx={{ fontSize: '0.75rem', color: '#6b7c90' }}>
            {filteredRows.length === 0
              ? `0 of ${rows.length} BOM(s)`
              : `Showing ${page * rowsPerPage + 1}-${Math.min((page + 1) * rowsPerPage, filteredRows.length)} of ${filteredRows.length} BOM(s)`}
          </Typography>
          <Stack direction="row" spacing={0.7} alignItems="center">
            <Typography sx={{ fontSize: '0.74rem', color: '#6b7c90' }}>Rows per page</Typography>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={(event) => { setRowsPerPage(Number(event.target.value) || 10); setPage(0); }}
              sx={{ minWidth: 78, height: 30, '& .MuiSelect-select': { fontSize: '0.75rem', py: 0.4 } }}
            >
              {[10, 25, 50, 100].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </Select>
          </Stack>
        </Stack>
        <Pagination
          size="small"
          page={page + 1}
          count={totalPages}
          onChange={(_, nextPage) => setPage(nextPage - 1)}
          disabled={loading || filteredRows.length === 0}
          shape="rounded"
          siblingCount={1}
          boundaryCount={1}
        />
      </Stack>

      <BomCreateDialog open={canWrite && addOpen} saving={saving} onClose={() => setAddOpen(false)} onSave={create} />
      <Dialog open={canWrite && Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete BOM?</DialogTitle>
        <DialogContent>Delete <b>{deleteTarget?.bomNo}</b>? BOM used in MPR cannot be deleted.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={notice.open} autoHideDuration={3500} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
