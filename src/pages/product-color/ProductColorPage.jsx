import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { Add, Delete, Edit, FileUpload, OpenInNew, Refresh } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import {
  createMasterData,
  deleteMasterData,
  deleteProductColorImage,
  getMasterDataErrorMessage,
  listMasterData,
  updateMasterData,
  uploadProductColorImage
} from '../../services/masterDataService';
import ProductColorImage from '../../components/ProductColorImage';
import { canManageSales } from 'utils/accessControl';

const blankChildColor = () => ({ id: '', childColor: '' });
const blankForm = () => ({
  buyer: '',
  season: '',
  patternNumber: '',
  styleNumber: '',
  styleName: '',
  productColor: '',
  active: 'true',
  childColors: []
});
const trim = (value) => String(value || '').trim();
const pageContent = (response) => Array.isArray(response) ? response : (response?.content || response?.items || []);
const hasImage = (record = {}) => Boolean(
  record?.hasImage
  || record?.imageAvailable
  || record?.imageFileName
  || record?.imageStorageKey
  || record?.imageUpdatedAt
);

const sourceBomLabel = (record = {}) => (
  record?.sourceBomName
  || record?.sourceBomNo
  || record?.sourceBomCode
  || record?.sourceBomId
  || '—'
);

const sourceBomPath = (record = {}) => {
  const directPath = String(record?.sourceBomPath || record?.sourceBomUrl || '').trim();
  if (directPath.startsWith('/')) return directPath;

  const orderId = String(record?.sourceOrderId || record?.orderId || '').trim();
  const bomId = String(record?.sourceBomId || record?.bomId || '').trim();
  return orderId && bomId ? `/orders/${encodeURIComponent(orderId)}/boms/${encodeURIComponent(bomId)}` : '';
};

function ProductColorDialog({ open, record, saving, onClose, onSave }) {
  const [form, setForm] = useState(blankForm());

  useEffect(() => {
    if (!open) return;
    setForm({
      buyer: record?.buyer || '',
      season: record?.season || '',
      patternNumber: record?.patternNumber || '',
      styleNumber: record?.styleNumber || '',
      styleName: record?.styleName || '',
      productColor: record?.productColor || '',
      active: record?.active === false ? 'false' : 'true',
      childColors: Array.isArray(record?.childColors)
        ? record.childColors.map((item) => ({ ...blankChildColor(), ...item }))
        : []
    });
  }, [open, record]);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const changeChildColor = (index, value) => {
    setForm((current) => ({
      ...current,
      childColors: current.childColors.map((item, itemIndex) => (
        itemIndex === index ? { ...item, childColor: value } : item
      ))
    }));
  };

  const canSave = trim(form.season) && trim(form.patternNumber) && trim(form.productColor);
  const save = () => onSave({
    buyer: trim(form.buyer),
    season: trim(form.season),
    patternNumber: trim(form.patternNumber),
    styleNumber: trim(form.styleNumber),
    styleName: trim(form.styleName),
    productColor: trim(form.productColor),
    active: String(form.active) !== 'false',
    childColors: form.childColors
      .map((item) => ({ id: trim(item.id), childColor: trim(item.childColor) }))
      .filter((item) => item.childColor)
  });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6, fontWeight: 900, color: '#103B5C' }}>
        {record ? 'Edit Product Color' : 'Add Product Color'}
        <Typography sx={{ mt: 0.25, fontSize: '.8rem', color: 'text.secondary', fontWeight: 400 }}>
          Save the Product Color first, then upload its master image here. BOM uses this saved image through the Product Color link and does not store a duplicate file.
        </Typography>
        <IconButton onClick={onClose} disabled={saving} sx={{ position: 'absolute', right: 14, top: 14 }}>×</IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1.25 }}>
          <TextField label="Buyer" value={form.buyer} onChange={set('buyer')} />
          <TextField required label="Season" value={form.season} onChange={set('season')} placeholder="F26" />
          <TextField required label="Pattern Number" value={form.patternNumber} onChange={set('patternNumber')} placeholder="LLB 352 A" />
          <TextField label="Style Number" value={form.styleNumber} onChange={set('styleNumber')} />
          <TextField label="Style Name" value={form.styleName} onChange={set('styleName')} />
          <TextField required label="Product / Style Color" value={form.productColor} onChange={set('productColor')} placeholder="CMPGRN/CITRN" />
          <TextField select label="Status" value={form.active} onChange={set('active')}>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mt: 2.25, mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: '#103B5C' }}>Child Colors</Typography>
            <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>
              Do not enter Material Type, MAT Full Description or Packing here. Those fields belong to the BOM line.
            </Typography>
          </Box>
          <Button size="small" startIcon={<Add />} variant="outlined" onClick={() => setForm((current) => ({ ...current, childColors: [...current.childColors, blankChildColor()] }))} sx={{ textTransform: 'none' }}>
            Add Child Color
          </Button>
        </Stack>

        <TableContainer sx={{ border: '1px solid #e5e7eb', borderRadius: 1.5 }}>
          <Table size="small" sx={{ minWidth: 520 }}>
            <TableHead><TableRow>
              <TableCell sx={{ fontWeight: 900 }}>Child Color</TableCell>
              <TableCell sx={{ width: 70 }} />
            </TableRow></TableHead>
            <TableBody>
              {form.childColors.length === 0 && (
                <TableRow><TableCell colSpan={2} sx={{ color: 'text.secondary', py: 2, textAlign: 'center' }}>No Child Color is entered yet. BOM Detail import will add missing Child Colors automatically.</TableCell></TableRow>
              )}
              {form.childColors.map((item, index) => (
                <TableRow key={item.id || `child-${index}`}>
                  <TableCell><TextField size="small" required value={item.childColor} onChange={(event) => changeChildColor(index, event.target.value)} placeholder="MINERAL GREY YKK#181" fullWidth /></TableCell>
                  <TableCell align="center"><IconButton color="error" size="small" onClick={() => setForm((current) => ({ ...current, childColors: current.childColors.filter((_, itemIndex) => itemIndex !== index) }))}><Delete fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !canSave} sx={{ textTransform: 'none', fontWeight: 800, backgroundColor: '#103B5C' }}>
          {saving ? 'Saving...' : 'Save Product Color'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProductColorPage() {
  const [filters, setFilters] = useState({ productColor: '', season: '', patternNumber: '', styleName: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formRecord, setFormRecord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [notice, setNotice] = useState({ open: false, severity: 'success', message: '' });
  const canWrite = canManageSales();
  const writeBlockedMessage = 'Sales permission is required to change Product Color master data.';

  const notify = (message, severity = 'success') => setNotice({ open: true, severity, message });
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMasterData('productColor', { ...appliedFilters, page: 0, size: 200 });
      setRows(pageContent(response));
    } catch (error) {
      setRows([]);
      notify(getMasterDataErrorMessage(error, 'Unable to load Product Color Master.'), 'error');
    } finally { setLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { load(); }, [load]);

  const save = async (payload) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    setSaving(true);
    try {
      if (formRecord?.id) await updateMasterData('productColor', formRecord.id, payload);
      else await createMasterData('productColor', payload);
      setFormOpen(false);
      notify('Product Color saved. Upload the image in the Product Image column; BOM will use it automatically after linking this Product Color.');
      await load();
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to save Product Color.'), 'error');
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!deleteTarget?.id) return;
    setSaving(true);
    try {
      await deleteMasterData('productColor', deleteTarget.id);
      setDeleteTarget(null);
      notify('Product Color deleted.');
      await load();
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to delete Product Color.'), 'error');
    } finally { setSaving(false); }
  };

  const uploadImage = async (event, row) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !row?.id) return;
    if (!String(file.type || '').toLowerCase().startsWith('image/')) {
      notify('Please choose an image file.', 'error');
      return;
    }

    setSaving(true);
    try {
      await uploadProductColorImage(row.id, file);
      notify('Product Color image saved. Any BOM linked to this Product Color now uses the same image.');
      await load();
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to upload Product Color image.'), 'error');
    } finally { setSaving(false); }
  };

  const removeImage = async (row) => {
    if (!canWrite) { notify(writeBlockedMessage, 'warning'); return; }
    if (!row?.id || !window.confirm(`Remove the saved image for ${row.productColor || 'this Product Color'}?`)) return;

    setSaving(true);
    try {
      await deleteProductColorImage(row.id);
      notify('Product Color image removed. BOM no longer shows this image.');
      await load();
    } catch (error) {
      notify(getMasterDataErrorMessage(error, 'Unable to remove Product Color image.'), 'error');
    } finally { setSaving(false); }
  };

  const summary = useMemo(() => `${rows.length} record(s) shown`, [rows.length]);

  return (
    <Box sx={{ p: { xs: 1.25, sm: 1.75, md: 2 } }}>
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1.25} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Product Color Master</Typography>
            <Typography sx={{ fontSize: '.76rem', color: 'text.secondary' }}>
              Save Product Color and its image here first. BOM Detail links by Product Color Master ID, so one image is reused across all linked BOMs.
            </Typography>
          </Box>
          <Tooltip title={!canWrite ? writeBlockedMessage : ''} arrow disableHoverListener={canWrite}><span><Button variant="contained" startIcon={<Add />} onClick={() => { if (canWrite) { setFormRecord(null); setFormOpen(true); } }} disabled={loading || !canWrite} sx={{ textTransform: 'none', backgroundColor: '#111827', alignSelf: { xs: 'flex-start', sm: 'center' } }}>Add Product Color</Button></span></Tooltip>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.25 }}>
          {[
            ['productColor', 'Product Color'], ['season', 'Season'], ['patternNumber', 'Pattern Number'], ['styleName', 'Style Name']
          ].map(([key, label]) => <TextField key={key} size="small" label={label} value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))} />)}
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button variant="contained" onClick={() => setAppliedFilters(filters)} disabled={loading} sx={{ textTransform: 'none', backgroundColor: '#111827' }}>Search</Button>
          <Button variant="outlined" onClick={() => { const cleared = { productColor: '', season: '', patternNumber: '', styleName: '' }; setFilters(cleared); setAppliedFilters(cleared); }} disabled={loading} sx={{ textTransform: 'none' }}>Reset</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #e5e7eb' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '.95rem' }}>{loading ? 'Loading...' : summary}</Typography>
          <Button size="small" startIcon={<Refresh />} onClick={load} disabled={loading || saving} sx={{ textTransform: 'none' }}>Refresh</Button>
        </Stack>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 330px)' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1460 }}>
            <TableHead><TableRow>
              {['Season', 'Pattern Number', 'Style Number', 'Style Name', 'Product Color', 'Child Colors', 'Product Image', 'Status', 'Source BOM', 'Actions'].map((title) => <TableCell key={title} sx={{ fontWeight: 900, backgroundColor: '#f8fafc', whiteSpace: 'nowrap' }}>{title}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4, color: 'text.secondary' }}>{loading ? 'Loading...' : 'No Product Color found.'}</TableCell></TableRow>}
              {rows.map((row) => {
                const bomPath = sourceBomPath(row);
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.season || '-'}</TableCell>
                    <TableCell>{row.patternNumber || '-'}</TableCell>
                    <TableCell>{row.styleNumber || '-'}</TableCell>
                    <TableCell>{row.styleName || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{row.productColor || '-'}</TableCell>
                    <TableCell>{Array.isArray(row.childColors) ? row.childColors.length : 0}</TableCell>
                    <TableCell sx={{ minWidth: 142 }}>
                      <ProductColorImage productColor={row} height={70} />
                    </TableCell>
                    <TableCell>{row.active === false ? 'Inactive' : 'Active'}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {bomPath ? (
                        <Tooltip title="Open source BOM" arrow>
                          <Button component={RouterLink} to={bomPath} size="small" endIcon={<OpenInNew fontSize="small" />} sx={{ maxWidth: 180, textTransform: 'none', justifyContent: 'flex-start', textAlign: 'left' }}>
                            <Typography noWrap sx={{ maxWidth: 125, fontSize: '.78rem', fontWeight: 700 }}>{sourceBomLabel(row)}</Typography>
                          </Button>
                        </Tooltip>
                      ) : (
                        <Tooltip title={row.sourceBomId || ''}><Typography noWrap sx={{ maxWidth: 170, fontSize: '.8rem' }}>{sourceBomLabel(row)}</Typography></Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.25}>
                        <Tooltip title={!canWrite ? writeBlockedMessage : 'Upload / Replace Product Image'} arrow><span><IconButton size="small" color="primary" component="label" disabled={!canWrite || saving}><FileUpload fontSize="small" /><input hidden type="file" accept="image/*" onChange={(event) => uploadImage(event, row)} /></IconButton></span></Tooltip>
                        {hasImage(row) && <Tooltip title={!canWrite ? writeBlockedMessage : 'Remove Product Image'} arrow><span><IconButton size="small" color="warning" disabled={!canWrite || saving} onClick={() => removeImage(row)}><Delete fontSize="small" /></IconButton></span></Tooltip>}
                        <Tooltip title={!canWrite ? writeBlockedMessage : 'Edit'} arrow><span><IconButton size="small" color="primary" disabled={!canWrite || saving} onClick={() => { if (canWrite) { setFormRecord(row); setFormOpen(true); } }}><Edit fontSize="small" /></IconButton></span></Tooltip>
                        <Tooltip title={!canWrite ? writeBlockedMessage : 'Delete Product Color'} arrow><span><IconButton size="small" color="error" disabled={!canWrite || saving} onClick={() => { if (canWrite) setDeleteTarget(row); }}><Delete fontSize="small" /></IconButton></span></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ProductColorDialog open={canWrite && formOpen} record={formRecord} saving={saving} onClose={() => setFormOpen(false)} onSave={save} />

      <Dialog open={canWrite && Boolean(deleteTarget)} onClose={saving ? undefined : () => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Product Color?</DialogTitle>
        <DialogContent>Delete <strong>{deleteTarget?.productColor || ''}</strong>, its Child Colors, and its saved image?</DialogContent>
        <DialogActions><Button onClick={() => setDeleteTarget(null)} disabled={saving}>Cancel</Button><Button color="error" variant="contained" onClick={remove} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</Button></DialogActions>
      </Dialog>

      <Snackbar open={notice.open} autoHideDuration={4200} onClose={() => setNotice((current) => ({ ...current, open: false }))}><Alert severity={notice.severity} variant="filled">{notice.message}</Alert></Snackbar>
    </Box>
  );
}
