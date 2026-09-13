import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
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
import { Add, Delete, Edit, Refresh, Search } from '@mui/icons-material';
import {
  createBuyer,
  deleteBuyer,
  getBuyerError,
  listBuyers,
  updateBuyer
} from '../../services/buyerService';
import { PaginationBar } from '../shared/MasterDataTable';
import StatusBadge from '../../components/StatusBadge';
import SortableTableCell from '../../components/SortableTableCell';
import { buyerConfig, toBuyerFormValues, toBuyerPayload, validateBuyerForm } from './buyerConfig';

function BuyerFormDialog({ open, record, saving, onClose, onSave }) {
  const [form, setForm] = useState(buyerConfig.defaultValues);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(toBuyerFormValues(record));
    setErrors({});
  }, [open, record]);

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const submit = () => {
    const next = validateBuyerForm(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave?.(toBuyerPayload(form));
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 750, color: '#103B5C' }}>{record ? 'Edit Buyer' : 'Add Buyer'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            required
            label="Buyer Key"
            value={form.buyerKey}
            onChange={(event) => update('buyerKey', event.target.value)}
            error={Boolean(errors.buyerKey)}
            helperText={errors.buyerKey || 'Stored as an uppercase key, for example LLBEAN or TNF.'}
            disabled={saving || Boolean(record)}
          />
          <TextField
            required
            label="Buyer Name"
            value={form.buyerName}
            onChange={(event) => update('buyerName', event.target.value)}
            error={Boolean(errors.buyerName)}
            helperText={errors.buyerName}
            disabled={saving}
          />
          <FormControl fullWidth disabled={saving}>
            <InputLabel>Status</InputLabel>
            <Select value={form.active ? 'true' : 'false'} label="Status" onChange={(event) => update('active', event.target.value === 'true')}>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Description"
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            multiline
            minRows={3}
            disabled={saving}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={saving} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>
          {saving ? <CircularProgress size={20} color="inherit" /> : 'Save Buyer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function BuyerManagementPage() {
  const [keyword, setKeyword] = useState('');
  const [active, setActive] = useState('');
  const [applied, setApplied] = useState(buyerConfig.defaultFilters);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(buyerConfig.defaultRowsPerPage);
  const [totalRows, setTotalRows] = useState(0);
  const [sort, setSort] = useState(buyerConfig.defaultSort);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formRecord, setFormRecord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message: String(message || '') });

  const load = useCallback(async (overrides = {}) => {
    const requestedPage = Number.isInteger(overrides.page) ? Math.max(0, overrides.page) : page;
    const requestedSize = Number.isInteger(overrides.size) ? Math.max(1, overrides.size) : rowsPerPage;
    const requestedSort = overrides.sort || sort;
    setLoading(true);
    try {
      const result = await listBuyers({
        ...(applied.keyword ? { keyword: applied.keyword } : {}),
        ...(applied.active !== '' ? { active: applied.active === 'true' } : {}),
        paged: true,
        page: requestedPage,
        size: requestedSize,
        sortBy: requestedSort.key || 'createdAt',
        sortDir: requestedSort.direction || 'desc'
      });
      const content = Array.isArray(result)
        ? result
        : Array.isArray(result?.content)
          ? result.content
          : Array.isArray(result?.items)
            ? result.items
            : [];
      setRows(content);
      setTotalRows(Number(result?.totalElements ?? content.length ?? 0));
      return { rows: content, totalElements: Number(result?.totalElements ?? content.length ?? 0) };
    } catch (error) {
      setRows([]);
      setTotalRows(0);
      notify(getBuyerError(error, 'Unable to load Buyers.'), 'error');
      return { rows: [], totalElements: 0 };
    } finally {
      setLoading(false);
    }
  }, [applied, page, rowsPerPage, sort]);

  useEffect(() => { load(); }, [load]);

  const changeSort = (key) => {
    setPage(0);
    setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const save = async (payload) => {
    setSaving(true);
    try {
      if (formRecord?.id) await updateBuyer(formRecord.id, payload);
      else await createBuyer(payload);
      setFormOpen(false);
      setFormRecord(null);
      notify('Buyer saved successfully.');
      if (formRecord?.id || page === 0) await load();
      else setPage(0);
      window.dispatchEvent(new Event('buyers:changed'));
    } catch (error) {
      notify(getBuyerError(error, 'Unable to save Buyer.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget?.id) return;
    setSaving(true);
    try {
      await deleteBuyer(deleteTarget.id);
      setDeleteTarget(null);
      notify('Buyer deleted successfully.');
      const remaining = Math.max(0, totalRows - 1);
      const lastPage = Math.max(0, Math.ceil(remaining / rowsPerPage) - 1);
      const targetPage = Math.min(page, lastPage);
      if (targetPage === page) await load({ page: targetPage });
      else setPage(targetPage);
      window.dispatchEvent(new Event('buyers:changed'));
    } catch (error) {
      notify(getBuyerError(error, 'Unable to delete Buyer.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 0.6, sm: 0.75, md: 0.9 } }}>
      <Paper variant="outlined" sx={{ p: 0.85, mb: 0.8, borderRadius: 1.7 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.75} alignItems={{ md: 'center' }}>
          <TextField size="small" label="Search Buyer" value={keyword} onChange={(event) => setKeyword(event.target.value)} sx={{ minWidth: 220, '& .MuiInputBase-root': { height: 34 } }} />
          <FormControl size="small" sx={{ minWidth: 140, '& .MuiInputBase-root': { height: 34 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={active} label="Status" onChange={(event) => setActive(event.target.value)}>
              {buyerConfig.statusOptions.map((option) => <MenuItem key={option.value || 'ALL'} value={option.value}>{option.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Search />} onClick={() => { setPage(0); setApplied({ keyword: keyword.trim(), active }); }} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>Search</Button>
          <Button variant="outlined" onClick={() => { setKeyword(''); setActive(''); setPage(0); setApplied({ keyword: '', active: '' }); }} sx={{ textTransform: 'none' }}>Reset</Button>
          <Box sx={{ flex: 1 }} />
          <Button variant="outlined" startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>Refresh</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setFormRecord(null); setFormOpen(true); }} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>Add Buyer</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small" sx={{ minWidth: 850 }}>
            <TableHead>
              <TableRow>
                {buyerConfig.columns.map((column) => (
                  <SortableTableCell key={column.label} label={column.label} columnKey={column.key} sortable={column.sortable !== false} sortKey={sort.key} sortDirection={sort.direction} onSort={changeSort} sx={{ fontWeight: 750, backgroundColor: '#F8FAFC' }} />
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : rows.length ? rows.map((row, index) => (
                <TableRow key={row.id || row.buyerKey} hover>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.buyerKey}</TableCell>
                  <TableCell>{row.buyerName}</TableCell>
                  <TableCell><StatusBadge status={row.active ? 'ACTIVE' : 'INACTIVE'} /></TableCell>
                  <TableCell>{row.description || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={row.used ? (row.lockReason || 'Buyer is in use and cannot be edited.') : 'Edit'}>
                        <span><IconButton size="small" color="primary" disabled={Boolean(row.used)} onClick={() => { setFormRecord(row); setFormOpen(true); }}><Edit fontSize="small" /></IconButton></span>
                      </Tooltip>
                      <Tooltip title={row.deleteLocked ? (row.lockReason || 'Buyer is in use and cannot be deleted.') : 'Delete'}>
                        <span><IconButton size="small" color="error" disabled={Boolean(row.deleteLocked)} onClick={() => setDeleteTarget(row)}><Delete fontSize="small" /></IconButton></span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>No Buyer found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          count={totalRows}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={loading}
          onPageChange={(nextPage) => setPage(Math.max(0, Number(nextPage) || 0))}
          onRowsPerPageChange={(nextSize) => {
            setRowsPerPage(Number(nextSize) || 25);
            setPage(0);
          }}
        />
      </Paper>

      <BuyerFormDialog open={formOpen} record={formRecord} saving={saving} onClose={() => { setFormOpen(false); setFormRecord(null); }} onSave={save} />

      <Dialog open={Boolean(deleteTarget)} onClose={saving ? undefined : () => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Buyer?</DialogTitle>
        <DialogContent><Typography>Delete <strong>{deleteTarget?.buyerName}</strong>? Core Buyers or Buyers already used by data may not be deleted.</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button color="error" variant="contained" onClick={remove} disabled={saving} sx={{ textTransform: 'none' }}>{saving ? <CircularProgress size={20} color="inherit" /> : 'Delete'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={4000} onClose={() => setNotice((current) => ({ ...current, open: false }))}>
        <Alert severity={notice.severity} variant="filled">{notice.message}</Alert>
      </Snackbar>
    </Box>
  );
}
