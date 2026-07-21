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
  Paper,
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
  submitBom
} from '../../services/orderBomMprService';
import { formatDateTime, statusSx } from '../orders/orderUi';
import { buyerPath, normalizeBuyerKey } from 'utils/buyerContext';
import BomCreateDialog from './BomCreateDialog';

const emptyFilters = {
  keyword: '',
  status: '',
  productColor: '',
  packingKey: ''
};

const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
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

export default function BomTab({ order, buyerKey: buyerKeyProp }) {
  const buyerKey = normalizeBuyerKey(buyerKeyProp || order?.buyerKey);
  const navigate = useNavigate();
  const canWrite = canManageBom();
  const writeBlockedMessage = 'BOM permission is required to modify BOM data.';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });

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
    try {
      await submitBom(bom.id);
      notify('BOM submitted. Sales can now select it for MPR.');
      await load();
    } catch (error) {
      notify(getApiError(error, 'Unable to submit BOM.'), 'error');
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
  const applyFilter = () => setAppliedFilters({ ...filters });
  const resetFilter = () => {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>BOM</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              BOM/Admin creates one or more BOMs inside this order. Submit a BOM when Sales can use it.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ textTransform: 'none' }}>Refresh</Button>
            <Tooltip title={!canWrite ? writeBlockedMessage : ''} arrow disableHoverListener={canWrite}>
              <span><Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)} disabled={!canWrite} sx={{ textTransform: 'none', backgroundColor: '#103B5C' }}>Add BOM</Button></span>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.75} sx={{ mb: 1.1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>BOM Search & Filter</Typography>
            <Typography sx={{ fontSize: '.75rem', color: 'text.secondary' }}>
              Search BOM number, name, style, season, product color, packing, or source file.
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '.78rem', color: 'text.secondary', fontWeight: 700 }}>
            Showing {filteredRows.length} / {rows.length} BOM(s)
          </Typography>
        </Stack>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 1 }}>
          <TextField
            size="small"
            label="Keyword"
            value={filters.keyword}
            onChange={(event) => updateFilter('keyword', event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && applyFilter()}
            placeholder="BOM No, Style, Product Color..."
            sx={{ minWidth: { xs: '100%', md: 270 }, flex: 1 }}
          />
          <TextField size="small" select label="Status" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All Status</MenuItem>
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="SUBMITTED">Submitted</MenuItem>
          </TextField>
          <TextField size="small" select label="Product Color" value={filters.productColor} onChange={(event) => updateFilter('productColor', event.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="">All Product Colors</MenuItem>
            {productColorOptions.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Packing" value={filters.packingKey} onChange={(event) => updateFilter('packingKey', event.target.value)} sx={{ minWidth: 210 }}>
            <MenuItem value="">All Packings</MenuItem>
            {packingOptions.map((option) => <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>)}
          </TextField>
          <Button variant="contained" startIcon={<Search />} onClick={applyFilter} disabled={loading} sx={{ textTransform: 'none', backgroundColor: '#111827' }}>Search</Button>
          <Button variant="outlined" startIcon={<RestartAlt />} onClick={resetFilter} disabled={loading} sx={{ textTransform: 'none' }}>Reset</Button>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['BOM No', 'BOM Name', 'Colors', 'Packings', 'Status', 'Updated At', 'Actions'].map((heading) => (
                  <TableCell key={heading} sx={{ fontWeight: 900, backgroundColor: '#f8fafc' }}>{heading}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && <TableRow><TableCell colSpan={7}>Loading...</TableCell></TableRow>}
              {!loading && filteredRows.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  {rows.length ? 'No BOM matches the current filter.' : 'No BOM yet. Use Add BOM to create one.'}
                </TableCell></TableRow>
              )}
              {filteredRows.map((bom) => {
                const productColors = productColorNames(bom);
                return (
                  <TableRow hover key={bom.id}>
                    <TableCell sx={{ fontWeight: 800 }}>{bom.bomNo}</TableCell>
                    <TableCell>{bom.bomName}</TableCell>
                    <TableCell>
                      {productColors.slice(0, 3).map((color) => <Chip key={color} size="small" label={color} sx={{ mr: .5, mb: .5, fontSize: '.7rem' }} />)}
                      {productColors.length > 3 ? `+${productColors.length - 3}` : ''}
                    </TableCell>
                    <TableCell>{(bom.packings || []).length}</TableCell>
                    <TableCell><Chip label={bom.status} sx={statusSx(bom.status)} /></TableCell>
                    <TableCell>{formatDateTime(bom.updatedAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Open BOM"><IconButton color="primary" onClick={() => navigate(buyerPath(buyerKey, `orders/${order.id}/boms/${bom.id}`))}><OpenInNew fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title={!canWrite ? writeBlockedMessage : (bom.status === 'SUBMITTED' ? 'BOM already submitted' : 'Submit BOM')}><span><IconButton color="success" disabled={!canWrite || bom.status === 'SUBMITTED'} onClick={() => submit(bom)}><Publish fontSize="small" /></IconButton></span></Tooltip>
                      <Tooltip title="Export"><IconButton onClick={() => downloadWithAuth(getBomExportUrl(bom.id), `${bom.bomNo || 'BOM'}.xlsx`)}><FileUpload fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete'}><span><IconButton color="error" disabled={!canWrite} onClick={() => setDeleteTarget(bom)}><Delete fontSize="small" /></IconButton></span></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

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
