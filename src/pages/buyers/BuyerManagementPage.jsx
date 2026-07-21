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
import { normalizeBuyerKey } from '../../utils/buyerContext';
import { PaginationBar } from '../shared/MasterDataTable';

const emptyForm = {
  buyerKey: '',
  buyerName: '',
  active: true,
  sequence: 0,
  description: ''
};

function BuyerFormDialog({ open, record, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(record ? {
      buyerKey: record.buyerKey || '',
      buyerName: record.buyerName || '',
      active: record.active ?? true,
      sequence: Number(record.sequence || 0),
      description: record.description || ''
    } : emptyForm);
    setErrors({});
  }, [open, record]);

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const submit = () => {
    const next = {};
    const buyerKey = normalizeBuyerKey(form.buyerKey);
    if (!form.buyerKey.trim()) next.buyerKey = 'Buyer Key is required.';
    if (!form.buyerName.trim()) next.buyerName = 'Buyer Name is required.';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave?.({
      buyerKey,
      buyerName: form.buyerName.trim(),
      active: Boolean(form.active),
      sequence: Math.max(0, Number(form.sequence || 0)),
      description: form.description.trim()
    });
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, color: '#103B5C' }}>{record ? 'Edit Buyer' : 'Add Buyer'}</DialogTitle>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              type="number"
              label="Sequence"
              value={form.sequence}
              onChange={(event) => update('sequence', event.target.value)}
              inputProps={{ min: 0 }}
              disabled={saving}
              fullWidth
            />
            <FormControl fullWidth disabled={saving}>
              <InputLabel>Status</InputLabel>
              <Select value={form.active ? 'true' : 'false'} label="Status" onChange={(event) => update('active', event.target.value === 'true')}>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>
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
  const [applied, setApplied] = useState({ keyword: '', active: '' });
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRows, setTotalRows] = useState(0);
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
    setLoading(true);
    try {
      const result = await listBuyers({
        ...(applied.keyword ? { keyword: applied.keyword } : {}),
        ...(applied.active !== '' ? { active: applied.active === 'true' } : {}),
        paged: true,
        page: requestedPage,
        size: requestedSize,
        sortBy: 'sequence',
        sortDir: 'asc'
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
  }, [applied, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

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
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '1.5rem', fontWeight: 950, color: '#103B5C' }}>Buyer Management</Typography>
        <Typography sx={{ mt: 0.35, color: 'text.secondary' }}>Manage Buyer keys used to separate Orders, MAT Info and Product Color data.</Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
          <TextField size="small" label="Search Buyer" value={keyword} onChange={(event) => setKeyword(event.target.value)} sx={{ minWidth: 260 }} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={active} label="Status" onChange={(event) => setActive(event.target.value)}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
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
                {['No.', 'Buyer Key', 'Buyer Name', 'Sequence', 'Status', 'Description', 'Actions'].map((label) => (
                  <TableCell key={label} sx={{ fontWeight: 900, backgroundColor: '#F8FAFC' }}>{label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress size={28} /></TableCell></TableRow>
              ) : rows.length ? rows.map((row, index) => (
                <TableRow key={row.id || row.buyerKey} hover>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{row.buyerKey}</TableCell>
                  <TableCell>{row.buyerName}</TableCell>
                  <TableCell>{row.sequence ?? 0}</TableCell>
                  <TableCell><Chip size="small" label={row.active ? 'Active' : 'Inactive'} color={row.active ? 'success' : 'default'} /></TableCell>
                  <TableCell>{row.description || '—'}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit"><IconButton size="small" color="primary" onClick={() => { setFormRecord(row); setFormOpen(true); }}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}><Delete fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>No Buyer found.</TableCell></TableRow>
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
